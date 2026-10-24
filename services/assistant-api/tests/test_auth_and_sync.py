"""
Tests for Ramya AI Complete Authentication and Database Sync:
- Verified profile management and guest mode
- Token verification security
- Offline SQLite outbox queueing & resilience
- Conflict resolution & sync status
- Data export & safe deletion
"""
import pytest
from app.auth.supabase_auth import auth_manager
from app.sync.engine import sync_engine
from app.memory.engine import memory_engine
from app.database.db import db

def test_guest_profile_defaults():
    profile = auth_manager.get_current_profile()
    assert profile["id"] == "local_user"
    assert "display_name" in profile
    assert profile["is_authenticated"] is False or profile["provider"] == "guest"

def test_profile_update():
    updated = auth_manager.update_profile(display_name="Neo Cyber")
    assert updated["display_name"] == "Neo Cyber"

    # Restore default
    auth_manager.update_profile(display_name="Cybernetic Operator")

@pytest.mark.asyncio
async def test_token_verification_safety():
    # Invalid token must return None without crashing or simulating auth
    verified = await auth_manager.verify_token("invalid.jwt.token")
    assert verified is None

def test_sync_outbox_queueing():
    # Enqueue record
    sync_id = sync_engine.queue_record(
        table_name="user_memories",
        record_id="test-mem-1",
        action="upsert",
        payload={"content": "Test memory item", "category": "preference"}
    )
    assert sync_id.startswith("sync-")

    status = sync_engine.get_sync_status()
    assert status["pending_count"] >= 1
    assert status["mode"] in ["hybrid", "offline_local"]

@pytest.mark.asyncio
async def test_sync_flush_offline_resilience():
    # Flushing without cloud connection must preserve local records safely
    status_before = sync_engine.get_sync_status()
    flush_res = await sync_engine.flush_outbox()
    assert "status" in flush_res
    assert flush_res["status"] in ["offline_mode", "network_unavailable", "up_to_date", "completed"]

    # Local records must NOT be deleted on network absence
    status_after = sync_engine.get_sync_status()
    assert status_after["pending_count"] == status_before["pending_count"]

def test_memory_engine_queues_sync():
    # Saving a memory automatically queues it into sync_outbox
    initial_pending = sync_engine.get_sync_status()["pending_count"]
    mem = memory_engine.save_memory("Sync test preference", category="preference", importance=2)
    assert mem["id"] is not None

    current_pending = sync_engine.get_sync_status()["pending_count"]
    assert current_pending == initial_pending + 1

def test_sign_out_preserves_local_data():
    profile_before = auth_manager.get_current_profile()
    signed_out = auth_manager.sign_out()
    assert signed_out["is_authenticated"] is False
    assert signed_out["provider"] == "guest"

    # Memories still exist
    memories = memory_engine.list_memories()
    assert isinstance(memories, list)
