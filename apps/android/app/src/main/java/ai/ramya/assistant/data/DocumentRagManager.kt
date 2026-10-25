package ai.ramya.assistant.data

import android.content.Context
import android.content.SharedPreferences
import android.net.Uri
import android.util.Log
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.util.UUID

data class KnowledgeDocument(
    val id: String = UUID.randomUUID().toString(),
    val userId: String,
    val name: String,
    val sizeBytes: Long,
    val mimeType: String,
    val chunkCount: Int,
    val summary: String,
    val uploadedAt: Long = System.currentTimeMillis()
)

data class DocumentChunk(
    val chunkId: String,
    val documentId: String,
    val documentName: String,
    val chunkIndex: Int,
    val text: String
)

data class RagSearchResult(
    val relevantChunks: List<DocumentChunk>,
    val contextPrompt: String?,
    val citations: List<String>
)

/**
 * Android Native Document RAG & Knowledge Base Manager for Ramya AI.
 * Handles document ingestion, text extraction, sliding-window chunking,
 * lexical term-frequency vector scoring, citation synthesis, and Firestore indexing.
 */
object DocumentRagManager {

    private const val TAG = "DocumentRagManager"
    private const val PREFS_NAME = "ramya_rag_cache"
    private const val KEY_DOCS_JSON = "cached_docs_json"
    private const val KEY_CHUNKS_JSON = "cached_chunks_json"

    private const val CHUNK_SIZE = 450
    private const val CHUNK_OVERLAP = 60

    private val auth: FirebaseAuth by lazy { FirebaseAuth.getInstance() }
    private val firestore: FirebaseFirestore by lazy { FirebaseFirestore.getInstance() }

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    /**
     * Ingests a user-selected document from an Android content Uri,
     * extracts text, chunks it, and indexes it into the local store and Firestore.
     */
    suspend fun indexDocumentFromUri(
        context: Context,
        uri: Uri,
        fileName: String,
        mimeType: String
    ): Result<KnowledgeDocument> = withContext(Dispatchers.IO) {
        try {
            val contentResolver = context.contentResolver
            val inputStream = contentResolver.openInputStream(uri)
                ?: return@withContext Result.failure(Exception("Cannot open document stream"))

            val reader = BufferedReader(InputStreamReader(inputStream, Charsets.UTF_8))
            val sb = java.lang.StringBuilder()
            var line: String? = reader.readLine()
            var totalBytes = 0L

            while (line != null) {
                sb.append(line).append("\n")
                totalBytes += line.toByteArray(Charsets.UTF_8).size
                line = reader.readLine()
            }
            reader.close()
            inputStream.close()

            val fullText = sb.toString().trim()
            if (fullText.isBlank()) {
                return@withContext Result.failure(Exception("Document appears to be empty or contains no readable text."))
            }

            // 1. Sliding window chunking
            val docId = UUID.randomUUID().toString()
            val uid = auth.currentUser?.uid ?: "anonymous_user"
            val chunks = createChunks(docId, fileName, fullText)

            val summarySnippet = fullText.take(160).replace("\n", " ").trim() + "..."
            val doc = KnowledgeDocument(
                id = docId,
                userId = uid,
                name = fileName,
                sizeBytes = totalBytes,
                mimeType = mimeType,
                chunkCount = chunks.size,
                summary = summarySnippet,
                uploadedAt = System.currentTimeMillis()
            )

            // 2. Persist document & chunks in local cache
            val existingDocs = getCachedDocuments(context).toMutableList()
            existingDocs.removeAll { it.name.equals(fileName, ignoreCase = true) }
            existingDocs.add(0, doc)
            saveCachedDocuments(context, existingDocs)

            val existingChunks = getCachedChunks(context).toMutableList()
            existingChunks.removeAll { it.documentName.equals(fileName, ignoreCase = true) }
            existingChunks.addAll(chunks)
            saveCachedChunks(context, existingChunks)

            // 3. Sync document metadata to Firestore
            if (!auth.currentUser?.uid.isNullOrBlank()) {
                try {
                    val docData = hashMapOf(
                        "id" to doc.id,
                        "name" to doc.name,
                        "sizeBytes" to doc.sizeBytes,
                        "mimeType" to doc.mimeType,
                        "chunkCount" to doc.chunkCount,
                        "summary" to doc.summary,
                        "uploadedAt" to doc.uploadedAt
                    )
                    firestore.collection("users")
                        .document(uid)
                        .collection("documents")
                        .document(doc.id)
                        .set(docData)
                } catch (e: Exception) {
                    Log.w(TAG, "Firestore document sync error: ${e.message}")
                }
            }

            Result.success(doc)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to index document: ${e.message}", e)
            Result.failure(e)
        }
    }

