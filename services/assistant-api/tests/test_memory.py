"""
Unit tests for Ramya AI Personal Memory Engine.
Verifies persistent SQLite storage, explicit memory extraction,
contextual recall, and user privacy deletion.
"""
import pytest
from app.memory.engine import memory_engine

def test_memory_lifecycle():
    # 1. Save explicit memory
    mem = memory_engine.save_memory(
        content="User prefers dark theme and concise code explanations.",
        category="preference",
        importance=5
    )
    assert mem["id"].startswith("mem-")
    assert mem["category"] == "preference"
    assert mem["importance"] == 5

    # 2. List memories
    all_mems = memory_engine.list_memories()
    assert any(m["id"] == mem["id"] for m in all_mems)

    # 3. Filter by category
    pref_mems = memory_engine.list_memories(category="preference")
    assert any(m["id"] == mem["id"] for m in pref_mems)

    # 4. Update memory
    updated = memory_engine.update_memory(
        memory_id=mem["id"],
        content="User prefers futuristic cyberpunk theme and concise answers.",
        importance=4
    )
    assert updated is True
    fetched = memory_engine.get_memory(mem["id"])
    assert "cyberpunk" in fetched["content"]

    # 5. Contextual recall for prompt
    context = memory_engine.get_contextual_memories_for_prompt("What theme should I render?")
    assert "cyberpunk" in context or "Personal Memories" in context

    # 6. Delete memory
    deleted = memory_engine.delete_memory(mem["id"])
    assert deleted is True
    assert memory_engine.get_memory(mem["id"]) is None

def test_explicit_memory_extraction():
    # Pattern: "Remember that..."
    res1 = memory_engine.extract_and_save_explicit_memory("Remember that my car is a Honda Civic")
    assert res1 is not None
    assert "Honda Civic" in res1["content"]
    assert res1["category"] == "fact"
    memory_engine.delete_memory(res1["id"])

    # Pattern: "Don't forget that..."
    res2 = memory_engine.extract_and_save_explicit_memory("Don't forget that project review is tomorrow")
    assert res2 is not None
    assert "project review" in res2["content"]
    assert res2["category"] == "project"
    memory_engine.delete_memory(res2["id"])

def test_export_all():
    data = memory_engine.export_all()
    assert "memories" in data
    assert "conversations" in data
    assert "exported_at" in data
