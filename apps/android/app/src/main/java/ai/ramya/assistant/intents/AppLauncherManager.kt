package ai.ramya.assistant.intents

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.net.Uri
import android.provider.Settings
import android.util.Log

/**
 * Result of resolving an application request.
 */
sealed class AppResolutionResult {
    data class Launched(val appName: String, val packageName: String) : AppResolutionResult()
    data class Ambiguous(val requestedName: String, val matches: List<Pair<String, String>>) : AppResolutionResult()
    data class NotInstalled(val requestedName: String, val suggestedPackage: String?) : AppResolutionResult()
    data class PlayStoreOpened(val requestedName: String, val packageName: String) : AppResolutionResult()
    data class Error(val message: String) : AppResolutionResult()
}

/**
 * Dynamic Android Application Discovery and Launcher.
 * Queries Android PackageManager safely via declared package visibility (<queries>).
 * Handles launch intents, ambiguity detection, and user-confirmed Play Store installation.
 */
object AppLauncherManager {

    private const val TAG = "AppLauncherManager"

    // Known common package mappings to resolve official Play Store IDs when not installed
    private val COMMON_PACKAGE_IDS = mapOf(
        "whatsapp" to "com.whatsapp",
        "youtube" to "com.google.android.youtube",
        "instagram" to "com.instagram.android",
        "chrome" to "com.android.chrome",
        "spotify" to "com.spotify.music",
        "facebook" to "com.facebook.katana",
        "twitter" to "com.twitter.android",
        "x" to "com.twitter.android",
        "telegram" to "org.telegram.messenger",
        "maps" to "com.google.android.apps.maps",
        "google maps" to "com.google.android.apps.maps",
        "gmail" to "com.google.android.gm",
        "uber" to "com.ubercab",
        "netflix" to "com.netflix.mediaclient",
        "amazon" to "in.amazon.mShop.android.shopping",
        "flipkart" to "com.flipkart.android",
        "paytm" to "net.one97.paytm",
        "phonepe" to "com.phonepe.app",
        "gpay" to "com.google.android.apps.nbu.paisa.user",
        "google pay" to "com.google.android.apps.nbu.paisa.user",
        "calculator" to "com.google.android.calculator",
        "camera" to "android.hardware.action.STILL_IMAGE_CAMERA",
        "clock" to "com.google.android.deskclock",
        "gallery" to "com.google.android.apps.photos"
    )

    /**
     * Finds all launchable applications installed on the device.
     */
    fun getInstalledLaunchableApps(context: Context): List<Pair<String, String>> {
        val pm = context.packageManager
        val intent = Intent(Intent.ACTION_MAIN, null).apply {
            addCategory(Intent.CATEGORY_LAUNCHER)
        }

        return try {
            val resolveInfos: List<ResolveInfo> = pm.queryIntentActivities(intent, 0)
            resolveInfos.mapNotNull { info ->
                val label = info.loadLabel(pm)?.toString()?.trim()
                val pkg = info.activityInfo?.packageName
                if (!label.isNullOrBlank() && !pkg.isNullOrBlank()) {
                    Pair(label, pkg)
                } else null
            }.distinctBy { it.second }
        } catch (e: Exception) {
            Log.e(TAG, "Error querying launchable activities: ${e.message}")
            emptyList()
        }
    }

    /**
     * Resolves and launches an application matching the requested name.
     */
    fun openApp(context: Context, appName: String): AppResolutionResult {
        val clean = appName.trim().lowercase()
        if (clean.isBlank()) {
            return AppResolutionResult.Error("No application name specified.")
        }

        // Special system settings intent
        if (clean == "settings" || clean == "phone settings") {
            return try {
                val intent = Intent(Settings.ACTION_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
                AppResolutionResult.Launched("Settings", "android.settings.SETTINGS")
            } catch (e: Exception) {
                AppResolutionResult.Error("Could not open Settings: ${e.localizedMessage}")
            }
        }

        val installedApps = getInstalledLaunchableApps(context)

        // 1. Check exact match on label or package name
        val exactMatch = installedApps.firstOrNull {
            it.first.equals(clean, ignoreCase = true) || it.second.equals(clean, ignoreCase = true)
        }

        if (exactMatch != null) {
            return launchPackage(context, exactMatch.first, exactMatch.second)
        }

        // 2. Check contains match
        val partialMatches = installedApps.filter {
            it.first.lowercase().contains(clean) || clean.contains(it.first.lowercase())
        }

        if (partialMatches.size == 1) {
            val match = partialMatches.first()
            return launchPackage(context, match.first, match.second)
        }

        if (partialMatches.size > 1) {
            return AppResolutionResult.Ambiguous(appName, partialMatches.take(4))
        }

        // 3. App is not installed. Look up potential package ID for Play Store
        val suggestedPkg = COMMON_PACKAGE_IDS[clean]
        return AppResolutionResult.NotInstalled(appName, suggestedPkg)
    }

    /**
     * Launches a specific package using its launch intent.
     */
    fun launchPackage(context: Context, appLabel: String, packageName: String): AppResolutionResult {
        return try {
            val pm = context.packageManager
            val intent = pm.getLaunchIntentForPackage(packageName)?.apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            if (intent != null) {
                context.startActivity(intent)
                AppResolutionResult.Launched(appLabel, packageName)
            } else {
                AppResolutionResult.Error("Could not create launch intent for $appLabel.")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch $packageName: ${e.message}")
            AppResolutionResult.Error("Error launching $appLabel: ${e.localizedMessage}")
        }
    }

    /**
     * Opens official Google Play Store listing for the requested application.
     * Only invoked after explicit user agreement.
     */
    fun openPlayStore(context: Context, appName: String, packageName: String?): AppResolutionResult {
        val targetPkg = packageName ?: COMMON_PACKAGE_IDS[appName.lowercase().trim()]

        return try {
            val uri = if (!targetPkg.isNullOrBlank()) {
                Uri.parse("market://details?id=$targetPkg")
            } else {
                Uri.parse("market://search?q=${Uri.encode(appName)}")
            }

            val marketIntent = Intent(Intent.ACTION_VIEW, uri).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(marketIntent)
            AppResolutionResult.PlayStoreOpened(appName, targetPkg ?: appName)
        } catch (_: Exception) {
            // Web fallback if Play Store app is not installed
            try {
                val webUri = if (!targetPkg.isNullOrBlank()) {
                    Uri.parse("https://play.google.com/store/apps/details?id=$targetPkg")
                } else {
                    Uri.parse("https://play.google.com/store/search?q=${Uri.encode(appName)}&c=apps")
                }
                val webIntent = Intent(Intent.ACTION_VIEW, webUri).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(webIntent)
                AppResolutionResult.PlayStoreOpened(appName, targetPkg ?: appName)
            } catch (e2: Exception) {
                AppResolutionResult.Error("Could not open Play Store: ${e2.localizedMessage}")
            }
        }
    }
}
