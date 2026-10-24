"""
Personal Memory Engine for Ramya AI.
Provides persistent, user-controlled long-term memory stored securely in SQLite.
Keeps chat history and personal memory distinct, allows full CRUD, and provides
grounded context injection without fabricating unverified memories.
"""
import re
import uuid
import logging
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.database.db import db

logger = logging.getLogger("ramya.memory.engine")

class MemoryEngine:
    def __init__(self):
        pass

    def _resolve_contradictions(self, conn, new_content: str, category: str) -> List[str]:
        """
        Detects and supersedes contradictory or outdated memories.
        e.g., if old memory is 'User prefers light mode' and new is 'User prefers dark mode',
        the outdated memory is superseded so facts remain coherent.
        """
        superseded_ids = []
        lower_new = new_content.lower()

        subjects = ["theme", "mode", "color", "car", "city", "live in", "job", "coffee", "tea", "wake word"]
        detected_subject = None
        for s in subjects:
            if s in lower_new:
                detected_subject = s
                break

        if detected_subject:
            existing = conn.execute(
                """
                SELECT id, content FROM user_memories
                WHERE category = ? AND LOWER(content) LIKE ?;
                """,
                (category, f"%{detected_subject}%")
            ).fetchall()

            for old_id, old_content in existing:
                if old_content.strip().lower() != lower_new:
                    conn.execute("DELETE FROM user_memories WHERE id = ?;", (old_id,))
                    superseded_ids.append(old_id)
                    logger.info(f"Superseded contradictory memory [{old_id}]: '{old_content}' -> '{new_content}'")

        return superseded_ids

    def _queue_sync(self, table_name: str, record_id: str, action: str, payload: Dict[str, Any]):
        """Queues change into offline sync_outbox for Supabase synchronization."""
        try:
            with db.get_connection() as conn:
                conn.execute(
                    """
                    INSERT INTO sync_outbox (id, table_name, record_id, action, payload, status)
                    VALUES (?, ?, ?, ?, ?, 'pending');
                    """,
                    (f"sync-{uuid.uuid4().hex[:10]}", table_name, record_id, action, json.dumps(payload))
                )
        except Exception as e:
            logger.debug(f"Sync outbox write note: {e}")

    def save_memory(
        self,
        content: str,
        category: str = "general",
        importance: int = 3
    ) -> Dict[str, Any]:
        """Saves a new memory entry with contradiction resolution."""
        clean_content = content.strip()
        if not clean_content:
            raise ValueError("Memory content cannot be empty.")

        valid_categories = {"preference", "fact", "project", "learned_language", "note", "general"}
        cat = category.lower() if category.lower() in valid_categories else "general"
        imp = max(1, min(5, importance))
        memory_id = f"mem-{uuid.uuid4().hex[:10]}"
        now = datetime.now().isoformat()

        with db.get_connection() as conn:
            superseded = self._resolve_contradictions(conn, clean_content, cat)
            conn.execute(
                """
                INSERT INTO user_memories (id, category, content, importance, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?);
                """,
                (memory_id, cat, clean_content, imp, now, now)
            )

        entry = {
            "id": memory_id,
            "category": cat,
            "content": clean_content,
            "importance": imp,
            "superseded_ids": superseded,
            "created_at": now,
            "updated_at": now
        }
        self._queue_sync("user_memories", memory_id, "upsert", entry)
        logger.info(f"Saved memory [{memory_id}] category={cat}")
        return entry

    def list_memories(
        self,
        category: Optional[str] = None,
        query: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Lists stored memories with optional category filtering and search."""
        with db.get_connection() as conn:
            if category and query:
                rows = conn.execute(
                    """
                    SELECT id, category, content, importance, created_at, updated_at
                    FROM user_memories
                    WHERE category = ? AND content LIKE ?
                    ORDER BY importance DESC, created_at DESC
                    LIMIT ?;
                    """,
                    (category.lower(), f"%{query.strip()}%", limit)
                ).fetchall()
            elif category:
                rows = conn.execute(
                    """
                    SELECT id, category, content, importance, created_at, updated_at
                    FROM user_memories
                    WHERE category = ?
                    ORDER BY importance DESC, created_at DESC
                    LIMIT ?;
                    """,
                    (category.lower(), limit)
                ).fetchall()
            elif query:
                rows = conn.execute(
                    """
                    SELECT id, category, content, importance, created_at, updated_at
                    FROM user_memories
                    WHERE content LIKE ?
                    ORDER BY importance DESC, created_at DESC
                    LIMIT ?;
                    """,
                    (f"%{query.strip()}%", limit)
                ).fetchall()
            else:
                rows = conn.execute(
                    """
                    SELECT id, category, content, importance, created_at, updated_at
                    FROM user_memories
                    ORDER BY importance DESC, created_at DESC
                    LIMIT ?;
                    """,
                    (limit,)
                ).fetchall()

        return [
            {
                "id": r[0],
                "category": r[1],
                "content": r[2],
                "importance": r[3],
                "created_at": r[4],
                "updated_at": r[5]
            }
            for r in rows
        ]

    def get_memory(self, memory_id: str) -> Optional[Dict[str, Any]]:
        """Fetches a single memory by ID."""
        with db.get_connection() as conn:
            row = conn.execute(
                """
                SELECT id, category, content, importance, created_at, updated_at
                FROM user_memories
                WHERE id = ?;
                """,
                (memory_id,)
            ).fetchone()
            if not row:
                return None
            return {
                "id": row[0],
                "category": row[1],
                "content": row[2],
                "importance": row[3],
                "created_at": row[4],
                "updated_at": row[5]
            }

    def update_memory(
        self,
        memory_id: str,
        content: str,
        category: Optional[str] = None,
        importance: Optional[int] = None
    ) -> bool:
        """Updates an existing memory."""
        clean_content = content.strip()
        if not clean_content:
            return False

        existing = self.get_memory(memory_id)
        if not existing:
            return False

        cat = category.lower() if category else existing["category"]
        imp = max(1, min(5, importance)) if importance is not None else existing["importance"]
        now = datetime.now().isoformat()

        with db.get_connection() as conn:
            conn.execute(
                """
                UPDATE user_memories
                SET content = ?, category = ?, importance = ?, updated_at = ?
                WHERE id = ?;
                """,
                (clean_content, cat, imp, now, memory_id)
            )
        self._queue_sync("user_memories", memory_id, "upsert", {
            "id": memory_id,
            "category": cat,
            "content": clean_content,
            "importance": imp,
            "updated_at": now
        })
        return True

    def delete_memory(self, memory_id: str) -> bool:
        """Deletes a memory by ID."""
        with db.get_connection() as conn:
            cursor = conn.execute("DELETE FROM user_memories WHERE id = ?;", (memory_id,))
            success = cursor.rowcount > 0
        if success:
            self._queue_sync("user_memories", memory_id, "delete", {"id": memory_id})
        return success

    def clear_all_memories(self) -> int:
        """Deletes all user memories (privacy action)."""
        with db.get_connection() as conn:
            cursor = conn.execute("DELETE FROM user_memories;")
            return cursor.rowcount

    def extract_and_save_explicit_memory(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Detects explicit user memory requests like:
        - "Remember that I prefer coffee over tea"
        - "Remember my car model is Tesla Model 3"
        - "Don't forget that the project review is on Monday"
        - "Remember this: I learned the sentence 'Have you eaten?'"
        """
        patterns = [
            (r"^(?:please\s+)?remember\s+(?:that\s+|this:\s*|my\s+|to\s+)?(.+)$", 4),
            (r"^(?:please\s+)?don['’]t\s+forget\s+(?:that\s+)?(.+)$", 4),
            (r"^save\s+(?:this\s+)?(?:memory|note|fact):\s*(.+)$", 3),
            (r"^keep\s+in\s+mind\s+(?:that\s+)?(.+)$", 3)
        ]

        text_stripped = text.strip()
        for pattern, default_imp in patterns:
            match = re.match(pattern, text_stripped, re.IGNORECASE)
            if match:
                extracted = match.group(1).strip()
                # Clean punctuation at end
                extracted = re.sub(r"[.!?]+$", "", extracted).strip()
                if len(extracted) >= 3:
                    # Categorize based on keywords
                    lower = extracted.lower()
                    if any(k in lower for k in ["prefer", "like", "favorite", "favourite", "call me"]):
                        cat = "preference"
                    elif any(k in lower for k in ["project", "deadline", "task", "work"]):
                        cat = "project"
                    elif any(k in lower for k in ["learn", "sentence", "vocabulary", "english", "word"]):
                        cat = "learned_language"
                    else:
                        cat = "fact"

                    return self.save_memory(content=extracted, category=cat, importance=default_imp)

        return None

    def get_contextual_memories_for_prompt(self, prompt: str, max_tokens: int = 500) -> str:
        """
        Retrieves relevant stored memories to inject into the LLM system prompt.
        If no memories exist or match, returns an empty string to avoid inventing details.
        """
        memories = self.list_memories(limit=30)
        if not memories:
            return ""

        words = set(re.findall(r"\b[a-zA-Z0-9]{3,}\b", prompt.lower()))
        # Score each memory by keyword overlap and importance
        scored_memories = []
        for m in memories:
            m_words = set(re.findall(r"\b[a-zA-Z0-9]{3,}\b", m["content"].lower()))
            overlap = len(words.intersection(m_words))
            score = (overlap * 3) + m.get("importance", 3)
            scored_memories.append((score, m))

        scored_memories.sort(key=lambda x: x[0], reverse=True)
        top = [m for score, m in scored_memories if score > 3][:5]

        if not top:
            # Fallback: include up to 3 highest-importance memories (e.g. key user preferences)
            top = [m for m in memories if m.get("importance", 1) >= 4][:3]

        if not top:
            return ""

        formatted_lines = [f"- [{m['category'].upper()}] {m['content']}" for m in top]
        return "Personal Memories & User Facts:\n" + "\n".join(formatted_lines)

    def export_all(self) -> Dict[str, Any]:
        """Exports all memories and summaries for user backup."""
        memories = self.list_memories(limit=1000)
        with db.get_connection() as conn:
            conversations = conn.execute("SELECT id, title, created_at, updated_at FROM conversations;").fetchall()
            conv_list = [{"id": c[0], "title": c[1], "created_at": c[2], "updated_at": c[3]} for c in conversations]

        return {
            "exported_at": datetime.now().isoformat(),
            "total_memories": len(memories),
            "memories": memories,
            "total_conversations": len(conv_list),
            "conversations": conv_list
        }

memory_engine = MemoryEngine()
