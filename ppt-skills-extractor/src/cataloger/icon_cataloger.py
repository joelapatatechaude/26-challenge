"""Tag extracted icon PNGs with semantic metadata for agent search.

Reads icon files from ``skills_root/assets/icons/`` and context from
``skills_root/assets/manifest.yaml``.  When a vision-capable LLM model is
available, sends each PNG to LiteLLM for description + tags + category.
Otherwise (or on per-icon failure) builds stub entries from manifest hints
and usage sections.
"""

from __future__ import annotations

import base64
import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import yaml

CATEGORIES = (
    "security",
    "cloud",
    "infrastructure",
    "automation",
    "development",
    "networking",
    "storage",
    "analytics",
    "ai-ml",
    "containers",
    "monitoring",
    "general",
)

_STOP_WORDS = frozenset(
    {
        "a", "an", "the", "and", "or", "with", "from", "in", "on", "at", "to",
        "for", "of", "is", "used", "use", "replace", "appropriate", "icon",
        "layout", "red", "hat", "library", "slide", "this", "that", "be",
    }
)

_SECTION_CATEGORY: dict[str, str] = {
    "product logos & tech icon": "development",
    "data, tables, and timelines": "analytics",
    "overview, agenda, content, and quotes": "general",
    "getting started": "general",
    "color in presentations": "general",
    "title and closing slides": "general",
    "dividers": "general",
}

_TAG_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "security": ["security", "shield", "lock", "protection", "compliance", "firewall", "vault"],
    "cloud": ["cloud", "hybrid", "saas", "multicloud"],
    "infrastructure": ["infrastructure", "server", "datacenter", "platform", "cluster"],
    "automation": ["automation", "ansible", "pipeline", "workflow", "ci", "cd"],
    "development": ["development", "code", "developer", "api", "software", "programming"],
    "networking": ["network", "networking", "router", "dns", "connectivity"],
    "storage": ["storage", "database", "disk", "backup", "volume"],
    "analytics": ["analytics", "data", "chart", "metric", "insights", "reporting"],
    "ai-ml": ["ai", "ml", "machine-learning", "model", "llm", "intelligence"],
    "containers": ["container", "containers", "kubernetes", "openshift", "pod", "docker"],
    "monitoring": ["monitoring", "observability", "alert", "dashboard", "logging"],
}

_CATEGORY_ELEMENTS: dict[str, list[str]] = {
    "security": ["challenge-list", "tech-tile"],
    "cloud": ["tech-tile"],
    "infrastructure": ["tech-tile", "challenge-list"],
    "automation": ["tech-tile", "challenge-list"],
    "development": ["tech-tile", "agenda"],
    "networking": ["tech-tile", "challenge-list"],
    "storage": ["tech-tile"],
    "analytics": ["metric-card", "data-table"],
    "ai-ml": ["tech-tile", "challenge-list"],
    "containers": ["tech-tile"],
    "monitoring": ["metric-card", "tech-tile"],
    "general": ["tech-tile", "agenda"],
}

_TAG_ELEMENTS: dict[str, list[str]] = {
    "security": ["challenge-list"],
    "shield": ["challenge-list"],
    "cloud": ["tech-tile"],
    "container": ["tech-tile"],
    "kubernetes": ["tech-tile"],
    "openshift": ["tech-tile"],
    "automation": ["tech-tile", "challenge-list"],
    "analytics": ["metric-card", "data-table"],
    "metric": ["metric-card"],
    "agenda": ["agenda"],
}

_VISION_PROMPT = (
    "You are cataloging icons from a Red Hat presentation template.\n"
    "Describe this icon in exactly one sentence.\n"
    "List 3-5 semantic tags (lowercase, single words or hyphenated phrases).\n"
    f"Classify into exactly one category from: {', '.join(CATEGORIES)}.\n\n"
    'Return ONLY valid JSON: {"description": "...", "tags": ["..."], "category": "..."}'
)


# ---------------------------------------------------------------------------
# Config / model resolution
# ---------------------------------------------------------------------------

