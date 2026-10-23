package ai.ramya.assistant

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AssistantUnitTests {

    @Test
    fun testPhoneNumberSanitization() {
        val rawNumber = "+91 (987) 654-3210"
        val cleanNumber = rawNumber.replace(Regex("[^0-9+]"), "")
        assertEquals("+919876543210", cleanNumber)
    }

    @Test
    fun testWakeWordDetection() {
        val query = "Hey Ramya, what time is it?"
        val hasWakeWord = query.lowercase().startsWith("hey ramya")
        assertTrue(hasWakeWord)
    }

    @Test
    fun testPackageMapResolution() {
        val appName = "chrome"
        val expected = "com.android.chrome"
        val packages = mapOf("chrome" to "com.android.chrome", "youtube" to "com.google.android.youtube")
        assertEquals(expected, packages[appName])
    }
}
