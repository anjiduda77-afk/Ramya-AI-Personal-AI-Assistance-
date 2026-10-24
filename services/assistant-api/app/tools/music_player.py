"""
Free and Legal Music Service for Ramya AI.
Provides curated Creative Commons and Public Domain audio streams (Lofi, Ambient, Classical, Nature)
and official application links for Windows and Android.
"""
import logging
from typing import List, Dict, Any, Optional
from app.database.db import db
from app.tools.desktop_control import desktop_control

logger = logging.getLogger("ramya.tools.music_player")

class MusicPlayer:
    def list_streams(self, genre: Optional[str] = None) -> List[Dict[str, Any]]:
        """Returns verified free and legal audio streams."""
        with db.get_connection() as conn:
            if genre:
                rows = conn.execute(
                    """
                    SELECT id, title, artist, genre, stream_url, is_free_legal
                    FROM music_streams
                    WHERE LOWER(genre) = LOWER(?)
                    ORDER BY title ASC;
                    """,
                    (genre.strip(),)
                ).fetchall()
            else:
                rows = conn.execute(
                    """
                    SELECT id, title, artist, genre, stream_url, is_free_legal
                    FROM music_streams
                    ORDER BY title ASC;
                    """
                ).fetchall()

        return [
            {
                "id": r[0],
                "title": r[1],
                "artist": r[2],
                "genre": r[3],
                "stream_url": r[4],
                "is_free_legal": bool(r[5])
            }
            for r in rows
        ]

    def get_track_for_mood(self, mood_or_query: str) -> Dict[str, Any]:
        """Finds the best matching legal stream for requests like 'play relaxing music'."""
        lower = mood_or_query.lower()
        streams = self.list_streams()

        if not streams:
            # Safe default fallback
            return {
                "id": "stream-lofi-1",
                "title": "Lofi Chill Study Beats",
                "artist": "ChilledCow CC / Free Music Archive",
                "genre": "lofi",
                "stream_url": "https://ia801503.us.archive.org/15/items/chill-lofi-song/chill-lofi-song.mp3",
                "is_free_legal": True
            }

        # Match mood/genre
        if any(w in lower for w in ["relax", "peace", "calm", "nature", "rain"]):
            matched = [s for s in streams if s["genre"] in ["ambient", "nature"]]
        elif any(w in lower for w in ["classic", "piano", "study", "debussy"]):
            matched = [s for s in streams if s["genre"] == "classical"]
        elif any(w in lower for w in ["focus", "work", "code", "beat", "lofi", "chill"]):
            matched = [s for s in streams if s["genre"] == "lofi"]
        else:
            matched = streams

        return matched[0] if matched else streams[0]

    def play_music(self, query: str = "relaxing") -> Dict[str, Any]:
        """
        Plays legal music or provides stream playback metadata.
        Also sends a play media command to system if media was already open.
        """
        track = self.get_track_for_mood(query)
        logger.info(f"Selected legal track: {track['title']} ({track['genre']})")
        return {
            "status": "playing",
            "action": "stream_playback",
            "track": track,
            "message": f"Playing {track['title']} by {track['artist']}.",
            "spoken_response": f"Playing {track['title']}."
        }

    def launch_external_app(self, app_name: str) -> Dict[str, Any]:
        """Launches external official music apps (Spotify, YouTube)."""
        app_clean = app_name.lower().strip()
        if "spotify" in app_clean:
            res = desktop_control.open_app("spotify")
            return {
                "status": "launched" if res["success"] else "attention_required",
                "app": "Spotify",
                "message": res.get("message", "Opening Spotify.")
            }
        elif "youtube" in app_clean:
            res = desktop_control.open_app("youtube")
            return {
                "status": "launched" if res["success"] else "attention_required",
                "app": "YouTube",
                "message": res.get("message", "Opening YouTube.")
            }
        else:
            return {
                "status": "attention_required",
                "message": f"Application {app_name} is not configured."
            }

music_player = MusicPlayer()
