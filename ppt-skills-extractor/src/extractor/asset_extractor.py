"""Extract and classify visual assets from a PPTX template file.

Assets are extracted into:
    skills/assets/
    ├── manifest.yaml               # index of all extracted assets
    ├── logos/                      # brand logos from slide layouts/master
    ├── icons/                      # small square graphics from content slides
    ├── photos/                     # stock/placeholder photos
    ├── backgrounds/                # full-slide background images
    └── charts/                     # chart type + color + axis descriptions (YAML)

Classification logic
--------------------
Source context (master / layout) is the strongest signal:
  - master or layout → logo or background (depends on size)
Content slides:
  - Very small (≤ 200px either dim) → icon
  - Square-ish aspect (0.7–1.4), ≤ 500px → icon
  - Wide and short (aspect > 3, height < 250px) → logo/banner
  - Large (> 900px wide) → photo or background
  - Tall portrait (height > width * 1.2) → photo (stock portrait)

Chart extraction
----------------
Chart XML lives in ppt/charts/chart*.xml.  We parse the DrawingML <c:> namespace
to extract: chart_type, series names, series fill colors, axis labels, and style.
This becomes a ChartTemplate YAML that the generation agent can replay.

Usage record
------------
Each asset carries a list of ``usages``: which slide, at what normalised position
(x_pct, y_pct, w_pct, h_pct), and the slide's section name.  This lets the agent
know exactly where to place a logo on a title slide vs. a content slide.
"""

from __future__ import annotations

import hashlib
import io
import re
import zipfile
from enum import Enum
from pathlib import Path
from typing import Any, Optional

import yaml
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Output schemas
# ---------------------------------------------------------------------------

class AssetKind(str, Enum):
    LOGO = "logo"
    ICON = "icon"
    PHOTO = "photo"
    BACKGROUND = "background"
    UNKNOWN = "unknown"


class AssetUsage(BaseModel):
    """One occurrence of an image on a slide."""
    slide_number: int
    section: str = ""
    source: str  # "slide", "layout", "master"
    x_pct: float = 0.0
    y_pct: float = 0.0
    w_pct: float = 0.0
    h_pct: float = 0.0


class ExtractedAsset(BaseModel):
    asset_id: str                   # sha1[:12] of the blob
    original_filename: str
    kind: AssetKind
    extracted_path: str = ""        # relative path inside skills/assets/
    width_px: int = 0
    height_px: int = 0
    size_bytes: int = 0
    ext: str = "png"
    usages: list[AssetUsage] = Field(default_factory=list)
    replacement_hint: str = ""      # guidance for the generation agent
    replaceable: bool = False       # True → agent should substitute real content


class ChartSeries(BaseModel):
    name: str = ""
    fill_color: str = ""
    line_color: str = ""
    values: list[Any] = Field(default_factory=list)


class ChartTemplate(BaseModel):
    chart_id: str
    chart_type: str          # barChart, pieChart, lineChart, areaChart, …
    series: list[ChartSeries] = Field(default_factory=list)
    has_legend: bool = True
    axis_labels: list[str] = Field(default_factory=list)
    style_id: int = 0
    color_scheme: list[str] = Field(default_factory=list)  # hex colors per series
    usage_slides: list[int] = Field(default_factory=list)
    description: str = ""


class AssetManifest(BaseModel):
    source_file: str
    template_id: str
    assets: list[ExtractedAsset] = Field(default_factory=list)
    charts: list[ChartTemplate] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Namespace constants
# ---------------------------------------------------------------------------

_NS = {
    "p":   "http://schemas.openxmlformats.org/presentationml/2006/main",
    "a":   "http://schemas.openxmlformats.org/drawingml/2006/main",
    "r":   "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "c":   "http://schemas.openxmlformats.org/drawingml/2006/chart",
    "pic": "http://schemas.openxmlformats.org/drawingml/2006/picture",
}

_IMAGE_REL_TYPE  = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
_CHART_REL_TYPE  = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart"

# slide canvas in EMU (standard 13.33" × 7.5" widescreen)
_SLIDE_W_EMU = 12192000
_SLIDE_H_EMU = 6858000


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _sha1(blob: bytes) -> str:
    return hashlib.sha1(blob).hexdigest()[:12]


def _image_dims(blob: bytes) -> tuple[int, int]:
    """Return (width, height) in pixels using Pillow, or (0,0) on failure."""
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(blob))
        return img.size
    except Exception:
        return 0, 0


