package ai.ramya.assistant

import ai.ramya.assistant.data.ConversationContextManager
import ai.ramya.assistant.intents.ContactInfo
import ai.ramya.assistant.intents.MusicHistoryManager
import ai.ramya.assistant.intents.WhatsAppManager
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Regression and Unit Test Suite for Ramya AI Android Assistant.
 * Validates Phase 1 (Voice Pipeline), Phase 2 (Wake Words & Continuity),
 * Phase 3 (Real WhatsApp Message Execution & Parsing),
 * Phase 4 (Music Assistant, Lyrics Identification & History),
 * Phase 5 (Multi-Turn Pronoun Resolution & Follow-ups),
 * and Phone/App Integrations.
 */
class AssistantUnitTests {

    @Before
    fun setUp() {
        ConversationContextManager.startSession()
        ConversationContextManager.clearPendingConfirmation()
    }

    // --- PHASE 2: WAKE PHRASES & CONVERSATIONAL CONTINUITY ---

    @Test
    fun testWakeWordDetectionAndStripping() {
        val (wake1, clean1) = ConversationContextManager.extractWakePhrase("Hey Ramya, open YouTube")
        assertTrue(wake1)
        assertEquals("open youtube", clean1)

        val (wake2, clean2) = ConversationContextManager.extractWakePhrase("Hello Ramya what is the weather")
        assertTrue(wake2)
        assertEquals("what is the weather", clean2)

        val (wake3, clean3) = ConversationContextManager.extractWakePhrase("Ramya play relaxing music")
        assertTrue(wake3)
        assertEquals("play relaxing music", clean3)

        val (wake4, clean4) = ConversationContextManager.extractWakePhrase("Open WhatsApp directly")
        assertFalse(wake4)
        assertEquals("Open WhatsApp directly", clean4)
    }

    @Test
    fun testConversationalFillersDoNotEndSession() {
        // Section 2 / Phase 5: "Do not end the conversation simply because the user says 'thanks', 'okay', 'hmm'..."
        val fillers = listOf("thanks", "thank you", "thanks ramya", "okay", "alright", "got it", "cool", "hmm")
        for (filler in fillers) {
            assertTrue("Expected '$filler' to be recognized as conversational filler",
                ConversationContextManager.isConversationalFiller(filler))
            assertFalse("Filler '$filler' should never be marked as termination command",
                ConversationContextManager.isTerminationCommand(filler))
        }

        // Ordinary commands should not be flagged as fillers
        assertFalse(ConversationContextManager.isConversationalFiller("open youtube"))
        assertFalse(ConversationContextManager.isConversationalFiller("call Dad"))
        assertFalse(ConversationContextManager.isConversationalFiller("what is the weather"))
    }

    @Test
    fun testExplicitTerminationCommands() {
        // Phase 2 & 5: "End or pause only when the user explicitly requests it, such as 'Goodbye', 'Stop listening', or 'Sleep'."
        val terminations = listOf("goodbye", "bye", "bye ramya", "stop listening", "stop voice", "sleep", "exit", "go to sleep")
        for (term in terminations) {
            assertTrue("Expected '$term' to be recognized as termination command",
                ConversationContextManager.isTerminationCommand(term))
        }

        assertFalse(ConversationContextManager.isTerminationCommand("thanks"))
        assertFalse(ConversationContextManager.isTerminationCommand("okay"))
    }

    // --- PHASE 3: REAL WHATSAPP MESSAGING INTENT PARSING ---

    @Test
    fun testWhatsAppQueryParsingStandardPattern() {
        val query = "Send Rahul a WhatsApp message saying I will arrive in ten minutes"
        val (recipient, messageText, isWhatsApp) = WhatsAppManager.parseMessageQuery(query)

        assertEquals("Rahul", recipient)
        assertEquals("I will arrive in ten minutes", messageText)
        assertTrue(isWhatsApp)
    }

    @Test
    fun testWhatsAppQueryParsingTellMomPattern() {
        val query = "Tell Mom I have reached home"
        val (recipient, messageText, _) = WhatsAppManager.parseMessageQuery(query)

        assertEquals("Mom", recipient)
        assertEquals("I have reached home", messageText)
    }

    @Test
    fun testWhatsAppQueryParsingToRecipientPattern() {
        val query = "Send a WhatsApp message to Rahul saying I will arrive in ten minutes"
        val (recipient, messageText, isWhatsApp) = WhatsAppManager.parseMessageQuery(query)

        assertEquals("Rahul", recipient)
        assertEquals("I will arrive in ten minutes", messageText)
        assertTrue(isWhatsApp)
    }

    @Test
    fun testWhatsAppPhoneNumberSanitization() {
        val formatted1 = WhatsAppManager.formatPhoneNumberForWhatsApp("9876543210")
        assertEquals("919876543210", formatted1)

        val formatted2 = WhatsAppManager.formatPhoneNumberForWhatsApp("+91 98765 43210")
        assertEquals("919876543210", formatted2)

        val formatted3 = WhatsAppManager.formatPhoneNumberForWhatsApp("09876543210")
        assertEquals("919876543210", formatted3)
    }

    // --- PHASE 4: ADVANCED MUSIC ASSISTANT & LYRIC IDENTIFICATION ---

    @Test
    fun testMusicSongAndArtistExtraction() {
        val queryWithArtist = "Naatu Naatu by Keeravani"
        val byRegex = Regex("^(.*?)\\s+by\\s+(.*)$", RegexOption.IGNORE_CASE)
        val match = byRegex.find(queryWithArtist)

        assertTrue(match != null)
        val song = match?.groupValues?.get(1)?.trim()
        val artist = match?.groupValues?.get(2)?.trim()
        assertEquals("Naatu Naatu", song)
        assertEquals("Keeravani", artist)
    }

