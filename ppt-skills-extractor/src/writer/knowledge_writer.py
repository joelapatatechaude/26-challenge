"""Generate SKILL.md + element/*.yaml + section/*.yaml + agent_index.yaml from extracted template data.

Reads:
  skills-output/templates/<id>/template.yaml
  skills-output/assets/manifest.yaml
  skills-output/assets/icon_catalog.yaml

Writes:
  skills-output/templates/<id>/SKILL.md
  skills-output/templates/<id>/elements/<element>.yaml  (one per element type)
  skills-output/templates/<id>/sections/<section>.yaml  (one per section)
  skills-output/templates/<id>/agent_index.yaml  (compact agent context index)
"""

from __future__ import annotations

import textwrap
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml


# ---------------------------------------------------------------------------
# Slide spec field schemas (derived from deck_builder.py renderers)
# ---------------------------------------------------------------------------

_ICON_REF: dict[str, Any] = {
    "type": "icon_ref",
    "required": False,
    "description": "asset_id from icon_catalog.yaml",
}


_IMAGE_REF: dict[str, Any] = {
    "type": "image_ref",
    "required": False,
    "description": "asset_id from image_catalog.yaml",
}


def _element_field(const: str, **extra: Any) -> dict[str, Any]:
    return {
        "element": {"type": "string", "const": const, "required": True},
        **extra,
    }


ELEMENT_FIELD_SCHEMAS: dict[str, dict[str, Any]] = {
    "title-block": _element_field(
        "title-block",
        title={"type": "string", "required": True, "max_length": 120},
        subheading={"type": "string", "required": False, "max_length": 80},
        presenter={"type": "string", "required": False, "max_length": 60},
        date={"type": "string", "required": False, "max_length": 30},
        image_ref=_IMAGE_REF,
    ),
    "divider": _element_field(
        "divider",
        headline={"type": "string", "required": True, "max_length": 100},
        section_marker={"type": "string", "required": False, "max_length": 30},
        image_ref=_IMAGE_REF,
    ),
    "agenda": _element_field(
        "agenda",
        title={"type": "string", "required": True, "max_length": 80},
        section_marker={"type": "string", "required": False},
        items={
            "type": "array",
            "required": True,
            "min_items": 3,
            "max_items": 6,
            "item_schema": {
                "topic": {"type": "string", "required": True},
                "detail": {"type": "string", "required": False},
                "icon": _ICON_REF,
            },
        },
    ),
    "metric-card": _element_field(
        "metric-card",
        title={"type": "string", "required": True, "max_length": 120},
        section_marker={"type": "string", "required": False},
        cards={
            "type": "array",
            "required": True,
            "min_items": 2,
            "max_items": 4,
            "item_schema": {
                "value": {"type": "string", "required": True},
                "label": {"type": "string", "required": True},
                "icon": _ICON_REF,
            },
        },
        source={"type": "string", "required": False},
    ),
    "quote-block": _element_field(
        "quote-block",
        title={"type": "string", "required": False, "max_length": 80},
        section_marker={"type": "string", "required": False},
        quote={"type": "string", "required": True, "max_length": 250},
        attribution={"type": "string", "required": False},
        role={"type": "string", "required": False},
        headshot_ref={"type": "string", "required": False, "description": "asset_id for headshot photo"},
    ),
    "challenge-list": _element_field(
        "challenge-list",
        title={"type": "string", "required": True, "max_length": 120},
        section_marker={"type": "string", "required": False},
        challenges={
            "type": "array",
            "required": True,
            "min_items": 3,
            "max_items": 5,
            "item_schema": {
                "headline": {"type": "string", "required": True, "max_length": 40},
                "body": {"type": "string", "required": True},
                "icon": _ICON_REF,
            },
        },
    ),
    "tech-tile": _element_field(
        "tech-tile",
        title={"type": "string", "required": True, "max_length": 80},
        section_marker={"type": "string", "required": False},
        tiles={
            "type": "array",
            "required": True,
            "min_items": 2,
            "max_items": 9,
            "item_schema": {
                "pillar": {"type": "string", "required": False},
                "name": {"type": "string", "required": True},
                "description": {"type": "string", "required": True},
                "icon": _ICON_REF,
            },
        },
    ),
    "recommendation-card": _element_field(
        "recommendation-card",
        title={"type": "string", "required": True, "max_length": 80},
        cards={
            "type": "array",
            "required": True,
            "min_items": 2,
            "max_items": 4,
            "item_schema": {
                "headline": {"type": "string", "required": True, "max_length": 30},
                "body": {"type": "string", "required": True},
                "icon": _ICON_REF,
            },
        },
        cta={"type": "string", "required": False, "max_length": 120},
    ),
    "bar-chart": _element_field(
        "bar-chart",
        title={"type": "string", "required": True, "max_length": 80},
        section_marker={"type": "string", "required": False},
        bars={
            "type": "array",
            "required": True,
            "min_items": 1,
            "max_items": 8,
            "item_schema": {
                "label": {"type": "string", "required": True},
                "value": {"type": "number", "required": True},
            },
        },
        source={"type": "string", "required": False},
    ),
    "data-table": _element_field(
        "data-table",
        title={"type": "string", "required": True, "max_length": 120},
        section_marker={"type": "string", "required": False},
        headers={
            "type": "array",
            "required": True,
            "min_items": 2,
            "max_items": 6,
            "item_schema": {"type": "string"},
        },
        rows={
            "type": "array",
            "required": True,
            "description": "Each row is an array of cell values aligned to headers",
            "item_schema": {"type": "array", "item_schema": {"type": "string"}},
        },
        takeaway={"type": "string", "required": False},
        source={"type": "string", "required": False},
    ),
    "timeline": _element_field(
        "timeline",
        title={"type": "string", "required": True, "max_length": 80},
        section_marker={"type": "string", "required": False},
        milestones={
            "type": "array",
            "required": True,
            "min_items": 2,
            "max_items": 6,
            "item_schema": {
                "date": {"type": "string", "required": True},
                "label": {"type": "string", "required": True},
            },
        },
    ),
    "image-content": _element_field(
        "image-content",
        title={"type": "string", "required": True, "max_length": 120},
        section_marker={"type": "string", "required": False},
        bullets={
            "type": "array",
            "required": True,
            "min_items": 1,
            "max_items": 6,
            "item_schema": {
                "headline": {"type": "string", "required": False},
                "body": {"type": "string", "required": True},
            },
        },
        image_ref=_IMAGE_REF,
    ),
    "closing": _element_field(
        "closing",
        boilerplate={
            "type": "string",
            "required": False,
            "description": "Red Hat company boilerplate; defaults to standard copy if omitted",
        },
    ),
}


# ---------------------------------------------------------------------------
# Red Hat element catalogue (derived from brand guidelines + Quick Tips)
# ---------------------------------------------------------------------------

