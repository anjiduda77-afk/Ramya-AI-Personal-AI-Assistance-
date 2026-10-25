package ai.ramya.assistant

import android.Manifest
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import ai.ramya.assistant.data.ChatMessage
import ai.ramya.assistant.data.CloudManager
import ai.ramya.assistant.data.ConversationContextManager
import ai.ramya.assistant.data.ConversationMetadata
import ai.ramya.assistant.data.ConversationRepository
import ai.ramya.assistant.intents.AppLauncherManager
import ai.ramya.assistant.intents.ContactCallManager
import ai.ramya.assistant.intents.DialerIntent
import ai.ramya.assistant.orchestrator.AssistantOrchestrator
import ai.ramya.assistant.service.RamyaVoiceForegroundService
import ai.ramya.assistant.ui.*
import ai.ramya.assistant.ui.screens.PermissionOnboardingScreen
import ai.ramya.assistant.ui.theme.*
import ai.ramya.assistant.voice.VoiceEngine
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class MainActivity : ComponentActivity() {
    private var externalQueryHandler: ((String) -> Unit)? = null

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        intent.getStringExtra(RamyaVoiceForegroundService.EXTRA_WAKE_QUERY)?.let { wakeQuery ->
            externalQueryHandler?.invoke(wakeQuery)
        }
    }

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
                        AndroidCommandCenter(
                            onOpenPermissions = { showOnboarding = true },
                            registerExternalQueryHandler = { handler ->
                                externalQueryHandler = handler
                            }
                        )
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
fun AndroidCommandCenter(
    onOpenPermissions: () -> Unit,
    registerExternalQueryHandler: ((String) -> Unit) -> Unit = {}
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val focusManager = LocalFocusManager.current

    // Initialize native Voice Engine
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
    var serviceActive by remember { mutableStateOf(false) }
    var textPrompt by remember { mutableStateOf("") }

    // Dialog & Navigation States
    var showAuthDialog by remember { mutableStateOf(false) }
    var showProfileDialog by remember { mutableStateOf(false) }
    var showHistoryDrawer by remember { mutableStateOf(false) }
    var showConnectionsDialog by remember { mutableStateOf(false) }
    var showSettingsDialog by remember { mutableStateOf(false) }

    // Multi-Chat States
    var activeChatId by remember { mutableStateOf(ConversationRepository.getActiveChatId(context)) }
    var activeChatTitle by remember { mutableStateOf("Conversation") }
    var activeMessages by remember { mutableStateOf<List<ChatMessage>>(emptyList()) }
    var userDisplayName by remember { mutableStateOf(CloudManager.getUserDisplayName()) }
    var userPhotoUrl by remember { mutableStateOf(CloudManager.getUserPhotoUrl()) }

    // Load active conversation messages
    fun reloadActiveChat(chatId: String) {
        coroutineScope.launch {
            activeChatId = chatId
            ConversationRepository.setActiveChatId(context, chatId)
            val msgs = ConversationRepository.fetchMessages(context, chatId)
            activeMessages = msgs
            val convs = ConversationRepository.fetchConversations(context)
            val curr = convs.firstOrNull { it.id == chatId }
            activeChatTitle = curr?.title ?: "Conversation"
        }
    }

    LaunchedEffect(Unit) {
        reloadActiveChat(activeChatId)
    }

    // Refresh profile credentials
    fun refreshProfile() {
        userDisplayName = CloudManager.getUserDisplayName()
        userPhotoUrl = CloudManager.getUserPhotoUrl()
    }

    // Surface live speech transcription
    LaunchedEffect(liveTranscript) {
        if (liveTranscript.isNotBlank() && isListening) {
            textPrompt = liveTranscript
        }
    }

    // Display voice engine errors if any
    LaunchedEffect(voiceError) {
        voiceError?.let {
            Toast.makeText(context, it, Toast.LENGTH_SHORT).show()
        }
    }

    fun executeQuery(query: String) {
        val clean = query.trim()
        if (clean.isBlank()) return

        textPrompt = ""
        focusManager.clearFocus()
        voiceEngine.stopListening()
        isThinking = true

        coroutineScope.launch {
            // 1. Add User message to active chat
            val userMsg = ConversationRepository.addMessage(
                context = context,
                conversationId = activeChatId,
                sender = "user",
                text = clean
            )
            activeMessages = activeMessages + userMsg

            // 2. Process query through native Intent Orchestrator & RAG
            val response = AssistantOrchestrator.processQuery(context, clean)

            // 3. Add Assistant response to active chat
            val assistantMsg = ConversationRepository.addMessage(
                context = context,
                conversationId = activeChatId,
                sender = "assistant",
                text = response.displayText,
                actionTag = response.actionTag
            )
            activeMessages = activeMessages + assistantMsg
            isThinking = false

            // Update title if updated
            val convs = ConversationRepository.fetchConversations(context)
            val curr = convs.firstOrNull { it.id == activeChatId }
            activeChatTitle = curr?.title ?: activeChatTitle

            // 4. Ramya speaks response aloud
            voiceEngine.speak(response.spokenText)
        }
    }

    // Dynamic Microphone Permission Launcher
    val micPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            voiceEngine.startListening { query -> executeQuery(query) }
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
                voiceEngine.startListening { query -> executeQuery(query) }
            } else {
                micPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
            }
        }
    }

    LaunchedEffect(Unit) {
        registerExternalQueryHandler { query ->
            if (query.isNotBlank()) {
                executeQuery(query)
            } else {
                toggleListening()
            }
        }
    }

    // Dialog Renderers
    if (showAuthDialog) {
        FirebaseAuthDialog(
            onDismiss = { showAuthDialog = false },
            onAuthSuccess = { refreshProfile() }
        )
    }

    if (showProfileDialog) {
        UserProfileDialog(
            onDismiss = { showProfileDialog = false },
            onSignOut = {
                refreshProfile()
                reloadActiveChat(ConversationRepository.startNewConversation(context).id)
            }
        )
    }

    if (showHistoryDrawer) {
        ChatHistoryDrawer(
            activeChatId = activeChatId,
            onSelectChat = { id -> reloadActiveChat(id) },
            onNewChat = {
                ConversationContextManager.endSession()
                val newConv = ConversationRepository.startNewConversation(context)
                reloadActiveChat(newConv.id)
            },
            onDismiss = { showHistoryDrawer = false }
        )
    }

    if (showConnectionsDialog) {
        ConnectionsDialog(onDismiss = { showConnectionsDialog = false })
    }

    if (showSettingsDialog) {
        SettingsAndPrivacyDialog(
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
            onOpenProfile = { showProfileDialog = true },
            onOpenConnections = { showConnectionsDialog = true },
            onDismiss = { showSettingsDialog = false }
        )
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
                .padding(horizontal = 16.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Profile & Greeting
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.clickable {
                    if (CloudManager.isUserSignedIn()) {
                        showProfileDialog = true
                    } else {
                        showAuthDialog = true
                    }
                }
            ) {
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .background(Brush.radialGradient(listOf(NeonCyan, ElectricBlue)))
                        .border(1.5.dp, NeonCyan, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    if (!userPhotoUrl.isNullOrBlank()) {
                        AsyncImage(
                            model = userPhotoUrl,
                            contentDescription = "Profile",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                    } else {
                        Text(
                            text = userDisplayName.take(1).uppercase(),
                            color = Color.Black,
                            fontWeight = FontWeight.Black,
                            fontSize = 17.sp
                        )
                    }
                }
                Spacer(modifier = Modifier.width(10.dp))
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "RAMYA AI",
                            color = NeonCyan,
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 1.sp
                        )
                        Spacer(modifier = Modifier.width(5.dp))
                        Text(
                            text = "v1.0.1",
                            color = NeonViolet,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Text(
                        text = "Hello, ${userDisplayName.split(" ").firstOrNull() ?: "there"}!",
                        color = TextSecondary,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            // Quick Header Action Icons (New Chat, History, Connections, Settings)
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // New Chat Icon
                IconButton(
                    onClick = {
                        ConversationContextManager.endSession()
                        val newConv = ConversationRepository.startNewConversation(context)
                        reloadActiveChat(newConv.id)
                        Toast.makeText(context, "Started fresh chat session", Toast.LENGTH_SHORT).show()
                    },
                    modifier = Modifier
                        .size(34.dp)
                        .background(CyberpunkCard, RoundedCornerShape(8.dp))
                        .border(1.dp, CyberpunkCardBorder, RoundedCornerShape(8.dp))
                ) {
                    Text("➕", fontSize = 13.sp)
                }

                // History Drawer Icon
                IconButton(
                    onClick = { showHistoryDrawer = true },
                    modifier = Modifier
                        .size(34.dp)
                        .background(CyberpunkCard, RoundedCornerShape(8.dp))
                        .border(1.dp, CyberpunkCardBorder, RoundedCornerShape(8.dp))
                ) {
                    Text("💬", fontSize = 13.sp)
                }

                // AI Connections Icon
                IconButton(
                    onClick = { showConnectionsDialog = true },
                    modifier = Modifier
                        .size(34.dp)
                        .background(CyberpunkCard, RoundedCornerShape(8.dp))
                        .border(1.dp, CyberpunkCardBorder, RoundedCornerShape(8.dp))
                ) {
                    Text("⚡", fontSize = 13.sp)
                }

                // Settings & Privacy Icon
                IconButton(
                    onClick = { showSettingsDialog = true },
                    modifier = Modifier
                        .size(34.dp)
                        .background(CyberpunkCard, RoundedCornerShape(8.dp))
                        .border(1.dp, CyberpunkCardBorder, RoundedCornerShape(8.dp))
                ) {
                    Text("⚙️", fontSize = 13.sp)
                }
            }
        }

        // --- 2. SEGMENTED NAVIGATION TABS ---
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 2.dp)
                .background(CyberpunkSurface, RoundedCornerShape(12.dp))
                .border(1.dp, CyberpunkCardBorder, RoundedCornerShape(12.dp))
                .padding(4.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            val tabs = listOf(
                Triple(MobileTab.VOICE_ASSISTANT, "🎙️ Assistant", NeonCyan),
                Triple(MobileTab.TELUGU_TUTOR, "📚 English Tutor", NeonViolet),
                Triple(MobileTab.ACCOUNT_CLOUD, "☁️ Cloud & Settings", ElectricBlue)
            )

            tabs.forEach { (tab, title, accentColor) ->
                val selected = currentTab == tab
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (selected) accentColor.copy(alpha = 0.2f) else Color.Transparent)
                        .clickable { currentTab = tab }
                        .padding(vertical = 8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = title,
                        color = if (selected) accentColor else TextSecondary,
                        fontSize = 12.sp,
                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium
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
            val orbVisualState = when {
                voiceError != null -> OrbVisualState.ERROR
                isThinking -> OrbVisualState.THINKING
                isSpeaking -> OrbVisualState.SPEAKING
                isListening -> OrbVisualState.LISTENING
                else -> OrbVisualState.IDLE
            }

            when (currentTab) {
                MobileTab.VOICE_ASSISTANT -> {
                    VoiceAssistantTab(
                        chatTitle = activeChatTitle,
                        messages = activeMessages,
                        orbVisualState = orbVisualState,
                        rmsDecibels = rmsDecibels,
                        onOrbClick = { toggleListening() },
                        onQuickChipClick = { cmd -> executeQuery(cmd) },
                        onNewChatClick = {
                            ConversationContextManager.endSession()
                            val newConv = ConversationRepository.startNewConversation(context)
                            reloadActiveChat(newConv.id)
                        },
                        onOpenHistoryClick = { showHistoryDrawer = true },
                        onSpeakMessage = { text -> voiceEngine.speak(text) },
                        onStopSpeech = { voiceEngine.stopSpeaking() },
                        isSpeaking = isSpeaking
                    )
                }
                MobileTab.TELUGU_TUTOR -> {
                    TeluguTutorTab(
                        onListenPhrase = { phrase -> voiceEngine.speak(phrase) },
                        onPracticeSpoken = { targetPhrase ->
                            val hasPermission = ContextCompat.checkSelfPermission(
                                context,
                                Manifest.permission.RECORD_AUDIO
                            ) == PackageManager.PERMISSION_GRANTED

                            if (hasPermission) {
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
                        userProfile = userDisplayName,
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
                        onOpenAuth = { showAuthDialog = true },
                        onOpenProfile = { showProfileDialog = true },
                        onOpenConnections = { showConnectionsDialog = true },
                        onOpenSettings = { showSettingsDialog = true }
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
                        if (isListening) "Listening... speak now" else "Ask Ramya anything or tap mic...",
                        color = TextMuted,
                        fontSize = 13.sp
                    )
                },
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                keyboardActions = KeyboardActions(onSend = {
                    if (textPrompt.isNotBlank()) {
                        executeQuery(textPrompt)
                    }
                }),
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = CyberpunkCard,
                    unfocusedContainerColor = CyberpunkCard,
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent
                ),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .weight(1f)
                    .height(50.dp)
                    .border(1.dp, if (isListening) NeonPink else CyberpunkCardBorder, RoundedCornerShape(12.dp))
            )

            // Dynamic Action Button: Send if text entered, otherwise Microphone button
            if (textPrompt.isNotBlank()) {
                IconButton(
                    onClick = { executeQuery(textPrompt) },
                    modifier = Modifier
                        .size(46.dp)
                        .background(NeonCyan, CircleShape)
                ) {
                    Text("➤", color = Color.Black, fontSize = 16.sp, fontWeight = FontWeight.Black)
                }
            } else {
                val micBg = if (isListening) Brush.radialGradient(listOf(NeonPink, NeonPink)) else Brush.radialGradient(listOf(NeonCyan, ElectricBlue))
                IconButton(
                    onClick = { toggleListening() },
                    modifier = Modifier
                        .size(46.dp)
                        .background(micBg, CircleShape)
                ) {
                    Text(
                        if (isListening) "⏹" else "🎙️",
                        color = Color.Black,
                        fontSize = 18.sp
                    )
                }
            }
        }
    }
}

@Composable
fun VoiceAssistantTab(
    chatTitle: String,
    messages: List<ChatMessage>,
    orbVisualState: OrbVisualState,
    rmsDecibels: Float,
    onOrbClick: () -> Unit,
    onQuickChipClick: (String) -> Unit,
    onNewChatClick: () -> Unit,
    onOpenHistoryClick: () -> Unit,
    onSpeakMessage: (String) -> Unit,
    onStopSpeech: () -> Unit,
    isSpeaking: Boolean
) {
    val context = LocalContext.current
    val listState = rememberLazyListState()

    // Scroll to bottom when new messages arrive
    LaunchedEffect(messages.size) {
        if (messages.isNotEmpty()) {
            listState.animateScrollToItem(messages.size - 1)
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 14.dp, vertical = 6.dp)
    ) {
        // Chat Header Banner
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .background(CyberpunkCard, RoundedCornerShape(10.dp))
                .border(1.dp, CyberpunkCardBorder, RoundedCornerShape(10.dp))
                .padding(horizontal = 12.dp, vertical = 7.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.weight(1f)) {
                Text("💬", fontSize = 12.sp)
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    text = chatTitle,
                    color = NeonCyan,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(
                    text = "➕ New",
                    color = TextSecondary,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.clickable { onNewChatClick() }
                )
                Text(
                    text = "🕘 History",
                    color = ElectricBlue,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.clickable { onOpenHistoryClick() }
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Multi-Message Conversation Stream
        LazyColumn(
            state = listState,
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            if (messages.isEmpty()) {
                item {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = CyberpunkCard),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, CyberpunkCardBorder, RoundedCornerShape(14.dp))
                    ) {
                        Column(
                            modifier = Modifier.padding(18.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text("🤖 NAMASKARAM!", color = NeonCyan, fontSize = 14.sp, fontWeight = FontWeight.Black)
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                "I am Ramya, your personal voice assistant.\nTap the Voice Orb or type below to send WhatsApp messages, play music, search documents, or learn English.",
                                color = TextSecondary,
                                fontSize = 12.sp,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                lineHeight = 18.sp
                            )
                        }
                    }
                }
            } else {
                items(messages) { msg ->
                    val isUser = msg.sender == "user"
                    val dateFormat = SimpleDateFormat("h:mm a", Locale.getDefault())
                    val timeStr = dateFormat.format(Date(msg.timestamp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = if (isUser) Arrangement.End else Arrangement.Start
                    ) {
                        Card(
                            colors = CardDefaults.cardColors(
                                containerColor = if (isUser) CyberpunkCard else CyberpunkSurface
                            ),
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier
                                .fillMaxWidth(0.88f)
                                .border(
                                    1.dp,
                                    if (isUser) NeonCyan.copy(alpha = 0.4f) else NeonViolet.copy(alpha = 0.4f),
                                    RoundedCornerShape(14.dp)
                                )
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = if (isUser) "👤 YOU" else "🤖 RAMYA AI",
                                        color = if (isUser) NeonCyan else NeonViolet,
                                        fontSize = 10.sp,
                                        fontWeight = FontWeight.Bold
                                    )

                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        msg.actionTag?.let { tag ->
                                            if (tag.isNotBlank() && tag != "PROMPT") {
                                                Box(
                                                    modifier = Modifier
                                                        .background(NeonGreen.copy(alpha = 0.15f), RoundedCornerShape(6.dp))
                                                        .padding(horizontal = 6.dp, vertical = 2.dp)
                                                ) {
                                                    Text(tag, color = NeonGreen, fontSize = 8.sp, fontWeight = FontWeight.Bold)
                                                }
                                                Spacer(modifier = Modifier.width(6.dp))
                                            }
                                        }
                                        Text(timeStr, color = TextMuted, fontSize = 9.sp)
                                    }
                                }

                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = msg.text,
                                    color = TextPrimary,
                                    fontSize = 13.sp,
                                    lineHeight = 18.sp
                                )

                                // Action Buttons on Assistant responses
                                if (!isUser) {
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Row(
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = if (isSpeaking) "⏹ Stop" else "🔊 Listen",
                                            color = if (isSpeaking) NeonPink else NeonCyan,
                                            fontSize = 10.sp,
                                            fontWeight = FontWeight.Bold,
                                            modifier = Modifier.clickable {
                                                if (isSpeaking) onStopSpeech() else onSpeakMessage(msg.text)
                                            }
                                        )
                                        Text("•", color = TextMuted, fontSize = 10.sp)
                                        Text(
                                            text = "📋 Copy",
                                            color = TextSecondary,
                                            fontSize = 10.sp,
                                            modifier = Modifier.clickable {
                                                val cb = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                                cb.setPrimaryClip(ClipData.newPlainText("Ramya AI", msg.text))
                                                Toast.makeText(context, "Copied to clipboard", Toast.LENGTH_SHORT).show()
                                            }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(6.dp))

        // Center Voice Orb & Equalizers
        Column(
            modifier = Modifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            AssistantOrb(
                state = orbVisualState,
                rmsDecibels = rmsDecibels,
                onClick = onOrbClick,
                modifier = Modifier.size(76.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Audio-reactive Equalizer waveform bars
            Row(
                horizontalArrangement = Arrangement.spacedBy(3.dp),
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.height(20.dp)
            ) {
                val barHeights = listOf(8, 14, 20, 12, 18, 10, 16, 7, 13)
                barHeights.forEachIndexed { i, baseH ->
                    val barScale by rememberInfiniteTransition(label = "eq_$i").animateFloat(
                        initialValue = 0.35f,
                        targetValue = if (orbVisualState == OrbVisualState.SPEAKING) 1.0f else if (orbVisualState == OrbVisualState.THINKING) 0.8f else 0.45f,
                        animationSpec = infiniteRepeatable(
                            animation = tween(380 + (i * 85), easing = FastOutSlowInEasing),
                            repeatMode = RepeatMode.Reverse
                        ),
                        label = "barH_$i"
                    )

                    val effectiveHeight = if (orbVisualState == OrbVisualState.LISTENING) {
                        ((baseH * 0.4f) + (rmsDecibels * (i % 3 + 1) * 1.4f)).coerceIn(5f, 20f)
                    } else {
                        baseH * barScale
                    }

                    Box(
                        modifier = Modifier
                            .width(3.dp)
                            .height(effectiveHeight.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(
                                when (orbVisualState) {
                                    OrbVisualState.LISTENING -> NeonPink
                                    OrbVisualState.SPEAKING -> NeonViolet
                                    OrbVisualState.THINKING -> NeonAmber
                                    OrbVisualState.EXECUTING -> ElectricBlue
                                    OrbVisualState.ERROR -> Color(0xFFFF4D4D)
                                    else -> NeonCyan
                                }
                            )
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(6.dp))

        // Quick Suggestion Chips
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            val chips = listOf(
                "💬 Send Rahul a WhatsApp message saying I will arrive in ten minutes",
                "🎵 Play Naatu Naatu",
                "🔍 Find song with lyrics i'm in love with the shape of you",
                "⛅ Weather in Hyderabad",
                "📞 Call Rahul",
                "🗣️ Teach me English"
            )
            chips.forEach { chip ->
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(14.dp))
                        .background(CyberpunkCard)
                        .border(1.dp, CyberpunkCardBorder, RoundedCornerShape(14.dp))
                        .clickable { onQuickChipClick(chip) }
                        .padding(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Text(chip, color = TextPrimary, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
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
                Text(text = "\"$dailyPhrase\"", color = Color.White, fontSize = 17.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(8.dp))
                Text(text = "Telugu Meaning: 'దయచేసి నాకు ఇందులో సహాయం చేయగలరా?'", color = NeonCyan, fontSize = 14.sp)
                Spacer(modifier = Modifier.height(12.dp))
                Text(text = "Pronunciation: 'kud-yoo-pleez-help-mee-with-this'", color = TextSecondary, fontSize = 12.sp)

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
    }
}

@Composable
fun AccountAndCloudTab(
    context: Context,
    userProfile: String,
    serviceActive: Boolean,
    onToggleService: (Boolean) -> Unit,
    onOpenAuth: () -> Unit,
    onOpenProfile: () -> Unit,
    onOpenConnections: () -> Unit,
    onOpenSettings: () -> Unit
) {
    val isSignedIn = CloudManager.isUserSignedIn()

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
                    Column(modifier = Modifier.weight(1f)) {
                        Text(userProfile, color = Color.White, fontSize = 15.sp, fontWeight = FontWeight.Bold)
                        Text(
                            if (isSignedIn) "Firebase & Google Authenticated (${CloudManager.getUserEmail()})" else "Guest Mode (Protected)",
                            color = TextSecondary,
                            fontSize = 11.sp
                        )
                    }
                    Button(
                        onClick = {
                            if (isSignedIn) onOpenProfile() else onOpenAuth()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = CyberpunkSurface),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.border(
                            1.dp,
                            if (isSignedIn) NeonGreen.copy(alpha = 0.6f) else NeonCyan.copy(alpha = 0.5f),
                            RoundedCornerShape(8.dp)
                        )
                    ) {
                        Text(
                            if (isSignedIn) "Manage Account" else "Sign In with Google",
                            color = if (isSignedIn) NeonGreen else NeonCyan,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // AI Connections Card
        Card(
            colors = CardDefaults.cardColors(containerColor = CyberpunkCard),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, ElectricBlue.copy(alpha = 0.35f), RoundedCornerShape(14.dp))
                .clickable { onOpenConnections() }
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("⚡ AI Connections & Providers", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    Text("Inspect status of Gemini, OpenRouter, Weather & RAG", color = TextSecondary, fontSize = 11.sp)
                }
                Text("›", color = ElectricBlue, fontSize = 20.sp, fontWeight = FontWeight.Bold)
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Settings & Privacy Card
        Card(
            colors = CardDefaults.cardColors(containerColor = CyberpunkCard),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, NeonViolet.copy(alpha = 0.35f), RoundedCornerShape(14.dp))
                .clickable { onOpenSettings() }
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("⚙️ Settings, Documents & Privacy", color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    Text("Upload RAG knowledge files, wake-word & retention", color = TextSecondary, fontSize = 11.sp)
                }
                Text("›", color = NeonViolet, fontSize = 20.sp, fontWeight = FontWeight.Bold)
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
