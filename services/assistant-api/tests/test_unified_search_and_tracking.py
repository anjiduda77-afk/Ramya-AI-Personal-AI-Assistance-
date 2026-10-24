"""
Tests for Unified Search Engine and Autonomous Tracking Engine.
"""
import pytest
from app.search.unified_search import unified_search_engine
from app.tracking.engine import tracking_engine
from app.memory.engine import memory_engine

@pytest.mark.asyncio
async def test_unified_search_basic():
    # Save a test memory
    memory_engine.save_memory("Prefers drinking filter coffee in the morning", category="preference", importance=4)

    # Perform unified search
    res = await unified_search_engine.search("coffee")
    assert res["total"] >= 1
    found = any("coffee" in r["snippet"].lower() for r in res["results"])
    assert found is True

@pytest.mark.asyncio
async def test_unified_search_app_matcher():
    res = await unified_search_engine.search("calculator", source_filter="apps")
    assert res["total"] >= 1
    assert any("calculator" in r["title"].lower() for r in res["results"])

def test_tracking_engine_lifecycle():
    # 1. Create tracker
    created = tracking_engine.create_tracker(
        title="Test Temp Folder Monitor",
        tracker_type="file_watcher",
        target="storage/temp",
        check_interval_seconds=60
    )
    assert created["success"] is True
    tracker_id = created["tracker_id"]

    # 2. List trackers
    trackers = tracking_engine.list_trackers()
    assert any(t["id"] == tracker_id for t in trackers)

    # 3. Check tracker
    check_res = tracking_engine.check_tracker(tracker_id)
    assert check_res["success"] is True

    # 4. Toggle tracker (pause)
    toggle_res = tracking_engine.toggle_tracker(tracker_id, pause=True)
    assert toggle_res["status"] == "paused"

    # 5. Delete tracker
    del_res = tracking_engine.delete_tracker(tracker_id)
    assert del_res is True

def test_tracking_events_logging():
    # Log event
    event_id = tracking_engine.log_event(
        tracker_id="tracker-tasks",
        event_type="info",
        title="Automated Test Check",
        details="Verified normal tracking execution.",
        severity="info"
    )
    assert event_id.startswith("evt-")

    # Retrieve events
    events = tracking_engine.get_events(limit=5)
    assert any(e["id"] == event_id for e in events)

    # Mark as read
    assert tracking_engine.mark_event_read(event_id) is True
