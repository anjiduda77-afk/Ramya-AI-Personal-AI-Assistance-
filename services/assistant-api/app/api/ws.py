"""
WebSocket Streaming and Real-time Voice Session Manager for Ramya AI.
Synchronizes the animated AI Orb states and streams speech-to-text / responses.
"""
import json
import logging
from typing import Dict, Any, Set
from fastapi import WebSocket, WebSocketDisconnect
from app.tools.command_router import command_router
from app.voice.tts import tts_engine

logger = logging.getLogger("ramya.api.ws")

class WebSocketManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.current_orb_state: str = "idle"

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        # Send initial orb state
        await websocket.send_json({
            "type": "state_sync",
            "orbState": self.current_orb_state
        })

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast_state(self, orb_state: str):
        self.current_orb_state = orb_state
        for conn in list(self.active_connections):
            try:
                await conn.send_json({
                    "type": "state_sync",
                    "orbState": orb_state
                })
            except Exception:
                pass

ws_manager = WebSocketManager()

async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                mtype = msg.get("type")

                if mtype == "ping":
                    await websocket.send_json({"type": "pong", "orbState": ws_manager.current_orb_state})

                elif mtype == "user_speech_start":
                    await ws_manager.broadcast_state("listening")

                elif mtype == "user_speech_partial":
                    # Broadcast partial transcript to all connected clients
                    for conn in list(ws_manager.active_connections):
                        try:
                            await conn.send_json({
                                "type": "transcript_partial",
                                "transcript": msg.get("transcript", "")
                            })
                        except Exception:
                            pass

                elif mtype == "user_speech_final":
                    transcript = msg.get("transcript", "").strip()
                    if transcript:
                        await ws_manager.broadcast_state("processing")
                        # Route command
                        response = await command_router.route_and_execute(
                            raw_query=transcript,
                            is_user_confirmed=msg.get("confirmed", False),
                            source="voice"
                        )

                        # Generate speech for spoken response
                        spoken = response.get("spokenResponse", "")
                        audio_res = await tts_engine.synthesize(spoken)

                        await ws_manager.broadcast_state("speaking")
                        await websocket.send_json({
                            "type": "command_result",
                            "response": response,
                            "audioUrl": audio_res.get("url") if audio_res.get("success") else None
                        })
                    else:
                        await ws_manager.broadcast_state("idle")

                elif mtype == "speech_ended":
                    await ws_manager.broadcast_state("idle")

                elif mtype == "cancel":
                    tts_engine.stop_speaking()
                    await ws_manager.broadcast_state("idle")
                    await websocket.send_json({"type": "cancelled"})

            except json.JSONDecodeError:
                continue
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)
