"""Use an LLM to generate human-readable skill documentation.

Given classified element matches and section classifications, this module
calls a LiteLLM-backed structured-output chain to produce ``when_to_use``,
``constraints``, and ``narrative_pattern`` fields for element and section
skill YAMLs.
"""

from __future__ import annotations

import json
import os
from typing import Any, Optional

from langchain_community.chat_models import ChatLiteLLM
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from schemas import (
    DeckClassification,
    ElementMatch,
    ElementSkill,
    ElementType,
    RhExample,
    SectionSkill,
    TemplateProfile,
)


# ---------------------------------------------------------------------------
# LLM factory
# ---------------------------------------------------------------------------

def _get_llm(model: Optional[str]) -> ChatLiteLLM:
    model = model or os.environ.get("LLM_MODEL", "gpt-4o")
    api_base = os.environ.get("LLM_API_BASE") or None
    kwargs: dict[str, Any] = {"model": model, "temperature": 0.0}
    if api_base:
        kwargs["api_base"] = api_base
    return ChatLiteLLM(**kwargs)


# ---------------------------------------------------------------------------
# Element annotation
# ---------------------------------------------------------------------------

class _EL(BaseModel):
    """Structured output for element skill annotation."""
    name: str = Field(description="Short human-readable element name (3-6 words)")
    description: str = Field(description="One-sentence description of this element's visual role")
    when_to_use: list[str] = Field(description="2-4 bullet points: when this element fits the narrative")
    constraints: list[str] = Field(description="2-4 bullet points: visual / content constraints the agent must follow")


_ELEMENT_SYSTEM = (
    "You are a Red Hat presentation design expert. "
    "Given real slide examples of a visual element, write concise skill docs "
    "to guide an AI agent to reproduce this element correctly."
)

_ELEMENT_USER = (
    "Template: {template_name}\n"
    "Element type: {element_type}\n\n"
    "Examples (visual properties):\n{examples}\n\n"
    "Write skill documentation for this element type."
)


def _agg_visual(matches: list[ElementMatch]) -> dict[str, Any]:
    """Aggregate visual properties across multiple element match examples."""
    fills = [m.visual.get("fill_color") for m in matches if m.visual.get("fill_color")]
    fonts = []
    for m in matches:
        fonts.extend(m.visual.get("font_sizes", []))
    return {
        "fill_colors": list(set(fills))[:5],
        "font_sizes": sorted(set(fonts))[:6],
        "example_count": len(matches),
        "raw_content_samples": [m.raw_content for m in matches[:2]],
    }


def annotate_elements(
    elements: list[ElementMatch],
    template: TemplateProfile,
    model: Optional[str] = None,
) -> list[ElementSkill]:
    """Produce one ElementSkill per unique element type found in *elements*."""
    llm = _get_llm(model)
    chain = (
        ChatPromptTemplate.from_messages(
            [("system", _ELEMENT_SYSTEM), ("human", _ELEMENT_USER)]
        )
        | llm.with_structured_output(_EL)
    )

    # Group by element type
    by_type: dict[str, list[ElementMatch]] = {}
    for em in elements:
        by_type.setdefault(em.element_type.value, []).append(em)

    skills: list[ElementSkill] = []
    for etype_val, matches in by_type.items():
        if etype_val == ElementType.UNKNOWN.value:
            continue
        agg = _agg_visual(matches)
        examples_str = json.dumps(agg, indent=2)
        try:
            result: _EL = chain.invoke(
                {
                    "template_name": template.name,
                    "element_type": etype_val,
                    "examples": examples_str,
                }
            )
        except Exception as exc:
            result = _EL(
                name=etype_val.replace("-", " ").title(),
                description=f"A {etype_val} element from the {template.name} template.",
                when_to_use=["Use when visualising key metrics or data points."],
                constraints=["Follow Red Hat brand colours and typography."],
            )

        rh_examples = [
            RhExample(
                source=m.file,
                slide=m.slide_index,
                values=list(m.raw_content.values())[:3],
            )
            for m in matches[:3]
        ]

        skills.append(
            ElementSkill(
                skill_id=f"{template.template_id}-{etype_val}",
                template_id=template.template_id,
                name=result.name,
                description=result.description,
                when_to_use=result.when_to_use,
                constraints=result.constraints,
                visual=agg,
                rh_examples=rh_examples,
            )
        )
    return skills


