package ai.ramya.assistant.intents

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.util.Log
import java.net.URLEncoder

/**
 * Result of a messaging or WhatsApp action.
 */
sealed class MessageActionResult {
    data class WhatsAppConversationOpened(
        val contact: ContactInfo,
        val messageText: String,
        val isPrefilled: Boolean,
        val guidance: String
    ) : MessageActionResult()

    data class ConfirmationRequired(
        val contact: ContactInfo,
        val messageText: String,
        val appName: String = "WhatsApp"
    ) : MessageActionResult()

    data class NeedsDisambiguation(
        val query: String,
        val matches: List<ContactInfo>,
        val pendingMessage: String
    ) : MessageActionResult()

    data class ContactNotFound(
        val query: String,
        val messageText: String
    ) : MessageActionResult()

    data class PermissionRequired(
        val permission: String,
        val message: String
    ) : MessageActionResult()

    data class AppNotInstalled(
        val appName: String,
        val packageName: String
    ) : MessageActionResult()

    data class NeedsDetails(
        val prompt: String
    ) : MessageActionResult()

    data class Error(
        val message: String
    ) : MessageActionResult()
}

/**
 * Secure WhatsApp and Mobile Messaging Manager for Ramya AI.
 * Resolves contacts, validates permissions, enforces user confirmation gates,
 * formats international phone numbers, and opens WhatsApp chats with prefilled text
 * via supported official Android intents and URI schemes.
 *
 * Truthful Verification Principle:
 * Never claims a message was sent if WhatsApp only opened.
 * Always informs the user that WhatsApp is open with their prefilled message
 * and instructs them to tap Send.
 */
object WhatsAppManager {

    private const val TAG = "WhatsAppManager"
    const val WHATSAPP_PACKAGE = "com.whatsapp"
    const val WHATSAPP_BUSINESS_PACKAGE = "com.whatsapp.w4b"

    /**
     * Checks if standard WhatsApp or WhatsApp Business is installed on the device.
     */
    fun isWhatsAppInstalled(context: Context): Boolean {
        val pm = context.packageManager
        return isPackageInstalled(pm, WHATSAPP_PACKAGE) || isPackageInstalled(pm, WHATSAPP_BUSINESS_PACKAGE)
    }

