package ai.ramya.assistant

import android.Manifest
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import kotlinx.coroutines.launch
import ai.ramya.assistant.data.CloudManager
import ai.ramya.assistant.intents.AppLauncherIntent
import ai.ramya.assistant.intents.AppLauncherManager
import ai.ramya.assistant.intents.ContactCallManager
import ai.ramya.assistant.intents.DialerIntent
import ai.ramya.assistant.intents.MusicPlaybackManager
import ai.ramya.assistant.orchestrator.AssistantOrchestrator
import ai.ramya.assistant.service.RamyaVoiceForegroundService
import ai.ramya.assistant.ui.screens.PermissionOnboardingScreen
import ai.ramya.assistant.ui.theme.*
import ai.ramya.assistant.voice.VoiceEngine

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        setContent {
            RamyaAITheme {
                var showOnboarding by remember { mutableStateOf(false) }

                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = CyberpunkBackground
                ) {
                    if (showOnboarding) {
                        PermissionOnboardingScreen(onProceed = { showOnboarding = false })
                    } else {
                        AndroidCommandCenter(onOpenPermissions = { showOnboarding = true })
                    }
                }
            }
        }
    }
}

enum class MobileTab {
    VOICE_ASSISTANT,
    TELUGU_TUTOR,
    ACCOUNT_CLOUD
}

