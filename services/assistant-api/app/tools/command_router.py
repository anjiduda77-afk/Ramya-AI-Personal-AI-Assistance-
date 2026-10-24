"""
Deterministic Smart Command Router for Ramya AI.
Dispatches voice and text commands to allowlisted local tools or the local LLM.
Returns clean public response schemas conforming to the PublicAssistantResponse contract.
"""
import re
import time
import uuid
import logging
from typing import Dict, Any, Optional, List
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
from app.memory.engine import memory_engine
from app.tools.english_tutor import english_tutor
from app.tools.music_player import music_player
from app.tools.web_search import web_search_engine

logger = logging.getLogger("ramya.tools.router")

STOP_WORDS = {"for", "to", "me", "today", "tomorrow", "this", "that", "the", "a", "an", "is", "it", "my", "your", "now", "please"}

class CommandRouter:
    async def route_and_execute(
        self,
        raw_query: str,
        is_user_confirmed: bool = False,
        source: str = "voice"
    ) -> Dict[str, Any]:
        """
        Processes and routes a voice or text command.
        Returns a clean public response without internal implementation leaks.
        """
        start_time = time.time()
        task_id = f"task-{uuid.uuid4().hex[:10]}"
        
        # 1. Wake word extraction & normalization
        has_wake_word, wake_phrase, query = wake_word_detector.detect_in_text(raw_query)
        clean_q = query.strip()
        lower_q = clean_q.lower()

        # If query is empty after wake word (e.g. user just said "Hey Ramya")
        if not clean_q or clean_q in ["hey", "hello", "hi"]:
            spoken = "Yes! I am listening. How can I help you?"
            return self._build_response(
                task_id=task_id,
                query=raw_query,
                intent="conversation",
                spoken=spoken,
                message="Ramya is ready and listening. Speak a command or question.",
                status="success"
            )

        # 2. Fast Deterministic Matchers

        # --- A. Free and Legal Music Playback ---
        if re.search(r"\bplay\s+(?:(?:some\s+)?(relaxing|chill|lofi|ambient|classical|nature|calm|study|focus)\s+)?(music|song|beats?|tracks?)\b", lower_q):
            m_res = music_player.play_music(clean_q)
            return self._build_response(
                task_id=task_id,
                query=clean_q,
                intent="media_control",
                spoken=m_res["spoken_response"],
                message=m_res["message"],
                card={"type": "media", "title": "Legal Music Playback", "data": m_res["track"]}
            )

        # --- Media Controls ---
        media_patterns = {
            r"\b(pause|stop)\s+(the\s+)?(music|song|playback|media)\b": "pause",
            r"\b(resume)\s+(the\s+)?(music|song|playback|media)\b": "play",
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
                action_clean = action.replace('_', ' ')
                spoken = f"Media {action_clean}."
                return self._build_response(
                    task_id=task_id,
                    query=clean_q,
                    intent="media_control",
                    spoken=spoken,
                    message=tool_res.get("message", f"Media {action_clean} completed."),
                    card={"type": "media", "title": f"Media {action_clean.capitalize()}", "data": tool_res}
                )

        # Stop speaking / listening
        if re.search(r"\b(stop\s+speaking|shut\s+up|be\s+quiet|stop\s+talking)\b", lower_q):
            return self._build_response(
                task_id=task_id,
                query=clean_q,
                intent="media_control",
                spoken="Speech stopped.",
                message="Playback cancelled.",
                status="cancelled"
            )

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
                    user_msg = "Please allow access before I continue."
                    return self._build_response(
                        task_id=task_id,
                        query=clean_q,
                        intent="system_app",
                        spoken=user_msg,
                        message=user_msg,
                        status="needs_approval",
                        requires_approval=True,
                        approval_prompt=f"Approve launching {app_key.capitalize()}?"
                    )
                
                tool_res = desktop_control.open_app(app_key)
                spoken = f"{app_key.capitalize()} is ready." if tool_res["success"] else f"Could not open {app_key}."
                return self._build_response(
                    task_id=task_id,
                    query=clean_q,
                    intent="system_app",
                    spoken=spoken,
                    message=spoken,
                    status="success" if tool_res["success"] else "attention_required"
                )

        # --- C. Screen Intelligence ---
        if re.search(r"\b(analyze|analyse|read|inspect|what\s+is\s+on)\s+(the\s+|my\s+)?screen\b|\btake\s+(a\s+)?screenshot\b", lower_q):
            is_allowed, reason, tier = permissions.validate_action("capture_screen", {}, is_user_confirmed)
            if not is_allowed:
                user_msg = "Please allow screen access before I continue."
                return self._build_response(
                    task_id=task_id,
                    query=clean_q,
                    intent="screen_analysis",
                    spoken=user_msg,
                    message=user_msg,
                    status="needs_approval",
                    requires_approval=True,
                    approval_prompt="Allow Ramya AI to capture and inspect the active screen?"
                )
            
            analysis = screen_intelligence.analyze_screen()
            spoken = f"Screen captured. You are currently viewing {analysis['active_window']}."
            return self._build_response(
                task_id=task_id,
                query=clean_q,
                intent="screen_analysis",
                spoken=spoken,
                message=analysis.get("summary", spoken),
                card={"type": "screen", "title": "Screen Insights", "data": analysis}
            )

        # --- D. Live Weather ---
        weather_match = re.search(r"\b(weather|temperature)\b(?:\s+in\s+([a-zA-Z\s]+))?", lower_q)
        if weather_match and not any(k in lower_q for k in ["whether", "weathering"]):
            city = weather_match.group(2) or "Hyderabad"
            w_res = await live_data.get_weather(city.strip())
            spoken = w_res.get("message", "Unable to retrieve weather.")
            return self._build_response(
                task_id=task_id,
                query=clean_q,
                intent="live_info",
                spoken=spoken,
                message=spoken,
                card={"type": "weather", "title": f"Weather in {city.strip().capitalize()}", "data": w_res}
            )

        # --- E. Stock Market Quotes (Precise Financial Matcher) ---
        stock_match = re.search(
            r"\b(?:stock\s+price|market\s+price|share\s+price|shares?\s+of)\s+(?:for\s+)?([a-zA-Z0-9\.\^]+)\b|"
            r"\b(?:stock|quote)\s+(?:for\s+|of\s+)?([A-Z0-9\.\^]{2,8})\b|"
            r"\bprice\s+of\s+([a-zA-Z0-9\.\^]+)\s+(?:stock|shares?)\b",
            clean_q
        )
        if stock_match:
            symbol_raw = stock_match.group(1) or stock_match.group(2) or stock_match.group(3)
            if symbol_raw and symbol_raw.lower() not in STOP_WORDS:
                symbol = symbol_raw.upper()
                if not symbol.endswith(".NS") and symbol in ["RELIANCE", "TCS", "INFY", "WIPRO", "HDFC"]:
                    symbol = f"{symbol}.NS"
                s_res = await live_data.get_stock_quote(symbol)
                spoken = s_res.get("message", "Market data unavailable.")
                return self._build_response(
                    task_id=task_id,
                    query=clean_q,
                    intent="live_info",
                    spoken=spoken,
                    message=spoken,
                    card={"type": "stock", "title": f"{symbol} Quote", "data": s_res}
                )

        # --- F. Productivity: Tasks, Reminders & Daily Summary ---
        if re.search(r"\b(show|view|list)\s+(my\s+)?(tasks|to\s*dos)\b", lower_q):
            tasks = productivity.list_tasks()
            pending = sum(1 for t in tasks if not t["is_completed"])
            spoken = f"You have {pending} pending task{'s' if pending != 1 else ''}."
            return self._build_response(
                task_id=task_id,
                query=clean_q,
                intent="productivity",
                spoken=spoken,
                message=f"Total tasks: {len(tasks)}",
                card={"type": "task", "title": "Your Tasks", "data": {"tasks": tasks}}
            )

        task_create_match = re.search(r"\b(add|create)\s+task\s+(.+)", clean_q, re.IGNORECASE)
        if task_create_match:
            task_title = task_create_match.group(2).strip()
            res = productivity.create_task(title=task_title)
            spoken = f"Task added: {task_title}."
            return self._build_response(
                task_id=task_id,
                query=clean_q,
                intent="productivity",
                spoken=spoken,
                message=res.get("message", spoken),
                card={"type": "task", "title": "Task Created", "data": res}
            )

        reminder_match = re.search(r"\bremind\s+me\s+to\s+(.+?)(?:\s+at\s+(.+))?$", clean_q, re.IGNORECASE)
        if reminder_match:
            text = reminder_match.group(1).strip()
            trig_time = reminder_match.group(2).strip() if reminder_match.group(2) else "7:00 PM"
            res = productivity.set_reminder(text=text, trigger_time=trig_time)
            spoken = f"Reminder set: {text} at {trig_time}."
            return self._build_response(
                task_id=task_id,
                query=clean_q,
                intent="productivity",
                spoken=spoken,
                message=res.get("message", spoken),
                card={"type": "reminder", "title": "Reminder Scheduled", "data": res}
            )

        if re.search(r"\b(daily\s+plan|daily\s+summary|plan\s+for\s+today)\b", lower_q):
            summary = productivity.get_daily_summary()
            spoken = summary["message"]
            return self._build_response(
                task_id=task_id,
                query=clean_q,
                intent="productivity",
                spoken=spoken,
                message=spoken,
                card={"type": "task", "title": "Daily Plan", "data": summary}
            )

        # --- Personal Memory: Explicit Storage ("Remember that...", "Remember my...", "Don't forget that...") ---
        explicit_mem = memory_engine.extract_and_save_explicit_memory(clean_q)
        if explicit_mem:
            spoken = f"Saved to memory: {explicit_mem['content']}."
            return self._build_response(
                task_id=task_id,
                query=clean_q,
                intent="productivity",
                spoken=spoken,
                message=f"Saved to personal memory [{explicit_mem['category']}]:\n\n\"{explicit_mem['content']}\"",
                card={"type": "task", "title": "Memory Saved", "data": explicit_mem}
            )

        # Personal Memory: Recall / Show Memories
        if re.search(r"\b(what\s+do\s+you\s+remember|show\s+(my\s+)?memories|list\s+(my\s+)?memories|read\s+(my\s+)?memories)\b", lower_q):
            memories = memory_engine.list_memories()
            spoken = f"You have {len(memories)} stored memories."
            return self._build_response(
                task_id=task_id,
                query=clean_q,
                intent="productivity",
                spoken=spoken,
                message=f"You have {len(memories)} stored memories.",
                card={"type": "task", "title": "Personal Memories", "data": {"memories": memories}}
            )

        # Productivity: Read Notes ("Read my notes", "Show notes")
        if re.search(r"\b(read|show|view|list)\s+(my\s+)?notes\b", lower_q):
            notes = productivity.list_notes()
            spoken = f"You have {len(notes)} saved notes."
            return self._build_response(
                task_id=task_id,
                query=clean_q,
                intent="productivity",
                spoken=spoken,
                message=f"Total notes: {len(notes)}",
                card={"type": "task", "title": "Your Notes", "data": {"notes": notes}}
            )

        # --- English Learning Tutor: Revision Request ("Repeat yesterday's English lesson") ---
        if re.search(r"\b(repeat|revise)\s+(?:yesterday['’]?s\s+)?(?:english\s+)?lesson\b", lower_q):
            rev_res = english_tutor.process_choice("revise")
            return self._build_response(
                task_id=task_id,
                query=clean_q,
                intent="quiz_learning",
                spoken=rev_res["spoken_response"],
                message=rev_res["message"],
                card={"type": "quiz", "title": "English Lesson Revision", "data": rev_res}
            )

        # English Learning Tutor: Daily Practice / Start Session
        if re.search(r"\b(learn\s+english|teach\s+me\s+english|english\s+lesson|daily\s+english|english\s+practice)\b", lower_q):
            sess_res = english_tutor.start_or_check_daily_session()
            return self._build_response(
                task_id=task_id,
                query=clean_q,
                intent="quiz_learning",
                spoken=sess_res["spoken_response"],
                message=sess_res["message"],
                card={"type": "quiz", "title": "English Learning Session", "data": sess_res}
            )

        # Telugu Speech / Voice Translation to Natural English
        if (
            re.search(r"\b(?:tell\s+(?:my\s+friend|them|him|her)\s+in\s+english\s+that|say\s+in\s+english|translate\s+(?:this\s+)?to\s+english)\b", lower_q)
            or bool(re.search(r"[\u0C00-\u0C7F]", clean_q))
        ):
            trans = english_tutor.translate_telugu_or_intent_to_natural_english(clean_q)
            spoken = trans["natural_english"]
            message = (
                f"**Natural English:** \"{trans['natural_english']}\"\n\n"
                f"💡 {trans['explanation']}"
            )
            return self._build_response(
                task_id=task_id,
                query=clean_q,
                intent="conversation",
                spoken=spoken,
                message=message,
                card={"type": "quiz", "title": "Natural English Translation", "data": trans}
            )

        # --- G. Quiz & Learning ---
        if re.search(r"\b(start|take|run)\s+(a\s+)?quiz\b|\bquiz\s+me\b", lower_q):
            questions = quiz_manager.get_questions()
            spoken = "Starting quiz. Here is your first question."
            return self._build_response(
                task_id=task_id,
                query=clean_q,
                intent="quiz_learning",
                spoken=spoken,
                message="Quiz mode activated.",
                card={"type": "quiz", "title": "Interactive Quiz", "data": {"questions": questions}}
            )

        # --- H. Grounded Document Search (RAG) ---
        if re.search(r"\b(search\s+documents|in\s+my\s+documents|from\s+the\s+pdf|document\s+search)\b", lower_q):
            rag_res = await rag_engine.answer_query(clean_q)
            spoken = rag_res["answer"]
            sources = []
            for c in rag_res.get("citations", []):
                ref = f"Page {c.get('pageOrSlideNumber', 1)}" if c.get("pageOrSlideNumber") else None
                sources.append({
                    "title": c.get("filename", "Document"),
                    "reference": ref,
                    "snippet": c.get("snippet", "")
                })
            return self._build_response(
                task_id=task_id,
                query=clean_q,
                intent="document_task",
                spoken=spoken,
                message=spoken,
                sources=sources,
                card={"type": "document", "title": "Document Insights", "data": rag_res}
            )

        # --- Web Search: Instant Knowledge Lookup ---
        s_match = re.search(r"\b(?:search\s+(?:the\s+web\s+|google\s+)?for|look\s*up|who\s+is|what\s+is\s+the\s+capital\s+of)\s+(.+)", clean_q, re.IGNORECASE)
        if s_match and not any(k in lower_q for k in ["weather", "temperature", "stock", "shares", "screen", "document", "task", "reminder", "quiz", "lesson"]):
            s_query = s_match.group(1).strip()
            search_res = await web_search_engine.search(s_query)
            if search_res.get("status") == "success":
                return self._build_response(
                    task_id=task_id,
                    query=clean_q,
                    intent="live_info",
                    spoken=search_res.get("spoken_response", search_res["snippet"][:200]),
                    message=f"**{search_res['title']}**\n\n{search_res['snippet']}\n\n*Source: [{search_res['source']}]({search_res.get('url', '')})*",
                    card={"type": "screen", "title": search_res["title"], "data": search_res}
                )

        # --- I. General Conversational Intelligence: Local First ---
        response_text, provider_name, model_name, is_offline = await router.generate(clean_q)
        
        # Keep spoken response concise (first 2 sentences) while detailed text contains full answer
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", response_text) if s.strip()]
        spoken = " ".join(sentences[:2]) if len(sentences) > 2 else response_text

        return self._build_response(
            task_id=task_id,
            query=raw_query,
            intent="conversation",
            spoken=spoken,
            message=response_text,
            status="success"
        )

    def _build_response(
        self,
        task_id: str,
        query: str,
        intent: str,
        spoken: str,
        message: str,
        status: str = "success",
        card: Optional[Dict[str, Any]] = None,
        sources: Optional[List[Dict[str, Any]]] = None,
        requires_approval: bool = False,
        approval_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """Builds clean public response schema without internal secrets or execution traces."""
        return {
            # Public standard fields
            "status": status,
            "message": message,
            "spoken_response": spoken,
            "task_id": task_id,
            "intent": intent,
            "card": card,
            "sources": sources or [],
            "requires_approval": requires_approval,
            "approval_prompt": approval_prompt,
            "timestamp": datetime.now().isoformat(),

            # Backward compatibility fields for legacy views & tests
            "id": task_id,
            "query": query,
            "spokenResponse": spoken,
            "detailedText": message,
            "toolResult": card.get("data") if card else None
        }

command_router = CommandRouter()
