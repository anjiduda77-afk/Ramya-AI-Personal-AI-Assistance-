package ai.ramya.assistant.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import ai.ramya.assistant.MainActivity
import ai.ramya.assistant.voice.WakeWordDetector
import ai.ramya.assistant.voice.WakeWordState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * Android Foreground Microphone Service for Ramya AI.
 * Keeps wake-word listener active with mandatory persistent notification
 * as required by Android 14+ background execution policies.
 * Integrates WakeWordDetector for low-latency acoustic "Hey Ramya" detection.
 */
class RamyaVoiceForegroundService : Service() {

    private val serviceScope = CoroutineScope(Dispatchers.Main + Job())
    private var isListening = false
    private var wakeDetector: WakeWordDetector? = null
    private var wakeLock: PowerManager.WakeLock? = null

    companion object {
        const val CHANNEL_ID = "ramya_voice_channel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_START_LISTENING = "ai.ramya.assistant.START_LISTENING"
        const val ACTION_STOP_LISTENING = "ai.ramya.assistant.STOP_LISTENING"
        const val ACTION_MUTE_LISTENING = "ai.ramya.assistant.MUTE_LISTENING"
        const val ACTION_RESUME_LISTENING = "ai.ramya.assistant.RESUME_LISTENING"
        const val EXTRA_WAKE_QUERY = "EXTRA_WAKE_QUERY"

        fun startService(context: Context) {
            val intent = Intent(context, RamyaVoiceForegroundService::class.java).apply {
                action = ACTION_START_LISTENING
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stopService(context: Context) {
            val intent = Intent(context, RamyaVoiceForegroundService::class.java).apply {
                action = ACTION_STOP_LISTENING
            }
            context.startService(intent)
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        initWakeDetector()
    }

    private fun initWakeDetector() {
        wakeDetector = WakeWordDetector(this) { query ->
            // Wake word detected! Open or bring MainActivity to front with query
            val intent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
                putExtra(EXTRA_WAKE_QUERY, query)
            }
            startActivity(intent)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP_LISTENING -> {
                stopListening()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
            }
            ACTION_MUTE_LISTENING -> {
                wakeDetector?.goToSleep()
                updateNotification("Mic Standby ('Hey Ramya' sleeping)")
            }
            ACTION_RESUME_LISTENING -> {
                wakeDetector?.wakeUp()
                updateNotification("Listening for 'Hey Ramya'...")
            }
            else -> {
                startForegroundNotification()
                startListening()
            }
        }
        return START_STICKY
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Ramya AI Voice Engine",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Active voice listener for 'Hey Ramya' wake phrase"
                setShowBadge(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(statusText: String): Notification {
        val openIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val stopIntent = Intent(this, RamyaVoiceForegroundService::class.java).apply {
            action = ACTION_STOP_LISTENING
        }
        val stopPendingIntent = PendingIntent.getService(
            this,
            1,
            stopIntent,
            PendingIntent.FLAG_IMMUTABLE
        )

        val muteIntent = Intent(this, RamyaVoiceForegroundService::class.java).apply {
            action = if (statusText.contains("sleeping", ignoreCase = true)) ACTION_RESUME_LISTENING else ACTION_MUTE_LISTENING
        }
        val mutePendingIntent = PendingIntent.getService(
            this,
            2,
            muteIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val muteLabel = if (statusText.contains("sleeping", ignoreCase = true)) "Wake" else "Sleep"

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Ramya AI — Voice Assistant Active")
            .setContentText(statusText)
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentIntent(pendingIntent)
            .addAction(android.R.drawable.ic_media_pause, "Stop", stopPendingIntent)
            .addAction(android.R.drawable.ic_lock_silent_mode, muteLabel, mutePendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun startForegroundNotification() {
        val notification = buildNotification("Listening for 'Hey Ramya'...")
        val hasMicPermission = androidx.core.content.ContextCompat.checkSelfPermission(
            this,
            android.Manifest.permission.RECORD_AUDIO
        ) == android.content.pm.PackageManager.PERMISSION_GRANTED

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && hasMicPermission) {
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE
                )
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (_: Exception) {
            try {
                startForeground(NOTIFICATION_ID, notification)
            } catch (_: Exception) {
                stopSelf()
            }
        }
    }

    private fun updateNotification(statusText: String) {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        manager?.notify(NOTIFICATION_ID, buildNotification(statusText))
    }

    private fun startListening() {
        if (isListening) return
        isListening = true

        acquireWakeLock()
        wakeDetector?.startContinuousListening()
    }

    private fun stopListening() {
        isListening = false
        wakeDetector?.stopContinuousListening()
        releaseWakeLock()
    }

    private fun acquireWakeLock() {
        try {
            if (wakeLock == null) {
                val powerManager = getSystemService(Context.POWER_SERVICE) as? PowerManager
                wakeLock = powerManager?.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "ai.ramya.assistant:WakeLock"
                )?.apply {
                    setReferenceCounted(false)
                    acquire(10 * 60 * 1000L) // 10 minutes timeout safety
                }
            }
        } catch (_: Exception) {}
    }

    private fun releaseWakeLock() {
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
            wakeLock = null
        } catch (_: Exception) {}
    }

    override fun onDestroy() {
        super.onDestroy()
        stopListening()
        wakeDetector?.destroy()
        serviceScope.cancel()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
