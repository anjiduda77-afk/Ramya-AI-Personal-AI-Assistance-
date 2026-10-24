package ai.ramya.assistant.voice

import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.util.Locale

/**
 * Unified Voice Engine for Ramya AI
 * Handles native Speech-to-Text (Microphone) and Text-to-Speech (Mouth Output)
 */
class VoiceEngine(private val context: Context) : RecognitionListener, TextToSpeech.OnInitListener {

    private val tag = "RamyaVoiceEngine"

    // --- State Flows for UI Observation ---
    private val _isListening = MutableStateFlow(false)
    val isListening: StateFlow<Boolean> = _isListening.asStateFlow()

    private val _isSpeaking = MutableStateFlow(false)
    val isSpeaking: StateFlow<Boolean> = _isSpeaking.asStateFlow()

    private val _rmsDecibels = MutableStateFlow(0f)
    val rmsDecibels: StateFlow<Float> = _rmsDecibels.asStateFlow()

    private val _liveTranscript = MutableStateFlow("")
    val liveTranscript: StateFlow<String> = _liveTranscript.asStateFlow()

    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    // --- Internal Engines ---
    private var speechRecognizer: SpeechRecognizer? = null
    private var tts: TextToSpeech? = null
    private var isTtsInitialized = false
    private var onSpeechResultCallback: ((String) -> Unit)? = null
    private var onSpeechFinishedCallback: (() -> Unit)? = null

    init {
        initSpeechRecognizer()
        initTextToSpeech()
    }

    // ==========================================
    // 1. SPEECH RECOGNIZER (MICROPHONE)
    // ==========================================

