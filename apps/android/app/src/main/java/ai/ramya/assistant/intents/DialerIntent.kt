package ai.ramya.assistant.intents

import android.content.Context
import android.content.Intent
import android.net.Uri

/**
 * Handles Phone Dialer Intents on Android.
 * Uses ACTION_DIAL to respect Android security standards.
 */
object DialerIntent {

    fun openDialer(context: Context, phoneNumber: String): Boolean {
        return try {
            val cleanNumber = phoneNumber.replace(Regex("[^0-9+]"), "")
            val intent = Intent(Intent.ACTION_DIAL).apply {
                data = Uri.parse("tel:$cleanNumber")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
            true
        } catch (e: Exception) {
            false
        }
    }
}
