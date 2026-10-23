"""
Unit tests for Deterministic Command Router.
"""
import pytest
from app.tools.command_router import command_router

@pytest.mark.asyncio
async def test_wake_word_handling():
    # Wake phrase only
    res = await command_router.route_and_execute("Hey Ramya")
    assert "listening" in res["spokenResponse"].lower()
    assert res["intent"] == "conversation"

@pytest.mark.asyncio
async def test_media_control_routing():
    res = await command_router.route_and_execute("Hey Ramya, pause the music")
    assert res["intent"] == "media_control"
    assert "media pause" in res["spokenResponse"].lower()

@pytest.mark.asyncio
async def test_task_creation_routing():
    res = await command_router.route_and_execute("Hey Ramya add task Review project documentation")
    assert res["intent"] == "productivity"
    assert "task added" in res["spokenResponse"].lower()
    assert "Review project documentation" in res["spokenResponse"]

@pytest.mark.asyncio
async def test_reminder_routing():
    res = await command_router.route_and_execute("Hey Ramya remind me to submit report at 5 PM")
    assert res["intent"] == "productivity"
    assert "reminder set" in res["spokenResponse"].lower()
    assert "5 PM" in res["spokenResponse"]

@pytest.mark.asyncio
async def test_weather_routing():
    res = await command_router.route_and_execute("What is the weather in Hyderabad?")
    assert res["intent"] == "live_info"
    assert "weather" in res["spokenResponse"].lower() or "hyderabad" in res["spokenResponse"].lower()

@pytest.mark.asyncio
async def test_screen_analysis_routing():
    res = await command_router.route_and_execute("Hey Ramya, analyze my screen")
    assert res["intent"] == "screen_analysis"
    assert "screen captured" in res["spokenResponse"].lower()
