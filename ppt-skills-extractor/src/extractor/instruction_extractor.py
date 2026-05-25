"""Extract embedded layout instructions from Red Hat PPTX template files.

Red Hat template PPTX files contain rich instruction data directly in the slides:
- "Template section" divider slides that group layouts by purpose.
- "Quick tip" callout text that explains how to use each layout.
- Placeholder constraint text ("Slide title should not exceed one line", etc.).
- Confidentiality/usage designations and brand guidelines.

This module reads a PPTX file as a raw ZIP (avoiding python-pptx slide access
issues with complex presentation XMLs) and returns a structured
``TemplateInstructions`` object that the SkillWriter embeds into skill YAMLs.
"""

from __future__ import annotations

import re
import zipfile
from pathlib import Path
from typing import Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Output schemas
# ---------------------------------------------------------------------------

class LayoutGuide(BaseModel):
    """Extracted usage guidance for a single slide layout / example."""
    slide_number: int
    layout_name: str = ""
    section: str = ""                          # parent template section
    title_hint: str = ""                       # placeholder title text
    is_template_divider: bool = False          # True for section marker slides
    quick_tips: list[str] = Field(default_factory=list)
    placeholder_constraints: list[str] = Field(default_factory=list)
    body_texts: list[str] = Field(default_factory=list)
    notes: str = ""


class TemplateInstructions(BaseModel):
    """All instruction data extracted from one PPTX template file."""
    source_file: str
    slide_count: int
    sections: list[str] = Field(default_factory=list)
    theme_colors: dict[str, str] = Field(default_factory=dict)
    fonts: list[str] = Field(default_factory=list)
    layout_guides: list[LayoutGuide] = Field(default_factory=list)
    brand_rules: list[str] = Field(default_factory=list)   # top-level brand text
    general_tips: list[str] = Field(default_factory=list)  # tips not tied to one slide


# ---------------------------------------------------------------------------
# Namespace helpers
# ---------------------------------------------------------------------------

_NS = {
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}

# Patterns that signal constraint / guidance text (not body content)
_CONSTRAINT_PATTERNS: list[re.Pattern] = [
    re.compile(r"should not exceed", re.IGNORECASE),
    re.compile(r"optional\s+(sub)?heading", re.IGNORECASE),
    re.compile(r"optional\s+section\s+marker", re.IGNORECASE),
    re.compile(r"insert\s+source\s+data", re.IGNORECASE),
    re.compile(r"two lines maximum", re.IGNORECASE),
    re.compile(r"limit this slide to", re.IGNORECASE),
    re.compile(r"do not (use|include)", re.IGNORECASE),
    re.compile(r"column header", re.IGNORECASE),
    re.compile(r"presenter.s name", re.IGNORECASE),
    re.compile(r"presenter.s title", re.IGNORECASE),
    re.compile(r"only use this", re.IGNORECASE),
]

# Patterns that indicate brand/general text (kept at template level)
_BRAND_PATTERNS: list[re.Pattern] = [
    re.compile(r"red hat is the world", re.IGNORECASE),
    re.compile(r"red hat associate", re.IGNORECASE),
    re.compile(r"confidential", re.IGNORECASE),
    re.compile(r"NDA partner", re.IGNORECASE),
    re.compile(r"brand awareness", re.IGNORECASE),
    re.compile(r"presentation before use", re.IGNORECASE),
]


def _texts_from_xml(root, ns: dict) -> list[str]:
    return [
        t.text.strip()
        for t in root.findall(".//a:t", ns)
        if t.text and t.text.strip() and len(t.text.strip()) > 2
    ]


def _layout_name_from_rels(z: zipfile.ZipFile, slide_file: str) -> str:
    """Resolve the layout name for a slide via its .rels file."""
    try:
        parts = slide_file.split("/")  # e.g. ppt/slides/slide1.xml
        rels_path = "/".join(parts[:-1]) + "/_rels/" + parts[-1] + ".rels"
        if rels_path not in z.namelist():
            return ""
        from lxml import etree
        root = etree.fromstring(z.read(rels_path))
        for rel in root:
            rtype = rel.get("Type", "")
            if "slideLayout" in rtype:
                target = rel.get("Target", "")
                # Target is like ../slideLayouts/slideLayout3.xml
                layout_file = "ppt/slideLayouts/" + target.split("/")[-1]
                if layout_file in z.namelist():
                    lroot = etree.fromstring(z.read(layout_file))
                    cSld = lroot.find(".//p:cSld", _NS)
                    if cSld is not None:
                        return cSld.get("name", "")
    except Exception:
        pass
    return ""


