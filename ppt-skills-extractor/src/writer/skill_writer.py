"""Write extracted skills to YAML files under skills/templates/<template-id>/.

Directory layout produced:
    skills/
    ├── index.yaml                       # manifest of all templates and skill files
    └── templates/
        └── <template-id>/
            ├── template.yaml            # TemplateProfile + TemplateInstructions summary
            ├── elements/
            │   └── <element-type>.yaml  # one ElementSkill per file
            └── sections/
                └── <section-role>.yaml  # one SectionSkill per file

Merge mode (--merge):
    When an output file already exists, any manually edited fields listed in the
    file's ``_manual_fields`` key are preserved as-is.  All other fields are
    overwritten from the freshly generated data.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml

from schemas import ElementSkill, SectionSkill, TemplateProfile
from extractor.instruction_extractor import TemplateInstructions


# ---------------------------------------------------------------------------
# YAML helpers
# ---------------------------------------------------------------------------

def _represent_str(dumper: yaml.Dumper, data: str) -> yaml.ScalarNode:
    """Use block scalars for multi-line strings, plain for the rest."""
    if "\n" in data:
        return dumper.represent_scalar("tag:yaml.org,2002:str", data, style="|")
    return dumper.represent_scalar("tag:yaml.org,2002:str", data)


yaml.add_representer(str, _represent_str)


def _load_existing(path: Path) -> dict[str, Any]:
    if path.exists():
        with path.open() as f:
            return yaml.safe_load(f) or {}
    return {}


def _merge(existing: dict[str, Any], fresh: dict[str, Any]) -> dict[str, Any]:
    """Overlay fresh data onto existing, preserving manually edited fields."""
    manual_fields: list[str] = existing.get("_manual_fields", [])
    merged = {**fresh}
    for field in manual_fields:
        if field in existing:
            merged[field] = existing[field]
    merged["_manual_fields"] = manual_fields
    return merged


def _write_yaml(path: Path, data: dict[str, Any], merge: bool) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if merge:
        existing = _load_existing(path)
        data = _merge(existing, data)
    with path.open("w") as f:
        yaml.dump(data, f, allow_unicode=True, sort_keys=False, width=120)


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


# ---------------------------------------------------------------------------
# Template YAML (template.yaml)
# ---------------------------------------------------------------------------

def _template_dict(
    profile: TemplateProfile,
    instructions: TemplateInstructions | None,
) -> dict[str, Any]:
    d: dict[str, Any] = {
        "_generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "template_id": profile.template_id,
        "name": profile.name,
        "theme": {
            "primary_color": profile.primary_color,
            "background_dark": profile.background_dark,
            "background_light": profile.background_light,
            "font_heading": profile.font_heading,
            "font_body": profile.font_body,
        },
        "slide_dimensions": {
            "width_emu": profile.slide_width_emu,
            "height_emu": profile.slide_height_emu,
        },
    }
    if instructions:
        d["sections"] = instructions.sections
        d["brand_rules"] = instructions.brand_rules
        d["general_tips"] = instructions.general_tips
        d["theme"]["colors"] = instructions.theme_colors
        d["theme"]["fonts"] = instructions.fonts
        # Compact layout guide: only slides with actionable content
        guides = []
        for g in instructions.layout_guides:
            if g.is_template_divider:
                continue
            if not g.quick_tips and not g.placeholder_constraints:
                continue
            guides.append({
                "slide": g.slide_number,
                "section": g.section,
                "layout": g.layout_name,
                "title_hint": g.title_hint,
                "quick_tips": g.quick_tips,
                "constraints": list(dict.fromkeys(g.placeholder_constraints)),
            })
        d["layout_guides"] = guides
    return d


def write_template(
    output_root: Path,
    profile: TemplateProfile,
    instructions: TemplateInstructions | None = None,
    merge: bool = False,
) -> Path:
    dest = output_root / "templates" / profile.template_id / "template.yaml"
    _write_yaml(dest, _template_dict(profile, instructions), merge)
    return dest


# ---------------------------------------------------------------------------
# Element skill YAML
# ---------------------------------------------------------------------------

def _element_dict(skill: ElementSkill) -> dict[str, Any]:
    return {
        "_generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "skill_id": skill.skill_id,
        "template_id": skill.template_id,
        "type": "element",
        "name": skill.name,
        "description": skill.description,
        "when_to_use": skill.when_to_use,
        "constraints": skill.constraints,
        "visual": skill.visual,
        "rh_examples": [e.model_dump() for e in skill.rh_examples],
    }


def write_element_skill(
    output_root: Path,
    skill: ElementSkill,
    merge: bool = False,
) -> Path:
    fname = _slug(skill.skill_id.replace(f"{skill.template_id}-", "")) + ".yaml"
    dest = output_root / "templates" / skill.template_id / "elements" / fname
    _write_yaml(dest, _element_dict(skill), merge)
    return dest


# ---------------------------------------------------------------------------
# Section skill YAML
# ---------------------------------------------------------------------------

def _section_dict(skill: SectionSkill) -> dict[str, Any]:
    return {
        "_generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "skill_id": skill.skill_id,
        "template_id": skill.template_id,
        "type": "section",
        "name": skill.name,
        "deck_types": skill.deck_types,
        "position": skill.position,
        "purpose": skill.purpose,
        "required_elements": skill.required_elements,
        "optional_elements": skill.optional_elements,
        "narrative_pattern": skill.narrative_pattern,
        "rh_examples": [e.model_dump() for e in skill.rh_examples],
    }


def write_section_skill(
    output_root: Path,
    skill: SectionSkill,
    merge: bool = False,
) -> Path:
    fname = _slug(skill.skill_id.replace(f"{skill.template_id}-", "")) + ".yaml"
    dest = output_root / "templates" / skill.template_id / "sections" / fname
    _write_yaml(dest, _section_dict(skill), merge)
    return dest


# ---------------------------------------------------------------------------
# Index manifest
# ---------------------------------------------------------------------------

def update_index(output_root: Path) -> Path:
    """Scan the skills tree and regenerate skills/index.yaml."""
    index: dict[str, Any] = {
        "_generated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "templates": [],
    }
    templates_dir = output_root / "templates"
    if not templates_dir.exists():
        pass
    else:
        for tmpl_dir in sorted(templates_dir.iterdir()):
            if not tmpl_dir.is_dir():
                continue
            tmpl_yaml = tmpl_dir / "template.yaml"
            entry: dict[str, Any] = {"template_id": tmpl_dir.name}
            if tmpl_yaml.exists():
                with tmpl_yaml.open() as f:
                    td = yaml.safe_load(f) or {}
                entry["name"] = td.get("name", tmpl_dir.name)
                entry["theme"] = td.get("theme", {})

            elements_dir = tmpl_dir / "elements"
            entry["elements"] = sorted(
                p.stem for p in elements_dir.glob("*.yaml")
            ) if elements_dir.exists() else []

            sections_dir = tmpl_dir / "sections"
            entry["sections"] = sorted(
                p.stem for p in sections_dir.glob("*.yaml")
            ) if sections_dir.exists() else []

            index["templates"].append(entry)

    dest = output_root / "index.yaml"
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("w") as f:
        yaml.dump(index, f, allow_unicode=True, sort_keys=False, width=120)
    return dest


# ---------------------------------------------------------------------------
# High-level batch writer
# ---------------------------------------------------------------------------

def write_all(
    output_root: Path,
    profile: TemplateProfile,
    element_skills: list[ElementSkill],
    section_skills: list[SectionSkill],
    instructions: TemplateInstructions | None = None,
    merge: bool = False,
) -> dict[str, list[Path]]:
    """Write all skills for one template and update the index.

    Returns a dict with keys 'template', 'elements', 'sections', 'index'
    mapping to the written file paths.
    """
    written: dict[str, list[Path]] = {
        "template": [],
        "elements": [],
        "sections": [],
        "index": [],
    }

    path = write_template(output_root, profile, instructions, merge)
    written["template"].append(path)

    for skill in element_skills:
        written["elements"].append(write_element_skill(output_root, skill, merge))

    for skill in section_skills:
        written["sections"].append(write_section_skill(output_root, skill, merge))

    written["index"].append(update_index(output_root))
    return written
