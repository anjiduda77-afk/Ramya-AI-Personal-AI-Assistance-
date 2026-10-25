package ai.ramya.assistant.ui

import android.app.Activity
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import ai.ramya.assistant.data.CloudManager
import ai.ramya.assistant.data.GoogleAuthManager
import ai.ramya.assistant.ui.theme.*
import kotlinx.coroutines.launch

@Composable
fun FirebaseAuthDialog(
    onDismiss: () -> Unit,
    onAuthSuccess: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    val currentUser = CloudManager.getCurrentUser()
    val isRealUser = currentUser != null && !currentUser.isAnonymous

    var isSignUpMode by remember { mutableStateOf(false) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var displayName by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            colors = CardDefaults.cardColors(containerColor = CyberpunkCard),
            shape = RoundedCornerShape(18.dp),
            modifier = Modifier
                .fillMaxWidth()
                .border(1.5.dp, NeonCyan.copy(alpha = 0.6f), RoundedCornerShape(18.dp))
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Header with Brand Logo
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(24.dp)
                                .background(NeonCyan, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("R", color = Color.Black, fontSize = 13.sp, fontWeight = FontWeight.Black)
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (isRealUser) "FIREBASE ACCOUNT" else if (isSignUpMode) "CREATE ACCOUNT" else "RAMYA AI SIGN IN",
                            color = NeonCyan,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 1.sp
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

                Spacer(modifier = Modifier.height(14.dp))

                if (isRealUser && currentUser != null) {
                    // Profile Info Screen when already signed in
                    Box(
                        modifier = Modifier
                            .size(60.dp)
                            .background(ElectricBlue.copy(alpha = 0.2f), CircleShape)
                            .border(2.dp, NeonCyan, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = (currentUser.displayName?.take(1) ?: currentUser.email?.take(1) ?: "U").uppercase(),
                            color = NeonCyan,
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Black
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = currentUser.displayName ?: "Ramya User",
                        color = Color.White,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = currentUser.email ?: "Firebase Authenticated",
                        color = TextSecondary,
                        fontSize = 12.sp
                    )

                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "UID: ${currentUser.uid.take(12)}...",
                        color = TextMuted,
                        fontSize = 10.sp
                    )

                    Spacer(modifier = Modifier.height(18.dp))

                    Button(
                        onClick = {
                            coroutineScope.launch {
                                CloudManager.saveUserProfile(currentUser)
                                Toast.makeText(context, "Cloud profile synced with Firestore!", Toast.LENGTH_SHORT).show()
                                onDismiss()
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = CyberpunkSurface),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, NeonCyan.copy(alpha = 0.5f), RoundedCornerShape(10.dp))
                    ) {
                        Text("☁️ Sync Cloud Profile", color = NeonCyan, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    Button(
                        onClick = {
                            CloudManager.signOut()
                            Toast.makeText(context, "Signed out successfully", Toast.LENGTH_SHORT).show()
                            onAuthSuccess()
                            onDismiss()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF3B1E28)),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .border(1.dp, NeonPink.copy(alpha = 0.5f), RoundedCornerShape(10.dp))
                    ) {
                        Text("Sign Out", color = NeonPink, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                } else {
                    // Sign In / Sign Up Form
                    Text(
                        text = if (isSignUpMode) "Create an account to sync your voice chats, documents & preferences" else "Sign in to access your personal AI assistant profile",
                        color = TextSecondary,
                        fontSize = 12.sp
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    // 1. CONTINUE WITH GOOGLE BUTTON (ANDROID CREDENTIAL MANAGER)
                    Button(
                        onClick = {
                            val activity = context as? Activity
                            if (activity == null) {
                                errorMessage = "Unable to resolve active activity for Google Sign-In"
                                return@Button
                            }
                            isLoading = true
                            errorMessage = null
                            coroutineScope.launch {
                                val res = GoogleAuthManager.signInWithGoogle(activity)
                                isLoading = false
                                res.onSuccess { user ->
                                    if (user != null) {
                                        Toast.makeText(context, "Welcome, ${user.displayName ?: "User"}!", Toast.LENGTH_SHORT).show()
                                        onAuthSuccess()
                                        onDismiss()
                                    }
                                }.onFailure { e ->
                                    errorMessage = e.localizedMessage ?: "Google Sign-In failed"
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = Color.White),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(44.dp),
                        enabled = !isLoading
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("G", color = Color(0xFF4285F4), fontSize = 17.sp, fontWeight = FontWeight.Black)
                            Spacer(modifier = Modifier.width(10.dp))
                            Text("Continue with Google", color = Color.Black, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        HorizontalDivider(modifier = Modifier.weight(1f), color = CyberpunkCardBorder)
                        Text("  OR EMAIL  ", color = TextMuted, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                        HorizontalDivider(modifier = Modifier.weight(1f), color = CyberpunkCardBorder)
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    if (isSignUpMode) {
                        OutlinedTextField(
                            value = displayName,
                            onValueChange = { displayName = it },
                            label = { Text("Display Name", color = TextMuted) },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = NeonCyan,
                                unfocusedBorderColor = CyberpunkCardBorder,
                                focusedTextColor = Color.White,
                                unfocusedTextColor = Color.White
                            )
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it },
                        label = { Text("Email Address", color = TextMuted) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = NeonCyan,
                            unfocusedBorderColor = CyberpunkCardBorder,
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it },
                        label = { Text("Password", color = TextMuted) },
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = NeonCyan,
                            unfocusedBorderColor = CyberpunkCardBorder,
                            focusedTextColor = Color.White,
                            unfocusedTextColor = Color.White
                        )
                    )

                    errorMessage?.let {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(it, color = NeonAmber, fontSize = 11.sp)
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Button(
                        onClick = {
                            if (email.isBlank() || password.isBlank()) {
                                errorMessage = "Please enter email and password"
                                return@Button
                            }
                            isLoading = true
                            errorMessage = null
                            coroutineScope.launch {
                                val result = if (isSignUpMode) {
                                    CloudManager.signUpWithEmailPassword(email, password, displayName)
                                } else {
                                    CloudManager.signInWithEmailPassword(email, password)
                                }
                                isLoading = false
                                result.onSuccess {
                                    Toast.makeText(context, "Authenticated successfully!", Toast.LENGTH_SHORT).show()
                                    onAuthSuccess()
                                    onDismiss()
                                }.onFailure { e ->
                                    errorMessage = e.localizedMessage ?: "Authentication failed"
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = NeonCyan),
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth(),
                        enabled = !isLoading
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(color = Color.Black, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                        } else {
                            Text(
                                text = if (isSignUpMode) "Create Account" else "Sign In with Email",
                                color = Color.Black,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Mode switch toggle
                    Text(
                        text = if (isSignUpMode) "Already have an account? Sign In" else "Don't have an account? Create one",
                        color = ElectricBlue,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.clickable {
                            isSignUpMode = !isSignUpMode
                            errorMessage = null
                        }
                    )

                    Spacer(modifier = Modifier.height(12.dp))
                    HorizontalDivider(color = CyberpunkCardBorder)
                    Spacer(modifier = Modifier.height(10.dp))

                    // Quick Guest Sign In
                    OutlinedButton(
                        onClick = {
                            isLoading = true
                            errorMessage = null
                            coroutineScope.launch {
                                val res = CloudManager.signInGuest()
                                isLoading = false
                                res.onSuccess {
                                    Toast.makeText(context, "Signed in as Guest", Toast.LENGTH_SHORT).show()
                                    onAuthSuccess()
                                    onDismiss()
                                }.onFailure { e ->
                                    errorMessage = e.localizedMessage ?: "Guest sign in failed"
                                }
                            }
                        },
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("Continue as Anonymous Guest", color = TextSecondary, fontSize = 12.sp)
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Protected by Firebase Auth & Android Credential Manager",
                        color = TextMuted,
                        fontSize = 9.sp
                    )
                }
            }
        }
    }
}
