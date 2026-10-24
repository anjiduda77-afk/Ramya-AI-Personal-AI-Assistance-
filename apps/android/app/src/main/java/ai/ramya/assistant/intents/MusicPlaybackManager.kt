package ai.ramya.assistant.intents

import android.app.SearchManager
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.provider.MediaStore
import android.util.Log
import android.view.KeyEvent

/**
 * Result of music action execution.
 */
sealed class MusicActionResult {
    data class PlaybackInitiated(val song: String, val artist: String?, val appName: String) : MusicActionResult()
    data class SearchOpened(val query: String, val appName: String) : MusicActionResult()
    data class PlaybackControlled(val action: String) : MusicActionResult()
    data class VolumeAdjusted(val direction: String, val currentVolume: Int) : MusicActionResult()
    data class NeedsSongSpecification(val prompt: String) : MusicActionResult()
    data class Error(val message: String) : MusicActionResult()
}

/**
 * Intelligent Music Search and Playback Manager for Android.
 * Integrates Android MediaStore INTENT_ACTION_MEDIA_PLAY_FROM_SEARCH,
 * AudioManager media key events, and preferred music app routing.
 */
object MusicPlaybackManager {

    private const val TAG = "MusicPlaybackManager"
    private const val PREFS_NAME = "ramya_assistant_prefs"
    private const val KEY_PREFERRED_MUSIC_APP = "preferred_music_app"

    // Known music packages
    val MUSIC_APPS = listOf(
        Pair("Spotify", "com.spotify.music"),
        Pair("YouTube Music", "com.google.android.apps.youtube.music"),
        Pair("Amazon Music", "com.amazon.mp3"),
        Pair("Wynk Music", "com.bsb.hdev.wynk"),
        Pair("Apple Music", "com.apple.android.music"),
        Pair("SoundCloud", "com.soundcloud.android"),
        Pair("JioSaavn", "com.jio.media.jiobeats")
    )

