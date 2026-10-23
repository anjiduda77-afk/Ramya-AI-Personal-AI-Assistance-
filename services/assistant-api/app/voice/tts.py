"""
Text-to-Speech (TTS) Synthesis Engine for Ramya AI.
Generates natural Indian English voice responses using Edge-TTS.
"""
import io
import os
import uuid
import math
import asyncio
import logging
from pathlib import Path
from typing import Optional, Dict, Any
import edge_tts
from app.core.config import settings

logger = logging.getLogger("ramya.voice.tts")

class TTSEngine:
    def __init__(self, voice_name: Optional[str] = None):
        # Default to Indian English natural voice
        self.voice_name = voice_name or settings.VOICE_NAME
        self.output_dir = settings.STORAGE_DIR / "recordings"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._current_task: Optional[asyncio.Task] = None

    async def synthesize(self, text: str, voice: Optional[str] = None, rate: str = "+0%", pitch: str = "+0Hz") -> Dict[str, Any]:
        """Synthesizes text into an MP3 audio file."""
        if not text or not text.strip():
            return {"success": False, "error": "Empty text provided."}

        target_voice = voice or self.voice_name
        audio_id = str(uuid.uuid4())[:8]
        filename = f"tts_{audio_id}.mp3"
        filepath = self.output_dir / filename

        try:
            communicate = edge_tts.Communicate(text=text, voice=target_voice, rate=rate, pitch=pitch)
            await communicate.save(str(filepath))

            return {
                "success": True,
                "audio_id": audio_id,
                "filename": filename,
                "filepath": str(filepath),
                "url": f"/api/voice/audio/{filename}",
                "voice": target_voice,
                "text": text
            }
        except Exception as e:
            logger.warning(f"Edge-TTS synthesis offline/unreachable: {e}. Generating local audio fallback.")
            import wave
            import struct
            wav_filename = f"tts_{audio_id}.wav"
            wav_filepath = self.output_dir / wav_filename
            with wave.open(str(wav_filepath), "wb") as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(16000)
                # Generate 0.5s soft tone for feedback
                data = bytearray()
                for i in range(8000):
                    val = int(3000 * math.sin(2 * math.pi * 440 * i / 16000)) if "math" in globals() else 0
                    data.extend(struct.pack("<h", val))
                wf.writeframes(data)

            return {
                "success": True,
                "audio_id": audio_id,
                "filename": wav_filename,
                "filepath": str(wav_filepath),
                "url": f"/api/voice/audio/{wav_filename}",
                "voice": "local-offline-chime",
                "text": text,
                "isOffline": True
            }

    def stop_speaking(self):
        """Cancels any ongoing speech task."""
        if self._current_task and not self._current_task.done():
            self._current_task.cancel()
            logger.info("Speech playback stopped.")

tts_engine = TTSEngine()
