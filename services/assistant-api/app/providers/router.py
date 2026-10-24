"""
Model Provider Router implementing the local-first policy and multi-cloud fallback for Ramya AI.
Supports Local Ollama (Gemma 3 4B), Google Gemini, OpenAI (ChatGPT), and xAI Grok.
Includes automatic failover across providers on quota limits, timeouts, or network loss,
and automatically enriches generation with grounded personal memory context.
"""
import logging
from typing import AsyncGenerator, Tuple, Optional, List
from app.providers.base import BaseAIProvider
from app.providers.ollama_provider import OllamaProvider
from app.providers.cloud_provider import CloudAIProvider
from app.core.config import settings
from app.memory.engine import memory_engine

logger = logging.getLogger("ramya.providers.router")

class ModelRouter:
    def __init__(self):
        self.ollama = OllamaProvider()
        self.gemini = CloudAIProvider(provider_type="gemini", api_key=settings.GEMINI_API_KEY or settings.CLOUD_API_KEY, model=settings.GEMINI_MODEL or settings.CLOUD_MODEL)
        self.openai = CloudAIProvider(provider_type="openai", api_key=settings.OPENAI_API_KEY, model=settings.OPENAI_MODEL)
        self.xai = CloudAIProvider(provider_type="xai", api_key=settings.XAI_API_KEY, model=settings.XAI_MODEL)
        self.cloud = self.gemini # default cloud handle

    async def get_available_cloud_providers(self) -> List[Tuple[str, CloudAIProvider]]:
        """Returns list of currently configured and reachable cloud providers."""
        providers = []
        if self.gemini.api_key and await self.gemini.is_available():
            providers.append(("gemini", self.gemini))
        if self.openai.api_key and await self.openai.is_available():
            providers.append(("openai", self.openai))
        if self.xai.api_key and await self.xai.is_available():
            providers.append(("xai", self.xai))
        return providers

    async def get_active_provider(self, force_cloud: bool = False) -> Tuple[BaseAIProvider, str, bool]:
        """
        Selects the best available model provider adhering to the Local-First policy.
        Returns: (provider_instance, model_name, is_offline)
        """
        cloud_providers = await self.get_available_cloud_providers()

        # If user explicitly asked for cloud
        if force_cloud and cloud_providers:
            name, prov = cloud_providers[0]
            return prov, prov.model, False

        # 1. Local-First: Check if local Ollama (Gemma 3 4B) is running
        if await self.ollama.is_available():
            return self.ollama, self.ollama.model, False

        # 2. Fallback to first available authorized cloud provider
        if cloud_providers:
            name, prov = cloud_providers[0]
            logger.info(f"Ollama is offline; falling back to cloud provider ({name}).")
            return prov, prov.model, False

        # 3. All AI providers offline
        return self.ollama, self.ollama.model, True

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[str] = None,
        force_cloud: bool = False
    ) -> Tuple[str, str, str, bool]:
        """
        Routes the prompt with automatic multi-provider fallback.
        Integrates grounded personal memory context to recall user facts accurately.
        Returns: (response_text, provider_name, model_name, is_offline)
        """
        # Enrich context with relevant personal memory (never fabricate)
        memory_ctx = memory_engine.get_contextual_memories_for_prompt(prompt)
        combined_context = f"{context}\n\n{memory_ctx}".strip() if context else memory_ctx
        combined_context = combined_context or None

        # Determine starting provider
        provider, model_name, is_offline = await self.get_active_provider(force_cloud)
        
        if is_offline:
            fallback_text = (
                "Both local Ollama (Gemma 3 4B) and cloud AI are currently offline or unreachable. "
                "Please ensure Ollama is running locally with 'ollama run gemma3:4b', or configure your cloud API key in Settings."
            )
            return fallback_text, "none", "none", True

        # Attempt primary provider
        try:
            response_text = await provider.generate_response(prompt, system_prompt, combined_context)
            if response_text and not response_text.startswith("Cloud intelligence is temporarily unable"):
                return response_text, provider.provider_name, model_name, False
        except Exception as e:
            logger.warning(f"Primary provider {provider.provider_name} failed: {e}")

        # Automatic Failover to other authorized cloud providers
        cloud_providers = await self.get_available_cloud_providers()
        for name, alt_prov in cloud_providers:
            if alt_prov.provider_name != provider.provider_name:
                logger.info(f"Failing over to alternate cloud provider: {name}")
                try:
                    alt_text = await alt_prov.generate_response(prompt, system_prompt, combined_context)
                    if alt_text and not alt_text.startswith("Cloud intelligence is temporarily unable"):
                        return alt_text, alt_prov.provider_name, alt_prov.model, False
                except Exception as e:
                    logger.warning(f"Failover provider {name} failed: {e}")

        # Fallback if all attempts encountered errors
        fallback_msg = "I am ready and listening, but the active AI model did not return a response. Please verify network connectivity or local Ollama status."
        return fallback_msg, provider.provider_name, model_name, False

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

        memory_ctx = memory_engine.get_contextual_memories_for_prompt(prompt)
        combined_context = f"{context}\n\n{memory_ctx}".strip() if context else memory_ctx
        combined_context = combined_context or None

        async for chunk in provider.stream_response(prompt, system_prompt, combined_context):
            yield chunk

router = ModelRouter()