    /**
     * Splits full text into sliding-window chunks with overlap.
     */
    private fun createChunks(docId: String, docName: String, text: String): List<DocumentChunk> {
        val chunks = mutableListOf<DocumentChunk>()
        var start = 0
        var chunkIdx = 1

        while (start < text.length) {
            val end = (start + CHUNK_SIZE).coerceAtMost(text.length)
            val chunkStr = text.substring(start, end).trim()
            if (chunkStr.isNotBlank()) {
                chunks.add(
                    DocumentChunk(
                        chunkId = "$docId-$chunkIdx",
                        documentId = docId,
                        documentName = docName,
                        chunkIndex = chunkIdx,
                        text = chunkStr
                    )
                )
                chunkIdx++
            }
            if (end >= text.length) break
            start += (CHUNK_SIZE - CHUNK_OVERLAP)
        }

        return chunks
    }

    /**
     * Performs BM25 / term-frequency lexical search across indexed document chunks.
     * Returns relevant excerpts, source citations, and augmented prompt context.
     */
    fun searchKnowledgeBase(context: Context, query: String, maxResults: Int = 3): RagSearchResult {
        val cleanQuery = query.lowercase().trim()
        val queryTerms = cleanQuery.split(Regex("[^a-zA-Z0-9]+"))
            .filter { it.length > 2 && it !in STOP_WORDS }

        if (queryTerms.isEmpty()) {
            return RagSearchResult(emptyList(), null, emptyList())
        }

        val allChunks = getCachedChunks(context)
        if (allChunks.isEmpty()) {
            return RagSearchResult(emptyList(), null, emptyList())
        }

        // Score chunks based on term matching frequency and title relevance
        val scoredChunks = allChunks.map { chunk ->
            val chunkLower = chunk.text.lowercase()
            val docNameLower = chunk.documentName.lowercase()
            var score = 0.0

            for (term in queryTerms) {
                val matches = chunkLower.split(term).size - 1
                if (matches > 0) {
                    score += (matches * 1.5)
                }
                if (docNameLower.contains(term)) {
                    score += 3.0
                }
            }

            Pair(chunk, score)
        }.filter { it.second > 1.0 }
         .sortedByDescending { it.second }
         .take(maxResults)
         .map { it.first }

        if (scoredChunks.isEmpty()) {
            return RagSearchResult(emptyList(), null, emptyList())
        }

        // Build citations & context prompt
        val citations = scoredChunks.map { "${it.documentName} (Section ${it.chunkIndex})" }.distinct()
        val contextPrompt = buildString {
            append("Knowledge Base Context from user's indexed documents:\n")
            scoredChunks.forEach { chunk ->
                append("--- [Source: ${chunk.documentName}, Section ${chunk.chunkIndex}] ---\n")
                append(chunk.text).append("\n\n")
            }
            append("Use the above facts to answer the user's question accurately. Always cite your sources.")
        }

        return RagSearchResult(scoredChunks, contextPrompt, citations)
    }

