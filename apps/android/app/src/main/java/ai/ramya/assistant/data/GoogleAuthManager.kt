package ai.ramya.assistant.data

import android.app.Activity
import android.content.Context
import android.util.Log
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.FirebaseUser
import ai.ramya.assistant.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Modern Google Sign-In Manager using Android Credential Manager API
 * (androidx.credentials) and Firebase Authentication.
 * Never stores passwords or client secrets in the APK.
 */
object GoogleAuthManager {

    private const val TAG = "GoogleAuthManager"

    // Default Web OAuth Client ID from Google Cloud Console / Firebase
    private const val DEFAULT_SERVER_CLIENT_ID = "772122699149-o6ead31g3hrem9s940qojjtpqm5peitq.apps.googleusercontent.com"

    fun getServerClientId(): String {
        return try {
            val buildConfigId = BuildConfig.GOOGLE_CLIENT_ID
            if (buildConfigId.isNotBlank()) buildConfigId else DEFAULT_SERVER_CLIENT_ID
        } catch (_: Exception) {
            DEFAULT_SERVER_CLIENT_ID
        }
    }

    /**
     * Launches Android Credential Manager bottom sheet to authenticate with Google,
     * extracts the Google ID Token, and signs in to Firebase.
     */
    suspend fun signInWithGoogle(activity: Activity): Result<FirebaseUser?> = withContext(Dispatchers.IO) {
        val credentialManager = CredentialManager.create(activity)
        val serverClientId = getServerClientId()

        val googleIdOption = GetGoogleIdOption.Builder()
            .setFilterByAuthorizedAccounts(false)
            .setServerClientId(serverClientId)
            .setAutoSelectEnabled(false)
            .build()

        val request = GetCredentialRequest.Builder()
            .addCredentialOption(googleIdOption)
            .build()

        try {
            val response = credentialManager.getCredential(
                request = request,
                context = activity
            )

            val credential = response.credential
            if (credential is CustomCredential && credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                val googleIdTokenCredential = GoogleIdTokenCredential.createFrom(credential.data)
                val idToken = googleIdTokenCredential.idToken

                // Exchange Google ID Token with Firebase Authentication
                val firebaseResult = CloudManager.signInWithGoogleCredential(idToken)
                return@withContext firebaseResult.map { it as FirebaseUser? }
            } else {
                Log.w(TAG, "Unexpected credential type: ${credential.type}")
                return@withContext Result.failure(Exception("Unsupported credential received: ${credential.type}"))
            }
        } catch (e: GetCredentialCancellationException) {
            Log.d(TAG, "User dismissed Google Sign-In sheet.")
            // User cancelled cleanly
            return@withContext Result.success(null)
        } catch (e: NoCredentialException) {
            Log.w(TAG, "No Google credentials available on device: ${e.message}")
            return@withContext Result.failure(Exception("No Google account found on device. Please add a Google account in system settings."))
        } catch (e: GetCredentialException) {
            Log.e(TAG, "Credential Manager error: ${e.message}", e)
            return@withContext Result.failure(Exception("Google Sign-In failed: ${e.localizedMessage ?: "Unknown error"}"))
        } catch (e: Exception) {
            Log.e(TAG, "Google Auth unexpected error: ${e.message}", e)
            return@withContext Result.failure(e)
        }
    }
}
