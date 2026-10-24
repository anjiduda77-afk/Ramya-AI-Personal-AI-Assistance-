-- RAMYA AI Database Schema — Migration 005
-- Zero-Trust Capabilities, Unified Search Index, and Autonomous Tracking Engine

-- 1. Persistent Device Capabilities Registry
CREATE TABLE IF NOT EXISTS device_capabilities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    supported_platforms TEXT NOT NULL, -- JSON array ['windows', 'android', 'web']
    min_os_version TEXT NOT NULL,
    required_permissions TEXT NOT NULL, -- JSON array
    requires_internet INTEGER DEFAULT 0,
    processing_mode TEXT NOT NULL, -- 'local' | 'cloud' | 'hybrid'
    risk_level TEXT NOT NULL, -- 'read_only' | 'low_risk' | 'medium_risk' | 'high_risk'
    requires_confirmation INTEGER DEFAULT 0,
    is_enabled INTEGER DEFAULT 1,
    os_settings_hint TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed core device capabilities with defense-in-depth defaults
INSERT OR IGNORE INTO device_capabilities (
    id, name, description, supported_platforms, min_os_version, required_permissions,
    requires_internet, processing_mode, risk_level, requires_confirmation, is_enabled, os_settings_hint
) VALUES 
(
    'microphone', 'Microphone & Audio Input', 'Capture clear speech for recognition, wake-word spotting, and English pronunciation practice.',
    '["windows", "android", "web"]', 'Windows 10 / Android 8+', '["android.permission.RECORD_AUDIO", "windows.microphone"]',
    0, 'local', 'low_risk', 0, 1, 'Windows: Settings > Privacy & security > Microphone | Android: App Settings > Permissions > Microphone'
),
(
    'speech_recognition', 'Continuous Speech Recognition & VAD', 'Offline Faster-Whisper and Web Speech API continuous speech processing.',
    '["windows", "android", "web"]', 'Windows 10 / Android 8+', '["android.permission.RECORD_AUDIO"]',
    0, 'local', 'low_risk', 0, 1, 'Requires active Microphone capability and local Whisper models or browser speech services.'
),
(
    'screen_analysis', 'Screen Intelligence & OCR', 'Inspect active desktop window title and capture authorised screen areas for instant assistance.',
    '["windows"]', 'Windows 10 (19041+)', '["windows.screen_capture"]',
    0, 'local', 'medium_risk', 0, 1, 'Windows: Settings > System > Display > Graphics settings'
),
(
    'camera_vision', 'Camera & Visual Inspection', 'Capture photos and perform visual document OCR when requested by user.',
    '["windows", "android"]', 'Windows 10 / Android 9+', '["android.permission.CAMERA"]',
    0, 'local', 'medium_risk', 0, 1, 'Windows: Settings > Privacy & security > Camera | Android: App Settings > Permissions > Camera'
),
(
    'file_system', 'Local Documents & File Access', 'Read, index, and search approved local documents (PDF, DOCX, TXT, PPTX) in sandboxed folders.',
    '["windows", "android"]', 'Windows 10 / Android 10+', '["android.permission.READ_EXTERNAL_STORAGE", "android.permission.READ_MEDIA_DOCUMENTS"]',
    0, 'local', 'read_only', 0, 1, 'Sandboxed to storage/documents and explicitly chosen user folders only.'
),
(
    'installed_apps', 'Installed App Launcher', 'Launch allowlisted applications (Chrome, Notepad, Calc, VS Code, Music).',
    '["windows", "android"]', 'Windows 10 / Android 8+', '[]',
    0, 'local', 'low_risk', 0, 1, 'Only allowlisted applications with strict validation can be launched.'
),
(
    'notifications_alarms', 'Notifications, Alarms & Reminders', 'Trigger audible alerts, desktop toasts, and persistent reminders for deadlines.',
    '["windows", "android", "web"]', 'Windows 10 / Android 8+', '["android.permission.POST_NOTIFICATIONS"]',
    0, 'local', 'low_risk', 0, 1, 'Windows: Settings > System > Notifications | Android: App Settings > Notifications'
),
(
    'contacts_telephony', 'Authorized Calls & Messaging', 'Initiate phone calls and SMS messaging via platform APIs. Strictly requires confirmation.',
    '["android"]', 'Android 9+', '["android.permission.CALL_PHONE", "android.permission.SEND_SMS"]',
    0, 'local', 'high_risk', 1, 0, 'Disabled by default. Requires explicit user enablement and confirmation per call.'
),
(
    'location_awareness', 'Location & Regional Services', 'Provides local weather, sunrise times, and location-grounded context when enabled.',
    '["windows", "android"]', 'Windows 10 / Android 9+', '["android.permission.ACCESS_FINE_LOCATION"]',
    1, 'hybrid', 'medium_risk', 0, 0, 'Windows: Settings > Privacy & security > Location | Android: App Settings > Location'
),
(
    'media_control', 'Media Playback & Device Volume', 'Control system volume, media play/pause, next/previous tracks, and legal music streams.',
    '["windows", "android"]', 'Windows 10 / Android 8+', '[]',
    0, 'local', 'low_risk', 0, 1, 'Controls system media keys safely via Windows API and Android MediaSession.'
),
(
    'web_search', 'Online Web Search & Live Data', 'Fetch live weather forecasts, financial quotes, and grounded web search snippets.',
    '["windows", "android", "web"]', 'Any OS with internet', '[]',
    1, 'cloud', 'read_only', 0, 1, 'Connects to Open-Meteo, DuckDuckGo, and official APIs without collecting tracking data.'
),
(
    'cloud_ai', 'Cloud Intelligence (Gemini / OpenRouter)', 'High-parameter cloud LLM processing for complex reasoning and advanced questions.',
    '["windows", "android", "web"]', 'Any OS with internet', '[]',
    1, 'cloud', 'medium_risk', 0, 1, 'Requires valid API key. Data sent strictly over TLS and never stored permanently by Ramya.'
),
(
    'local_ai', 'Offline Intelligence (Ollama / Local LLM)', '100% private, offline LLM inference (e.g. Gemma, Qwen, Mistral) with zero network traffic.',
    '["windows"]', 'Windows 10 (x64) with 8GB+ RAM', '[]',
    0, 'local', 'read_only', 0, 1, 'Runs via local Ollama daemon on http://127.0.0.1:11434 with 100% local data sovereignty.'
),
(
    'task_scheduler', 'Scheduled Workflows & Change Monitoring', 'Run user-approved background monitoring, file change watchers, and task reminders.',
    '["windows", "android"]', 'Windows 10 / Android 8+', '[]',
    0, 'local', 'medium_risk', 0, 1, 'Configurable check intervals with rate limits, safe backoff, and deduplication.'
);

