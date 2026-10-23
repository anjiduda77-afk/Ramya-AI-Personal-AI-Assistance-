"""
Model Provider Router implementing the local-first policy for Ramya AI.
"""
import logging
from typing import AsyncGenerator, Tuple, Optional
from app.providers.base import BaseAIProvider
from app.providers.ollama_provider import OllamaProvider
from app.providers.cloud_provider import CloudAIProvider
from app.core.config import settings

logger = logging.getLogger("ramya.providers.router")

class ModelRouter:
    def __init__(self):
        self.ollama = OllamaProvider()
        self.cloud = CloudAIProvider()

    async def get_active_provider(self, force_cloud: bool = False) -> Tuple[BaseAIProvider, str, bool]:
        """
        Selects the best available model provider.
        Returns: (provider_instance, model_name, is_offline)
        """
        # If user explicitly asked for cloud and cloud is configured
        if force_cloud and await self.cloud.is_available():
            return self.cloud, self.cloud.model, False

        # Local-First: Check if Ollama is running and has model
        if await self.ollama.is_available():
            return self.ollama, self.ollama.model, False

        # Fallback to cloud if Ollama is not running
        if await self.cloud.is_available():
            logger.info("Ollama is offline; falling back to cloud provider.")
            return self.cloud, self.cloud.model, False

        # Both offline
        return self.ollama, self.ollama.model, True

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[str] = None,
        force_cloud: bool = False
    ) -> Tuple[str, str, str, bool]:
        """
        Routes the prompt to the appropriate provider.
        Returns: (response_text, provider_name, model_name, is_offline)
        """
        provider, model_name, is_offline = await self.get_active_provider(force_cloud)
        
        if is_offline:
            fallback_text = (
                "Both local Ollama (Gemma 3 4B) and cloud AI are currently offline or unreachable. "
                "Please ensure Ollama is running locally with 'ollama run gemma3:4b', or configure your cloud API key in Settings."
            )
            return fallback_text, "none", "none", True

        response_text = await provider.generate_response(prompt, system_prompt, context)
        return response_text, provider.provider_name, model_name, False

    async def stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[str] = None,
        force_cloud: bool = False
    ) -> AsyncGenerator[str, None]:
        """Streams response tokens from the selected provider."""
        provider, _, is_offline = await self.get_active_provider(force_cloud)
        if is_offline:
            yield "Local Ollama and cloud AI are currently offline. Please start Ollama or check network."
            return

        async for chunk in provider.stream_response(prompt, system_prompt, context):
            yield chunk

router = ModelRouter()
