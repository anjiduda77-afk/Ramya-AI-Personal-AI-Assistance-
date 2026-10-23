"""
Deterministic Smart Command Router for Ramya AI.
Dispatches voice and text commands to allowlisted local tools or the local LLM.
"""
import re
import time
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from app.voice.wake_word import wake_word_detector
from app.security.permissions import permissions, PermissionTier
from app.tools.desktop_control import desktop_control
from app.tools.screen_intelligence import screen_intelligence
from app.tools.live_data import live_data
from app.tools.productivity import productivity
from app.tools.quiz import quiz_manager
from app.rag.engine import rag_engine
from app.providers.router import router

logger = logging.getLogger("ramya.tools.router")

class CommandRouter:
    async def route_and_execute(
        self,
        raw_query: str,
        is_user_confirmed: bool = False,
        source: str = "voice"
    ) -> Dict[str, Any]:
        """
        Processes and routes a voice or text command.
        Returns a structured response conforming to the AssistantResponse contract.
        """
        start_time = time.time()
        
        # 1. Wake word extraction & normalization
        has_wake_word, wake_phrase, query = wake_word_detector.detect_in_text(raw_query)
        clean_q = query.strip()
        lower_q = clean_q.lower()

        # If query is empty after wake word (e.g. user just said "Hey Ramya")
        if not clean_q or clean_q in ["hey", "hello", "hi"]:
            return {
                "id": str(int(time.time() * 1000)),
                "query": raw_query,
                "intent": "conversation",
                "spokenResponse": "Yes! I am listening. How can I help you?",
                "detailedText": "Ramya AI is online and listening. Speak a command or ask a question.",
                "toolResult": None,
                "providerUsed": "deterministic_router",
                "modelUsed": "router-core",
                "isOffline": False,
                "executionTimeMs": int((time.time() - start_time) * 1000),
                "timestamp": datetime.now().isoformat()
            }

        # 2. Fast Deterministic Matchers

        # --- A. Media Controls ---
        media_patterns = {
            r"\b(pause|stop)\s+(the\s+)?(music|song|playback|media)\b": "pause",
            r"\b(play|resume)\s+(the\s+)?(music|song|playback|media)\b": "play",
            r"\b(next|skip)\s+(track|song|music)\b": "next",
            r"\b(previous|prev)\s+(track|song|music)\b": "previous",
            r"\b(mute|silence)\b": "mute",
            r"\b(unmute)\b": "unmute",
            r"\b(volume\s+up|increase\s+volume|louder)\b": "volume_up",
            r"\b(volume\s+down|decrease\s+volume|quieter)\b": "volume_down"
        }
        for pat, action in media_patterns.items():
            if re.search(pat, lower_q):
                tool_res = desktop_control.media_control(action)
                spoken = f"Media {action.replace('_', ' ')}."
                return self._build_response(clean_q, "media_control", spoken, tool_res["message"], tool_res, start_time)

        # Stop speaking / listening
        if re.search(r"\b(stop\s+speaking|shut\s+up|be\s+quiet|stop\s+talking)\b", lower_q):
            return self._build_response(clean_q, "media_control", "Speech stopped.", "Playback cancelled.", {"action": "stop_speaking"}, start_time)

        # --- B. Application Launching ---
        app_patterns = [
            (r"\bopen\s+(google\s+)?chrome\b", "chrome"),
            (r"\bopen\s+notepad\b", "notepad"),
            (r"\bopen\s+calculator\b", "calculator"),
            (r"\bopen\s+(vs\s*code|visual\s+studio\s+code|code\s+editor)\b", "vscode"),
            (r"\bopen\s+(file\s+explorer|files|explorer)\b", "explorer"),
            (r"\bopen\s+(terminal|powershell|cmd)\b", "terminal"),
            (r"\bopen\s+(youtube|yt)\b", "youtube"),
            (r"\bopen\s+spotify\b", "spotify")
        ]
        for pat, app_key in app_patterns:
            if re.search(pat, lower_q):
                is_allowed, reason, tier = permissions.validate_action("open_application", {"app_name": app_key}, is_user_confirmed)
                if not is_allowed:
                    return self._build_response(clean_q, "system_app", reason, reason, {"success": False, "requiresConfirmation": True}, start_time)
                
                tool_res = desktop_control.open_app(app_key)
                spoken = f"Opening {app_key.capitalize()}." if tool_res["success"] else f"Could not open {app_key}."
                return self._build_response(clean_q, "system_app", spoken, tool_res.get("message", ""), tool_res, start_time)

        # --- C. Screen Intelligence ---
        if re.search(r"\b(analyze|analyse|read|inspect|what\s+is\s+on)\s+(the\s+|my\s+)?screen\b|\btake\s+(a\s+)?screenshot\b", lower_q):
            is_allowed, reason, tier = permissions.validate_action("capture_screen", {}, is_user_confirmed)
            if not is_allowed:
                return self._build_response(clean_q, "screen_analysis", reason, reason, {"success": False}, start_time)
            
            analysis = screen_intelligence.analyze_screen()
            spoken = f"Screen captured. You are currently viewing {analysis['active_window']}."
            return self._build_response(clean_q, "screen_analysis", spoken, analysis["summary"], analysis, start_time)

        # --- D. Live Weather ---
        weather_match = re.search(r"\b(weather|temperature)\b(?:\s+in\s+([a-zA-Z\s]+))?", lower_q)
        if weather_match and not any(k in lower_q for k in ["whether", "weathering"]):
            city = weather_match.group(2) or "Hyderabad"
            w_res = await live_data.get_weather(city.strip())
            spoken = w_res.get("message", "Unable to retrieve weather.")
            return self._build_response(clean_q, "live_info", spoken, spoken, w_res, start_time)

        # --- E. Stock Market Quotes ---
        stock_match = re.search(r"\b(stock|price|quote|shares?\s+of)\s+([a-zA-Z0-9\.\^]+)\b", lower_q)
        if stock_match:
            symbol = stock_match.group(2).upper()
            if not symbol.endswith(".NS") and symbol in ["RELIANCE", "TCS", "INFY", "WIPRO", "HDFC"]:
                symbol = f"{symbol}.NS"
            s_res = await live_data.get_stock_quote(symbol)
            spoken = s_res.get("message", "Market data unavailable.")
            return self._build_response(clean_q, "live_info", spoken, spoken, s_res, start_time)

        # --- F. Productivity: Tasks, Reminders & Daily Summary ---
        if re.search(r"\b(show|view|list)\s+(my\s+)?(tasks|to\s*dos)\b", lower_q):
            tasks = productivity.list_tasks()
            pending = sum(1 for t in tasks if not t["is_completed"])
            spoken = f"You have {pending} pending task{'s' if pending != 1 else ''}."
            return self._build_response(clean_q, "productivity", spoken, f"Total tasks: {len(tasks)}", {"tasks": tasks}, start_time)

        task_create_match = re.search(r"\b(add|create)\s+task\s+(.+)", clean_q, re.IGNORECASE)
        if task_create_match:
            task_title = task_create_match.group(2).strip()
            res = productivity.create_task(title=task_title)
            spoken = f"Task added: {task_title}."
            return self._build_response(clean_q, "productivity", spoken, res["message"], res, start_time)

        reminder_match = re.search(r"\bremind\s+me\s+to\s+(.+?)(?:\s+at\s+(.+))?$", clean_q, re.IGNORECASE)
        if reminder_match:
            text = reminder_match.group(1).strip()
            trig_time = reminder_match.group(2).strip() if reminder_match.group(2) else "7:00 PM"
            res = productivity.set_reminder(text, trig_time)
            spoken = f"Reminder set for {text} at {trig_time}."
            return self._build_response(clean_q, "productivity", spoken, res["message"], res, start_time)

        if re.search(r"\b(daily\s+plan|daily\s+summary|plan\s+for\s+today)\b", lower_q):
            summary = productivity.get_daily_summary()
            spoken = summary["message"]
            return self._build_response(clean_q, "productivity", spoken, spoken, summary, start_time)

        # --- G. Quiz & Learning ---
        if re.search(r"\b(start|take|run)\s+(a\s+)?quiz\b|\bquiz\s+me\b", lower_q):
            questions = quiz_manager.get_questions()
            spoken = "Starting quiz. Here is your first question."
            return self._build_response(clean_q, "quiz_learning", spoken, "Quiz mode activated.", {"questions": questions}, start_time)

        # --- H. Grounded Document Search (RAG) ---
        if re.search(r"\b(search\s+documents|in\s+my\s+documents|from\s+the\s+pdf|document\s+search)\b", lower_q):
            rag_res = await rag_engine.answer_query(clean_q)
            spoken = rag_res["answer"]
            return self._build_response(clean_q, "document_task", spoken, rag_res["answer"], rag_res, start_time, provider="rag")

        # --- I. General Conversational Question: Local Gemma 3 4B via Ollama ---
        response_text, provider_name, model_name, is_offline = await router.generate(clean_q)
        
        # Keep spoken response concise (first 2 sentences) while detailed text contains full answer
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", response_text) if s.strip()]
        spoken = " ".join(sentences[:2]) if len(sentences) > 2 else response_text

        return {
            "id": str(int(time.time() * 1000)),
            "query": raw_query,
            "intent": "conversation",
            "spokenResponse": spoken,
            "detailedText": response_text,
            "toolResult": None,
            "providerUsed": provider_name,
            "modelUsed": model_name,
            "isOffline": is_offline,
            "executionTimeMs": int((time.time() - start_time) * 1000),
            "timestamp": datetime.now().isoformat()
        }

    def _build_response(
        self,
        query: str,
        intent: str,
        spoken: str,
        detailed: str,
        tool_result: Dict[str, Any],
        start_time: float,
        provider: str = "deterministic_router"
    ) -> Dict[str, Any]:
        return {
            "id": str(int(time.time() * 1000)),
            "query": query,
            "intent": intent,
            "spokenResponse": spoken,
            "detailedText": detailed,
            "toolResult": tool_result,
            "providerUsed": provider,
            "modelUsed": "local-router",
            "isOffline": False,
            "executionTimeMs": int((time.time() - start_time) * 1000),
            "timestamp": datetime.now().isoformat()
        }

command_router = CommandRouter()
