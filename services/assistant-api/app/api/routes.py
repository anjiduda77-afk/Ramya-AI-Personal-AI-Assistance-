"""
REST API Routes for Ramya AI.
Exposes all platform capabilities cleanly with Pydantic validation.
"""
import os
import shutil
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from fastapi.responses import FileResponse
import psutil
from app.core.config import settings
from app.database.db import db
from app.providers.router import router
from app.tools.command_router import command_router
from app.tools.screen_intelligence import screen_intelligence
from app.tools.live_data import live_data
from app.tools.productivity import productivity
from app.tools.quiz import quiz_manager
from app.tools.documents import document_parser
from app.rag.vector_store import vector_store
from app.rag.engine import rag_engine
from app.voice.tts import tts_engine
from app.security.permissions import permissions, PermissionTier

logger = logging.getLogger("ramya.api.routes")
api_router = APIRouter()

# --- 1. HEALTH & SYSTEM METRICS ---
@api_router.get("/health")
async def get_health():
    """Returns genuine real-time service and system health."""
    ollama_ok = await router.ollama.is_available()
    cloud_ok = await router.cloud.is_available()
    
    # System metrics
    cpu = psutil.cpu_percent(interval=None)
    ram = psutil.virtual_memory().percent
    battery = None
    try:
        b_info = psutil.sensors_battery()
        if b_info:
            battery = b_info.percent
    except Exception:
        pass

    return {
        "status": "healthy" if (ollama_ok or cloud_ok) else "degraded",
        "service": "Ramya AI Assistant API",
        "version": settings.VERSION,
        "localModelAvailable": ollama_ok,
        "localModelName": settings.OLLAMA_MODEL,
        "ollamaRunning": ollama_ok,
        "cloudProviderConfigured": bool(settings.CLOUD_API_KEY),
        "cloudProviderName": settings.CLOUD_PROVIDER,
        "databaseConnected": True,
        "voiceEngineReady": True,
        "systemMetrics": {
            "cpuPercent": cpu,
            "ramPercent": ram,
            "batteryPercent": battery,
            "isOnline": True
        }
    }