    /**
     * Lists all indexed documents for the current user.
     */
    suspend fun fetchDocuments(context: Context): List<KnowledgeDocument> = withContext(Dispatchers.IO) {
        val uid = auth.currentUser?.uid
        if (uid.isNullOrBlank()) {
            return@withContext getCachedDocuments(context)
        }

        try {
            val snapshot = firestore.collection("users")
                .document(uid)
                .collection("documents")
                .orderBy("uploadedAt", Query.Direction.DESCENDING)
                .get()
                .await()

            val cloudDocs = mutableListOf<KnowledgeDocument>()
            for (doc in snapshot.documents) {
                cloudDocs.add(
                    KnowledgeDocument(
                        id = doc.id,
                        userId = uid,
                        name = doc.getString("name") ?: "Document",
                        sizeBytes = doc.getLong("sizeBytes") ?: 0L,
                        mimeType = doc.getString("mimeType") ?: "text/plain",
                        chunkCount = doc.getLong("chunkCount")?.toInt() ?: 1,
                        summary = doc.getString("summary") ?: "",
                        uploadedAt = doc.getLong("uploadedAt") ?: System.currentTimeMillis()
                    )
                )
            }

            if (cloudDocs.isNotEmpty()) {
                saveCachedDocuments(context, cloudDocs)
                return@withContext cloudDocs
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to load documents from Firestore: ${e.message}")
        }

        getCachedDocuments(context)
    }

    /**
     * Deletes a document and its chunks from local cache and Firestore.
     */
    suspend fun deleteDocument(context: Context, documentId: String) = withContext(Dispatchers.IO) {
        val docs = getCachedDocuments(context).filter { it.id != documentId }
        saveCachedDocuments(context, docs)

        val chunks = getCachedChunks(context).filter { it.documentId != documentId }
        saveCachedChunks(context, chunks)

        val uid = auth.currentUser?.uid
        if (!uid.isNullOrBlank()) {
            try {
                firestore.collection("users")
                    .document(uid)
                    .collection("documents")
                    .document(documentId)
                    .delete()
                    .await()
            } catch (_: Exception) {}
        }
    }

    // --- LOCAL CACHE HELPERS ---

    private fun getCachedDocuments(context: Context): List<KnowledgeDocument> {
        val json = getPrefs(context).getString(KEY_DOCS_JSON, null) ?: return emptyList()
        return try {
            val array = JSONArray(json)
            val list = mutableListOf<KnowledgeDocument>()
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                list.add(
                    KnowledgeDocument(
                        id = obj.getString("id"),
                        userId = obj.optString("userId", "anonymous"),
                        name = obj.getString("name"),
                        sizeBytes = obj.optLong("sizeBytes", 0L),
                        mimeType = obj.optString("mimeType", "text/plain"),
                        chunkCount = obj.optInt("chunkCount", 0),
                        summary = obj.optString("summary", ""),
                        uploadedAt = obj.optLong("uploadedAt", System.currentTimeMillis())
                    )
                )
            }
            list
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun saveCachedDocuments(context: Context, list: List<KnowledgeDocument>) {
        val array = JSONArray()
        for (item in list) {
            val obj = JSONObject().apply {
                put("id", item.id)
                put("userId", item.userId)
                put("name", item.name)
                put("sizeBytes", item.sizeBytes)
                put("mimeType", item.mimeType)
                put("chunkCount", item.chunkCount)
                put("summary", item.summary)
                put("uploadedAt", item.uploadedAt)
            }
            array.put(obj)
        }
        getPrefs(context).edit().putString(KEY_DOCS_JSON, array.toString()).apply()
    }

    private fun getCachedChunks(context: Context): List<DocumentChunk> {
        val json = getPrefs(context).getString(KEY_CHUNKS_JSON, null) ?: return emptyList()
        return try {
            val array = JSONArray(json)
            val list = mutableListOf<DocumentChunk>()
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                list.add(
                    DocumentChunk(
                        chunkId = obj.getString("chunkId"),
                        documentId = obj.getString("documentId"),
                        documentName = obj.getString("documentName"),
                        chunkIndex = obj.getInt("chunkIndex"),
                        text = obj.getString("text")
                    )
                )
            }
            list
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun saveCachedChunks(context: Context, list: List<DocumentChunk>) {
        val array = JSONArray()
        for (chunk in list) {
            val obj = JSONObject().apply {
                put("chunkId", chunk.chunkId)
                put("documentId", chunk.documentId)
                put("documentName", chunk.documentName)
                put("chunkIndex", chunk.chunkIndex)
                put("text", chunk.text)
            }
            array.put(obj)
        }
        getPrefs(context).edit().putString(KEY_CHUNKS_JSON, array.toString()).apply()
    }

    private val STOP_WORDS = setOf(
        "the", "and", "is", "in", "it", "of", "to", "for", "with", "on", "that", "this",
        "was", "are", "from", "at", "as", "by", "an", "be", "or", "what", "which", "how"
    )
}
