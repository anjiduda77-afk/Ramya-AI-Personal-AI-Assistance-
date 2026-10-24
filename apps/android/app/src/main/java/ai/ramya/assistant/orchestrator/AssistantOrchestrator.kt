package ai.ramya.assistant.orchestrator

import android.content.Context
import ai.ramya.assistant.data.CloudManager
import ai.ramya.assistant.data.ConversationContextManager
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
 * Dispatches voice and text inputs across App Launcher, Music Controls, Safe Calling,
 * Multi-Turn Pronoun Resolution, and Cloud AI Reasoning.
 */
object AssistantOrchestrator {

    suspend fun processQuery(context: Context, rawQuery: String): OrchestratorResponse {
        val startTime = System.currentTimeMillis()
        val (_, strippedQuery) = ConversationContextManager.extractWakePhrase(rawQuery)
        val cleanQuery = strippedQuery.trim()

        if (cleanQuery.isBlank()) {
            return OrchestratorResponse(
                displayText = "I'm listening! You can ask me to open apps, play songs, call contacts, or answer questions.",
                spokenText = "I am listening! How can I help you?",
                actionTag = "PROMPT"
            )
        }

        // 1. Explicit Termination Handling ("Goodbye", "Stop listening", "Sleep")
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

        // 3. Pending Confirmation Handling (Play Store, Call Confirmation)
        val pending = ConversationContextManager.pendingConfirmation
        if (pending != null) {
            if (ConversationContextManager.isConfirmation(cleanQuery)) {
                ConversationContextManager.clearPendingConfirmation()
                when (pending) {
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
                    is PendingConfirmation.PhoneCall -> {
                        val result = ContactCallManager.executeCall(context, pending.contact, isConfirmed = true)
                        MetricLogger.logToolExecution(context, "Call", true, System.currentTimeMillis() - startTime)
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

        // 4. Resolve Pronouns ("Open it", "Call him", "Play that song")
        val resolvedQuery = ConversationContextManager.resolvePronouns(cleanQuery)
        val lower = resolvedQuery.lowercase()

        // 5. Media Controls Intent (Pause, Resume, Next, Prev, Stop, Volume)
        if (lower in setOf("pause", "pause music", "pause song", "stop music", "stop song")) {
            val res = MusicPlaybackManager.pausePlayback(context)
            MetricLogger.logToolExecution(context, "MediaControl", true, System.currentTimeMillis() - startTime)
            return OrchestratorResponse("Media playback paused.", "Paused.", actionTag = "MEDIA")
        }
        if (lower in setOf("resume", "resume music", "continue music", "play music again")) {
            val res = MusicPlaybackManager.resumePlayback(context)
            MetricLogger.logToolExecution(context, "MediaControl", true, System.currentTimeMillis() - startTime)
            return OrchestratorResponse("Resuming media playback.", "Resuming.", actionTag = "MEDIA")
        }
        if (lower in setOf("next song", "next track", "skip song", "skip track")) {
            val res = MusicPlaybackManager.nextTrack(context)
            MetricLogger.logToolExecution(context, "MediaControl", true, System.currentTimeMillis() - startTime)
            return OrchestratorResponse("Skipping to next track.", "Next track.", actionTag = "MEDIA")
        }
        if (lower in setOf("previous song", "previous track", "last track")) {
            val res = MusicPlaybackManager.previousTrack(context)
            MetricLogger.logToolExecution(context, "MediaControl", true, System.currentTimeMillis() - startTime)
            return OrchestratorResponse("Playing previous track.", "Previous track.", actionTag = "MEDIA")
        }
        if (lower in setOf("volume up", "increase volume", "louder")) {
            val res = MusicPlaybackManager.adjustVolume(context, increase = true)
            MetricLogger.logToolExecution(context, "Volume", true, System.currentTimeMillis() - startTime)
            return OrchestratorResponse("Volume increased.", "Volume increased.", actionTag = "VOLUME")
        }
        if (lower in setOf("volume down", "decrease volume", "lower volume", "softer")) {
            val res = MusicPlaybackManager.adjustVolume(context, increase = false)
            MetricLogger.logToolExecution(context, "Volume", true, System.currentTimeMillis() - startTime)
            return OrchestratorResponse("Volume decreased.", "Volume decreased.", actionTag = "VOLUME")
        }

        // 6. Music Playback Intent ("Play [song]", "Play [song] by [artist]")
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

        // 7. App Launcher Intent ("Open [App]", "Launch [App]")
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

        // 8. Calling Intent ("Call [Name]", "Dial [Number]")
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

        // 9. Cloud AI Reasoning (OpenAI / DeepSeek / Live Weather / Translation)
        val cloudReply = CloudManager.askRamya(cleanQuery)
        val latencyMs = System.currentTimeMillis() - startTime
        MetricLogger.logToolExecution(context, "CloudReasoning", true, latencyMs)

        return OrchestratorResponse(
            displayText = cloudReply,
            spokenText = cloudReply,
            actionTag = "CLOUD_AI"
        )
    }
}
