"""
End-to-End Workflow Integration Test for Ramya AI.
Verifies the complete pipeline:
Wake word -> Speech transcription -> Intent classification -> Permission check -> Tool execution -> Speech synthesis.
"""
import pytest
from app.voice.wake_word import wake_word_detector
from app.tools.command_router import command_router
from app.voice.tts import tts_engine

@pytest.mark.asyncio
async def test_complete_vertical_slice():
    # 1. Simulated voice input with wake word
    raw_speech = "Hey Ramya, what is the weather in Hyderabad"
    
    # 2. Wake-word detection
    detected, wake_phrase, command = wake_word_detector.detect_in_text(raw_speech)
    assert detected is True
    assert wake_phrase == "hey ramya"
    assert "weather in hyderabad" in command.lower()

    # 3. Command router execution (deterministic local handling)
    result = await command_router.route_and_execute(raw_speech)
    assert result["intent"] == "live_info"
    assert result["spokenResponse"] is not None
    assert len(result["spokenResponse"]) > 0

    # 4. Speech synthesis of the response
    tts_result = await tts_engine.synthesize(result["spokenResponse"])
    assert tts_result["success"] is True
    assert tts_result["filename"].endswith((".mp3", ".wav"))