def _primary_master_theme(z: zipfile.ZipFile) -> str:
    """Return the theme XML path used by the first (primary) slide master."""
    # Resolve via slideMaster1.xml.rels
    rels_candidates = [
        "ppt/slideMasters/_rels/slideMaster1.xml.rels",
    ]
    for rc in rels_candidates:
        if rc not in z.namelist():
            continue
        from lxml import etree
        rels_root = etree.fromstring(z.read(rc))
        for rel in rels_root:
            if "theme" in rel.get("Type", ""):
                target = rel.get("Target", "")
                # Target is like ../theme/theme3.xml → resolve to ppt/theme/theme3.xml
                theme_file = "ppt/theme/" + target.split("/")[-1]
                if theme_file in z.namelist():
                    return theme_file
    # Fallback: first theme file alphabetically
    candidates = sorted(n for n in z.namelist() if re.match(r"ppt/theme/theme\d+\.xml", n))
    return candidates[0] if candidates else ""


def _theme_colors(z: zipfile.ZipFile) -> dict[str, str]:
    """Extract accent / dk / lt colors from the primary slide master's theme XML."""
    from lxml import etree
    colors: dict[str, str] = {}
    theme_file = _primary_master_theme(z)
    if not theme_file:
        return colors
    root = etree.fromstring(z.read(theme_file))
    target_tags = {"dk1", "dk2", "lt1", "lt2", "accent1", "accent2", "accent3",
                   "accent4", "accent5", "accent6"}
    seen: set[str] = set()
    for el in root.iter():
        tag = re.sub(r"\{.*?\}", "", el.tag)
        if tag in target_tags and tag not in seen:
            seen.add(tag)
            for child in el:
                ctag = re.sub(r"\{.*?\}", "", child.tag)
                if ctag == "srgbClr":
                    colors[tag] = f"#{child.get('val', '').upper()}"
                elif ctag == "sysClr":
                    colors[tag] = f"#{child.get('lastClr', '').upper()}"
    return colors


def _master_fonts(z: zipfile.ZipFile) -> list[str]:
    """Extract unique font names from the primary (first) slide master."""
    from lxml import etree
    fonts: list[str] = []
    master_file = "ppt/slideMasters/slideMaster1.xml"
    if master_file not in z.namelist():
        candidates = sorted(n for n in z.namelist() if re.match(r"ppt/slideMasters/slideMaster\d+\.xml", n))
        if not candidates:
            return []
        master_file = candidates[0]
    root = etree.fromstring(z.read(master_file))
    # Prefer theme major/minor font names via the theme XML
    theme_file = _primary_master_theme(z)
    if theme_file:
        theme_root = etree.fromstring(z.read(theme_file))
        ns_a = "http://schemas.openxmlformats.org/drawingml/2006/main"
        for el in theme_root.findall(f".//{{{ns_a}}}majorFont"):
            tf = el.get("typeface") or el.get("latin", "")
            if tf and not tf.startswith("+") and tf not in fonts:
                fonts.append(tf)
        for el in theme_root.findall(f".//{{{ns_a}}}minorFont"):
            tf = el.get("typeface") or el.get("latin", "")
            if tf and not tf.startswith("+") and tf not in fonts:
                fonts.append(tf)
    # Supplement with latin fonts from the slide master
    for latin in root.findall(".//a:latin", _NS):
        tf = latin.get("typeface", "")
        if tf and not tf.startswith("+") and tf not in fonts:
            fonts.append(tf)
    return fonts[:8]


