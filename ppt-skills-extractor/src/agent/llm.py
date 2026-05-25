"""LLM factory — mirrors Vyogo pattern with env-based configuration."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml
from langchain_openai import ChatOpenAI


def _load_crew_config() -> dict[str, Any]:
    """Fallback LLM settings from ~/.crew-ai/config.yaml when env vars are absent."""
    config_path = Path.home() / ".crew-ai" / "config.yaml"
    if not config_path.exists():
        return {}
    try:
        with config_path.open() as f:
            data = yaml.safe_load(f) or {}
        return data.get("llm", data)
    except Exception:
        return {}


def create_llm(
    *,
    provider: str | None = None,
    model: str | None = None,
    api_key: str | None = None,
    base_url: str | None = None,
    temperature: float = 0.3,
    max_tokens: int | None = None,
) -> ChatOpenAI:
    """Create a ChatOpenAI instance with configurable base_url for OpenRouter/LiteLLM."""
    crew = _load_crew_config()

    resolved_provider = (
        provider
        or os.environ.get("LLM_PROVIDER")
        or crew.get("provider", "openai")
    ).lower()
    resolved_model = (
        model
        or os.environ.get("LLM_MODEL")
        or crew.get("model")
        or crew.get("model_manager", "gpt-4o-mini")
    )
    resolved_key = (
        api_key
        or os.environ.get("LLM_API_KEY")
        or os.environ.get("OPENAI_API_KEY")
        or crew.get("api_key")
    )
    resolved_base = (
        base_url
        or os.environ.get("LLM_BASE_URL")
        or os.environ.get("LLM_API_BASE")
        or crew.get("base_url")
        or crew.get("api_base_url")
    )

    kwargs: dict[str, Any] = {
        "model": resolved_model,
        "temperature": temperature,
    }
    if resolved_key:
        kwargs["api_key"] = resolved_key
    if resolved_base:
        kwargs["base_url"] = resolved_base
    if max_tokens is not None:
        kwargs["max_tokens"] = max_tokens
    elif crew.get("max_tokens"):
        kwargs["max_tokens"] = crew["max_tokens"]

    if resolved_provider == "openrouter":
        kwargs["default_headers"] = {
            "HTTP-Referer": "https://redhat.com",
            "X-Title": "Field Enablement PPT Agent",
        }

    return ChatOpenAI(**kwargs)