def _load_llm_config() -> dict[str, Any]:
    config_path = Path.home() / ".crew-ai" / "config.yaml"
    if not config_path.exists():
        return {}
    try:
        with config_path.open(encoding="utf-8") as fh:
            cfg = yaml.safe_load(fh) or {}
    except Exception:
        return {}
    return cfg.get("llm") or {}


def _resolve_model(model: str | None) -> str | None:
    """Return an explicit model id, or None for stub-only generation."""
    if model:
        return model
    return os.environ.get("LLM_MODEL") or None


def _litellm_kwargs(model: str) -> dict[str, Any]:
    llm_cfg = _load_llm_config()
    kwargs: dict[str, Any] = {"model": model, "temperature": 0.0}
    api_key = os.environ.get("OPENAI_API_KEY") or llm_cfg.get("api_key")
    api_base = os.environ.get("LLM_API_BASE") or llm_cfg.get("api_base_url")
    if api_key:
        kwargs["api_key"] = api_key
    if api_base:
        kwargs["api_base"] = api_base
    return kwargs


# ---------------------------------------------------------------------------
# Manifest helpers
# ---------------------------------------------------------------------------

def _load_manifest(assets_dir: Path) -> dict[str, dict[str, Any]]:
    manifest_path = assets_dir / "manifest.yaml"
    if not manifest_path.exists():
        return {}
    with manifest_path.open(encoding="utf-8") as fh:
        data = yaml.safe_load(fh) or {}
    icons: dict[str, dict[str, Any]] = {}
    for entry in data.get("assets") or []:
        if entry.get("kind") != "icon":
            continue
        asset_id = entry.get("asset_id")
        if asset_id:
            icons[str(asset_id)] = entry
    return icons


def _normalize_dimensions(raw: str | None) -> str:
    if not raw:
        return ""
    return raw.replace("×", "x").replace("px", "").strip()


def _extract_sections(entry: dict[str, Any]) -> list[str]:
    sections: list[str] = []
    for usage in entry.get("usages") or []:
        section = (usage.get("section") or "").strip()
        if section and section not in sections:
            sections.append(section)
    return sections


def _tags_from_hint(hint: str) -> list[str]:
    words = re.findall(r"[a-zA-Z][a-zA-Z0-9-]*", hint.lower())
    tags: list[str] = []
    for word in words:
        if word in _STOP_WORDS or len(word) < 3:
            continue
        if word not in tags:
            tags.append(word)
    return tags[:5]


def _category_from_context(tags: list[str], sections: list[str]) -> str:
    specific: str | None = None
    generic: str | None = None
    for section in sections:
        mapped = _SECTION_CATEGORY.get(section.lower())
        if not mapped:
            continue
        if mapped != "general":
            specific = mapped
            break
        generic = mapped
    if specific:
        return specific
    if generic:
        return generic

    joined = " ".join(tags).lower()
    for category, keywords in _TAG_CATEGORY_KEYWORDS.items():
        if any(kw in joined for kw in keywords):
            return category
    return "general"


def _suggested_elements(category: str, tags: list[str]) -> list[str]:
    elements: list[str] = []
    for elem in _CATEGORY_ELEMENTS.get(category, _CATEGORY_ELEMENTS["general"]):
        if elem not in elements:
            elements.append(elem)
    for tag in tags:
        for elem in _TAG_ELEMENTS.get(tag.lower(), []):
            if elem not in elements:
                elements.append(elem)
    return elements or ["tech-tile"]


def _stub_entry(
    icon_id: str,
    manifest_entry: dict[str, Any] | None,
) -> dict[str, Any]:
    hint = (manifest_entry or {}).get("hint") or "Presentation icon from template"
    sections = _extract_sections(manifest_entry or {})
    tags = _tags_from_hint(hint)
    if not tags and sections:
        tags = _tags_from_hint(" ".join(sections))[:5]
    if not tags:
        tags = ["icon", "presentation"]
    category = _category_from_context(tags, sections)
    dimensions = _normalize_dimensions((manifest_entry or {}).get("dimensions"))
    return {
        "id": icon_id,
        "file": f"icons/{icon_id}.png",
        "tags": tags,
        "category": category,
        "description": hint.rstrip("."),
        "suggested_elements": _suggested_elements(category, tags),
        "dimensions": dimensions,
    }


