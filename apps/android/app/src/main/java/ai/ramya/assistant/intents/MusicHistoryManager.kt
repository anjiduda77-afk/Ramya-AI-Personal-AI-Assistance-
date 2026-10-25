package ai.ramya.assistant.intents

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class PlayedSongEntry(
    val songTitle: String,
    val artistName: String?,
    val timestamp: Long,
    val dateString: String
)

data class IdentifiedSongResult(
    val songTitle: String,
    val artistName: String,
    val matchedLyricsSnippet: String,
    val confidence: Float
)

/**
 * Music Playback History and Multi-Stage Song Identification Manager.
 * Stores local playback history, manages remembered tracks from yesterday,
 * and handles lyric fragment matching and melody/humming state transitions.
 */
object MusicHistoryManager {

    private const val PREFS_NAME = "ramya_music_history"
    private const val KEY_HISTORY = "playback_history_json"
    private const val MAX_HISTORY_ITEMS = 50

    // Curated catalog for offline lyric matching (Indian and international favorites)
    private val LYRIC_INDEX = listOf(
        IdentifiedSongResult("Naatu Naatu", "M. M. Keeravani, Rahul Sipligunj & Kaala Bhairava", "naatu naatu naatu veera naatu", 0.95f),
        IdentifiedSongResult("Kesariya", "Arijit Singh & Pritam", "kesariya tera ishq hai piya", 0.95f),
        IdentifiedSongResult("Chaleya", "Arijit Singh & Shilpa Rao", "chaleya teri ore chaleya", 0.95f),
        IdentifiedSongResult("Samajavaragamana", "Sid Sriram & Thaman S", "samajavaragamana ninu choosi aagagalana", 0.95f),
        IdentifiedSongResult("Inkem Inkem", "Sid Sriram & Gopi Sundar", "inkem inkem inkem kaavaale chaale idi chaale", 0.95f),
        IdentifiedSongResult("Butta Bomma", "Armaan Malik & Thaman S", "butta bomma butta bomma nannu suttu kolla ve", 0.95f),
        IdentifiedSongResult("Shape of You", "Ed Sheeran", "i'm in love with the shape of you", 0.95f),
        IdentifiedSongResult("Believer", "Imagine Dragons", "pain you made me a you made me a believer", 0.95f),
        IdentifiedSongResult("Levitating", "Dua Lipa", "you want me i want you baby my sugarboo", 0.95f),
        IdentifiedSongResult("Tum Hi Ho", "Arijit Singh & Mithoon", "kyunki tum hi ho ab tum hi ho zindagi ab tum hi ho", 0.95f),
        IdentifiedSongResult("Raataan Lambiyan", "Jubin Nautiyal & Asees Kaur", "kaate kate na kate re raatan lambiyan", 0.95f),
        IdentifiedSongResult("Jai Ho", "A. R. Rahman & Sukhwinder Singh", "jai ho jai ho aaja aaja jind shamiyane ke tale", 0.95f)
    )

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    /**
     * Records a song to local playback history.
     */
    fun recordPlayedSong(context: Context, songTitle: String, artistName: String?) {
        val prefs = getPrefs(context)
        val historyList = getPlaybackHistory(context).toMutableList()

        val now = System.currentTimeMillis()
        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val dateStr = dateFormat.format(Date(now))

        val entry = PlayedSongEntry(
            songTitle = songTitle.trim(),
            artistName = artistName?.trim(),
            timestamp = now,
            dateString = dateStr
        )

        // Remove duplicate of same song at top of list
        historyList.removeAll { it.songTitle.equals(songTitle.trim(), ignoreCase = true) }
        historyList.add(0, entry)

        // Trim to max items
        val trimmed = historyList.take(MAX_HISTORY_ITEMS)

        val jsonArray = JSONArray()
        for (item in trimmed) {
            val obj = JSONObject().apply {
                put("title", item.songTitle)
                put("artist", item.artistName ?: "")
                put("timestamp", item.timestamp)
                put("date", item.dateString)
            }
            jsonArray.put(obj)
        }

        prefs.edit().putString(KEY_HISTORY, jsonArray.toString()).apply()
    }

    /**
     * Retrieves all locally recorded playback history.
     */
    fun getPlaybackHistory(context: Context): List<PlayedSongEntry> {
        val prefs = getPrefs(context)
        val jsonStr = prefs.getString(KEY_HISTORY, null) ?: return emptyList()

        val results = mutableListOf<PlayedSongEntry>()
        try {
            val jsonArray = JSONArray(jsonStr)
            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                val artist = obj.optString("artist")
                results.add(
                    PlayedSongEntry(
                        songTitle = obj.getString("title"),
                        artistName = if (artist.isNotBlank()) artist else null,
                        timestamp = obj.optLong("timestamp", 0L),
                        dateString = obj.optString("date", "")
                    )
                )
            }
        } catch (_: Exception) {
            // Invalid JSON
        }
        return results
    }

    /**
     * Retrieves the most recently played song ("Play that song again").
     */
    fun getLastPlayedSong(context: Context): PlayedSongEntry? {
        return getPlaybackHistory(context).firstOrNull()
    }

    /**
     * Retrieves a song played yesterday ("Play the song I was listening to yesterday").
     */
    fun getYesterdaySong(context: Context): PlayedSongEntry? {
        val history = getPlaybackHistory(context)
        if (history.isEmpty()) return null

        val oneDayAgoMs = System.currentTimeMillis() - (24 * 60 * 60 * 1000)
        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val yesterdayDateStr = dateFormat.format(Date(oneDayAgoMs))

        // First attempt exact date string match for yesterday
        val yesterdayMatch = history.firstOrNull { it.dateString == yesterdayDateStr }
        if (yesterdayMatch != null) return yesterdayMatch

        // Fallback to the second most recent song or first available prior track
        return if (history.size > 1) history[1] else history.first()
    }

    /**
     * Multi-stage lyric fragment identification.
     * Looks for keyword matches against indexed songs or extracts lyric phrase.
     */
    fun identifySongFromLyrics(lyricsQuery: String): List<IdentifiedSongResult> {
        val cleanLyrics = lyricsQuery.lowercase().trim()
            .replace(Regex("^(?:find|search|identify)\\s+(?:the\\s+)?song\\s+(?:with\\s+)?(?:the\\s+)?lyrics\\s*(?:i\\s+remember)?[:\\s]*"), "")
            .replace(Regex("^(?:what\\s+is\\s+the\\s+song\\s+that\\s+goes|song\\s+that\\s+goes)\\s*"), "")
            .trim()

        if (cleanLyrics.isBlank()) return emptyList()

        val tokens = cleanLyrics.split(" ").filter { it.length > 2 }
        if (tokens.isEmpty()) return emptyList()

        val matches = mutableListOf<IdentifiedSongResult>()
        for (item in LYRIC_INDEX) {
            val itemSnippet = item.matchedLyricsSnippet.lowercase()
            val itemTitle = item.songTitle.lowercase()

            val tokenMatches = tokens.count { token -> itemSnippet.contains(token) || itemTitle.contains(token) }
            if (tokenMatches > 0) {
                val score = tokenMatches.toFloat() / tokens.size
                matches.add(item.copy(confidence = score.coerceIn(0.5f, 0.98f)))
            }
        }

        return matches.sortedByDescending { it.confidence }
    }
}