    private fun initSpeechRecognizer() {
        if (SpeechRecognizer.isRecognitionAvailable(context)) {
            try {
                speechRecognizer?.destroy()
                speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
                    setRecognitionListener(this@VoiceEngine)
                }
                Log.d(tag, "Native SpeechRecognizer initialized successfully.")
            } catch (e: Exception) {
                Log.e(tag, "Failed to create SpeechRecognizer: ${e.message}")
            }
        } else {
            Log.w(tag, "Speech recognition is not available on this device.")
            _errorMessage.value = "Voice recognition service unavailable on device."
        }
    }

    fun startListening(onResult: (String) -> Unit) {
        // Stop any ongoing mouth speech before listening
        stopSpeaking()
        vibrateTick()

        onSpeechResultCallback = onResult
        _liveTranscript.value = ""
        _errorMessage.value = null

        if (speechRecognizer == null) {
            initSpeechRecognizer()
        }

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
            putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.packageName)
            // Use current device locale or Indian English fallback
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault().toLanguageTag())
        }

        try {
            speechRecognizer?.startListening(intent)
            _isListening.value = true
        } catch (e: Exception) {
            Log.e(tag, "Error starting voice recognition: ${e.message}")
            _isListening.value = false
            _errorMessage.value = "Could not activate microphone: ${e.localizedMessage}"
        }
    }

    fun stopListening() {
        try {
            speechRecognizer?.stopListening()
        } catch (e: Exception) {
            Log.e(tag, "Error stopping voice recognition: ${e.message}")
        }
        _isListening.value = false
        _rmsDecibels.value = 0f
    }

    fun cancelListening() {
        try {
            speechRecognizer?.cancel()
        } catch (e: Exception) {
            Log.e(tag, "Error canceling voice recognition: ${e.message}")
        }
        _isListening.value = false
        _rmsDecibels.value = 0f
    }

    // --- RecognitionListener Callbacks ---

    override fun onReadyForSpeech(params: Bundle?) {
        _isListening.value = true
        _rmsDecibels.value = 0f
    }

    override fun onBeginningOfSpeech() {
        _isListening.value = true
    }

    override fun onRmsChanged(rmsdB: Float) {
        // Normalize between 0.0 and 10.0 for waveform visuals
        _rmsDecibels.value = rmsdB.coerceAtLeast(0f)
    }

    override fun onBufferReceived(buffer: ByteArray?) {}

    override fun onEndOfSpeech() {
        _isListening.value = false
        _rmsDecibels.value = 0f
        vibrateTick()
    }

    override fun onError(error: Int) {
        _isListening.value = false
        _rmsDecibels.value = 0f

        val msg = when (error) {
            SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
            SpeechRecognizer.ERROR_CLIENT -> "Client voice error"
            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Microphone permission required"
            SpeechRecognizer.ERROR_NETWORK -> "Network error during speech recognition"
            SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
            SpeechRecognizer.ERROR_NO_MATCH -> "No speech recognized. Please speak again."
            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Voice recognizer is busy"
            SpeechRecognizer.ERROR_SERVER -> "Server error"
            SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech detected"
            else -> "Speech recognition error ($error)"
        }
        Log.w(tag, "Speech recognition error: $msg ($error)")
        if (error != SpeechRecognizer.ERROR_NO_MATCH && error != SpeechRecognizer.ERROR_SPEECH_TIMEOUT) {
            _errorMessage.value = msg
        }
    }

    override fun onResults(results: Bundle?) {
        _isListening.value = false
        _rmsDecibels.value = 0f

        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        if (!matches.isNullOrEmpty()) {
            val transcript = matches[0].trim()
            _liveTranscript.value = transcript
            Log.d(tag, "Recognized text: $transcript")
            onSpeechResultCallback?.invoke(transcript)
        }
    }

    override fun onPartialResults(partialResults: Bundle?) {
        val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
        if (!matches.isNullOrEmpty()) {
            _liveTranscript.value = matches[0]
        }
    }

    override fun onEvent(eventType: Int, params: Bundle?) {}

    // ==========================================
    // 2. TEXT TO SPEECH (MOUTH / AUDIO OUTPUT)
    // ==========================================

    private fun initTextToSpeech() {
        try {
            tts = TextToSpeech(context.applicationContext, this)
        } catch (e: Exception) {
            Log.e(tag, "Failed to initialize TextToSpeech: ${e.message}")
        }
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            isTtsInitialized = true
            // Prefer Indian English for natural accent, fallback to US / Default
            val localeIndian = Locale("en", "IN")
            val result = tts?.setLanguage(localeIndian)
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                tts?.setLanguage(Locale.US)
            }
            tts?.setSpeechRate(1.02f)
            tts?.setPitch(1.08f) // Friendly, warm voice pitch

            tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {
                    _isSpeaking.value = true
                }

                override fun onDone(utteranceId: String?) {
                    _isSpeaking.value = false
                    onSpeechFinishedCallback?.invoke()
                }

                override fun onError(utteranceId: String?) {
                    _isSpeaking.value = false
                }
            })
            Log.d(tag, "TextToSpeech engine ready.")
        } else {
            Log.e(tag, "Failed to initialize TTS engine with status code $status")
        }
    }

    /**
     * Speaks the given text aloud using the synthetic voice (Mouth)
     * Cleans markdown, formatting, and emojis for natural vocal delivery
     */
    fun speak(text: String, onFinished: (() -> Unit)? = null) {
        if (!isTtsInitialized || tts == null) {
            initTextToSpeech()
        }

        onSpeechFinishedCallback = onFinished
        val cleanSpeech = cleanTextForSpeech(text)
        if (cleanSpeech.isBlank()) return

        stopListening()
        val utteranceId = "ramya_utt_${System.currentTimeMillis()}"
        _isSpeaking.value = true

        tts?.speak(cleanSpeech, TextToSpeech.QUEUE_FLUSH, null, utteranceId)
    }

    fun stopSpeaking() {
        if (_isSpeaking.value) {
            try {
                tts?.stop()
            } catch (e: Exception) {
                Log.e(tag, "Error stopping TTS: ${e.message}")
            }
            _isSpeaking.value = false
        }
    }

    /**
     * Strips markdown symbols, asterisks, headers, code blocks, bullets, and emojis
     * so that the spoken audio flows cleanly and naturally.
     */
    private fun cleanTextForSpeech(raw: String): String {
        return raw
            // Remove code blocks
            .replace(Regex("```[\\s\\S]*?```"), "Code snippet omitted.")
            .replace(Regex("`[^`]*`"), "")
            // Remove bold/italics markers
            .replace(Regex("\\*\\*(.*?)\\*\\*"), "$1")
            .replace(Regex("\\*(.*?)\\*"), "$1")
            .replace(Regex("__(.*?)__"), "$1")
            // Remove markdown headers
            .replace(Regex("^#+\\s*", RegexOption.MULTILINE), "")
            // Remove markdown bullet points
            .replace(Regex("^[\\s*\\-]+\\s*", RegexOption.MULTILINE), "")
            // Remove URLs
            .replace(Regex("https?://\\S+"), "")
            // Remove common icons / emojis that can sound strange when read aloud
            .replace(Regex("[🤖🎙️🔊⛅▶️🎵👤🛡️☁️✓❌]"), "")
            .trim()
    }

    // ==========================================
    // 3. HAPTIC TICK
    // ==========================================

    private fun vibrateTick() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
                    vibratorManager?.defaultVibrator
                } else {
                    @Suppress("DEPRECATION")
                    context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                }
                vibrator?.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK))
            } else {
                @Suppress("DEPRECATION")
                val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
                vibrator?.vibrate(25L)
            }
        } catch (_: Exception) {
            // Ignore haptic failures on unsupported hardware
        }
    }

    // ==========================================
    // 4. CLEANUP
    // ==========================================

    fun destroy() {
        try {
            speechRecognizer?.destroy()
            speechRecognizer = null
        } catch (e: Exception) {
            Log.e(tag, "Error destroying speech recognizer: ${e.message}")
        }

        try {
            tts?.stop()
            tts?.shutdown()
            tts = null
        } catch (e: Exception) {
            Log.e(tag, "Error shutting down TTS: ${e.message}")
        }
    }
}
