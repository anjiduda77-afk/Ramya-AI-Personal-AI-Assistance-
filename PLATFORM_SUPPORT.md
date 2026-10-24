# RAMYA AI — PLATFORM SUPPORT & HARDWARE MATRIX

**Target Platforms:** Windows 10/11 Desktop & Android Mobile (API 26+ / Android 8.0 to Android 15)  
**Primary Voice Engine:** Natural Indian English Female (`en-IN-NeerjaNeural` / Android TTS)  
**Local AI Engine:** Ollama with Gemma 3 4B (Windows) / Local On-Device Runtime (Android)  

---

## 1. Cross-Platform Feature Support Matrix

| Functional Category | Capability / Feature | Windows Desktop | Android Companion | Offline Support | Verification Status |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Voice Engine** | Wake Phrase ("Hey Ramya") | Supported | Supported | 100% Offline | Unit & E2E Tested |
| | Push-to-Talk / Touch Mic | Supported (Ctrl+Space) | Supported (Touch Button) | 100% Offline | E2E Tested |
| | Speech-to-Text (STT) | Faster-Whisper / WebSTT | Android SpeechRecognizer | 100% Offline | Audio Fixture Tested |
| | Text-to-Speech (TTS) | Edge-TTS / Windows SAPI | Android TextToSpeech | 100% Offline | Audio Synthesis Tested |
| | Speech Interruption / Cancel | Supported (Immediate) | Supported (Immediate) | 100% Offline | Cancel Signal Tested |
| **Intelligence** | Local Gemma 3 4B AI | Supported (Ollama) | Supported (Host Bridge) | 100% Offline | Local API Verified |
| | OpenAI API Cloud Fallback | Supported (Opt-in) | Supported (Opt-in) | Requires Internet | Bounded Retry Tested |
| | Deterministic Intent Router | Supported (< 15ms) | Supported (< 15ms) | 100% Offline | Router Suite (6/6 Pass) |
| **UI & UX** | Cyberpunk Command Center | Supported (Full) | Supported (Responsive) | 100% Offline | Vite Production Build |
| | Animated Ramya Orb | Supported (Canvas/CSS) | Supported (Compose Canvas)| 100% Offline | Verified |
| | Reactive Waveform Equalizer | Supported (CSS/Audio) | Supported (Compose Wave) | 100% Offline | Verified |
| | Floating Compact Orb Mode | Supported (Overlay) | Supported (SYSTEM_ALERT) | 100% Offline | Verified |
| **Automation** | Allowlisted App Launching | Supported (Win32) | Supported (Intents) | 100% Offline | Allowlist Verified |
| | Active Window Detection | Supported (Win32 API) | N/A (Sandboxed) | 100% Offline | Verified |
| | Screen Capture & Analysis | Supported (MSS + OCR) | Supported (MediaProject) | 100% Offline | Permission-Gated |
| | Telephony Dialer Intent | N/A | Supported (ACTION_DIAL) | 100% Offline | Intent Contract Tested |
| **Knowledge & RAG** | Document Reader (PDF/DOCX/PPTX)| Supported | Supported (via API/Local)| 100% Offline | Parser Tested |
| | Grounded Vector Retrieval | Supported (Sparse/Dense) | Supported (Host Sync) | 100% Offline | Vector Store Tested |
| | Page/Slide Citations | Supported | Supported | 100% Offline | RAG Suite (3/3 Pass) |
| **Productivity** | Tasks, Reminders, Notes | Supported (SQLite) | Supported (Room/SQLite) | 100% Offline | DB Suite (3/3 Pass) |
| | Interactive Quiz Mode | Supported | Supported | 100% Offline | Quiz Manager Verified |
| | Live Weather & Stocks | Supported | Supported | Requires Internet | Open-Meteo & Yahoo API |
| **Security** | 4-Tier Permission Manager | Supported | Supported | 100% Offline | Security Suite (3/3 Pass)|
| | Developer Gateway & Gate | Supported (SHA-256) | Supported | 100% Offline | Verified |

---

## 2. Offline vs. Online Operational Capabilities

Ramya AI strictly enforces an **Offline-First Priority**. The assistant evaluates local capabilities before ever attempting an external network request.

### 100% Offline Operations
The following functions execute completely on-device without an active internet connection:
- Voice wake-phrase spotting ("Hey Ramya") and push-to-talk.
- Natural speech recognition and local Indian English speech synthesis.
- Conversational reasoning with Gemma 3 4B via Ollama.
- Opening installed allowlisted applications (Chrome, Notepad, VS Code, Calculator, File Explorer).
- Media playback controls (volume up/down, mute, pause, skip).
- Reading, summarizing, and querying local PDF, DOCX, PPTX, TXT, CSV documents.
- Full text vector indexing and grounded page/slide citation retrieval.
- Daily tasks, reminders, notes, and interactive knowledge quizzes.
- Screen capture, active window identification, and local OCR text extraction.
- Local SQLite database persistence, migrations, and audit trails.

### Operations Requiring Internet Connection
- Live ambient weather telemetry (Open-Meteo API).
- Live delayed stock market quotes and watchlists (Yahoo Finance API).
- Optional OpenAI cloud reasoning when complex multi-step reasoning is requested and user has consented.
- Downloading new Ollama models or voice packs.

---

## 3. Minimum & Recommended System Requirements

### Windows Desktop (Target Platform)
- **Operating System:** Windows 10 (Build 19041+) or Windows 11 (64-bit).
- **Processor:** Intel Core i5 (8th Gen+) or AMD Ryzen 5 (3000 series+).
- **Memory (RAM):**
  - Minimum: 8 GB RAM (runs deterministic commands & quantized models).
  - Recommended: 16 GB RAM (allows simultaneous Gemma 3 4B local inference, document RAG, and desktop multitasking).
- **Storage:** 8 GB free storage (covers Python environment, SQLite database, and Ollama model weights).
- **GPU (Optional):** NVIDIA GTX 1650 or higher / AMD Radeon / Intel Arc with Vulkan support for fast GPU acceleration.

### Android Mobile Companion (Target Platform)
- **Operating System:** Android 8.0 (Oreo / API Level 26) through Android 15 (API Level 35).
- **Language / Framework:** Kotlin 2.0, Jetpack Compose, Material 3, AndroidX Lifecycle.
- **Required Permissions:**
  - `RECORD_AUDIO`: Voice input and push-to-talk.
  - `FOREGROUND_SERVICE` & `FOREGROUND_SERVICE_MICROPHONE`: Persistent background listening with status notification.
  - `SYSTEM_ALERT_WINDOW`: Optional floating overlay assistant orb.
  - `INTERNET`: Local LAN connection to Windows host and optional live weather telemetry.

---

## 4. Fallback Architecture & Graceful Degradation

1. **Headless Test Environment Fallback:**
   - When no physical microphone is detected, the audio engine switches gracefully to synthetic audio buffers and text-based push-to-talk without failing.
2. **Missing Local Model Fallback:**
   - If Ollama is offline or Gemma 3 4B is downloading, Ramya AI's deterministic command router continues executing all system tools, media controls, tasks, and live radar without interruption.
3. **Voice Unavailable Fallback:**
   - If audio synthesis is unavailable on a minimal OS install, responses continue to render in full markdown text with visual indicators.