# ---------------------------------------------------------------------------
# Vision LLM tagging
# ---------------------------------------------------------------------------

def _encode_image(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("utf-8")


def _parse_vision_response(text: str) -> dict[str, Any] | None:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            return None
        try:
            data = json.loads(match.group())
        except json.JSONDecodeError:
            return None
    if not isinstance(data, dict):
        return None
    category = str(data.get("category", "general")).lower()
    if category not in CATEGORIES:
        category = "general"
    tags_raw = data.get("tags") or []
    tags = [str(t).lower().strip() for t in tags_raw if str(t).strip()][:5]
    description = str(data.get("description", "")).strip()
    if not description or not tags:
        return None
    return {"description": description, "tags": tags, "category": category}


def _tag_with_vision(
    icon_path: Path,
    model: str,
    manifest_entry: dict[str, Any] | None,
) -> dict[str, Any] | None:
    import litellm

    icon_id = icon_path.stem
    b64 = _encode_image(icon_path)
    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": _VISION_PROMPT},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/png;base64,{b64}"},
                },
            ],
        }
    ]
    try:
        response = litellm.completion(
            messages=messages,
            **_litellm_kwargs(model),
        )
        text = response.choices[0].message.content or ""
        parsed = _parse_vision_response(text)
        if not parsed:
            return None
        category = parsed["category"]
        tags = parsed["tags"]
        dimensions = _normalize_dimensions((manifest_entry or {}).get("dimensions"))
        return {
            "id": icon_id,
            "file": f"icons/{icon_id}.png",
            "tags": tags,
            "category": category,
            "description": parsed["description"],
            "suggested_elements": _suggested_elements(category, tags),
            "dimensions": dimensions,
        }
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def catalog_icons(skills_root: Path, model: str | None = None) -> Path:
    """Build ``assets/icon_catalog.yaml`` from icon PNGs and manifest context.

    Parameters
    ----------
    skills_root:
        Root of the skills output tree (contains ``assets/``).
    model:
        LiteLLM model id for vision tagging.  When *None* and no model can be
        resolved from env/config, generates stub entries only.

    Returns
    -------
    Path
        Path to the written ``icon_catalog.yaml``.
    """
    assets_dir = skills_root / "assets"
    icons_dir = assets_dir / "icons"
    if not icons_dir.is_dir():
        raise FileNotFoundError(f"Icons directory not found: {icons_dir}")

    manifest_icons = _load_manifest(assets_dir)
    png_files = sorted(icons_dir.glob("*.png"))
    if not png_files:
        raise FileNotFoundError(f"No PNG icons found in {icons_dir}")

    resolved_model = _resolve_model(model)
    use_vision = resolved_model is not None
    vision_count = 0

    catalog_entries: list[dict[str, Any]] = []
    for png_path in png_files:
        icon_id = png_path.stem
        manifest_entry = manifest_icons.get(icon_id)

        entry: dict[str, Any] | None = None
        if use_vision and resolved_model:
            entry = _tag_with_vision(png_path, resolved_model, manifest_entry)
            if entry:
                vision_count += 1

        if entry is None:
            entry = _stub_entry(icon_id, manifest_entry)

        catalog_entries.append(entry)

    if vision_count == len(catalog_entries):
        source = "manifest.yaml + vision LLM tagging"
    elif vision_count > 0:
        source = f"manifest.yaml + vision LLM tagging ({vision_count}/{len(catalog_entries)} icons)"
    else:
        source = "manifest.yaml (stub generation)"

    catalog: dict[str, Any] = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": source,
        "icons": catalog_entries,
    }

    out_path = assets_dir / "icon_catalog.yaml"
    out_path.write_text(
        yaml.dump(catalog, sort_keys=False, default_flow_style=False, allow_unicode=True),
        encoding="utf-8",
    )
    return out_path