ELEMENT_CATALOGUE: list[dict[str, Any]] = [
    {
        "id": "title-block",
        "name": "Title Block",
        "description": "Opening or closing slide with presentation title, optional subheading, and presenter name.",
        "section": "Title and closing slides",
        "blueprint_layout": "M1:Front cover-02",
        "when_to_use": [
            "First slide of every deck — never skip.",
            "Use a photo-variant when the presentation is for an external audience.",
            "Use the plain (no-photo) variant for internal-only decks.",
            "Closing 'Thank you' slide reuses the same layout with boilerplate company copy.",
        ],
        "constraints": [
            "Presentation title MUST NOT exceed two lines.",
            "Subheading is optional — delete the placeholder if unused; do not leave it blank.",
            "Presenter name and title appear in the lower-left zone.",
            "Product logo may replace the Red Hat hat logo ONLY on product-focused decks.",
            "Do not add extra shapes or text outside the defined placeholder zones.",
        ],
        "visual": {
            "background": "Dark Red Hat red (#EE0000) or full-bleed photo",
            "title_font": "Red Hat Display, 36–44pt, white",
            "subheading_font": "Red Hat Text, 20–24pt, white",
            "presenter_font": "Red Hat Text, 14pt, white",
            "logo_position": "top-right, ~2% margin",
            "photo_zone": "right 40% of slide, full height",
        },
        "rh_examples": [
            {"layout": "M1:Front cover-02", "slide_hint": "Wave background, title left-aligned, presenter lower-left"},
        ],
    },
    {
        "id": "divider",
        "name": "Section Divider",
        "description": "Full-bleed coloured slide that signals a new section. No charts or body copy.",
        "section": "Dividers",
        "blueprint_layout": "M1:Front cover-02_1",
        "when_to_use": [
            "Between every major section of a deck (every 4–8 content slides).",
            "As an agenda preview — list upcoming topics as the divider headline.",
            "Never use as a content slide; remove all body copy.",
        ],
        "constraints": [
            "Headline limited to three lines maximum.",
            "Optional section marker text (e.g. 'Part 1') appears in small caps above the headline.",
            "Optional supporting copy of ≤ 30 words below headline — use sparingly.",
            "No data, charts, or images other than the background.",
            "Background is full Red Hat red or a branded gradient.",
        ],
        "visual": {
            "background": "#EE0000 solid or branded gradient",
            "headline_font": "Red Hat Display, 32–40pt, white",
            "section_marker_font": "Red Hat Text Medium, 12pt, white, ALL CAPS",
            "supporting_copy_font": "Red Hat Text, 16pt, white",
            "layout_zone": "left 60% text, right 40% empty or subtle graphic",
        },
        "rh_examples": [
            {"layout": "M1:Front cover-02_1", "slide_hint": "Wave background, large headline left-aligned, optional section marker above"},
        ],
    },
    {
        "id": "agenda",
        "name": "Agenda / Overview",
        "description": "Lists 3–6 topics the deck will cover, with optional brief descriptions per topic.",
        "section": "Overview, agenda, content, and quotes",
        "blueprint_layout": "M1:Text page",
        "when_to_use": [
            "Second or third slide in decks longer than 8 slides.",
            "As a 'What we'll discuss today' preview.",
            "As a section recap when returning to agenda mid-deck.",
        ],
        "constraints": [
            "Maximum 6 agenda items; use two columns for 5–6 items.",
            "Each item: topic name (bold) + one-line description (regular weight).",
            "Do not use bullet points — use numbered rows or icon rows instead.",
            "Keep consistent left margin; align all topic labels.",
        ],
        "visual": {
            "background": "White or light grey (#F5F5F5)",
            "topic_font": "Red Hat Display, 16–18pt, black",
            "detail_font": "Red Hat Text, 13–14pt, dark grey",
            "accent_line": "2pt Red Hat red (#EE0000) left border per row",
            "layout": "single or double column, equal row heights",
        },
        "rh_examples": [
            {"layout": "M1:Text page", "slide_hint": "3-item single column with detail"},
            {"layout": "M1:Text page", "slide_hint": "6-item two-column grid"},
        ],
    },
    {
        "id": "metric-card",
        "name": "Metric Card",
        "description": "Emphasises a single KPI or statistic with a large number and a short label.",
        "section": "Overview, agenda, content, and quotes",
        "blueprint_layout": "M1:Text page",
        "when_to_use": [
            "Executive summary or opportunity slides with 2–4 key numbers.",
            "Market size, growth rate, adoption figures, or ROI data.",
            "Never use more than 4 cards per slide — use 2 or 3 for maximum impact.",
        ],
        "constraints": [
            "Value text: 40–60pt, Red Hat Display, bold.",
            "Label text: 13–16pt, Red Hat Text, below or beside value.",
            "Each card must have an accent element: red border, red fill strip, or red icon.",
            "Source citation required below the slide if the stat is externally sourced.",
            "Cards must align on a consistent horizontal baseline.",
        ],
        "visual": {
            "card_background": "White with 3pt Red Hat red (#EE0000) left border",
            "value_font": "Red Hat Display, 48pt, #000000 or #EE0000",
            "label_font": "Red Hat Text, 14pt, #333333",
            "accent": "Red Hat red left border or top fill strip",
            "card_size_hint": "~25% slide width × ~30% slide height each",
            "max_per_slide": 4,
        },
        "rh_examples": [
            {"layout": "M1:Text page", "slide_hint": "3 cards: market size, growth %, customer count"},
            {"layout": "M1:Text page", "slide_hint": "2 cards: before/after ROI comparison"},
        ],
    },
    {
        "id": "quote-block",
        "name": "Quote Block",
        "description": "Full-slide or half-slide customer or analyst quote with attribution.",
        "section": "Overview, agenda, content, and quotes",
        "blueprint_layout": "M1:Text page_2",
        "when_to_use": [
            "Customer voice or analyst validation after a challenge/solution slide.",
            "Social proof in sales decks — place after ROI metrics.",
            "Executive summary as a 'proof point' before the detailed agenda.",
        ],
        "constraints": [
            "Quote text: 20–28pt, Red Hat Display, italic, left-aligned.",
            "Attribution line (name + title + company) immediately below the quote.",
            "Optional headshot photo in right 35% of slide — must be right-click replaceable.",
            "Do not use quotation marks AND decorative quote glyphs — pick one.",
            "Maximum 50 words for the quote body.",
        ],
        "visual": {
            "quote_font": "Red Hat Display italic, 22–26pt, #000000",
            "attribution_font": "Red Hat Text Medium, 13pt, #EE0000",
            "accent": "Large opening quote glyph in Red Hat red or 4pt red left rule",
            "photo_zone": "right 30–35%, vertically centred, circular crop optional",
            "background": "White or very light grey",
        },
        "rh_examples": [
            {"layout": "M1:Text page_2", "slide_hint": "Full-width quote, no photo, red quote glyph"},
            {"layout": "M1:Text page_2", "slide_hint": "Quote left + headshot photo right"},
        ],
    },
    {
        "id": "challenge-list",
        "name": "Customer Challenge List",
        "description": "Enumerates 3–5 pain points the customer faces, setting up the solution narrative.",
        "section": "Overview, agenda, content, and quotes",
        "blueprint_layout": "M1:Text page",
        "when_to_use": [
            "Early in a sales deck after the title and before the solution.",
            "As the 'problem framing' slide in an executive briefing.",
            "Paired with a 'How Red Hat solves this' follow-up slide.",
        ],
        "constraints": [
            "Maximum 5 challenges per slide; 3 is ideal.",
            "Each item: bold challenge headline (≤ 6 words) + 1–2 sentence explanation.",
            "Use icons from the Red Hat icon library — one per challenge.",
            "Do NOT use generic bullet points — use icon rows or numbered cards.",
            "Challenge copy must be customer-centric ('You struggle with…'), not product-led.",
        ],
        "visual": {
            "icon_size": "32–40px, Red Hat red or dark grey",
            "headline_font": "Red Hat Display, 16–18pt, bold",
            "body_font": "Red Hat Text, 13–14pt",
            "layout": "vertical list with icon left, text right; or 2-column card grid",
            "accent": "Thin red horizontal rule between items optional",
        },
        "rh_examples": [
            {"layout": "M1:Text page", "slide_hint": "3 challenges with icon rows, white background"},
            {"layout": "M1:Text page", "slide_hint": "4 challenge cards, 2×2 grid with red icon accents"},
        ],
    },
    {
        "id": "tech-tile",
        "name": "Technology / Product Tile",
        "description": "Grid of product or technology names with icons and one-line descriptions.",
        "section": "Overview, agenda, content, and quotes",
        "blueprint_layout": "M1:Text page",
        "when_to_use": [
            "Portfolio overview showing multiple Red Hat products in one slide.",
            "Solution architecture layers (platform → middleware → app).",
            "Partner ecosystem maps.",
        ],
        "constraints": [
            "2×2, 3×2, or 3×3 grid — do not mix tile sizes.",
            "Each tile: product logo or icon, product name (bold), one-line descriptor.",
            "Consistent tile size and padding across the grid.",
            "Use official Red Hat product logos — not hand-drawn icons.",
            "Max 9 tiles per slide; if more, split across two slides.",
        ],
        "visual": {
            "tile_background": "White with 1pt light grey border, or flat light grey",
            "logo_zone": "top-centre of tile, 32–48px",
            "name_font": "Red Hat Display, 14–16pt, bold",
            "desc_font": "Red Hat Text, 12pt, grey",
            "grid_gap": "12–16px consistent gap",
        },
        "rh_examples": [
            {"layout": "M1:Text page", "slide_hint": "2×2 RHEL / OpenShift / Ansible / Satellite tiles"},
            {"layout": "M1:Text page", "slide_hint": "3×2 solution layer tiles with coloured headers"},
        ],
    },
    {
        "id": "recommendation-card",
        "name": "Recommendation / Next Step Card",
        "description": "Actionable recommendation boxes — numbered or icon-anchored — for the closing section.",
        "section": "Overview, agenda, content, and quotes",
        "blueprint_layout": "M1:Text page",
        "when_to_use": [
            "Final content slide before the closing/thank-you slide.",
            "Executive briefing takeaways.",
            "Post-workshop action items.",
        ],
        "constraints": [
            "2–4 recommendation cards maximum.",
            "Each card: number or icon, bold headline (≤ 5 words), 1–2 sentence body.",
            "Cards must be visually equal — same width, same height.",
            "Use Red Hat red for the card number or icon accent.",
            "Do not mix recommendation cards with other element types on the same slide.",
        ],
        "visual": {
            "card_background": "White with red number badge or icon top-left",
            "number_badge": "Circle, Red Hat red fill, white number, 28–32px",
            "headline_font": "Red Hat Display, 15–17pt, bold",
            "body_font": "Red Hat Text, 12–13pt",
            "card_border": "1pt light grey or none",
        },
        "rh_examples": [
            {"layout": "M1:Text page", "slide_hint": "3 numbered white cards, horizontal row"},
            {"layout": "M1:Text page", "slide_hint": "4 cards, 2×2 grid, red icon top-left each"},
        ],
    },
    {
        "id": "bar-chart",
        "name": "Bar / Column Chart",
        "description": "Vertical or horizontal bar chart for comparing categories or showing trends.",
        "section": "Data, tables, and timelines",
        "blueprint_layout": "M1:Text page",
        "when_to_use": [
            "Market share comparison across competitors.",
            "Year-over-year growth data (3–5 years).",
            "Survey results or benchmark data.",
            "Never use for continuous time-series — use a line chart instead.",
        ],
        "constraints": [
            "Primary series colour: Red Hat red (#EE0000). Secondary: dark grey (#333333).",
            "Do NOT use red to represent negative or bad data — use grey or amber.",
            "Do not use colour alone to distinguish series — add labels or patterns.",
            "Maximum 8 bars per chart for readability.",
            "Source citation required below the chart.",
            "Axis labels: Red Hat Text, 11pt; Chart title: Red Hat Display, 14pt bold.",
            "To edit: click chart → dropdown → 'Open source' to update data.",
        ],
        "visual": {
            "primary_fill": "#EE0000",
            "secondary_fill": "#333333",
            "axis_font": "Red Hat Text, 11pt, #555555",
            "title_font": "Red Hat Display, 14pt, bold",
            "grid_lines": "light grey horizontal only",
            "legend": "below chart, horizontal",
            "background": "white chart area, slide background transparent",
        },
        "rh_examples": [
            {"layout": "M1:Text page", "slide_hint": "Vertical bar chart, 5 categories, red primary series"},
            {"layout": "M1:Text page", "slide_hint": "Grouped horizontal bars, 3 series, red + grey + light grey"},
        ],
    },
    {
        "id": "data-table",
        "name": "Data Table",
        "description": "Structured rows and columns for comparing specifications, features, or datasets.",
        "section": "Data, tables, and timelines",
        "blueprint_layout": "M1:Text page",
        "when_to_use": [
            "Feature comparison matrix (product vs. product).",
            "Pricing or SKU tables.",
            "Benchmark or test result tables.",
        ],
        "constraints": [
            "Column header: Red Hat Display, 13pt, bold; maximum two lines.",
            "Cell text: Red Hat Text, 12pt.",
            "Alternate row shading using #F5F5F5 and white.",
            "Header row: Red Hat red background (#EE0000), white text.",
            "Maximum 6 columns; if more, split table or use landscape layout.",
            "Source citation required below the table.",
        ],
        "visual": {
            "header_fill": "#EE0000",
            "header_font": "Red Hat Display, 13pt, white, bold",
            "row_alt_fill": "#F5F5F5",
            "cell_font": "Red Hat Text, 12pt, #111111",
            "border": "1pt #DDDDDD",
        },
        "rh_examples": [
            {"layout": "M1:Text page", "slide_hint": "6-column comparison table, red header, alt-row shading"},
            {"layout": "M1:Text page", "slide_hint": "3-column pricing table with tick/cross cells"},
        ],
    },
    {
        "id": "timeline",
        "name": "Timeline",
        "description": "Horizontal or vertical sequence of dated milestones or phases.",
        "section": "Data, tables, and timelines",
        "blueprint_layout": "M1:Text page",
        "when_to_use": [
            "Project roadmap or programme phasing.",
            "Product release history.",
            "Customer journey milestones.",
        ],
        "constraints": [
            "Horizontal timelines: left = past/current, right = future.",
            "Maximum 6 milestones per slide; group phases if more.",
            "Milestone dot: Red Hat red circle; connecting line: light grey.",
            "Date label above line; milestone title below line.",
            "Do not mix timeline with other chart types on the same slide.",
            "Year labels: Red Hat Display, 14pt bold; milestone labels: Red Hat Text, 12pt.",
        ],
        "visual": {
            "connector_line": "2pt #DDDDDD horizontal",
            "milestone_dot": "12px circle, #EE0000 fill",
            "date_font": "Red Hat Display, 14pt, bold, #EE0000",
            "label_font": "Red Hat Text, 12pt, #333333",
            "phase_fill": "Light red (#FDECEA) or grey (#F5F5F5) zone backgrounds",
        },
        "rh_examples": [
            {"layout": "M1:Text page", "slide_hint": "5-milestone horizontal timeline, red dots, year markers"},
            {"layout": "M1:Text page", "slide_hint": "3-phase Gantt-style bar timeline"},
        ],
    },
    {
        "id": "image-content",
        "name": "Image + Content",
        "description": "Split slide with a full-height photo or illustration on one side and text content on the other.",
        "section": "Overview, agenda, content, and quotes",
        "blueprint_layout": "M1:Text page_2",
        "when_to_use": [
            "Story-driven slides where a visual reinforces the narrative.",
            "People-centric slides (customer story, team intro).",
            "Technology showcase with product screenshot + description.",
        ],
        "constraints": [
            "Image zone: right 40–50% of slide, full height, no margin inside zone.",
            "Delete the shaded background placeholder before inserting the real image.",
            "Keep left and right slide margins clear (≥ 5% each side).",
            "Content zone: left 50–60%, standard text hierarchy.",
            "If no subheading is needed, delete the placeholder and let content extend into the shaded area.",
        ],
        "visual": {
            "image_zone": "right 40–50%, full height, bleed to edge",
            "content_zone": "left 50–60%, standard padding",
            "title_font": "Red Hat Display, 22–28pt",
            "body_font": "Red Hat Text, 13–14pt",
            "background": "white left panel",
        },
        "rh_examples": [
            {"layout": "M1:Text page_2", "slide_hint": "Title + subhead + body left, photo right"},
            {"layout": "M1:Text page_2", "slide_hint": "Full-bleed photo right, minimal left text"},
        ],
    },
    {
        "id": "closing",
        "name": "Closing / Thank You",
        "description": "Final slide with thank-you heading, Red Hat boilerplate, and social footer.",
        "section": "Title and closing slides",
        "blueprint_layout": "M1:Blank page_1",
        "when_to_use": [
            "Last slide of every deck — never skip.",
            "Replaces the title-block layout with thank-you copy instead of presentation title.",
        ],
        "constraints": [
            "Headline must read 'Thank you.' (with period).",
            "Boilerplate is optional — defaults to standard Red Hat company description.",
            "Footer must include linkedin.com/company/red-hat.",
            "Do not add extra content beyond heading, boilerplate, and footer.",
        ],
        "visual": {
            "background": "Dark Red Hat red (#EE0000) or template closing layout",
            "headline_font": "Red Hat Display, 44pt, white or theme accent",
            "body_font": "Red Hat Text, 13pt",
            "footer_font": "Red Hat Display, 11pt",
        },
        "rh_examples": [
            {"layout": "M1:Blank page_1", "slide_hint": "Thank you heading left, boilerplate below, LinkedIn footer right"},
            {"layout": "M1:CUSTOM", "slide_hint": "OpenShift closing — text in right panel beside red stripe"},
        ],
    },
]

