# RAMYA AI — PERSONAL MOBILE VOICE ASSISTANT (ANDROID & CLOUD)

> **Tagline:** *"Your World. Your Voice. Your Control."*  
> **Primary Wake Phrase:** `"Hey Ramya"` *(also responds to "Hello Ramya", "Ramya")*  
> **Default Voice:** Natural Indian English Female (`en-IN` Android TTS)  
> **Primary Platform:** Android Mobile App (`ai.ramya.assistant`) & Cloud Web Companion  
> **Cloud Security:** Firebase Authentication & Supabase Cloud Database Sync  
> **English Tutor:** Daily practical conversational lessons with natural Telugu-to-English translation  
> **Phone Automation:** YouTube, Chrome, Phone Dialer, Music, and Live Weather  

---

## 📥 Android Mobile App Download (Version 1.0.1)

| Package Format | Version | Status | Package Name | Direct APK Download Link | Features Included |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Android APK** | **v1.0.1** | 🟢 **Stable Release** | `ai.ramya.assistant` | [⬇️ Download ramya-ai-v1.0.1.apk (Direct)](https://github.com/anjiduda77-afk/Ramya-AI-Personal-AI-Assistance-/raw/main/releases/ramya-ai-v1.0.1.apk) | 🎙️ "Hey Ramya" Wake Engine, 🔊 TTS Mouth Output, 💬 WhatsApp Click-to-Chat, 🎵 Music & Lyrics ID, 🔮 7-State Animated Orb, ☁️ Firebase Auth & Firestore |

### 📲 How to Install the APK on Your Android Phone:

#### Method 1: Direct GitHub One-Tap Download (Works Worldwide — Recommended)
Tap this link from your phone's browser (Chrome / Samsung Internet):
👉 **[Download ramya-ai-v1.0.1.apk Directly from GitHub](https://github.com/anjiduda77-afk/Ramya-AI-Personal-AI-Assistance-/raw/main/releases/ramya-ai-v1.0.1.apk)**

📦 **[View GitHub Release v1.0.1](https://github.com/anjiduda77-afk/Ramya-AI-Personal-AI-Assistance-/releases/tag/v1.0.1)**

#### Method 2: Direct USB Install (Instant)
Connect your phone with a USB cable (USB Debugging enabled) and run:
```powershell
adb install -r "releases\ramya-ai-v1.0.1.apk"
```

---

## ☁️ Deploying the Web Companion to Vercel (1-Click)

The cloud web companion is pre-configured with [vercel.json](vercel.json):
1. Go to **[vercel.com/new](https://vercel.com/new)** and import your GitHub repository:
   `https://github.com/anjiduda77-afk/Ramya-AI-Personal-AI-Assistance-`
2. In **Environment Variables**, add:
   - `VITE_SUPABASE_URL` = `https://bhevseipgkqfvxkeohbj.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `sb_publishable_LSXD7oaw-jjRwvUFl1dqVw_jwUHX-nB`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_LSXD7oaw-jjRwvUFl1dqVw_jwUHX-nB`
3. Click **Deploy**. Vercel will build and host your live cloud app!

---

## 1. Product Overview

**Ramya AI** is a personalised, production-grade personal assistant designed for Windows and Android. It merges local offline intelligence, user-controlled memory, adaptive English tutoring, legal music playback, live weather, real-time web search, document research with grounded citations (RAG), and system automation into one unified assistant.

### Key Capabilities

1. **One Assistant for Everything:**
   - **Local Offline AI:** Powered by Gemma 3 4B running privately on Ollama with sub-second response times.
   - **Google Gemini AI:** Official Gemini API adapter with quota tracking and exponential backoff.
   - **OpenAI / ChatGPT API:** Official Chat Completions adapter with automatic rate limit (429) retry.
   - **xAI Grok API:** Official xAI Chat Completions integration with `grok-beta` and `grok-2`.
   - **Automatic Failover:** Switches gracefully across providers when quotas or network interruptions occur without user friction.

2. **Strong Personal Memory:**
   - Persistent SQLite storage in `user_memories` table, distinct from ephemeral chat logs.
   - Remembers user preferences, ongoing projects, learned English vocabulary, and explicit facts.
   - Grounded context injection: relevant memories are recalled naturally without inventing details or hallucinating.
   - Complete user control: view, edit, search, export to JSON, and delete memories at any time.

3. **Advanced English Learning Tutor & Telugu Translator:**
   - Daily conversational lessons designed for everyday communication.
   - Spaced repetition workflow: tracks yesterday's lesson and proactively asks:
     *"Would you like to revise yesterday’s sentence before learning a new one?"*
   - Telugu to Natural English Translation: Translates Telugu voice or conversational intent into natural idiomatic English (e.g. *"Tell my friend in English that I will arrive in ten minutes"* -> *"I'll be there in ten minutes"*).
   - Audio pronunciation synthesis and speaking practice cards.

4. **Free & Legal Music Playback:**
   - Curated 100% legal, royalty-free audio streams:
     - **Lofi Study Beats** (Creative Commons / Free Music Archive)
     - **Deep Focus Ambient Atmosphere** (Nature Audio CC0)
     - **Clair de Lune & Classical Piano** (Musopen Public Domain)
     - **Rainforest Nature Stream** (Creative Commons Audio)
   - Official integration with YouTube and Spotify for external playback.

5. **Hey Ramya — Voice-First Control:**
   - Background wake phrase detector spotting `"Hey Ramya"` with minimal CPU utilization.
   - Floating compact assistant orb on Windows with draggable overlay and quick hotkey (`Ctrl+Space`).
   - Android 14+ compliant foreground service (`RamyaVoiceForegroundService`) with persistent status notification and microphone permissions.
   - Immediate speech barge-in and audio interruption.

6. **Web Search & World Knowledge:**
   - Real-time information lookups via DuckDuckGo Instant Knowledge and Wikipedia REST API with zero tracking and no API key requirements.

7. **Clean Futuristic Cyberpunk UI:**
   - Streamlined, distraction-free interface showing only conversational messages, voice activity waveforms, music controls, learning progress, and reminders.
   - Strict frontend-backend isolation: system prompts, internal model names, API keys, and stack traces never leak to the client.

---

## 2. Technology Stack

- **Backend Core:** Python 3.14, FastAPI, SQLite with automatic schema migrations, Edge-TTS (v7.3.1), pyttsx3 SAPI5 native offline engine, Faster-Whisper, MSS, Pillow.
- **AI Providers:** Ollama (Gemma 3 4B), Google Gemini REST API, OpenAI Chat Completions, xAI Grok API.
- **Desktop UI:** React 18, Vite, TypeScript, Cyberpunk Neon Design System, WebSockets, Central Audio Player with barge-in support.
- **Android App:** Kotlin 2.0, Jetpack Compose, Foreground Microphone Service, MediaProjection Screen Capture, Intent Launcher.
- **Testing:** Pytest 9.1 with 51 unit and integration tests (100% pass rate).

---

## 3. Verified Command Routing Capabilities & Central Automation Registry

All automations are governed by the **Central Automation Registry** (`services/assistant-api/app/tools/registry.py`) with strict parameter validation, risk levels, and confirmation gates:

| User Command | Routed Module / Tool | Risk Tier | Spoken Voice Response | Screen Outcome |
| :--- | :--- | :--- | :--- | :--- |
| `"Hey Ramya"` | Wake Word Spotter | `READ_ONLY` | *"Yes! I'm listening. How can I help you?"* | Orb switches to active listening state |
| `"Play relaxing music"` | `music.play_genre` | `LOW_RISK` | *"Playing Deep Focus Ambient Atmosphere."* | Free legal audio stream starts playing |
| `"Tell my friend in English that I will arrive in ten minutes"` | `english_tutor.translate` | `READ_ONLY` | *"I'll be there in ten minutes."* | Conversational Telugu-to-English translation card |
| `"Repeat yesterday's English lesson"` | `english_tutor.lesson` | `READ_ONLY` | *"Here is your previous lesson for revision."* | Lesson card with Telugu meaning and pronunciation |
| `"Remember that I prefer dark cyberpunk mode"` | `memory.save` | `LOW_RISK` | *"I've saved your preference."* | Memory entry created in SQLite vault |
| `"What theme do I like?"` (Follow-up) | `chat.query` (Gemma 3 4B) | `READ_ONLY` | *"You prefer dark cyberpunk mode."* | Grounded memory recall without hallucinations |
| `"What is the weather in Hyderabad?"` | `weather.get_current` | `READ_ONLY` | *"The weather in Hyderabad is 28°C and clear."* | Live weather forecast card |
| `"Open YouTube"` | `app.launch` | `LOW_RISK` | *"Opening YouTube."* | Allowlisted app/URL launches safely |
| `"Delete all database files"` | Unapproved Command | `HIGH_RISK` | *"I cannot execute destructive system commands."* | Dangerous command rejected by safety token filter |

---

## 4. Voice Assistant Architecture

Ramya AI implements a polished multi-tier speech pipeline similar to Siri, Google Assistant, and Alexa:

1. **Microphone Capture & Wake Word**: Continuously detects "Hey Ramya" via Web Speech API / Android Foreground Service.
2. **Intent Analysis & Tool Execution**: Backend validates arguments against the Central Automation Registry.
3. **Response Splitting**: 
   - `message`: Full markdown text with markdown formatting, citations, tables, and detail cards shown on screen.
   - `spoken_response`: Concise, natural conversational phrase (max ~250 chars) stripped of code, markdown, and raw logs, optimized for Indian English speech.
4. **Multi-Tier Audio Synthesis**:
   - **Tier 1 (Online Neural)**: Microsoft Edge-TTS (`en-IN-NeerjaNeural` female, `en-IN-PrabhatNeural` male).
   - **Tier 2 (Offline Native)**: Windows SAPI5 via `pyttsx3` (Microsoft Zira / David) synthesized directly to local WAV without internet.
   - **Tier 3 (Acoustic Chime / Retry)**: Acoustic chime fallback if all speech devices are muted, with clear on-screen retry button.
5. **Single-Track Managed Playback**:
   - Central Audio Player singleton prevents duplicate and overlapping speech.
   - **Speech Interruption (Barge-in)**: Clicking the orb or activating the microphone instantly stops active speech playback.
6. **Persistent Voice Settings**:
   - Voice responses ON/OFF toggle.
   - Preferred voice selection (`en-IN-NeerjaNeural`, `en-IN-PrabhatNeural`, `en-US-JennyNeural`, `local-offline`).
   - Speech speed adjustment (0.8x to 1.3x).
   - Auto-listening cycle after speech completes.
   - Wake-word background listening toggle.
   - One-click "Test Voice" button.

---

## 5. Setup and Quick Start

### 1. Start Local Ollama (Offline First)
```powershell
ollama run gemma3:4b
```

### 2. Start Ramya AI Backend
```powershell
cd services/assistant-api
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### 3. Start Desktop Interface
```powershell
cd apps/desktop
npm install
npm run dev
```

### 4. Run Test Suite
```powershell
cd services/assistant-api
python -m pytest -v
```

---

## 6. Security & Privacy Audit

- **Audit Tool:** `audit_secrets.py`
- **Git History Scan:** 0 leaked secrets or credentials across all commits.
- **Working Tree Scan:** 0 private API keys, tokens, or credentials in tracked/untracked files.
- **Client Bundle Scan:** 0 backend model names or secrets compiled into the Vite frontend distribution.
- **Zero-Trust Separation:** Frontend is strictly presentation and input capture. All automation, provider routing, secrets, and tool validations execute exclusively in the backend and native OS layers.
- **Security Audit:** See [SECURITY_AUDIT.md](SECURITY_AUDIT.md) for threat modeling, defenses, and penetration testing.
- **Permission Matrix:** See [PERMISSION_MATRIX.md](PERMISSION_MATRIX.md) for the 14-capability registry across Windows and Android.
- **Search Architecture:** See [SEARCH_ARCHITECTURE.md](SEARCH_ARCHITECTURE.md) for hybrid FTS5 and vector retrieval.
- **Tracking Capabilities:** See [TRACKING_CAPABILITIES.md](TRACKING_CAPABILITIES.md) for autonomous state monitoring.
- **Test Report:** See [TEST_REPORT.md](TEST_REPORT.md) for 63/63 passing unit and integration tests.
- **License:** MIT License. All rights reserved.
