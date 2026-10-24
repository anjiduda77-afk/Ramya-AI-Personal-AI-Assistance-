-- RAMYA AI Database Schema — Migration 003
-- Personal Memory, English Learning Tutor, and Free Legal Music Streams

-- 1. Persistent User-Controlled Memories
CREATE TABLE IF NOT EXISTS user_memories (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL DEFAULT 'general', -- 'preference' | 'fact' | 'project' | 'learned_language' | 'note' | 'general'
    content TEXT NOT NULL,
    importance INTEGER DEFAULT 3, -- 1 to 5
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_memories_category ON user_memories(category);
CREATE INDEX IF NOT EXISTS idx_user_memories_created ON user_memories(created_at);

-- 2. English Learning Records (Lessons, Telugu meanings, Spaced Repetition)
CREATE TABLE IF NOT EXISTS english_learning_records (
    id TEXT PRIMARY KEY,
    lesson_day INTEGER NOT NULL,
    sentence_en TEXT NOT NULL,
    meaning_telugu TEXT NOT NULL,
    meaning_simple_en TEXT NOT NULL,
    grammar_note TEXT,
    status TEXT DEFAULT 'new', -- 'new' | 'learning' | 'revised' | 'mastered'
    last_reviewed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    review_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_english_learning_day ON english_learning_records(lesson_day);

-- 3. English Learning Progress State
CREATE TABLE IF NOT EXISTS english_learning_progress (
    id TEXT PRIMARY KEY DEFAULT 'current',
    current_level TEXT DEFAULT 'Beginner',
    total_learned INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 1,
    last_lesson_date TEXT,
    pending_revision_sentence TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial progress state
INSERT OR IGNORE INTO english_learning_progress (id, current_level, total_learned, streak_days, last_lesson_date, pending_revision_sentence)
VALUES ('current', 'Beginner', 0, 1, DATE('now', '-1 day'), 'Have you eaten?');

-- Seed practical daily-use lessons
INSERT OR IGNORE INTO english_learning_records (id, lesson_day, sentence_en, meaning_telugu, meaning_simple_en, grammar_note, status, review_count)
VALUES 
('lesson-1', 1, 'Have you eaten?', 'మీరు భోజనం చేశారా?', 'Did you have your meal or food?', 'In daily conversational English, "Have you eaten?" is polite and caring, often used instead of blunt phrasing.', 'revised', 1),
('lesson-2', 2, 'I will be there in ten minutes.', 'నేను పది నిమిషాల్లో అక్కడ ఉంటాను.', 'I will arrive in ten minutes.', 'Use "I will be there" or "I''ll be there" for natural conversational arrival rather than literal word-by-word translation.', 'new', 0),
('lesson-3', 3, 'Let us catch up later.', 'మనం తర్వాత మాట్లాడుకుందాం.', 'We can talk or meet later.', '"Catch up" is a friendly natural idiom meaning talking about news or sharing life updates.', 'new', 0),
('lesson-4', 4, 'Could you please repeat that?', 'దయచేసి దాన్ని మళ్ళీ చెప్పగలరా?', 'Please say that one more time.', 'A polite, respectful way to ask someone to say something again if you did not catch it.', 'new', 0),
('lesson-5', 5, 'I am running a bit late.', 'నాకు కొంచెం ఆలస్యం అవుతోంది.', 'I will arrive slightly later than planned.', 'Common practical phrase when delayed by traffic or unexpected errands.', 'new', 0),
('lesson-6', 6, 'What do you think about this?', 'దీని గురించి మీరు ఏమనుకుంటున్నారు?', 'What is your opinion on this?', 'Standard natural question to invite another person''s perspective or feedback.', 'new', 0),
('lesson-7', 7, 'Take care and see you soon.', 'జాగ్రత్తగా ఉండండి, త్వరలో కలుద్దాం.', 'Stay safe and we will meet again shortly.', 'Warm and polite conversational closing phrase for daily goodbyes.', 'new', 0);

-- 4. Free and Legal Curated Music Streams
CREATE TABLE IF NOT EXISTS music_streams (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    genre TEXT NOT NULL, -- 'lofi' | 'ambient' | 'classical' | 'focus' | 'nature'
    stream_url TEXT NOT NULL,
    is_free_legal INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed verified legal free audio streams (Public domain / Creative Commons streams)
INSERT OR IGNORE INTO music_streams (id, title, artist, genre, stream_url, is_free_legal)
VALUES
('stream-lofi-1', 'Lofi Chill Study Beats', 'ChilledCow CC / Free Music Archive', 'lofi', 'https://ia801503.us.archive.org/15/items/chill-lofi-song/chill-lofi-song.mp3', 1),
('stream-ambient-1', 'Deep Focus Ambient Atmosphere', 'Nature Audio CC0', 'ambient', 'https://ia801402.us.archive.org/3/items/ambient-relaxing-music/ambient-soundtrack.mp3', 1),
('stream-classical-1', 'Clair de Lune (Debussy)', 'Musopen Public Domain', 'classical', 'https://ia800301.us.archive.org/14/items/ClairDeLune_88/ClairDeLune.mp3', 1),
('stream-nature-1', 'Gentle Rainforest Rain & Stream', 'Creative Commons Audio', 'nature', 'https://ia800702.us.archive.org/11/items/RainSounds10Hours/GentleRain.mp3', 1);
