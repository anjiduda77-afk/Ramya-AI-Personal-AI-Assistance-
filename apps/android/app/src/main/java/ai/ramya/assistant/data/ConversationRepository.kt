package ai.ramya.assistant.data

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.SetOptions
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/**
 * Metadata for a user conversation session.
 */
data class ConversationMetadata(
    val id: String,
    val userId: String,
    val title: String,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val model: String = "gemini-3.5-flash",
    val messageCount: Int = 0
)

/**
 * A single spoken or typed message within a conversation.
 */
data class ChatMessage(
    val id: String = UUID.randomUUID().toString(),
    val conversationId: String,
    val sender: String, // "user" or "assistant"
    val text: String,
    val timestamp: Long = System.currentTimeMillis(),
    val actionTag: String? = null,
    val citations: List<String> = emptyList()
)

/**
 * Production Multi-Chat Repository for Ramya AI.
 * Handles Firestore cloud sync under `users/{uid}/conversations/{chatId}/messages/{msgId}`
 * and instant local SharedPreferences fallback cache for offline availability.
 */
object ConversationRepository {

    private const val TAG = "ConversationRepo"
    private const val PREFS_NAME = "ramya_conversations_cache"
    private const val KEY_ACTIVE_CHAT_ID = "active_chat_id"
    private const val KEY_CHATS_JSON = "cached_chats_json"
    private const val KEY_MESSAGES_PREFIX = "cached_messages_"

    private val auth: FirebaseAuth by lazy { FirebaseAuth.getInstance() }
    private val firestore: FirebaseFirestore by lazy { FirebaseFirestore.getInstance() }

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun getActiveChatId(context: Context): String {
        val prefs = getPrefs(context)
        var activeId = prefs.getString(KEY_ACTIVE_CHAT_ID, null)
        if (activeId.isNullOrBlank()) {
            activeId = UUID.randomUUID().toString()
            prefs.edit().putString(KEY_ACTIVE_CHAT_ID, activeId).apply()
        }
        return activeId
    }

    fun setActiveChatId(context: Context, chatId: String) {
        getPrefs(context).edit().putString(KEY_ACTIVE_CHAT_ID, chatId).apply()
    }

    /**
     * Starts a genuinely new conversation and updates the active chat pointer.
     */
    fun startNewConversation(context: Context, initialTitle: String = "New Conversation"): ConversationMetadata {
        val newId = UUID.randomUUID().toString()
        val uid = auth.currentUser?.uid ?: "anonymous_user"
        val conv = ConversationMetadata(
            id = newId,
            userId = uid,
            title = initialTitle,
            createdAt = System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis()
        )
        setActiveChatId(context, newId)

        // Save locally
        val existing = getCachedConversations(context).toMutableList()
        existing.add(0, conv)
        saveCachedConversations(context, existing)

        return conv
    }

