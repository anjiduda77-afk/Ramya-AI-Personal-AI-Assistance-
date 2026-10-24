# RAMYA AI — ADVANCED PERSONAL DESKTOP & MOBILE ASSISTANT

> **Tagline:** *"Your World. Your Voice. Your Control."*  
> **Primary Wake Phrase:** `"Hey Ramya"` *(also responds to "Hello Ramya", "Ramya", "Okey Ramya")*  
> **Language:** Natural Indian English (`en-IN-NeerjaNeural` / Android TTS)  
> **Target Platforms:** Windows Desktop & Android Mobile  
> **Local Intelligence:** Ollama with Google Gemma 3 4B (Offline-First)  
> **Cloud Intelligence:** Official OpenAI API Adapter (Opt-in Cloud Reasoning)  
> **Security Architecture:** Strict Frontend-Backend Isolation & Central Permission Manager  

---

## 1. Product Overview

**Ramya AI** is a production-oriented, voice-first personal AI assistant built for Windows and Android. It delivers an immersive, futuristic Cyberpunk Command Center combining local offline intelligence, local SQLite persistent storage, document research with grounded citations (RAG), screen intelligence, application launching, and productivity management.

### Architectural Pillars
- **Strict Frontend-Backend Separation:** Internal prompts, model names, provider routing strategies, database schemas, and API secrets are strictly confined to the backend. The client receives clean, verified outcomes.
- **Offline-First Intelligence:** Local inference with Gemma 3 4B via Ollama ensures private conversation, document understanding, and system execution with zero outbound transmissions.
- **Deterministic Command Router:** Sub-15ms execution for system tasks, app launching, media controls, and weather lookups without unnecessary latency or hallucination risks.
- **Natural Indian English Voice Engine:** Natural speech synthesis (`en-IN-NeerjaNeural`), wake-word spotting ("Hey Ramya"), push-to-talk (`Ctrl+Space`), and immediate speech interruption.
- **Four-Tier Security:** Central Permission Manager enforcing Read-Only, Low-Risk, Medium-Risk, and High-Risk authorization gates with auditable execution logs and hard confirmation gates.
- **Two-Layer Configuration & Developer Gate:** Public ordinary user preferences (voice, wake phrase, themes, privacy shield, data purge) are separated from developer diagnostics, which are protected behind a SHA-256 passcode gateway.

---

## 2. Cyberpunk Command Center (User-Centric Architecture)

1. **⚡ Command Center:** Central holographic AI Orb with reactive waveform pulses, live speech prompt, contextual action chips, ambient weather radar, and upcoming tasks.
2. **💬 Voice & Chat Assistant:** Immersive conversational interface with natural Indian English speech synthesis, grounded document citations, and immediate cancellation.
3. **👁️ Vision & Screen:** User-authorized screenshot capture, active window identification, OCR text extraction, and contextual recommendations.
4. **📄 Document Studio:** Drag-and-drop parsing for PDF, DOCX, PPTX presentations, and CSV files with local vector retrieval (RAG) and exact page/slide citations.
5. **⏱️ Productivity & Focus:** Daily agenda, priority task management, voice reminders, research notes, and focus timer.
6. **📈 Live Radar:** Real-time global weather telemetry (Open-Meteo) and live delayed stock quotes (Yahoo Finance).
7. **🎓 Learning & Quiz:** Interactive voice-enabled knowledge challenges and quizzes with instant grading and explanations.
8. **⚙️ Preferences & Privacy:** Wake phrase selection, voice speed/pitch, cyberpunk themes, offline-only mode toggle, local data purging, and the protected Developer Gateway.

---

## 3. Technology Stack

- **Backend Core:** Python 3.14, FastAPI, Pydantic, SQLite with versioned migrations, Edge-TTS, Faster-Whisper, MSS, Pillow, Pyperclip.
- **Desktop UI:** React 18, Vite, TypeScript, Cyberpunk Neon Design System, WebSockets.
- **Android App:** Kotlin 2.0, Jetpack Compose, Android Foreground Microphone Service, MediaProjection Screen Capture.
- **Local AI Engine:** Ollama with Google Gemma 3 4B.
- **Cloud Intelligence:** Official OpenAI API with exponential backoff, rate limit handling, and token usage tracking.

---

## 4. Setup and Installation

### Prerequisites
- Windows 10/11 or macOS / Linux
- Python 3.10+ (tested on Python 3.14)
- Node.js 18+ (tested on Node v20.19)
- [Ollama](https://ollama.com) installed and running

### 1. Verify Local Ollama and Model
```powershell
# Ensure Ollama is running
ollama serve

# Verify Gemma 3 4B is installed
ollama list
```

### 2. Backend Setup
```powershell
cd services/assistant-api
python -m pip install -r requirements.txt
```

### 3. Desktop UI Setup
```powershell
cd apps/desktop
npm install
npm run build
```

---

## 5. Launching Ramya AI

### Option A: One-Click Startup Script (PowerShell)
```powershell
.\scripts\run_assistant.ps1
```

### Option B: Manual Service Launch
```powershell
# Terminal 1: Backend API (FastAPI)
cd services/assistant-api
python -m uvicorn main:app --host 127.0.0.1 --port 8000

# Terminal 2: Desktop Command Center (Vite)
cd apps/desktop
npm run dev
```

---

## 6. Verification and Testing

### Run Backend Unit & Integration Tests (21/21 Passing)
```powershell
python -m pytest services/assistant-api/tests -v
```

### Build Desktop Production Distribution
```powershell
cd apps/desktop
npm run build
```

### Secret Scan Frontend Distribution Bundle
```powershell
powershell -Command "Select-String -Path 'dist\assets\*.js' -Pattern 'gemma3', 'sk-' -SimpleMatch"
```
*(Confirms zero leaked credentials or internal prompts in client code.)*

---

## 7. Security and Documentation Reference

- **[SECURITY.md](file:///c:/mern%20stack/mernpro/ramya/SECURITY.md):** Complete threat model, permission tiers, desktop allowlist, and data isolation specs.
- **[PLATFORM_SUPPORT.md](file:///c:/mern%20stack/mernpro/ramya/PLATFORM_SUPPORT.md):** Platform matrices, offline capabilities, and hardware requirements.
- **[IMPLEMENTATION_STATUS.md](file:///c:/mern%20stack/mernpro/ramya/IMPLEMENTATION_STATUS.md):** Feature implementation and milestone tracking.
- **[TEST_REPORT.md](file:///c:/mern%20stack/mernpro/ramya/TEST_REPORT.md):** Detailed automated test logs, build metrics, and live execution audits.
