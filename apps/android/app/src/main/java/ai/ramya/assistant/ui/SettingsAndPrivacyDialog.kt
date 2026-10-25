package ai.ramya.assistant.ui

import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import ai.ramya.assistant.data.DocumentRagManager
import ai.ramya.assistant.data.KnowledgeDocument
import ai.ramya.assistant.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun SettingsAndPrivacyDialog(
    serviceActive: Boolean,
    onToggleService: (Boolean) -> Unit,
    onOpenProfile: () -> Unit,
    onOpenConnections: () -> Unit,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var documents by remember { mutableStateOf<List<KnowledgeDocument>>(emptyList()) }
    var isUploadingDoc by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        documents = DocumentRagManager.fetchDocuments(context)
    }

    // Document File Picker Launcher (TXT, PDF, MD, JSON, CSV)
    val documentPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            isUploadingDoc = true
            coroutineScope.launch {
                val fileName = uri.lastPathSegment?.substringAfterLast('/') ?: "document.txt"
                val mimeType = context.contentResolver.getType(uri) ?: "text/plain"
                val res = DocumentRagManager.indexDocumentFromUri(context, uri, fileName, mimeType)
                isUploadingDoc = false
                res.onSuccess { doc ->
                    Toast.makeText(context, "Indexed '${doc.name}' (${doc.chunkCount} chunks)!", Toast.LENGTH_SHORT).show()
                    documents = DocumentRagManager.fetchDocuments(context)
                }.onFailure { e ->
                    Toast.makeText(context, "Indexing failed: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            colors = CardDefaults.cardColors(containerColor = CyberpunkCard),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.88f)
                .border(1.5.dp, NeonViolet.copy(alpha = 0.5f), RoundedCornerShape(20.dp))
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
                            text = "SETTINGS & PRIVACY",
                            color = NeonViolet,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 1.sp
                        )
                        Text(
                            text = "Ramya AI v1.0.1 — Production Assistant",
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
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    // 1. Account & Profile Shortcut
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = CyberpunkSurface),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, CyberpunkCardBorder, RoundedCornerShape(12.dp))
                                .clickable {
                                    onDismiss()
                                    onOpenProfile()
                                }
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text("👤 User Profile & Account", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                    Text("Google Sign-In, sync & account deletion", color = TextSecondary, fontSize = 11.sp)
                                }
                                Text("›", color = NeonCyan, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    // 2. AI Connections Shortcut
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = CyberpunkSurface),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, CyberpunkCardBorder, RoundedCornerShape(12.dp))
                                .clickable {
                                    onDismiss()
                                    onOpenConnections()
                                }
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(14.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text("⚡ AI Connections & Tools", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                    Text("Gemini, OpenRouter, WhatsApp & Weather pings", color = TextSecondary, fontSize = 11.sp)
                                }
                                Text("›", color = ElectricBlue, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    // 3. Wake Word & Voice Service
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = CyberpunkSurface),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, if (serviceActive) NeonGreen.copy(alpha = 0.5f) else CyberpunkCardBorder, RoundedCornerShape(12.dp))
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text("🎙️ 'Hey Ramya' Background Wake Word", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                        Text(
                                            if (serviceActive) "● Active in Background with Notification" else "○ Standby Mode (Conserves battery)",
                                            color = if (serviceActive) NeonGreen else TextSecondary,
                                            fontSize = 11.sp
                                        )
                                    }
                                    Switch(checked = serviceActive, onCheckedChange = onToggleService)
                                }
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    "Foreground service complies with Android 14+ background execution policies. Wake detector pauses automatically during speech playback.",
                                    color = TextMuted,
                                    fontSize = 10.sp,
                                    lineHeight = 14.sp
                                )
                            }
                        }
                    }

                    // 4. Document RAG Knowledge Base Management
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = CyberpunkSurface),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, CyberpunkCardBorder, RoundedCornerShape(12.dp))
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text("📚 Document RAG Knowledge Base", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                    Button(
                                        onClick = { documentPickerLauncher.launch("*/*") },
                                        colors = ButtonDefaults.buttonColors(containerColor = NeonViolet),
                                        shape = RoundedCornerShape(8.dp),
                                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                                        modifier = Modifier.height(30.dp),
                                        enabled = !isUploadingDoc
                                    ) {
                                        if (isUploadingDoc) {
                                            CircularProgressIndicator(color = Color.White, modifier = Modifier.size(14.dp), strokeWidth = 2.dp)
                                        } else {
                                            Text("➕ Upload", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }

                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    "Uploaded documents are chunked and indexed securely. Ramya cites sources whenever an answer draws from your documents.",
                                    color = TextSecondary,
                                    fontSize = 11.sp,
                                    lineHeight = 15.sp
                                )

                                if (documents.isNotEmpty()) {
                                    Spacer(modifier = Modifier.height(10.dp))
                                    HorizontalDivider(color = CyberpunkCardBorder)
                                    Spacer(modifier = Modifier.height(10.dp))

                                    documents.forEach { doc ->
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(vertical = 4.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(doc.name, color = NeonCyan, fontSize = 12.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                                                Text("${doc.chunkCount} chunks • ${doc.sizeBytes / 1024} KB", color = TextMuted, fontSize = 10.sp)
                                            }
                                            Text(
                                                text = "🗑️",
                                                fontSize = 12.sp,
                                                modifier = Modifier.clickable {
                                                    coroutineScope.launch {
                                                        DocumentRagManager.deleteDocument(context, doc.id)
                                                        documents = DocumentRagManager.fetchDocuments(context)
                                                        Toast.makeText(context, "Deleted '${doc.name}'", Toast.LENGTH_SHORT).show()
                                                    }
                                                }
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // 5. Privacy & Storage Explanation
                    item {
                        Card(
                            colors = CardDefaults.cardColors(containerColor = CyberpunkSurface),
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier
                                .fillMaxWidth()
                                .border(1.dp, CyberpunkCardBorder, RoundedCornerShape(12.dp))
                        ) {
                            Column(modifier = Modifier.padding(14.dp)) {
                                Text("🔒 Privacy & Data Retention Policy", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    "• Audio recordings are never retained or uploaded to cloud storage.\n" +
                                    "• Conversations are stored in your private Firestore partition (/users/{uid}/conversations) protected by security rules.\n" +
                                    "• WhatsApp automation uses official Android Intent dispatch and always requires your confirmation.\n" +
                                    "• You can permanently purge all data at any time via Account & Profile.",
                                    color = TextSecondary,
                                    fontSize = 10.sp,
                                    lineHeight = 15.sp
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
