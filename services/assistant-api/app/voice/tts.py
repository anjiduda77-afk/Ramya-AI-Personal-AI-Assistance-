"""
Text-to-Speech (TTS) Synthesis Engine for Ramya AI.
Provides multi-tier speech generation:
1. Online Neural Indian English via Edge-TTS (en-IN-NeerjaNeural / en-IN-PrabhatNeural).
2. Local Offline Native Windows TTS via pyttsx3 (SAPI5 Microsoft Zira / David).
3. Soft acoustic feedback chime if audio drivers are completely unavailable.
"""
import io
import os
import re
import uuid
import math
import asyncio
import logging
from pathlib import Path
from typing import Optional, Dict, Any
import httpx
import edge_tts
from app.core.config import settings

logger = logging.getLogger("ramya.voice.tts")

def clean_text_for_speech(text: str, max_chars: int = 280) -> str:
    """
    Sanitizes raw AI response text into natural, spoken English.
    Removes markdown symbols, URLs, code blocks, raw JSON, and brackets.
    Trims excessively long texts at sentence boundaries for conversational brevity.
    """
    if not text:
        return ""

    # 1. Remove code blocks and inline code
    cleaned = re.sub(r"```[\s\S]*?```", " Code snippet available on screen. ", text)
    cleaned = re.sub(r"`([^`]+)`", r"\1", cleaned)

    # 2. Remove markdown images and links [text](url) -> text
    cleaned = re.sub(r"!\[[^\]]*\]\([^)]*\)", "", cleaned)
    cleaned = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", cleaned)

    # 3. Remove raw URLs
    cleaned = re.sub(r"https?://\S+", "", cleaned)

    # 4. Remove markdown headers, bullets, emphasis
    cleaned = re.sub(r"^#+\s*", "", cleaned, flags=re.MULTILINE)
    cleaned = re.sub(r"[*_~#>|]+", " ", cleaned)

    # 5. Remove JSON artifacts or technical status brackets like [task-123]
    cleaned = re.sub(r"\[task-[a-zA-Z0-9_-]+\]", "", cleaned)
    cleaned = re.sub(r"\{[^}]*\}", "", cleaned)

    # 6. Normalize whitespace
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    # 7. Truncate long answers at natural sentence boundary if exceeding max_chars
    if len(cleaned) > max_chars:
        # Cut to max_chars and find last sentence end (. or ! or ?)
        cut = cleaned[:max_chars]
        last_punct = max(cut.rfind('.'), cut.rfind('!'), cut.rfind('?'))
        if last_punct > 80:
            cleaned = cut[:last_punct + 1]
        else:
            cleaned = cut.rstrip() + "..."

    return cleaned

