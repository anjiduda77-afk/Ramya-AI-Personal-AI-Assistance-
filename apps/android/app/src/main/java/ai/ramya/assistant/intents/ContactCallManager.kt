package ai.ramya.assistant.intents

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.database.Cursor
import android.net.Uri
import android.provider.ContactsContract
import android.util.Log
import androidx.core.content.ContextCompat

/**
 * Resolved Contact Information.
 */
data class ContactInfo(
    val name: String,
    val number: String,
    val typeLabel: String = "Mobile"
)

/**
 * Result of resolving a calling or contact request.
 */
sealed class ContactResolutionResult {
    data class DirectCallInitiated(val contact: ContactInfo) : ContactResolutionResult()
    data class DialerOpened(val contact: ContactInfo) : ContactResolutionResult()
    data class ConfirmationRequired(val contact: ContactInfo) : ContactResolutionResult()
    data class AmbiguousContacts(val query: String, val contacts: List<ContactInfo>) : ContactResolutionResult()
    data class AmbiguousNumbers(val name: String, val numbers: List<String>) : ContactResolutionResult()
    data class NotFound(val query: String) : ContactResolutionResult()
    data class PermissionRequired(val permission: String) : ContactResolutionResult()
    data class Error(val message: String) : ContactResolutionResult()
}

/**
 * Safe Contact Resolution and Telephony Caller for Android.
 * Uses ContactsContract to query address book, resolves multiple matches,
 * enforces confirmation gates, and prioritizes ACTION_DIAL with optional ACTION_CALL.
 */
object ContactCallManager {

    private const val TAG = "ContactCallManager"
    private const val PREFS_NAME = "ramya_assistant_prefs"
    private const val KEY_DIRECT_CALL_ENABLED = "direct_call_enabled"

    fun isDirectCallEnabled(context: Context): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getBoolean(KEY_DIRECT_CALL_ENABLED, false)
    }

    fun setDirectCallEnabled(context: Context, enabled: Boolean) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putBoolean(KEY_DIRECT_CALL_ENABLED, enabled).apply()
    }

    /**
     * Searches ContactsContract for contacts matching the given name query.
     */
    fun findContacts(context: Context, nameQuery: String): List<ContactInfo> {
        val hasPermission = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.READ_CONTACTS
        ) == PackageManager.PERMISSION_GRANTED

        if (!hasPermission) {
            Log.w(TAG, "READ_CONTACTS permission not granted.")
            return emptyList()
        }

        val contactsList = mutableListOf<ContactInfo>()
        val contentResolver = context.contentResolver
        val uri = ContactsContract.CommonDataKinds.Phone.CONTENT_URI
        val projection = arrayOf(
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
            ContactsContract.CommonDataKinds.Phone.NUMBER,
            ContactsContract.CommonDataKinds.Phone.TYPE
        )
        val selection = "${ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME} LIKE ?"
        val selectionArgs = arrayOf("%${nameQuery.trim()}%")
        val sortOrder = "${ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME} ASC"

        var cursor: Cursor? = null
        try {
            cursor = contentResolver.query(uri, projection, selection, selectionArgs, sortOrder)
            cursor?.let {
                val nameIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME)
                val numberIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER)
                val typeIndex = it.getColumnIndex(ContactsContract.CommonDataKinds.Phone.TYPE)

                while (it.moveToNext()) {
                    val name = if (nameIndex >= 0) it.getString(nameIndex) ?: "" else ""
                    val number = if (numberIndex >= 0) it.getString(numberIndex) ?: "" else ""
                    val type = if (typeIndex >= 0) it.getInt(typeIndex) else ContactsContract.CommonDataKinds.Phone.TYPE_MOBILE
                    val typeLabel = ContactsContract.CommonDataKinds.Phone.getTypeLabel(
                        context.resources,
                        type,
                        "Mobile"
                    ).toString()

                    if (name.isNotBlank() && number.isNotBlank()) {
                        contactsList.add(ContactInfo(name, number.replace("\\s".toRegex(), ""), typeLabel))
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error querying contacts: ${e.message}")
        } finally {
            cursor?.close()
        }

        return contactsList
    }

    /**
     * Resolves a contact and prepares calling action.
     */
    fun resolveCall(context: Context, contactOrNumber: String, isConfirmed: Boolean = false): ContactResolutionResult {
        val clean = contactOrNumber.trim()
        if (clean.isBlank()) {
            return ContactResolutionResult.Error("No contact name or phone number specified.")
        }

        // 1. Direct phone number (digits only or starts with +)
        val isRawNumber = clean.matches(Regex("^[+]?[0-9\\s\\-()]{7,15}$"))
        if (isRawNumber) {
            val contact = ContactInfo("Direct Number", clean)
            return executeCall(context, contact, isConfirmed)
        }

        // 2. Check READ_CONTACTS permission
        val hasReadPermission = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.READ_CONTACTS
        ) == PackageManager.PERMISSION_GRANTED

        if (!hasReadPermission) {
            return ContactResolutionResult.PermissionRequired(Manifest.permission.READ_CONTACTS)
        }

        // 3. Resolve by name in contacts
        val matches = findContacts(context, clean)

        if (matches.isEmpty()) {
            return ContactResolutionResult.NotFound(clean)
        }

        // Group by name
        val groupedByName = matches.groupBy { it.name.lowercase() }
        if (groupedByName.size > 1) {
            val distinctContacts = groupedByName.values.map { it.first() }.take(4)
            return ContactResolutionResult.AmbiguousContacts(clean, distinctContacts)
        }

        val singleNameMatches = groupedByName.values.first()
        if (singleNameMatches.size > 1) {
            val distinctNumbers = singleNameMatches.map { it.number }.distinct()
            if (distinctNumbers.size > 1) {
                return ContactResolutionResult.AmbiguousNumbers(singleNameMatches.first().name, distinctNumbers)
            }
        }

        val targetContact = singleNameMatches.first()
        return executeCall(context, targetContact, isConfirmed)
    }

    /**
     * Executes the call (ACTION_CALL if permitted and confirmed, else ACTION_DIAL).
     */
    fun executeCall(context: Context, contact: ContactInfo, isConfirmed: Boolean): ContactResolutionResult {
        val directEnabled = isDirectCallEnabled(context)

        // Safety gate: must be confirmed unless direct calling is explicitly enabled in settings
        if (!isConfirmed && !directEnabled) {
            return ContactResolutionResult.ConfirmationRequired(contact)
        }

        val hasCallPhonePermission = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.CALL_PHONE
        ) == PackageManager.PERMISSION_GRANTED

        val cleanNumber = contact.number.replace(Regex("[^0-9+]"), "")

        return try {
            if (hasCallPhonePermission) {
                val callIntent = Intent(Intent.ACTION_CALL, Uri.parse("tel:$cleanNumber")).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(callIntent)
                ContactResolutionResult.DirectCallInitiated(contact)
            } else {
                val dialIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$cleanNumber")).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(dialIntent)
                ContactResolutionResult.DialerOpened(contact)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initiate call: ${e.message}")
            ContactResolutionResult.Error("Could not place call: ${e.localizedMessage}")
        }
    }
}
