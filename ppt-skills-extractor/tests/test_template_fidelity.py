"""Tests for template fidelity enforcement in content_writer and deck_builder."""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from langchain_core.messages import AIMessage, SystemMessage
from pptx import Presentation

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC = PROJECT_ROOT / "src"
sys.path.insert(0, str(SRC))

from agent.graph import _make_workflow_nodes, build_initial_state  # noqa: E402
from agent.prompts import CONTENT_WRITER_PROMPT, TEMPLATE_FIDELITY_INSTRUCTION  # noqa: E402
from generator.deck_builder import resolve_slide_layout_name  # noqa: E402


class ContentWriterMockLLM:
    def __init__(self):
        self.calls: list = []

    async def ainvoke(self, messages, config=None):
        self.calls.append(messages)
        return AIMessage(content=json.dumps({"element": "title-block", "title": "Test"}))


@pytest.fixture()
def event_queue():
    return asyncio.Queue()


@pytest.fixture()
def runnable_config(event_queue):
    return {"configurable": {"event_queue": event_queue}}


@pytest.mark.asyncio
async def test_content_writer_receives_template_fidelity_instruction_for_upload_template(
    runnable_config, monkeypatch
):
    mock_llm = ContentWriterMockLLM()
    nodes = _make_workflow_nodes(mock_llm)
    content_writer = nodes["content_writer"]

    state = build_initial_state(
        topic="Upload template deck",
        deck_type="elevator",
        template_id="upload-deadbeef",
    )
    state["outline"] = [{"element": "title-block", "purpose": "Intro"}]

    with patch("agent.graph.get_element_schema") as mock_schema, patch(
        "agent.graph.validate_slide_spec"
    ) as mock_validate:
        mock_schema.invoke.return_value = {
            "element": "title-block",
            "fields": {"title": {"type": "string"}},
        }
        mock_validate.invoke.return_value = {"valid": True, "errors": []}

        await content_writer(state, runnable_config)

    assert mock_llm.calls
    system_content = " ".join(
        str(m.content) for m in mock_llm.calls[0] if isinstance(m, SystemMessage)
    )
    assert TEMPLATE_FIDELITY_INSTRUCTION in system_content
    assert CONTENT_WRITER_PROMPT in system_content
    assert system_content.index(TEMPLATE_FIDELITY_INSTRUCTION) < system_content.index(
        CONTENT_WRITER_PROMPT
    )


def test_layout_validation_warns_and_falls_back_when_layout_missing(caplog):
    prs = Presentation()
    available = {layout.name for layout in prs.slide_layouts}
    missing_name = "Totally-Nonexistent-Layout-XYZ"
    assert missing_name not in available

    fallback = prs.slide_layouts[0].name
    warn_messages: list[str] = []

    resolved = resolve_slide_layout_name(
        prs,
        missing_name,
        template_id="upload-abc123",
        on_warn=lambda name: warn_messages.append(name),
    )

    assert resolved == fallback
    assert any(missing_name in rec.message for rec in caplog.records)
    assert warn_messages == [missing_name]


def test_layout_validation_does_not_warn_when_layout_valid(caplog):
    prs = Presentation()
    valid_name = prs.slide_layouts[0].name
    warn_messages: list[str] = []

    with caplog.at_level("WARNING"):
        resolved = resolve_slide_layout_name(
            prs,
            valid_name,
            template_id="upload-abc123",
            on_warn=lambda name: warn_messages.append(name),
        )

    assert resolved == valid_name
    assert not warn_messages
    assert not any("not found in template" in rec.message for rec in caplog.records)
