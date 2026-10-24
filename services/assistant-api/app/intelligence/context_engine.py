"""
Context Awareness & Multi-Turn Reference Resolver for Ramya AI.
Resolves pronoun references ("that one", "do it again", "continue", "what did I learn yesterday")
using current multi-turn conversation and SQLite persistence.
"""
import re
import logging
from typing import Dict, Any, Optional, Tuple
from app.database.db import db

logger = logging.getLogger("ramya.intelligence.context")

class ContextEngine:
    def get_context(self, session_id: str = "current") -> Dict[str, Any]:
        """Retrieves active conversation context from SQLite."""
        with db.get_connection() as conn:
            row = conn.execute(
                """
                SELECT session_id, last_user_query, last_assistant_response, last_intent,
                       active_entity, active_topic, last_action_tool, emotional_state,
                       clarification_pending, clarification_context, updated_at
                FROM conversation_context
                WHERE session_id = ?;
                """,
                (session_id,)
            ).fetchone()

            if not row:
                return {
                    "session_id": session_id,
                    "last_user_query": "",
                    "last_assistant_response": "Ramya AI is ready and listening.",
                    "last_intent": "conversation",
                    "active_entity": None,
                    "active_topic": None,
                    "last_action_tool": None,
                    "emotional_state": "neutral",
                    "clarification_pending": False,
                    "clarification_context": None
                }

            return {
                "session_id": row[0],
                "last_user_query": row[1] or "",
                "last_assistant_response": row[2] or "",
                "last_intent": row[3] or "conversation",
                "active_entity": row[4],
                "active_topic": row[5],
                "last_action_tool": row[6],
                "emotional_state": row[7] or "neutral",
                "clarification_pending": bool(row[8]),
                "clarification_context": row[9],
                "updated_at": row[10]
            }

    def update_context(
        self,
        query: str,
        response: str,
        intent: str,
        entity: Optional[str] = None,
        topic: Optional[str] = None,
        tool: Optional[str] = None,
        emotional_state: str = "neutral",
        session_id: str = "current"
    ):
        """Updates persistent conversation context after turn completion."""
        clean_q = query.strip()
        clean_r = response.strip()

        # If entity not explicitly provided, try extracting from query/response
        resolved_entity = entity
        if not resolved_entity:
            # Common patterns (e.g., weather city, stock symbol, track title)
            w_match = re.search(r"weather in ([a-zA-Z\s]+)", clean_q, re.I)
            if w_match:
                resolved_entity = w_match.group(1).strip()
            elif "lofi" in clean_q.lower() or "relaxing music" in clean_q.lower():
                resolved_entity = "Relaxing Audio Stream"

        with db.get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO conversation_context (
                    session_id, last_user_query, last_assistant_response, last_intent,
                    active_entity, active_topic, last_action_tool, emotional_state,
                    clarification_pending, clarification_context, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, CURRENT_TIMESTAMP);
                """,
                (
                    session_id,
                    clean_q,
                    clean_r,
                    intent,
                    resolved_entity or self.get_context(session_id).get("active_entity"),
                    topic or self.get_context(session_id).get("active_topic"),
                    tool,
                    emotional_state
                )
            )

    def resolve_reference(self, raw_query: str, session_id: str = "current") -> Tuple[str, Dict[str, Any]]:
        """
        Resolves pronouns, ellipsis, and follow-up commands like:
        - "that one" / "the other one"
        - "continue" / "tell me more" / "go on"
        - "do it again" / "repeat that"
        - "what did I learn yesterday"
        """
        clean = raw_query.strip()
        lower = clean.lower()
        context = self.get_context(session_id)
        resolved_query = clean
        metadata: Dict[str, Any] = {"was_resolved": False, "reference_type": None}

        # 1. "what did I learn yesterday" / "what did we learn yesterday"
        if re.search(r"\bwhat\s+(did\s+)?(i|we)\s+learn\s+(yesterday|last\s+time|earlier)\b", lower):
            with db.get_connection() as conn:
                lesson_row = conn.execute(
                    """
                    SELECT sentence_en, meaning_telugu, meaning_simple_en, lesson_day
                    FROM english_learning_records
                    ORDER BY last_reviewed DESC
                    LIMIT 1;
                    """
                ).fetchone()
                
                mem_rows = conn.execute(
                    """
                    SELECT content, category FROM user_memories
                    ORDER BY created_at DESC
                    LIMIT 3;
                    """
                ).fetchall()

            details = []
            if lesson_row:
                details.append(f"In English learning (Day {lesson_row[3]}), you practiced: \"{lesson_row[0]}\" (Telugu: {lesson_row[1]}).")
            if mem_rows:
                facts = "; ".join([r[0] for r in mem_rows])
                details.append(f"Recent facts saved to memory: {facts}.")

            summary_text = " ".join(details) if details else "You haven't completed any lessons yet. Say 'Learn English' to start your first lesson!"
            metadata["was_resolved"] = True
            metadata["reference_type"] = "learned_yesterday"
            metadata["direct_answer"] = summary_text
            return clean, metadata

        # 2. "do it again" / "repeat that" / "play it again"
        if re.search(r"^(?:please\s+)?(?:do\s+it\s+again|play\s+it\s+again|repeat\s+that|one\s+more\s+time)$", lower):
            if context["last_user_query"]:
                resolved_query = context["last_user_query"]
                metadata["was_resolved"] = True
                metadata["reference_type"] = "repeat_action"
                metadata["original_query"] = context["last_user_query"]
                return resolved_query, metadata
            elif context["last_assistant_response"]:
                metadata["was_resolved"] = True
                metadata["reference_type"] = "repeat_speech"
                metadata["direct_answer"] = context["last_assistant_response"]
                return clean, metadata

        # 3. "continue" / "go on" / "tell me more"
        if re.search(r"^(?:please\s+)?(?:continue|go\s+on|tell\s+me\s+more|explain\s+further)$", lower):
            last_resp = context.get("last_assistant_response", "")
            last_q = context.get("last_user_query", "")
            resolved_query = f"Please provide further details on: {last_q or last_resp[:100]}"
            metadata["was_resolved"] = True
            metadata["reference_type"] = "continue_topic"
            return resolved_query, metadata

        # 4. "that one" / "play that one" / "check that one"
        if re.search(r"\b(?:that\s+one|the\s+same\s+one)\b", lower):
            active_ent = context.get("active_entity")
            if active_ent:
                resolved_query = re.sub(r"\bthat\s+one\b", active_ent, clean, flags=re.IGNORECASE)
                metadata["was_resolved"] = True
                metadata["reference_type"] = "entity_pronoun"
                metadata["resolved_entity"] = active_ent
                return resolved_query, metadata

        # 5. Ellipsis follow-up questions (e.g. "What about tomorrow?", "And in Mumbai?")
        if re.search(r"^(?:what\s+about|and|how\s+about)\s+(.+)$", lower):
            prev_intent = context.get("last_intent")
            frag = re.search(r"^(?:what\s+about|and|how\s+about)\s+(.+)$", clean, re.I).group(1).strip()
            if prev_intent == "live_info" and "weather" in context.get("last_user_query", "").lower():
                resolved_query = f"What is the weather in {frag}?"
                metadata["was_resolved"] = True
                metadata["reference_type"] = "weather_followup"
                return resolved_query, metadata

        return clean, metadata

    def check_ambiguity_and_clarification(self, query: str) -> Optional[str]:
        """
        Determines whether a command is too ambiguous to execute safely,
        and provides a concise clarification question.
        """
        clean = query.strip()
        lower = clean.lower()

        # Vague app launch
        if lower in ["open it", "launch app", "open program"]:
            return "Which application would you like me to open? (e.g. Chrome, Notepad, Calculator, VS Code, Spotify)"

        # Vague search
        if lower in ["search", "find it", "look it up"]:
            return "What topic or question would you like me to search for?"

        # Vague reminder
        if lower in ["set a reminder", "remind me"]:
            return "What should I remind you about, and at what time?"

        # Vague delete
        if lower in ["delete it", "remove it", "clear"]:
            return "What would you like me to delete? You can delete tasks, notes, or stored memories."

        return None

context_engine = ContextEngine()
