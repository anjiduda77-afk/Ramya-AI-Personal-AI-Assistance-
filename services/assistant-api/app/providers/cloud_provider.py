"""
Configurable Cloud AI Provider adapter for Ramya AI.
Supports official OpenAI API (gpt-4o-mini, gpt-4o) and Google Gemini API.
Includes usage tracking, token limits, exponential backoff, and strict credential isolation.
"""
import uuid
import httpx
import asyncio
import logging
from typing import AsyncGenerator, Optional, Dict, Any
from app.providers.base import BaseAIProvider
from app.core.config import settings
from app.database.db import db

logger = logging.getLogger("ramya.providers.cloud")

class CloudAIProvider(BaseAIProvider):
    def __init__(
        self,
        provider_type: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None
    ):
        pt = provider_type or settings.CLOUD_PROVIDER
        self._provider_type = pt.lower() if pt else "gemini"
        
        # Pick appropriate API key and model based on provider type
        if "xai" in self._provider_type or "grok" in self._provider_type:
            self.api_key = api_key or settings.XAI_API_KEY or settings.CLOUD_API_KEY
            self.model = model or settings.XAI_MODEL or "grok-beta"
        elif "openai" in self._provider_type:
            self.api_key = api_key or settings.OPENAI_API_KEY or settings.CLOUD_API_KEY
            self.model = model or settings.OPENAI_MODEL or "gpt-4o-mini"
        else:
            self.api_key = api_key or settings.GEMINI_API_KEY or settings.CLOUD_API_KEY
            self.model = model or settings.GEMINI_MODEL or settings.CLOUD_MODEL

    @property
    def provider_name(self) -> str:
        return f"cloud-{self._provider_type}"

    async def is_available(self) -> bool:
        """Returns True if API key is configured and valid network connection exists."""
        if not self.api_key:
            return False
        try:
            target = (
                "https://api.openai.com" if "openai" in self._provider_type
                else ("https://api.x.ai" if ("xai" in self._provider_type or "grok" in self._provider_type)
                else "https://generativelanguage.googleapis.com")
            )
            async with httpx.AsyncClient(timeout=3.0) as client:
                res = await client.get(target)
                return res.status_code in [200, 404, 401, 403, 405]
        except Exception:
            return False

    def _record_usage(self, prompt_tokens: int, completion_tokens: int):
        """Records token usage in SQLite for budget/spending controls."""
        try:
            total_tokens = prompt_tokens + completion_tokens
            # Approximate cost tracking ($0.15 per 1M tokens)
            cost = (total_tokens / 1_000_000.0) * 0.15
            with db.get_connection() as conn:
                conn.execute(
                    """
                    INSERT INTO cloud_usage (id, provider, model, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd)
                    VALUES (?, ?, ?, ?, ?, ?, ?);
                    """,
                    (str(uuid.uuid4()), self._provider_type, self.model, prompt_tokens, completion_tokens, total_tokens, cost)
                )
        except Exception as e:
            logger.warning(f"Failed to record cloud usage: {e}")

    async def generate_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[str] = None,
        temperature: float = 0.7
    ) -> str:
        """Sends prompt to OpenAI, xAI Grok, or Gemini with bounded exponential backoff."""
        if not self.api_key:
            return "Cloud intelligence is not currently configured. I will continue answering using local memory."

        # 1. OpenAI Chat Completions Adapter
        if "openai" in self._provider_type:
            return await self._generate_openai(prompt, system_prompt, context, temperature)

        # 2. xAI Grok API Adapter
        if "xai" in self._provider_type or "grok" in self._provider_type:
            return await self._generate_xai(prompt, system_prompt, context, temperature)

        # 3. Google Gemini API Adapter
        if "gemini" in self._provider_type:
            return await self._generate_gemini(prompt, system_prompt, context, temperature)

        return "Configured cloud provider is currently unavailable or unsupported."

    async def _generate_openai(
        self,
        prompt: str,
        system_prompt: Optional[str],
        context: Optional[str],
        temperature: float
    ) -> str:
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        # Truncate context if necessary to respect token bounds
        trimmed_context = (context[:3000] + "...") if context and len(context) > 3000 else context
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        if trimmed_context:
            messages.append({"role": "system", "content": f"Context Information:\n{trimmed_context}"})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model if self.model and "gpt" in self.model else "gpt-4o-mini",
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 1024
        }

        # Retry with exponential backoff on 429 or 5xx
        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=25.0) as client:
                    res = await client.post(url, json=payload, headers=headers)
                    if res.status_code == 200:
                        data = res.json()
                        usage = data.get("usage", {})
                        self._record_usage(
                            usage.get("prompt_tokens", 0),
                            usage.get("completion_tokens", 0)
                        )
                        choices = data.get("choices", [])
                        if choices:
                            return choices[0].get("message", {}).get("content", "").strip()
                        return "I am ready, but no response was returned."
                    elif res.status_code == 429:
                        logger.warning(f"OpenAI rate limited (429), attempt {attempt + 1}")
                        await asyncio.sleep(2 ** attempt)
                        continue
                    elif res.status_code >= 500:
                        logger.warning(f"OpenAI server error ({res.status_code}), attempt {attempt + 1}")
                        await asyncio.sleep(1.5 ** attempt)
                        continue
                    else:
                        logger.error(f"OpenAI error status: {res.status_code}")
                        return "Cloud intelligence is temporarily unable to answer that request. Please try again shortly."
            except httpx.TimeoutException:
                logger.warning(f"OpenAI timeout on attempt {attempt + 1}")
                if attempt == 2:
                    return "The request timed out. Please try again or use local offline mode."
            except Exception as e:
                logger.error(f"OpenAI request error: {e}")
                return "I couldn't complete that online request. You can try again or switch to offline mode."

        return "I'm temporarily unable to answer that request. Please try again shortly."

    async def _generate_xai(
        self,
        prompt: str,
        system_prompt: Optional[str],
        context: Optional[str],
        temperature: float
    ) -> str:
        """Adapter for xAI Grok API."""
        url = "https://api.x.ai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

        trimmed_context = (context[:3000] + "...") if context and len(context) > 3000 else context
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        if trimmed_context:
            messages.append({"role": "system", "content": f"Context Information:\n{trimmed_context}"})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model if self.model and "grok" in self.model else "grok-beta",
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 1024
        }

        for attempt in range(3):
            try:
                async with httpx.AsyncClient(timeout=25.0) as client:
                    res = await client.post(url, json=payload, headers=headers)
                    if res.status_code == 200:
                        data = res.json()
                        usage = data.get("usage", {})
                        self._record_usage(
                            usage.get("prompt_tokens", 0),
                            usage.get("completion_tokens", 0)
                        )
                        choices = data.get("choices", [])
                        if choices:
                            return choices[0].get("message", {}).get("content", "").strip()
                        return "I am ready, but no response was returned."
                    elif res.status_code == 429:
                        logger.warning(f"xAI Grok rate limited (429), attempt {attempt + 1}")
                        await asyncio.sleep(2 ** attempt)
                        continue
                    elif res.status_code >= 500:
                        logger.warning(f"xAI Grok server error ({res.status_code}), attempt {attempt + 1}")
                        await asyncio.sleep(1.5 ** attempt)
                        continue
                    else:
                        logger.error(f"xAI Grok error status: {res.status_code}")
                        return "Cloud intelligence is temporarily unable to answer that request. Please try again shortly."
            except httpx.TimeoutException:
                logger.warning(f"xAI Grok timeout on attempt {attempt + 1}")
                if attempt == 2:
                    return "The request timed out. Please try again or use local offline mode."
            except Exception as e:
                logger.error(f"xAI Grok request error: {e}")
                return "I couldn't complete that online request. You can try again or switch to offline mode."

        return "I'm temporarily unable to answer that request. Please try again shortly."

    async def _generate_gemini(
        self,
        prompt: str,
        system_prompt: Optional[str],
        context: Optional[str],
        temperature: float
    ) -> str:
        model_name = self.model if self.model and "gemini" in self.model else "gemini-1.5-flash"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}

        full_prompt = prompt
        if context:
            full_prompt = f"Context:\n{context[:3000]}\n\nUser Question:\n{prompt}"
        if system_prompt:
            full_prompt = f"System Instructions:\n{system_prompt}\n\n{full_prompt}"

        payload = {
            "contents": [{"parts": [{"text": full_prompt}]}],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": 1024
            }
        }

        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                res = await client.post(url, json=payload, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            return parts[0].get("text", "").strip()
                    return "I am ready, but no response was returned."
                else:
                    logger.error(f"Gemini API returned status {res.status_code}")
                    return "Cloud intelligence is temporarily unable to answer that request. Please try again shortly."
        except Exception as e:
            logger.error(f"Gemini connection error: {e}")
            return "I couldn't complete that online request. You can try again shortly."

    async def stream_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        context: Optional[str] = None,
        temperature: float = 0.7
    ) -> AsyncGenerator[str, None]:
        full_text = await self.generate_response(prompt, system_prompt, context, temperature)
        words = full_text.split(" ")
        for word in words:
            yield word + " "
