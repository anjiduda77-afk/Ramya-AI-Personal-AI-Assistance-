package ai.ramya.assistant.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Cyberpunk Neon Command Center Palette
val CyberpunkBackground = Color(0xFF07090E)
val CyberpunkSurface = Color(0xFF0D121D)
val CyberpunkCard = Color(0xFF131A29)
val NeonCyan = Color(0xFF00F0FF)
val ElectricBlue = Color(0xFF0070F3)
val NeonViolet = Color(0xFF7928CA)
val NeonGreen = Color(0xFF00FF66)
val TextPrimary = Color(0xFFE2E8F0)
val TextSecondary = Color(0xFF94A3B8)

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
