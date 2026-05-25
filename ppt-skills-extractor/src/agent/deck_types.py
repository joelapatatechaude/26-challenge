"""Deck type registry — maps enablement formats to element flows and reference PPTX files."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_TEMPLATES_DIR = _PROJECT_ROOT / "templates"

DEFAULT_TEMPLATE_ID = "sales-enablement-2022"


@dataclass(frozen=True)
class DeckTypeSpec:
    id: str
    name: str
    description: str
    slide_count_min: int
    slide_count_max: int
    elements: list[str]
    pptx_filename: str
    content_slots: list[str] = field(default_factory=list)


# Content element placeholders used in shorter deck types (elevator pitch).
_CONTENT_ELEMENTS = ["image-content", "challenge-list", "quote-block", "tech-tile"]

# Full catalogue for power-hour decks.
_POWER_HOUR_ELEMENTS = [
    "title-block",
    "agenda",
    "divider",
    "challenge-list",
    "metric-card",
    "quote-block",
    "divider",
    "tech-tile",
    "image-content",
    "data-table",
    "bar-chart",
    "divider",
    "timeline",
    "recommendation-card",
    "image-content",
    "divider",
    "recommendation-card",
    "closing",
]

DECK_TYPES: dict[str, DeckTypeSpec] = {
    "elevator": DeckTypeSpec(
        id="elevator",
        name="5-Minute Elevator Pitch",
        description="Short intro pitch — title, two content slides, recommendation, closing.",
        slide_count_min=5,
        slide_count_max=5,
        elements=[
            "title-block",
            "image-content",
            "challenge-list",
            "recommendation-card",
            "closing",
        ],
        pptx_filename="Sovereignty Customer Facing Intro pitch deck.PPTX",
        content_slots=["image-content", "challenge-list"],
    ),
    "competitive": DeckTypeSpec(
        id="competitive",
        name="15-Minute Competitive Conversation",
        description="Competitive positioning deck with agenda, metrics, and evidence.",
        slide_count_min=8,
        slide_count_max=10,
        elements=[
            "title-block",
            "agenda",
            "divider",
            "challenge-list",
            "metric-card",
            "tech-tile",
            "data-table",
            "recommendation-card",
            "closing",
        ],
        pptx_filename="Conversation Entry Points Sovereignty.PPTX",
    ),
    "power_hour": DeckTypeSpec(
        id="power_hour",
        name="Power Hour Deep Dive",
        description="Full element catalogue with multiple section dividers.",
        slide_count_min=15,
        slide_count_max=20,
        elements=_POWER_HOUR_ELEMENTS,
        pptx_filename="260310 - Sovereignty - Special Edition Power Hour - Slides.pptx",
    ),
    "questionnaire": DeckTypeSpec(
        id="questionnaire",
        name="Customer Discovery Questionnaire",
        description="Discovery questions and assessment matrix for customer workshops.",
        slide_count_min=6,
        slide_count_max=8,
        elements=[
            "title-block",
            "agenda",
            "challenge-list",
            "data-table",
            "recommendation-card",
            "closing",
        ],
        pptx_filename="Seller Talking Points Sovereignty.PPTX",
    ),
    "assessment": DeckTypeSpec(
        id="assessment",
        name="Readiness Assessment",
        description="Maturity assessment with metrics, challenges, solutions, and timeline.",
        slide_count_min=10,
        slide_count_max=12,
        elements=[
            "title-block",
            "agenda",
            "divider",
            "metric-card",
            "challenge-list",
            "tech-tile",
            "timeline",
            "recommendation-card",
            "closing",
        ],
        pptx_filename="Seller Talking Points Sovereignty.PPTX",
    ),
}


def get_deck_type(deck_type: str) -> DeckTypeSpec:
    """Return deck type spec, falling back to competitive if unknown."""
    key = (deck_type or "competitive").strip().lower().replace("-", "_")
    if key not in DECK_TYPES:
        return DECK_TYPES["competitive"]
    return DECK_TYPES[key]


def list_deck_types() -> list[dict]:
    """Summarise all registered deck types for API discovery."""
    return [
        {
            "id": spec.id,
            "name": spec.name,
            "description": spec.description,
            "slide_count_min": spec.slide_count_min,
            "slide_count_max": spec.slide_count_max,
            "element_count": len(spec.elements),
            "pptx_filename": spec.pptx_filename,
        }
        for spec in DECK_TYPES.values()
    ]


def default_outline(deck_type: str) -> list[dict]:
    """Build a structural outline from the deck type element sequence."""
    spec = get_deck_type(deck_type)
    outline: list[dict] = []
    for idx, element in enumerate(spec.elements, start=1):
        entry: dict = {
            "slide_index": idx,
            "element": element,
        }
        if element == "divider":
            entry["purpose"] = "Section break — signal a new major topic."
        elif element in spec.content_slots or element in _CONTENT_ELEMENTS:
            entry["purpose"] = "Content slide supporting the deck narrative."
        elif element == "challenge-list" and spec.id == "questionnaire":
            entry["purpose"] = "Discovery questions for the customer workshop."
        elif element == "data-table" and spec.id == "questionnaire":
            entry["purpose"] = "Assessment matrix comparing capabilities or maturity."
        outline.append(entry)
    return outline


def resolve_reference_pptx(deck_type: str) -> Path | None:
    """Return path to the sovereignty reference PPTX for this deck type, if present."""
    spec = get_deck_type(deck_type)
    path = _TEMPLATES_DIR / spec.pptx_filename
    return path if path.exists() else None
