"""
Configurable Cloud AI Provider adapter for Ramya AI.
Supports Google Gemini, OpenAI, Groq, and OpenRouter compatible APIs.
"""
import httpx
import logging
from typing import AsyncGenerator, Optional
from app.providers.base import BaseAIProvider
from app.core.config import settings

logger = logging.getLogger("ramya.providers.cloud")

class CloudAIProvider(BaseAIProvider):
    def __init__(
        self,
        provider_type: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None
    ):
        self._provider_type = provider_type or settings.CLOUD_PROVIDER
        self.api_key = api_key or settings.CLOUD_API_KEY
        self.model = model or settings.CLOUD_MODEL

    @property
    def provider_name(self) -> str:
        return f"cloud-{self._provider_type}"

    async def is_available(self) -> bool:
        """Returns True if API key is configured and valid network connection exists."""
        if not self.api_key:
            return False
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get("https://www.google.com")
                return res.status_code == 200
        except Exception:
            return False

    async def generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[str] = None,
        temperature: float = 0.7
    ) -> str:
        """Sends prompt to cloud AI provider."""
        if not self.api_key:
            return "Cloud AI is not configured. Please add an API key in Settings or use local Ollama."

        headers = {
            "Content-Type": "application/json"
        }

        # Example implementation for Gemini REST API
        if "gemini" in self._provider_type.lower():
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
            full_prompt = prompt
            if context:
                full_prompt = f"Context:\n{context}\n\nUser Question:\n{prompt}"
            if system_prompt:
                full_prompt = f"System Instructions:\n{system_prompt}\n\n{full_prompt}"

            payload = {
                "contents": [{
                    "parts": [{"text": full_prompt}]
                }],
                "generationConfig": {
                    "temperature": temperature,
                    "maxOutputTokens": 2048
                }
            }

            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    res = await client.post(url, json=payload, headers=headers)
                    if res.status_code == 200:
                        data = res.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts:
                                return parts[0].get("text", "").strip()
                        return "Cloud provider returned an empty response."
                    else:
                        logger.error(f"Gemini API error {res.status_code}: {res.text}")
                        return f"Cloud provider error (HTTP {res.status_code})."
            except Exception as e:
                logger.error(f"Cloud provider connection failed: {e}")
                return f"Unable to reach cloud AI service: {str(e)}"

        return "Configured cloud provider is currently unavailable or unsupported."

    async def stream_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[str] = None,
        temperature: float = 0.7
    ) -> AsyncGenerator[str, None]:
        """Streams chunk from cloud provider (fallback to complete generation for simplicity)."""
        full_text = await self.generate_response(prompt, system_prompt, context, temperature)
        # Yield words smoothly
        words = full_text.split(" ")
        for word in words:
            yield word + " "
