# RAMYA AI — SECURITY, PRIVACY & ISOLATION ARCHITECTURE

**Document Version:** 1.1.0  
**Status:** Enforced  
**Applies To:** Windows Desktop, Android Companion, Backend Core  

---

## 1. Core Security Principle: Strict Frontend-Backend Separation

Ramya AI is designed from the ground up on the principle of **Zero-Leakage Client Isolation**. Ordinary users and client-facing interfaces (desktop web views, Android activities, local browser tabs) only ever observe what the assistant is doing and verified user-centric outcomes—never internal system prompts, model names, provider routing rules, raw tool execution stacks, or private credentials.

### Protected Server-Side Artifacts
The following parameters are strictly confined to the backend process or protected local storage and are never sent over public API responses:
- System prompts, reasoning instructions, and wake-phrase thresholds.
- Dynamic command routing heuristics and regex definitions.
- Local model names (e.g., Gemma 3 4B) and cloud provider API keys (OpenAI / Gemini).
- SQLite connection handles, migration tables, and raw database schemas.
- Raw file system paths (`C:\mern stack\mernpro\ramya\...`).
- Internal stack traces and Python exception dumps.
- Privileged action authorization gates and token hashes.

---

## 2. Clean Public API Specifications

All communication between the interface and assistant services passes through validated Pydantic and TypeScript contracts:

```json
{
  "status": "success",
  "message": "Chrome is ready.",
  "spoken_response": "Chrome is ready.",
  "task_id": "task-7b3e921d",
  "intent": "system_app",
  "card": null,
  "sources": [],
  "requires_approval": false,
  "approval_prompt": null,
  "timestamp": "2026-10-24T11:40:00"
}
```

### Sanitized Health Telemetry
The public endpoint `/api/health` exposes only user-centric readiness flags (`status: "ready"`, `voiceReady: true`, `storageReady: true`, CPU/RAM utilization) without revealing vendor names, model parameter counts, or infrastructure URLs.

---

## 3. Four-Tier Permission Model

Every system action and tool invocation must clear Ramya AI's Central Permission Manager (`app.security.permissions.PermissionManager`):

| Risk Tier | Capabilities / Tools | Authorization Gate |
| :--- | :--- | :--- |
| **Tier 1: Read-Only** | Weather, stock telemetry, list tasks, document search, system health | Automatic execution, zero persistence risk |
| **Tier 2: Low-Risk** | Allowlisted app launch, media volume/pause, add task, schedule reminder | Low-impact user productivity; auditable |
| **Tier 3: Medium-Risk** | Screen capture, OCR text extraction, write note, update preferences | Requires explicit user action or voice intent |
| **Tier 4: High-Risk** | Delete task, purge local database, delete documents, dial telephone | **Hard Confirmation Gate Required** |

### Confirmation Gates
High-risk actions cannot execute autonomously. If a user says `"Delete all my tasks"` or `"Purge conversation history"`, the assistant halts execution and sets `requires_approval: true` with a clear explanation (`approval_prompt`). Execution proceeds only after an explicit user confirmation token is received.

---

## 4. Local Desktop IPC & Application Allowlisting

To prevent arbitrary command injection and remote code execution:
1. **Narrow Allowlist:** The assistant can only open allowlisted desktop applications (`chrome`, `edge`, `notepad`, `calculator`, `explorer`, `vscode`, `terminal`, `youtube`, `spotify`).
2. **Blocked Dangerous Tokens:** The permission manager monitors command arguments and immediately halts and audits any query containing destructive tokens (`rmdir /s`, `del /f`, `format `, `powershell -enc`, `curl `, `invoke-webrequest`).
3. **No Shell Pipe to Frontend:** The frontend has zero access to unrestricted terminal command execution or native OS pipes.

---

## 5. Offline-First Privacy Guarantee

1. **Local Model Execution:** General conversational queries, study notes, document summaries, and deterministic system actions execute 100% locally using Gemma 3 4B on Ollama and SQLite.
2. **Offline-Only Mode:** In Settings, users can activate the **Offline-Only Shield**. When enabled, outbound cloud requests are physically blocked at the adapter level.
3. **Opt-in Cloud Reasoning:** Cloud intelligence (OpenAI API / Gemini API) requires explicit user consent and an approved API key. Complete private documents are never uploaded to third-party cloud servers without user authorization.

---

## 6. Two-Layer Configuration & Developer Gate

Settings are physically partitioned into two security layers:

1. **Ordinary User Settings (Public):**
   - Wake phrase selection ("Hey Ramya", "Hello Ramya", "Ramya").
   - Voice selection (Indian English Female / Male), volume, and speed.
   - Cyberpunk theme and animation intensity.
   - Privacy Shield: Offline-Only mode and Screen understanding permissions.
   - Local Data Management: One-click "Purge Conversation History & Cache".
2. **Developer Configuration (Protected):**
   - Backend service endpoints, model routing, database paths, and raw diagnostic logs.
   - **Enforcement:** Protected by a secure Developer Gate (`/api/developer/unlock`). Access requires an authenticated SHA-256 passcode session token. Unauthorized requests receive `HTTP 403 Forbidden`.

---

## 7. Android Companion Security

1. **Foreground Service Notice:** Microphone listening on Android operates strictly as a declared foreground service (`FOREGROUND_SERVICE_MICROPHONE`) with a persistent, non-dismissible notification to guarantee total user awareness.
2. **MediaProjection Screen Consent:** Screen capture requires Android system authorization via `MediaProjectionManager.createScreenCaptureIntent()` for every session.
3. **Private App Storage:** Local databases and voice cache are stored inside application-private sandboxed directories (`context.filesDir` / SQLite) inaccessible to other Android apps.

---

## 8. Immutable Security Audit Trail

Every tool execution, permission grant, rejection, and confirmation is logged into SQLite table `audit_logs`:
- Unique log ID (UUIDv4)
- Tool name & permission tier
- Execution status (`success`, `denied`, `pending`, `failed`)
- Contextual details (with arguments sanitized of secrets)
- Timestamp
Users can view or purge the audit log at any time from Settings.