for _elem in ELEMENT_CATALOGUE:
    _elem["fields"] = ELEMENT_FIELD_SCHEMAS[_elem["id"]]


# ---------------------------------------------------------------------------
# Section catalogue
# ---------------------------------------------------------------------------

SECTION_CATALOGUE: list[dict[str, Any]] = [
    {
        "id": "getting-started",
        "name": "Getting Started",
        "description": "Template guidance slides — delete ALL of these before sharing the deck.",
        "position": "pre-deck (delete before use)",
        "purpose": "Provides template instructions, confidentiality guidance, and theme selection help. Never included in a delivered presentation.",
        "deck_types": ["any"],
        "required_elements": [],
        "optional_elements": [],
        "do_not_include": True,
        "constraints": [
            "Remove all 'Template slide' slides before sharing externally.",
            "Set the confidential designator in Slide > Edit Theme before distributing.",
            "Choose Standard Light, Standard Dark, or Expressive sub-template on slide 5.",
        ],
    },
    {
        "id": "title-closing",
        "name": "Title and Closing Slides",
        "description": "Opens and closes every deck. Required in all presentations.",
        "position": "first and last",
        "purpose": "Establishes deck identity (title, presenter, audience context) and closes with Red Hat boilerplate and a call to action.",
        "deck_types": ["sales-pitch", "exec-briefing", "technical-deep-dive", "field-event-summary", "post-event-report"],
        "required_elements": ["title-block"],
        "optional_elements": ["image-content"],
        "constraints": [
            "Title slide must be slide 1 — no exceptions.",
            "Closing 'Thank you' slide is the last slide.",
            "Presentation title must not exceed two lines.",
            "Delete product logo placeholder if not a product-focused deck.",
            "Presenter name and title required on the title slide.",
            "Webinar title variant (TITLE_1_2_2_1_1_1) only for webinars viewed at small size.",
        ],
        "narrative_pattern": "Open with a title that frames the conversation ('Digital Sovereignty: Enabling Trusted Infrastructure'). Close with 'Thank you', Red Hat boilerplate, and a specific next step or CTA. The title slide sets tone — use a photo for external audience, plain for internal.",
    },
    {
        "id": "dividers",
        "name": "Section Dividers",
        "description": "Red background transition slides between major deck sections.",
        "position": "between sections",
        "purpose": "Signals a topic change, gives the audience a visual pause, and optionally previews the next section topic.",
        "deck_types": ["sales-pitch", "exec-briefing", "technical-deep-dive", "field-event-summary"],
        "required_elements": ["divider"],
        "optional_elements": [],
        "constraints": [
            "Use one divider per major section — not between every slide.",
            "Limit to 3–4 dividers in a standard 15-slide deck.",
            "Divider headline ≤ 3 lines.",
            "No data, charts, or body copy on divider slides.",
            "Section marker text (small caps, above headline) is optional.",
        ],
        "narrative_pattern": "The divider headline should anticipate the section question or theme ('The Challenge', 'Our Approach', 'Outcomes'). Use as a cognitive signal, not a filler. In short decks (< 8 slides), omit dividers entirely.",
    },
    {
        "id": "overview-agenda",
        "name": "Overview, Agenda, Content, and Quotes",
        "description": "The main body of every deck — agenda, market data, customer challenges, solutions, evidence, and quotes.",
        "position": "middle (slides 3 through second-to-last)",
        "purpose": "Delivers the core narrative: establish context → articulate problem → present solution → prove value → recommend action.",
        "deck_types": ["sales-pitch", "exec-briefing", "technical-deep-dive", "field-event-summary", "post-event-report"],
        "required_elements": ["agenda"],
        "optional_elements": [
            "metric-card",
            "challenge-list",
            "quote-block",
            "tech-tile",
            "recommendation-card",
            "image-content",
        ],
        "narrative_pattern": "Lead with an agenda slide (2–3 topics for exec briefings; up to 6 for technical deep-dives). Follow the SPIN structure: Situation (market context + metrics) → Problem (challenge list) → Implication (business impact quote or data) → Need-payoff (solution tiles + recommendation cards). Quote blocks perform best after metrics — they humanise the data.",
        "constraints": [
            "Agenda slide appears as slide 2 or 3.",
            "Source citations required on all data slides.",
            "No more than one quote-block slide per section.",
            "Metric cards and charts should not appear on the same slide.",
            "Keep consistent section marker text visible in the top-left corner of each content slide.",
        ],
    },
    {
        "id": "data-tables-timelines",
        "name": "Data, Tables, and Timelines",
        "description": "Quantitative evidence slides — charts, comparison tables, and roadmaps.",
        "position": "middle to late",
        "purpose": "Provides data-backed proof points that validate the narrative established in the overview section.",
        "deck_types": ["sales-pitch", "exec-briefing", "technical-deep-dive", "post-event-report"],
        "required_elements": [],
        "optional_elements": [
            "bar-chart",
            "data-table",
            "timeline",
        ],
        "narrative_pattern": "Place data slides after the challenge section and before recommendations. Use charts to establish market scale, tables to compare options, and timelines to show phased delivery. Always pair a data slide with a 'So what?' takeaway in the slide title. Remember: colour alone must not be the only differentiator in charts — add labels.",
        "constraints": [
            "Do not use red to represent negative data — use dark grey (#333333) or amber.",
            "All charts must have source citations.",
            "For all charts: remember to not use colour alone to visualise and distinguish data — utilise text sizing, spacing, contrast.",
            "Column headers in tables: maximum two lines.",
            "To edit a chart: select it → dropdown arrow top-right → 'Open source'.",
            "Accessibility: follow Visual Accessibility at Red Hat guidelines.",
        ],
    },
]


