"""
Unit tests for Voice Engine: Wake word, VAD, and TTS.
"""
import pytest
from app.voice.wake_word import wake_word_detector
from app.voice.vad import vad
from app.voice.tts import tts_engine

def test_wake_word_detector():
    detected, phrase, remaining = wake_word_detector.detect_in_text("Hey Ramya open calculator")
    assert detected is True
    assert phrase == "hey ramya"
    assert remaining == "open calculator"

    detected2, phrase2, remaining2 = wake_word_detector.detect_in_text("Hello Ramya what is the weather today")
    assert detected2 is True
    assert remaining2 == "what is the weather today"

    detected3, _, _ = wake_word_detector.detect_in_text("Good morning to everyone")
    assert detected3 is False

def test_vad_silence_detection():
    # Silent PCM audio (zero bytes)
    silent_pcm = b"\x00" * 320
    is_speech, rms, is_endpoint = vad.process_frame(silent_pcm)
    assert is_speech is False
    assert rms == 0.0

@pytest.mark.asyncio
async def test_tts_synthesis():
    res = await tts_engine.synthesize("Ramya AI online.")
    assert res["success"] is True
    assert res["filename"].endswith((".mp3", ".wav"))
    assert "audio_id" in res
