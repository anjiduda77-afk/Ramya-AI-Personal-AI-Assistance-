"""
Unit tests for Free Legal Music Playback and Web Search Services.
"""
import pytest
from app.tools.music_player import music_player
from app.tools.web_search import web_search_engine

def test_legal_music_streams_list():
    streams = music_player.list_streams()
    assert len(streams) >= 4
    # All seeded streams must be verified free and legal
    assert all(s["is_free_legal"] for s in streams)
    genres = {s["genre"] for s in streams}
    assert "lofi" in genres
    assert "classical" in genres
    assert "ambient" in genres

def test_music_playback_query():
    # Play relaxing music
    res = music_player.play_music("play relaxing music")
    assert res["status"] == "playing"
    assert "track" in res
    assert res["track"]["genre"] in ["ambient", "nature", "lofi"]

    # Play classical music
    res_classical = music_player.play_music("play classical piano")
    assert res_classical["status"] == "playing"
    assert res_classical["track"]["genre"] == "classical"

def test_external_music_app_launch():
    # YouTube official launch
    yt_res = music_player.launch_external_app("youtube")
    assert yt_res["status"] in ["launched", "attention_required"]
    assert yt_res["app"] == "YouTube"

@pytest.mark.asyncio
async def test_web_search_engine():
    # DuckDuckGo or Wikipedia search
    res = await web_search_engine.search("Python programming language")
    assert res["status"] in ["success", "no_results"]
    if res["status"] == "success":
        assert "Python" in res["title"] or "Python" in res["snippet"]
        assert "http" in res["url"]