class TTSEngine:
    def __init__(self, voice_name: Optional[str] = None):
        self.voice_name = voice_name or settings.VOICE_NAME
        self.output_dir = settings.STORAGE_DIR / "recordings"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._current_task: Optional[asyncio.Task] = None

    def _synthesize_piper(self, text: str, filepath: Path) -> bool:
        """
        Synthesizes speech completely offline using Piper ONNX neural voices.
        Runs synchronously in a separate thread.
        """
        try:
            from piper import PiperVoice
            import wave
            piper_dir = settings.STORAGE_DIR / "voices" / "piper"
            model_path = piper_dir / "en_US-lessac-low.onnx"
            config_path = piper_dir / "en_US-lessac-low.onnx.json"
            if not model_path.exists():
                return False
            voice = PiperVoice.load(str(model_path), str(config_path))
            with wave.open(str(filepath), "wb") as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(voice.config.sample_rate)
                for chunk in voice.synthesize(text):
                    wav_file.writeframes(chunk.audio_int16_bytes)
            return filepath.exists() and filepath.stat().st_size > 0
        except Exception as e:
            logger.warning(f"Piper offline TTS failed: {e}")
            return False

    def _synthesize_local_offline(self, text: str, filepath: Path, voice_preference: Optional[str] = None) -> bool:
        """
        Synthesizes speech completely offline using native Windows SAPI5 / pyttsx3.
        Runs synchronously in a separate thread.
        """
        try:
            import pyttsx3
            engine = pyttsx3.init()
            voices = engine.getProperty('voices')

            # Select preferred voice (female priority like Zira, or specified)
            chosen_voice = None
            if voice_preference and "male" in voice_preference.lower() and "female" not in voice_preference.lower():
                for v in voices:
                    if "david" in v.name.lower() or "male" in v.name.lower():
                        chosen_voice = v.id
                        break
            else:
                for v in voices:
                    if "zira" in v.name.lower() or "female" in v.name.lower():
                        chosen_voice = v.id
                        break

            if chosen_voice:
                engine.setProperty('voice', chosen_voice)
            
            # Default rate 175 wpm for natural Indian English pacing
            engine.setProperty('rate', 175)

            engine.save_to_file(text, str(filepath))
            engine.runAndWait()
            return filepath.exists() and filepath.stat().st_size > 0
        except Exception as e:
            logger.warning(f"Native Windows pyttsx3 synthesis failed: {e}")
            return False

    async def _synthesize_openrouter_elevenlabs(
        self,
        text: str,
        filepath: Path,
        voice: str = "sarah",
        model: str = "elevenlabs/eleven-v4-turbo"
    ) -> bool:
        """
        Synthesizes ultra-realistic voice using OpenRouter ElevenLabs audio/speech API.
        """
        api_key = settings.OPENROUTER_API_KEY
        if not api_key:
            return False
        url = "https://openrouter.ai/api/v1/audio/speech"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "input": text,
            "voice": voice,
            "response_format": "mp3"
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code == 200 and len(res.content) > 500:
                    with open(filepath, "wb") as f:
                        f.write(res.content)
                    return True
                else:
                    logger.warning(f"OpenRouter ElevenLabs returned {res.status_code}")
                    return False
        except Exception as e:
            logger.warning(f"OpenRouter ElevenLabs synthesis failed: {e}")
            return False

    async def synthesize(
        self,
        text: str,
        voice: Optional[str] = None,
        rate: str = "+0%",
        pitch: str = "+0Hz",
        force_offline: bool = False
    ) -> Dict[str, Any]:
        """
        Synthesizes text into an audio file.
        Uses OpenRouter ElevenLabs, Edge-TTS (online), Piper ONNX, or Windows pyttsx3 (offline).
        """
        cleaned_speech = clean_text_for_speech(text)
        if not cleaned_speech:
            return {"success": False, "error": "Empty text provided."}

        target_voice = voice or self.voice_name
        audio_id = str(uuid.uuid4())[:8]

        # 1. OpenRouter ElevenLabs Ultra-Realistic Voice (when requested or online)
        is_elevenlabs_requested = bool(
            target_voice and any(k in target_voice.lower() for k in ["eleven", "sarah", "openrouter"])
        )
        if not force_offline and is_elevenlabs_requested and settings.OPENROUTER_API_KEY:
            eleven_filename = f"tts_{audio_id}_elevenlabs.mp3"
            eleven_filepath = self.output_dir / eleven_filename
            voice_name = "sarah" if "sarah" in target_voice.lower() else "sarah"
            success_eleven = await self._synthesize_openrouter_elevenlabs(
                cleaned_speech, eleven_filepath, voice=voice_name
            )
            if success_eleven:
                return {
                    "success": True,
                    "audio_id": audio_id,
                    "filename": eleven_filename,
                    "filepath": str(eleven_filepath),
                    "url": f"/api/voice/audio/{eleven_filename}",
                    "voice": f"elevenlabs-{voice_name}",
                    "text": cleaned_speech,
                    "engine": "openrouter-elevenlabs",
                    "isOffline": False
                }

        # Explicit Piper voice request
        is_piper_requested = bool(target_voice and "piper" in target_voice.lower())

        # 2. Online Edge-TTS Attempt (unless explicitly offline or Piper requested)
        if not force_offline and not is_piper_requested:
            filename = f"tts_{audio_id}.mp3"
            filepath = self.output_dir / filename
            try:
                communicate = edge_tts.Communicate(text=cleaned_speech, voice=target_voice, rate=rate, pitch=pitch)
                await communicate.save(str(filepath))
                if filepath.exists() and filepath.stat().st_size > 500:
                    return {
                        "success": True,
                        "audio_id": audio_id,
                        "filename": filename,
                        "filepath": str(filepath),
                        "url": f"/api/voice/audio/{filename}",
                        "voice": target_voice,
                        "text": cleaned_speech,
                        "engine": "edge-tts",
                        "isOffline": False
                    }
            except Exception as e:
                logger.warning(f"Edge-TTS synthesis unavailable ({e}). Falling back to local offline speech.")

        # 2. Local Offline Neural Piper TTS
        piper_filename = f"tts_{audio_id}_piper.wav"
        piper_filepath = self.output_dir / piper_filename
        success_piper = await asyncio.to_thread(self._synthesize_piper, cleaned_speech, piper_filepath)
        if success_piper:
            return {
                "success": True,
                "audio_id": audio_id,
                "filename": piper_filename,
                "filepath": str(piper_filepath),
                "url": f"/api/voice/audio/{piper_filename}",
                "voice": "piper-lessac",
                "text": cleaned_speech,
                "engine": "piper-offline",
                "isOffline": True
            }

        # 3. Local Offline Native Windows SAPI5 (pyttsx3) Fallback
        wav_filename = f"tts_{audio_id}_local.wav"
        wav_filepath = self.output_dir / wav_filename
        success_local = await asyncio.to_thread(self._synthesize_local_offline, cleaned_speech, wav_filepath, target_voice)
        if success_local:
            return {
                "success": True,
                "audio_id": audio_id,
                "filename": wav_filename,
                "filepath": str(wav_filepath),
                "url": f"/api/voice/audio/{wav_filename}",
                "voice": "windows-local-sapi5",
                "text": cleaned_speech,
                "engine": "pyttsx3-offline",
                "isOffline": True
            }

        # 3. Chime Tone Fallback (Last resort when sound drivers/SAPI are restricted)
        logger.warning("Generating local audio chime feedback.")
        import wave
        import struct
        chime_filename = f"tts_{audio_id}_chime.wav"
        chime_filepath = self.output_dir / chime_filename
        with wave.open(str(chime_filepath), "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(16000)
            data = bytearray()
            for i in range(8000):
                val = int(2500 * math.sin(2 * math.pi * 523.25 * i / 16000)) # C5 pitch
                data.extend(struct.pack("<h", val))
            wf.writeframes(data)

        return {
            "success": True,
            "audio_id": audio_id,
            "filename": chime_filename,
            "filepath": str(chime_filepath),
            "url": f"/api/voice/audio/{chime_filename}",
            "voice": "local-offline-chime",
            "text": cleaned_speech,
            "engine": "chime-fallback",
            "isOffline": True
        }

    def stop_speaking(self):
        """Cancels any ongoing speech task."""
        if self._current_task and not self._current_task.done():
            self._current_task.cancel()
            logger.info("Speech playback stopped.")

tts_engine = TTSEngine()