def _rels(z: zipfile.ZipFile, xml_path: str) -> dict[str, str]:
    """Return {rId: media_filename} for image relationships of an XML file."""
    parts = xml_path.split("/")
    rels_path = "/".join(parts[:-1]) + "/_rels/" + parts[-1] + ".rels"
    result: dict[str, str] = {}
    if rels_path not in z.namelist():
        return result
    from lxml import etree
    rels_root = etree.fromstring(z.read(rels_path))
    for rel in rels_root:
        if rel.get("Type", "") == _IMAGE_REL_TYPE:
            rid = rel.get("Id", "")
            target = rel.get("Target", "").split("/")[-1]
            result[rid] = target
    return result


def _chart_rels(z: zipfile.ZipFile, xml_path: str) -> dict[str, str]:
    """Return {rId: chart_filename} for chart relationships."""
    parts = xml_path.split("/")
    rels_path = "/".join(parts[:-1]) + "/_rels/" + parts[-1] + ".rels"
    result: dict[str, str] = {}
    if rels_path not in z.namelist():
        return result
    from lxml import etree
    rels_root = etree.fromstring(z.read(rels_path))
    for rel in rels_root:
        if rel.get("Type", "") == _CHART_REL_TYPE:
            rid = rel.get("Id", "")
            # target is like ../charts/chart1.xml
            target = rel.get("Target", "")
            chart_path = "ppt/charts/" + target.split("/")[-1]
            result[rid] = chart_path
    return result


def _classify_asset(
    media_file: str,
    source: str,      # "slide", "layout", "master"
    w: int,
    h: int,
    size_bytes: int,
) -> tuple[AssetKind, bool, str]:
    """Return (kind, replaceable, replacement_hint)."""
    aspect = w / h if h else 1.0

    # Master/layout-sourced images are logos or backgrounds
    if source in ("master", "layout"):
        if aspect > 2.5 or (w > 400 and h < 200):
            return AssetKind.LOGO, False, "Brand logo — do not replace; use official Red Hat logo asset."
        if w > 1000 or h > 600:
            return AssetKind.BACKGROUND, False, "Slide layout background — keep or replace with branded background."
        if w < 400 and h < 400:
            return AssetKind.ICON, False, "Icon used in layout — replace with appropriate icon from Red Hat icon library."
        return AssetKind.LOGO, False, "Brand asset from slide layout."

    # Content slide images
    if w <= 400 and h <= 400 and 0.6 < aspect < 1.6:
        return AssetKind.ICON, True, "Replace with appropriate icon from Red Hat icon library."
    if aspect > 2.5 and h < 250:
        return AssetKind.LOGO, False, "Horizontal logo/banner — do not replace."
    if w > 900 and aspect < 0.9:
        return AssetKind.PHOTO, True, "Portrait photo placeholder — replace with customer/speaker photo."
    if w > 900:
        return AssetKind.PHOTO, True, "Landscape photo placeholder — replace with relevant imagery."
    return AssetKind.UNKNOWN, True, "Replace with appropriate visual asset."


def _image_usages(
    z: zipfile.ZipFile,
    media_name: str,
    section_map: dict[int, str],
    slide_w_emu: int,
    slide_h_emu: int,
) -> list[AssetUsage]:
    """Find all usages of a media file across slides and layouts."""
    from lxml import etree
    usages: list[AssetUsage] = []

    sources: list[tuple[str, str]] = []  # (xml_path, source_label)
    slide_files = sorted(
        [n for n in z.namelist() if re.match(r"ppt/slides/slide\d+\.xml", n)],
        key=lambda x: int(re.search(r"\d+", x).group()),
    )
    for sf in slide_files:
        sources.append((sf, "slide"))
    for lf in sorted(n for n in z.namelist() if re.match(r"ppt/slideLayouts/slideLayout\d+\.xml", n)):
        sources.append((lf, "layout"))
    for mf in sorted(n for n in z.namelist() if re.match(r"ppt/slideMasters/slideMaster\d+\.xml", n)):
        sources.append((mf, "master"))

    for xml_path, source_label in sources:
        rid_to_media = _rels(z, xml_path)
        if media_name not in rid_to_media.values():
            continue

        root = etree.fromstring(z.read(xml_path))

        # slide number for "slide" sources
        slide_num = 0
        if source_label == "slide":
            m = re.search(r"\d+", xml_path.split("/")[-1])
            slide_num = int(m.group()) if m else 0

        # Find blip references and their bounding boxes
        blips = root.findall(f".//{{{_NS['a']}}}blip")
        for blip in blips:
            rId = None
            for attr, val in blip.attrib.items():
                if "embed" in attr.lower():
                    rId = val
            if rid_to_media.get(rId) != media_name:
                continue

            # Walk up to find xfrm (bounding box)
            parent = blip.getparent()
            xfrm = None
            for _ in range(8):
                if parent is None:
                    break
                xfrm = parent.find(f".//{{{_NS['a']}}}xfrm")
                if xfrm is not None:
                    break
                parent = parent.getparent()

            x_pct = y_pct = w_pct = h_pct = 0.0
            if xfrm is not None:
                off = xfrm.find(f"{{{_NS['a']}}}off")
                ext = xfrm.find(f"{{{_NS['a']}}}ext")
                if off is not None:
                    x_pct = round(int(off.get("x", 0)) / slide_w_emu * 100, 1)
                    y_pct = round(int(off.get("y", 0)) / slide_h_emu * 100, 1)
                if ext is not None:
                    w_pct = round(int(ext.get("cx", 0)) / slide_w_emu * 100, 1)
                    h_pct = round(int(ext.get("cy", 0)) / slide_h_emu * 100, 1)

            usages.append(AssetUsage(
                slide_number=slide_num,
                section=section_map.get(slide_num, ""),
                source=source_label,
                x_pct=x_pct,
                y_pct=y_pct,
                w_pct=w_pct,
                h_pct=h_pct,
            ))

    return usages


