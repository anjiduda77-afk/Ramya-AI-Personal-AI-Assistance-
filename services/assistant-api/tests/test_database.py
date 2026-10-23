"""
Unit tests for Ramya AI Database and Migrations.
"""
import pytest
from pathlib import Path
from app.database.db import DatabaseManager

def test_migrations_and_tables(tmp_path: Path):
    test_db = tmp_path / "test_ramya.db"
    db_mgr = DatabaseManager(db_path=test_db)
    
    # Run migrations
    applied = db_mgr.run_migrations()
    assert len(applied) >= 1
    assert "001_initial_schema.sql" in applied

    # Verify tables exist
    with db_mgr.get_connection() as conn:
        tables = [
            r["name"] for r in conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table';"
            ).fetchall()
        ]
        assert "settings" in tables
        assert "tasks" in tables
        assert "reminders" in tables
        assert "notes" in tables
        assert "documents" in tables
        assert "document_chunks" in tables
        assert "audit_logs" in tables
        assert "watchlists" in tables

def test_backup_and_restore(tmp_path: Path):
    test_db = tmp_path / "test_ramya.db"
    db_mgr = DatabaseManager(db_path=test_db)
    db_mgr.run_migrations()

    # Insert test task
    with db_mgr.get_connection() as conn:
        conn.execute("INSERT INTO tasks (id, title) VALUES ('t1', 'Backup test task');")

    # Backup
    backup_file = db_mgr.backup_database(backup_dir=tmp_path / "backups")
    assert backup_file.exists()

    # Modify original
    with db_mgr.get_connection() as conn:
        conn.execute("DELETE FROM tasks WHERE id = 't1';")

    # Restore
    restored = db_mgr.restore_database(backup_file)
    assert restored is True

    # Verify restored record
    with db_mgr.get_connection() as conn:
        row = conn.execute("SELECT title FROM tasks WHERE id = 't1';").fetchone()
        assert row is not None
        assert row["title"] == "Backup test task"