# ---------------------------------------------------------------------------
# Section annotation
# ---------------------------------------------------------------------------

class _SE(BaseModel):
    """Structured output for section skill annotation."""
    name: str = Field(description="Short human-readable section name (3-6 words)")
    position: str = Field(description="Where this section appears: opening / middle / closing")
    purpose: str = Field(description="One-sentence purpose of this section in the narrative")
    required_elements: list[str] = Field(description="Element types that must appear in this section")
    optional_elements: list[str] = Field(description="Element types that may appear in this section")
    narrative_pattern: str = Field(
        description="2-3 sentence narrative guidance for the agent: what story this section tells"
    )


_SECTION_SYSTEM = (
    "You are a Red Hat presentation narrative expert. "
    "Given examples of a section role across multiple decks, write skill docs "
    "guiding an AI agent on where and how to use this section."
)

_SECTION_USER = (
    "Template: {template_name}\n"
    "Deck type: {deck_type}\n"
    "Section role: {section_role}\n\n"
    "Examples:\n{examples}\n\n"
    "Write skill documentation for this section."
)


def annotate_sections(
    classifications: list[DeckClassification],
    template: TemplateProfile,
    model: Optional[str] = None,
) -> list[SectionSkill]:
    """Produce one SectionSkill per unique section role across all deck classifications."""
    llm = _get_llm(model)
    chain = (
        ChatPromptTemplate.from_messages(
            [("system", _SECTION_SYSTEM), ("human", _SECTION_USER)]
        )
        | llm.with_structured_output(_SE)
    )

    # Collect all sections grouped by role
    by_role: dict[str, list[Any]] = {}
    deck_types_by_role: dict[str, list[str]] = {}
    for dc in classifications:
        for sec in dc.sections:
            role = sec.section_role.value
            by_role.setdefault(role, []).append(sec)
            deck_types_by_role.setdefault(role, []).append(dc.deck_type.value)

    skills: list[SectionSkill] = []
    for role, sections in by_role.items():
        examples_data = [
            {
                "file": s.file,
                "slide_index": s.slide_index,
                "element_types": [e.value for e in s.element_types],
                "notes": s.narrative_notes,
            }
            for s in sections[:4]
        ]
        deck_type_str = deck_types_by_role[role][0] if deck_types_by_role.get(role) else "unknown"

        try:
            result: _SE = chain.invoke(
                {
                    "template_name": template.name,
                    "deck_type": deck_type_str,
                    "section_role": role,
                    "examples": json.dumps(examples_data, indent=2),
                }
            )
        except Exception:
            result = _SE(
                name=role.replace("-", " ").title(),
                position="middle",
                purpose=f"Covers the {role} phase of the presentation.",
                required_elements=[],
                optional_elements=[],
                narrative_pattern=(
                    f"This section focuses on {role}. "
                    "Ensure content is concise and visually consistent with the template."
                ),
            )

        rh_examples = [
            RhExample(source=s.file, slide=s.slide_index, note=s.narrative_notes)
            for s in sections[:3]
        ]

        skills.append(
            SectionSkill(
                skill_id=f"{template.template_id}-{role}",
                template_id=template.template_id,
                deck_types=list(set(deck_types_by_role.get(role, []))),
                name=result.name,
                position=result.position,
                purpose=result.purpose,
                required_elements=result.required_elements,
                optional_elements=result.optional_elements,
                narrative_pattern=result.narrative_pattern,
                rh_examples=rh_examples,
            )
        )
    return skills
