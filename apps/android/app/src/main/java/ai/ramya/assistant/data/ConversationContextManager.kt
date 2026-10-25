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
    data class WhatsAppMessage(val contact: ContactInfo, val messageText: String, val appName: String = "WhatsApp") : PendingConfirmation()
    data class PlayIdentifiedSong(val songTitle: String, val artistName: String?) : PendingConfirmation()
    data class DisambiguateWhatsAppRecipient(val matches: List<ContactInfo>, val messageText: String) : PendingConfirmation()
}

/**
 * Multi-turn Conversational Context and Memory Manager.
 * Preserves session state across turns, resolves pronouns ("Open it", "Call him", "Play that song", "Send the same message to..."),
 * maintains conversation continuity across polite fillers ("thanks", "okay", "hmm"),
 * and cleanly handles explicit termination ("Goodbye", "Stop listening", "Sleep").
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

    var lastMessageText: String? = null
        private set

    var lastRecipient: ContactInfo? = null
        private set

    var lastIdentifiedLyricsSong: String? = null
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
     * Checks if the user is confirming a pending action (e.g. "yes", "sure", "proceed", "call", "send").
     */
    fun isConfirmation(utterance: String): Boolean {
        val clean = utterance.trim().lowercase().removeSuffix(".").removeSuffix("!")
        return clean in setOf("yes", "yeah", "yep", "sure", "go ahead", "do it", "please", "confirm", "open it", "call", "send", "send it", "install", "play it")
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
        lastRecipient = contact
        lastIntentType = "CALL"
    }

    fun setLastMessage(contact: ContactInfo, text: String) {
        lastRecipient = contact
        lastMentionedContact = contact
        lastMessageText = text
        lastIntentType = "WHATSAPP"
    }

    fun setLastSong(song: String, artist: String?) {
        lastMentionedSong = song
        lastMentionedArtist = artist
        lastIntentType = "MUSIC"
    }

    fun setLastIdentifiedLyricsSong(songTitle: String) {
        lastIdentifiedLyricsSong = songTitle
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
     * - "Send him a message saying [X]" -> "send WhatsApp to [lastContact.name] saying [X]"
     * - "Send the same message to [Name]" -> "send WhatsApp to [Name] saying [lastMessageText]"
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

        // "play that song" / "play it" / "play that" -> play last song
        if ((lower == "play that song" || lower == "play it" || lower == "play that") && !lastMentionedSong.isNullOrBlank()) {
            return "play $lastMentionedSong"
        }

        // "send the same message to [Name]" -> resolve lastMessageText
        val sameMsgRegex = Regex("^send\\s+(?:the\\s+)?same\\s+message\\s+to\\s+(.+)$", RegexOption.IGNORE_CASE)
        val sameMsgMatch = sameMsgRegex.find(clean)
        if (sameMsgMatch != null && !lastMessageText.isNullOrBlank()) {
            val recipient = sameMsgMatch.groupValues[1].trim()
            return "send $recipient a WhatsApp message saying $lastMessageText"
        }

        // "send him/her a message saying [X]" -> resolve recipient
        val sendHimRegex = Regex("^send\\s+(?:him|her|them)\\s+a\\s+(?:whatsapp\\s+)?message\\s+saying\\s+(.+)$", RegexOption.IGNORE_CASE)
        val sendHimMatch = sendHimRegex.find(clean)
        if (sendHimMatch != null && lastRecipient != null) {
            val text = sendHimMatch.groupValues[1].trim()
            return "send ${lastRecipient?.name} a WhatsApp message saying $text"
        }

        // "reply saying [X]" -> resolve recipient
        val replyRegex = Regex("^(?:reply|respond)\\s+(?:to\\s+this\\s+message\\s+)?saying\\s+(.+)$", RegexOption.IGNORE_CASE)
        val replyMatch = replyRegex.find(clean)
        if (replyMatch != null && lastRecipient != null) {
            val text = replyMatch.groupValues[1].trim()
            return "send ${lastRecipient?.name} a WhatsApp message saying $text"
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
