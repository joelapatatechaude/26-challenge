"""Specialist sub-agent definitions for parallel deck research."""

from __future__ import annotations

from dataclasses import dataclass

from agent.prompts import (
    GEO_CONTEXT_PROMPT,
    SKILLS_CONTEXT_PROMPT,
    WEB_RESEARCH_PROMPT,
)


@dataclass(frozen=True)
class SubAgentSpec:
    id: str
    name: str
    system_prompt: str
    tools: list[str]
    always_run: bool = True


SUBAGENTS: dict[str, SubAgentSpec] = {
    "skills_context": SubAgentSpec(
        id="skills_context",
        name="Skills Context",
        system_prompt=SKILLS_CONTEXT_PROMPT,
        tools=["list_elements", "get_narrative_guide", "get_element_schema"],
        always_run=True,
    ),
    "geo_context": SubAgentSpec(
        id="geo_context",
        name="Geo Context",
        system_prompt=GEO_CONTEXT_PROMPT,
        tools=[],
        always_run=True,
    ),
    "web_research": SubAgentSpec(
        id="web_research",
        name="Web Research",
        system_prompt=WEB_RESEARCH_PROMPT,
        tools=["duckduckgo_search"],
        always_run=False,
    ),
}


def get_always_on_agents() -> list[SubAgentSpec]:
    return [spec for spec in SUBAGENTS.values() if spec.always_run]


def get_optional_agents(include_web_research: bool) -> list[SubAgentSpec]:
    if not include_web_research:
        return []
    return [SUBAGENTS["web_research"]]
