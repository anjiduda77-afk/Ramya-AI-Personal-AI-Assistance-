package ai.ramya.assistant.metrics

import android.content.Context
import android.util.Log

/**
 * Metric summary item.
 */
data class OperationalMetricSummary(
    val totalRequests: Int,
    val successfulToolExecutions: Int,
    val failedToolExecutions: Int,
    val speechRecognitionErrors: Int,
    val averageLatencyMs: Long
)

/**
 * Safe Automatic Improvement and Operational Telemetry Logger.
 * Records privacy-conscious metrics (latency, tool success/failure, speech recognizer errors)
 * locally on device without collecting private conversation audio or personal identifiers.
 */
object MetricLogger {

    private const val TAG = "MetricLogger"
    private const val PREFS_NAME = "ramya_metrics_prefs"

    private const val KEY_TOTAL_REQUESTS = "metric_total_requests"
    private const val KEY_TOOL_SUCCESS = "metric_tool_success"
    private const val KEY_TOOL_FAIL = "metric_tool_fail"
    private const val KEY_SPEECH_ERRORS = "metric_speech_errors"
    private const val KEY_TOTAL_LATENCY = "metric_total_latency_ms"

    fun logSpeechError(context: Context, errorCode: Int) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val cur = prefs.getInt(KEY_SPEECH_ERRORS, 0)
        prefs.edit().putInt(KEY_SPEECH_ERRORS, cur + 1).apply()
        Log.d(TAG, "Recorded speech recognition error: $errorCode")
    }

    fun logToolExecution(context: Context, toolName: String, success: Boolean, latencyMs: Long) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val totalReq = prefs.getInt(KEY_TOTAL_REQUESTS, 0) + 1
        val keyTool = if (success) KEY_TOOL_SUCCESS else KEY_TOOL_FAIL
        val toolCount = prefs.getInt(keyTool, 0) + 1
        val totalLat = prefs.getLong(KEY_TOTAL_LATENCY, 0L) + latencyMs

        prefs.edit()
            .putInt(KEY_TOTAL_REQUESTS, totalReq)
            .putInt(keyTool, toolCount)
            .putLong(KEY_TOTAL_LATENCY, totalLat)
            .apply()

        Log.d(TAG, "Tool '$toolName' finished (success=$success) in ${latencyMs}ms")
    }

    fun getMetricSummary(context: Context): OperationalMetricSummary {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val totalReq = prefs.getInt(KEY_TOTAL_REQUESTS, 0)
        val toolSuccess = prefs.getInt(KEY_TOOL_SUCCESS, 0)
        val toolFail = prefs.getInt(KEY_TOOL_FAIL, 0)
        val speechErrors = prefs.getInt(KEY_SPEECH_ERRORS, 0)
        val totalLat = prefs.getLong(KEY_TOTAL_LATENCY, 0L)
        val avgLat = if (totalReq > 0) totalLat / totalReq else 0L

        return OperationalMetricSummary(
            totalRequests = totalReq,
            successfulToolExecutions = toolSuccess,
            failedToolExecutions = toolFail,
            speechRecognitionErrors = speechErrors,
            averageLatencyMs = avgLat
        )
    }

    fun resetMetrics(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().clear().apply()
    }
}
