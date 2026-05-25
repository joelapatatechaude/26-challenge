"""
Classify shapes on a slide into known element types using heuristic rules.
All rules are parameterised by the TemplateProfile so colour thresholds are
resolved per-template rather than hard-coded.
"""

from __future__ import annotations

import re
from typing import Any

from schemas import ElementMatch, ElementType, RawShape, RawSlide, TemplateProfile


def _color_close(a: str | None, b: str | None, tolerance: int = 30) -> bool:
    """Return True if two hex colours are within `tolerance` per channel."""
    if not a or not b:
        return False
    try:
        a = a.lstrip("#")
        b = b.lstrip("#")
        for i in range(3):
            if abs(int(a[i*2:i*2+2], 16) - int(b[i*2:i*2+2], 16)) > tolerance:
                return False
        return True
    except Exception:
        return False


def _is_primary(color: str | None, template: TemplateProfile) -> bool:
    return _color_close(color, template.primary_color)


def _is_dark_bg(color: str | None, template: TemplateProfile) -> bool:
    if template.background_dark:
        return _color_close(color, template.background_dark, tolerance=40)
    # Fallback: very dark colour
    if not color:
        return False
    c = color.lstrip("#")
    try:
        r, g, b = int(c[:2], 16), int(c[2:4], 16), int(c[4:], 16)
        return r < 60 and g < 60 and b < 60
    except Exception:
        return False


def _max_font(shape: RawShape) -> float:
    return max(shape.font_sizes) if shape.font_sizes else 0.0


def _min_font(shape: RawShape) -> float:
    return min(shape.font_sizes) if shape.font_sizes else 0.0


# ---------------------------------------------------------------------------
# Per-element detection rules
# ---------------------------------------------------------------------------

def _is_metric_card(shape: RawShape, template: TemplateProfile) -> bool:
    """
    Large value (≥28pt) + smaller label text, with primary-color fill or left border.
    The shape is usually tall enough to contain both value and label (height_pct ≥ 8).
    """
    if _max_font(shape) < 28:
        return False
    has_accent = (
        _is_primary(shape.fill_color, template)
        or _is_primary(shape.line_color, template)
    )
    has_value_and_label = (
        len(shape.font_sizes) >= 2
        and _max_font(shape) >= 28
        and _min_font(shape) <= 14
    )
    return has_accent and has_value_and_label


def _is_bar_chart_item(shape: RawShape, template: TemplateProfile) -> bool:
    """
    A filled rectangle that spans a percentage of the slide width,
    positioned to the right of a label, with primary or secondary fill.
    Height is small (bar-like: height_pct between 2–8), width varies.
    """
    if shape.height_pct < 1.5 or shape.height_pct > 10:
        return False
    if shape.width_pct < 5:
        return False
    has_fill = shape.fill_color is not None
    is_right_half = shape.left_pct > 25
    return has_fill and is_right_half


def _is_quote_block(shape: RawShape, template: TemplateProfile) -> bool:
    """
    Text box with primary-color left border, italic text, muted background.
    """
    has_left_border = (
        _is_primary(shape.line_color, template)
        and shape.line_width_pt is not None
        and shape.line_width_pt >= 2
    )
    has_italic = bool(shape.italic_runs)
    return has_left_border and has_italic and bool(shape.text)


def _is_challenge_list_item(shape: RawShape, template: TemplateProfile) -> bool:
    """
    Text box with primary-color left border, bold opening phrase, multi-line text.
    No italic required. Typically taller than a quote block.
    """
    has_left_border = (
        _is_primary(shape.line_color, template)
        and shape.line_width_pt is not None
        and shape.line_width_pt >= 2
    )
    has_bold_start = bool(shape.bold_runs)
    is_tall_enough = shape.height_pct >= 5
    return has_left_border and has_bold_start and is_tall_enough and not shape.italic_runs


def _is_stop_card(shape: RawShape, template: TemplateProfile) -> bool:
    """
    Card with a primary-color TOP border, a single-digit number, title, and description.
    The number is the largest font on the card.
    """
    has_top_accent = _is_primary(shape.line_color, template) or _is_primary(shape.fill_color, template)
    has_number = bool(re.match(r"^\d$", shape.text.strip()[:1]))
    return has_top_accent and has_number and shape.height_pct >= 8


