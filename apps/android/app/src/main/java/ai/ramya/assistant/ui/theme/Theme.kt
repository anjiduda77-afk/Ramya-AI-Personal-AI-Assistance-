package ai.ramya.assistant.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

// Cyberpunk Neon Command Center Palette — Rich & Premium
val CyberpunkBackground = Color(0xFF06090F)
val CyberpunkSurface = Color(0xFF0C121E)
val CyberpunkCard = Color(0xFF111A2C)
val CyberpunkCardBorder = Color(0xFF1E2D4A)
val CyberpunkInputBg = Color(0xFF080D17)

val NeonCyan = Color(0xFF00F0FF)
val ElectricBlue = Color(0xFF0070F3)
val NeonViolet = Color(0xFF7928CA)
val NeonPink = Color(0xFFFF007F)
val NeonGreen = Color(0xFF00FF88)
val NeonAmber = Color(0xFFFFB800)

val TextPrimary = Color(0xFFF1F5F9)
val TextSecondary = Color(0xFF94A3B8)
val TextMuted = Color(0xFF64748B)

// Glowing Gradients
val OrbCyanGradient = Brush.radialGradient(
    listOf(Color(0xFF00F0FF), Color(0xFF0284C7), Color(0xFF0369A1), Color.Transparent)
)

val OrbListeningGradient = Brush.radialGradient(
    listOf(Color(0xFFFF007F), Color(0xFF7928CA), Color(0xFF0070F3), Color.Transparent)
)

val CardBorderGradient = Brush.horizontalGradient(
    listOf(NeonCyan.copy(alpha = 0.5f), NeonViolet.copy(alpha = 0.3f), Color.Transparent)
)

val HeaderGradient = Brush.horizontalGradient(
    listOf(NeonCyan, ElectricBlue, NeonViolet)
)

private val DarkColorScheme = darkColorScheme(
    primary = NeonCyan,
    secondary = ElectricBlue,
    tertiary = NeonViolet,
    background = CyberpunkBackground,
    surface = CyberpunkSurface,
    onPrimary = Color.Black,
    onSecondary = Color.White,
    onTertiary = Color.White,
    onBackground = TextPrimary,
    onSurface = TextPrimary
)

@Composable
fun RamyaAITheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        content = content
    )
}
