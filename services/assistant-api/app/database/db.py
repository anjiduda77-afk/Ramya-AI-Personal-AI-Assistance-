"""
SQLite database connection and migration manager for Ramya AI.
"""
import sqlite3
import shutil
import logging
from pathlib import Path
from contextlib import contextmanager
from typing import Generator, List, Dict, Any, Optional
from datetime import datetime
from app.core.config import settings

logger = logging.getLogger("ramya.database")

class DatabaseManager:
    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or settings.DB_PATH
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.migrations_dir = settings.MIGRATIONS_DIR

    @contextmanager
    def get_connection(self) -> Generator[sqlite3.Connection, None, None]:
        """Provides a database connection with dict-like row access."""
        conn = sqlite3.connect(str(self.db_path), timeout=15.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute("PRAGMA journal_mode = WAL;")
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Database transaction rolled back: {e}")
            raise
        finally:
            conn.close()

    def run_migrations(self) -> List[str]:
        """Applies all pending SQL migration files in order."""
        applied = []
        if not self.migrations_dir.exists():
            logger.warning(f"Migrations directory does not exist: {self.migrations_dir}")
            return applied

        with self.get_connection() as conn:
            # Create migrations tracking table if not exists
            conn.execute("""
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    filename TEXT PRIMARY KEY,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            existing = {
                row["filename"]
                for row in conn.execute("SELECT filename FROM schema_migrations;").fetchall()
            }

            migration_files = sorted(self.migrations_dir.glob("*.sql"))
            for mf in migration_files:
                if mf.name not in existing:
                    logger.info(f"Applying migration: {mf.name}")
                    with open(mf, "r", encoding="utf-8") as f:
                        sql_script = f.read()
                    conn.executescript(sql_script)
                    conn.execute("INSERT INTO schema_migrations (filename) VALUES (?);", (mf.name,))
                    applied.append(mf.name)
        return applied

    def backup_database(self, backup_dir: Optional[Path] = None) -> Path:
        """Creates a timestamped snapshot backup of the SQLite database."""
        dest_dir = backup_dir or (settings.STORAGE_DIR / "backups")
        dest_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = dest_dir / f"ramya_backup_{timestamp}.db"
        
        with self.get_connection() as conn:
            backup_conn = sqlite3.connect(str(backup_path))
            conn.backup(backup_conn)
            backup_conn.close()
            
        logger.info(f"Database backed up to {backup_path}")
        return backup_path

    def restore_database(self, backup_path: Path) -> bool:
        """Restores the database from a backup file."""
        if not backup_path.exists():
            raise FileNotFoundError(f"Backup file not found: {backup_path}")
            
        temp_dest = self.db_path.with_suffix(".tmp")
        shutil.copy2(backup_path, temp_dest)
        
        # Verify integrity
        test_conn = sqlite3.connect(str(temp_dest))
        cursor = test_conn.cursor()
        cursor.execute("PRAGMA integrity_check;")
        result = cursor.fetchone()
        test_conn.close()
        
        if result and result[0] == "ok":
            shutil.move(temp_dest, self.db_path)
            logger.info(f"Database restored successfully from {backup_path}")
            return True
        else:
            if temp_dest.exists():
                temp_dest.unlink()
            raise ValueError("Corrupt backup file; restore aborted.")

db = DatabaseManager()