    private fun isPackageInstalled(pm: PackageManager, packageName: String): Boolean {
        return try {
            pm.getPackageInfo(packageName, 0)
            true
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Resolves which WhatsApp package to target.
     */
    fun getInstalledWhatsAppPackage(context: Context): String? {
        val pm = context.packageManager
        return when {
            isPackageInstalled(pm, WHATSAPP_PACKAGE) -> WHATSAPP_PACKAGE
            isPackageInstalled(pm, WHATSAPP_BUSINESS_PACKAGE) -> WHATSAPP_BUSINESS_PACKAGE
            else -> null
        }
    }

    /**
     * Cleans and formats phone numbers for WhatsApp API.
     * WhatsApp requires digits only, including country code (e.g. 919876543210).
     */
    fun formatPhoneNumberForWhatsApp(rawNumber: String, defaultCountryCode: String = "91"): String {
        val digitsOnly = rawNumber.replace(Regex("[^0-9]"), "")
        return when {
            digitsOnly.length == 10 -> "$defaultCountryCode$digitsOnly"
            digitsOnly.startsWith("0") && digitsOnly.length == 11 -> "$defaultCountryCode${digitsOnly.substring(1)}"
            else -> digitsOnly
        }
    }

    /**
     * Parses a natural voice messaging query.
     * Examples:
     * - "Send Rahul a WhatsApp message saying I will arrive in ten minutes"
     * - "Send a WhatsApp message to Rahul saying I will arrive in ten minutes"
     * - "Tell Mom I have reached home"
     * - "Send WhatsApp to Rahul: I'll be there soon"
     * - "Message Priya saying okay"
     */
    fun parseMessageQuery(query: String): Triple<String?, String?, Boolean> {
        val clean = query.trim()

        // Pattern 1: "Send [Name] a WhatsApp message saying [Text]" or "Send [Name] a message saying [Text]"
        val p1 = Regex(
            "^(?:send|shoot)\\s+(.+?)\\s+a\\s+(?:whatsapp\\s+message|message|whatsapp)\\s+saying\\s+(.+)$",
            RegexOption.IGNORE_CASE
        )
        val m1 = p1.find(clean)
        if (m1 != null) {
            return Triple(m1.groupValues[1].trim(), m1.groupValues[2].trim(), true)
        }

        // Pattern 2: "Send a WhatsApp message to [Name] saying [Text]" or "Send message to [Name] saying [Text]"
        val p2 = Regex(
            "^(?:send|shoot)\\s+(?:a\\s+)?(?:whatsapp\\s+message|message|whatsapp)\\s+to\\s+(.+?)\\s+saying\\s+(.+)$",
            RegexOption.IGNORE_CASE
        )
        val m2 = p2.find(clean)
        if (m2 != null) {
            return Triple(m2.groupValues[1].trim(), m2.groupValues[2].trim(), true)
        }

        // Pattern 3: "Send WhatsApp to [Name]: [Text]" or "Send WhatsApp to [Name] [Text]"
        val p3 = Regex(
            "^(?:send\\s+)?whatsapp\\s+to\\s+(.+?)[:\\s]+saying\\s+(.+)$",
            RegexOption.IGNORE_CASE
        )
        val m3 = p3.find(clean)
        if (m3 != null) {
            return Triple(m3.groupValues[1].trim(), m3.groupValues[2].trim(), true)
        }

        // Pattern 4: "Tell [Name] on WhatsApp that [Text]" or "Tell [Name] on WhatsApp [Text]"
        val p4 = Regex(
            "^tell\\s+(.+?)\\s+on\\s+whatsapp\\s+(?:that\\s+)?(.+)$",
            RegexOption.IGNORE_CASE
        )
        val m4 = p4.find(clean)
        if (m4 != null) {
            return Triple(m4.groupValues[1].trim(), m4.groupValues[2].trim(), true)
        }

        // Pattern 5: "Tell [Name] that [Text]" or "Tell [Name] [Text]" (e.g. "Tell Mom I have reached home")
        val p5 = Regex(
            "^tell\\s+(.+?)\\s+(?:that\\s+)?(.+)$",
            RegexOption.IGNORE_CASE
        )
        val m5 = p5.find(clean)
        if (m5 != null) {
            val potentialName = m5.groupValues[1].trim()
            val text = m5.groupValues[2].trim()
            // Ensure recipient name is reasonable and text is substantial
            if (potentialName.split(" ").size <= 3 && text.isNotBlank()) {
                return Triple(potentialName, text, false)
            }
        }

        // Pattern 6: "Send WhatsApp to [Name] saying [Text]"
        val p6 = Regex(
            "^(?:send\\s+)?whatsapp\\s+(.+?)\\s+saying\\s+(.+)$",
            RegexOption.IGNORE_CASE
        )
        val m6 = p6.find(clean)
        if (m6 != null) {
            return Triple(m6.groupValues[1].trim(), m6.groupValues[2].trim(), true)
        }

        // Pattern 7: "Send the same message to [Name]"
        val p7 = Regex(
            "^send\\s+(?:the\\s+)?same\\s+message\\s+to\\s+(.+)$",
            RegexOption.IGNORE_CASE
        )
        val m7 = p7.find(clean)
        if (m7 != null) {
            return Triple(m7.groupValues[1].trim(), null, true)
        }

        return Triple(null, null, false)
    }

    /**
     * Prepares and resolves a WhatsApp message request.
     * Enforces permission checks and confirmation gates.
     */
    fun prepareMessage(
        context: Context,
        recipientQuery: String,
        messageText: String,
        bypassConfirmation: Boolean = false
    ): MessageActionResult {
        if (!isWhatsAppInstalled(context)) {
            return MessageActionResult.AppNotInstalled("WhatsApp", WHATSAPP_PACKAGE)
        }

        if (recipientQuery.isBlank()) {
            return MessageActionResult.NeedsDetails("Who would you like to send this WhatsApp message to?")
        }
        if (messageText.isBlank()) {
            return MessageActionResult.NeedsDetails("What message would you like to send to $recipientQuery?")
        }

        // Check if recipientQuery is already a raw phone number
        val isRawNumber = recipientQuery.replace(Regex("[^0-9+]"), "").length >= 7
        val targetContact = if (isRawNumber) {
            ContactInfo(name = recipientQuery, number = recipientQuery)
        } else {
            val hasContactPerm = androidx.core.content.ContextCompat.checkSelfPermission(
                context,
                android.Manifest.permission.READ_CONTACTS
            ) == PackageManager.PERMISSION_GRANTED

            if (!hasContactPerm) {
                return MessageActionResult.PermissionRequired(
                    permission = android.Manifest.permission.READ_CONTACTS,
                    message = "Contacts permission is needed to look up $recipientQuery for WhatsApp. Please grant it in Permissions."
                )
            }

            // Query device contacts via ContactCallManager
            val matches = ContactCallManager.findContacts(context, recipientQuery)
            when {
                matches.isEmpty() -> {
                    return MessageActionResult.ContactNotFound(recipientQuery, messageText)
                }
                matches.size > 1 -> {
                    return MessageActionResult.NeedsDisambiguation(recipientQuery, matches, messageText)
                }
                else -> matches.first()
            }
        }

        // If user confirmation is required, return ConfirmationRequired
        if (!bypassConfirmation) {
            return MessageActionResult.ConfirmationRequired(targetContact, messageText)
        }

        // User confirmed: execute WhatsApp dispatch
        return executeWhatsAppDispatch(context, targetContact, messageText)
    }

    /**
     * Executes the WhatsApp dispatch by opening the conversation with the prefilled message.
     */
    fun executeWhatsAppDispatch(
        context: Context,
        contact: ContactInfo,
        messageText: String
    ): MessageActionResult {
        val targetPkg = getInstalledWhatsAppPackage(context)
            ?: return MessageActionResult.AppNotInstalled("WhatsApp", WHATSAPP_PACKAGE)

        return try {
            val cleanPhone = formatPhoneNumberForWhatsApp(contact.number)
            val encodedText = URLEncoder.encode(messageText, "UTF-8")

            // WhatsApp Official Click-to-Chat URI
            val whatsappUri = Uri.parse("https://api.whatsapp.com/send?phone=$cleanPhone&text=$encodedText")
            val intent = Intent(Intent.ACTION_VIEW, whatsappUri).apply {
                setPackage(targetPkg)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }

            val pm = context.packageManager
            if (intent.resolveActivity(pm) != null) {
                context.startActivity(intent)
                MessageActionResult.WhatsAppConversationOpened(
                    contact = contact,
                    messageText = messageText,
                    isPrefilled = true,
                    guidance = "Opening WhatsApp chat with ${contact.name} with your prefilled message. Please tap Send to deliver."
                )
            } else {
                // Fallback to general ACTION_SEND targeting WhatsApp
                val sendIntent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TEXT, messageText)
                    setPackage(targetPkg)
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                if (sendIntent.resolveActivity(pm) != null) {
                    context.startActivity(sendIntent)
                    MessageActionResult.WhatsAppConversationOpened(
                        contact = contact,
                        messageText = messageText,
                        isPrefilled = true,
                        guidance = "WhatsApp opened with your message. Please select ${contact.name} and tap Send."
                    )
                } else {
                    MessageActionResult.Error("Could not resolve an activity to open WhatsApp.")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error opening WhatsApp: ${e.message}")
            MessageActionResult.Error("Failed to open WhatsApp: ${e.localizedMessage}")
        }
    }
}