# ---------------------------------------------------------------------------
# SKILL.md generator
# ---------------------------------------------------------------------------

def _load_yaml(path: Path) -> dict:
    if not path.exists():
        return {}
    with path.open() as f:
        return yaml.safe_load(f) or {}


# ---------------------------------------------------------------------------
# Layout blueprint summariser
# ---------------------------------------------------------------------------

def _blueprint_section(blueprints_yaml: dict, assets_dir: Path) -> str:
    """
    Generate a Markdown section describing every layout's visual structure.
    This is the machine-readable visual specification that lets a builder
    reconstruct slides without the original PPTX.
    """
    layouts: dict = blueprints_yaml.get("layouts", {})
    if not layouts:
        return "*(No layout blueprints extracted)*"

    lines = []
    for layout_name, layout in layouts.items():
        shapes = layout.get("decorative_shapes", [])
        placeholders = layout.get("placeholders", [])
        bg = layout.get("background")
        if not shapes and not placeholders and not bg:
            continue

        lines.append(f"\n### Layout `{layout_name}` (index {layout.get('index', '?')})")

        if bg:
            if bg.get("type") == "image":
                ref = bg.get("image_ref", "?")
                kb  = (bg.get("size_bytes", 0) or 0) // 1024
                mode = bg.get("fill_mode", "stretch")
                lines.append(
                    f"\n**Background image** (full-slide, {mode}) — "
                    f"`layout-images/{ref}`  {kb}KB  "
                    f"→ This IS the wave/dot/dash visual pattern. Apply as slide background fill."
                )
            elif bg.get("type") == "solid":
                lines.append(f"\n**Background**: solid `{bg.get('color', '?')}`")

        if placeholders:
            lines.append("\n**Placeholders** (fill with content):")
            for ph in placeholders:
                lines.append(
                    f"- idx={ph['idx']} type={ph['type']}  "
                    f"pos=({ph.get('x_pct','?')}%, {ph.get('y_pct','?')}%)  "
                    f"size=({ph.get('w_pct','?')}% × {ph.get('h_pct','?')}%)"
                )

        if shapes:
            lines.append("\n**Decorative shapes** (reproduce exactly — DO NOT remove or move):")
            for s in shapes:
                kind = s.get("kind", "?")
                x = s.get("x_pct", "?")
                y = s.get("y_pct", "?")
                w = s.get("w_pct", "?")
                h = s.get("h_pct", "?")

                if kind == "picture":
                    ref = s.get("image_ref", "?")
                    kb  = (s.get("image_size_bytes", 0) or 0) // 1024
                    lines.append(
                        f"- **PICTURE** `layout-images/{ref}`  {kb}KB  "
                        f"pos=({x}%, {y}%)  size=({w}% × {h}%)"
                    )
                elif kind == "line":
                    li = s.get("line", {})
                    lines.append(
                        f"- **LINE** color=`{li.get('color','?')}`  "
                        f"width={li.get('width_pt','?')}pt  dash={li.get('dash','solid')}  "
                        f"pos=({x}%, {y}%)  size=({w}% × {h}%)"
                    )
                elif kind == "textbox":
                    txt = s.get("text_sample", "")
                    font = s.get("font_name", "?")
                    sz   = s.get("font_size_pt", "?")
                    clr  = s.get("font_color", "?")
                    lines.append(
                        f"- **TEXTBOX** font={font} {sz}pt {clr}  "
                        f"pos=({x}%, {y}%)  size=({w}% × {h}%)  "
                        f"text=`{txt[:40]}`"
                    )
                elif kind == "shape":
                    fill = s.get("fill", {})
                    li   = s.get("line", {})
                    geom = s.get("preset_geometry", "freeform")
                    lines.append(
                        f"- **SHAPE** ({geom})  fill={fill.get('type','?')} {fill.get('color','')}  "
                        f"line={li.get('color','none')} {li.get('width_pt',0)}pt  "
                        f"pos=({x}%, {y}%)  size=({w}% × {h}%)"
                    )
                else:
                    lines.append(
                        f"- **{kind.upper()}** pos=({x}%, {y}%)  size=({w}% × {h}%)"
                    )

    return "\n".join(lines) if lines else "*(No decorative shapes found)*"


