"""Unit tests for comprehension_node in the planning graph."""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path
from unittest.mock import AsyncMock

import pytest
from langchain_core.messages import AIMessage, SystemMessage

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SRC = PROJECT_ROOT / "src"
sys.path.insert(0, str(SRC))

from agent.graph import _make_workflow_nodes, build_initial_state  # noqa: E402


def _comprehension_payload(**overrides) -> dict:
    base = {
        "deck_mode": "fresh",
        "customer": "",
        "audience": "IT decision makers",
        "geo_context": "",
        "document_ref": "no documents",
        "summary": "Building a deck from the prompt. Key themes will be drawn from your prompt.",
        "themes_status": "to_be_extracted",
        "gaps": [],
    }
    base.update(overrides)
    return base


class ScenarioMockLLM:
    """Returns comprehension JSON tailored to the user prompt."""

    def __init__(self, payload: dict | None = None, *, bad_json: bool = False):
        self.payload = payload or _comprehension_payload()
        self.bad_json = bad_json
        self.calls: list = []

    async def ainvoke(self, messages, config=None):
        self.calls.append(messages)
        if self.bad_json:
            return AIMessage(content="not valid json {{{")
        return AIMessage(content=json.dumps(self.payload))


@pytest.fixture()
def event_queue():
    return asyncio.Queue()


@pytest.fixture()
def runnable_config(event_queue):
    return {"configurable": {"event_queue": event_queue}}


def _get_comprehension_node(mock_llm):
    nodes = _make_workflow_nodes(mock_llm)
    return nodes["comprehension_node"]


def _base_state(**kwargs):
    state = build_initial_state(topic="OpenShift sovereignty pitch", deck_type="competitive")
    state.update(kwargs)
    return state


async def _collect_events(queue: asyncio.Queue) -> list[dict]:
    events = []
    while not queue.empty():
        item = queue.get_nowait()
        if item is not None:
            events.append(item)
    return events


@pytest.mark.asyncio
async def test_comprehension_node_emits_comprehension_sse_event(runnable_config, event_queue):
    payload = _comprehension_payload(deck_mode="fresh", customer="Acme")
    mock_llm = ScenarioMockLLM(payload)
    node = _get_comprehension_node(mock_llm)
    state = _base_state(customer="Acme")

    result = await node(state, runnable_config)
    events = await _collect_events(event_queue)

    comprehension_events = [e for e in events if e.get("event") == "comprehension"]
    assert len(comprehension_events) == 1
    data = json.loads(comprehension_events[0]["data"])
    assert data["deck_mode"] == "fresh"
    assert data["customer"] == "Acme"
    assert data["themes_status"] == "to_be_extracted"
    assert "summary" in data
    assert isinstance(data["gaps"], list)
    assert result.get("intent_summary") == data


@pytest.mark.asyncio
async def test_comprehension_node_sets_intent_summary_in_state(runnable_config):
    payload = _comprehension_payload(deck_mode="localise", geo_context="Germany — DSGVO")
    mock_llm = ScenarioMockLLM(payload)
    node = _get_comprehension_node(mock_llm)
    state = _base_state(geo="Germany")

    result = await node(state, runnable_config)

    assert result["intent_summary"] is not None
    assert result["intent_summary"]["deck_mode"] == "localise"
    assert result["intent_summary"]["geo_context"] == "Germany — DSGVO"


@pytest.mark.asyncio
async def test_comprehension_node_skips_when_planning_comprehension_false(
    monkeypatch, runnable_config, event_queue
):
    monkeypatch.setenv("PLANNING_COMPREHENSION", "false")
    import agent.graph as graph_module

    monkeypatch.setattr(graph_module, "_PLANNING_COMPREHENSION", False)

    mock_llm = AsyncMock()
    node = _get_comprehension_node(mock_llm)
    state = _base_state()

    result = await node(state, runnable_config)
    events = await _collect_events(event_queue)

    mock_llm.ainvoke.assert_not_called()
    assert result == {}
    assert not any(e.get("event") == "comprehension" for e in events)


@pytest.mark.asyncio
async def test_comprehension_node_does_not_raise_on_llm_json_parse_error(
    runnable_config, event_queue
):
    mock_llm = ScenarioMockLLM(bad_json=True)
    node = _get_comprehension_node(mock_llm)
    state = _base_state()

    result = await node(state, runnable_config)
    events = await _collect_events(event_queue)

    assert result.get("intent_summary") is None
    assert not any(e.get("event") == "comprehension" for e in events)


