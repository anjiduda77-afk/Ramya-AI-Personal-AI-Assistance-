"""
Pytest configuration and global fixtures for Ramya AI backend tests.
"""
import pytest
from app.database.db import db

@pytest.fixture(autouse=True)
def init_database():
    """Ensures SQLite migrations are applied before running tests."""
    db.run_migrations()