-- 2. Accurate Tracking and Monitoring Engine
CREATE TABLE IF NOT EXISTS unified_trackers (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    tracker_type TEXT NOT NULL, -- 'task_reminder' | 'file_watcher' | 'project_progress' | 'system_health' | 'service_status' | 'custom'
    target TEXT NOT NULL, -- Path, Task ID, Service URL, or Symbol
    status TEXT DEFAULT 'normal', -- 'normal' | 'alert' | 'active' | 'paused'
    check_interval_seconds INTEGER DEFAULT 300,
    last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    next_check TIMESTAMP,
    last_state_hash TEXT,
    change_summary TEXT,
    notification_preference TEXT DEFAULT 'all', -- 'all' | 'urgent_only' | 'muted'
    metadata_json TEXT, -- Serialized settings
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_unified_trackers_status ON unified_trackers(status);
CREATE INDEX IF NOT EXISTS idx_unified_trackers_type ON unified_trackers(tracker_type);

-- Seed initial practical trackers
INSERT OR IGNORE INTO unified_trackers (
    id, title, tracker_type, target, status, check_interval_seconds, change_summary, metadata_json
) VALUES
(
    'tracker-tasks', 'Daily Tasks & Deadlines', 'task_reminder', 'database:tasks', 'normal', 120,
    'Monitoring active tasks and upcoming deadlines.', '{"include_overdue": true}'
),
(
    'tracker-health', 'Local Assistant Health & Engine Status', 'system_health', 'system:metrics', 'normal', 60,
    'Monitoring CPU, RAM, database WAL, and voice engines.', '{"cpu_threshold": 90, "ram_threshold": 90}'
),
(
    'tracker-storage', 'Document Storage & Knowledge Changes', 'file_watcher', 'storage/documents', 'normal', 300,
    'Watching authorized documents folder for new or modified PDFs and text files.', '{"path": "storage/documents"}'
),
(
    'tracker-cloud', 'AI Cloud Provider Status & Quota', 'service_status', 'api:cloud_provider', 'normal', 600,
    'Checking connectivity and latency for configured cloud endpoints.', '{"endpoint": "cloud_provider"}'
);

-- 3. Tracker Change Events & Alerts Log
CREATE TABLE IF NOT EXISTS tracker_events (
    id TEXT PRIMARY KEY,
    tracker_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'change_detected' | 'deadline_approaching' | 'service_down' | 'service_restored' | 'info'
    title TEXT NOT NULL,
    details TEXT,
    severity TEXT DEFAULT 'info', -- 'info' | 'warning' | 'critical'
    is_read INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(tracker_id) REFERENCES unified_trackers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tracker_events_tracker ON tracker_events(tracker_id);
CREATE INDEX IF NOT EXISTS idx_tracker_events_created ON tracker_events(created_at);

-- 4. Unified Full-Text Search Virtual Table (FTS5)
CREATE VIRTUAL TABLE IF NOT EXISTS fts_unified_search USING fts5(
    item_id UNINDEXED,
    source_type UNINDEXED, -- 'document' | 'memory' | 'conversation' | 'task' | 'note' | 'app'
    title,
    content,
    metadata UNINDEXED
);