def _asset_table(manifest: dict) -> str:
    assets = manifest.get("assets", [])
    logos = [a for a in assets if a["kind"] == "logo"]
    icons = [a for a in assets if a["kind"] == "icon"]
    bgs   = [a for a in assets if a["kind"] == "background"]

    lines = []
    if logos:
        lines.append("### Logos (FIXED — embed as-is)")
        for a in logos:
            usages = a.get("usages", [])
            slides = sorted({u["slide"] for u in usages if u["slide"] > 0})
            where = f"slides {slides}" if slides else "slide layout / master"
            lines.append(f"- `assets/logos/{a['asset_id']}.{a.get('path','').rsplit('.',1)[-1]}`  "
                         f"{a['dimensions']}  → {where}")
    if bgs:
        lines.append("\n### Backgrounds (FIXED — apply to slide background fill)")
        for a in bgs[:4]:
            lines.append(f"- `assets/backgrounds/{a['asset_id']}.png`  {a['dimensions']}")
    if icons:
        replaceable = [a for a in icons if a.get("replaceable")]
        fixed       = [a for a in icons if not a.get("replaceable")]
        if fixed:
            lines.append(f"\n### Icons — Layout (FIXED, {len(fixed)} files)")
            lines.append("  Used in slide layouts; do not replace.")
        if replaceable:
            lines.append(f"\n### Icons — Content (REPLACEABLE, {len(replaceable)} files)")
            lines.append("  Replace with appropriate icon from Red Hat icon library.")
            lines.append("  Slides where icons appear: " +
                         str(sorted({u["slide"] for a in replaceable
                                     for u in a.get("usages", []) if u["slide"] > 0})[:10]))
    return "\n".join(lines)


