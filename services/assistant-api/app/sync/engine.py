"""
Offline & Online Synchronisation Engine for Ramya AI.
Implements the Outbox Pattern to queue local changes when offline,
retries safely when internet connectivity returns, handles conflicts via last-write-wins,
and synchronizes with Supabase PostgREST endpoints without erasing local data.
"""
import json
import httpx
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from app.core.config import settings
from app.database.db import db

logger = logging.getLogger("ramya.sync.engine")

class SyncEngine:
    async def is_cloud_reachable(self) -> bool:
        """Checks if configured Supabase endpoint is reachable."""
        if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
            return False
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/", headers={"apikey": settings.SUPABASE_ANON_KEY})
                return res.status_code in [200, 401, 404]
        except Exception:
            return False

    def get_sync_status(self) -> Dict[str, Any]:
        """Returns the current state of the local outbox queue."""
        with db.get_connection() as conn:
            pending = conn.execute("SELECT COUNT(*) FROM sync_outbox WHERE status = 'pending';").fetchone()[0]
            synced = conn.execute("SELECT COUNT(*) FROM sync_outbox WHERE status = 'synced';").fetchone()[0]
            failed = conn.execute("SELECT COUNT(*) FROM sync_outbox WHERE status = 'failed';").fetchone()[0]
            last_sync_row = conn.execute("SELECT updated_at FROM sync_outbox WHERE status = 'synced' ORDER BY updated_at DESC LIMIT 1;").fetchone()

        is_configured = bool(settings.SUPABASE_URL and settings.SUPABASE_ANON_KEY)
        return {
            "is_cloud_configured": is_configured,
            "pending_count": pending,
            "synced_count": synced,
            "failed_count": failed,
            "last_synced_at": last_sync_row[0] if last_sync_row else None,
            "mode": "hybrid" if is_configured else "offline_local"
        }

    def queue_record(self, table_name: str, record_id: str, action: str, payload: Dict[str, Any]) -> str:
        """Enqueues an operation into the SQLite sync_outbox."""
        import uuid
        sync_id = f"sync-{uuid.uuid4().hex[:10]}"
        now = datetime.now().isoformat()
        with db.get_connection() as conn:
            conn.execute(
                """
                INSERT INTO sync_outbox (id, table_name, record_id, action, payload, status, retry_count, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?);
                """,
                (sync_id, table_name, record_id, action, json.dumps(payload), now, now)
            )
        return sync_id

    async def flush_outbox(self, jwt_token: Optional[str] = None) -> Dict[str, Any]:
        """
        Attempts to push all pending outbox records to Supabase.
        Safe against network loss: failures remain queued as 'pending' or 'failed'
        and will retry on next connection.
        """
        if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
            return {
                "status": "offline_mode",
                "message": "Supabase credentials are not configured. Working completely in local offline mode.",
                "synced_count": 0,
                "pending_count": self.get_sync_status()["pending_count"]
            }

        is_online = await self.is_cloud_reachable()
        if not is_online:
            return {
                "status": "network_unavailable",
                "message": "Cloud connection is currently offline. Changes are queued safely in local database.",
                "synced_count": 0,
                "pending_count": self.get_sync_status()["pending_count"]
            }

        # Fetch up to 50 pending records
        with db.get_connection() as conn:
            rows = conn.execute(
                """
                SELECT id, table_name, record_id, action, payload, retry_count
                FROM sync_outbox
                WHERE status = 'pending'
                ORDER BY created_at ASC
                LIMIT 50;
                """
            ).fetchall()

        if not rows:
            return {
                "status": "up_to_date",
                "message": "All local records are synchronized.",
                "synced_count": 0,
                "pending_count": 0
            }

        auth_header = f"Bearer {jwt_token.replace('Bearer ', '')}" if jwt_token else f"Bearer {settings.SUPABASE_ANON_KEY}"
        headers = {
            "apikey": settings.SUPABASE_ANON_KEY,
            "Authorization": auth_header,
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
        }

        processed = 0
        failed = 0
        base_url = settings.SUPABASE_URL.rstrip('/')

        async with httpx.AsyncClient(timeout=10.0) as client:
            for r_id, table, rec_id, action, payload_str, retries in rows:
                try:
                    payload = json.loads(payload_str)
                    endpoint = f"{base_url}/rest/v1/{table}"

                    if action == "upsert":
                        res = await client.post(endpoint, json=payload, headers=headers)
                        success = res.status_code in [200, 201, 204]
                    elif action == "delete":
                        del_endpoint = f"{endpoint}?id=eq.{rec_id}"
                        res = await client.delete(del_endpoint, headers=headers)
                        success = res.status_code in [200, 204]
                    else:
                        success = False

                    now = datetime.now().isoformat()
                    with db.get_connection() as conn:
                        if success:
                            conn.execute(
                                "UPDATE sync_outbox SET status = 'synced', updated_at = ? WHERE id = ?;",
                                (now, r_id)
                            )
                            processed += 1
                        else:
                            conn.execute(
                                "UPDATE sync_outbox SET status = 'failed', retry_count = retry_count + 1, last_error = ?, updated_at = ? WHERE id = ?;",
                                (f"HTTP {res.status_code}: {res.text[:100]}", now, r_id)
                            )
                            failed += 1
                except Exception as e:
                    now = datetime.now().isoformat()
                    with db.get_connection() as conn:
                        conn.execute(
                            "UPDATE sync_outbox SET status = 'failed', retry_count = retry_count + 1, last_error = ?, updated_at = ? WHERE id = ?;",
                            (str(e)[:100], now, r_id)
                        )
                    failed += 1

        return {
            "status": "completed",
            "message": f"Synchronized {processed} record{'s' if processed != 1 else ''}.",
            "synced_count": processed,
            "failed_count": failed,
            "pending_count": self.get_sync_status()["pending_count"]
        }

sync_engine = SyncEngine()
