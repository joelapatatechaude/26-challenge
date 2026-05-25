"""Extract a skeleton PPTX and theme manifest from a template.

A skeleton is the original template with all content slides stripped out,
leaving only the slide masters, layouts, media, and theme XML.  One skeleton
file is produced per template (all masters are kept).  A ``theme-manifest.yaml``
records the human-readable color alias, master index, and per-variant background
colors for each master so the generator can pick the right visual treatment at
build time.

Output layout
-------------
skills-output/templates/<template_id>/
    skeletons/
        skeleton.pptx           ← stripped template (0 slides, all masters)
    theme-manifest.yaml         ← alias → master_index + variant colors

Usage
-----
    python -m src skeletons \\
        --input  templates/1.\\ Red\\ Hat\\ standard\\ presentation\\ template.pptx \\
        --output ./skills-output \\
        --template-id rh-standard
"""

from __future__ import annotations

import io
import re
import zipfile
from pathlib import Path
from typing import Any

import yaml


# ---------------------------------------------------------------------------
# Known hex → human alias mapping.
# Extend this dict as new templates are encountered.
# ---------------------------------------------------------------------------
_COLOR_ALIASES: dict[str, str] = {
    "000000": "black",
    "111111": "black",
    "151515": "black",
    "1a1a1a": "black",
    "292929": "charcoal",
    "2c2c2c": "charcoal",
    "333333": "charcoal",
    "3d3d3d": "charcoal",
    "ee0000": "red",
    "cc0000": "red",
    "e00000": "red",
    "0066cc": "blue",
    "003087": "navy",
    "005073": "teal",
    "ffffff": "white",
    "f5f5f5": "white",
    "ebebeb": "light-gray",
    "d3d3d3": "light-gray",
}


def _hex_to_alias(hex_color: str) -> str:
    """Return a human alias for a hex color, falling back to the hex value."""
    key = hex_color.lstrip("#").lower()
    return _COLOR_ALIASES.get(key, key)


def _read_master_bg_colors(pptx_path: Path) -> list[str]:
    """Return the background hex color for every slide master (uppercase, no #)."""
    colors: list[str] = []
    with zipfile.ZipFile(pptx_path) as z:
        master_files = sorted(
            [f for f in z.namelist()
             if re.match(r"ppt/slideMasters/slideMaster\d+\.xml$", f)],
            key=lambda x: int(re.search(r"\d+", x.split("/")[-1]).group()),
        )
        for mf in master_files:
            xml = z.read(mf).decode("utf-8", errors="replace")
            match = re.search(
                r"<p:bg\b[^>]*>.*?<a:srgbClr val=\"([0-9A-Fa-f]{6})\"",
                xml, re.DOTALL,
            )
            colors.append(match.group(1).upper() if match else "FFFFFF")
    return colors


