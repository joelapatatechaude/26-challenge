"""LangGraph ReAct agent for building Red Hat presentations.

Prompt files are loaded from src/agent/prompts/ at call time so they can be
edited without touching Python code. Template-specific SKILL.md docs are
loaded from skills-output/templates/<template_id>/SKILL.md.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import AsyncIterator

from langchain_community.chat_models import ChatLiteLLM
from langchain_core.messages import HumanMessage
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent

# Ensure src/ is on sys.path so agent/tools can import generator helpers
_SRC = Path(__file__).resolve().parent.parent
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from agent.tools import ALL_TOOLS, SKILLS_ROOT  # noqa: E402

_PROMPTS_DIR = Path(__file__).parent / "prompts"

# Module-level memory saver shared across all requests (keyed by session_id)
_memory = MemorySaver()


# ---------------------------------------------------------------------------
# Prompt helpers
# ---------------------------------------------------------------------------

def _read_prompt(filename: str) -> str:
    """Load a prompt file from the prompts/ directory next to this module."""
    path = _PROMPTS_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"Prompt file not found: {path}")
    return path.read_text(encoding="utf-8")


def _load_skill_doc(template_id: str | None) -> str:
    """Return the SKILL.md for the given template, or empty string if absent."""
    if not template_id:
        return ""
    skill_path = SKILLS_ROOT / "templates" / template_id / "SKILL.md"
    if skill_path.exists():
        return skill_path.read_text(encoding="utf-8")
    return ""


def _build_language_instruction(language: str | None) -> str:
    """Return the rendered language instruction block."""
    default_lang = os.environ.get("DEFAULT_LANGUAGE", "").strip()
    resolved = language or default_lang or None
    if resolved:
        tmpl = _read_prompt("language_explicit.md")
        return tmpl.replace("{language}", resolved)
    return _read_prompt("language_auto.md")


def build_system_prompt(
    template_id: str | None = None,
    language: str | None = None,
) -> str:
    """Compose the full system prompt from external files.

    Priority for language: per-request ``language`` arg → DEFAULT_LANGUAGE env
    var → auto-detect instruction baked into the prompt.
    """
    base = _read_prompt("system.md")
    skill_doc = _load_skill_doc(template_id)
    lang_instruction = _build_language_instruction(language)
    return base.replace("{skill_doc}", skill_doc).replace(
        "{language_instruction}", lang_instruction
    )


# ---------------------------------------------------------------------------
# LLM factory
# ---------------------------------------------------------------------------

def _get_llm() -> ChatLiteLLM:
    model = os.environ.get("LLM_MODEL", "gpt-4o")
    api_base = os.environ.get("LLM_API_BASE") or None
    kwargs: dict = {"model": model, "temperature": 0.3, "streaming": True}
    if api_base:
        kwargs["api_base"] = api_base
    return ChatLiteLLM(**kwargs)


# ---------------------------------------------------------------------------
# Agent factory
# ---------------------------------------------------------------------------

def _make_agent(system_prompt: str):
    """Build a new LangGraph ReAct agent with the given system prompt."""
    llm = _get_llm()
    return create_react_agent(
        llm,
        tools=ALL_TOOLS,
        checkpointer=_memory,
        prompt=system_prompt,
    )


# ---------------------------------------------------------------------------
# Public streaming interface
# ---------------------------------------------------------------------------

async def stream_response(
    message: str,
    session_id: str,
    template_id: str | None = None,
    language: str | None = None,
) -> AsyncIterator[str]:
    """Stream agent token output as plain strings.

    Each yielded value is a text chunk suitable for an SSE ``data:`` field.
    The session is persisted in the module-level MemorySaver keyed by
    ``session_id``, so multi-turn conversations work across calls.
    """
    system_prompt = build_system_prompt(template_id=template_id, language=language)
    agent = _make_agent(system_prompt)
    config = {"configurable": {"thread_id": session_id}}

    async for event in agent.astream_events(
        {"messages": [HumanMessage(content=message)]},
        config=config,
        version="v2",
    ):
        kind = event.get("event")
        if kind == "on_chat_model_stream":
            chunk = event.get("data", {}).get("chunk")
            if chunk and hasattr(chunk, "content") and chunk.content:
                yield chunk.content
        elif kind == "on_tool_end":
            # Surface tool completions as a lightweight status line so the UI
            # can show progress without waiting for the next LLM token.
            tool_name = event.get("name", "tool")
            output = event.get("data", {}).get("output", "")
            summary = str(output)[:120].replace("\n", " ")
            yield f"\n[{tool_name}] {summary}\n"