def _is_tech_tile(shape: RawShape, template: TemplateProfile) -> bool:
    """
    Card with primary-color top border, ALL-CAPS layer label (≤12pt),
    bold name (~14–18pt), and detail text (≤12pt). Narrow column width.
    """
    has_top_accent = _is_primary(shape.line_color, template) or _is_primary(shape.fill_color, template)
    # Look for ALL-CAPS layer label in the text
    has_layer_label = bool(re.search(r"\b[A-Z]{3,}\b", shape.text))
    narrow = shape.width_pct < 40
    return has_top_accent and has_layer_label and narrow


def _is_dark_card(shape: RawShape, template: TemplateProfile) -> bool:
    """OIL-style dark background card with problem/solution content."""
    return _is_dark_bg(shape.fill_color, template) and len(shape.text) > 20


def _is_rec_card(shape: RawShape, template: TemplateProfile) -> bool:
    """
    Recommendation card: primary-color LEFT border, bold title (red, ~14pt),
    detail text, and an action line (usually starts with 'Action:').
    """
    has_left_border = (
        _is_primary(shape.line_color, template)
        and shape.line_width_pt is not None
        and shape.line_width_pt >= 3
    )
    has_action = "action" in shape.text.lower() or "Action:" in shape.text
    return has_left_border and has_action and shape.height_pct >= 8


# ---------------------------------------------------------------------------
# Classifier
# ---------------------------------------------------------------------------

def _shapes_overlap_or_touch(a: RawShape, b: RawShape, margin: float = 2.0) -> bool:
    a_x1 = a.left_pct
    a_x2 = a.left_pct + a.width_pct
    a_y1 = a.top_pct
    a_y2 = a.top_pct + a.height_pct

    b_x1 = b.left_pct
    b_x2 = b.left_pct + b.width_pct
    b_y1 = b.top_pct
    b_y2 = b.top_pct + b.height_pct

    gap_x = max(0.0, b_x1 - a_x2, a_x1 - b_x2)
    gap_y = max(0.0, b_y1 - a_y2, a_y1 - b_y2)

    return gap_x <= margin and gap_y <= margin


def _cluster_shapes(shapes: list[RawShape], margin: float = 2.0) -> list[list[RawShape]]:
    clusters: list[list[RawShape]] = []
    visited = set()
    valid_shapes = [s for s in shapes if s.text.strip() or s.fill_color or s.line_color]

    for shape in valid_shapes:
        if shape.shape_id in visited:
            continue
        cluster = [shape]
        visited.add(shape.shape_id)
        queue = [shape]
        while queue:
            curr = queue.pop(0)
            for other in valid_shapes:
                if other.shape_id not in visited:
                    if _shapes_overlap_or_touch(curr, other, margin):
                        visited.add(other.shape_id)
                        cluster.append(other)
                        queue.append(other)
        clusters.append(cluster)
    return clusters


def _merge_shapes(cluster: list[RawShape]) -> RawShape:
    if len(cluster) == 1:
        return cluster[0]

    left = min(s.left_pct for s in cluster)
    top = min(s.top_pct for s in cluster)
    right = max(s.left_pct + s.width_pct for s in cluster)
    bottom = max(s.top_pct + s.height_pct for s in cluster)
    width = right - left
    height = bottom - top

    sorted_cluster = sorted(cluster, key=lambda s: (s.top_pct, s.left_pct))
    texts = [s.text.strip() for s in sorted_cluster if s.text.strip()]
    merged_text = "\n".join(texts)

    font_sizes = []
    font_names = []
    font_colors = []
    bold_runs = []
    italic_runs = []
    for s in sorted_cluster:
        font_sizes.extend(s.font_sizes)
        for fn in s.font_names:
            if fn not in font_names:
                font_names.append(fn)
        for fc in s.font_colors:
            if fc not in font_colors:
                font_colors.append(fc)
        bold_runs.extend(s.bold_runs)
        italic_runs.extend(s.italic_runs)

    main_shape = max(cluster, key=lambda s: s.width_pct * s.height_pct)

    return RawShape(
        shape_id=main_shape.shape_id,
        shape_type="COMPOUND",
        name=f"Compound_{main_shape.name}",
        left_pct=left,
        top_pct=top,
        width_pct=width,
        height_pct=height,
        text=merged_text,
        font_sizes=font_sizes,
        font_names=font_names,
        font_colors=font_colors,
        fill_color=main_shape.fill_color,
        line_color=main_shape.line_color,
        line_width_pt=main_shape.line_width_pt,
        bold_runs=bold_runs,
        italic_runs=italic_runs,
        image_hash=next((s.image_hash for s in sorted_cluster if s.image_hash), None),
    )


