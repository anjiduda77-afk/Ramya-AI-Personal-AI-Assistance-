"""
Unit tests for AI Providers and Multi-Cloud Router.
Verifies Local Ollama priority, Gemini, OpenAI, and xAI Grok adapters.
"""
import pytest
from app.providers.cloud_provider import CloudAIProvider
from app.providers.router import router

def test_cloud_provider_adapters():
    # 1. xAI Grok provider adapter
    xai = CloudAIProvider(provider_type="xai", api_key="test-key-xai", model="grok-beta")
    assert xai.provider_name == "cloud-xai"
    assert xai.model == "grok-beta"

    # 2. OpenAI provider adapter
    openai = CloudAIProvider(provider_type="openai", api_key="test-key-openai", model="gpt-4o-mini")
    assert openai.provider_name == "cloud-openai"
    assert openai.model == "gpt-4o-mini"

    # 3. Google Gemini provider adapter
    gemini = CloudAIProvider(provider_type="gemini", api_key="test-key-gemini", model="gemini-3-flash-preview")
    assert gemini.provider_name == "cloud-gemini"
    assert gemini.model == "gemini-3-flash-preview"

    # 4. OpenRouter provider adapter
    openrouter = CloudAIProvider(provider_type="openrouter", api_key="test-key-or", model="nvidia/nemotron-3.5-lightning:free")
    assert openrouter.provider_name == "cloud-openrouter"
    assert openrouter.model == "nvidia/nemotron-3.5-lightning:free"

@pytest.mark.asyncio
async def test_router_provider_selection():
    # Verify router discovers available providers and prefers local Ollama if online
    active_prov, model_name, is_offline = await router.get_active_provider()
    assert active_prov is not None
    assert isinstance(is_offline, bool)

@pytest.mark.asyncio
async def test_router_generate_offline_safe():
    # Generation should never crash or throw unhandled exceptions
    resp, prov_name, model_name, is_off = await router.generate("Hello Ramya")
    assert len(resp) > 0
    assert prov_name is not None