def generate_skill_md(template_yaml: dict, manifest: dict, blueprints_yaml: dict, output_path: Path) -> None:
    tid   = template_yaml.get("template_id", "unknown")
    name  = template_yaml.get("name", tid)
    theme = template_yaml.get("theme", {})
    colors = theme.get("colors", {})
    fonts  = theme.get("fonts", [])
    sections = template_yaml.get("sections", [])
    brand_rules = template_yaml.get("brand_rules", [])
    general_tips = template_yaml.get("general_tips", [])
    dims  = template_yaml.get("slide_dimensions", {})

    summary = manifest.get("summary", {})
    asset_block = _asset_table(manifest)
    blueprint_block = _blueprint_section(blueprints_yaml, output_path.parent.parent.parent / "assets")

    # Collect Quick Tips grouped by section from layout_guides
    tips_by_section: dict[str, list[str]] = {}
    for guide in template_yaml.get("layout_guides", []):
        section = guide.get("section", "General")
        for tip in guide.get("quick_tips", []):
            tip = tip.strip()
            if tip and len(tip) > 10:
                tips_by_section.setdefault(section, []).append(tip)

    tips_block = ""
    for sec, tips in tips_by_section.items():
        unique_tips = list(dict.fromkeys(tips))[:6]
        if unique_tips:
            tips_block += f"\n#### {sec}\n"
            for t in unique_tips:
                tips_block += f"- {t}\n"

    # Constraints per section
    constraints_by_section: dict[str, list[str]] = {}
    for guide in template_yaml.get("layout_guides", []):
        section = guide.get("section", "General")
        for c in guide.get("constraints", []):
            c = c.strip()
            if c and len(c) > 8 and "Insert source data here" not in c:
                constraints_by_section.setdefault(section, []).append(c)

    constraints_block = ""
    for sec, cs in constraints_by_section.items():
        unique_cs = list(dict.fromkeys(cs))[:8]
        if unique_cs:
            constraints_block += f"\n#### {sec}\n"
            for c in unique_cs:
                constraints_block += f"- {c}\n"

    md = f"""\
---
name: {tid}
description: >-
  Red Hat presentation design and content skills for the {name} template.
  Use before generating or reviewing any slide to ensure brand compliance,
  correct element usage, and effective narrative structure.
tags:
  - redhat
  - presentation
  - slide-design
  - {tid}
---

# {name} — Presentation Skills

> **Agent instruction**: Read this file in full before generating or editing any
> slide in the `{tid}` template. Every rule here is derived directly from the
> official Red Hat template file (April 2026).

---

## 1. Template Identity

| Property | Value |
|----------|-------|
| Template ID | `{tid}` |
| Slide size | {dims.get('width_emu', 0) // 914400:.2f}" × {dims.get('height_emu', 0) // 914400:.2f}" (widescreen 16:9) |
| Primary heading font | {theme.get('font_heading', 'Red Hat Display')} |
| Body font | {theme.get('font_body', 'Red Hat Text')} |
| Primary brand colour | `{theme.get('primary_color', '#EE0000')}` (Red Hat Red) |
| Dark accent | `{colors.get('dk2', '')}` |
| Light background | `{theme.get('background_light', '#F5F5F5')}` |

### Full Colour Palette

| Role | Hex |
|------|-----|
| dk1 (text/black) | `{colors.get('dk1', '#000000')}` |
| lt1 (white) | `{colors.get('lt1', '#FFFFFF')}` |
| dk2 (dark accent) | `{colors.get('dk2', '')}` |
| lt2 (light accent) | `{colors.get('lt2', '')}` |
| accent1 | `{colors.get('accent1', '')}` |
| accent2 | `{colors.get('accent2', '')}` |
| accent3 | `{colors.get('accent3', '')}` |
| accent4 | `{colors.get('accent4', '')}` |
| accent5 | `{colors.get('accent5', '')}` |
| accent6 | `{colors.get('accent6', '')}` |

---

## 2. Brand Rules (Non-Negotiable)

These rules are extracted verbatim from the official template:

{chr(10).join(f'- {r}' for r in brand_rules[:12] if len(r) > 10)}

### Core Design Principle
> *"To build brand awareness, stick to the essentials. Use our logos, core colors,
> icons, and typography to create clean, intentional designs that are
> unmistakably Red Hat."*

---

## 3. Deck Sections

Every {name} deck is structured around these sections (in order):

{chr(10).join(f'{i+1}. **{s}**' for i, s in enumerate(sections))}

---

## 4. Slide Elements

Each element type has a dedicated skill YAML in `elements/`. Quick reference:

| Element | File | When to use |
|---------|------|-------------|
| Title Block | `elements/title-block.yaml` | First and last slide of every deck |
| Section Divider | `elements/divider.yaml` | Between major sections |
| Agenda / Overview | `elements/agenda.yaml` | Slide 2 or 3 |
| Metric Card | `elements/metric-card.yaml` | KPIs, market stats (max 4/slide) |
| Quote Block | `elements/quote-block.yaml` | Customer or analyst voice |
| Challenge List | `elements/challenge-list.yaml` | Pain point framing |
| Tech Tile Grid | `elements/tech-tile.yaml` | Product/solution portfolio |
| Recommendation Card | `elements/recommendation-card.yaml` | Closing next steps |
| Bar / Column Chart | `elements/bar-chart.yaml` | Category comparison data |
| Data Table | `elements/data-table.yaml` | Feature/spec comparison |
| Timeline | `elements/timeline.yaml` | Roadmap or phased delivery |
| Image + Content | `elements/image-content.yaml` | Story with visual reinforcement |

---

## 5. Layout Quick Tips (from template)
{tips_block if tips_block else chr(10) + "*(No tips extracted)*"}

---

## 6. Placeholder Constraints (from template)
{constraints_block if constraints_block else chr(10) + "*(No constraints extracted)*"}

---

## 7. Asset Catalogue

Extracted from the template PPTX:
- **Logos**: {summary.get('logos', 0)} files
- **Icons**: {summary.get('icons', 0)} files
- **Photos** (replaceable): {summary.get('photos', 0) + summary.get('backgrounds', 0)} files
- **Charts**: {summary.get('charts', 0)} chart templates

Full manifest: `assets/manifest.yaml`

{asset_block}

### Asset Usage Rules
- **FIXED** assets → embed directly at the position recorded in `manifest.yaml`
- **REPLACEABLE** assets → record as placeholder; agent must substitute real content
- Logo always appears at the position recorded in `usages[source=layout]`
- Photos: use `python-pptx add_picture()` with the `w_pct × slide_width` and `h_pct × slide_height` values from the manifest

---

## 8. Accessibility

- Do **not** use colour alone to distinguish data series in charts.
- Add text labels, patterns, or icons alongside colour coding.
- Minimum body text size: 12pt on any slide.
- Ensure title text is at least 22pt.
- Follow [Red Hat Visual Accessibility Guidelines](https://brand.redhat.com/applications/presentations/).

---

## 9. Confidentiality Designators

Set the correct designator in **Slide → Edit Theme** before sharing:

| Audience | Designator |
|----------|-----------|
| External (public) | *(none)* |
| NDA partners | `Confidential: Red Hat associate and NDA partner use only` |
| Internal only | `Confidential: Red Hat associates only` |
| No forwarding | `Confidential: Red Hat associates only, No further distribution` |

---

## 10. Section Skill Files

Detailed narrative patterns for each section are in `sections/`:

| Section | File |
|---------|------|
| Title and Closing | `sections/title-closing.yaml` |
| Section Dividers | `sections/dividers.yaml` |
| Overview / Agenda / Content | `sections/overview-agenda.yaml` |
| Data, Tables, Timelines | `sections/data-tables-timelines.yaml` |

---

## 11. Layout Visual Blueprints

> **Builder instruction**: Every layout below was extracted directly from the
> official template PPTX. When constructing a slide from scratch you MUST
> reproduce every PICTURE and LINE listed here at the exact `pos` and `size`
> percentages shown (multiply by `slide_width` / `slide_height` to get EMU).
> Images are stored in `assets/layout-images/` relative to this skills root.
> Omitting any decorative shape will produce a non-compliant slide.

{blueprint_block}
"""

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(md)
    print(f"  SKILL.md → {output_path}")


