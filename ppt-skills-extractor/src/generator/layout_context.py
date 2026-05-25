"""Layout zones and typography derived from blueprint placeholders."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Rect:
    """Axis-aligned region as percentages of slide width/height."""
    x_pct: float
    y_pct: float
    w_pct: float
    h_pct: float

    def left(self, slide_w: int) -> int:
        return int(self.x_pct / 100 * slide_w)

    def top(self, slide_h: int) -> int:
        return int(self.y_pct / 100 * slide_h)

    def width(self, slide_w: int) -> int:
        return int(self.w_pct / 100 * slide_w)

    def height(self, slide_h: int) -> int:
        return int(self.h_pct / 100 * slide_h)


@dataclass
class TypographyScale:
    deck_title: int = 40
    deck_subtitle: int = 20
    deck_presenter: int = 14
    divider_headline: int = 36
    divider_marker: int = 10
    slide_title: int = 28
    section_marker: int = 10
    agenda_topic: int = 16
    agenda_detail: int = 13
    body: int = 13
    body_small: int = 11
    metric_value: int = 28
    metric_label: int = 12
    card_headline: int = 14
    card_body: int = 11
    source: int = 9
    quote: int = 22
    closing_title: int = 44


@dataclass
class LayoutZones:
    title: Rect | None = None
    subtitle: Rect | None = None
    body: Rect | None = None
    presenter: Rect | None = None
    logo: Rect | None = None
    max_text_right_pct: float = 78.0
    max_text_bottom_pct: float = 88.0

    def section_marker_rect(self) -> Rect:
        """Eyebrow above slide title — must not overlap title box."""
        if self.title:
            marker_h = 3.5
            gap = 1.5
            marker_y = max(2.0, self.title.y_pct - marker_h - gap)
            return Rect(
                x_pct=self.title.x_pct,
                y_pct=marker_y,
                w_pct=min(40.0, self.title.w_pct),
                h_pct=marker_h,
            )
        return Rect(5.0, 2.0, 35.0, 4.0)


@dataclass
class LayoutMetrics:
    """EMU positions for stacked header + content (avoids overlap)."""
    margin_l: int
    title_top: int
    title_height: int
    content_top: int
    content_width: int
    content_height: int
    section_marker_top: int


def _rect_from_ph(ph: dict) -> Rect:
    return Rect(
        x_pct=float(ph["x_pct"]),
        y_pct=float(ph["y_pct"]),
        w_pct=float(ph["w_pct"]),
        h_pct=float(ph["h_pct"]),
    )


def _logo_rect(decorative: list[dict]) -> Rect | None:
    candidates = [
        s for s in decorative
        if s.get("kind") == "picture"
        and float(s.get("x_pct", 0)) > 55
        and float(s.get("y_pct", 0)) > 75
    ]
    if not candidates:
        return None
    s = max(candidates, key=lambda x: float(x.get("w_pct", 0)) * float(x.get("h_pct", 0)))
    return Rect(
        x_pct=float(s["x_pct"]),
        y_pct=float(s["y_pct"]),
        w_pct=float(s["w_pct"]),
        h_pct=float(s["h_pct"]),
    )


def zones_from_layout(layout: dict | None, blueprint_mode: bool = False) -> LayoutZones:
    if not layout:
        return LayoutZones()

    placeholders = layout.get("placeholders") or []
    decorative = layout.get("decorative_shapes") or []

    title = subtitle = body = presenter = None
    for ph in placeholders:
        ptype = (ph.get("type") or "").upper()
        r = _rect_from_ph(ph)
        if ptype == "TITLE":
            title = r
        elif ptype == "SUBTITLE":
            if subtitle is None:
                subtitle = r
            elif float(r.y_pct) > 80:
                presenter = r
            else:
                subtitle = r
        elif ptype in ("BODY", "OBJECT"):
            body = r

    if title and subtitle:
        title_bottom = float(title.y_pct) + float(title.h_pct)
        if float(subtitle.y_pct) <= title_bottom:
            subtitle = Rect(
                x_pct=subtitle.x_pct,
                y_pct=title_bottom + 1.5,
                w_pct=subtitle.w_pct,
                h_pct=subtitle.h_pct,
            )

    logo = _logo_rect(decorative)
    if blueprint_mode:
        max_right = 92.0
        if body:
            max_right = max(max_right, float(body.x_pct) + float(body.w_pct))
        right_decor = [
            s for s in decorative
            if s.get("kind") == "picture"
            and float(s.get("x_pct", 0)) >= 45.0
            and float(s.get("w_pct", 0)) >= 15.0
        ]
        if right_decor:
            max_right = min(max_right, 55.0)
    else:
        max_right = 78.0
        if logo:
            max_right = min(max_right, float(logo.x_pct) - 2.0)

    return LayoutZones(
        title=title,
        subtitle=subtitle,
        body=body,
        presenter=presenter,
        logo=logo,
        max_text_right_pct=max_right,
        max_text_bottom_pct=88.0 if logo else 92.0,
    )


def typography_for_template(
    template_id: str | None,
    template_yaml_path: Path | None = None,
) -> TypographyScale:
    """Load typography scale from template.yaml if available."""
    defaults = TypographyScale()
    if template_yaml_path and template_yaml_path.exists():
        import yaml
        with template_yaml_path.open() as f:
            data = yaml.safe_load(f) or {}
        typo = data.get("theme", {}).get("typography", {})
        if typo:
            for field_name in defaults.__dataclass_fields__:
                if field_name in typo:
                    setattr(defaults, field_name, int(typo[field_name]))
    return defaults


@dataclass
class SlideRenderContext:
    slide_w: int
    slide_h: int
    zones: LayoutZones
    typography: TypographyScale
    layout_name: str | None = None
    dark_bg: bool = False

    @classmethod
    def from_blueprints(
        cls,
        blueprints: dict,
        layout_name: str | None,
        slide_w: int,
        slide_h: int,
        template_id: str | None,
        template_yaml_path: Path | None = None,
    ) -> SlideRenderContext:
        layout = (blueprints.get("layouts") or {}).get(layout_name or "")
        return cls(
            slide_w=slide_w,
            slide_h=slide_h,
            zones=zones_from_layout(layout, blueprint_mode=True),
            typography=typography_for_template(template_id, template_yaml_path),
            layout_name=layout_name,
        )

    def section_marker_rect(self) -> Rect:
        return self.zones.section_marker_rect()

    def metrics(self, default_margin_l: int, default_content_top: int, default_content_w: int) -> LayoutMetrics:
        """Stacked layout: marker → title → content band (no overlapping boxes)."""
        z = self.zones
        W, H = self.slide_w, self.slide_h

        margin_l = int(
            (z.title.x_pct if z.title else (z.body.x_pct if z.body else 6.5)) / 100 * W
        )
        title_top = int((z.title.y_pct if z.title else 9.0) / 100 * H)
        title_height = int((z.title.h_pct if z.title else 9.5) / 100 * H)

        body_top = int((z.body.y_pct if z.body else 22.0) / 100 * H)
        content_top = max(body_top, title_top + title_height + int(0.06 * H))

        x_pct = z.body.x_pct if z.body else (z.title.x_pct if z.title else 6.5)
        w_pct = z.body.w_pct if z.body else 75.0
        max_w_pct = z.max_text_right_pct - x_pct
        content_width = int(min(w_pct, max_w_pct) / 100 * W)

        bottom = int(z.max_text_bottom_pct / 100 * H)
        content_height = max(bottom - content_top, int(0.35 * H))

        sm_rect = z.section_marker_rect()
        section_marker_top = sm_rect.top(H)

        return LayoutMetrics(
            margin_l=margin_l or default_margin_l,
            title_top=title_top,
            title_height=title_height,
            content_top=content_top or default_content_top,
            content_width=content_width or default_content_w,
            content_height=content_height,
            section_marker_top=section_marker_top,
        )
