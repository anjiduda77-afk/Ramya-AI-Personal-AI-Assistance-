-- RAMYA AI Database Schema — Migration 002
-- Cloud Usage Tracking, Privacy Preferences & Developer Gate

CREATE TABLE IF NOT EXISTS cloud_usage (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    estimated_cost_usd REAL DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS privacy_preferences (
    id TEXT PRIMARY KEY DEFAULT 'default',
    offline_only INTEGER DEFAULT 0,
    cloud_consent INTEGER DEFAULT 0,
    voice_retention_days INTEGER DEFAULT 30,
    allow_screen_analysis INTEGER DEFAULT 1,
    developer_mode_enabled INTEGER DEFAULT 0,
    developer_passcode_hash TEXT DEFAULT '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', -- default: 'admin' sha256
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initialize default privacy preferences
INSERT OR IGNORE INTO privacy_preferences (id, offline_only, cloud_consent, voice_retention_days, allow_screen_analysis, developer_mode_enabled)
VALUES ('default', 0, 0, 30, 1, 0);