# Per-template layout overrides.  The ELEMENT_CATALOGUE defaults target
# sales-enablement-2022 ("M1:Front cover-02", "M1:Text page", etc.).
# Other templates need different blueprint keys.
_LAYOUT_OVERRIDES: dict[str, dict[str, str]] = {
    "red-hat-openshift": {
        "title-block":          "TITLE_1",
        "divider":              "CUSTOM_2",
        "agenda":               "CUSTOM_4_17",
        "metric-card":          "CUSTOM_4_17",
        "challenge-list":       "CUSTOM_4_17",
        "tech-tile":            "CUSTOM_4_17",
        "recommendation-card":  "CUSTOM_4_17",
        "data-table":           "CUSTOM_4_17",
        "bar-chart":            "CUSTOM_4_17",
        "timeline":             "CUSTOM_4_17",
        "quote-block":          "CUSTOM_4_7",
        "image-content":        "CUSTOM_4_7",
        "closing":              "M1:CUSTOM",
    },
    "red-hat-standard": {
        "title-block":          "TITLE_1",
        "divider":              "CUSTOM",
        "agenda":               "CUSTOM_1_1_1_1",
        "metric-card":          "CUSTOM_1_1_1_1",
        "challenge-list":       "CUSTOM_1_1_1_1",
        "tech-tile":            "CUSTOM_1_1_1_1",
        "recommendation-card":  "CUSTOM_1_1_1_1",
        "data-table":           "CUSTOM_1_1_1_1",
        "bar-chart":            "CUSTOM_1_1_1_1",
        "timeline":             "CUSTOM_1_1_1_1",
        "quote-block":          "CUSTOM_1_1_1_1_1",
        "image-content":        "CUSTOM_1_1_1_1_1",
        "closing":              "TITLE_1_2_2_1_1_1",
    },
}


# ---------------------------------------------------------------------------
# Element YAML generator
# ---------------------------------------------------------------------------

def generate_element_yamls(output_dir: Path, template_id: str) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    overrides = _LAYOUT_OVERRIDES.get(template_id, {})
    for elem in ELEMENT_CATALOGUE:
        blueprint_layout = overrides.get(elem["id"], elem.get("blueprint_layout", ""))
        data = {
            "_generated": "2026-05-21 (deterministic from template)",
            "_manual_fields": ["when_to_use", "constraints", "rh_examples"],
            "skill_id": f"{template_id}-{elem['id']}",
            "template_id": template_id,
            "type": "element",
            "name": elem["name"],
            "description": elem["description"],
            "section": elem.get("section", ""),
            "blueprint_layout": blueprint_layout,
            "when_to_use": elem["when_to_use"],
            "constraints": elem["constraints"],
            "visual": elem["visual"],
            "rh_examples": elem.get("rh_examples", []),
            "fields": elem.get("fields", {}),
        }
        dest = output_dir / f"{elem['id']}.yaml"
        with dest.open("w") as f:
            yaml.dump(data, f, allow_unicode=True, sort_keys=False, width=120)
        print(f"  element → {dest.name}")


# ---------------------------------------------------------------------------
# Section YAML generator
# ---------------------------------------------------------------------------

