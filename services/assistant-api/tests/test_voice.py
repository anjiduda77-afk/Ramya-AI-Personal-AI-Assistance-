"""
Unit tests for Voice Engine: Wake word, VAD, TTS, and Speech Sanitization.
"""
import pytest
from app.voice.wake_word import wake_word_detector
from app.voice.vad import vad
from app.voice.tts import tts_engine, clean_text_for_speech

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

def test_clean_text_for_speech():
    raw_markdown = "Here is the code: ```python\nprint('hello')\n``` and check [this link](https://example.com) for **details**."
    cleaned = clean_text_for_speech(raw_markdown)
    assert "```" not in cleaned
    assert "https://" not in cleaned
    assert "Code snippet available on screen" in cleaned
    assert "**" not in cleaned
    assert "details" in cleaned

    # Test truncation at natural boundary
    long_text = "Ramya AI is an advanced intelligent personal assistant. " * 15
    concise = clean_text_for_speech(long_text, max_chars=200)
    assert len(concise) <= 205
    assert concise.endswith((".", "!?", "..."))

@pytest.mark.asyncio
async def test_tts_online_synthesis():
    res = await tts_engine.synthesize("Ramya AI online speech check.")
    assert res["success"] is True
    assert res["filename"].endswith((".mp3", ".wav"))
    assert "audio_id" in res
    assert "url" in res

@pytest.mark.asyncio
async def test_tts_offline_native_fallback():
    # Verify offline fallback generates valid audio without internet (Piper or SAPI5)
    res = await tts_engine.synthesize("Testing local offline Windows speech.", force_offline=True)
    assert res["success"] is True
    assert res["isOffline"] is True
    assert res["filename"].endswith(".wav")
    assert "url" in res

@pytest.mark.asyncio
async def test_tts_piper_offline_neural():
    # Verify Piper offline neural voice synthesis explicitly
    res = await tts_engine.synthesize("Hello from Piper offline neural voice.", voice="piper-lessac")
    assert res["success"] is True
    assert res["isOffline"] is True
    assert res["engine"] == "piper-offline"
    assert res["voice"] == "piper-lessac"

def test_faster_whisper_transcription():
    from app.voice.stt import stt_engine
    import wave
    from pathlib import Path
    
    # Create a small valid 1-second WAV
    test_wav = Path("storage/test_stt_sample.wav")
    test_wav.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(test_wav), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        wf.writeframes(b"\x00" * 32000)
    
    result = stt_engine.transcribe_audio_file(str(test_wav))
    assert "success" in result
    assert result["success"] is True
    if test_wav.exists():
        test_wav.unlink()