def extract_instructions(path: str | Path) -> TemplateInstructions:
    """Parse a PPTX template file and return all embedded layout instructions."""
    from lxml import etree

    path = Path(path)
    with zipfile.ZipFile(path) as z:
        namelist = set(z.namelist())

        slide_files = sorted(
            [n for n in namelist if re.match(r"ppt/slides/slide\d+\.xml", n)],
            key=lambda x: int(re.search(r"\d+", x).group()),
        )
        note_files = sorted(
            [n for n in namelist if re.match(r"ppt/notesSlides/notesSlide\d+\.xml", n)],
            key=lambda x: int(re.search(r"\d+", x).group()),
        )

        theme_colors = _theme_colors(z)
        fonts = _master_fonts(z)

        layout_guides: list[LayoutGuide] = []
        sections: list[str] = []
        brand_rules: list[str] = []
        general_tips: list[str] = []
        current_section = ""

        for idx, sf in enumerate(slide_files):
            root = etree.fromstring(z.read(sf))
            texts = _texts_from_xml(root, _NS)
            slide_num = idx + 1

            # Resolve notes
            notes = ""
            if idx < len(note_files):
                nroot = etree.fromstring(z.read(note_files[idx]))
                notes = " ".join(
                    t.text or "" for t in nroot.findall(".//a:t", _NS)
                    if t.text and t.text.strip()
                ).strip()
                # Remove bare slide-number artifacts
                notes = re.sub(r"^\d+\s*", "", notes).strip()

            layout_name = _layout_name_from_rels(z, sf)

            # --- Detect template section divider ---
            is_divider = "Template section" in texts
            if is_divider:
                idx_ts = texts.index("Template section")
                # Section name may span two consecutive text runs (e.g. "Overview,\nagenda, content, and quotes")
                section_parts = []
                for t in texts[idx_ts + 1:]:
                    if t.lower().startswith("template") or t.lower() == "template slide":
                        break
                    section_parts.append(t)
                    if len(section_parts) >= 3:
                        break
                current_section = " ".join(section_parts).strip()
                if current_section and current_section not in sections:
                    sections.append(current_section)

            # --- Skip pure navigation slides ---
            if "Click on this slide" in " ".join(texts) and is_divider:
                layout_guides.append(LayoutGuide(
                    slide_number=slide_num,
                    layout_name=layout_name,
                    section=current_section,
                    is_template_divider=True,
                    body_texts=texts,
                    notes=notes,
                ))
                continue

            # --- Extract Quick tips ---
            quick_tips: list[str] = []
            tip_idx = next((i for i, t in enumerate(texts) if t == "Quick tip"), -1)
            if tip_idx >= 0:
                for t in texts[tip_idx + 1:]:
                    if t and t != "Quick tip":
                        quick_tips.append(t)
                    if len(quick_tips) >= 3:
                        break

            # --- Classify each text as constraint, brand rule, or body ---
            placeholder_constraints: list[str] = []
            body: list[str] = []
            for t in texts:
                if t in ("Quick tip", "Template slide", "Template section"):
                    continue
                if "Click on this slide" in t:
                    continue
                if any(p.search(t) for p in _CONSTRAINT_PATTERNS):
                    placeholder_constraints.append(t)
                elif any(p.search(t) for p in _BRAND_PATTERNS):
                    if t not in brand_rules:
                        brand_rules.append(t)
                else:
                    body.append(t)

            # Aggregate general tips that appear on many slides
            for tip in quick_tips:
                if tip not in general_tips and not any(tip in g.quick_tips for g in layout_guides[-5:]):
                    general_tips.append(tip)

            # Try to extract a meaningful title hint (first non-constraint body text)
            title_hint = next((t for t in body if len(t) > 5 and not t.startswith("Lorem")), "")

            layout_guides.append(LayoutGuide(
                slide_number=slide_num,
                layout_name=layout_name,
                section=current_section,
                is_template_divider=is_divider,
                title_hint=title_hint,
                quick_tips=quick_tips,
                placeholder_constraints=placeholder_constraints,
                body_texts=body,
                notes=notes,
            ))

    # De-duplicate brand rules
    brand_rules = list(dict.fromkeys(brand_rules))

    return TemplateInstructions(
        source_file=str(path),
        slide_count=len(slide_files),
        sections=sections,
        theme_colors=theme_colors,
        fonts=fonts,
        layout_guides=layout_guides,
        brand_rules=brand_rules,
        general_tips=list(dict.fromkeys(general_tips))[:20],
    )


def summarise(instructions: TemplateInstructions) -> str:
    """Return a human-readable summary of extracted instructions (for debugging)."""
    lines = [
        f"Source: {instructions.source_file}",
        f"Slides: {instructions.slide_count}",
        f"Sections: {instructions.sections}",
        f"Theme colours: {instructions.theme_colors}",
        f"Fonts: {instructions.fonts}",
        "",
        "=== Layout guides ===",
    ]
    for g in instructions.layout_guides:
        if g.is_template_divider:
            lines.append(f"  [DIVIDER] Slide {g.slide_number} — section='{g.section}'")
            continue
        if not g.quick_tips and not g.placeholder_constraints:
            continue
        lines.append(
            f"  Slide {g.slide_number} section='{g.section}' layout='{g.layout_name}'"
        )
        for tip in g.quick_tips:
            lines.append(f"    TIP: {tip[:120]}")
        for c in g.placeholder_constraints:
            lines.append(f"    CONSTRAINT: {c[:120]}")
    if instructions.brand_rules:
        lines.append("\n=== Brand rules ===")
        for r in instructions.brand_rules[:8]:
            lines.append(f"  {r[:120]}")
    if instructions.general_tips:
        lines.append("\n=== General tips ===")
        for t in instructions.general_tips[:10]:
            lines.append(f"  {t[:120]}")
    return "\n".join(lines)
