"""
Ollama Local Provider implementation for Ramya AI using Gemma 3 4B.
"""
import httpx
import json
import logging
from typing import AsyncGenerator, Optional
from app.providers.base import BaseAIProvider
from app.core.config import settings

logger = logging.getLogger("ramya.providers.ollama")

SYSTEM_PROMPT = """You are Ramya AI, a highly capable, voice-first personal AI assistant for Windows and Android.
Your primary wake phrase is 'Hey Ramya'.
Provide concise, helpful, and intelligent responses in clear Indian English.
When explaining technical, academic, or everyday topics, be accurate, clear, and structured.
Never hallucinate tool execution results or pretend external actions happened if they were not performed."""

class OllamaProvider(BaseAIProvider):
    def __init__(self, base_url: Optional[str] = None, model: Optional[str] = None):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model = model or settings.OLLAMA_MODEL

    @property
    def provider_name(self) -> str:
        return "ollama"

    async def is_available(self) -> bool:
        """Checks if Ollama server is running and model is loaded."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [m.get("name", "") for m in data.get("models", [])]
                    # Check if our target model or its prefix is in list
                    return any(self.model in m for m in models) or len(models) > 0
                return False
        except Exception:
            return False

    async def generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[str] = None,
        temperature: float = 0.7
    ) -> str:
        """Generates a complete response from Gemma 3 4B via Ollama."""
        combined_system = (system_prompt or SYSTEM_PROMPT)
        if context:
            combined_system += f"\n\nContext Information:\n{context}"

        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": combined_system,
            "stream": False,
            "options": {
                "temperature": temperature
            }
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                res = await client.post(f"{self.base_url}/api/generate", json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return data.get("response", "").strip()
                else:
                    logger.error(f"Ollama returned HTTP {res.status_code}: {res.text}")
                    return f"Ollama error (HTTP {res.status_code}): Unable to process request."
        except httpx.ConnectError:
            logger.warning("Ollama is not running locally.")
            return "Local AI server (Ollama) is currently offline. Please ensure Ollama is running."
        except Exception as e:
            logger.error(f"Error querying Ollama: {e}")
            return f"Encountered an issue running local model {self.model}: {str(e)}"

    async def stream_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[str] = None,
        temperature: float = 0.7
    ) -> AsyncGenerator[str, None]:
        """Streams response tokens from Ollama."""
        combined_system = (system_prompt or SYSTEM_PROMPT)
        if context:
            combined_system += f"\n\nContext Information:\n{context}"

        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": combined_system,
            "stream": True,
            "options": {
                "temperature": temperature
            }
        }

        try:
            async with httpx.AsyncClient(timeout=90.0) as client:
                async with client.stream("POST", f"{self.base_url}/api/generate", json=payload) as response:
                    async for line in response.aiter_lines():
                        if line:
                            try:
                                chunk = json.loads(line)
                                token = chunk.get("response", "")
                                if token:
                                    yield token
                                if chunk.get("done", False):
                                    break
                            except json.JSONDecodeError:
                                continue
        except Exception as e:
            logger.error(f"Error streaming from Ollama: {e}")
            yield f"[Ollama stream interrupted: {str(e)}]"