# ---------------------------------------------------------------------------
# Chart extraction
# ---------------------------------------------------------------------------

def _extract_chart(z: zipfile.ZipFile, chart_xml_path: str, slide_nums: list[int]) -> ChartTemplate:
    """Parse a chart XML into a ChartTemplate description."""
    from lxml import etree
    chart_id = chart_xml_path.split("/")[-1].replace(".xml", "")
    root = etree.fromstring(z.read(chart_xml_path))

    ns_c = _NS["c"]
    ns_a = _NS["a"]

    # Detect chart type (first matching chart-type element)
    chart_types = []
    for el in root.iter():
        tag = re.sub(r"\{.*?\}", "", el.tag)
        if (tag.endswith("Chart") and tag not in
                {"chartSpace", "chart", "plotArea", "barChart", "lineChart",
                 "pieChart", "areaChart", "doughnutChart", "scatterChart",
                 "bubbleChart", "radarChart", "stockChart", "surfaceChart"}):
            pass
        elif tag in {"barChart", "lineChart", "pieChart", "areaChart",
                     "doughnutChart", "scatterChart", "bubbleChart",
                     "radarChart", "stockChart", "surfaceChart"}:
            chart_types.append(tag)
    chart_type = chart_types[0] if chart_types else "unknown"

    # Extract series
    series_list: list[ChartSeries] = []
    colors: list[str] = []
    for ser in root.findall(f".//{{{ns_c}}}ser"):
        name_el = ser.find(f".//{{{ns_c}}}tx//{{{ns_c}}}v")
        name = name_el.text if name_el is not None else ""

        fill_color = ""
        line_color = ""
        # Look for spPr → solidFill → srgbClr
        spPr = ser.find(f".//{{{ns_c}}}spPr")
        if spPr is not None:
            srgb = spPr.find(f".//{{{ns_a}}}srgbClr")
            if srgb is not None:
                fill_color = f"#{srgb.get('val', '').upper()}"

        # Extract values
        vals = [v.text for v in ser.findall(f".//{{{ns_c}}}numRef//{{{ns_c}}}v")]

        series_list.append(ChartSeries(
            name=name,
            fill_color=fill_color,
            line_color=line_color,
            values=vals[:10],  # cap at 10
        ))
        if fill_color:
            colors.append(fill_color)

    # Style ID
    style_el = root.find(f".//{{{ns_c}}}style")
    style_id = int(style_el.text) if style_el is not None and style_el.text else 0

    # Axis labels
    axis_labels = [
        el.text
        for el in root.findall(f".//{{{ns_c}}}cat//{{{ns_c}}}v")
        if el.text
    ][:8]

    # Has legend
    has_legend = root.find(f".//{{{ns_c}}}legend") is not None

    return ChartTemplate(
        chart_id=chart_id,
        chart_type=chart_type,
        series=series_list,
        has_legend=has_legend,
        axis_labels=axis_labels,
        style_id=style_id,
        color_scheme=colors,
        usage_slides=slide_nums,
        description=f"{chart_type} with {len(series_list)} series",
    )


# ---------------------------------------------------------------------------
# Section map builder
# ---------------------------------------------------------------------------

