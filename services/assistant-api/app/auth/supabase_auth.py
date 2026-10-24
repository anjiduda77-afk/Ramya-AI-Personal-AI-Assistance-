"""
Supabase Authentication & Verified User Profile Manager for Ramya AI.
Handles Google OAuth tokens, session verification, guest mode, and local cache.
Never simulates successful auth: verified identity is extracted directly from the session.
"""
import httpx
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from app.core.config import settings
from app.database.db import db

logger = logging.getLogger("ramya.auth")

class AuthManager:
    async def verify_token(self, jwt_token: str) -> Optional[Dict[str, Any]]:
        """
        Verifies Supabase JWT token against the official Supabase Auth endpoint.
        Returns verified user dictionary if valid, None if invalid or expired.
        """
        if not settings.SUPABASE_URL or not settings.SUPABASE_ANON_KEY:
            logger.warning("Supabase URL or anon key not configured.")
            return None

        clean_token = jwt_token.replace("Bearer ", "").strip()
        url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user"
        headers = {
            "apikey": settings.SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {clean_token}"
        }

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.get(url, headers=headers)
                if res.status_code == 200:
                    user_data = res.json()
                    user_id = user_data.get("id")
                    email = user_data.get("email", "")
                    meta = user_data.get("user_metadata", {})
                    display_name = (
                        meta.get("full_name") or
                        meta.get("name") or
                        (email.split("@")[0] if email else "User")
                    )
                    avatar_url = meta.get("avatar_url") or meta.get("picture")
                    app_meta = user_data.get("app_metadata", {})
                    provider = app_meta.get("provider", "google")

                    verified_profile = {
                        "supabase_user_id": user_id,
                        "email": email,
                        "display_name": display_name,
                        "avatar_url": avatar_url,
                        "provider": provider,
                        "is_authenticated": True,
                        "created_at": user_data.get("created_at")
                    }

                    # Cache profile locally
                    self._cache_profile(verified_profile)
                    return verified_profile
                else:
                    logger.warning(f"Supabase auth check returned {res.status_code}")
                    return None
        except Exception as e:
            logger.error(f"Error communicating with Supabase auth: {e}")
            return None

    def _cache_profile(self, profile: Dict[str, Any]):
        """Caches verified profile in local SQLite for offline access."""
        with db.get_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO user_profiles (
                    id, supabase_user_id, email, display_name, avatar_url, provider, is_authenticated, updated_at
                ) VALUES ('local_user', ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP);
                """,
                (
                    profile.get("supabase_user_id"),
                    profile.get("email"),
                    profile.get("display_name"),
                    profile.get("avatar_url"),
                    profile.get("provider", "google")
                )
            )

    def get_current_profile(self) -> Dict[str, Any]:
        """Returns the current cached profile (authenticated or guest)."""
        with db.get_connection() as conn:
            row = conn.execute(
                """
                SELECT id, supabase_user_id, email, display_name, avatar_url, provider, is_authenticated, created_at, updated_at
                FROM user_profiles
                WHERE id = 'local_user';
                """
            ).fetchone()

            if not row:
                return {
                    "id": "local_user",
                    "supabase_user_id": None,
                    "email": "guest@ramya.local",
                    "display_name": "Cybernetic Operator",
                    "avatar_url": None,
                    "provider": "guest",
                    "is_authenticated": False,
                    "created_at": datetime.now().isoformat()
                }

            return {
                "id": row[0],
                "supabase_user_id": row[1],
                "email": row[2],
                "display_name": row[3],
                "avatar_url": row[4],
                "provider": row[5],
                "is_authenticated": bool(row[6]),
                "created_at": row[7],
                "updated_at": row[8]
            }

    def update_profile(self, display_name: Optional[str] = None, avatar_url: Optional[str] = None) -> Dict[str, Any]:
        """Updates local display profile."""
        current = self.get_current_profile()
        new_name = display_name if display_name else current["display_name"]
        new_avatar = avatar_url if avatar_url else current["avatar_url"]

        with db.get_connection() as conn:
            conn.execute(
                """
                UPDATE user_profiles
                SET display_name = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = 'local_user';
                """,
                (new_name, new_avatar)
            )
        return self.get_current_profile()

    def set_guest_mode(self) -> Dict[str, Any]:
        """Switches to local offline guest mode while preserving existing local memories."""
        with db.get_connection() as conn:
            conn.execute(
                """
                UPDATE user_profiles
                SET supabase_user_id = NULL,
                    email = 'guest@ramya.local',
                    display_name = 'Cybernetic Operator',
                    provider = 'guest',
                    is_authenticated = 0,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = 'local_user';
                """
            )
        return self.get_current_profile()

    def sign_out(self) -> Dict[str, Any]:
        """Clears local authentication credentials without deleting local or cloud data."""
        return self.set_guest_mode()

auth_manager = AuthManager()
