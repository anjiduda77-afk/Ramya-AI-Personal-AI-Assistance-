package ai.ramya.assistant.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import ai.ramya.assistant.ui.theme.*

/**
 * 7 Visual States for the Assistant Orb as required by Phase 6:
 * 1. IDLE: subtle breathing neon orb
 * 2. WAKE_DETECTED: radiant activation flare
 * 3. LISTENING: audio-reactive energy ring reflecting live RMS decibels
 * 4. THINKING: smooth dual-ring orbital rotation
 * 5. EXECUTING: progress sweep while a device action runs
 * 6. SPEAKING: animation fluttering to speech output
 * 7. ERROR: discreet warning state with clear recovery hint
 */
enum class OrbVisualState {
    IDLE,
    WAKE_DETECTED,
    LISTENING,
    THINKING,
    EXECUTING,
    SPEAKING,
    ERROR
}

@Composable
fun AssistantOrb(
    state: OrbVisualState,
    rmsDecibels: Float,
    reducedMotion: Boolean = false,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "orbMasterTransition")

    // 1. Idle & Speaking Breathing Pulse
    val breathingPulse by infiniteTransition.animateFloat(
        initialValue = 0.95f,
        targetValue = if (state == OrbVisualState.SPEAKING) 1.15f else 1.05f,
        animationSpec = infiniteRepeatable(
            animation = tween(
                durationMillis = if (state == OrbVisualState.SPEAKING) 600 else 2400,
                easing = FastOutSlowInEasing
            ),
            repeatMode = RepeatMode.Reverse
        ),
        label = "breathingPulse"
    )

    // 2. Thinking Rotation
    val thinkingRotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1800, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "thinkingRotation"
    )

    // 3. Executing Progress Sweep Angle
    val executingSweep by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1100, easing = FastOutLinearInEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "executingSweep"
    )

    // Audio-reactive scale when listening
    val dynamicAudioScale by animateFloatAsState(
        targetValue = if (state == OrbVisualState.LISTENING) {
            1.0f + (rmsDecibels.coerceIn(0f, 10f) * 0.035f)
        } else if (state == OrbVisualState.WAKE_DETECTED) {
            1.25f
        } else {
            breathingPulse
        },
        animationSpec = spring(stiffness = Spring.StiffnessMediumLow),
        label = "dynamicAudioScale"
    )

    // Dynamic Primary & Secondary Accent Colors
    val primaryColor by animateColorAsState(
        targetValue = when (state) {
            OrbVisualState.IDLE -> NeonCyan
            OrbVisualState.WAKE_DETECTED -> NeonPink
            OrbVisualState.LISTENING -> NeonPink
            OrbVisualState.THINKING -> NeonCyan
            OrbVisualState.EXECUTING -> ElectricBlue
            OrbVisualState.SPEAKING -> NeonViolet
            OrbVisualState.ERROR -> NeonAmber
        },
        animationSpec = tween(400),
        label = "orbPrimaryColor"
    )

    val secondaryColor by animateColorAsState(
        targetValue = when (state) {
            OrbVisualState.IDLE -> ElectricBlue
            OrbVisualState.WAKE_DETECTED -> NeonViolet
            OrbVisualState.LISTENING -> NeonViolet
            OrbVisualState.THINKING -> NeonAmber
            OrbVisualState.EXECUTING -> NeonGreen
            OrbVisualState.SPEAKING -> ElectricBlue
            OrbVisualState.ERROR -> Color(0xFFFF4D4D)
        },
        animationSpec = tween(400),
        label = "orbSecondaryColor"
    )

    val effectiveScale = if (reducedMotion) 1.0f else dynamicAudioScale

    Box(
        modifier = modifier
            .size(190.dp)
            .clickable { onClick() },
        contentAlignment = Alignment.Center
    ) {
        // LAYER 1: Outer Reactive Halo / Waveform Field
        Box(
            modifier = Modifier
                .size(185.dp)
                .scale(effectiveScale * 1.12f)
                .background(
                    color = primaryColor.copy(alpha = if (state == OrbVisualState.LISTENING) 0.55f else 0.22f),
                    shape = CircleShape
                )
        )

        // LAYER 2: Middle Rotating / Progress Ring
        Box(
            modifier = Modifier
                .size(145.dp)
                .scale(effectiveScale)
                .rotate(if (state == OrbVisualState.THINKING && !reducedMotion) thinkingRotation else if (state == OrbVisualState.EXECUTING) executingSweep else 0f)
                .background(
                    brush = Brush.sweepGradient(
                        listOf(primaryColor.copy(alpha = 0.85f), secondaryColor, Color.Transparent, primaryColor.copy(alpha = 0.85f))
                    ),
                    shape = CircleShape
                )
                .border(
                    width = if (state == OrbVisualState.THINKING || state == OrbVisualState.EXECUTING) 3.dp else 1.5.dp,
                    color = primaryColor.copy(alpha = 0.75f),
                    shape = CircleShape
                )
        )

        // LAYER 3: Core Glowing Orb
        Box(
            modifier = Modifier
                .size(105.dp)
                .background(
                    brush = Brush.radialGradient(
                        listOf(
                            Color.White.copy(alpha = 0.95f),
                            primaryColor,
                            secondaryColor
                        )
                    ),
                    shape = CircleShape
                )
                .border(2.dp, Color.White.copy(alpha = 0.6f), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = when (state) {
                        OrbVisualState.IDLE -> "RAMYA"
                        OrbVisualState.WAKE_DETECTED -> "WAKE"
                        OrbVisualState.LISTENING -> "LISTENING"
                        OrbVisualState.THINKING -> "THINKING"
                        OrbVisualState.EXECUTING -> "RUNNING"
                        OrbVisualState.SPEAKING -> "SPEAKING"
                        OrbVisualState.ERROR -> "ATTENTION"
                    },
                    color = Color.Black,
                    fontWeight = FontWeight.Black,
                    fontSize = 11.sp,
                    letterSpacing = 1.sp
                )
                Text(
                    text = when (state) {
                        OrbVisualState.IDLE -> "Tap to talk"
                        OrbVisualState.WAKE_DETECTED -> "Hey Ramya!"
                        OrbVisualState.LISTENING -> "Speak now"
                        OrbVisualState.THINKING -> "Analyzing..."
                        OrbVisualState.EXECUTING -> "Executing..."
                        OrbVisualState.SPEAKING -> "Tap to pause"
                        OrbVisualState.ERROR -> "Tap to retry"
                    },
                    color = Color.Black.copy(alpha = 0.8f),
                    fontSize = 9.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