def _sample_layout_bg_image(pptx_path: Path, layout_file: str) -> str | None:
    """Sample a layout's background image to detect its dominant visual color.

    Returns "RED", "DARK", or "WHITE", or None if no image bg.
    """
    try:
        from pptx import Presentation as _Prs
        from PIL import Image

        prs = _Prs(str(pptx_path))
        # Find the layout by matching its XML filename
        idx_match = re.search(r"slideLayout(\d+)\.xml$", layout_file)
        if not idx_match:
            return None

        # Scan all layouts across all masters
        layout_idx = int(idx_match.group(1)) - 1
        all_layouts = []
        for master in prs.slide_masters:
            for layout in master.slide_layouts:
                all_layouts.append(layout)

        if layout_idx >= len(all_layouts):
            return None

        layout = all_layouts[layout_idx]
        NS_A = "http://schemas.openxmlformats.org/drawingml/2006/main"
        NS_R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

        blip = layout._element.find(f".//{{{NS_A}}}blip")
        if blip is None:
            return None

        rid = blip.get(f"{{{NS_R}}}embed")
        if not rid or rid not in layout.part.rels:
            return None

        blob = layout.part.rels[rid].target_part.blob
        img = Image.open(io.BytesIO(blob)).convert("RGB")
        w, h = img.size
        samples = [
            img.getpixel((w // 4, h // 4)),
            img.getpixel((w // 2, h // 2)),
            img.getpixel((3 * w // 4, h // 2)),
            img.getpixel((w // 2, 3 * h // 4)),
        ]
        avg_r = sum(p[0] for p in samples) // len(samples)
        avg_g = sum(p[1] for p in samples) // len(samples)
        avg_b = sum(p[2] for p in samples) // len(samples)

        if avg_r > 180 and avg_g < 80:
            return "RED"
        if avg_r < 60 and avg_g < 60 and avg_b < 60:
            return "DARK"
        if avg_r > 180 and avg_g > 180 and avg_b > 180:
            return "WHITE"
        return None
    except Exception:
        return None


def _read_layout_variant_colors(pptx_path: Path, master_idx: int) -> dict[str, str]:
    """
    Scan the layouts owned by *master_idx* and classify backgrounds into
    slide-variant buckets (cover / section / content).

    Uses image sampling when layouts have background images (common in Google
    Slides-exported templates), falling back to solid-fill XML parsing.
    """
    variants: dict[str, str] = {}

    with zipfile.ZipFile(pptx_path) as z:
        rels_file = (
            f"ppt/slideMasters/_rels/slideMaster{master_idx + 1}.xml.rels"
        )
        if rels_file not in z.namelist():
            return variants

        rels_xml = z.read(rels_file).decode("utf-8", errors="replace")
        layout_refs = re.findall(
            r'Target="\.\./slideLayouts/(slideLayout\d+\.xml)"', rels_xml
        )

        for ref in layout_refs:
            layout_file = f"ppt/slideLayouts/{ref}"
            if layout_file not in z.namelist():
                continue

            # Try image sampling first (more accurate for image backgrounds)
            visual = _sample_layout_bg_image(pptx_path, ref)
            if visual == "RED" and "cover" not in variants:
                variants["cover"] = "#EE0000"
                continue
            elif visual == "DARK" and "section" not in variants:
                variants["section"] = "#151515"
                continue
            elif visual == "WHITE" and "content" not in variants:
                variants["content"] = "#FFFFFF"
                continue

            # Fall back to solid fill
            xml = z.read(layout_file).decode("utf-8", errors="replace")
            match = re.search(
                r"<p:bg\b[^>]*>.*?<a:srgbClr val=\"([0-9A-Fa-f]{6})\"",
                xml, re.DOTALL,
            )
            if not match:
                continue

            color = match.group(1).upper()
            alias = _hex_to_alias(color)
            if alias == "red" and "cover" not in variants:
                variants["cover"] = f"#{color}"
            elif alias in ("black", "charcoal") and "section" not in variants:
                variants["section"] = f"#{color}"
            elif alias in ("white", "light-gray") and "content" not in variants:
                variants["content"] = f"#{color}"

    return variants


# ---------------------------------------------------------------------------
# XML patching helpers
# ---------------------------------------------------------------------------

_P_NS  = "http://schemas.openxmlformats.org/presentationml/2006/main"
_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
_SLIDE_TYPE  = "relationships/slide\""
_CONTENT_SLIDE_TYPE = (
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide\""
)


def _remove_slides_from_presentation_xml(content: bytes) -> bytes:
    """Strip the <p:sldIdLst> element so the skeleton has 0 slides."""
    # Use regex replacement to stay namespace-safe and avoid re-serialisation
    # artefacts that can confuse PowerPoint.
    patched = re.sub(
        r"<p:sldIdLst\b[^>]*/?>.*?</p:sldIdLst>|<p:sldIdLst\b[^>]*/>",
        "",
        content.decode("utf-8", errors="replace"),
        flags=re.DOTALL,
    )
    return patched.encode("utf-8")


def _remove_slides_from_presentation_rels(content: bytes) -> bytes:
    """Remove slide Relationship entries from presentation.xml.rels."""
    slide_rel_type = (
        "http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide"
    )
    patched = re.sub(
        rf'<Relationship[^>]+Type="{re.escape(slide_rel_type)}"[^>]*/?>',
        "",
        content.decode("utf-8", errors="replace"),
    )
    return patched.encode("utf-8")


def _remove_slides_from_content_types(content: bytes) -> bytes:
    """Remove slide Override entries from [Content_Types].xml."""
    patched = re.sub(
        r'<Override\s+PartName="/ppt/slides/slide\d+\.xml"[^>]*/?>',
        "",
        content.decode("utf-8", errors="replace"),
    )
    return patched.encode("utf-8")


# ---------------------------------------------------------------------------
# Skeleton builder
# ---------------------------------------------------------------------------

def _build_skeleton(src: Path, dest: Path) -> None:
    """
    Copy *src* to *dest*, stripping all content slides while preserving every
    slide master, layout, media file, and theme.
    """
    with zipfile.ZipFile(src, "r") as z_in:
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as z_out:
            for item in z_in.namelist():
                # Drop slide XML files
                if re.match(r"ppt/slides/slide\d+\.xml$", item):
                    continue
                # Drop per-slide relationship files
                if re.match(r"ppt/slides/_rels/slide\d+\.xml\.rels$", item):
                    continue

                raw = z_in.read(item)

                # Patch presentation.xml to remove slide references
                if item == "ppt/presentation.xml":
                    raw = _remove_slides_from_presentation_xml(raw)

                # Patch relationship map to remove slide entries
                elif item == "ppt/_rels/presentation.xml.rels":
                    raw = _remove_slides_from_presentation_rels(raw)

                # Patch content types to remove slide type entries
                elif item == "[Content_Types].xml":
                    raw = _remove_slides_from_content_types(raw)

                z_out.writestr(item, raw)

        dest.write_bytes(buf.getvalue())


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def extract_skeletons(
    pptx_path: Path,
    template_id: str,
    output_root: Path,
) -> Path:
    """
    Strip all content slides from *pptx_path* and write:

    - ``skeletons/skeleton.pptx``   — zero-slide template (all masters kept)
    - ``theme-manifest.yaml``       — color aliases + variant bg colors per master

    Returns the path to the theme-manifest.yaml.
    """
    pptx_path   = Path(pptx_path)
    output_root = Path(output_root)

    skeleton_dir = output_root / "templates" / template_id / "skeletons"
    skeleton_dir.mkdir(parents=True, exist_ok=True)

    # ── Build skeleton ──────────────────────────────────────────────────────
    skeleton_path = skeleton_dir / "skeleton.pptx"
    _build_skeleton(pptx_path, skeleton_path)
    print(f"  Skeleton written → {skeleton_path}")

    # ── Detect master colors + aliases ──────────────────────────────────────
    master_colors = _read_master_bg_colors(pptx_path)
    print(f"  Detected {len(master_colors)} master(s): "
          + ", ".join(f"#{c}" for c in master_colors))

    # Deduplicate aliases when two masters share the same color
    used: dict[str, int] = {}
    masters_manifest: dict[str, Any] = {}

    for idx, bg_hex in enumerate(master_colors):
        alias = _hex_to_alias(bg_hex)
        if alias in used:
            used[alias] += 1
            alias = f"{alias}-{used[alias]}"
        else:
            used[alias] = 1

        variants = _read_layout_variant_colors(pptx_path, idx)
        # Fill missing variants with sensible defaults
        variants.setdefault("cover",   f"#{bg_hex}")
        variants.setdefault("section", f"#{bg_hex}")
        variants.setdefault("content", "#FFFFFF")

        masters_manifest[alias] = {
            "master_index": idx,
            "bg_hex":       f"#{bg_hex}",
            "slide_variants": variants,
        }
        print(f"    master[{idx}] → alias='{alias}'  variants={variants}")

    # ── Write theme manifest ─────────────────────────────────────────────────
    manifest: dict[str, Any] = {
        "skeleton": "skeletons/skeleton.pptx",
        "masters":  masters_manifest,
    }
    manifest_path = output_root / "templates" / template_id / "theme-manifest.yaml"
    with open(manifest_path, "w") as fh:
        yaml.dump(manifest, fh, allow_unicode=True, sort_keys=False,
                  default_flow_style=False)
    print(f"  Manifest written → {manifest_path}")

    return manifest_path
