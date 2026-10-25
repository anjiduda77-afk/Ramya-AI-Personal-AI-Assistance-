package ai.ramya.assistant.orchestrator

import android.content.Context
import ai.ramya.assistant.data.CloudManager
import ai.ramya.assistant.data.ConversationContextManager
import ai.ramya.assistant.data.DocumentRagManager
import ai.ramya.assistant.data.PendingConfirmation
import ai.ramya.assistant.intents.*
import ai.ramya.assistant.metrics.MetricLogger

data class OrchestratorResponse(
    val displayText: String,
    val spokenText: String,
    val isSessionActive: Boolean = true,
    val actionTag: String = "GENERAL_AI"
)

/**
 * Master Native Intent and Conversation Orchestrator for Ramya AI.
 * Dispatches voice and text inputs across App Launcher, WhatsApp Messaging,
 * Music Controls & Lyric Identification, Safe Calling,
 * Multi-Turn Pronoun Resolution, and Cloud AI Reasoning.
 */
object AssistantOrchestrator {

    suspend fun processQuery(context: Context, rawQuery: String): OrchestratorResponse {
        val startTime = System.currentTimeMillis()
        val (_, strippedQuery) = ConversationContextManager.extractWakePhrase(rawQuery)
        val cleanQuery = strippedQuery.trim()

        if (cleanQuery.isBlank()) {
            return OrchestratorResponse(
                displayText = "I'm listening! You can ask me to send WhatsApp messages, play music, call contacts, or answer questions.",
                spokenText = "I am listening! How can I help you?",
                actionTag = "PROMPT"
            )
        }

        // 1. Explicit Termination Handling ("Goodbye", "Stop listening", "Sleep", "Go to sleep")
        if (ConversationContextManager.isTerminationCommand(cleanQuery)) {
            ConversationContextManager.endSession()
            MetricLogger.logToolExecution(context, "Termination", true, System.currentTimeMillis() - startTime)
            return OrchestratorResponse(
                displayText = "Goodbye! Voice session paused. Wake me anytime with 'Hey Ramya'.",
                spokenText = "Goodbye! Wake me anytime with 'Hey Ramya'.",
                isSessionActive = false,
                actionTag = "TERMINATION"
            )
        }

        // 2. Conversational Filler Handling ("thanks", "okay", "hmm", "got it")
        // Preserves session continuity without terminating
        if (ConversationContextManager.isConversationalFiller(cleanQuery)) {
            val fillerResponse = ConversationContextManager.getFriendlyFillerResponse()
            MetricLogger.logToolExecution(context, "Filler", true, System.currentTimeMillis() - startTime)
            return OrchestratorResponse(
                displayText = fillerResponse,
                spokenText = fillerResponse,
                isSessionActive = true,
                actionTag = "FILLER"
            )
        }

        // 3. Pending Confirmation Handling (WhatsApp, Call, Play Store, Song Playback)
        val pending = ConversationContextManager.pendingConfirmation
        if (pending != null) {
            if (ConversationContextManager.isConfirmation(cleanQuery)) {
                ConversationContextManager.clearPendingConfirmation()
                when (pending) {
                    is PendingConfirmation.WhatsAppMessage -> {
                        val result = WhatsAppManager.executeWhatsAppDispatch(context, pending.contact, pending.messageText)
                        MetricLogger.logToolExecution(context, "WhatsAppConfirm", true, System.currentTimeMillis() - startTime)
                        return when (result) {
                            is MessageActionResult.WhatsAppConversationOpened -> {
                                ConversationContextManager.setLastMessage(pending.contact, pending.messageText)
                                OrchestratorResponse(
                                    displayText = "Opening WhatsApp with ${pending.contact.name} (${pending.contact.number})\nMessage: \"${pending.messageText}\"\n\nPlease tap Send in WhatsApp to deliver.",
                                    spokenText = "Opening WhatsApp for ${pending.contact.name}. Please tap Send.",
                                    actionTag = "WHATSAPP_OPENED"
                                )
                            }
                            is MessageActionResult.Error -> OrchestratorResponse(
                                displayText = result.message,
                                spokenText = result.message,
                                actionTag = "ERROR"
                            )
                            else -> OrchestratorResponse(
                                displayText = "Opening WhatsApp...",
                                spokenText = "Opening WhatsApp.",
                                actionTag = "WHATSAPP_OPENED"
                            )
                        }
                    }
                    is PendingConfirmation.PhoneCall -> {
                        val result = ContactCallManager.executeCall(context, pending.contact, isConfirmed = true)
                        MetricLogger.logToolExecution(context, "CallConfirm", true, System.currentTimeMillis() - startTime)
                        return when (result) {
                            is ContactResolutionResult.DirectCallInitiated -> OrchestratorResponse(
                                displayText = "Calling ${pending.contact.name} (${pending.contact.number})...",
                                spokenText = "Calling ${pending.contact.name} now.",
                                actionTag = "CALL"
                            )
                            is ContactResolutionResult.DialerOpened -> OrchestratorResponse(
                                displayText = "Opening phone dialer for ${pending.contact.name} (${pending.contact.number})...",
                                spokenText = "Opening dialer for ${pending.contact.name}.",
                                actionTag = "DIALER"
                            )
                            is ContactResolutionResult.Error -> OrchestratorResponse(
                                displayText = result.message,
                                spokenText = result.message,
                                actionTag = "ERROR"
                            )
                            else -> OrchestratorResponse(
                                displayText = "Placing call...",
                                spokenText = "Placing call.",
                                actionTag = "CALL"
                            )
                        }
                    }
                    is PendingConfirmation.PlayStoreInstall -> {
                        val result = AppLauncherManager.openPlayStore(context, pending.appName, pending.packageName)
                        MetricLogger.logToolExecution(context, "PlayStore", true, System.currentTimeMillis() - startTime)
                        return when (result) {
                            is AppResolutionResult.PlayStoreOpened -> OrchestratorResponse(
                                displayText = "Opening Google Play Store for ${pending.appName}...",
                                spokenText = "Opening Google Play Store for ${pending.appName}.",
                                actionTag = "PLAY_STORE"
                            )
                            is AppResolutionResult.Error -> OrchestratorResponse(
                                displayText = result.message,
                                spokenText = result.message,
                                actionTag = "ERROR"
                            )
                            else -> OrchestratorResponse(
                                displayText = "Opening Play Store...",
                                spokenText = "Opening Play Store.",
                                actionTag = "PLAY_STORE"
                            )
                        }
                    }
                    is PendingConfirmation.PlayIdentifiedSong -> {
                        val musicResult = MusicPlaybackManager.playMusic(context, pending.songTitle, pending.artistName)
                        MetricLogger.logToolExecution(context, "SongConfirm", true, System.currentTimeMillis() - startTime)
                        ConversationContextManager.setLastSong(pending.songTitle, pending.artistName)
                        val msg = "Playing '${pending.songTitle}' on music player."
                        return OrchestratorResponse(msg, msg, actionTag = "MUSIC")
                    }
                    else -> {}
                }
            } else if (ConversationContextManager.isRejection(cleanQuery)) {
                ConversationContextManager.clearPendingConfirmation()
                MetricLogger.logToolExecution(context, "Rejection", true, System.currentTimeMillis() - startTime)
                return OrchestratorResponse(
                    displayText = "Action cancelled. What else can I help you with?",
                    spokenText = "Action cancelled. What would you like to do next?",
                    actionTag = "CANCEL"
                )
            }
        }

        // 4. Resolve Context & Pronouns ("Open it", "Call him", "Play that song", "Send the same message to...")
        val resolvedQuery = ConversationContextManager.resolvePronouns(cleanQuery)
        val lower = resolvedQuery.lowercase()

        // 5. Read Stored / Prepared Message Aloud
        if (lower in setOf("read the message aloud", "read message aloud", "read my message", "read message")) {
            val lastMsg = ConversationContextManager.lastMessageText
            val recipient = ConversationContextManager.lastRecipient?.name ?: "your contact"
            return if (!lastMsg.isNullOrBlank()) {
                val readSpoken = "Your message for $recipient is: \"$lastMsg\"."
                OrchestratorResponse(
                    displayText = "Prepared Message for $recipient:\n\"$lastMsg\"",
                    spokenText = readSpoken,
                    actionTag = "READ_MESSAGE"
                )
            } else {
                OrchestratorResponse(
                    displayText = "No recent message text found in this session.",
                    spokenText = "You haven't prepared any message yet.",
                    actionTag = "READ_MESSAGE"
                )
            }
        }

        // 6. WhatsApp & Mobile Messaging Intent
        val (parsedRecipient, parsedMsg, hasMsgPattern) = WhatsAppManager.parseMessageQuery(resolvedQuery)
        if (hasMsgPattern || parsedRecipient != null) {
            val recipient = parsedRecipient ?: ConversationContextManager.lastRecipient?.name ?: ""
            val messageBody = parsedMsg ?: ConversationContextManager.lastMessageText ?: ""

            if (recipient.isBlank()) {
                return OrchestratorResponse(
                    displayText = "Who would you like me to send a WhatsApp message to?",
                    spokenText = "Who would you like to send this WhatsApp message to?",
                    actionTag = "MESSAGE_PROMPT"
                )
            }
            if (messageBody.isBlank()) {
                return OrchestratorResponse(
                    displayText = "What message would you like to send to $recipient?",
                    spokenText = "What message would you like to send to $recipient?",
                    actionTag = "MESSAGE_PROMPT"
                )
            }

            val prepResult = WhatsAppManager.prepareMessage(context, recipient, messageBody, bypassConfirmation = false)
            MetricLogger.logToolExecution(context, "WhatsAppPrepare", true, System.currentTimeMillis() - startTime)

            return when (prepResult) {
                is MessageActionResult.ConfirmationRequired -> {
                    ConversationContextManager.setPendingConfirmation(
                        PendingConfirmation.WhatsAppMessage(prepResult.contact, prepResult.messageText)
                    )
                    val confirmDisplay = "Ready to send WhatsApp message to ${prepResult.contact.name} (${prepResult.contact.number}):\n\n\"${prepResult.messageText}\"\n\nSay 'Yes' or 'Send' to proceed, or 'Cancel'."
                    val confirmSpoken = "I prepared your WhatsApp message for ${prepResult.contact.name}: \"${prepResult.messageText}\". Shall I open WhatsApp?"
                    OrchestratorResponse(confirmDisplay, confirmSpoken, actionTag = "WHATSAPP_CONFIRM")
                }
                is MessageActionResult.NeedsDisambiguation -> {
                    val names = prepResult.matches.joinToString(", ") { "${it.name} (${it.number})" }
                    OrchestratorResponse(
                        displayText = "I found multiple contacts matching '${prepResult.query}':\n$names\n\nWhich contact would you like to message?",
                        spokenText = "I found multiple contacts for ${prepResult.query}. Which one would you like to message?",
                        actionTag = "WHATSAPP_DISAMBIGUATION"
                    )
                }
                is MessageActionResult.ContactNotFound -> {
                    OrchestratorResponse(
                        displayText = "I couldn't find '${prepResult.query}' in your contacts. You can say their phone number directly.",
                        spokenText = "I couldn't find ${prepResult.query} in your contacts.",
                        actionTag = "CONTACT_NOT_FOUND"
                    )
                }
                is MessageActionResult.AppNotInstalled -> {
                    ConversationContextManager.setPendingConfirmation(
                        PendingConfirmation.PlayStoreInstall("WhatsApp", WhatsAppManager.WHATSAPP_PACKAGE)
                    )
                    OrchestratorResponse(
                        displayText = "WhatsApp is not installed on this device. Would you like me to open its Google Play Store page so you can install it?",
                        spokenText = "WhatsApp is not installed on this device. Would you like to open Google Play Store?",
                        actionTag = "PLAY_STORE_PROMPT"
                    )
                }
                is MessageActionResult.PermissionRequired -> {
                    OrchestratorResponse(
                        displayText = prepResult.message,
                        spokenText = prepResult.message,
                        actionTag = "PERMISSION_REQUIRED"
                    )
                }
                is MessageActionResult.NeedsDetails -> {
                    OrchestratorResponse(
                        displayText = prepResult.prompt,
                        spokenText = prepResult.prompt,
                        actionTag = "MESSAGE_PROMPT"
                    )
                }
                is MessageActionResult.Error -> {
                    OrchestratorResponse(prepResult.message, prepResult.message, actionTag = "ERROR")
                }
                else -> OrchestratorResponse("Processing message...", "Processing message.", actionTag = "MESSAGE")
            }
        }

        // 7. Advanced Music Identification: Lyrics Search & Humming Mode
        val lyricsRegex = Regex("^(?:find|search|what\\s+is)\\s+(?:the\\s+)?song\\s+(?:with\\s+)?(?:the\\s+)?lyrics\\s*(?:i\\s+remember)?[:\\s]*(.+)$", RegexOption.IGNORE_CASE)
        val lyricsMatch = lyricsRegex.find(lower)
        if (lyricsMatch != null) {
            val lyricsQuery = lyricsMatch.groupValues[1].trim()
            val matches = MusicHistoryManager.identifySongFromLyrics(lyricsQuery)
            if (matches.isNotEmpty()) {
                val best = matches.first()
                ConversationContextManager.setPendingConfirmation(
                    PendingConfirmation.PlayIdentifiedSong(best.songTitle, best.artistName)
                )
                ConversationContextManager.setLastIdentifiedLyricsSong(best.songTitle)
                val replyDisplay = "Identified Song from lyrics:\n🎵 **${best.songTitle}** by ${best.artistName}\nConfidence: ${(best.confidence * 100).toInt()}%\n\nWould you like me to play it?"
                val replySpoken = "I found the song '${best.songTitle}' by ${best.artistName}. Would you like me to play it?"
                return OrchestratorResponse(replyDisplay, replySpoken, actionTag = "LYRICS_IDENTIFIED")
            } else {
                return OrchestratorResponse(
                    displayText = "I couldn't identify a song from those exact lyrics offline. Could you give me another line or the singer's name?",
                    spokenText = "I couldn't match those lyrics. Could you tell me a few more words or the singer's name?",
                    actionTag = "LYRICS_NOT_FOUND"
                )
            }
        }

        // Humming / Melody Recognition Intent
        if (lower.contains("remember its tune") || lower.contains("forgot the song name") || lower.contains("hum the song") || lower == "identify tune") {
            return OrchestratorResponse(
                displayText = "🎵 Melody Mode Activated:\nTap the microphone and hum or whistle the tune for 5 seconds.\n\nNote: Offline melody recognition confidence is conservative. If match is uncertain, you can also speak a lyric clue or artist name.",
                spokenText = "Melody capture ready. Please hum the tune, or tell me a lyric clue to help find it.",
                actionTag = "MELODY_CAPTURE"
            )
        }

        // 8. Playback History ("Play that song again", "Play the song I was listening to yesterday")
        if (lower in setOf("play that song again", "play that song", "play again", "replay song", "repeat song")) {
            val lastPlayed = MusicHistoryManager.getLastPlayedSong(context)
            if (lastPlayed != null) {
                val res = MusicPlaybackManager.playMusic(context, lastPlayed.songTitle, lastPlayed.artistName)
                ConversationContextManager.setLastSong(lastPlayed.songTitle, lastPlayed.artistName)
                val msg = "Playing '${lastPlayed.songTitle}' again."
                return OrchestratorResponse(msg, msg, actionTag = "MUSIC")
            }
        }

        if (lower.contains("listening to yesterday") || lower.contains("song from yesterday") || lower == "play yesterday's song") {
            val yesterdaySong = MusicHistoryManager.getYesterdaySong(context)
            if (yesterdaySong != null) {
                val res = MusicPlaybackManager.playMusic(context, yesterdaySong.songTitle, yesterdaySong.artistName)
                ConversationContextManager.setLastSong(yesterdaySong.songTitle, yesterdaySong.artistName)
                val msg = "Playing '${yesterdaySong.songTitle}' from your recent history."
                return OrchestratorResponse(msg, msg, actionTag = "MUSIC")
            } else {
                return OrchestratorResponse(
                    displayText = "No playback history recorded from yesterday yet. Which song would you like to hear today?",
                    spokenText = "I don't see a song recorded from yesterday. What would you like to play?",
                    actionTag = "MUSIC_PROMPT"
                )
            }
        }

        // 9. Media Controls Intent (Pause, Resume, Next, Prev, Stop, Volume)
        if (lower in setOf("pause", "pause music", "pause song", "stop music", "stop song")) {
            MusicPlaybackManager.pausePlayback(context)
            MetricLogger.logToolExecution(context, "MediaControl", true, System.currentTimeMillis() - startTime)
            return OrchestratorResponse("Media playback paused.", "Paused.", actionTag = "MEDIA")
        }
        if (lower in setOf("resume", "resume music", "continue music", "play music again")) {
            MusicPlaybackManager.resumePlayback(context)
            MetricLogger.logToolExecution(context, "MediaControl", true, System.currentTimeMillis() - startTime)
            return OrchestratorResponse("Resuming media playback.", "Resuming.", actionTag = "MEDIA")
        }
        if (lower in setOf("next song", "next track", "skip song", "skip track")) {
            MusicPlaybackManager.nextTrack(context)
            MetricLogger.logToolExecution(context, "MediaControl", true, System.currentTimeMillis() - startTime)
            return OrchestratorResponse("Skipping to next track.", "Next track.", actionTag = "MEDIA")
        }
        if (lower in setOf("previous song", "previous track", "last track")) {
            MusicPlaybackManager.previousTrack(context)
            MetricLogger.logToolExecution(context, "MediaControl", true, System.currentTimeMillis() - startTime)
            return OrchestratorResponse("Playing previous track.", "Previous track.", actionTag = "MEDIA")
        }
        if (lower in setOf("volume up", "increase volume", "louder")) {
            MusicPlaybackManager.adjustVolume(context, increase = true)
            MetricLogger.logToolExecution(context, "Volume", true, System.currentTimeMillis() - startTime)
            return OrchestratorResponse("Volume increased.", "Volume increased.", actionTag = "VOLUME")
        }
        if (lower in setOf("volume down", "decrease volume", "lower volume", "softer")) {
            MusicPlaybackManager.adjustVolume(context, increase = false)
            MetricLogger.logToolExecution(context, "Volume", true, System.currentTimeMillis() - startTime)
            return OrchestratorResponse("Volume decreased.", "Volume decreased.", actionTag = "VOLUME")
        }

        // 10. Music Playback Intent ("Play [song]", "Play [song] by [artist]", "Play songs by [singer]")
        val playBySingerRegex = Regex("^play\\s+songs?\\s+by\\s+(.+)$", RegexOption.IGNORE_CASE)
        val playSingerMatch = playBySingerRegex.find(lower)
        if (playSingerMatch != null) {
            val singerName = playSingerMatch.groupValues[1].trim()
            ConversationContextManager.setLastSong("Songs by $singerName", singerName)
            val res = MusicPlaybackManager.playMusic(context, null, singerName)
            val msg = "Playing songs by $singerName."
            return OrchestratorResponse(msg, msg, actionTag = "MUSIC")
        }

        val playRegex = Regex("^(?:play|play me|stream|listen to)\\s+(.+)$", RegexOption.IGNORE_CASE)
        val playMatch = playRegex.find(lower)
        if (playMatch != null) {
            val fullSongQuery = playMatch.groupValues[1].trim()
            if (fullSongQuery.isBlank() || fullSongQuery in setOf("a song", "some music", "music", "songs")) {
                return OrchestratorResponse(
                    displayText = "Which song, artist, or playlist would you like to hear?",
                    spokenText = "Which song or artist would you like to hear?",
                    actionTag = "MUSIC_PROMPT"
                )
            }

            // Extract artist if formatted as "X by Y"
            val byRegex = Regex("^(.*?)\\s+by\\s+(.*)$", RegexOption.IGNORE_CASE)
            val byMatch = byRegex.find(fullSongQuery)
            val (songTitle, artistName) = if (byMatch != null) {
                Pair(byMatch.groupValues[1].trim(), byMatch.groupValues[2].trim())
            } else {
                Pair(fullSongQuery, null)
            }

            ConversationContextManager.setLastSong(songTitle, artistName)
            val musicResult = MusicPlaybackManager.playMusic(context, songTitle, artistName)
            MetricLogger.logToolExecution(context, "MusicPlay", true, System.currentTimeMillis() - startTime)

            return when (musicResult) {
                is MusicActionResult.PlaybackInitiated -> {
                    val msg = if (artistName != null) {
                        "Playing '$songTitle' by $artistName on ${musicResult.appName}."
                    } else {
                        "Playing '$songTitle' on ${musicResult.appName}."
                    }
                    OrchestratorResponse(msg, msg, actionTag = "MUSIC")
                }
                is MusicActionResult.SearchOpened -> {
                    val msg = "Searching for '${musicResult.query}' on ${musicResult.appName}."
                    OrchestratorResponse(msg, msg, actionTag = "MUSIC")
                }
                is MusicActionResult.NeedsSongSpecification -> {
                    OrchestratorResponse(musicResult.prompt, musicResult.prompt, actionTag = "MUSIC_PROMPT")
                }
                is MusicActionResult.Error -> {
                    OrchestratorResponse(musicResult.message, musicResult.message, actionTag = "ERROR")
                }
                else -> OrchestratorResponse("Searching music...", "Searching music.", actionTag = "MUSIC")
            }
        }

        // 11. App Launcher Intent ("Open [App]", "Launch [App]")
        val openAppRegex = Regex("^(?:open|launch|start|run)\\s+(.+)$", RegexOption.IGNORE_CASE)
        val openAppMatch = openAppRegex.find(lower)
        if (openAppMatch != null) {
            val appTarget = openAppMatch.groupValues[1].trim()
            val resolution = AppLauncherManager.openApp(context, appTarget)

            return when (resolution) {
                is AppResolutionResult.Launched -> {
                    ConversationContextManager.setLastApp(resolution.appName, resolution.packageName)
                    MetricLogger.logToolExecution(context, "AppLaunch", true, System.currentTimeMillis() - startTime)
                    val msg = "Opening ${resolution.appName}..."
                    OrchestratorResponse(msg, msg, actionTag = "APP_LAUNCH")
                }
                is AppResolutionResult.Ambiguous -> {
                    val matchesStr = resolution.matches.joinToString(" and ") { it.first }
                    MetricLogger.logToolExecution(context, "AppDisambiguate", true, System.currentTimeMillis() - startTime)
                    val msg = "I found multiple matching apps: $matchesStr. Which one did you mean?"
                    OrchestratorResponse(msg, msg, actionTag = "APP_AMBIGUOUS")
                }
                is AppResolutionResult.NotInstalled -> {
                    ConversationContextManager.setPendingConfirmation(
                        PendingConfirmation.PlayStoreInstall(resolution.requestedName, resolution.suggestedPackage)
                    )
                    MetricLogger.logToolExecution(context, "AppNotInstalled", true, System.currentTimeMillis() - startTime)
                    val msg = "${resolution.requestedName} is not installed on this device. Would you like me to open its Play Store page so you can install it?"
                    OrchestratorResponse(msg, msg, actionTag = "PLAY_STORE_PROMPT")
                }
                is AppResolutionResult.Error -> {
                    MetricLogger.logToolExecution(context, "AppError", false, System.currentTimeMillis() - startTime)
                    OrchestratorResponse(resolution.message, resolution.message, actionTag = "ERROR")
                }
                else -> OrchestratorResponse("Processing app request...", "Processing app request.", actionTag = "APP")
            }
        }

        // 12. Calling Intent ("Call [Name]", "Dial [Number]")
        val callRegex = Regex("^(?:call|dial|ring|phone)\\s+(.+)$", RegexOption.IGNORE_CASE)
        val callMatch = callRegex.find(lower)
        if (callMatch != null) {
            val target = callMatch.groupValues[1].trim()
            val callResult = ContactCallManager.resolveCall(context, target)

            return when (callResult) {
                is ContactResolutionResult.ConfirmationRequired -> {
                    ConversationContextManager.setPendingConfirmation(
                        PendingConfirmation.PhoneCall(callResult.contact)
                    )
                    MetricLogger.logToolExecution(context, "CallConfirm", true, System.currentTimeMillis() - startTime)
                    val msg = "Found ${callResult.contact.name} at ${callResult.contact.number}. Would you like me to place the call?"
                    OrchestratorResponse(msg, msg, actionTag = "CALL_CONFIRM")
                }
                is ContactResolutionResult.DirectCallInitiated -> {
                    ConversationContextManager.setLastContact(callResult.contact)
                    MetricLogger.logToolExecution(context, "DirectCall", true, System.currentTimeMillis() - startTime)
                    val msg = "Calling ${callResult.contact.name} (${callResult.contact.number})..."
                    OrchestratorResponse(msg, "Calling ${callResult.contact.name} now.", actionTag = "CALL")
                }
                is ContactResolutionResult.DialerOpened -> {
                    ConversationContextManager.setLastContact(callResult.contact)
                    MetricLogger.logToolExecution(context, "Dialer", true, System.currentTimeMillis() - startTime)
                    val msg = "Opening dialer for ${callResult.contact.name} (${callResult.contact.number})..."
                    OrchestratorResponse(msg, "Opening dialer for ${callResult.contact.name}.", actionTag = "DIALER")
                }
                is ContactResolutionResult.AmbiguousContacts -> {
                    val names = callResult.contacts.joinToString(", ") { it.name }
                    MetricLogger.logToolExecution(context, "CallAmbiguous", true, System.currentTimeMillis() - startTime)
                    val msg = "I found multiple contacts matching '${callResult.query}': $names. Which contact would you like to call?"
                    OrchestratorResponse(msg, msg, actionTag = "CALL_AMBIGUOUS")
                }
                is ContactResolutionResult.NotFound -> {
                    MetricLogger.logToolExecution(context, "CallNotFound", false, System.currentTimeMillis() - startTime)
                    val msg = "I couldn't find any contact named '${callResult.query}' in your address book."
                    OrchestratorResponse(msg, msg, actionTag = "CALL_NOT_FOUND")
                }
                is ContactResolutionResult.PermissionRequired -> {
                    MetricLogger.logToolExecution(context, "CallNoPerm", false, System.currentTimeMillis() - startTime)
                    val msg = "Contacts permission is needed to find contacts. Please grant it from the Permissions button."
                    OrchestratorResponse(msg, msg, actionTag = "PERMISSION_REQUIRED")
                }
                is ContactResolutionResult.Error -> {
                    MetricLogger.logToolExecution(context, "CallError", false, System.currentTimeMillis() - startTime)
                    OrchestratorResponse(callResult.message, callResult.message, actionTag = "ERROR")
                }
                else -> OrchestratorResponse("Processing phone request...", "Processing phone request.", actionTag = "CALL")
            }
        }

        // 13. Cloud AI Reasoning & Document RAG Knowledge Base
        val ragResult = DocumentRagManager.searchKnowledgeBase(context, cleanQuery)
        val promptToUse = if (ragResult.contextPrompt != null) {
            "${ragResult.contextPrompt}\n\nQuestion: $cleanQuery"
        } else {
            cleanQuery
        }

        val cloudReply = CloudManager.askRamya(promptToUse)
        val latencyMs = System.currentTimeMillis() - startTime
        MetricLogger.logToolExecution(
            context,
            if (ragResult.contextPrompt != null) "RagReasoning" else "CloudReasoning",
            true,
            latencyMs
        )

        val displayTextWithCitations = if (ragResult.citations.isNotEmpty()) {
            val citationFooter = "\n\n📚 Sources:\n" + ragResult.citations.joinToString("\n") { citation -> "• $citation" }
            "$cloudReply$citationFooter"
        } else {
            cloudReply
        }

        return OrchestratorResponse(
            displayText = displayTextWithCitations,
            spokenText = cloudReply,
            actionTag = if (ragResult.citations.isNotEmpty()) "DOCUMENT_RAG" else "CLOUD_AI"
        )
    }
}