def _build_section_map(z: zipfile.ZipFile) -> dict[int, str]:
    """Return {slide_number: section_name} by scanning for 'Template section' markers."""
    from lxml import etree
    ns_a = _NS["a"]
    section_map: dict[int, str] = {}
    slide_files = sorted(
        [n for n in z.namelist() if re.match(r"ppt/slides/slide\d+\.xml", n)],
        key=lambda x: int(re.search(r"\d+", x).group()),
    )
    current_section = ""
    for sf in slide_files:
        slide_num = int(re.search(r"\d+", sf.split("/")[-1]).group())
        root = etree.fromstring(z.read(sf))
        texts = [t.text.strip() for t in root.findall(f".//{{{ns_a}}}t") if t.text and t.text.strip()]
        if "Template section" in texts:
            idx = texts.index("Template section")
            parts = []
            for t in texts[idx + 1:]:
                if t.lower() in ("template slide", "template section"):
                    break
                parts.append(t)
                if len(parts) >= 3:
                    break
            current_section = " ".join(parts).strip()
        section_map[slide_num] = current_section
    return section_map


# ---------------------------------------------------------------------------
# Main extraction function
# ---------------------------------------------------------------------------

def extract_assets(
    path: str | Path,
    template_id: str,
    output_root: Path,
    slide_w_emu: int = _SLIDE_W_EMU,
    slide_h_emu: int = _SLIDE_H_EMU,
) -> AssetManifest:
    """Extract all visual assets from a PPTX and write them to output_root/assets/.

    Returns an AssetManifest describing every extracted asset.
    """
    path = Path(path)
    assets_dir = output_root / "assets"
    logos_dir      = assets_dir / "logos"
    icons_dir      = assets_dir / "icons"
    photos_dir     = assets_dir / "photos"
    backgrounds_dir = assets_dir / "backgrounds"
    charts_dir     = assets_dir / "charts"
    for d in [logos_dir, icons_dir, photos_dir, backgrounds_dir, charts_dir]:
        d.mkdir(parents=True, exist_ok=True)

    manifest = AssetManifest(source_file=str(path), template_id=template_id)

    with zipfile.ZipFile(path) as z:
        section_map = _build_section_map(z)
        media_files = sorted(n for n in z.namelist() if n.startswith("ppt/media/"))

        # Collect all media → source context
        # An image in master/layout rels gets priority source label
        media_sources: dict[str, str] = {}  # media_name → "slide"|"layout"|"master"
        for xml_path in z.namelist():
            if re.match(r"ppt/slideMasters/.*\.xml$", xml_path) and not "_rels" in xml_path:
                for media_name in _rels(z, xml_path).values():
                    media_sources[media_name] = "master"
            elif re.match(r"ppt/slideLayouts/.*\.xml$", xml_path) and not "_rels" in xml_path:
                for media_name in _rels(z, xml_path).values():
                    if media_name not in media_sources:
                        media_sources[media_name] = "layout"
        for xml_path in z.namelist():
            if re.match(r"ppt/slides/.*\.xml$", xml_path) and not "_rels" in xml_path:
                for media_name in _rels(z, xml_path).values():
                    if media_name not in media_sources:
                        media_sources[media_name] = "slide"

        # Extract each media file
        seen_hashes: set[str] = set()
        for media_path in media_files:
            media_name = media_path.split("/")[-1]
            ext = media_name.rsplit(".", 1)[-1].lower() if "." in media_name else "png"
            blob = z.read(media_path)
            asset_id = _sha1(blob)

            if asset_id in seen_hashes:
                continue  # deduplicate identical blobs
            seen_hashes.add(asset_id)

            w, h = _image_dims(blob)
            source = media_sources.get(media_name, "slide")
            kind, replaceable, hint = _classify_asset(media_name, source, w, h, len(blob))

            # Determine output subdirectory
            subdir_map = {
                AssetKind.LOGO:       logos_dir,
                AssetKind.ICON:       icons_dir,
                AssetKind.PHOTO:      photos_dir,
                AssetKind.BACKGROUND: backgrounds_dir,
                AssetKind.UNKNOWN:    photos_dir,
            }
            dest_dir = subdir_map[kind]
            dest_file = dest_dir / f"{asset_id}.{ext}"
            dest_file.write_bytes(blob)

            usages = _image_usages(z, media_name, section_map, slide_w_emu, slide_h_emu)

            rel_path = str(dest_file.relative_to(output_root))
            manifest.assets.append(ExtractedAsset(
                asset_id=asset_id,
                original_filename=media_name,
                kind=kind,
                extracted_path=rel_path,
                width_px=w,
                height_px=h,
                size_bytes=len(blob),
                ext=ext,
                usages=usages,
                replacement_hint=hint,
                replaceable=replaceable,
            ))

        # Extract charts
        chart_slide_map: dict[str, list[int]] = {}
        slide_files = sorted(
            [n for n in z.namelist() if re.match(r"ppt/slides/slide\d+\.xml", n)],
            key=lambda x: int(re.search(r"\d+", x).group()),
        )
        for sf in slide_files:
            slide_num = int(re.search(r"\d+", sf.split("/")[-1]).group())
            for chart_path in _chart_rels(z, sf).values():
                chart_slide_map.setdefault(chart_path, []).append(slide_num)

        for chart_path, slide_nums in chart_slide_map.items():
            if chart_path not in z.namelist():
                continue
            try:
                ct = _extract_chart(z, chart_path, slide_nums)
                # Write chart YAML
                chart_yaml_path = charts_dir / f"{ct.chart_id}.yaml"
                with chart_yaml_path.open("w") as f:
                    yaml.dump(ct.model_dump(), f, allow_unicode=True, sort_keys=False)
                manifest.charts.append(ct)
            except Exception as exc:
                print(f"  WARNING: chart extraction failed for {chart_path}: {exc}")

    # Write manifest YAML
    _write_manifest(manifest, assets_dir / "manifest.yaml")
    return manifest


