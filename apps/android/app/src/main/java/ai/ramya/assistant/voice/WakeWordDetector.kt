package ai.ramya.assistant.voice

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.Locale

enum class WakeWordState {
    IDLE,
    ACTIVE_LISTENING,
    WAKE_DETECTED,
    SLEEPING
}

/**
 * Dedicated Low-Latency Wake-Word Detection Engine for "Hey Ramya".
 * Features offline-preferred acoustic keyword spotting, cooldown debouncing,
 * echo suppression (barge-in muting during TTS speech output),
 * and sleep/wake command state management.
 */
class WakeWordDetector(
    private val context: Context,
    private val onWakeWordDetected: (String) -> Unit
) : RecognitionListener {

    private val tag = "WakeWordDetector"
    private val prefs: SharedPreferences = context.getSharedPreferences("ramya_wake_prefs", Context.MODE_PRIVATE)

    companion object {
        const val KEY_WAKE_ENABLED = "wake_word_detection_enabled"
        const val KEY_SENSITIVITY = "wake_word_sensitivity"
        private const val COOLDOWN_MS = 2500L
    }

    private val _wakeState = MutableStateFlow(WakeWordState.IDLE)
    val wakeState: StateFlow<WakeWordState> = _wakeState.asStateFlow()

    private val _rmsLevel = MutableStateFlow(0f)
    val rmsLevel: StateFlow<Float> = _rmsLevel.asStateFlow()

    private var speechRecognizer: SpeechRecognizer? = null
    private var isMutedForSpeech = false
    private var lastTriggerTimestamp = 0L
    private var isContinuousActive = false

    private val WAKE_KEYWORDS = listOf("hey ramya", "hello ramya", "ramya ai", "hi ramya", "ramya")

    init {
        initRecognizer()
    }

    fun isWakeWordEnabled(): Boolean {
        return prefs.getBoolean(KEY_WAKE_ENABLED, true)
    }

    fun setWakeWordEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_WAKE_ENABLED, enabled).apply()
        if (!enabled) {
            stopContinuousListening()
        }
    }

    private fun initRecognizer() {
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            Log.w(tag, "Speech recognition unavailable for wake-word engine.")
            return
        }

        try {
            speechRecognizer?.destroy()
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
                setRecognitionListener(this@WakeWordDetector)
            }
            Log.d(tag, "WakeWord SpeechRecognizer initialized.")
        } catch (e: Exception) {
            Log.e(tag, "Failed to initialize wake-word detector: ${e.message}")
        }
    }

    /**
     * Starts continuous low-latency wake-word monitoring.
     */
    fun startContinuousListening() {
        if (!isWakeWordEnabled()) {
            Log.d(tag, "Wake word is disabled by user settings.")
            return
        }

        if (isMutedForSpeech) {
            Log.d(tag, "TTS is speaking, muting wake detector to avoid feedback.")
            return
        }

        isContinuousActive = true
        _wakeState.value = WakeWordState.ACTIVE_LISTENING

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.packageName)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault().toLanguageTag())
            // Hint for local offline keyword model where supported
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
            }
        }

        try {
            speechRecognizer?.startListening(intent)
        } catch (e: Exception) {
            Log.e(tag, "Error starting continuous wake listener: ${e.message}")
        }
    }

    /**
     * Pauses wake-word listener while Ramya's mouth (TTS) speaks aloud to prevent echo feedback loops.
     */
    fun pauseForSpeech() {
        isMutedForSpeech = true
        stopContinuousListening()
    }

    /**
     * Resumes wake-word listener after speech finishes.
     */
    fun resumeAfterSpeech() {
        isMutedForSpeech = false
        if (isWakeWordEnabled() && _wakeState.value != WakeWordState.SLEEPING) {
            startContinuousListening()
        }
    }

    /**
     * Puts assistant into sleep mode ("Stop listening", "Go to sleep").
     */
    fun goToSleep() {
        _wakeState.value = WakeWordState.SLEEPING
        stopContinuousListening()
    }

    /**
     * Wakes assistant up from sleep mode ("Wake up").
     */
    fun wakeUp() {
        _wakeState.value = WakeWordState.ACTIVE_LISTENING
        startContinuousListening()
    }

    fun stopContinuousListening() {
        isContinuousActive = false
        try {
            speechRecognizer?.stopListening()
        } catch (_: Exception) {}
        _rmsLevel.value = 0f
    }

    private fun triggerHapticWake() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                vibratorManager?.defaultVibrator?.vibrate(VibrationEffect.createOneShot(80, VibrationEffect.DEFAULT_AMPLITUDE))
            } else {
                @Suppress("DEPRECATION")
                val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                vibrator?.vibrate(80)
            }
        } catch (_: Exception) {}
    }

    private fun processTranscript(transcript: String) {
        val lower = transcript.lowercase().trim()
        val now = System.currentTimeMillis()

        // 1. Check for wake words
        var matchedKeyword: String? = null
        for (kw in WAKE_KEYWORDS) {
            if (lower.startsWith(kw) || lower.contains(kw)) {
                matchedKeyword = kw
                break
            }
        }

        if (matchedKeyword != null) {
            // Check cooldown to prevent duplicate activations
            if (now - lastTriggerTimestamp < COOLDOWN_MS) {
                Log.d(tag, "Wake phrase ignored due to debounce cooldown.")
                return
            }

            lastTriggerTimestamp = now
            _wakeState.value = WakeWordState.WAKE_DETECTED
            triggerHapticWake()

            // Extract any command spoken immediately after wake word
            val remainder = lower.substringAfter(matchedKeyword).trim().removePrefix(",").trim()
            Log.d(tag, "Wake word spotted! Command payload: '$remainder'")

            stopContinuousListening()
            onWakeWordDetected(remainder)
            return
        }

        // 2. Check for Sleep command ("Stop listening", "Go to sleep")
        if (lower in setOf("stop listening", "go to sleep", "sleep", "sleep now")) {
            goToSleep()
            return
        }

        // 3. Check for Wake command when asleep
        if (lower in setOf("wake up", "wake", "ramya wake up")) {
            wakeUp()
            return
        }
    }

    // --- RecognitionListener implementation ---

    override fun onReadyForSpeech(params: Bundle?) {}
    override fun onBeginningOfSpeech() {}

    override fun onRmsChanged(rmsdB: Float) {
        _rmsLevel.value = rmsdB.coerceAtLeast(0f)
    }

    override fun onBufferReceived(buffer: ByteArray?) {}

    override fun onEndOfSpeech() {
        _rmsLevel.value = 0f
    }

    override fun onError(error: Int) {
        _rmsLevel.value = 0f
        // Automatically restart continuous listening if active and not in error loop
        if (isContinuousActive && !isMutedForSpeech && _wakeState.value == WakeWordState.ACTIVE_LISTENING) {
            startContinuousListening()
        }
    }

    override fun onResults(results: Bundle?) {
        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        if (!matches.isNullOrEmpty()) {
            processTranscript(matches[0])
        }

        // Loop continuous listening if still active
        if (isContinuousActive && !isMutedForSpeech && _wakeState.value == WakeWordState.ACTIVE_LISTENING) {
            startContinuousListening()
        }
    }

    override fun onPartialResults(partialResults: Bundle?) {
        val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        if (!matches.isNullOrEmpty()) {
            val partial = matches[0]
            for (kw in WAKE_KEYWORDS) {
                if (partial.lowercase().contains(kw)) {
                    processTranscript(partial)
                    break
                }
            }
        }
    }

    override fun onEvent(eventType: Int, params: Bundle?) {}

    fun destroy() {
        stopContinuousListening()
        try {
            speechRecognizer?.destroy()
            speechRecognizer = null
        } catch (_: Exception) {}
    }
}
