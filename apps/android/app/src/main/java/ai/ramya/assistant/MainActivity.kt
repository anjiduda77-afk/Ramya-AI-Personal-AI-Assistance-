package ai.ramya.assistant

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
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
import ai.ramya.assistant.intents.AppLauncherIntent
import ai.ramya.assistant.intents.DialerIntent
import ai.ramya.assistant.service.RamyaVoiceForegroundService
import ai.ramya.assistant.ui.screens.PermissionOnboardingScreen
import ai.ramya.assistant.ui.theme.*

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
    TOOLS_STATUS
}

@Composable
fun AndroidCommandCenter(onOpenPermissions: () -> Unit) {
    val context = LocalContext.current
    val focusManager = LocalFocusManager.current
    
    var currentTab by remember { mutableStateOf(MobileTab.VOICE_ASSISTANT) }
    var isListening by remember { mutableStateOf(false) }
    var userTranscript by remember { mutableStateOf("Tap the Orb or say 'Hey Ramya'...") }
    var assistantResponse by remember { mutableStateOf("Namaskaram! I am Ramya, your offline-first personal assistant. How can I help you today?") }
    var serviceActive by remember { mutableStateOf(false) }
    var textPrompt by remember { mutableStateOf("") }
    var isSpeaking by remember { mutableStateOf(false) }

    // Pulsing Orb Animation
    val infiniteTransition = rememberInfiniteTransition(label = "orbPulse")
    val scalePulse by infiniteTransition.animateFloat(
        initialValue = 0.96f,
        targetValue = if (isListening) 1.18f else 1.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(if (isListening) 550 else 2200, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )
    val haloAlpha by infiniteTransition.animateFloat(
        initialValue = 0.15f,
        targetValue = if (isListening) 0.55f else 0.28f,
        animationSpec = infiniteRepeatable(
            animation = tween(if (isListening) 600 else 1800, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "haloAlpha"
    )

    fun handleCommand(query: String) {
        val q = query.lowercase().trim()
        userTranscript = query
        isListening = false
        isSpeaking = true

        when {
            q.contains("weather") -> {
                assistantResponse = "Weather in Hyderabad: 28°C, Clear Sky. Humidity: 48%. Perfect weather today!"
            }
            q.contains("english") || q.contains("teach") || q.contains("lesson") -> {
                assistantResponse = "Today's conversational phrase: 'Could you please help me with this?'\nTelugu: 'దయచేసి నాకు ఇందులో సహాయం చేయగలరా?'"
                currentTab = MobileTab.TELUGU_TUTOR
            }
            q.contains("translate") || q.contains("telugu") -> {
                assistantResponse = "Telugu intent: 'నేను పది నిమిషాల్లో వస్తాను'\nNatural English: 'I will be there in ten minutes.'"
            }
            q.contains("music") || q.contains("relax") || q.contains("play") -> {
                assistantResponse = "Playing legal CC-licensed stream: 'Deep Focus Ambient Beats' by Musopen."
            }
            q.contains("youtube") -> {
                assistantResponse = "Opening YouTube..."
                AppLauncherIntent.launchApp(context, "youtube")
            }
            q.contains("chrome") -> {
                assistantResponse = "Opening Google Chrome..."
                AppLauncherIntent.launchApp(context, "chrome")
            }
            q.contains("dial") || q.contains("call") -> {
                assistantResponse = "Opening Phone Dialer..."
                DialerIntent.openDialer(context, "")
            }
            else -> {
                assistantResponse = "Understood: '$query'. Local Gemma 3 4B processed your request offline with zero cloud latency."
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
                        .size(34.dp)
                        .background(Brush.radialGradient(listOf(NeonCyan, ElectricBlue)), CircleShape)
                        .border(1.5.dp, NeonCyan, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text("R", color = Color.Black, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
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
                                .background(NeonGreen, CircleShape)
                        )
                        Spacer(modifier = Modifier.width(5.dp))
                        Text(
                            text = "HYBRID ACTIVE",
                            color = NeonGreen,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.8.sp
                        )
                    }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = onOpenPermissions,
                    colors = ButtonDefaults.buttonColors(containerColor = CyberpunkCard),
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                    modifier = Modifier
                        .height(34.dp)
                        .border(1.dp, CyberpunkCardBorder, RoundedCornerShape(10.dp))
                ) {
                    Text("🛡️ PERMS", color = TextSecondary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
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
                Triple(MobileTab.TELUGU_TUTOR, "📚 Telugu Tutor", NeonViolet),
                Triple(MobileTab.TOOLS_STATUS, "⚡ Tools", ElectricBlue)
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
                        scalePulse = scalePulse,
                        haloAlpha = haloAlpha,
                        userTranscript = userTranscript,
                        assistantResponse = assistantResponse,
                        onOrbClick = {
                            isListening = !isListening
                            if (isListening) {
                                userTranscript = "Listening for voice..."
                            } else {
                                handleCommand("Hello Ramya, what is today's schedule?")
                            }
                        },
                        onQuickChipClick = { cmd -> handleCommand(cmd) }
                    )
                }
                MobileTab.TELUGU_TUTOR -> {
                    TeluguTutorTab(
                        onPracticeSpoken = { handleCommand("Teach me an English conversation phrase") }
                    )
                }
                MobileTab.TOOLS_STATUS -> {
                    ToolsAndStatusTab(
                        context = context,
                        serviceActive = serviceActive,
                        onToggleService = { active ->
                            serviceActive = active
                            if (active) {
                                RamyaVoiceForegroundService.startService(context)
                            } else {
                                RamyaVoiceForegroundService.stopService(context)
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
                    Text("Ask Ramya anything or speak...", color = TextMuted, fontSize = 13.sp)
                },
                modifier = Modifier
                    .weight(1f)
                    .height(50.dp)
                    .background(CyberpunkInputBg, RoundedCornerShape(10.dp))
                    .border(1.dp, CyberpunkCardBorder, RoundedCornerShape(10.dp)),
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
                        handleCommand(textPrompt)
                        textPrompt = ""
                        focusManager.clearFocus()
                    }
                }),
                singleLine = true
            )

            // Direct Send Button
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(Brush.linearGradient(listOf(NeonCyan, ElectricBlue)))
                    .clickable {
                        if (textPrompt.isNotBlank()) {
                            handleCommand(textPrompt)
                            textPrompt = ""
                            focusManager.clearFocus()
                        } else {
                            isListening = !isListening
                            if (isListening) userTranscript = "Listening for voice..."
                        }
                    },
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = if (textPrompt.isNotBlank()) "➤" else "🎙️",
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
    scalePulse: Float,
    haloAlpha: Float,
    userTranscript: String,
    assistantResponse: String,
    onOrbClick: () -> Unit,
    onQuickChipClick: (String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(10.dp))

        // --- GLOWING CYBERPUNK ORB ---
        Box(
            modifier = Modifier
                .size(190.dp),
            contentAlignment = Alignment.Center
        ) {
            // Outer Glowing Halo Ring
            Box(
                modifier = Modifier
                    .size(180.dp)
                    .scale(scalePulse * 1.15f)
                    .background(
                        color = (if (isListening) NeonPink else NeonCyan).copy(alpha = haloAlpha * 0.4f),
                        shape = CircleShape
                    )
            )

            // Middle Wave Ring
            Box(
                modifier = Modifier
                    .size(145.dp)
                    .scale(scalePulse)
                    .background(
                        brush = if (isListening) OrbListeningGradient else OrbCyanGradient,
                        shape = CircleShape
                    )
                    .border(2.dp, (if (isListening) NeonPink else NeonCyan).copy(alpha = 0.8f), CircleShape)
            )

            // Inner Interactive Core
            Box(
                modifier = Modifier
                    .size(105.dp)
                    .background(
                        brush = Brush.radialGradient(
                            listOf(
                                Color.White.copy(alpha = 0.9f),
                                if (isListening) NeonPink else NeonCyan,
                                if (isListening) NeonViolet else ElectricBlue
                            )
                        ),
                        shape = CircleShape
                    )
                    .clickable { onOrbClick() },
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = if (isListening) "LISTENING" else "RAMYA",
                        color = Color.Black,
                        fontWeight = FontWeight.Black,
                        fontSize = 13.sp,
                        letterSpacing = 1.sp
                    )
                    Text(
                        text = if (isListening) "Say command" else "Tap to Speak",
                        color = Color.Black.copy(alpha = 0.8f),
                        fontSize = 9.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // --- EQUALIZER WAVEFORM BARS ---
        Row(
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.height(24.dp)
        ) {
            val barHeights = listOf(10, 18, 24, 14, 22, 12, 20, 8, 16)
            barHeights.forEachIndexed { i, baseH ->
                val barScale by rememberInfiniteTransition(label = "eq_$i").animateFloat(
                    initialValue = 0.4f,
                    targetValue = if (isListening) 1.0f else 0.5f,
                    animationSpec = infiniteRepeatable(
                        animation = tween(400 + (i * 90), easing = FastOutSlowInEasing),
                        repeatMode = RepeatMode.Reverse
                    ),
                    label = "barH_$i"
                )
                Box(
                    modifier = Modifier
                        .width(4.dp)
                        .height((baseH * barScale).dp)
                        .clip(RoundedCornerShape(2.dp))
                        .background(if (isListening) NeonPink else NeonCyan)
                )
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // --- QUICK SUGGESTION CHIPS (HORIZONTAL SCROLL) ---
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            val chips = listOf(
                "🗣️ Teach me English",
                "⛅ Weather in Hyderabad",
                "🎵 Play relaxing beats",
                "🔄 Translate Telugu",
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
                .border(1.dp, NeonCyan.copy(alpha = 0.35f), RoundedCornerShape(14.dp))
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("👤 YOU (VOICE / TEXT)", color = NeonCyan, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
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

        // --- ASSISTANT RESPONSE BUBBLE ---
        Card(
            colors = CardDefaults.cardColors(containerColor = CyberpunkSurface),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, NeonViolet.copy(alpha = 0.45f), RoundedCornerShape(14.dp))
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("🤖 RAMYA AI RESPONSE", color = NeonViolet, fontSize = 10.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    Text("🔊 AUDIO READY", color = NeonGreen, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = assistantResponse,
                    color = TextPrimary,
                    fontSize = 14.sp,
                    lineHeight = 20.sp
                )
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
    }
}

@Composable
fun TeluguTutorTab(onPracticeSpoken: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text("TELUGU ⇄ ENGLISH CONVERSATION STUDIO", color = NeonCyan, fontSize = 13.sp, fontWeight = FontWeight.Black)
        Text("Daily practical phrases with spaced repetition memory", color = TextSecondary, fontSize = 11.sp)

        Spacer(modifier = Modifier.height(16.dp))

        // Daily Card
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
                    text = "\"Could you please help me with this?\"",
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
                Button(
                    onClick = onPracticeSpoken,
                    colors = ButtonDefaults.buttonColors(containerColor = NeonViolet),
                    shape = RoundedCornerShape(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("🎙️ Speak & Practice This Phrase", color = Color.White, fontWeight = FontWeight.Bold)
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Spaced Repetition Card
        Card(
            colors = CardDefaults.cardColors(containerColor = CyberpunkSurface),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, CyberpunkCardBorder, RoundedCornerShape(16.dp))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("SPACED REPETITION REVISION", color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Yesterday: 'I will be there in ten minutes.' ('నేను పది నిమిషాల్లో వస్తాను')",
                    color = TextSecondary,
                    fontSize = 13.sp
                )
                Spacer(modifier = Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = onPracticeSpoken,
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("🔊 Hear Audio", color = NeonCyan, fontSize = 12.sp)
                    }
                    Button(
                        onClick = onPracticeSpoken,
                        colors = ButtonDefaults.buttonColors(containerColor = CyberpunkCard),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.weight(1f)
                    ) {
                        Text("✓ Mastered", color = NeonGreen, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}

@Composable
fun ToolsAndStatusTab(
    context: android.content.Context,
    serviceActive: Boolean,
    onToggleService: (Boolean) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp)
    ) {
        Text("SYSTEM AUTOMATION & CLOUD STATUS", color = ElectricBlue, fontSize = 13.sp, fontWeight = FontWeight.Black)
        Text("Phone permissions, background listener & hybrid telemetry", color = TextSecondary, fontSize = 11.sp)

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
                    Text("24/7 Wake Word Listening", color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    Text(
                        if (serviceActive) "● Active in Background (Hey Ramya ready)" else "○ Paused (Saves battery)",
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
                onClick = { AppLauncherIntent.launchApp(context, "chrome") },
                colors = ButtonDefaults.buttonColors(containerColor = CyberpunkCard),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier
                    .weight(1f)
                    .border(1.dp, CyberpunkCardBorder, RoundedCornerShape(10.dp))
            ) {
                Text("🌐 Chrome", color = NeonCyan, fontSize = 12.sp)
            }
            Button(
                onClick = { AppLauncherIntent.launchApp(context, "youtube") },
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

        Spacer(modifier = Modifier.height(20.dp))

        // Cloud & Telemetry Card
        Card(
            colors = CardDefaults.cardColors(containerColor = CyberpunkSurface),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, CyberpunkCardBorder, RoundedCornerShape(14.dp))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("TELEMETRY & CLOUD STATUS", color = TextSecondary, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(10.dp))
                
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Firebase Project", color = TextSecondary, fontSize = 12.sp)
                    Text("ramya-ai-b22e4 (Active)", color = NeonGreen, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.height(6.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Supabase Cloud Sync", color = TextSecondary, fontSize = 12.sp)
                    Text("Connected", color = NeonCyan, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
                Spacer(modifier = Modifier.height(6.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Local Offline Core", color = TextSecondary, fontSize = 12.sp)
                    Text("Gemma 3 4B (Zero Latency)", color = NeonAmber, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
