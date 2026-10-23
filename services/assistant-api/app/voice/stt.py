"""
Speech-to-Text (STT) Engine for Ramya AI.
Provides local transcription using Faster-Whisper with fallback bridge.
"""
import io
import os
import wave
import logging
from typing import Optional, Dict, Any
from pathlib import Path
from app.core.config import settings

logger = logging.getLogger("ramya.voice.stt")

class STTEngine:
    def __init__(self):
        self._model = None
        self._is_loaded = False

    def _load_model(self):
        if not self._is_loaded:
            try:
                from faster_whisper import WhisperModel
                # Use tiny/base for real-time responsiveness
                self._model = WhisperModel("tiny", device="cpu", compute_type="int8")
                self._is_loaded = True
                logger.info("Faster-Whisper STT model loaded successfully.")
            except Exception as e:
                logger.warning(f"Faster-Whisper could not be loaded: {e}. Falling back to browser/Web STT.")
                self._model = None
                self._is_loaded = True

    def transcribe_audio_file(self, file_path: str, language: str = "en") -> Dict[str, Any]:
        """Transcribes an audio file into text."""
        if not Path(file_path).exists():
            return {"success": False, "error": "Audio file not found."}

        self._load_model()
        if self._model:
            try:
                segments, info = self._model.transcribe(file_path, beam_size=2, language=language)
                text = " ".join(seg.text for seg in segments).strip()
                return {
                    "success": True,
                    "text": text,
                    "language": info.language,
                    "duration": info.duration
                }
            except Exception as e:
                logger.error(f"Whisper transcription failed: {e}")
                return {"success": False, "error": str(e), "text": ""}

        return {
            "success": False,
            "error": "Local whisper model unavailable; please use Web Speech STT input.",
            "text": ""
        }

stt_engine = STTEngine()