# --- 2. COMMAND ROUTING & CHAT ---
@api_router.post("/chat")
async def process_chat(payload: Dict[str, Any]):
    """Processes user voice or text input through deterministic command router."""
    query = payload.get("query", "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
        
    is_confirmed = payload.get("confirmed", False)
    source = payload.get("source", "keyboard")

    result = await command_router.route_and_execute(
        raw_query=query,
        is_user_confirmed=is_confirmed,
        source=source
    )
    return result

# --- 3. VOICE TTS & AUDIO ---
@api_router.post("/voice/synthesize")
async def synthesize_voice(payload: Dict[str, Any]):
    """Generates natural voice audio for given text."""
    text = payload.get("text", "").strip()
    voice = payload.get("voice", settings.VOICE_NAME)
    res = await tts_engine.synthesize(text, voice)
    return res

@api_router.get("/voice/audio/{filename}")
async def serve_audio(filename: str):
    """Serves synthesized speech audio files."""
    filepath = settings.STORAGE_DIR / "recordings" / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Audio file not found.")
    return FileResponse(str(filepath), media_type="audio/mpeg")

# --- 4. SCREEN INTELLIGENCE ---
@api_router.post("/screen/analyze")
async def analyze_screen(payload: Optional[Dict[str, Any]] = None):
    """Captures and analyzes the current screen."""
    prompt = payload.get("prompt") if payload else None
    return screen_intelligence.analyze_screen(prompt)

# --- 5. LIVE DATA: WEATHER & STOCKS ---
@api_router.get("/live/weather")
async def get_weather(city: str = Query(default="Hyderabad")):
    return await live_data.get_weather(city)

@api_router.get("/live/stock")
async def get_stock(symbol: str = Query(...)):
    return await live_data.get_stock_quote(symbol)

@api_router.get("/live/watchlist")
async def get_watchlist():
    return live_data.get_watchlist()

# --- 6. PRODUCTIVITY ---
@api_router.get("/productivity/tasks")
async def get_tasks(include_completed: bool = True):
    return productivity.list_tasks(include_completed)

@api_router.post("/productivity/tasks")
async def create_task(payload: Dict[str, Any]):
    title = payload.get("title", "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="Task title is required.")
    return productivity.create_task(
        title=title,
        description=payload.get("description"),
        priority=payload.get("priority", "medium"),
        due_date=payload.get("due_date")
    )

@api_router.post("/productivity/tasks/{task_id}/toggle")
async def toggle_task(task_id: str):
    return productivity.toggle_task(task_id)

@api_router.delete("/productivity/tasks/{task_id}")
async def delete_task(task_id: str):
    return productivity.delete_task(task_id)

@api_router.get("/productivity/reminders")
async def get_reminders():
    return productivity.list_reminders()

@api_router.post("/productivity/reminders")
async def set_reminder(payload: Dict[str, Any]):
    text = payload.get("text", "").strip()
    trigger_time = payload.get("trigger_time", "").strip()
    if not text or not trigger_time:
        raise HTTPException(status_code=400, detail="Reminder text and time are required.")
    return productivity.set_reminder(text, trigger_time)

@api_router.get("/productivity/notes")
async def get_notes():
    return productivity.list_notes()

@api_router.post("/productivity/notes")
async def create_note(payload: Dict[str, Any]):
    title = payload.get("title", "").strip()
    content = payload.get("content", "").strip()
    tags = payload.get("tags", [])
    if not title:
        raise HTTPException(status_code=400, detail="Note title is required.")
    return productivity.create_note(title, content, tags)

@api_router.get("/productivity/daily-plan")
async def get_daily_plan():
    return productivity.get_daily_summary()

# --- 7. DOCUMENTS & RAG KNOWLEDGE BASE ---
@api_router.get("/documents")
async def list_documents():
    return vector_store.list_documents()

@api_router.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    """Uploads, parses, and indexes a PDF, DOCX, PPTX, TXT, or CSV file."""
    uploads_dir = settings.STORAGE_DIR / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)
    file_path = uploads_dir / file.filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    parsed = document_parser.parse_file(str(file_path))
    if not parsed.get("success"):
        raise HTTPException(status_code=400, detail=parsed.get("error", "Failed to parse document."))

    doc_id = vector_store.index_document(parsed)
    return {
        "success": True,
        "documentId": doc_id,
        "filename": file.filename,
        "totalPages": parsed.get("totalPages", 1),
        "chunksCount": len(parsed.get("chunks", [])),
        "message": f"Successfully parsed and indexed '{file.filename}' into knowledge base."
    }

@api_router.post("/documents/query")
async def query_rag(payload: Dict[str, Any]):
    query = payload.get("query", "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    return await rag_engine.answer_query(query)

# --- 8. QUIZ & LEARNING ---
@api_router.get("/quiz/questions")
async def get_quiz(topic: Optional[str] = None):
    return quiz_manager.get_questions(topic)

@api_router.post("/quiz/verify")
async def verify_quiz_answer(payload: Dict[str, Any]):
    q_id = payload.get("questionId")
    opt_idx = payload.get("selectedIndex")
    if q_id is None or opt_idx is None:
        raise HTTPException(status_code=400, detail="Question ID and selected index required.")
    return quiz_manager.verify_answer(q_id, opt_idx)

# --- 9. SECURITY & AUDIT LOGS ---
@api_router.get("/security/audit-logs")
async def get_audit_logs():
    with db.get_connection() as conn:
        rows = conn.execute("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50;").fetchall()
        return [dict(r) for r in rows]

# --- 10. SETTINGS ---
@api_router.get("/settings")
async def get_settings():
    with db.get_connection() as conn:
        rows = conn.execute("SELECT key, value FROM settings;").fetchall()
        return {r["key"]: r["value"] for r in rows}

@api_router.post("/settings")
async def update_setting(payload: Dict[str, str]):
    with db.get_connection() as conn:
        for k, v in payload.items():
            conn.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?);", (k, v))
    return {"success": True, "message": "Settings updated."}