def generate_section_yamls(output_dir: Path, template_id: str) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for sec in SECTION_CATALOGUE:
        data = {
            "_generated": "2026-05-21 (deterministic from template)",
            "_manual_fields": ["narrative_pattern", "constraints"],
            "skill_id": f"{template_id}-{sec['id']}",
            "template_id": template_id,
            "type": "section",
            "name": sec["name"],
            "description": sec["description"],
            "position": sec["position"],
            "purpose": sec["purpose"],
            "deck_types": sec["deck_types"],
            "required_elements": sec.get("required_elements", []),
            "optional_elements": sec.get("optional_elements", []),
            "constraints": sec.get("constraints", []),
            "narrative_pattern": sec.get("narrative_pattern", ""),
        }
        dest = output_dir / f"{sec['id']}.yaml"
        with dest.open("w") as f:
            yaml.dump(data, f, allow_unicode=True, sort_keys=False, width=120)
        print(f"  section → {dest.name}")


# ---------------------------------------------------------------------------
# Agent index generator
# ---------------------------------------------------------------------------

_NARRATIVE_GUIDE = textwrap.dedent("""\
    Standard deck flow: Title -> Agenda -> [Divider -> Content slides]* -> Closing
    Use dividers between major sections (3-4 per 15-slide deck).
    Each content section should have 2-4 slides from the elements list.
    Always start with title-block and end with closing.
    Place metric-cards and challenge-lists early to establish context.
    Use tech-tiles and recommendation-cards for solutions.
    Data tables and bar charts support claims with evidence.
""").strip()

_CONTENT_ELEMENT_IDS = frozenset({
    "agenda",
    "metric-card",
    "quote-block",
    "challenge-list",
    "tech-tile",
    "recommendation-card",
    "bar-chart",
    "data-table",
    "timeline",
    "image-content",
})


def _schema_has_icon_ref(schema: Any) -> bool:
    if isinstance(schema, dict):
        if schema.get("type") == "icon_ref":
            return True
        return any(_schema_has_icon_ref(v) for v in schema.values())
    if isinstance(schema, list):
        return any(_schema_has_icon_ref(item) for item in schema)
    return False


def _fields_from_schema(fields: dict[str, Any]) -> tuple[list[str], list[str], bool]:
    required: list[str] = []
    optional: list[str] = []
    for name, spec in fields.items():
        if name == "element" or not isinstance(spec, dict):
            continue
        if spec.get("required"):
            required.append(name)
        else:
            optional.append(name)
    return required, optional, _schema_has_icon_ref(fields)


def _icon_categories(icon_catalog: dict) -> dict[str, list[str]]:
    categories: dict[str, list[str]] = {}
    for icon in icon_catalog.get("icons", []):
        cat = icon.get("category") or "general"
        categories.setdefault(cat, []).append(icon["id"])
    return {cat: sorted(ids) for cat, ids in sorted(categories.items())}


def _layout_summary(blueprints: dict, elements_by_id: dict[str, dict]) -> dict[str, Any]:
    layouts = blueprints.get("layouts", {})
    total = len([k for k in layouts if not k.startswith("_MASTER_")])

    content_layouts = [
        elements_by_id[e]["layout"]
        for e in _CONTENT_ELEMENT_IDS
        if e in elements_by_id and elements_by_id[e].get("layout")
    ]
    content = Counter(content_layouts).most_common(1)[0][0] if content_layouts else ""

    return {
        "total_layouts": total,
        "recommended": {
            "title": elements_by_id.get("title-block", {}).get("layout", ""),
            "content": content,
            "divider": elements_by_id.get("divider", {}).get("layout", ""),
            "closing": elements_by_id.get("closing", {}).get("layout", ""),
        },
    }


def generate_agent_index(skills_root: Path, template_id: str) -> Path:
    """Write a compact agent_index.yaml summarising template brand, elements, icons, and layouts."""
    tmpl_dir = skills_root / "templates" / template_id
    template_yaml = _load_yaml(tmpl_dir / "template.yaml")
    icon_catalog = _load_yaml(skills_root / "assets" / "icon_catalog.yaml")
    blueprints = _load_yaml(tmpl_dir / "layouts" / "blueprints.yaml")
    elements_dir = tmpl_dir / "elements"

    theme = template_yaml.get("theme", {})
    colors = theme.get("colors", {})

    element_entries: list[dict[str, Any]] = []
    elements_by_id: dict[str, dict[str, Any]] = {}

    loaded: dict[str, dict] = {
        p.stem: _load_yaml(p) for p in elements_dir.glob("*.yaml")
    }
    element_order = [e["id"] for e in ELEMENT_CATALOGUE]
    extra_ids = sorted(set(loaded) - set(element_order))
    for elem_id in element_order + extra_ids:
        if elem_id not in loaded:
            continue
        data = loaded[elem_id]
        required, optional, supports_icons = _fields_from_schema(data.get("fields", {}))
        entry = {
            "id": elem_id,
            "layout": data.get("blueprint_layout", ""),
            "purpose": data.get("description", ""),
            "required_fields": required,
            "optional_fields": optional,
            "supports_icons": supports_icons,
        }
        element_entries.append(entry)
        elements_by_id[elem_id] = entry

    index: dict[str, Any] = {
        "template_id": template_id,
        "name": template_yaml.get("name", template_id),
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "brand": {
            "primary_color": theme.get("primary_color", "#EE0000"),
            "text_color": colors.get("dk1", "#151515"),
            "heading_font": theme.get("font_heading", "Red Hat Display"),
            "body_font": theme.get("font_body", "Red Hat Text"),
        },
        "elements": element_entries,
        "icon_categories": _icon_categories(icon_catalog),
        "layout_summary": _layout_summary(blueprints, elements_by_id),
        "narrative_guide": _NARRATIVE_GUIDE,
    }

    dest = tmpl_dir / "agent_index.yaml"
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("w") as f:
        yaml.dump(index, f, allow_unicode=True, sort_keys=False, width=120)
    print(f"  agent_index → {dest.name}")
    return dest


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def generate_all(skills_root: Path, template_id: str) -> None:
    tmpl_dir      = skills_root / "templates" / template_id
    template_yaml = _load_yaml(tmpl_dir / "template.yaml")
    manifest      = _load_yaml(skills_root / "assets" / "manifest.yaml")
    blueprints    = _load_yaml(tmpl_dir / "layouts" / "blueprints.yaml")

    print(f"\nGenerating knowledge files for: {template_id}")
    print("-" * 50)

    if not blueprints:
        print("  WARNING: No blueprints.yaml found — run `blueprint` command first to extract layout shapes.")

    generate_skill_md(
        template_yaml=template_yaml,
        manifest=manifest,
        blueprints_yaml=blueprints,
        output_path=tmpl_dir / "SKILL.md",
    )
    generate_element_yamls(tmpl_dir / "elements", template_id)
    generate_section_yamls(tmpl_dir / "sections", template_id)
    generate_agent_index(skills_root, template_id)

    print(f"\nDone. Files under: {tmpl_dir}")
