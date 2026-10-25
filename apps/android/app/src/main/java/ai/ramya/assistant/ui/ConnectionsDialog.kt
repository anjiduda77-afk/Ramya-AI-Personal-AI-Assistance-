package ai.ramya.assistant.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import ai.ramya.assistant.data.CloudManager
import ai.ramya.assistant.ui.theme.*
import kotlinx.coroutines.launch

data class IntegrationItem(
    val key: String,
    val name: String,
    val icon: String,
    val description: String,
    val defaultStatus: String,
    val isCloud: Boolean = true
)

@Composable
fun ConnectionsDialog(
    onDismiss: () -> Unit
) {
    val coroutineScope = rememberCoroutineScope()

    val integrations = listOf(
        IntegrationItem("firestore", "Firebase Cloud Firestore", "🔥", "Primary cloud database (ramya-ai-b22e4) for users, chats & RAG documents", "Connected"),
        IntegrationItem("supabase", "Supabase Database & Auth", "⚡", "Secondary cloud database & secure storage mirror", "Ready"),
        IntegrationItem("gemini", "Google Gemini 3.5 Flash", "✨", "Flagship multi-modal reasoning engine for deep intelligence", "Active"),
        IntegrationItem("openrouter", "OpenRouter / GPT-4o Mini", "🧠", "Sub-second cloud reasoning with DeepSeek fallback", "Configured"),
        IntegrationItem("ollama", "Local AI (Ollama Offline)", "🦙", "Offline-first gemma3:4b daemon on 127.0.0.1:11434", "Offline"),
        IntegrationItem("weather", "Live Weather Telemetry", "⛅", "Real-time forecast for Hyderabad and India via Open-Meteo", "Online"),
        IntegrationItem("rag", "Document Knowledge Base RAG", "📄", "Local sliding-window chunk index with source citations", "Active"),
        IntegrationItem("whatsapp", "WhatsApp Mobile Messaging", "💬", "Click-to-chat intent dispatch with recipient disambiguation", "Integrated"),
        IntegrationItem("music", "Music Assistant & Media", "🎵", "Spotify, YouTube Music & MediaSession playback controls", "Enabled")
    )

    val testResults = remember { mutableStateMapOf<String, Pair<Boolean, String>>() }
    val testingKeys = remember { mutableStateMapOf<String, Boolean>() }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            colors = CardDefaults.cardColors(containerColor = CyberpunkCard),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.85f)
                .border(1.5.dp, ElectricBlue.copy(alpha = 0.5f), RoundedCornerShape(20.dp))
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(20.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "AI CONNECTIONS & SERVICES",
                            color = ElectricBlue,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 1.sp
                        )
                        Text(
                            text = "Active multi-provider routing & hardware tools",
                            color = TextSecondary,
                            fontSize = 11.sp
                        )
                    }
                    Text(
                        text = "✕",
                        color = TextMuted,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.clickable { onDismiss() }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(integrations) { item ->
                        val result = testResults[item.key]
                        val isTesting = testingKeys[item.key] == true

                        Card(
                            colors = CardDefaults.cardColors(containerColor = CyberpunkSurface),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, CyberpunkCardBorder, RoundedCornerShape(12.dp))
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(item.icon, fontSize = 16.sp)
                                        Spacer(modifier = Modifier.width(8.dp))
                                        Text(
                                            text = item.name,
                                            color = Color.White,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }

                                    // Status Badge
                                    val statusColor = when {
                                        result?.first == true -> NeonGreen
                                        result?.first == false -> NeonPink
                                        item.defaultStatus in listOf("Connected", "Active", "Online", "Integrated", "Enabled") -> NeonGreen
                                        else -> NeonAmber
                                    }
                                    val statusText = result?.second ?: item.defaultStatus

                                    Box(
                                        modifier = Modifier
                                            .background(statusColor.copy(alpha = 0.15f), RoundedCornerShape(8.dp))
                                            .border(1.dp, statusColor.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
                                            .padding(horizontal = 8.dp, vertical = 2.dp)
                                    ) {
                                        Text(
                                            text = statusText.take(24),
                                            color = statusColor,
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(4.dp))
                                Text(item.description, color = TextSecondary, fontSize = 11.sp, lineHeight = 15.sp)

                                Spacer(modifier = Modifier.height(8.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.End
                                ) {
                                    OutlinedButton(
                                        onClick = {
                                            testingKeys[item.key] = true
                                            coroutineScope.launch {
                                                val res = CloudManager.testProvider(item.key)
                                                testResults[item.key] = res
                                                testingKeys[item.key] = false
                                            }
                                        },
                                        shape = RoundedCornerShape(6.dp),
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 2.dp),
                                        modifier = Modifier.height(28.dp),
                                        enabled = !isTesting
                                    ) {
                                        if (isTesting) {
                                            CircularProgressIndicator(color = NeonCyan, modifier = Modifier.size(12.dp), strokeWidth = 1.5.dp)
                                        } else {
                                            Text("⚡ Test Connection", color = NeonCyan, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
