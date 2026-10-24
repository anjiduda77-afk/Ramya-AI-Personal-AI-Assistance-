"""
Authentication package for Ramya AI.
Integrates Google OAuth and Supabase Auth with guest mode and offline preservation.
"""
from app.auth.supabase_auth import auth_manager, AuthManager

__all__ = ["auth_manager", "AuthManager"]
