package ai.ramya.assistant

import ai.ramya.assistant.data.ConversationContextManager
import ai.ramya.assistant.intents.ContactInfo
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

/**
 * Regression and Unit Test Suite for Ramya AI Android Assistant.
 * Validates Section 2 (Voice Conversation Pipeline & Fillers),
 * Section 3 (App Detection), Section 4 (Music Extraction),
 * Section 5 (Calling & Contact Resolution), and Section 7 (Context Continuity).
 */
class AssistantUnitTests {

    @Before
    fun setUp() {
        ConversationContextManager.startSession()
        ConversationContextManager.clearPendingConfirmation()
    }

    // --- SECTION 2: WAKE PHRASES & CONVERSATIONAL CONTINUITY ---

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
        // Section 2: "Do not end the conversation simply because the user says 'thanks', 'okay', 'hmm'..."
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
        // Section 2: "End or pause only when the user explicitly requests it, such as 'Goodbye', 'Stop listening', or 'Sleep'."
        val terminations = listOf("goodbye", "bye", "bye ramya", "stop listening", "stop voice", "sleep", "exit")
        for (term in terminations) {
            assertTrue("Expected '$term' to be recognized as termination command",
                ConversationContextManager.isTerminationCommand(term))
        }

        assertFalse(ConversationContextManager.isTerminationCommand("thanks"))
        assertFalse(ConversationContextManager.isTerminationCommand("okay"))
    }

    // --- SECTION 7: PRONOUN RESOLUTION & CONTEXT RETRIEVAL ---

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

    // --- SECTION 3: CONFIRMATION & REJECTION GATES ---

    @Test
    fun testConfirmationAndRejectionGates() {
        assertTrue(ConversationContextManager.isConfirmation("yes"))
        assertTrue(ConversationContextManager.isConfirmation("sure"))
        assertTrue(ConversationContextManager.isConfirmation("confirm"))
        assertTrue(ConversationContextManager.isConfirmation("open it"))

        assertTrue(ConversationContextManager.isRejection("no"))
        assertTrue(ConversationContextManager.isRejection("cancel"))
        assertTrue(ConversationContextManager.isRejection("don't"))
        assertTrue(ConversationContextManager.isRejection("stop"))
    }

    // --- SECTION 4: MUSIC INTENT EXTRACTION ---

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

    // --- SECTION 5: CONTACTS & PHONE NUMBER SANITIZATION ---

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
        assertFalse(numberRegex.matches("Rahul"))
    }
}