    /**
     * Fetches all conversations for the authenticated user, merging Firestore with local cache.
     */
    suspend fun fetchConversations(context: Context): List<ConversationMetadata> = withContext(Dispatchers.IO) {
        val uid = auth.currentUser?.uid
        if (uid.isNullOrBlank()) {
            return@withContext getCachedConversations(context)
        }

        try {
            val snapshot = firestore.collection("users")
                .document(uid)
                .collection("conversations")
                .orderBy("updatedAt", Query.Direction.DESCENDING)
                .get()
                .await()

            val cloudList = mutableListOf<ConversationMetadata>()
            for (doc in snapshot.documents) {
                val id = doc.id
                val title = doc.getString("title") ?: "Conversation"
                val createdAt = doc.getLong("createdAt") ?: System.currentTimeMillis()
                val updatedAt = doc.getLong("updatedAt") ?: System.currentTimeMillis()
                val model = doc.getString("model") ?: "gemini-3.5-flash"
                val msgCount = doc.getLong("messageCount")?.toInt() ?: 0

                cloudList.add(
                    ConversationMetadata(
                        id = id,
                        userId = uid,
                        title = title,
                        createdAt = createdAt,
                        updatedAt = updatedAt,
                        model = model,
                        messageCount = msgCount
                    )
                )
            }

            if (cloudList.isNotEmpty()) {
                saveCachedConversations(context, cloudList)
                return@withContext cloudList
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to load conversations from Firestore: ${e.message}. Using cache.")
        }

        getCachedConversations(context)
    }

    /**
     * Fetches messages for a specific conversation.
     */
    suspend fun fetchMessages(context: Context, conversationId: String): List<ChatMessage> = withContext(Dispatchers.IO) {
        val uid = auth.currentUser?.uid
        if (uid.isNullOrBlank()) {
            return@withContext getCachedMessages(context, conversationId)
        }

        try {
            val snapshot = firestore.collection("users")
                .document(uid)
                .collection("conversations")
                .document(conversationId)
                .collection("messages")
                .orderBy("timestamp", Query.Direction.ASCENDING)
                .get()
                .await()

            val cloudMessages = mutableListOf<ChatMessage>()
            for (doc in snapshot.documents) {
                val sender = doc.getString("sender") ?: "assistant"
                val text = doc.getString("text") ?: ""
                val timestamp = doc.getLong("timestamp") ?: System.currentTimeMillis()
                val actionTag = doc.getString("actionTag")
                val citationsArray = doc.get("citations") as? List<*>
                val citations = citationsArray?.mapNotNull { it?.toString() } ?: emptyList()

                cloudMessages.add(
                    ChatMessage(
                        id = doc.id,
                        conversationId = conversationId,
                        sender = sender,
                        text = text,
                        timestamp = timestamp,
                        actionTag = actionTag,
                        citations = citations
                    )
                )
            }

            if (cloudMessages.isNotEmpty()) {
                saveCachedMessages(context, conversationId, cloudMessages)
                return@withContext cloudMessages
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to load messages from Firestore: ${e.message}. Using cache.")
        }

        getCachedMessages(context, conversationId)
    }

    /**
     * Appends a message to the conversation, auto-titles if needed, and synchronizes to Firestore.
     */
    suspend fun addMessage(
        context: Context,
        conversationId: String,
        sender: String,
        text: String,
        actionTag: String? = null,
        citations: List<String> = emptyList()
    ): ChatMessage = withContext(Dispatchers.IO) {
        val message = ChatMessage(
            id = UUID.randomUUID().toString(),
            conversationId = conversationId,
            sender = sender,
            text = text,
            timestamp = System.currentTimeMillis(),
            actionTag = actionTag,
            citations = citations
        )

        // 1. Update local cache immediately
        val messages = getCachedMessages(context, conversationId).toMutableList()
        messages.add(message)
        saveCachedMessages(context, conversationId, messages)

        // 2. Auto-generate title if this is the first user prompt in a "New Conversation"
        val conversations = getCachedConversations(context).toMutableList()
        val index = conversations.indexOfFirst { it.id == conversationId }
        var currentTitle = "New Conversation"

        if (index != -1) {
            val existingConv = conversations[index]
            if ((existingConv.title == "New Conversation" || existingConv.title == "New Chat") && sender == "user") {
                val words = text.trim().split(Regex("\\s+")).take(6).joinToString(" ")
                currentTitle = if (words.isNotBlank()) words else "Voice Chat"
            } else {
                currentTitle = existingConv.title
            }
            conversations[index] = existingConv.copy(
                title = currentTitle,
                updatedAt = System.currentTimeMillis(),
                messageCount = messages.size
            )
        } else {
            val words = text.trim().split(Regex("\\s+")).take(6).joinToString(" ")
            currentTitle = if (words.isNotBlank()) words else "Voice Chat"
            conversations.add(0, ConversationMetadata(
                id = conversationId,
                userId = auth.currentUser?.uid ?: "anonymous",
                title = currentTitle,
                createdAt = System.currentTimeMillis(),
                updatedAt = System.currentTimeMillis(),
                messageCount = messages.size
            ))
        }
        saveCachedConversations(context, conversations)

        // 3. Sync to Firestore in background
        val uid = auth.currentUser?.uid
        if (!uid.isNullOrBlank()) {
            try {
                val convRef = firestore.collection("users")
                    .document(uid)
                    .collection("conversations")
                    .document(conversationId)

                val convData = hashMapOf(
                    "id" to conversationId,
                    "title" to currentTitle,
                    "userId" to uid,
                    "updatedAt" to System.currentTimeMillis(),
                    "messageCount" to messages.size
                )
                convRef.set(convData, SetOptions.merge())

                val msgData = hashMapOf(
                    "id" to message.id,
                    "sender" to message.sender,
                    "text" to message.text,
                    "timestamp" to message.timestamp,
                    "actionTag" to (message.actionTag ?: ""),
                    "citations" to message.citations
                )
                convRef.collection("messages").document(message.id).set(msgData)
            } catch (e: Exception) {
                Log.w(TAG, "Non-blocking message sync error: ${e.message}")
            }
        }

        message
    }

    /**
     * Renames a conversation.
     */
    suspend fun renameConversation(context: Context, conversationId: String, newTitle: String) = withContext(Dispatchers.IO) {
        val conversations = getCachedConversations(context).toMutableList()
        val index = conversations.indexOfFirst { it.id == conversationId }
        if (index != -1) {
            conversations[index] = conversations[index].copy(title = newTitle, updatedAt = System.currentTimeMillis())
            saveCachedConversations(context, conversations)
        }

        val uid = auth.currentUser?.uid
        if (!uid.isNullOrBlank()) {
            try {
                firestore.collection("users")
                    .document(uid)
                    .collection("conversations")
                    .document(conversationId)
                    .update("title", newTitle)
                    .await()
            } catch (_: Exception) {}
        }
    }

    /**
     * Deletes a conversation and its messages.
     */
    suspend fun deleteConversation(context: Context, conversationId: String) = withContext(Dispatchers.IO) {
        val conversations = getCachedConversations(context).filter { it.id != conversationId }
        saveCachedConversations(context, conversations)
        getPrefs(context).edit().remove(KEY_MESSAGES_PREFIX + conversationId).apply()

        // If active was deleted, pick the next or start new
        if (getActiveChatId(context) == conversationId) {
            val next = conversations.firstOrNull()?.id ?: UUID.randomUUID().toString()
            setActiveChatId(context, next)
        }

        val uid = auth.currentUser?.uid
        if (!uid.isNullOrBlank()) {
            try {
                firestore.collection("users")
                    .document(uid)
                    .collection("conversations")
                    .document(conversationId)
                    .delete()
                    .await()
            } catch (_: Exception) {}
        }
    }

    // --- LOCAL CACHE HELPERS ---

    private fun getCachedConversations(context: Context): List<ConversationMetadata> {
        val json = getPrefs(context).getString(KEY_CHATS_JSON, null) ?: return emptyList()
        return try {
            val array = JSONArray(json)
            val list = mutableListOf<ConversationMetadata>()
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                list.add(
                    ConversationMetadata(
                        id = obj.getString("id"),
                        userId = obj.optString("userId", "anonymous"),
                        title = obj.getString("title"),
                        createdAt = obj.optLong("createdAt", System.currentTimeMillis()),
                        updatedAt = obj.optLong("updatedAt", System.currentTimeMillis()),
                        model = obj.optString("model", "gemini-3.5-flash"),
                        messageCount = obj.optInt("messageCount", 0)
                    )
                )
            }
            list
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun saveCachedConversations(context: Context, list: List<ConversationMetadata>) {
        val array = JSONArray()
        for (item in list) {
            val obj = JSONObject().apply {
                put("id", item.id)
                put("userId", item.userId)
                put("title", item.title)
                put("createdAt", item.createdAt)
                put("updatedAt", item.updatedAt)
                put("model", item.model)
                put("messageCount", item.messageCount)
            }
            array.put(obj)
        }
        getPrefs(context).edit().putString(KEY_CHATS_JSON, array.toString()).apply()
    }

    private fun getCachedMessages(context: Context, conversationId: String): List<ChatMessage> {
        val json = getPrefs(context).getString(KEY_MESSAGES_PREFIX + conversationId, null) ?: return emptyList()
        return try {
            val array = JSONArray(json)
            val list = mutableListOf<ChatMessage>()
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                val citArray = obj.optJSONArray("citations")
                val citations = mutableListOf<String>()
                if (citArray != null) {
                    for (c in 0 until citArray.length()) {
                        citations.add(citArray.getString(c))
                    }
                }
                list.add(
                    ChatMessage(
                        id = obj.getString("id"),
                        conversationId = conversationId,
                        sender = obj.getString("sender"),
                        text = obj.getString("text"),
                        timestamp = obj.optLong("timestamp", System.currentTimeMillis()),
                        actionTag = if (obj.has("actionTag")) obj.getString("actionTag") else null,
                        citations = citations
                    )
                )
            }
            list
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun saveCachedMessages(context: Context, conversationId: String, messages: List<ChatMessage>) {
        val array = JSONArray()
        for (msg in messages) {
            val obj = JSONObject().apply {
                put("id", msg.id)
                put("conversationId", msg.conversationId)
                put("sender", msg.sender)
                put("text", msg.text)
                put("timestamp", msg.timestamp)
                msg.actionTag?.let { put("actionTag", it) }
                val citArr = JSONArray()
                msg.citations.forEach { citArr.put(it) }
                put("citations", citArr)
            }
            array.put(obj)
        }
        getPrefs(context).edit().putString(KEY_MESSAGES_PREFIX + conversationId, array.toString()).apply()
    }
}
