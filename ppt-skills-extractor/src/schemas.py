"""Pydantic models shared across the extraction pipeline."""

from __future__ import annotations

from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Raw parsed data from python-pptx
# ---------------------------------------------------------------------------

class RawShape(BaseModel):
    shape_id: int
    shape_type: str
    name: str
    left_pct: float
    top_pct: float
    width_pct: float
    height_pct: float
    text: str = ""
    font_sizes: list[float] = Field(default_factory=list)
    font_names: list[str] = Field(default_factory=list)
    font_colors: list[str] = Field(default_factory=list)
    fill_color: Optional[str] = None      # hex e.g. "#EE0000"
    line_color: Optional[str] = None      # hex
    line_width_pt: Optional[float] = None
    bold_runs: list[str] = Field(default_factory=list)
    italic_runs: list[str] = Field(default_factory=list)
    image_hash: Optional[str] = None      # SHA1 of image blob (pictures only)


class RawSlide(BaseModel):
    file: str
    slide_index: int
    layout_name: str
    title: str = ""
    shapes: list[RawShape] = Field(default_factory=list)
    template_id: Optional[str] = None    # set by TemplateDetector


# ---------------------------------------------------------------------------
# Template fingerprint
# ---------------------------------------------------------------------------

class TemplateProfile(BaseModel):
    template_id: str
    name: str
    primary_color: str = "#EE0000"
    background_dark: Optional[str] = None
    background_light: Optional[str] = None
    font_heading: str = "Red Hat Display"
    font_body: str = "Red Hat Display"
    logo_image_hash: Optional[str] = None
    slide_width_emu: int = 9144000
    slide_height_emu: int = 6858000


# ---------------------------------------------------------------------------
# Classified elements
# ---------------------------------------------------------------------------

class ElementType(str, Enum):
    METRIC_CARD = "metric-card"
    BAR_CHART = "bar-chart"
    QUOTE_BLOCK = "quote-block"
    CHALLENGE_LIST = "challenge-list"
    STOP_CARD = "stop-card"
    TECH_TILE = "tech-tile"
    DARK_CARD = "dark-card"
    REC_CARD = "rec-card"
    TITLE_BLOCK = "title-block"
    UNKNOWN = "unknown"


class ElementMatch(BaseModel):
    element_type: ElementType
    template_id: str
    file: str
    slide_index: int
    shape_ids: list[int] = Field(default_factory=list)
    raw_content: dict[str, Any] = Field(default_factory=dict)
    visual: dict[str, Any] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Classified sections
# ---------------------------------------------------------------------------

class DeckType(str, Enum):
    POST_EVENT_REPORT = "post-event-report"
    EXEC_BRIEFING = "exec-briefing"
    TECHNICAL_DEEP_DIVE = "technical-deep-dive"
    SALES_PITCH = "sales-pitch"
    FIELD_EVENT_SUMMARY = "field-event-summary"
    UNKNOWN = "unknown"


class SectionRole(str, Enum):
    TITLE = "title-slide"
    EXECUTIVE_SUMMARY = "executive-summary"
    PARTICIPATION_OVERVIEW = "participation-overview"
    FEEDBACK_RESULTS = "feedback-results"
    AUTOMATION_OPPORTUNITIES = "automation-opportunities"
    OPPORTUNITY_MAP = "opportunity-map"
    CUSTOMER_CHALLENGES = "customer-challenges"
    RECOMMENDATIONS = "recommendations"
    PRIORITY_ACCOUNTS = "priority-accounts"
    CLOSING = "closing"
    GENERIC_CONTENT = "generic-content"


class SectionMatch(BaseModel):
    template_id: str
    file: str
    deck_type: DeckType
    slide_index: int
    section_role: SectionRole
    element_types: list[ElementType] = Field(default_factory=list)
    narrative_notes: str = ""


class DeckClassification(BaseModel):
    file: str
    template_id: str
    deck_type: DeckType
    sections: list[SectionMatch]
    narrative_arc: str = ""


# ---------------------------------------------------------------------------
# Skill YAML content (LLM-generated)
# ---------------------------------------------------------------------------

class RhExample(BaseModel):
    source: str
    slide: int
    note: str = ""
    values: list[str] = Field(default_factory=list)


class ElementSkill(BaseModel):
    skill_id: str
    template_id: str
    type: str = "element"
    name: str
    description: str
    when_to_use: list[str]
    constraints: list[str]
    visual: dict[str, Any]
    rh_examples: list[RhExample] = Field(default_factory=list)


class SectionSkill(BaseModel):
    skill_id: str
    template_id: str
    type: str = "section"
    deck_types: list[str]
    name: str
    position: str
    purpose: str
    required_elements: list[str]
    optional_elements: list[str]
    narrative_pattern: str
    rh_examples: list[RhExample] = Field(default_factory=list)
