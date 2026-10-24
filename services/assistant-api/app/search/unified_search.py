"""
Unified Search Engine for Ramya AI.
Provides exact-match, semantic vector, and hybrid search across:
- Previous conversations and messages
- Saved user memories and preferences
- Local documents (PDF, DOCX, TXT, PPTX)
- Tasks, reminders, and notes
- Installed applications and desktop tools
- Online web searches and live information

Improves relevance through recency weighting, contextual reference resolution,
source quality scoring, and safe snippet extraction.
"""
import re
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from app.database.db import db
from app.rag.vector_store import compute_sparse_vector, cosine_similarity
from app.tools.web_search import web_search_engine
from app.tools.desktop_control import desktop_control

logger = logging.getLogger("ramya.search.unified")

class UnifiedSearchEngine:
    def __init__(self):
        self._app_list = [
            {"id": "app-chrome", "title": "Google Chrome", "type": "app", "command": "chrome", "snippet": "Web Browser for browsing the internet and accessing web applications."},
            {"id": "app-notepad", "title": "Notepad", "type": "app", "command": "notepad", "snippet": "Lightweight Windows text editor for simple notes and scratchpad."},
            {"id": "app-calc", "title": "Calculator", "type": "app", "command": "calculator", "snippet": "Standard calculator for arithmetic, calculations, and conversions."},
            {"id": "app-vscode", "title": "Visual Studio Code", "type": "app", "command": "vscode", "snippet": "Source code editor and IDE for development."},
            {"id": "app-terminal", "title": "Windows Terminal / PowerShell", "type": "app", "command": "powershell", "snippet": "System terminal for developer workflows."},
            {"id": "app-explorer", "title": "File Explorer", "type": "app", "command": "explorer", "snippet": "Browse local files, folders, and storage drives."}
        ]

    async def search(
        self,
        query: str,
        source_filter: str = "all", # "all", "documents", "memories", "conversations", "tasks", "apps", "web"
        search_mode: str = "hybrid", # "hybrid", "exact", "semantic"
        limit: int = 15
    ) -> Dict[str, Any]:
        """
        Executes unified search across all authorized sources.
        Returns ranked results with snippets, source metadata, and actionable links.
        """
        clean_q = query.strip()
        if not clean_q:
            return {"query": query, "total": 0, "results": [], "sources_searched": []}

        # 1. Resolve natural language query intent
        resolved_q, intent_source = self._resolve_nl_query_intent(clean_q)
        active_source_filter = source_filter if source_filter != "all" else (intent_source or "all")

        raw_results: List[Dict[str, Any]] = []
        sources_searched: List[str] = []

        # 2. Search Local User Memories
        if active_source_filter in ["all", "memories"]:
            mem_results = self._search_memories(resolved_q, search_mode)
            raw_results.extend(mem_results)
            sources_searched.append("memories")

        # 3. Search Documents and RAG Chunks
        if active_source_filter in ["all", "documents"]:
            doc_results = self._search_documents(resolved_q, search_mode)
            raw_results.extend(doc_results)
            sources_searched.append("documents")

        # 4. Search Previous Conversations & Messages
        if active_source_filter in ["all", "conversations"]:
            conv_results = self._search_conversations(resolved_q, search_mode)
            raw_results.extend(conv_results)
            sources_searched.append("conversations")

        # 5. Search Tasks, Notes & Reminders
        if active_source_filter in ["all", "tasks"]:
            task_results = self._search_productivity(resolved_q)
            raw_results.extend(task_results)
            sources_searched.append("tasks")

        # 6. Search Installed Apps
        if active_source_filter in ["all", "apps"]:
            app_results = self._search_apps(resolved_q)
            raw_results.extend(app_results)
            sources_searched.append("apps")

        # 7. Online Web Search (if explicitly filtered or if local results are sparse)
        if active_source_filter in ["all", "web"] and (active_source_filter == "web" or len(raw_results) < 3):
            web_results = await self._search_web(resolved_q)
            raw_results.extend(web_results)
            sources_searched.append("web")

        # 8. Re-ranking: sort by combined score (relevance + recency boost)
        ranked_results = self._rerank(raw_results, resolved_q)

        return {
            "query": query,
            "resolved_query": resolved_q,
            "source_filter": active_source_filter,
            "search_mode": search_mode,
            "total": len(ranked_results),
            "sources_searched": sources_searched,
            "results": ranked_results[:limit]
        }

    def _resolve_nl_query_intent(self, text: str) -> (str, Optional[str]):
        """Resolves natural language queries (e.g. 'find the pdf I opened yesterday')."""
        lower = text.lower()
        
        # Document intent
        m_doc = re.search(r"\b(?:find|search|look\s*for)\s+(?:the\s+)?(?:pdf|document|file|notes?)\s+(?:about|on|named|containing)?\s*(.+)", lower)
        if m_doc:
            return m_doc.group(1).strip(), "documents"

        # Conversation intent
        m_conv = re.search(r"\b(?:search|find)\s+(?:my\s+)?(?:previous\s+)?conversation(?:s)?\s+(?:about|regarding|on)\s+(.+)", lower)
        if m_conv:
            return m_conv.group(1).strip(), "conversations"

        # Task intent
        if re.search(r"\b(?:pending\s+tasks|my\s+tasks|what\s+do\s+i\s+need\s+to\s+do|todo|reminders)\b", lower):
            return text, "tasks"

        # Web intent
        m_web = re.search(r"\b(?:search\s+(?:the\s+)?web\s+for|google\s+for)\s+(.+)", lower)
        if m_web:
            return m_web.group(1).strip(), "web"

        return text, None

    def _search_memories(self, query: str, mode: str) -> List[Dict[str, Any]]:
        results = []
        q_vec = compute_sparse_vector(query)
        lower_q = query.lower()

        with db.get_connection() as conn:
            rows = conn.execute("""
                SELECT id, category, content, importance, created_at, updated_at
                FROM user_memories
                ORDER BY updated_at DESC;
            """).fetchall()

            for r in rows:
                content = r["content"]
                score = 0.0

                # Exact term matching
                if lower_q in content.lower():
                    score += 0.6
                
                # Semantic match
                if mode in ["hybrid", "semantic"] and q_vec:
                    m_vec = compute_sparse_vector(content)
                    sim = cosine_similarity(q_vec, m_vec)
                    score += sim * 0.4

                if score > 0.15:
                    results.append({
                        "id": f"memory-{r['id']}",
                        "source": "memories",
                        "title": f"Memory ({r['category'].capitalize()})",
                        "snippet": content,
                        "relevance_score": round(min(score, 1.0), 3),
                        "timestamp": r["created_at"],
                        "action_type": "view_memory",
                        "action_target": r["id"],
                        "metadata": {"category": r["category"], "importance": r["importance"]}
                    })
        return results

    def _search_documents(self, query: str, mode: str) -> List[Dict[str, Any]]:
        results = []
        q_vec = compute_sparse_vector(query)
        lower_q = query.lower()

        with db.get_connection() as conn:
            rows = conn.execute("""
                SELECT c.id, c.document_id, c.chunk_index, c.page_or_slide, c.content, c.embedding_json,
                       d.filename, d.file_type, d.indexed_at
                FROM document_chunks c
                JOIN documents d ON c.document_id = d.id;
            """).fetchall()

            for r in rows:
                content = r["content"]
                score = 0.0

                if lower_q in content.lower() or lower_q in r["filename"].lower():
                    score += 0.55

                if mode in ["hybrid", "semantic"] and q_vec:
                    try:
                        emb = json.loads(r["embedding_json"])
                        sim = cosine_similarity(q_vec, emb)
                        score += sim * 0.45
                    except Exception:
                        pass

                if score > 0.15:
                    results.append({
                        "id": f"chunk-{r['id']}",
                        "source": "documents",
                        "title": f"{r['filename']} (Page {r['page_or_slide']})",
                        "snippet": content[:240] + "..." if len(content) > 240 else content,
                        "relevance_score": round(min(score, 1.0), 3),
                        "timestamp": r["indexed_at"],
                        "action_type": "open_document",
                        "action_target": r["document_id"],
                        "metadata": {
                            "filename": r["filename"],
                            "file_type": r["file_type"],
                            "page": r["page_or_slide"]
                        }
                    })
        return results

    def _search_conversations(self, query: str, mode: str) -> List[Dict[str, Any]]:
        results = []
        lower_q = query.lower()

        with db.get_connection() as conn:
            rows = conn.execute("""
                SELECT m.id, m.conversation_id, m.sender, m.text, m.timestamp, c.title as conversation_title
                FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                WHERE LOWER(m.text) LIKE ? OR LOWER(c.title) LIKE ?
                ORDER BY m.timestamp DESC
                LIMIT 10;
            """, (f"%{lower_q}%", f"%{lower_q}%")).fetchall()

            for r in rows:
                results.append({
                    "id": f"msg-{r['id']}",
                    "source": "conversations",
                    "title": f"Chat: {r['conversation_title']}",
                    "snippet": f"[{r['sender'].capitalize()}]: {r['text'][:200]}",
                    "relevance_score": 0.75,
                    "timestamp": r["timestamp"],
                    "action_type": "open_conversation",
                    "action_target": r["conversation_id"],
                    "metadata": {"sender": r["sender"], "conversation_id": r["conversation_id"]}
                })
        return results

    def _search_productivity(self, query: str) -> List[Dict[str, Any]]:
        results = []
        lower_q = query.lower()

        with db.get_connection() as conn:
            # Search tasks
            tasks = conn.execute("""
                SELECT id, title, description, is_completed, priority, due_date, created_at
                FROM tasks
                WHERE LOWER(title) LIKE ? OR LOWER(description) LIKE ?;
            """, (f"%{lower_q}%", f"%{lower_q}%")).fetchall()

            for t in tasks:
                status_str = "Completed" if t["is_completed"] else "Pending"
                results.append({
                    "id": f"task-{t['id']}",
                    "source": "tasks",
                    "title": f"Task: {t['title']} ({status_str})",
                    "snippet": t["description"] or f"Priority: {t['priority']}, Due: {t['due_date'] or 'No deadline'}",
                    "relevance_score": 0.8,
                    "timestamp": t["created_at"],
                    "action_type": "view_task",
                    "action_target": t["id"],
                    "metadata": {"is_completed": bool(t["is_completed"]), "priority": t["priority"]}
                })

            # Search notes
            notes = conn.execute("""
                SELECT id, title, content, updated_at
                FROM notes
                WHERE LOWER(title) LIKE ? OR LOWER(content) LIKE ?;
            """, (f"%{lower_q}%", f"%{lower_q}%")).fetchall()

            for n in notes:
                results.append({
                    "id": f"note-{n['id']}",
                    "source": "tasks",
                    "title": f"Note: {n['title']}",
                    "snippet": n["content"][:200],
                    "relevance_score": 0.75,
                    "timestamp": n["updated_at"],
                    "action_type": "view_note",
                    "action_target": n["id"],
                    "metadata": {}
                })
        return results

    def _search_apps(self, query: str) -> List[Dict[str, Any]]:
        results = []
        lower_q = query.lower()
        for app in self._app_list:
            if lower_q in app["title"].lower() or lower_q in app["snippet"].lower() or lower_q in app["command"]:
                results.append({
                    "id": app["id"],
                    "source": "apps",
                    "title": app["title"],
                    "snippet": app["snippet"],
                    "relevance_score": 0.9,
                    "timestamp": datetime.now().isoformat(),
                    "action_type": "launch_app",
                    "action_target": app["command"],
                    "metadata": {"command": app["command"]}
                })
        return results

    async def _search_web(self, query: str) -> List[Dict[str, Any]]:
        results = []
        try:
            res = await web_search_engine.search(query)
            if res.get("status") == "success":
                results.append({
                    "id": f"web-{hash(res['url'])}",
                    "source": "web",
                    "title": res["title"],
                    "snippet": res["snippet"],
                    "relevance_score": 0.7,
                    "timestamp": datetime.now().isoformat(),
                    "action_type": "open_url",
                    "action_target": res.get("url", ""),
                    "metadata": {"url": res.get("url", ""), "engine": res.get("source", "DuckDuckGo")}
                })
        except Exception as e:
            logger.debug(f"Web search in unified query error: {e}")
        return results

    def _rerank(self, items: List[Dict[str, Any]], query: str) -> List[Dict[str, Any]]:
        """Reranks items using exact matches, relevance, and recency bonuses."""
        now = datetime.now()
        lower_q = query.lower()

        for item in items:
            score = item["relevance_score"]
            # Recency bonus (within 48 hours gets +0.1)
            try:
                dt = datetime.fromisoformat(item["timestamp"])
                if now - dt < timedelta(hours=48):
                    score += 0.1
            except Exception:
                pass

            # Title exact match boost
            if lower_q in item["title"].lower():
                score += 0.15

            item["final_score"] = round(min(score, 1.0), 3)

        return sorted(items, key=lambda x: x.get("final_score", 0), reverse=True)

unified_search_engine = UnifiedSearchEngine()
