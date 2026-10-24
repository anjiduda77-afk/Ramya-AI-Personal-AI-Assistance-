package ai.ramya.assistant.intents

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri

/**
 * Android Intent Launcher for Allowlisted Applications.
 */
object AppLauncherIntent {

    private val PACKAGE_MAP = mapOf(
        "chrome" to "com.android.chrome",
        "youtube" to "com.google.android.youtube",
        "spotify" to "com.spotify.music",
        "maps" to "com.google.android.apps.maps",
        "whatsapp" to "com.whatsapp",
        "settings" to "android.settings.SETTINGS"
    )

    fun launchApp(context: Context, appName: String): Boolean {
        val cleanName = appName.lowercase().trim()
        val pkg = PACKAGE_MAP[cleanName]

        return try {
            if (cleanName == "settings") {
                val intent = Intent(android.provider.Settings.ACTION_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
                true
            } else if (pkg != null) {
                val pm: PackageManager = context.packageManager
                val intent = pm.getLaunchIntentForPackage(pkg)?.apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                if (intent != null) {
                    context.startActivity(intent)
                    true
                } else {
                    // Fallback to Play Store if not installed
                    val marketIntent = Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$pkg")).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    }
                    context.startActivity(marketIntent)
                    false
                }
            } else {
                false
            }
        } catch (e: Exception) {
            false
        }
    }
}
