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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import ai.ramya.assistant.data.ConversationMetadata
import ai.ramya.assistant.data.ConversationRepository
import ai.ramya.assistant.ui.theme.*
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun ChatHistoryDrawer(
    activeChatId: String,
    onSelectChat: (String) -> Unit,
    onNewChat: () -> Unit,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    var searchQuery by remember { mutableStateOf("") }
    var conversations by remember { mutableStateOf<List<ConversationMetadata>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }

    var editingChatId by remember { mutableStateOf<String?>(null) }
    var editingTitleText by remember { mutableStateOf("") }

    var deletingChatId by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        conversations = ConversationRepository.fetchConversations(context)
        isLoading = false
    }

    val filteredList = remember(conversations, searchQuery) {
        if (searchQuery.isBlank()) conversations
        else conversations.filter { it.title.contains(searchQuery, ignoreCase = true) }
    }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            colors = CardDefaults.cardColors(containerColor = CyberpunkCard),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.85f)
                .border(1.5.dp, NeonCyan.copy(alpha = 0.5f), RoundedCornerShape(20.dp))
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(18.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "CONVERSATION HISTORY",
                        color = NeonCyan,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 1.sp
                    )
                    Text(
                        text = "✕",
                        color = TextMuted,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.clickable { onDismiss() }
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                // New Chat Button
                Button(
                    onClick = {
                        onNewChat()
                        onDismiss()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = NeonCyan),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("➕ Start New Chat", color = Color.Black, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Search Bar
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Search previous chats...", color = TextMuted, fontSize = 12.sp) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = NeonCyan,
                        unfocusedBorderColor = CyberpunkCardBorder,
                        focusedTextColor = Color.White,
                        unfocusedTextColor = Color.White
                    )
                )

                Spacer(modifier = Modifier.height(12.dp))

                if (isLoading) {
                    Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = NeonCyan, strokeWidth = 2.dp)
                    }
                } else if (filteredList.isEmpty()) {
                    Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                        Text(
                            text = if (searchQuery.isNotBlank()) "No conversations match '$searchQuery'" else "No conversation history yet.\nTap 'Start New Chat' to begin!",
                            color = TextMuted,
                            fontSize = 12.sp,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(filteredList) { conv ->
                            val isActive = conv.id == activeChatId
                            val dateFormat = SimpleDateFormat("MMM d, h:mm a", Locale.getDefault())
                            val dateStr = dateFormat.format(Date(conv.updatedAt))

                            Card(
                                colors = CardDefaults.cardColors(
                                    containerColor = if (isActive) CyberpunkSurface else CyberpunkCard
                                ),
                                shape = RoundedCornerShape(12.dp),
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .border(
                                        1.dp,
                                        if (isActive) NeonCyan else CyberpunkCardBorder,
                                        RoundedCornerShape(12.dp)
                                    )
                                    .clickable {
                                        onSelectChat(conv.id)
                                        onDismiss()
                                    }
                            ) {
                                Column(modifier = Modifier.padding(12.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = conv.title,
                                            color = if (isActive) NeonCyan else Color.White,
                                            fontSize = 13.sp,
                                            fontWeight = FontWeight.Bold,
                                            maxLines = 1,
                                            modifier = Modifier.weight(1f)
                                        )

                                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                            // Rename Button
                                            Text(
                                                text = "✏️",
                                                fontSize = 12.sp,
                                                modifier = Modifier.clickable {
                                                    editingChatId = conv.id
                                                    editingTitleText = conv.title
                                                }
                                            )
                                            // Delete Button
                                            Text(
                                                text = "🗑️",
                                                fontSize = 12.sp,
                                                modifier = Modifier.clickable {
                                                    deletingChatId = conv.id
                                                }
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(4.dp))

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween
                                    ) {
                                        Text(dateStr, color = TextMuted, fontSize = 10.sp)
                                        Text("${conv.messageCount} messages", color = TextSecondary, fontSize = 10.sp)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // Rename Dialog
    editingChatId?.let { chatId ->
        Dialog(onDismissRequest = { editingChatId = null }) {
            Card(
                colors = CardDefaults.cardColors(containerColor = CyberpunkCard),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.padding(16.dp).border(1.dp, NeonCyan, RoundedCornerShape(14.dp))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Rename Conversation", color = NeonCyan, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedTextField(
                        value = editingTitleText,
                        onValueChange = { editingTitleText = it },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = NeonCyan,
                            unfocusedBorderColor = CyberpunkCardBorder,
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )
                    Spacer(modifier = Modifier.height(14.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(
                            onClick = { editingChatId = null },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Cancel", color = TextMuted, fontSize = 11.sp)
                        }
                        Button(
                            onClick = {
                                if (editingTitleText.isNotBlank()) {
                                    coroutineScope.launch {
                                        ConversationRepository.renameConversation(context, chatId, editingTitleText.trim())
                                        conversations = ConversationRepository.fetchConversations(context)
                                        editingChatId = null
                                    }
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = NeonCyan),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Save", color = Color.Black, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }

    // Delete Confirmation Dialog
    deletingChatId?.let { chatId ->
        Dialog(onDismissRequest = { deletingChatId = null }) {
            Card(
                colors = CardDefaults.cardColors(containerColor = CyberpunkCard),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.padding(16.dp).border(1.dp, NeonPink, RoundedCornerShape(14.dp))
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Delete Conversation?", color = NeonPink, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text("This conversation and its messages will be removed permanently.", color = TextSecondary, fontSize = 11.sp)
                    Spacer(modifier = Modifier.height(14.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(
                            onClick = { deletingChatId = null },
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Cancel", color = TextMuted, fontSize = 11.sp)
                        }
                        Button(
                            onClick = {
                                coroutineScope.launch {
                                    ConversationRepository.deleteConversation(context, chatId)
                                    conversations = ConversationRepository.fetchConversations(context)
                                    deletingChatId = null
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = NeonPink),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("Delete", color = Color.Black, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
