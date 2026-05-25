"""
Use an LLM to classify the slide sequence of a deck into section roles and deck type.
Uses LangChain + ChatLiteLLM with structured output.
"""

from __future__ import annotations

import os
from typing import Optional

from langchain_community.chat_models import ChatLiteLLM
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
from rich.console import Console

from schemas import (
    DeckClassification,
    DeckType,
    ElementMatch,
    ElementType,
    RawSlide,
    SectionMatch,
    SectionRole,
    TemplateProfile,
)

console = Console()

SYSTEM_PROMPT = """\
You are a presentation analyst specialising in Red Hat branded slide decks.

Given a sequence of slides (title + element types found on each slide),
you must:
1. Identify the overall deck type.
2. Assign each slide a section role from the allowed list.
3. Write a short narrative arc description (2-3 sentences).

Deck types: post-event-report, exec-briefing, technical-deep-dive, sales-pitch, field-event-summary, unknown
Section roles: title-slide, executive-summary, participation-overview, feedback-results,
               automation-opportunities, opportunity-map, customer-challenges,
               recommendations, priority-accounts, closing, generic-content

Be precise. Every slide must get a role.
"""

USER_TEMPLATE = """\
Template: {template_name}
File: {filename}

Slides:
{slide_summary}

Classify this deck.
"""


class _SlideClassification(BaseModel):
    slide_index: int
    section_role: SectionRole
    narrative_notes: str = ""


class _DeckClassificationLLM(BaseModel):
    deck_type: DeckType
    narrative_arc: str
    slides: list[_SlideClassification]


def _build_slide_summary(slides: list[RawSlide], elements: list[ElementMatch]) -> str:
    element_map: dict[int, list[str]] = {}
    for em in elements:
        element_map.setdefault(em.slide_index, []).append(em.element_type.value)

    lines = []
    for slide in slides:
        elem_str = ", ".join(element_map.get(slide.slide_index, ["(no classified elements)"]))
        lines.append(f"  Slide {slide.slide_index}: title='{slide.title}' | elements=[{elem_str}]")
    return "\n".join(lines)


def classify_deck(
    slides: list[RawSlide],
    elements: list[ElementMatch],
    template: TemplateProfile,
    model: Optional[str] = None,
) -> DeckClassification:
    model = model or os.environ.get("LLM_MODEL", "gpt-4o")
    api_base = os.environ.get("LLM_API_BASE") or None

    llm_kwargs: dict = {"model": model, "temperature": 0.0}
    if api_base:
        llm_kwargs["api_base"] = api_base

    llm = ChatLiteLLM(**llm_kwargs)
    structured_llm = llm.with_structured_output(_DeckClassificationLLM)

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", USER_TEMPLATE),
    ])

    filename = slides[0].file if slides else "unknown"
    slide_summary = _build_slide_summary(slides, elements)

    chain = prompt | structured_llm
    console.print(f"  [cyan]Classifying sections[/cyan] for [bold]{filename}[/bold] via {model}…")

    result: _DeckClassificationLLM = chain.invoke({
        "template_name": template.name,
        "filename": filename,
        "slide_summary": slide_summary,
    })

    element_map: dict[int, list[ElementType]] = {}
    for em in elements:
        element_map.setdefault(em.slide_index, []).append(em.element_type)

    section_matches = [
        SectionMatch(
            template_id=template.template_id,
            file=filename,
            deck_type=result.deck_type,
            slide_index=sc.slide_index,
            section_role=sc.section_role,
            element_types=element_map.get(sc.slide_index, []),
            narrative_notes=sc.narrative_notes,
        )
        for sc in result.slides
    ]

    return DeckClassification(
        file=filename,
        template_id=template.template_id,
        deck_type=result.deck_type,
        sections=section_matches,
        narrative_arc=result.narrative_arc,
    )
