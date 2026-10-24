"""
Configuration settings for Ramya AI backend service.
"""
import os
import json
from pathlib import Path
from typing import List
try:
    from pydantic_settings import BaseSettings
except ImportError:
    BaseSettings = object

# Resolve base directories
ROOT_DIR = Path(__file__).resolve().parents[4]
BASE_DIR = Path(__file__).resolve().parents[2]

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT_DIR / ".env")
    load_dotenv(BASE_DIR / ".env")
except Exception:
    pass

class Settings:
    PROJECT_NAME: str = "Ramya AI"
    VERSION: str = "1.0.0"
    TAGLINE: str = "Your World. Your Voice. Your Control."
    PRIMARY_WAKE_WORD: str = os.getenv("RAMYA_PRIMARY_WAKE_WORD", "Hey Ramya")
    
    # Wake phrases allowed
    WAKE_WORDS: List[str] = [
        "hey ramya",
        "hello ramya",
        "ramya",
        "okey ramya",
        "ok ramya"
    ]
    
    HOST: str = os.getenv("RAMYA_HOST", "127.0.0.1")
    PORT: int = int(os.getenv("RAMYA_PORT", "8000"))
    DEBUG: bool = os.getenv("RAMYA_DEBUG", "true").lower() == "true"
    SECRET_KEY: str = os.getenv("RAMYA_SECRET_KEY", "ramya-ai-super-secret-key-32chars-min-length")
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "tauri://localhost"
    ]
    
    # Database and Storage
    DB_PATH: Path = ROOT_DIR / "data" / "ramya.db"
    STORAGE_DIR: Path = ROOT_DIR / "storage"
    MIGRATIONS_DIR: Path = ROOT_DIR / "data" / "migrations"
    
    # AI Providers
    DEFAULT_PROVIDER: str = os.getenv("RAMYA_DEFAULT_PROVIDER", "ollama")
    OLLAMA_BASE_URL: str = os.getenv("RAMYA_OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    OLLAMA_MODEL: str = os.getenv("RAMYA_OLLAMA_MODEL", "gemma3:4b")
    CLOUD_PROVIDER: str = os.getenv("RAMYA_CLOUD_PROVIDER", "gemini")
    CLOUD_API_KEY: str = os.getenv("RAMYA_CLOUD_API_KEY", "")
    CLOUD_MODEL: str = os.getenv("RAMYA_CLOUD_MODEL", "gemini-1.5-flash")

    # Specific Cloud Providers (Gemini, OpenRouter, OpenAI, xAI Grok)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", os.getenv("RAMYA_CLOUD_API_KEY", ""))
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "nvidia/nemotron-3.5-lightning:free")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    XAI_API_KEY: str = os.getenv("XAI_API_KEY", "")
    XAI_MODEL: str = os.getenv("XAI_MODEL", "grok-beta")

    # Supabase Cloud Database & Auth Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", os.getenv("SUPABASE_PUBLISHABLE_KEY", ""))
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", os.getenv("SUPABASE_SECRET_KEY", ""))
    SUPABASE_JWKS_URL: str = os.getenv("SUPABASE_JWKS_URL", "")
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    
    # Voice Settings
    LANGUAGE: str = os.getenv("RAMYA_LANGUAGE", "en-IN")
    VOICE_NAME: str = os.getenv("RAMYA_VOICE_NAME", "en-IN-NeerjaNeural")
    TTS_ENGINE: str = os.getenv("RAMYA_TTS_ENGINE", "edge-tts")
    STT_ENGINE: str = os.getenv("RAMYA_STT_ENGINE", "faster-whisper")
    VAD_THRESHOLD: float = float(os.getenv("RAMYA_VAD_THRESHOLD", "0.5"))
    
    # Security
    AUTO_APPROVE_LOW_RISK: bool = os.getenv("RAMYA_AUTO_APPROVE_LOW_RISK", "true").lower() == "true"
    REQUIRE_HIGH_RISK_CONFIRMATION: bool = os.getenv("RAMYA_REQUIRE_HIGH_RISK_CONFIRMATION", "true").lower() == "true"
    
    def ensure_directories(self):
        """Ensure necessary storage and data directories exist."""
        self.DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        self.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        (self.STORAGE_DIR / "uploads").mkdir(parents=True, exist_ok=True)
        (self.STORAGE_DIR / "recordings").mkdir(parents=True, exist_ok=True)
        (self.STORAGE_DIR / "screenshots").mkdir(parents=True, exist_ok=True)

settings = Settings()
settings.ensure_directories()
