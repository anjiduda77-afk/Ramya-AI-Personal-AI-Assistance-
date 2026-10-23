package ai.ramya.assistant

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ai.ramya.assistant.intents.AppLauncherIntent
import ai.ramya.assistant.intents.DialerIntent
import ai.ramya.assistant.service.RamyaVoiceForegroundService
import ai.ramya.assistant.ui.screens.PermissionOnboardingScreen
import ai.ramya.assistant.ui.theme.*

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            RamyaAITheme {
                var showOnboarding by remember { mutableStateOf(false) }

                if (showOnboarding) {
                    PermissionOnboardingScreen(onProceed = { showOnboarding = false })
                } else {
                    AndroidCommandCenter(onOpenPermissions = { showOnboarding = true })
                }
            }
        }
    }
}

@Composable
fun AndroidCommandCenter(onOpenPermissions: () -> Unit) {
    val context = LocalContext.current
    var isListening by remember { mutableStateOf(false) }
    var transcript by remember { mutableStateOf("Tap the Orb or say 'Hey Ramya' to speak...") }
    var assistantResponse by remember { mutableStateOf("Ramya AI is online and ready for your commands.") }
    var serviceActive by remember { mutableStateOf(false) }

    // Pulsing Orb Animation
    val infiniteTransition = rememberInfiniteTransition(label = "orbPulse")
    val scale by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = if (isListening) 1.25f else 1.08f,
        animationSpec = infiniteRepeatable(
            animation = tween(if (isListening) 600 else 1800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(CyberpunkBackground)
            .padding(20.dp)
            .verticalScroll(rememberScrollState()),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Header
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "RAMYA AI",
                    color = NeonCyan,
                    fontSize = 22.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 1.5.sp
                )
                Text(
                    text = "MOBILE COMMAND CENTER",
                    color = TextSecondary,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
            TextButton(onClick = onOpenPermissions) {
                Text("PERMISSIONS", color = NeonCyan, fontSize = 11.sp)
            }
        }

        Spacer(modifier = Modifier.height(28.dp))

        // Central Interactive Orb
        Box(
            modifier = Modifier
                .size(160.dp)
                .scale(scale)
                .background(
                    brush = Brush.radialGradient(
                        colors = if (isListening) {
                            listOf(NeonCyan, ElectricBlue, Color.Transparent)
                        } else {
                            listOf(NeonViolet, ElectricBlue, Color.Transparent)
                        }
                    ),
                    shape = CircleShape
                )
                .border(2.dp, if (isListening) NeonCyan else NeonViolet, CircleShape)
                .clickable {
                    isListening = !isListening
                    if (isListening) {
                        transcript = "Listening for Indian English voice command..."
                    } else {
                        transcript = "Processing speech command..."
                        assistantResponse = "Weather in Hyderabad: 28°C, Clear sky. All tasks synced."
                    }
                },
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = if (isListening) "LISTENING" else "RAMYA",
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp
            )
        }

        Spacer(modifier = Modifier.height(28.dp))

        // Live Transcript Card
        Card(
            colors = CardDefaults.cardColors(containerColor = CyberpunkCard),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, ElectricBlue.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("LIVE SPEECH TRANSCRIPTION", color = NeonCyan, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(6.dp))
                Text(transcript, color = TextPrimary, fontSize = 14.sp)
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Assistant Response Card
        Card(
            colors = CardDefaults.cardColors(containerColor = CyberpunkSurface),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.dp, NeonViolet.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text("ASSISTANT RESPONSE", color = NeonViolet, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(6.dp))
                Text(assistantResponse, color = TextPrimary, fontSize = 14.sp)
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Quick Platform Actions
        Text(
            text = "QUICK PLATFORM ACTIONS",
            color = TextSecondary,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.align(Alignment.Start)
        )
        Spacer(modifier = Modifier.height(10.dp))

        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Button(
                onClick = { AppLauncherIntent.launchApp(context, "chrome") },
                colors = ButtonDefaults.buttonColors(containerColor = CyberpunkCard),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.weight(1f)
            ) {
                Text("Chrome", color = NeonCyan, fontSize = 12.sp)
            }
            Button(
                onClick = { AppLauncherIntent.launchApp(context, "youtube") },
                colors = ButtonDefaults.buttonColors(containerColor = CyberpunkCard),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.weight(1f)
            ) {
                Text("YouTube", color = NeonCyan, fontSize = 12.sp)
            }
            Button(
                onClick = { DialerIntent.openDialer(context, "") },
                colors = ButtonDefaults.buttonColors(containerColor = CyberpunkCard),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.weight(1f)
            ) {
                Text("Dialer", color = NeonCyan, fontSize = 12.sp)
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Foreground Service Toggle
        Card(
            colors = CardDefaults.cardColors(containerColor = CyberpunkCard),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Background Listening Service", color = TextPrimary, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                    Text(
                        if (serviceActive) "Active (Notification visible)" else "Inactive",
                        color = if (serviceActive) NeonGreen else TextSecondary,
                        fontSize = 12.sp
                    )
                }
                Switch(
                    checked = serviceActive,
                    onCheckedChange = { active ->
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
}