def classify_slide(slide: RawSlide, template: TemplateProfile) -> list[ElementMatch]:
    """Return all element matches found on a single slide."""
    matches: list[ElementMatch] = []
    bar_candidates: list[RawShape] = []
    other_shapes: list[RawShape] = []

    for shape in slide.shapes:
        if not shape.text and not shape.fill_color:
            continue
        if _is_bar_chart_item(shape, template):
            bar_candidates.append(shape)
        else:
            other_shapes.append(shape)

    # Cluster remaining shapes
    clusters = _cluster_shapes(other_shapes, margin=2.0)
    for cluster in clusters:
        merged = _merge_shapes(cluster)

        raw: dict[str, Any] = {
            "text": merged.text[:200],
            "font_sizes": merged.font_sizes[:5],
            "fill_color": merged.fill_color,
            "line_color": merged.line_color,
        }
        visual: dict[str, Any] = {
            "fill_color": merged.fill_color,
            "line_color": merged.line_color,
            "line_width_pt": merged.line_width_pt,
            "max_font_pt": _max_font(merged),
            "position": f"left={merged.left_pct}% top={merged.top_pct}%",
        }

        element_type = None
        if _is_metric_card(merged, template):
            element_type = ElementType.METRIC_CARD
        elif _is_dark_card(merged, template):
            element_type = ElementType.DARK_CARD
        elif _is_rec_card(merged, template):
            element_type = ElementType.REC_CARD
        elif _is_challenge_list_item(merged, template):
            element_type = ElementType.CHALLENGE_LIST
        elif _is_quote_block(merged, template):
            element_type = ElementType.QUOTE_BLOCK
        elif _is_stop_card(merged, template):
            element_type = ElementType.STOP_CARD
        elif _is_tech_tile(merged, template):
            element_type = ElementType.TECH_TILE

        if element_type:
            matches.append(ElementMatch(
                element_type=element_type,
                template_id=template.template_id,
                file=slide.file,
                slide_index=slide.slide_index,
                shape_ids=[s.shape_id for s in cluster],
                raw_content=raw,
                visual=visual,
            ))
        else:
            # Fall back to individual shapes inside the cluster if compound classification fails
            if len(cluster) > 1:
                for shape in cluster:
                    raw_ind = {
                        "text": shape.text[:200],
                        "font_sizes": shape.font_sizes[:5],
                        "fill_color": shape.fill_color,
                        "line_color": shape.line_color,
                    }
                    visual_ind = {
                        "fill_color": shape.fill_color,
                        "line_color": shape.line_color,
                        "line_width_pt": shape.line_width_pt,
                        "max_font_pt": _max_font(shape),
                        "position": f"left={shape.left_pct}% top={shape.top_pct}%",
                    }
                    ind_type = None
                    if _is_metric_card(shape, template):
                        ind_type = ElementType.METRIC_CARD
                    elif _is_dark_card(shape, template):
                        ind_type = ElementType.DARK_CARD
                    elif _is_rec_card(shape, template):
                        ind_type = ElementType.REC_CARD
                    elif _is_challenge_list_item(shape, template):
                        ind_type = ElementType.CHALLENGE_LIST
                    elif _is_quote_block(shape, template):
                        ind_type = ElementType.QUOTE_BLOCK
                    elif _is_stop_card(shape, template):
                        ind_type = ElementType.STOP_CARD
                    elif _is_tech_tile(shape, template):
                        ind_type = ElementType.TECH_TILE

                    if ind_type:
                        matches.append(ElementMatch(
                            element_type=ind_type,
                            template_id=template.template_id,
                            file=slide.file,
                            slide_index=slide.slide_index,
                            shape_ids=[shape.shape_id],
                            raw_content=raw_ind,
                            visual=visual_ind,
                        ))

    # Consolidate bar chart candidates into a single ElementMatch per cluster
    if len(bar_candidates) >= 2:
        matches.append(ElementMatch(
            element_type=ElementType.BAR_CHART,
            template_id=template.template_id,
            file=slide.file,
            slide_index=slide.slide_index,
            shape_ids=[s.shape_id for s in bar_candidates],
            raw_content={"bars": [s.text[:80] for s in bar_candidates]},
            visual={
                "fill_colors": list({s.fill_color for s in bar_candidates if s.fill_color}),
                "height_pct": bar_candidates[0].height_pct,
            },
        ))

    return matches


def classify_presentation(slides: list[RawSlide], template: TemplateProfile) -> list[ElementMatch]:
    """Classify all slides in a deck."""
    all_matches: list[ElementMatch] = []
    for slide in slides:
        all_matches.extend(classify_slide(slide, template))
    return all_matches
