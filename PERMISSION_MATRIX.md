# RAMYA AI — DEVICE CAPABILITY & PERMISSION MATRIX

**Document Version:** 1.0.0  
**Target Environments:** Windows 10/11 (Desktop Native), Android 10+ (Mobile Companion), Web UI  
**Security Standard:** Zero-Trust Execution Policy  

---

## 1. Master Capability Matrix

| Capability ID | Name & Description | Supported Platforms | Min OS Version | Required OS Permissions | Processing Mode | Risk Tier | Requires Confirmation | Default State | Fallback Behavior |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`microphone`** | Capture audio for speech recognition and wake-word | Windows, Android, Web | Windows 10 / Android 8+ | `RECORD_AUDIO`, `windows.microphone` | Local | Low Risk | No | **Enabled** | Fallback to keyboard text input |
| **`speech_recognition`** | Continuous Whisper STT & VAD | Windows, Android, Web | Windows 10 / Android 8+ | `RECORD_AUDIO` | Local | Low Risk | No | **Enabled** | Fallback to Web Speech API or text |
| **`screen_analysis`** | Active window title and authorized screen OCR | Windows | Windows 10 (19041+) | `windows.screen_capture` | Local | Medium Risk | No | **Enabled** | Report screen analysis disabled |
| **`camera_vision`** | Camera photo capture & document OCR | Windows, Android | Windows 10 / Android 9+ | `android.permission.CAMERA` | Local | Medium Risk | No | **Disabled** | Prompt user to enable camera |
| **`file_system`** | Local document search & indexing (PDF, DOCX, TXT) | Windows, Android | Windows 10 / Android 10+ | `READ_MEDIA_DOCUMENTS` | Local | Read-Only | No | **Enabled** | Search web or memory only |
| **`installed_apps`** | Allowlisted desktop & mobile app launcher | Windows, Android | Windows 10 / Android 8+ | None (Allowlisted) | Local | Low Risk | No | **Enabled** | Reject app launch request |
| **`notifications_alarms`**| System toasts, alarms, reminders, and tasks | Windows, Android, Web | Windows 10 / Android 8+ | `POST_NOTIFICATIONS` | Local | Low Risk | No | **Enabled** | In-app notification capsule |
| **`contacts_telephony`** | Direct phone calls & SMS via platform APIs | Android | Android 9+ | `CALL_PHONE`, `SEND_SMS` | Local | High Risk | **Yes (Hard Gate)** | **Disabled** | Require explicit confirmation |
| **`location_awareness`** | Regional context, local weather, sunrise times | Windows, Android | Windows 10 / Android 9+ | `ACCESS_FINE_LOCATION` | Hybrid | Medium Risk | No | **Disabled** | Default to configured city |
| **`media_control`** | Volume keys, play/pause, music streaming | Windows, Android | Windows 10 / Android 8+ | None (Native API) | Local | Low Risk | No | **Enabled** | Display media stream in UI |
| **`web_search`** | DuckDuckGo, Wikipedia, Open-Meteo live data | Windows, Android, Web | Any OS with Internet | None | Cloud | Read-Only | No | **Enabled** | Fallback to local memory / docs |
| **`cloud_ai`** | Cloud LLM reasoning (Gemini / OpenRouter) | Windows, Android, Web | Any OS with Internet | None | Cloud | Medium Risk | No | **Enabled** | Fallback to local Ollama / rule engine |
| **`local_ai`** | 100% offline LLM inference (Ollama / Gemma) | Windows | Windows 10 (x64) 8GB+ | None | Local | Read-Only | No | **Enabled** | Fallback to deterministic rules |
| **`task_scheduler`** | Scheduled autonomous workflows & file monitors | Windows, Android | Windows 10 / Android 8+ | None | Local | Medium Risk | No | **Enabled** | On-demand manual checking |

---

## 2. Platform Permission Alignment

### Windows 11 Desktop
- **Microphone**: Managed via `Settings > Privacy & security > Microphone`.
- **Screen Intelligence**: Desktop Duplication API / GDI capture confined to active display.
- **Application Allowlist**:
  - `chrome`: Google Chrome
  - `notepad`: Windows Notepad
  - `calculator`: Windows Calculator
  - `vscode`: Visual Studio Code
  - `powershell`: Windows Terminal

### Android Companion
- **Microphone**: Handled via Android runtime permission dialog (`requestPermissions([RECORD_AUDIO])`).
- **Telephony & SMS**: Declared in `AndroidManifest.xml` with runtime user prompt and in-app confirmation before dialer intent.
- **Background Work**: Implemented via `WorkManager` with battery optimization and network constraints.

---

## 3. Execution-Time Enforcement Mechanism

A UI switch alone is not a security boundary. In Ramya AI:
1. Every command processed by `CommandRouter` checks `CapabilityRegistry.is_capability_enabled(cap_id)`.
2. Every tool invocation passes through `ZeroTrustShield.validate_tool_execution(tool_name, arguments, is_user_confirmed)`.
3. If disabled:
   - Tool execution is immediately aborted.
   - Resource cleanup is invoked (`cleanup_resource(cap_id)`).
   - An immutable audit log entry is written with status `denied`.
   - The user receives a clear, polite explanation of the policy restriction.