@Composable
fun AndroidCommandCenter(onOpenPermissions: () -> Unit) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current

    // Initialize native Voice Engine (Mic & Mouth)
    val voiceEngine = remember { VoiceEngine(context) }
    DisposableEffect(Unit) {
        onDispose {
            voiceEngine.destroy()
        }
    }

    val isListening by voiceEngine.isListening.collectAsState()
    val isSpeaking by voiceEngine.isSpeaking.collectAsState()
    val rmsDecibels by voiceEngine.rmsDecibels.collectAsState()
    val liveTranscript by voiceEngine.liveTranscript.collectAsState()
    val voiceError by voiceEngine.errorMessage.collectAsState()

    var currentTab by remember { mutableStateOf(MobileTab.VOICE_ASSISTANT) }
    var isThinking by remember { mutableStateOf(false) }
    var userTranscript by remember { mutableStateOf("Tap the Orb or mic button to speak with Ramya...") }
    var assistantResponse by remember { mutableStateOf("Namaskaram! I am Ramya, your personal voice companion. How can I help you today?") }
    var serviceActive by remember { mutableStateOf(false) }
    var textPrompt by remember { mutableStateOf("") }
    var userProfileText by remember { mutableStateOf(CloudManager.getUserEmail()) }
    var cloudSyncStatus by remember { mutableStateOf("Cloud Database: Connected") }

    // Surface live speech transcription to user transcript bubble
    LaunchedEffect(liveTranscript) {
        if (liveTranscript.isNotBlank() && isListening) {
            userTranscript = liveTranscript
        }
    }

    // Display voice engine errors if any
    LaunchedEffect(voiceError) {
        voiceError?.let {
            Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
        }
    }

    // Pulsing Orb Animation
    val infiniteTransition = rememberInfiniteTransition(label = "orbPulse")
    val scalePulse by infiniteTransition.animateFloat(
        initialValue = 0.96f,
        targetValue = if (isListening) 1.22f else if (isSpeaking) 1.14f else 1.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(if (isListening) 500 else if (isSpeaking) 650 else 2200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )
    val haloAlpha by infiniteTransition.animateFloat(
        initialValue = 0.15f,
        targetValue = if (isListening) 0.65f else if (isSpeaking) 0.50f else 0.28f,
        animationSpec = infiniteRepeatable(
            animation = tween(if (isListening) 550 else if (isSpeaking) 700 else 1800, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "haloAlpha"
    )

    fun executeQuery(query: String) {
        val clean = query.trim()
        if (clean.isBlank()) return

        userTranscript = clean
        voiceEngine.stopListening()
        isThinking = true
        assistantResponse = "Processing..."

        coroutineScope.launch {
            val response = AssistantOrchestrator.processQuery(context, clean)
            assistantResponse = response.displayText
            isThinking = false
            // Ramya speaks the response aloud through native TTS mouth
            voiceEngine.speak(response.spokenText)
        }
    }

    // Dynamic Microphone Permission Launcher
    val micPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            userTranscript = "Listening for your voice..."
            voiceEngine.startListening { query ->
                executeQuery(query)
            }
        } else {
            Toast.makeText(context, "Microphone permission is required to speak.", Toast.LENGTH_LONG).show()
        }
    }

    fun toggleListening() {
        if (isListening) {
            voiceEngine.stopListening()
        } else {
            if (isSpeaking) {
                voiceEngine.stopSpeaking()
            }
            val hasPermission = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.RECORD_AUDIO
            ) == PackageManager.PERMISSION_GRANTED

            if (hasPermission) {
                userTranscript = "Listening for your voice..."
                voiceEngine.startListening { query ->
                    executeQuery(query)
                }
            } else {
                micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(CyberpunkBackground)
            .statusBarsPadding()
            .navigationBarsPadding()
    ) {
        // --- 1. TOP HEADER BAR ---
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 18.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .background(Brush.radialGradient(listOf(NeonCyan, ElectricBlue)), CircleShape)
                        .border(1.5.dp, NeonCyan, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text("R", color = Color.Black, fontWeight = FontWeight.Black, fontSize = 17.sp)
                }
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "RAMYA AI",
                            color = NeonCyan,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 1.2.sp
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "v1.0.0",
                            color = NeonViolet,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .background(if (isListening) NeonPink else if (isSpeaking) NeonViolet else NeonGreen, CircleShape)
                        )
                        Spacer(modifier = Modifier.width(5.dp))
                        Text(
                            text = when {
                                isListening -> "LISTENING (MIC ACTIVE)"
                                isSpeaking -> "SPEAKING ALOUD"
                                isThinking -> "PROCESSING..."
                                else -> "VOICE & CLOUD READY"
                            },
                            color = when {
                                isListening -> NeonPink
                                isSpeaking -> NeonViolet
                                isThinking -> NeonAmber
                                else -> NeonGreen
                            },
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.8.sp
                        )
                    }
                }
            }

            Button(
                onClick = onOpenPermissions,
                colors = ButtonDefaults.buttonColors(containerColor = CyberpunkCard),
                shape = RoundedCornerShape(10.dp),
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                modifier = Modifier
                    .height(34.dp)
                    .border(1.dp, CyberpunkCardBorder, RoundedCornerShape(10.dp))
            ) {
                Text("🛡️ PERMISSIONS", color = TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        }

        // --- 2. SEGMENTED NAVIGATION TABS ---
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 4.dp)
                .background(CyberpunkSurface, RoundedCornerShape(12.dp))
                .border(1.dp, CyberpunkCardBorder, RoundedCornerShape(12.dp))
                .padding(4.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            val tabs = listOf(
                Triple(MobileTab.VOICE_ASSISTANT, "🎙️ Assistant", NeonCyan),
                Triple(MobileTab.TELUGU_TUTOR, "📚 English Tutor", NeonViolet),
                Triple(MobileTab.ACCOUNT_CLOUD, "☁️ Cloud & Account", ElectricBlue)
            )

            tabs.forEach { (tab, title, accentColor) ->
                val selected = currentTab == tab
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (selected) accentColor.copy(alpha = 0.2f) else Color.Transparent)
                        .border(
                            width = if (selected) 1.dp else 0.dp,
                            color = if (selected) accentColor else Color.Transparent,
                            shape = RoundedCornerShape(8.dp)
                        )
                        .clickable { currentTab = tab }
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = title,
                        color = if (selected) TextPrimary else TextMuted,
                        fontSize = 11.sp,
                        fontWeight = if (selected) FontWeight.Bold else FontWeight.SemiBold
                    )
                }
            }
        }

        // --- 3. SCROLLABLE TAB CONTENT ---
        Box(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
        ) {
            when (currentTab) {
                MobileTab.VOICE_ASSISTANT -> {
                    VoiceAssistantTab(
                        isListening = isListening,
                        isSpeaking = isSpeaking,
                        isThinking = isThinking,
                        scalePulse = scalePulse,
                        haloAlpha = haloAlpha,
                        rmsDecibels = rmsDecibels,
                        userTranscript = userTranscript,
                        assistantResponse = assistantResponse,
                        onOrbClick = { toggleListening() },
                        onQuickChipClick = { cmd -> executeQuery(cmd) },
                        onToggleSpeech = {
                            if (isSpeaking) {
                                voiceEngine.stopSpeaking()
                            } else {
                                voiceEngine.speak(assistantResponse)
                            }
                        }
                    )
                }
                MobileTab.TELUGU_TUTOR -> {
                    TeluguTutorTab(
                        onListenPhrase = { phrase ->
                            voiceEngine.speak(phrase)
                        },
                        onPracticeSpoken = { targetPhrase ->
                            val hasPermission = ContextCompat.checkSelfPermission(
                                context,
                                Manifest.permission.RECORD_AUDIO
                            ) == PackageManager.PERMISSION_GRANTED

                            if (hasPermission) {
                                userTranscript = "Practicing: '$targetPhrase'..."
                                currentTab = MobileTab.VOICE_ASSISTANT
                                voiceEngine.startListening { spoken ->
                                    executeQuery("I practiced saying: '$spoken'. Compare it with: '$targetPhrase' and give me friendly feedback!")
                                }
                            } else {
                                micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                            }
                        }
                    )
                }
                MobileTab.ACCOUNT_CLOUD -> {
                    AccountAndCloudTab(
                        context = context,
                        userProfile = userProfileText,
                        cloudStatus = cloudSyncStatus,
                        serviceActive = serviceActive,
                        onToggleService = { active ->
                            if (active) {
                                val hasMic = ContextCompat.checkSelfPermission(
                                    context,
                                    Manifest.permission.RECORD_AUDIO
                                ) == PackageManager.PERMISSION_GRANTED

                                if (hasMic) {
                                    serviceActive = true
                                    RamyaVoiceForegroundService.startService(context)
                                } else {
                                    micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                                }
                            } else {
                                serviceActive = false
                                RamyaVoiceForegroundService.stopService(context)
                            }
                        },
                        onGuestSignIn = {
                            coroutineScope.launch {
                                val res = CloudManager.signInGuest()
                                res.onSuccess {
                                    userProfileText = CloudManager.getUserEmail()
                                    Toast.makeText(context, "Signed in successfully!", Toast.LENGTH_SHORT).show()
                                }.onFailure {
                                    Toast.makeText(context, "Sign in ready", Toast.LENGTH_SHORT).show()
                                }
                            }
                        },
                        onCheckCloudSync = {
                            coroutineScope.launch {
                                val ok = CloudManager.checkSupabaseConnection()
                                cloudSyncStatus = if (ok) "Cloud Database: Connected & Synced" else "Cloud Database: Reconnecting"
                                Toast.makeText(context, if (ok) "Cloud Database Verified!" else "Reconnecting...", Toast.LENGTH_SHORT).show()
                            }
                        }
                    )
                }
            }
        }

        // --- 4. BOTTOM INPUT BAR (TEXT + VOICE DUAL INTERACTION) ---
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(CyberpunkSurface)
                .border(1.dp, CyberpunkCardBorder)
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            TextField(
                value = textPrompt,
                onValueChange = { textPrompt = it },
                placeholder = {
                    Text(
                        if (isListening) "Listening... speak now" else "Type a message or tap mic...",
                        color = TextMuted,
                        fontSize = 13.sp
                    )
                },
                modifier = Modifier
                    .weight(1f)
                    .height(50.dp)
                    .background(CyberpunkInputBg, RoundedCornerShape(10.dp))
                    .border(1.dp, if (isListening) NeonPink else CyberpunkCardBorder, RoundedCornerShape(10.dp)),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = CyberpunkInputBg,
                    unfocusedContainerColor = CyberpunkInputBg,
                    focusedTextColor = TextPrimary,
                    unfocusedTextColor = TextPrimary,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent
                ),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                keyboardActions = KeyboardActions(onSend = {
                    if (textPrompt.isNotBlank()) {
                        executeQuery(textPrompt)
                        textPrompt = ""
                        focusManager.clearFocus()
                    }
                }),
                singleLine = true
            )

            // Direct Send (Text entered) / Speak (Microphone) Button
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(
                        if (textPrompt.isNotBlank()) {
                            Brush.linearGradient(listOf(NeonCyan, ElectricBlue))
                        } else if (isListening) {
                            Brush.linearGradient(listOf(NeonPink, NeonViolet))
                        } else {
                            Brush.linearGradient(listOf(NeonCyan, ElectricBlue))
                        }
                    )
                    .clickable {
                        if (textPrompt.isNotBlank()) {
                            executeQuery(textPrompt)
                            textPrompt = ""
                            focusManager.clearFocus()
                        } else {
                            toggleListening()
                        }
                    },
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = if (textPrompt.isNotBlank()) "➤" else if (isListening) "⏹️" else "🎙️",
                    color = Color.Black,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            }
        }
    }
}

