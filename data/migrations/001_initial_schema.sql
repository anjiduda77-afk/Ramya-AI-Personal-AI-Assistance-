-- RAMYA AI Database Schema — Migration 001
-- SQLite 3 compatible

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender TEXT NOT NULL, -- 'user' | 'ramya' | 'system'
    text TEXT NOT NULL,
    intent TEXT,
    tool_data TEXT, -- JSON
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    is_completed INTEGER DEFAULT 0,
    priority TEXT DEFAULT 'medium', -- 'low' | 'medium' | 'high'
    due_date TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    trigger_time TEXT NOT NULL,
    is_acknowledged INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT, -- JSON array of strings
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    total_pages INTEGER DEFAULT 1,
    chunk_count INTEGER DEFAULT 0,
    summary TEXT,
    indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS document_chunks (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    page_or_slide INTEGER DEFAULT 1,
    content TEXT NOT NULL,
    embedding_json TEXT, -- Serialized vector array
    FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    tool_name TEXT NOT NULL,
    permission_level TEXT NOT NULL,
    status TEXT NOT NULL, -- 'success' | 'denied' | 'failed' | 'pending'
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS watchlists (
    id TEXT PRIMARY KEY,
    symbol TEXT UNIQUE NOT NULL,
    company_name TEXT,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quiz_sessions (
    id TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    questions_json TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    total_questions INTEGER DEFAULT 0,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial settings
INSERT OR IGNORE INTO settings (key, value) VALUES
    ('wake_phrase', 'Hey Ramya'),
    ('voice_name', 'en-IN-NeerjaNeural'),
    ('stt_engine', 'faster-whisper'),
    ('tts_engine', 'edge-tts'),
    ('default_provider', 'ollama'),
    ('ollama_model', 'gemma3:4b'),
    ('theme', 'cyberpunk-neon'),
    ('require_confirmation', 'true');

-- Seed initial market watchlist
INSERT OR IGNORE INTO watchlists (id, symbol, company_name) VALUES
    ('1', 'RELIANCE.NS', 'Reliance Industries Ltd'),
    ('2', 'TCS.NS', 'Tata Consultancy Services'),
    ('3', 'INFY.NS', 'Infosys Ltd'),
    ('4', 'NVDA', 'NVIDIA Corporation'),
    ('5', 'AAPL', 'Apple Inc');