    @Test
    fun testMultiStageLyricIdentification() {
        val lyricQuery1 = "find the song with the lyrics naatu naatu"
        val matches1 = MusicHistoryManager.identifySongFromLyrics(lyricQuery1)
        assertTrue("Expected to match Naatu Naatu", matches1.isNotEmpty())
        assertEquals("Naatu Naatu", matches1.first().songTitle)

        val lyricQuery2 = "what is the song that goes i'm in love with the shape of you"
        val matches2 = MusicHistoryManager.identifySongFromLyrics(lyricQuery2)
        assertTrue("Expected to match Shape of You", matches2.isNotEmpty())
        assertEquals("Shape of You", matches2.first().songTitle)

        val lyricQuery3 = "song with lyrics kesariya tera ishq hai piya"
        val matches3 = MusicHistoryManager.identifySongFromLyrics(lyricQuery3)
        assertTrue("Expected to match Kesariya", matches3.isNotEmpty())
        assertEquals("Kesariya", matches3.first().songTitle)
    }

    // --- PHASE 5: MULTI-TURN PRONOUN RESOLUTION & CONTEXT RETRIEVAL ---

    @Test
    fun testPronounResolutionForApp() {
        ConversationContextManager.setLastApp("YouTube", "com.google.android.youtube")
        val resolved = ConversationContextManager.resolvePronouns("Open it")
        assertEquals("open YouTube", resolved)
    }

    @Test
    fun testPronounResolutionForContact() {
        val contact = ContactInfo(name = "Rahul Sharma", number = "+919876543210")
        ConversationContextManager.setLastContact(contact)

        val resolvedHim = ConversationContextManager.resolvePronouns("Call him")
        assertEquals("call Rahul Sharma", resolvedHim)

        val resolvedHer = ConversationContextManager.resolvePronouns("Call her")
        assertEquals("call Rahul Sharma", resolvedHer)
    }

    @Test
    fun testPronounResolutionForSong() {
        ConversationContextManager.setLastSong("Naatu Naatu", "M. M. Keeravani")
        val resolved = ConversationContextManager.resolvePronouns("Play that song")
        assertEquals("play Naatu Naatu", resolved)
    }

    @Test
    fun testContextResolutionForSameMessage() {
        val contact = ContactInfo(name = "Rahul Sharma", number = "+919876543210")
        ConversationContextManager.setLastMessage(contact, "I will arrive in ten minutes.")

        val resolved = ConversationContextManager.resolvePronouns("Send the same message to Priya")
        assertEquals("send Priya a WhatsApp message saying I will arrive in ten minutes.", resolved)
    }

    @Test
    fun testContextResolutionForReplyToMessage() {
        val contact = ContactInfo(name = "Rahul Sharma", number = "+919876543210")
        ConversationContextManager.setLastContact(contact)

        val resolved = ConversationContextManager.resolvePronouns("Reply to this message saying okay")
        assertEquals("send Rahul Sharma a WhatsApp message saying okay", resolved)
    }

    // --- PHASE 1 & 3: CONFIRMATION & REJECTION GATES ---

    @Test
    fun testConfirmationAndRejectionGates() {
        assertTrue(ConversationContextManager.isConfirmation("yes"))
        assertTrue(ConversationContextManager.isConfirmation("sure"))
        assertTrue(ConversationContextManager.isConfirmation("confirm"))
        assertTrue(ConversationContextManager.isConfirmation("open it"))
        assertTrue(ConversationContextManager.isConfirmation("send"))
        assertTrue(ConversationContextManager.isConfirmation("send it"))

        assertTrue(ConversationContextManager.isRejection("no"))
        assertTrue(ConversationContextManager.isRejection("cancel"))
        assertTrue(ConversationContextManager.isRejection("don't"))
        assertTrue(ConversationContextManager.isRejection("stop"))
    }

    // --- CONTACTS & RAW NUMBER VALIDATION ---

    @Test
    fun testPhoneNumberSanitization() {
        val rawNumber = "+91 (987) 654-3210"
        val cleanNumber = rawNumber.replace(Regex("[^0-9+]"), "")
        assertEquals("+919876543210", cleanNumber)
    }

    @Test
    fun testRawNumberRegexValidation() {
        val numberRegex = Regex("^[+]?[0-9\\s\\-()]{7,15}$")
        assertTrue(numberRegex.matches("+919876543210"))
        assertTrue(numberRegex.matches("9876543210"))
        assertTrue(numberRegex.matches("1-800-555-0199"))
        assertFalse(numberRegex.matches("Call Dad"))
    }

    // --- PHASE 6: DOCUMENT RAG & KNOWLEDGE BASE ---

    @Test
    fun testDocumentSlidingWindowChunkingLogic() {
        val longText = "Ramya AI is an advanced personal voice assistant built with Android, Firebase, and Jetpack Compose. ".repeat(10)
        assertTrue(longText.length > 500)

        val chunkSize = 450
        val overlap = 60
        var start = 0
        val chunks = mutableListOf<String>()

        while (start < longText.length) {
            val end = (start + chunkSize).coerceAtMost(longText.length)
            val chunkStr = longText.substring(start, end).trim()
            if (chunkStr.isNotBlank()) {
                chunks.add(chunkStr)
            }
            if (end >= longText.length) break
            start += (chunkSize - overlap)
        }

        assertTrue("Expected multiple chunks generated with overlap", chunks.size > 1)
        assertTrue("Chunk should be within expected length", chunks[0].length <= chunkSize)
    }

    @Test
    fun testConversationAutoTitleGeneration() {
        val userPrompt = "What is the weather like in Hyderabad today?"
        val words = userPrompt.trim().split(Regex("\\s+")).take(6).joinToString(" ")
        assertEquals("What is the weather like in", words)
    }
}
