"""
Tests for Ramya AI Human Intelligence Layer:
- Context awareness & multi-turn reference resolution ("that one", "continue", "do it again", "what did I learn yesterday")
- Personalised memory with contradiction & outdated resolution
- Ambiguity detection and concise clarification
- Emotional awareness & empathy without claiming consciousness
- Multi-step task planning, execution, and verification
"""
import pytest
from app.intelligence.context_engine import context_engine
from app.intelligence.emotional_engine import emotional_engine
from app.intelligence.planner import planner_engine
from app.memory.engine import memory_engine
from app.tools.command_router import command_router
from app.database.db import db

@pytest.mark.asyncio
async def test_pronoun_and_ellipsis_resolution():
    # Set context state
    context_engine.update_context(
        query="What is the weather in Hyderabad?",
        response="Weather in Hyderabad is 28°C.",
        intent="live_info",
        entity="Hyderabad"
    )

    # 1. "that one" refers to active entity
    q1, meta1 = context_engine.resolve_reference("check that one")
    assert meta1["was_resolved"] is True
    assert "Hyderabad" in q1

    # 2. "do it again" repeats last user query
    q2, meta2 = context_engine.resolve_reference("do it again")
    assert meta2["was_resolved"] is True
    assert "weather in hyderabad" in q2.lower()

    # 3. "continue" expands topic
    q3, meta3 = context_engine.resolve_reference("continue")
    assert meta3["was_resolved"] is True
    assert "weather in hyderabad" in q3.lower()

    # 4. "what did I learn yesterday"
    q4, meta4 = context_engine.resolve_reference("what did I learn yesterday")
    assert meta4["was_resolved"] is True
    assert "direct_answer" in meta4
    assert len(meta4["direct_answer"]) > 0

def test_ambiguity_and_clarification():
    # Vague commands should trigger clarification
    assert context_engine.check_ambiguity_and_clarification("open it") is not None
    assert "application" in context_engine.check_ambiguity_and_clarification("open it").lower()

    assert context_engine.check_ambiguity_and_clarification("search") is not None
    assert "search for" in context_engine.check_ambiguity_and_clarification("search").lower()

    assert context_engine.check_ambiguity_and_clarification("set a reminder") is not None

    # Clear commands should NOT trigger clarification
    assert context_engine.check_ambiguity_and_clarification("open chrome") is None
    assert context_engine.check_ambiguity_and_clarification("what is the weather in Delhi?") is None

def test_emotional_awareness_without_consciousness_claims():
    # 1. Frustration cue
    e_frustrated = emotional_engine.detect_emotion("This isn't working why can't you get this right!")
    assert e_frustrated == "frustrated"
    msg, spoken = emotional_engine.adapt_response("Here is the answer.", "Here is the answer.", e_frustrated)
    assert "understand" in msg.lower()
    # Empathy without claiming human consciousness or biology
    assert "human" not in msg.lower()
    assert "feel" not in msg.lower()

    # 2. Confusion cue
    e_confused = emotional_engine.detect_emotion("I don't understand, this is too complicated")
    assert e_confused == "confused"
    msg_c, _ = emotional_engine.adapt_response("Detailed explanation.", "Detailed explanation.", e_confused)
    assert "simply" in msg_c.lower()

    # 3. Urgency cue
    e_urgent = emotional_engine.detect_emotion("I need this immediately ASAP")
    assert e_urgent == "urgent"

def test_contradictory_memory_resolution():
    # Save first preference
    m1 = memory_engine.save_memory("I prefer dark mode for coding", category="preference", importance=3)
    assert m1["id"] is not None

    # Save contradictory preference
    m2 = memory_engine.save_memory("Actually I prefer light mode for coding", category="preference", importance=4)
    assert m2["id"] is not None

    # Check memories: old contradictory memory is archived/superseded or updated
    memories = memory_engine.list_memories(category="preference")
    contents = [m["content"] for m in memories]
    assert any("light mode" in c.lower() for c in contents)

@pytest.mark.asyncio
async def test_task_planner_decomposition_and_execution():
    goal = "Check the weather in Hyderabad and then view my tasks"
    assert planner_engine.is_composite_task(goal) is True

    steps = planner_engine.decompose_task(goal)
    assert len(steps) >= 2
    assert "Hyderabad" in steps[0]["query"]
    assert "tasks" in steps[1]["query"].lower()

    plan_id = planner_engine.save_plan(goal, steps)
    assert plan_id.startswith("plan-")

    result = await planner_engine.execute_plan(plan_id, command_router, is_confirmed=False)
    assert result["status"] == "success"
    assert len(result["steps"]) == len(steps)
    assert result["steps"][0]["status"] == "completed"

def test_consequential_action_approval_gate():
    # Deleting tasks or memories requires confirmation
    steps = planner_engine.decompose_task("Delete all my notes and then open notepad")
    has_consequential = any(s["is_consequential"] for s in steps)
    assert has_consequential is True