    fun getPreferredMusicApp(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_PREFERRED_MUSIC_APP, "auto") ?: "auto"
    }

    fun setPreferredMusicApp(context: Context, appNameOrPkg: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_PREFERRED_MUSIC_APP, appNameOrPkg).apply()
    }

    /**
     * Finds installed music apps on the device.
     */
    fun getInstalledMusicApps(context: Context): List<Pair<String, String>> {
        val pm = context.packageManager
        return MUSIC_APPS.filter { (_, pkg) ->
            try {
                pm.getPackageInfo(pkg, 0)
                true
            } catch (_: Exception) {
                false
            }
        }
    }

    /**
     * Resolves which music app package to target based on preference and availability.
     */
    private fun resolveTargetMusicPackage(context: Context): Pair<String, String?> {
        val preferred = getPreferredMusicApp(context)
        val installed = getInstalledMusicApps(context)

        if (preferred != "auto") {
            val matching = installed.firstOrNull {
                it.first.equals(preferred, ignoreCase = true) || it.second.equals(preferred, ignoreCase = true)
            }
            if (matching != null) return matching
        }

        // Return first installed or null
        return installed.firstOrNull() ?: Pair("System Player", null)
    }

    /**
     * Plays a track or artist using standard Android MEDIA_PLAY_FROM_SEARCH intent.
     */
    fun playMusic(context: Context, songTitle: String?, artistName: String?): MusicActionResult {
        if (songTitle.isNullOrBlank() && artistName.isNullOrBlank()) {
            return MusicActionResult.NeedsSongSpecification("Which song or artist would you like to listen to?")
        }

        val (targetLabel, targetPkg) = resolveTargetMusicPackage(context)
        val queryBuilder = StringBuilder()
        if (!songTitle.isNullOrBlank()) queryBuilder.append(songTitle)
        if (!artistName.isNullOrBlank()) {
            if (queryBuilder.isNotEmpty()) queryBuilder.append(" by ")
            queryBuilder.append(artistName)
        }
        val fullQuery = queryBuilder.toString()

        val intent = Intent(MediaStore.INTENT_ACTION_MEDIA_PLAY_FROM_SEARCH).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
            putExtra(SearchManager.QUERY, fullQuery)
            if (!songTitle.isNullOrBlank()) {
                putExtra(MediaStore.EXTRA_MEDIA_TITLE, songTitle)
                putExtra(MediaStore.EXTRA_MEDIA_FOCUS, MediaStore.Audio.Media.ENTRY_CONTENT_TYPE)
            }
            if (!artistName.isNullOrBlank()) {
                putExtra(MediaStore.EXTRA_MEDIA_ARTIST, artistName)
                if (songTitle.isNullOrBlank()) {
                    putExtra(MediaStore.EXTRA_MEDIA_FOCUS, MediaStore.Audio.Artists.ENTRY_CONTENT_TYPE)
                }
            }
            if (!targetPkg.isNullOrBlank()) {
                setPackage(targetPkg)
            }
        }

        return try {
            val pm = context.packageManager
            if (intent.resolveActivity(pm) != null) {
                context.startActivity(intent)
                MusicActionResult.PlaybackInitiated(songTitle ?: fullQuery, artistName, targetLabel)
            } else {
                // Fallback to opening YouTube or browser search
                val searchIntent = Intent(Intent.ACTION_WEB_SEARCH).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                    putExtra(SearchManager.QUERY, "play $fullQuery")
                }
                context.startActivity(searchIntent)
                MusicActionResult.SearchOpened(fullQuery, "Web Search")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error playing music: ${e.message}")
            MusicActionResult.Error("Could not launch music player: ${e.localizedMessage}")
        }
    }

    /**
     * Controls current media playback via standard AudioManager media key events.
     */
    fun sendMediaControl(context: Context, keyCode: Int, actionName: String): MusicActionResult {
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
            ?: return MusicActionResult.Error("Audio service unavailable.")

        return try {
            val eventDown = KeyEvent(KeyEvent.ACTION_DOWN, keyCode)
            val eventUp = KeyEvent(KeyEvent.ACTION_UP, keyCode)
            audioManager.dispatchMediaKeyEvent(eventDown)
            audioManager.dispatchMediaKeyEvent(eventUp)
            MusicActionResult.PlaybackControlled(actionName)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to dispatch media key $keyCode: ${e.message}")
            MusicActionResult.Error("Could not perform $actionName: ${e.localizedMessage}")
        }
    }

    fun pausePlayback(context: Context): MusicActionResult =
        sendMediaControl(context, KeyEvent.KEYCODE_MEDIA_PAUSE, "Paused")

    fun resumePlayback(context: Context): MusicActionResult =
        sendMediaControl(context, KeyEvent.KEYCODE_MEDIA_PLAY, "Resumed")

    fun togglePlayPause(context: Context): MusicActionResult =
        sendMediaControl(context, KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE, "Play/Pause toggled")

    fun stopPlayback(context: Context): MusicActionResult =
        sendMediaControl(context, KeyEvent.KEYCODE_MEDIA_STOP, "Stopped")

    fun nextTrack(context: Context): MusicActionResult =
        sendMediaControl(context, KeyEvent.KEYCODE_MEDIA_NEXT, "Next track")

    fun previousTrack(context: Context): MusicActionResult =
        sendMediaControl(context, KeyEvent.KEYCODE_MEDIA_PREVIOUS, "Previous track")

    /**
     * Adjusts the music audio stream volume up or down.
     */
    fun adjustVolume(context: Context, increase: Boolean): MusicActionResult {
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
            ?: return MusicActionResult.Error("Audio service unavailable.")

        val direction = if (increase) AudioManager.ADJUST_RAISE else AudioManager.ADJUST_LOWER
        audioManager.adjustStreamVolume(AudioManager.STREAM_MUSIC, direction, AudioManager.FLAG_SHOW_UI)
        val currentVol = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC)
        return MusicActionResult.VolumeAdjusted(if (increase) "increased" else "decreased", currentVol)
    }
}
