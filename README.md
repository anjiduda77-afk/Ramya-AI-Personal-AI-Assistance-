# RAMYA AI — UNIFIED PERSONAL ASSISTANT FOR WINDOWS & ANDROID

> **Tagline:** *"Your World. Your Voice. Your Control."*  
> **Primary Wake Phrase:** `"Hey Ramya"` *(also responds to "Hello Ramya", "Ramya", "Okey Ramya")*  
> **Default Voice:** Natural Indian English Female (`en-IN-NeerjaNeural` / Android TTS)  
> **Target Platforms:** Windows Desktop & Android Mobile  
> **Unified AI Core:** Local Offline Gemma 3 4B (Ollama), Google Gemini API, OpenAI (ChatGPT) API, xAI Grok API  
> **Personal Memory:** Persistent, user-controlled SQLite memory separate from chat logs  
> **English Tutor:** Daily practical conversational lessons, spaced repetition, and natural Telugu-to-English translation  
> **Music & Media:** Free & legal royalty-free/CC streams (Lofi, Ambient, Classical, Nature) + official YouTube/Spotify app launch  
> **Security:** Strict Frontend-Backend Isolation, Zero-Leakage Contracts, 4-Tier Permission Manager  

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

- **Backend Core:** Python 3.14, FastAPI, SQLite with automatic schema migrations, Edge-TTS, Faster-Whisper, MSS, Pillow.
- **AI Providers:** Ollama (Gemma 3 4B), Google Gemini REST API, OpenAI Chat Completions, xAI Grok API.
- **Desktop UI:** React 18, Vite, TypeScript, Cyberpunk Neon Design System, WebSockets.
- **Android App:** Kotlin 2.0, Jetpack Compose, Foreground Microphone Service, MediaProjection Screen Capture, Intent Launcher.
- **Testing:** Pytest 9.1 with 35 unit and integration tests (100% pass rate).

---

## 3. Verified Command Routing Capabilities

| User Command | Routed Module | Public Intent | Outcome |
| :--- | :--- | :--- | :--- |
| `"Hey Ramya"` | Wake Word Spotter | `conversation` | *"Yes! I am listening. How can I help you?"* |
| `"Play relaxing music"` | Free Legal Music Player | `media_control` | Plays Deep Focus Ambient stream |
| `"Tell my friend in English that I will arrive in ten minutes"` | English Tutor / Telugu Engine | `conversation` | *"I'll be there in ten minutes."* |
| `"Repeat yesterday's English lesson"` | English Learning Tutor | `quiz_learning` | Retrieves yesterday's lesson with Telugu meaning |
| `"Remember that I prefer dark cyberpunk mode"` | Personal Memory Engine | `productivity` | Saves preference to SQLite vault |
| `"What theme do I like?"` (Follow-up) | Local Ollama + Gemma 3 4B | `conversation` | *"You prefer dark cyberpunk mode, right?"* |
| `"What is the weather in Hyderabad?"` | Live Data Engine | `live_info` | Real-time temperature, humidity, and condition |
| `"Open YouTube"` | Allowlisted App Launcher | `system_app` | Launches official YouTube app / website |
| `"Search for Python programming language"` | Web Search Engine | `live_info` | Instant abstract from Wikipedia / DuckDuckGo |

---

## 4. Setup and Quick Start

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
pytest -v
```

---

## 5. Security & Privacy Audit

- **Audit Tool:** `audit_secrets.py`
- **Git History Scan:** 0 leaked secrets or credentials across all commits.
- **Working Tree Scan:** 0 private API keys, tokens, or credentials in tracked/untracked files.
- **Client Bundle Scan:** 0 backend model names or secrets compiled into the Vite frontend distribution.
- **License:** MIT License. All rights reserved.