@pytest.mark.asyncio
async def test_deck_mode_baseline_when_theme_template_in_uploaded_files(runnable_config):
    payload = _comprehension_payload(
        deck_mode="baseline",
        document_ref="uploaded PPTX baseline deck",
        summary=(
            "Using the uploaded template as baseline. "
            "Key themes will be extracted from the presentation. "
            "The template's assets, layouts, and brand styles will be applied strictly throughout the deck."
        ),
    )
    mock_llm = ScenarioMockLLM(payload)
    node = _get_comprehension_node(mock_llm)
    state = _base_state(
        uploaded_files_description="brand-deck.pptx (theme template)",
        research_context={"documents": {"content": "Slide 1 title"}},
    )

    result = await node(state, runnable_config)

    assert mock_llm.calls
    all_text = " ".join(str(m.content) for m in mock_llm.calls[0])
    assert "(theme template)" in all_text
    assert result["intent_summary"]["deck_mode"] == "baseline"


@pytest.mark.asyncio
async def test_deck_mode_localise_when_geo_set_no_pptx_template(runnable_config):
    payload = _comprehension_payload(
        deck_mode="localise",
        geo_context="Germany — DSGVO / BSI C5",
        document_ref="uploaded PDF reference",
        summary="Localising for Germany. Key themes will be extracted from the document.",
    )
    mock_llm = ScenarioMockLLM(payload)
    node = _get_comprehension_node(mock_llm)
    state = _base_state(
        geo="Germany",
        uploaded_files_description="annual-report.pdf (reference)",
        research_context={"documents": {"content": "Compliance overview for EU"}},
    )

    result = await node(state, runnable_config)

    assert result["intent_summary"]["deck_mode"] == "localise"
    assert "DSGVO" in result["intent_summary"]["geo_context"]


@pytest.mark.asyncio
async def test_deck_mode_fresh_when_no_files_minimal_prompt(runnable_config):
    payload = _comprehension_payload(
        deck_mode="fresh",
        summary="Pitch deck from prompt only. Key themes will be drawn from your prompt.",
    )
    mock_llm = ScenarioMockLLM(payload)
    node = _get_comprehension_node(mock_llm)
    state = _base_state(topic="Quick competitive pitch")

    result = await node(state, runnable_config)

    assert result["intent_summary"]["deck_mode"] == "fresh"
    assert result["intent_summary"]["document_ref"] == "no documents"


@pytest.mark.asyncio
async def test_summary_never_contains_invented_themes(runnable_config):
    payload = _comprehension_payload(
        summary="Focused deck for the customer. Key themes will be drawn from your prompt.",
    )
    mock_llm = ScenarioMockLLM(payload)
    node = _get_comprehension_node(mock_llm)
    state = _base_state()

    result = await node(state, runnable_config)

    assert result["intent_summary"]["themes_status"] == "to_be_extracted"
    summary = result["intent_summary"]["summary"].lower()
    assert "theme 1" not in summary
    assert "theme 2" not in summary


@pytest.mark.asyncio
async def test_baseline_mode_summary_contains_strict_template_sentence(runnable_config):
    payload = _comprehension_payload(
        deck_mode="baseline",
        summary=(
            "Template-driven deck for Acme. "
            "Key themes will be extracted from the presentation. "
            "The template's assets, layouts, and brand styles will be applied strictly throughout the deck."
        ),
    )
    mock_llm = ScenarioMockLLM(payload)
    node = _get_comprehension_node(mock_llm)
    state = _base_state(uploaded_files_description="brand.pptx (theme template)")

    result = await node(state, runnable_config)

    summary = result["intent_summary"]["summary"]
    assert "assets, layouts, and brand styles will be applied strictly" in summary


@pytest.mark.asyncio
async def test_comprehension_uses_comprehension_prompt(runnable_config):
    mock_llm = ScenarioMockLLM()
    node = _get_comprehension_node(mock_llm)
    state = _base_state(
        topic="Test topic",
        customer="Contoso",
        geo="France",
        uploaded_files_description="ref.pdf (reference)",
        research_context={"documents": {"content": "Doc excerpt text"}},
    )

    await node(state, runnable_config)

    sys_msgs = [m for m in mock_llm.calls[0] if isinstance(m, SystemMessage)]
    assert sys_msgs
    assert "You are summarising what a user wants before building a presentation." in sys_msgs[0].content
    assert "Test topic" in sys_msgs[0].content
