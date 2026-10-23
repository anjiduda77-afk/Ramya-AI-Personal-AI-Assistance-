# RAMYA AI — ADVANCED PERSONAL DESKTOP & MOBILE ASSISTANT

> **Tagline:** *"Your World. Your Voice. Your Control."*  
> **Primary Wake Phrase:** `"Hey Ramya"` *(also responds to "Hello Ramya", "Ramya", "Okey Ramya")*  
> **Language:** Indian English  
> **Target Platforms:** Windows Desktop & Android Mobile  
> **Local LLM:** Ollama with Gemma 3 4B  

---

## 1. Product Overview

**Ramya AI** is a production-oriented, voice-first personal AI assistant built from the ground up for Windows and Android. It unifies deterministic OS-level application control, document research with local vector retrieval (RAG), live weather/market telemetry, screen intelligence, and productivity management behind a futuristic, hacker-inspired Cyberpunk Command Center.

### Core Architectural Pillars
- **Local-First AI:** Direct local inference via Ollama (`gemma3:4b`) ensures private offline conversation and document processing without unneeded cloud dependency.
- **Deterministic Command Router:** Fast execution path (< 15ms) for system tasks, app launching, media controls, and weather lookups without unnecessary LLM hallucination risk or latency.
- **Voice Pipeline:** Wake-word keyword spotting ("Hey Ramya"), voice activity detection (VAD), silence endpointing, speech recognition, and natural Indian English speech synthesis (`en-IN-NeerjaNeural`).
- **Four-Tier Security:** Central Permission Manager enforcing Read-Only, Low-Risk, Medium-Risk, and High-Risk authorization gates with auditable execution logs.
- **Cross-Platform:** Windows desktop application (React, TypeScript, Windows OS APIs) + Android native companion app (Kotlin, Jetpack Compose, foreground voice service, MediaProjection).

---

## 2. Cyberpunk Command Center (15 Integrated Panels)

1. **⚡ Command Center:** Central animated AI Orb (idle, listening, processing, speaking, verified, alert states), live speech transcription, weather radar, market watchlist, and pending tasks.
2. **💬 AI Voice Chat:** Continuous conversation studio powered by Ollama Gemma 3 4B with speech synthesis.
3. **👁️ Screen Intelligence:** Permission-controlled screenshot capture, active window detection, OCR text extraction, and contextual suggestions.
4. **📄 Document Reader:** Parsing and text chunking for PDF, DOCX, PPTX presentations, spreadsheets, and markdown files.
5. **🎙️ Voice Lab:** Acoustic studio with voice model selection, speech synthesis tester, and wake-phrase calibration.
6. **🖥️ Desktop Control:** Allowlisted application launcher (Chrome, Notepad, VS Code, Calculator, Explorer, Terminal) and native media/volume controls.
7. **📱 Mobile Control:** Android device status, telephony dialer intent (`ACTION_DIAL`), and companion link.
8. **⏱️ Personal Productivity:** Daily tasks, reminders with schedule times, research notes, and focus planning.
9. **🧠 Knowledge Base (RAG):** Grounded document retrieval with exact page/slide citations and similarity scoring.
10. **🗄️ Data & SQL Explorer:** SQLite repository viewer, table inspector, and migration history.
11. **📈 Weather & Markets:** Real-time global weather via Open-Meteo and live delayed stock quotes via Yahoo Finance.
12. **🎓 Quiz & Learning:** Interactive voice and multiple-choice quizzes with instant grading and explanations.
13. **⚙️ Automation Center:** Allowlisted multi-step routines with checkpoints and emergency stop kill switch.
14. **🛡️ Security & Permissions:** 4-tier risk classification, confirmation gates, and immutable audit logs.
15. **🔧 Settings & Diagnostics:** Wake phrase configuration, local model settings, and automated self-test diagnostics.

---

## 3. Technology Stack

- **Shared Backend:** Python 3.14, FastAPI, Pydantic, SQLite with migrations, Edge-TTS, Faster-Whisper, MSS, Pillow, Pyperclip.
- **Desktop UI:** React 18, Vite, TypeScript, Cyberpunk Neon Design System, WebSockets.
- **Android App:** Kotlin, Jetpack Compose, Android Foreground Microphone Service, MediaProjection Screen Capture.
- **Local AI Engine:** Ollama with Google Gemma 3 4B.

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
ollama list

# If gemma3:4b is not yet downloaded:
ollama run gemma3:4b "Say 'Ramya AI online'"
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
```

---

## 5. Launching Ramya AI

### Option A: One-Click Startup Script (PowerShell)
```powershell
.\scripts\run_assistant.ps1
```

### Option B: Manual Service Launch
```powershell
# Terminal 1: Backend API
cd services/assistant-api
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2: Desktop Command Center
cd apps/desktop
npm run dev
```

- **Desktop UI:** `http://127.0.0.1:5173`
- **Backend API & Swagger Docs:** `http://127.0.0.1:8000/docs`
- **Health Endpoint:** `http://127.0.0.1:8000/api/health`

---

## 6. Running Automated Tests

All automated tests verify real services, SQLite schemas, command routing, security permissions, document chunking, and speech synthesis:

```powershell
# Run backend pytest suite (21 unit & integration tests)
$env:PYTHONPATH = "services/assistant-api"
python -m pytest services/assistant-api/tests -v

# Run desktop UI build verification
cd apps/desktop
npm run build
```

---

## 7. Security and Privacy Policy

1. **Local-First Execution:** Your personal voice audio and indexed documents are processed locally. Documents are never uploaded to third-party cloud services without explicit configuration.
2. **Deterministic Allowlist:** Shell commands and dangerous OS operations are restricted to verified allowlisted applications. Model output is treated as untrusted data and cannot override application permission gates.
3. **Four-Tier Permission Model:** High-risk actions (initiating phone calls, deleting tasks/documents) strictly require interactive confirmation from the user.
4. **Emergency Stop:** Immediate kill switch available in the Automation Center and via voice command ("Stop speaking", "Stop listening").
