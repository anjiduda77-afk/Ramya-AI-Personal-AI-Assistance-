-- RAMYA AI Database Schema — Migration 004
-- Human Intelligence Layer, Context Tracking, Offline Sync Outbox & User Profiles

-- 1. Offline Sync Outbox Queue (Reliable Cloud Sync)
CREATE TABLE IF NOT EXISTS sync_outbox (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL, -- 'user_memories', 'conversations', 'messages', 'user_settings'
    record_id TEXT NOT NULL,
    action TEXT NOT NULL, -- 'upsert' | 'delete'
    payload TEXT NOT NULL, -- JSON serialized row data
    status TEXT DEFAULT 'pending', -- 'pending' | 'synced' | 'failed'
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_outbox_status ON sync_outbox(status);
CREATE INDEX IF NOT EXISTS idx_sync_outbox_created ON sync_outbox(created_at);

-- 2. Conversation Context & Reference Memory (Multi-Turn Intelligence)
CREATE TABLE IF NOT EXISTS conversation_context (
    session_id TEXT PRIMARY KEY DEFAULT 'current',
    last_user_query TEXT,
    last_assistant_response TEXT,
    last_intent TEXT,
    active_entity TEXT, -- e.g. "Hyderabad", "Deep Focus Ambient Atmosphere", "Project Review"
    active_topic TEXT,
    last_action_tool TEXT,
    emotional_state TEXT DEFAULT 'neutral', -- 'neutral' | 'confused' | 'frustrated' | 'urgent' | 'excited'
    clarification_pending INTEGER DEFAULT 0,
    clarification_context TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default session context
INSERT OR IGNORE INTO conversation_context (session_id, last_user_query, last_assistant_response, last_intent, active_entity, active_topic, emotional_state)
VALUES ('current', '', 'Ramya AI is ready and listening.', 'conversation', 'Ramya Assistant', 'general', 'neutral');

-- 3. Multi-Step Task Planner (Decomposition, Execution, Verification)
CREATE TABLE IF NOT EXISTS task_plans (
    id TEXT PRIMARY KEY,
    goal TEXT NOT NULL,
    steps_json TEXT NOT NULL, -- JSON array of plan steps
    current_step_index INTEGER DEFAULT 0,
    status TEXT DEFAULT 'planning', -- 'planning' | 'executing' | 'completed' | 'failed' | 'needs_confirmation'
    confirmation_prompt TEXT,
    error_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. User Profile Local Cache (Guest & Authenticated Google Profile)
CREATE TABLE IF NOT EXISTS user_profiles (
    id TEXT PRIMARY KEY DEFAULT 'local_user',
    supabase_user_id TEXT,
    email TEXT,
    display_name TEXT DEFAULT 'Operator',
    avatar_url TEXT,
    provider TEXT DEFAULT 'guest', -- 'guest' | 'google'
    is_authenticated INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Initialize default profile
INSERT OR IGNORE INTO user_profiles (id, supabase_user_id, email, display_name, provider, is_authenticated)
VALUES ('local_user', NULL, 'guest@ramya.local', 'Cybernetic Operator', 'guest', 0);