def _write_manifest(manifest: AssetManifest, dest: Path) -> None:
    data: dict[str, Any] = {
        "source_file": manifest.source_file,
        "template_id": manifest.template_id,
        "summary": {
            "logos":       sum(1 for a in manifest.assets if a.kind == AssetKind.LOGO),
            "icons":       sum(1 for a in manifest.assets if a.kind == AssetKind.ICON),
            "photos":      sum(1 for a in manifest.assets if a.kind == AssetKind.PHOTO),
            "backgrounds": sum(1 for a in manifest.assets if a.kind == AssetKind.BACKGROUND),
            "charts":      len(manifest.charts),
        },
        "assets": [
            {
                "asset_id":          a.asset_id,
                "original_filename": a.original_filename,
                "kind":              a.kind.value,
                "path":              a.extracted_path,
                "dimensions":        f"{a.width_px}×{a.height_px}px",
                "size_kb":           a.size_bytes // 1024,
                "replaceable":       a.replaceable,
                "hint":              a.replacement_hint,
                "usages":            [
                    {
                        "slide": u.slide_number,
                        "section": u.section,
                        "source": u.source,
                        "position": f"x={u.x_pct}% y={u.y_pct}%",
                        "size":     f"w={u.w_pct}% h={u.h_pct}%",
                    }
                    for u in a.usages
                ],
            }
            for a in manifest.assets
        ],
        "charts": [c.model_dump() for c in manifest.charts],
    }
    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("w") as f:
        yaml.dump(data, f, allow_unicode=True, sort_keys=False, width=120)


def summarise_manifest(manifest: AssetManifest) -> str:
    """Return a human-readable summary of the extracted assets."""
    lines = [
        f"Source: {manifest.source_file}",
        f"Template: {manifest.template_id}",
        f"Total assets: {len(manifest.assets)}  Charts: {len(manifest.charts)}",
        "",
    ]
    by_kind: dict[str, list[ExtractedAsset]] = {}
    for a in manifest.assets:
        by_kind.setdefault(a.kind.value, []).append(a)

    for kind, assets in sorted(by_kind.items()):
        lines.append(f"=== {kind.upper()} ({len(assets)}) ===")
        for a in assets[:8]:
            usage_count = len(a.usages)
            slide_nums = sorted({u.slide_number for u in a.usages if u.slide_number > 0})[:5]
            lines.append(
                f"  {a.asset_id}  {a.original_filename:20}  {a.width_px}×{a.height_px}px  "
                f"{a.size_bytes//1024}KB  {'REPLACEABLE' if a.replaceable else 'FIXED'}"
                f"  used on slides {slide_nums or 'layout/master'}"
            )
        if len(assets) > 8:
            lines.append(f"  … and {len(assets)-8} more")

    if manifest.charts:
        lines.append(f"\n=== CHARTS ({len(manifest.charts)}) ===")
        for c in manifest.charts:
            lines.append(f"  {c.chart_id}: {c.chart_type}  {len(c.series)} series  "
                         f"colors={c.color_scheme[:3]}  slides={c.usage_slides[:5]}")
    return "\n".join(lines)
