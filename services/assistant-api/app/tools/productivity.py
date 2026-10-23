"""
Productivity and Task Management Module for Ramya AI.
Provides tasks, reminders, notes, and focus planning stored in SQLite.
"""
import uuid
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from app.database.db import db

logger = logging.getLogger("ramya.tools.productivity")

class ProductivityManager:
    # --- TASKS ---
    def create_task(self, title: str, description: Optional[str] = None, priority: str = "medium", due_date: Optional[str] = None) -> Dict[str, Any]:
        task_id = str(uuid.uuid4())[:8]
        with db.get_connection() as conn:
            conn.execute(
                """
                INSERT INTO tasks (id, title, description, is_completed, priority, due_date, created_at)
                VALUES (?, ?, ?, 0, ?, ?, ?);
                """,
                (task_id, title, description or "", priority, due_date or "", datetime.now().isoformat())
            )
        return {
            "success": True,
            "id": task_id,
            "title": title,
            "message": f"Task '{title}' created successfully."
        }

    def list_tasks(self, include_completed: bool = True) -> List[Dict[str, Any]]:
        with db.get_connection() as conn:
            if include_completed:
                rows = conn.execute("SELECT * FROM tasks ORDER BY created_at DESC;").fetchall()
            else:
                rows = conn.execute("SELECT * FROM tasks WHERE is_completed = 0 ORDER BY created_at DESC;").fetchall()
            return [dict(r) for r in rows]

    def toggle_task(self, task_id: str) -> Dict[str, Any]:
        with db.get_connection() as conn:
            row = conn.execute("SELECT is_completed, title FROM tasks WHERE id = ?;", (task_id,)).fetchone()
            if not row:
                return {"success": False, "message": f"Task '{task_id}' not found."}
            new_state = 0 if row["is_completed"] else 1
            conn.execute("UPDATE tasks SET is_completed = ? WHERE id = ?;", (new_state, task_id))
            status_text = "completed" if new_state else "reopened"
            return {
                "success": True,
                "id": task_id,
                "is_completed": bool(new_state),
                "message": f"Task '{row['title']}' marked as {status_text}."
            }

    def delete_task(self, task_id: str) -> Dict[str, Any]:
        with db.get_connection() as conn:
            conn.execute("DELETE FROM tasks WHERE id = ?;", (task_id,))
        return {"success": True, "message": f"Task '{task_id}' deleted."}

    # --- REMINDERS ---
    def set_reminder(self, text: str, trigger_time: str) -> Dict[str, Any]:
        rem_id = str(uuid.uuid4())[:8]
        with db.get_connection() as conn:
            conn.execute(
                """
                INSERT INTO reminders (id, text, trigger_time, is_acknowledged, created_at)
                VALUES (?, ?, ?, 0, ?);
                """,
                (rem_id, text, trigger_time, datetime.now().isoformat())
            )
        return {
            "success": True,
            "id": rem_id,
            "text": text,
            "trigger_time": trigger_time,
            "message": f"Reminder set for '{text}' at {trigger_time}."
        }

    def list_reminders(self) -> List[Dict[str, Any]]:
        with db.get_connection() as conn:
            rows = conn.execute("SELECT * FROM reminders ORDER BY trigger_time ASC;").fetchall()
            return [dict(r) for r in rows]

    # --- NOTES ---
    def create_note(self, title: str, content: str, tags: Optional[List[str]] = None) -> Dict[str, Any]:
        note_id = str(uuid.uuid4())[:8]
        tags_json = json.dumps(tags or ["quick-note"])
        with db.get_connection() as conn:
            conn.execute(
                """
                INSERT INTO notes (id, title, content, tags, updated_at)
                VALUES (?, ?, ?, ?, ?);
                """,
                (note_id, title, content, tags_json, datetime.now().isoformat())
            )
        return {
            "success": True,
            "id": note_id,
            "title": title,
            "message": f"Note '{title}' saved."
        }

    def list_notes(self) -> List[Dict[str, Any]]:
        with db.get_connection() as conn:
            rows = conn.execute("SELECT * FROM notes ORDER BY updated_at DESC;").fetchall()
            results = []
            for r in rows:
                item = dict(r)
                item["tags"] = json.loads(item["tags"]) if item.get("tags") else []
                results.append(item)
            return results

    # --- DAILY PLAN SUMMARY ---
    def get_daily_summary(self) -> Dict[str, Any]:
        tasks = self.list_tasks(include_completed=True)
        reminders = self.list_reminders()
        total_tasks = len(tasks)
        completed = sum(1 for t in tasks if t["is_completed"])
        pending = total_tasks - completed
        
        return {
            "date": datetime.now().strftime("%A, %B %d, %Y"),
            "total_tasks": total_tasks,
            "completed_tasks": completed,
            "pending_tasks": pending,
            "active_reminders": len(reminders),
            "tasks": tasks[:5],
            "reminders": reminders[:3],
            "message": f"Today: {pending} pending tasks, {completed} completed, and {len(reminders)} scheduled reminders."
        }

productivity = ProductivityManager()
