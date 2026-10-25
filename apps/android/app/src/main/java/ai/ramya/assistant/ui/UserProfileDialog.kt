package ai.ramya.assistant.ui

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import coil.compose.AsyncImage
import ai.ramya.assistant.data.CloudManager
import ai.ramya.assistant.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun UserProfileDialog(
    onDismiss: () -> Unit,
    onSignOut: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val currentUser = CloudManager.getCurrentUser()

    var showDeleteConfirm by remember { mutableStateOf(false) }
    var isDeleting by remember { mutableStateOf(false) }
    var isSyncing by remember { mutableStateOf(false) }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            colors = CardDefaults.cardColors(containerColor = CyberpunkCard),
            shape = RoundedCornerShape(20.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.5.dp, NeonCyan.copy(alpha = 0.6f), RoundedCornerShape(20.dp))
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(22.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "ACCOUNT & PROFILE",
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

                Spacer(modifier = Modifier.height(18.dp))

                // Profile Photo with AsyncImage & Fallback Initials
                val photoUrl = CloudManager.getUserPhotoUrl()
                val displayName = CloudManager.getUserDisplayName()
                val email = CloudManager.getUserEmail()

                Box(
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape)
                        .background(Brush.radialGradient(listOf(ElectricBlue, NeonCyan)))
                        .border(2.dp, NeonCyan, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    if (!photoUrl.isNullOrBlank()) {
                        AsyncImage(
                            model = photoUrl,
                            contentDescription = "Profile Photo",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                    } else {
                        Text(
                            text = displayName.take(1).uppercase(),
                            color = Color.Black,
                            fontSize = 28.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = displayName,
                    color = Color.White,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold
                )

                Text(
                    text = email,
                    color = TextSecondary,
                    fontSize = 12.sp
                )

                Spacer(modifier = Modifier.height(6.dp))

                val isGuest = currentUser == null || currentUser.isAnonymous
                val providerLabel = if (isGuest) "Guest Mode" else (currentUser?.providerData?.firstOrNull()?.providerId ?: "Firebase Auth")

                Box(
                    modifier = Modifier
                        .background(if (isGuest) NeonAmber.copy(alpha = 0.2f) else NeonGreen.copy(alpha = 0.2f), RoundedCornerShape(12.dp))
                        .border(1.dp, if (isGuest) NeonAmber.copy(alpha = 0.5f) else NeonGreen.copy(alpha = 0.5f), RoundedCornerShape(12.dp))
                        .padding(horizontal = 10.dp, vertical = 3.dp)
                ) {
                    Text(
                        text = "● $providerLabel",
                        color = if (isGuest) NeonAmber else NeonGreen,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                Spacer(modifier = Modifier.height(8.dp))

                currentUser?.uid?.let { uid ->
                    Text(
                        text = "UID: ${uid.take(14)}...",
                        color = TextMuted,
                        fontSize = 10.sp
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                // Sync Profile Button
                Button(
                    onClick = {
                        isSyncing = true
                        coroutineScope.launch {
                            currentUser?.let { CloudManager.saveUserProfile(it) }
                            isSyncing = false
                            Toast.makeText(context, "Profile cloud sync verified!", Toast.LENGTH_SHORT).show()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = CyberpunkSurface),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, NeonCyan.copy(alpha = 0.4f), RoundedCornerShape(10.dp)),
                    enabled = !isSyncing
                ) {
                    if (isSyncing) {
                        CircularProgressIndicator(color = NeonCyan, modifier = Modifier.size(18.dp), strokeWidth = 2.dp)
                    } else {
                        Text("☁️ Sync Cloud Profile", color = NeonCyan, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Sign Out Button
                Button(
                    onClick = {
                        CloudManager.signOut()
                        Toast.makeText(context, "Signed out successfully", Toast.LENGTH_SHORT).show()
                        onSignOut()
                        onDismiss()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = CyberpunkSurface),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .border(1.dp, CyberpunkCardBorder, RoundedCornerShape(10.dp))
                ) {
                    Text("Sign Out", color = TextPrimary, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Delete Account
                if (!showDeleteConfirm) {
                    Text(
                        text = "Delete Account & Data",
                        color = NeonPink.copy(alpha = 0.8f),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.clickable { showDeleteConfirm = true }
                    )
                } else {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF2E1218)),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, NeonPink, RoundedCornerShape(10.dp))
                    ) {
                        Column(
                            modifier = Modifier.padding(12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "⚠️ Permanently delete account and all cloud conversations?",
                                color = NeonPink,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedButton(
                                    onClick = { showDeleteConfirm = false },
                                    shape = RoundedCornerShape(6.dp),
                                    modifier = Modifier.weight(1f)
                                ) {
                                    Text("Cancel", color = TextMuted, fontSize = 10.sp)
                                }
                                Button(
                                    onClick = {
                                        isDeleting = true
                                        coroutineScope.launch {
                                            val res = CloudManager.deleteAccount()
                                            isDeleting = false
                                            res.onSuccess {
                                                Toast.makeText(context, "Account permanently deleted", Toast.LENGTH_LONG).show()
                                                onSignOut()
                                                onDismiss()
                                            }.onFailure { e ->
                                                Toast.makeText(context, "Delete error: ${e.message}", Toast.LENGTH_LONG).show()
                                            }
                                        }
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = NeonPink),
                                    shape = RoundedCornerShape(6.dp),
                                    modifier = Modifier.weight(1f),
                                    enabled = !isDeleting
                                ) {
                                    Text("Confirm", color = Color.Black, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