@Composable
fun VoiceAssistantTab(
    isListening: Boolean,
    isSpeaking: Boolean,
    isThinking: Boolean,
    scalePulse: Float,
    haloAlpha: Float,
    rmsDecibels: Float,
    userTranscript: String,
    assistantResponse: String,
    onOrbClick: () -> Unit,
    onQuickChipClick: (String) -> Unit,
    onToggleSpeech: () -> Unit
) {
    val context = LocalContext.current
    val dynamicOrbScale = if (isListening) {
        scalePulse + (rmsDecibels.coerceIn(0f, 10f) * 0.025f)
    } else {
        scalePulse
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(10.dp))

        // --- GLOWING CYBERPUNK ORB WITH DYNAMIC DECIBEL HALO ---
        Box(
            modifier = Modifier.size(190.dp),
            contentAlignment = Alignment.Center
        ) {
            // Outer Halo Ring
            Box(
                modifier = Modifier
                    .size(180.dp)
                    .scale(dynamicOrbScale * 1.15f)
                    .background(
                        color = (when {
                            isListening -> NeonPink
                            isSpeaking -> NeonViolet
                            isThinking -> NeonAmber
                            else -> NeonCyan
                        }).copy(alpha = haloAlpha * 0.45f),
                        shape = CircleShape
                    )
            )

            // Middle Wave Ring
            Box(
                modifier = Modifier
                    .size(145.dp)
                    .scale(dynamicOrbScale)
                    .background(
                        brush = when {
                            isListening -> OrbListeningGradient
                            isSpeaking -> Brush.radialGradient(listOf(NeonViolet, ElectricBlue, CyberpunkBackground))
                            else -> OrbCyanGradient
                        },
                        shape = CircleShape
                    )
                    .border(
                        2.dp,
                        (when {
                            isListening -> NeonPink
                            isSpeaking -> NeonViolet
                            else -> NeonCyan
                        }).copy(alpha = 0.85f),
                        CircleShape
                    )
            )

            // Inner Interactive Core
            Box(
                modifier = Modifier
                    .size(105.dp)
                    .background(
                        brush = Brush.radialGradient(
                            listOf(
                                Color.White.copy(alpha = 0.95f),
                                when {
                                    isListening -> NeonPink
                                    isSpeaking -> NeonViolet
                                    isThinking -> NeonAmber
                                    else -> NeonCyan
                                },
                                when {
                                    isListening -> NeonViolet
                                    isSpeaking -> ElectricBlue
                                    isThinking -> NeonPink
                                    else -> ElectricBlue
                                }
                            )
                        ),
                        shape = CircleShape
                    )
                    .clickable { onOrbClick() },
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = when {
                            isListening -> "LISTENING"
                            isSpeaking -> "SPEAKING"
                            isThinking -> "THINKING"
                            else -> "RAMYA"
                        },
                        color = Color.Black,
                        fontWeight = FontWeight.Black,
                        fontSize = 12.sp,
                        letterSpacing = 1.sp
                    )
                    Text(
                        text = when {
                            isListening -> "Speak now"
                            isSpeaking -> "Tap to pause"
                            isThinking -> "Analyzing..."
                            else -> "Tap to Speak"
                        },
                        color = Color.Black.copy(alpha = 0.85f),
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // --- EQUALIZER WAVEFORM BARS RESPONDING TO LIVE AUDIO OR TTS ---
        Row(
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.height(26.dp)
        ) {
            val barHeights = listOf(10, 18, 24, 14, 22, 12, 20, 8, 16)
            barHeights.forEachIndexed { i, baseH ->
                val barScale by rememberInfiniteTransition(label = "eq_$i").animateFloat(
                    initialValue = 0.35f,
                    targetValue = if (isSpeaking) 1.0f else if (isThinking) 0.8f else 0.45f,
                    animationSpec = infiniteRepeatable(
                        animation = tween(380 + (i * 85), easing = FastOutSlowInEasing),
                        repeatMode = RepeatMode.Reverse
                    ),
                    label = "barH_$i"
                )

                val effectiveHeight = if (isListening) {
                    ((baseH * 0.4f) + (rmsDecibels * (i % 3 + 1) * 1.6f)).coerceIn(6f, 26f)
                } else {
                    baseH * barScale
                }

                Box(
                    modifier = Modifier
                        .width(4.dp)
                        .height(effectiveHeight.dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(
                            when {
                                isListening -> NeonPink
                                isSpeaking -> NeonViolet
                                isThinking -> NeonAmber
                                else -> NeonCyan
                            }
                        )
                )
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // --- QUICK SUGGESTION CHIPS ---
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            val chips = listOf(
                "⛅ Weather in Hyderabad",
                "🗣️ Teach me English",
                "🔄 Translate: నేను వస్తాను",
                "🎵 Play relaxing music",
                "▶️ Open YouTube"
            )
            chips.forEach { chip ->
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(16.dp))
                        .background(CyberpunkCard)
                        .border(1.dp, CyberpunkCardBorder, RoundedCornerShape(16.dp))
                        .clickable { onQuickChipClick(chip) }
                        .padding(horizontal = 12.dp, vertical = 7.dp)
                ) {
                    Text(chip, color = TextPrimary, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // --- USER SPEECH TRANSCRIPT BUBBLE ---
        Card(
            colors = CardDefaults.cardColors(containerColor = CyberpunkCard),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, if (isListening) NeonPink.copy(alpha = 0.7f) else NeonCyan.copy(alpha = 0.35f), RoundedCornerShape(14.dp))
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("👤 YOU (VOICE / TEXT)", color = if (isListening) NeonPink else NeonCyan, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    if (isListening) {
                        Text("● LIVE MIC RECORDING", color = NeonPink, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                    }
                }
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = userTranscript,
                    color = TextPrimary,
                    fontSize = 14.sp,
                    lineHeight = 20.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // --- ASSISTANT RESPONSE BUBBLE (WITH REAL MOUTH AUDIO CONTROLS) ---
        Card(
            colors = CardDefaults.cardColors(containerColor = CyberpunkSurface),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, if (isSpeaking) NeonViolet.copy(alpha = 0.8f) else NeonViolet.copy(alpha = 0.45f), RoundedCornerShape(14.dp))
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("🤖 RAMYA AI", color = NeonViolet, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .background(if (isSpeaking) NeonViolet else NeonGreen, CircleShape)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(
                            text = if (isSpeaking) "SPEAKING ALOUD" else "AUDIO READY",
                            color = if (isSpeaking) NeonViolet else NeonGreen,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = assistantResponse,
                    color = TextPrimary,
                    fontSize = 14.sp,
                    lineHeight = 20.sp
                )

                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider(color = CyberpunkCardBorder)
                Spacer(modifier = Modifier.height(10.dp))

                // Real Mouth Controls: Re-Listen / Stop Speech / Copy
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedButton(
                        onClick = onToggleSpeech,
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                        modifier = Modifier.height(32.dp),
                        border = ButtonDefaults.outlinedButtonBorder.copy(
                            brush = androidx.compose.ui.graphics.SolidColor(if (isSpeaking) NeonPink else NeonCyan)
                        )
                    ) {
                        Text(
                            text = if (isSpeaking) "⏹️ Stop Voice" else "🔊 Listen Aloud",
                            color = if (isSpeaking) NeonPink else NeonCyan,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    OutlinedButton(
                        onClick = {
                            val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                            val clip = ClipData.newPlainText("Ramya AI Response", assistantResponse)
                            clipboard.setPrimaryClip(clip)
                            Toast.makeText(context, "Copied to clipboard!", Toast.LENGTH_SHORT).show()
                        },
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        modifier = Modifier.height(32.dp)
                    ) {
                        Text("📋 Copy", color = TextSecondary, fontSize = 11.sp)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))
    }
}

@Composable
fun TeluguTutorTab(
    onListenPhrase: (String) -> Unit,
    onPracticeSpoken: (String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text("TELUGU ⇄ ENGLISH CONVERSATION STUDIO", color = NeonCyan, fontSize = 13.sp, fontWeight = FontWeight.Black)
        Text("Everyday practical phrases with natural pronunciation & real voice feedback", color = TextSecondary, fontSize = 11.sp)

        Spacer(modifier = Modifier.height(16.dp))

        // Daily Card
        val dailyPhrase = "Could you please help me with this?"
        Card(
            colors = CardDefaults.cardColors(containerColor = CyberpunkCard),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, NeonViolet.copy(alpha = 0.5f), RoundedCornerShape(16.dp))
        ) {
            Column(modifier = Modifier.padding(18.dp)) {
                Text("TODAY'S CONVERSATIONAL LESSON", color = NeonAmber, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = "\"$dailyPhrase\"",
                    color = Color.White,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Telugu Meaning: 'దయచేసి నాకు ఇందులో సహాయం చేయగలరా?'",
                    color = NeonCyan,
                    fontSize = 14.sp
                )

                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "Pronunciation: 'kud-yoo-pleez-help-mee-with-this'",
                    color = TextSecondary,
                    fontSize = 12.sp
                )

                Spacer(modifier = Modifier.height(16.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedButton(
                        onClick = { onListenPhrase(dailyPhrase) },
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("🔊 Listen Voice", color = NeonCyan, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                    Button(
                        onClick = { onPracticeSpoken(dailyPhrase) },
                        colors = ButtonDefaults.buttonColors(containerColor = NeonViolet),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("🎙️ Practice Spoken", color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Spaced Repetition Card
        val revisionPhrase = "I will be there in ten minutes."
        Card(
            colors = CardDefaults.cardColors(containerColor = CyberpunkSurface),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, CyberpunkCardBorder, RoundedCornerShape(16.dp))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("DAILY REVISION", color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Previous: '$revisionPhrase' ('నేను పది నిమిషాల్లో వస్తాను')",
                    color = TextSecondary,
                    fontSize = 13.sp
                )
                Spacer(modifier = Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = { onListenPhrase(revisionPhrase) },
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("🔊 Listen Voice", color = NeonCyan, fontSize = 12.sp)
                    }
                    Button(
                        onClick = { onPracticeSpoken(revisionPhrase) },
                        colors = ButtonDefaults.buttonColors(containerColor = CyberpunkCard),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("🎙️ Practice", color = NeonGreen, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun AccountAndCloudTab(
    context: Context,
    userProfile: String,
    cloudStatus: String,
    serviceActive: Boolean,
    onToggleService: (Boolean) -> Unit,
    onGuestSignIn: () -> Unit,
    onCheckCloudSync: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text("ACCOUNT, CLOUD & PHONE CONTROLS", color = ElectricBlue, fontSize = 13.sp, fontWeight = FontWeight.Black)
        Text("User profile, cloud synchronization & quick apps", color = TextSecondary, fontSize = 11.sp)

        Spacer(modifier = Modifier.height(16.dp))

        // Profile & Cloud Account Card
        Card(
            colors = CardDefaults.cardColors(containerColor = CyberpunkCard),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, NeonCyan.copy(alpha = 0.4f), RoundedCornerShape(14.dp))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("USER ACCOUNT & SECURITY", color = NeonCyan, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(userProfile, color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                        Text("Firebase & Google Services Protected", color = TextSecondary, fontSize = 11.sp)
                    }
                    Button(
                        onClick = onGuestSignIn,
                        colors = ButtonDefaults.buttonColors(containerColor = CyberpunkSurface),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.border(1.dp, CyberpunkCardBorder, RoundedCornerShape(8.dp))
                    ) {
                        Text("Sign In", color = NeonCyan, fontSize = 11.sp)
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))
                HorizontalDivider(color = CyberpunkCardBorder)
                Spacer(modifier = Modifier.height(14.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(cloudStatus, color = NeonGreen, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                    OutlinedButton(
                        onClick = onCheckCloudSync,
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        modifier = Modifier.height(30.dp)
                    ) {
                        Text("Sync", color = NeonCyan, fontSize = 11.sp)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Hardware Voice & Audio Engine Status Card
        Card(
            colors = CardDefaults.cardColors(containerColor = CyberpunkCard),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, ElectricBlue.copy(alpha = 0.35f), RoundedCornerShape(14.dp))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("HARDWARE VOICE & AUDIO ENGINE", color = ElectricBlue, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Microphone (Speech Recognition)", color = TextPrimary, fontSize = 12.sp)
                    Text("Enabled", color = NeonGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Speech Output (TTS Mouth)", color = TextPrimary, fontSize = 12.sp)
                    Text("Enabled", color = NeonGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("Vibration Haptics", color = TextPrimary, fontSize = 12.sp)
                    Text("Enabled", color = NeonGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Background Service Card
        Card(
            colors = CardDefaults.cardColors(containerColor = CyberpunkCard),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, if (serviceActive) NeonGreen.copy(alpha = 0.5f) else CyberpunkCardBorder, RoundedCornerShape(14.dp))
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text("24/7 Voice Wake Detection", color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    Text(
                        if (serviceActive) "● Active in Background ('Hey Ramya' ready)" else "○ Standby Mode (Saves battery)",
                        color = if (serviceActive) NeonGreen else TextSecondary,
                        fontSize = 12.sp
                    )
                }
                Switch(
                    checked = serviceActive,
                    onCheckedChange = onToggleService
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Quick Launchers
        Text("PHONE APPLICATION LAUNCHERS", color = TextPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.height(8.dp))

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(
                onClick = { AppLauncherManager.openApp(context, "chrome") },
                colors = ButtonDefaults.buttonColors(containerColor = CyberpunkCard),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier
                    .weight(1f)
                    .border(1.dp, CyberpunkCardBorder, RoundedCornerShape(10.dp))
            ) {
                Text("🌐 Chrome", color = NeonCyan, fontSize = 12.sp)
            }
            Button(
                onClick = { AppLauncherManager.openApp(context, "youtube") },
                colors = ButtonDefaults.buttonColors(containerColor = CyberpunkCard),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier
                    .weight(1f)
                    .border(1.dp, CyberpunkCardBorder, RoundedCornerShape(10.dp))
            ) {
                Text("▶️ YouTube", color = NeonPink, fontSize = 12.sp)
            }
            Button(
                onClick = { DialerIntent.openDialer(context, "") },
                colors = ButtonDefaults.buttonColors(containerColor = CyberpunkCard),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier
                    .weight(1f)
                    .border(1.dp, CyberpunkCardBorder, RoundedCornerShape(10.dp))
            ) {
                Text("📞 Phone", color = NeonGreen, fontSize = 12.sp)
            }
        }
    }
}
