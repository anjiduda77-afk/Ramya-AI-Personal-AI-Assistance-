"""
Abstract Base Class for AI Model Providers (Local and Cloud).
"""
from abc import ABC, abstractmethod
from typing import AsyncGenerator, Dict, Any, Optional

class BaseAIProvider(ABC):
    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of provider: ollama, gemini, etc."""
        pass

    @abstractmethod
    async def is_available(self) -> bool:
        """Health check for provider availability."""
        pass

    @abstractmethod
    async def generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[str] = None,
        temperature: float = 0.7
    ) -> str:
        """Generates a complete response text."""
        pass

    @abstractmethod
    async def stream_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[str] = None,
        temperature: float = 0.7
    ) -> AsyncGenerator[str, None]:
        """Streams token chunks as they arrive."""
        pass
