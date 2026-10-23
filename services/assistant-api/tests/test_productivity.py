"""
Unit tests for Personal Productivity: Tasks, Reminders, Notes, and Daily Summary.
"""
import pytest
from app.tools.productivity import productivity

def test_task_lifecycle():
    # 1. Create task
    res = productivity.create_task(title="Prepare presentation", priority="high")
    assert res["success"] is True
    task_id = res["id"]

    # 2. Toggle task
    toggle_res = productivity.toggle_task(task_id)
    assert toggle_res["success"] is True
    assert toggle_res["is_completed"] is True

    # 3. List tasks
    tasks = productivity.list_tasks(include_completed=True)
    assert any(t["id"] == task_id for t in tasks)

    # 4. Delete task
    del_res = productivity.delete_task(task_id)
    assert del_res["success"] is True

def test_reminder_and_notes():
    rem_res = productivity.set_reminder(text="Team sync call", trigger_time="3:30 PM")
    assert rem_res["success"] is True
    
    note_res = productivity.create_note(title="Ideas", content="Explore WebGPU for local client shaders", tags=["research"])
    assert note_res["success"] is True
    
    notes = productivity.list_notes()
    assert any(n["id"] == note_res["id"] for n in notes)

def test_daily_summary():
    summary = productivity.get_daily_summary()
    assert "date" in summary
    assert "total_tasks" in summary
    assert "pending_tasks" in summary
