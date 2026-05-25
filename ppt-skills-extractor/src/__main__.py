"""CLI entry-point for the PPT Skills Extractor.

Usage:
    python -m ppt_skills_extractor extract --input path/to/file.pptx [options]
    python -m ppt_skills_extractor inspect --input path/to/file.pptx
    python -m ppt_skills_extractor index   --output path/to/skills/

Subcommands
-----------
extract
    Full pipeline: parse → detect template → classify elements & sections
    → annotate with LLM → write skill YAMLs.

    --input  FILE_OR_GLOB   One or more PPTX/ODP files to process.
    --output DIR            Root directory for skills output (default: ./skills-output).
    --model  MODEL_ID       LiteLLM model string (overrides $LLM_MODEL env var).
    --merge                 Preserve manually edited fields in existing YAML files.
    --no-llm                Skip LLM annotation; write structural YAMLs only.

inspect
    Parse and fingerprint a PPTX/ODP without running the full pipeline.
    Prints TemplateInstructions summary to stdout.

    --input  FILE           PPTX or ODP file to inspect.

index
    Regenerate skills/index.yaml from an existing skills/ directory.

    --output DIR            Root directory of the skills tree (default: ./skills-output).

tag-icons
    Build semantic icon_catalog.yaml from extracted icon PNGs + manifest.yaml.

    --output DIR            Root skills directory (default: ./skills-output).
    --model  MODEL_ID       Vision LLM model for tagging (optional; stubs if omitted).

skeletons
    Strip all content slides from a PPTX template and write a zero-slide
    skeleton.pptx plus a theme-manifest.yaml that maps human-readable color
    aliases (e.g. "black", "charcoal") to master indices and slide-variant
    background colors.

    --input  FILE           Path to the source PPTX template.
    --output DIR            Root skills directory (default: ./skills-output).
    --template-id  ID       Template ID (e.g. rh-standard).
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import sys
from pathlib import Path

# Ensure src/ is on the path when running as a module from the project root
_SRC = Path(__file__).parent
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _resolve_inputs(pattern: str) -> list[Path]:
    paths = []
    for p in glob.glob(pattern, recursive=True):
        pp = Path(p)
        if pp.suffix.lower() in {".pptx", ".odp"}:
            paths.append(pp)
    if not paths:
        # treat as a literal path
        pp = Path(pattern)
        if pp.exists() and pp.suffix.lower() in {".pptx", ".odp"}:
            paths.append(pp)
    return sorted(set(paths))


# ---------------------------------------------------------------------------
# Subcommand: inspect
# ---------------------------------------------------------------------------

def cmd_inspect(args: argparse.Namespace) -> None:
    from extractor.instruction_extractor import extract_instructions, summarise

    path = Path(args.input)
    if not path.exists():
        print(f"ERROR: file not found: {path}", file=sys.stderr)
        sys.exit(1)

    print(f"Inspecting: {path}")
    instructions = extract_instructions(path)
    print(summarise(instructions))


# ---------------------------------------------------------------------------
# Subcommand: index
# ---------------------------------------------------------------------------

def cmd_index(args: argparse.Namespace) -> None:
    from writer.skill_writer import update_index

    output_root = Path(args.output)
    dest = update_index(output_root)
    print(f"Index written to {dest}")


# ---------------------------------------------------------------------------
# Subcommand: tag-icons
# ---------------------------------------------------------------------------

def cmd_tag_icons(args: argparse.Namespace) -> None:
    from cataloger.icon_cataloger import catalog_icons

    output_root = Path(args.output)
    model: str | None = args.model or os.environ.get("LLM_MODEL")
    if model:
        print(f"Tagging icons with vision model: {model}")
    else:
        print("No vision model configured — generating stub catalog from manifest")

    try:
        dest = catalog_icons(output_root, model=model)
    except FileNotFoundError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)

    print(f"Icon catalog written to {dest}")


# ---------------------------------------------------------------------------
# Subcommand: assets
# ---------------------------------------------------------------------------

def cmd_assets(args: argparse.Namespace) -> None:
    """Extract and classify all assets from a PPTX template."""
    from extractor.asset_extractor import extract_assets, summarise_manifest
    from extractor.image_extractor import extract_stock_images_for_project
    from classifier.template_detector import detect_template

    pptx_path = Path(args.input)
    if not pptx_path.exists():
        print(f"ERROR: file not found: {pptx_path}", file=sys.stderr)
        sys.exit(1)

    output_root = Path(args.output)
    profile = detect_template(pptx_path, interactive=False)
    manifest = extract_assets(
        path=pptx_path,
        template_id=profile.template_id,
        output_root=output_root,
    )
    print(summarise_manifest(manifest))
    print(f"\nManifest written to {output_root / 'assets' / 'manifest.yaml'}")

    try:
        catalog_path = extract_stock_images_for_project(pptx_path, output_root)
        print(f"Image catalog written to {catalog_path}")
    except Exception as exc:
        print(f"  WARNING: stock image extraction failed: {exc}", file=sys.stderr)


# ---------------------------------------------------------------------------
# Subcommand: extract
# ---------------------------------------------------------------------------

def cmd_extract(args: argparse.Namespace) -> None:
    from parser.slide_parser import parse_pptx as parse_file
    from classifier.template_detector import detect_template
    from classifier.element_classifier import classify_presentation as classify_elements
    from extractor.instruction_extractor import extract_instructions
    from writer.skill_writer import write_all

    output_root = Path(args.output)
    model: str | None = args.model or os.environ.get("LLM_MODEL")
    merge: bool = args.merge
    no_llm: bool = args.no_llm

    # Expand glob patterns if the shell didn't do it (Windows / quoted args)
    input_paths: list[Path] = []
    for inp in args.input:
        resolved = _resolve_inputs(inp)
        if not resolved:
            print(f"WARNING: no PPTX/ODP files matched '{inp}'", file=sys.stderr)
        input_paths.extend(resolved)

    if not input_paths:
        print("ERROR: no input files found.", file=sys.stderr)
        sys.exit(1)

    for pptx_path in input_paths:
        print(f"\n{'='*60}")
        print(f"Processing: {pptx_path}")
        print('='*60)

        # --- Step 0: Template fingerprint + instruction extraction ---
        try:
            profile = detect_template(pptx_path, interactive=False)
        except Exception as exc:
            print(f"  ERROR detecting template: {exc}", file=sys.stderr)
            continue
        print(f"  Template: {profile.template_id!r} ({profile.name})")

        try:
            instructions = extract_instructions(pptx_path)
        except Exception as exc:
            print(f"  WARNING: instruction extraction failed: {exc}", file=sys.stderr)
            instructions = None

        # --- Step 1: Parse slides ---
        try:
            raw_slides = parse_file(pptx_path)
        except Exception as exc:
            print(f"  ERROR parsing slides: {exc}", file=sys.stderr)
            continue
        for slide in raw_slides:
            slide.template_id = profile.template_id
        print(f"  Parsed {len(raw_slides)} slides")

        # --- Step 2: Classify elements ---
        try:
            element_matches = classify_elements(raw_slides, profile)
        except Exception as exc:
            print(f"  ERROR classifying elements: {exc}", file=sys.stderr)
            element_matches = []
        print(f"  Found {len(element_matches)} element matches")

        # --- Step 3: Classify sections (requires LLM) ---
        deck_classification = None
        if not no_llm:
            try:
                from classifier.section_classifier import classify_deck
                deck_classification = classify_deck(raw_slides, element_matches, profile, model=model)
            except Exception as exc:
                print(f"  ERROR classifying sections: {exc}", file=sys.stderr)
        else:
            print("  Skipping section classification (--no-llm)")

        # --- Step 4: LLM annotation ---
        element_skills = []
        section_skills = []

        if not no_llm:
            try:
                from annotator.llm_annotator import annotate_elements, annotate_sections
                element_skills = annotate_elements(element_matches, profile, model=model)
                print(f"  Annotated {len(element_skills)} element skills")
            except Exception as exc:
                print(f"  WARNING: element annotation failed: {exc}", file=sys.stderr)

            if deck_classification:
                try:
                    from annotator.llm_annotator import annotate_sections
                    section_skills = annotate_sections(
                        [deck_classification], profile, model=model
                    )
                    print(f"  Annotated {len(section_skills)} section skills")
                except Exception as exc:
                    print(f"  WARNING: section annotation failed: {exc}", file=sys.stderr)
        else:
            print("  Skipping LLM annotation (--no-llm)")

        # --- Step 5: Extract assets ---
        try:
            from extractor.asset_extractor import extract_assets, summarise_manifest
            asset_manifest = extract_assets(
                path=pptx_path,
                template_id=profile.template_id,
                output_root=output_root,
            )
            logos   = sum(1 for a in asset_manifest.assets if a.kind.value == "logo")
            icons   = sum(1 for a in asset_manifest.assets if a.kind.value == "icon")
            photos  = sum(1 for a in asset_manifest.assets if a.kind.value == "photo")
            bgs     = sum(1 for a in asset_manifest.assets if a.kind.value == "background")
            charts  = len(asset_manifest.charts)
            print(f"  Assets: {len(asset_manifest.assets)} total  "
                  f"(logos={logos} icons={icons} photos={photos} "
                  f"backgrounds={bgs} charts={charts})")
        except Exception as exc:
            print(f"  WARNING: asset extraction failed: {exc}", file=sys.stderr)
            asset_manifest = None

        try:
            from extractor.image_extractor import extract_stock_images_for_project
            catalog_path = extract_stock_images_for_project(pptx_path, output_root)
            print(f"  Stock images catalog: {catalog_path}")
        except Exception as exc:
            print(f"  WARNING: stock image extraction failed: {exc}", file=sys.stderr)

        # --- Step 6: Write skills ---
        written = write_all(
            output_root=output_root,
            profile=profile,
            element_skills=element_skills,
            section_skills=section_skills,
            instructions=instructions,
            merge=merge,
        )
        print(f"  Written: template={written['template'][0]}")
        print(f"           elements={len(written['elements'])} files")
        print(f"           sections={len(written['sections'])} files")
        print(f"           index={written['index'][0]}")

    print("\nDone.")


# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="ppt-skills-extractor",
        description="Extract Red Hat presentation skills from PPTX/ODP files.",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # blueprint
    p_blueprint = sub.add_parser("blueprint", help="Extract visual layout blueprints (shapes, images, positions) from a PPTX")
    p_blueprint.add_argument("--input", "-i", required=True, help="Path to PPTX file")
    p_blueprint.add_argument("--output", "-o", default="./skills-output", help="Root skills directory (default: ./skills-output)")
    p_blueprint.add_argument("--template-id", "-t", required=True, help="Template ID (e.g. sales-enablement-2022)")

    # generate
    p_generate = sub.add_parser("generate", help="Build a PPTX from a deck-spec Python file")
    p_generate.add_argument("--spec", "-s", required=True, help="Path to deck spec .py file (must define SLIDES list)")
    p_generate.add_argument("--skills", default="./skills-output", help="Root skills directory containing assets/ (default: ./skills-output)")
    p_generate.add_argument("--template-id", "-t", default=None, help="Template ID for blueprint (overrides TEMPLATE_ID in spec file)")
    p_generate.add_argument("--output", "-o", required=True, help="Output .pptx path")

    # knowledge
    p_knowledge = sub.add_parser("knowledge", help="Generate SKILL.md + elements/*.yaml + sections/*.yaml from extracted template data")
    p_knowledge.add_argument("--output", "-o", default="./skills-output", help="Root skills directory (default: ./skills-output)")
    p_knowledge.add_argument("--template-id", "-t", required=True, help="Template ID to generate knowledge for (e.g. red-hat-standard)")

    # assets
    p_assets = sub.add_parser("assets", help="Extract logos, icons, photos, backgrounds and charts from a PPTX")
    p_assets.add_argument("--input", "-i", required=True, help="Path to PPTX or ODP file")
    p_assets.add_argument("--output", "-o", default="./skills-output", help="Root skills directory (default: ./skills-output)")

    # inspect
    p_inspect = sub.add_parser("inspect", help="Inspect template instructions in a PPTX file")
    p_inspect.add_argument("--input", "-i", required=True, help="Path to PPTX or ODP file")

    # index
    p_index = sub.add_parser("index", help="Regenerate skills/index.yaml from existing skills-output/")
    p_index.add_argument(
        "--output", "-o", default="./skills-output", help="Root skills directory (default: ./skills-output)"
    )

    # skeletons
    p_skeletons = sub.add_parser(
        "skeletons",
        help="Strip content slides from a PPTX template and write skeleton.pptx + theme-manifest.yaml",
    )
    p_skeletons.add_argument("--input", "-i", required=True, help="Path to PPTX template")
    p_skeletons.add_argument(
        "--output", "-o", default="./skills-output",
        help="Root skills directory (default: ./skills-output)",
    )
    p_skeletons.add_argument(
        "--template-id", "-t", required=True,
        help="Template ID (e.g. rh-standard)",
    )

    # tag-icons
    p_tag_icons = sub.add_parser(
        "tag-icons",
        help="Build semantic icon_catalog.yaml from extracted icons",
    )
    p_tag_icons.add_argument(
        "--output", "-o", default="./skills-output",
        help="Root skills directory (default: ./skills-output)",
    )
    p_tag_icons.add_argument(
        "--model", "-m", default=None,
        help="Vision LLM model string, e.g. openai/gpt-4o (optional; stubs if omitted)",
    )

    # extract
    p_extract = sub.add_parser("extract", help="Run full extraction pipeline")
    p_extract.add_argument(
        "--input", "-i", required=True, nargs="+",
        help="PPTX/ODP file(s) or glob pattern(s) to process"
    )
    p_extract.add_argument(
        "--output", "-o", default="./skills-output",
        help="Root directory for skills output (default: ./skills-output)"
    )
    p_extract.add_argument(
        "--model", "-m", default=None,
        help="LiteLLM model string, e.g. openai/gpt-4o (overrides $LLM_MODEL)"
    )
    p_extract.add_argument(
        "--merge", action="store_true",
        help="Preserve manually edited fields in existing YAML files"
    )
    p_extract.add_argument(
        "--no-llm", action="store_true",
        help="Skip LLM annotation; write structural YAMLs only"
    )

    return parser


def cmd_generate(args) -> None:
    """Generate a PPTX file from a Python deck-spec module."""
    import importlib.util, sys
    spec_path = Path(args.spec).resolve()
    spec_mod = importlib.util.spec_from_file_location("_deck_spec", spec_path)
    mod = importlib.util.module_from_spec(spec_mod)
    sys.path.insert(0, str(spec_path.parent))
    spec_mod.loader.exec_module(mod)
    slides = mod.SLIDES
    template_id = getattr(mod, "TEMPLATE_ID", None) or args.template_id

    from generator.deck_builder import build_deck
    skills_root = Path(args.skills)
    assets_root = skills_root / "assets"
    output_path = Path(args.output)
    print(f"Generating PPTX: {len(slides)} slides → {output_path}")
    build_deck(slides, assets_root, output_path,
               skills_root=skills_root, template_id=template_id)


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "skeletons":
        from extractor.skeleton_extractor import extract_skeletons
        manifest = extract_skeletons(
            pptx_path=Path(args.input),
            template_id=args.template_id,
            output_root=Path(args.output),
        )
        print(f"\nDone. Theme manifest: {manifest}")
    elif args.command == "generate":
        cmd_generate(args)
    elif args.command == "blueprint":
        from extractor.layout_blueprint_extractor import save_blueprints
        save_blueprints(args.input, Path(args.output), args.template_id)
    elif args.command == "knowledge":
        from writer.knowledge_writer import generate_all
        generate_all(Path(args.output), args.template_id)
    elif args.command == "assets":
        cmd_assets(args)
    elif args.command == "inspect":
        cmd_inspect(args)
    elif args.command == "index":
        cmd_index(args)
    elif args.command == "tag-icons":
        cmd_tag_icons(args)
    elif args.command == "extract":
        cmd_extract(args)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
