package ai.ramya.assistant.data

import ai.ramya.assistant.intents.ContactInfo

/**
 * State of any pending action awaiting user confirmation.
 */
sealed class PendingConfirmation {
    data class PlayStoreInstall(val appName: String, val packageName: String?) : PendingConfirmation()
    data class PhoneCall(val contact: ContactInfo) : PendingConfirmation()
    data class AppDisambiguation(val matches: List<Pair<String, String>>) : PendingConfirmation()
    data class MusicDisambiguation(val query: String) : PendingConfirmation()
}

/**
 * Multi-turn Conversational Context and Memory Manager.
 * Preserves session state across turns, resolves pronouns ("Open it", "Call him", "Play that song"),
 * maintains conversation continuity across polite fillers ("thanks", "okay", "hmm"),
 * and cleanly handles explicit termination ("Goodbye", "Stop listening").
 */
object ConversationContextManager {

    var isSessionActive: Boolean = true
        private set

    var lastMentionedApp: String? = null
        private set

    var lastMentionedPackage: String? = null
        private set

    var lastMentionedContact: ContactInfo? = null
        private set

    var lastMentionedSong: String? = null
        private set

    var lastMentionedArtist: String? = null
        private set

    var lastIntentType: String? = null
        private set

    var pendingConfirmation: PendingConfirmation? = null
        private set

    // Wake words recognized
    private val WAKE_PHRASES = listOf("hey ramya", "hello ramya", "ramya ai", "hi ramya", "ramya")

    // Filler utterances that must NEVER terminate the session
    private val FILLER_PHRASES = setOf(
        "thanks", "thank you", "thank you so much", "thanks ramya", "thank you ramya",
        "okay", "ok", "alright", "got it", "cool", "great", "nice", "awesome",
        "hmm", "hmmm", "sure", "fine", "yep", "yeah", "understood"
    )

    // Explicit termination phrases
    private val TERMINATION_PHRASES = setOf(
        "goodbye", "bye", "bye ramya", "goodbye ramya", "stop listening",
        "stop voice", "sleep", "go to sleep", "exit", "close assistant", "shut down"
    )

    fun startSession() {
        isSessionActive = true
    }

    fun endSession() {
        isSessionActive = false
        pendingConfirmation = null
    }

    /**
     * Checks if the utterance contains a wake phrase and strips it for cleaner processing.
     */
    fun extractWakePhrase(utterance: String): Pair<Boolean, String> {
        val lower = utterance.trim().lowercase()
        for (phrase in WAKE_PHRASES) {
            if (lower.startsWith(phrase)) {
                val cleaned = lower.removePrefix(phrase).trim().removePrefix(",").trim()
                return Pair(true, cleaned)
            }
        }
        return Pair(false, utterance.trim())
    }

    /**
     * Checks if the utterance is an ordinary conversational filler that should not end the session.
     */
    fun isConversationalFiller(utterance: String): Boolean {
        val clean = utterance.trim().lowercase().removeSuffix(".").removeSuffix("!")
        return FILLER_PHRASES.contains(clean)
    }

    /**
     * Checks if the user explicitly requested to end or pause the conversation.
     */
    fun isTerminationCommand(utterance: String): Boolean {
        val clean = utterance.trim().lowercase().removeSuffix(".").removeSuffix("!")
        return TERMINATION_PHRASES.contains(clean)
    }

    /**
     * Checks if the user is confirming a pending action (e.g. "yes", "sure", "proceed", "call").
     */
    fun isConfirmation(utterance: String): Boolean {
        val clean = utterance.trim().lowercase().removeSuffix(".").removeSuffix("!")
        return clean in setOf("yes", "yeah", "yep", "sure", "go ahead", "do it", "please", "confirm", "open it", "call", "install")
    }

    /**
     * Checks if the user is declining a pending action (e.g. "no", "cancel", "don't").
     */
    fun isRejection(utterance: String): Boolean {
        val clean = utterance.trim().lowercase().removeSuffix(".").removeSuffix("!")
        return clean in setOf("no", "nope", "cancel", "don't", "stop", "never mind", "leave it")
    }

    // --- State Update Methods ---

    fun setLastApp(appName: String, packageName: String?) {
        lastMentionedApp = appName
        lastMentionedPackage = packageName
        lastIntentType = "APP"
    }

    fun setLastContact(contact: ContactInfo) {
        lastMentionedContact = contact
        lastIntentType = "CALL"
    }

    fun setLastSong(song: String, artist: String?) {
        lastMentionedSong = song
        lastMentionedArtist = artist
        lastIntentType = "MUSIC"
    }

    fun setPendingConfirmation(confirmation: PendingConfirmation?) {
        pendingConfirmation = confirmation
    }

    fun clearPendingConfirmation() {
        pendingConfirmation = null
    }

    /**
     * Resolves pronouns and references in follow-up commands:
     * - "Open it" -> "open [lastApp]"
     * - "Play that song" / "Play it" -> "play [lastSong]"
     * - "Call him" / "Call her" / "Call them" -> "call [lastContact.name]"
     */
    fun resolvePronouns(utterance: String): String {
        val clean = utterance.trim()
        val lower = clean.lowercase()

        // "open it" -> open last app
        if ((lower == "open it" || lower == "launch it") && !lastMentionedApp.isNullOrBlank()) {
            return "open $lastMentionedApp"
        }

        // "call him" / "call her" / "call them" -> call last contact
        if ((lower == "call him" || lower == "call her" || lower == "call them" || lower == "call that contact") && lastMentionedContact != null) {
            return "call ${lastMentionedContact?.name}"
        }

        // "play that song" / "play it" -> play last song
        if ((lower == "play that song" || lower == "play it" || lower == "play that") && !lastMentionedSong.isNullOrBlank()) {
            return "play $lastMentionedSong"
        }

        return clean
    }

    fun getFriendlyFillerResponse(): String {
        val responses = listOf(
            "You're very welcome! I'm right here whenever you need me.",
            "Always happy to help you! What's next?",
            "Anytime! Feel free to ask me anything else.",
            "Glad I could help. Let me know if you need anything else!"
        )
        return responses.random()
    }
}
