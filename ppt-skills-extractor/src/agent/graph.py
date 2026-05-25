"""LangGraph StateGraph for Field Enablement PPT generation."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import sys
import time
from pathlib import Path
from urllib.parse import quote
from typing import Annotated, Any, Sequence

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph
from langgraph.graph.message import add_messages
from langgraph.types import Send
from typing_extensions import TypedDict

_SRC = Path(__file__).resolve().parent.parent
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from agent.deck_types import (  # noqa: E402
    DEFAULT_TEMPLATE_ID,
    default_outline,
    get_deck_type,
)
from agent.llm import create_llm  # noqa: E402
from agent.prompts import (  # noqa: E402
    CONTENT_WRITER_PROMPT,
    GEO_CONTEXT_PROMPT,
    OUTLINE_PLANNER_PROMPT,
    VALIDATOR_PROMPT,
    WEB_RESEARCH_PROMPT,
)
from agent.tools import (  # noqa: E402
    build_presentation,
    get_element_schema,
    get_narrative_guide,
    list_elements,
    read_docx,
    read_pdf,
    read_pptx,
    search_images,
    validate_slide_spec,
)


def _merge_dicts(left: dict | None, right: dict | None) -> dict:
    merged = dict(left or {})
    for key, value in (right or {}).items():
        if key in merged and isinstance(merged[key], dict) and isinstance(value, dict):
            merged[key] = {**merged[key], **value}
        else:
            merged[key] = value
    return merged


def _append_lists(left: list | None, right: list | None) -> list:
    return (left or []) + (right or [])


class DeckState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    topic: str
    deck_type: str
    template_id: str
    customer: str
    geo: str
    language: str
    include_web_research: bool
    source_documents: list[str]
    research_context: Annotated[dict, _merge_dicts]
    outline: list[dict]
    slide_specs: list[dict]
    deck_path: str
    validation_count: int
    validation_feedback: str
    progress_events: Annotated[list[dict], _append_lists]


def _message_content(content: Any) -> str:
    if isinstance(content, list):
        return " ".join(
            part.get("text", "")
            for part in content
            if isinstance(part, dict) and part.get("type") == "text"
        )
    return str(content or "")


def _parse_json_block(text: str) -> Any:
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, re.IGNORECASE)
    if fence:
        text = fence.group(1).strip()
    return json.loads(text)


def _slugify(text: str, max_len: int = 40) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug[:max_len] or "deck"


log = logging.getLogger("ppt.agent")

_PLANNING_USE_LLM = os.environ.get("PLANNING_USE_LLM", "").lower() in ("1", "true", "yes")
_PLANNING_LLM_TIMEOUT_S = float(os.environ.get("PLANNING_LLM_TIMEOUT", "45"))


def _doc_snippets(content: str, max_snippets: int = 12) -> list[str]:
    """Pull short labels from uploaded PPTX/PDF text for outline purposes."""
    if not content or content.strip().startswith("["):
        return []
    snippets: list[str] = []
    blocks = re.split(r"---\s*Slide\s+\d+", content, flags=re.IGNORECASE)
    for block in blocks:
        lines = [ln.strip() for ln in block.splitlines() if ln.strip()]
        if not lines:
            continue
        headline = lines[0][:160]
        if headline and headline not in snippets:
            snippets.append(headline)
        if len(snippets) >= max_snippets:
            break
    if not snippets:
        for para in re.split(r"\n\s*\n", content):
            line = para.strip().replace("\n", " ")[:160]
            if len(line) > 24:
                snippets.append(line)
            if len(snippets) >= max_snippets:
                break
    return snippets


def _enrich_outline_from_documents(outline: list[dict], doc_content: str) -> list[dict]:
    """Map uploaded deck text onto content slide purposes (no LLM)."""
    snippets = _doc_snippets(doc_content)
    if not snippets:
        return outline
    skip = {"title-block", "agenda", "closing", "divider", "section-divider"}
    snippet_idx = 0
    enriched: list[dict] = []
    for entry in outline:
        e = dict(entry)
        element = e.get("element", "")
        if element in skip:
            enriched.append(e)
            continue
        if snippet_idx < len(snippets):
            hint = snippets[snippet_idx]
            snippet_idx += 1
            base = (e.get("purpose") or "").strip()
            e["purpose"] = f"{hint}" if not base else f"{base} · Source: {hint[:100]}"
            e["source_hint"] = hint[:200]
        enriched.append(e)
    return enriched


def _enrich_outline_from_context(
    outline: list[dict],
    *,
    topic: str,
    geo: str,
    customer: str,
    language: str,
) -> list[dict]:
    """Apply topic/geo to default outline without calling the LLM."""
    topic_short = (topic or "Presentation").strip()[:200]
    geo_label = geo or "Global"
    enriched: list[dict] = []
    for entry in outline:
        e = dict(entry)
        element = e.get("element", "")
        if element == "title-block":
            e["purpose"] = topic_short
            if customer:
                e["purpose"] = f"{topic_short} — {customer}"
        elif element == "closing":
            e["purpose"] = (
                f"Thank you · {geo_label}"
                if language == "en"
                else f"Abschluss · {geo_label}"
            )
        elif element == "agenda":
            e["purpose"] = f"Agenda for {topic_short[:100]}"
        elif not e.get("purpose"):
            e["purpose"] = f"Support the narrative: {topic_short[:80]}"
        enriched.append(e)
    return enriched


async def _emit(config: RunnableConfig | None, event: str, data: dict) -> None:
    queue = (config or {}).get("configurable", {}).get("event_queue")
    if queue is not None:
        await queue.put({"event": event, "data": json.dumps(data)})


async def _progress(
    config: RunnableConfig | None,
    step: str,
    message: str,
    *,
    detail: str = "",
    level: str = "info",
) -> None:
    """Emit SSE progress + write server log line."""
    payload = {
        "status": message,
        "step": step,
        "level": level,
        "detail": detail,
        "ts": round(time.time(), 3),
    }
    log.info("[%s] %s%s", step, message, f" | {detail}" if detail else "")
    await _emit(config, "progress", payload)


def _make_workflow_nodes(llm):
    """Return node callables shared across full, planning, and building graphs."""

    async def skills_context_node(state: DeckState, config: RunnableConfig):
        template_id = state.get("template_id") or DEFAULT_TEMPLATE_ID
        deck_type = state.get("deck_type", "competitive")
        spec = get_deck_type(deck_type)

        await _progress(config, "skills_context", f"📚 Loading template skills ({template_id})...")

        elements = await asyncio.to_thread(
            list_elements.invoke, {"template_id": template_id}
        )
        guide = await asyncio.to_thread(
            get_narrative_guide.invoke, {"template_id": template_id}
        )
        await _progress(
            config,
            "skills_context",
            f"📚 Loaded {len(elements)} slide element types",
            detail=f"Deck: {spec.name}",
        )

        summary = (
            f"Template: {template_id}\n"
            f"Deck type: {spec.name} ({len(spec.elements)} slides)\n"
            f"Elements available: {len(elements)}\n"
            f"Narrative guide:\n{guide}"
        )

        return {
            "research_context": {
                "skills": {
                    "summary": summary,
                    "elements": elements,
                    "narrative_guide": guide,
                    "schemas": {},
                }
            },
        }

    async def geo_context_node(state: DeckState, config: RunnableConfig):
        geo = state.get("geo") or "Global"
        customer = state.get("customer") or ""

        await _progress(config, "geo_context", f"🌍 Setting region context for {geo}...")
        content = f"Region: {geo}. Customer: {customer or 'not specified'}."
        await _progress(config, "geo_context", f"🌍 Region context ready ({geo})")

        return {
            "research_context": {"geo": {"region": geo, "customer": customer, "content": content}},
        }

    async def geo_context_node_llm(state: DeckState, config: RunnableConfig):
        """Full LLM-based geo context — used in Phase 2 building graph."""
        geo = state.get("geo") or "Global"
        customer = state.get("customer") or ""
        topic = state.get("topic", "")

        await _progress(config, "geo_context", f"🌍 AI researching sovereignty rules for {geo}...")
        t0 = time.perf_counter()

        user_prompt = (
            f"Topic: {topic}\n"
            f"Geography: {geo}\n"
            f"Customer: {customer or '(not specified)'}\n\n"
            "Provide region-specific sovereignty context as concise bullet points "
            "suitable for slide content."
        )
        try:
            response = await llm.ainvoke(
                [SystemMessage(content=GEO_CONTEXT_PROMPT), HumanMessage(content=user_prompt)],
                config,
            )
            content = _message_content(response.content)
        except Exception as exc:
            err_str = str(exc)
            if "401" in err_str or "Authentication" in err_str or "token_not_found" in err_str:
                log.warning("geo_context LLM auth failed — using static fallback. Error: %s", err_str[:200])
                await _progress(
                    config,
                    "geo_context",
                    f"⚠️ LLM auth failed — using static geo context (check LLM_API_KEY)",
                    level="warn",
                )
                content = f"Region: {geo}. Customer: {customer or 'not specified'}. Standard sovereignty and compliance context."
            else:
                raise

        elapsed = round(time.perf_counter() - t0, 1)
        await _progress(
            config,
            "geo_context",
            f"🌍 Sovereignty research complete ({elapsed}s)",
            detail=f"{len(content)} chars",
        )

        return {
            "research_context": {"geo": {"region": geo, "customer": customer, "content": content}},
        }

    async def web_research_node(state: DeckState, config: RunnableConfig):
        if not state.get("include_web_research"):
            return {"research_context": {"web": {"content": "", "skipped": True}}}

        topic = state.get("topic", "")
        await _emit(config, "progress", {"status": "🔍 Searching web for competitive intelligence..."})

        user_prompt = (
            f"Topic: {topic}\n"
            f"Geography: {state.get('geo') or 'Global'}\n"
            f"Customer: {state.get('customer') or '(not specified)'}\n\n"
            "Summarise recent competitive intelligence relevant to this deck."
        )
        response = await llm.ainvoke(
            [SystemMessage(content=WEB_RESEARCH_PROMPT), HumanMessage(content=user_prompt)],
            config,
        )
        content = _message_content(response.content)

        return {
            "research_context": {"web": {"content": content}},
            "progress_events": [
                {"event": "progress", "data": json.dumps({"status": "🔍 Web research complete"})},
            ],
        }

    async def document_reader_node(state: DeckState, config: RunnableConfig):
        docs = state.get("source_documents") or []
        if not docs:
            await _progress(config, "document_reader", "📄 No source documents — skipping")
            return {"research_context": {"documents": {"content": "", "skipped": True}}}

        await _progress(
            config,
            "document_reader",
            f"📄 Extracting text from {len(docs)} file(s)...",
        )

        texts = []
        for i, doc_path in enumerate(docs, start=1):
            name = Path(doc_path).name
            ext = Path(doc_path).suffix.lower()
            await _progress(
                config,
                "document_reader",
                f"📄 Reading file {i}/{len(docs)}: {name}",
                detail=ext or "unknown",
            )
            if ext == ".pdf":
                text = await asyncio.to_thread(read_pdf.invoke, {"file_path": doc_path})
            elif ext == ".docx":
                text = await asyncio.to_thread(read_docx.invoke, {"file_path": doc_path})
            elif ext == ".pptx":
                text = await asyncio.to_thread(read_pptx.invoke, {"file_path": doc_path})
            else:
                text = f"[Unsupported file type: {ext}]"
            texts.append(f"=== {name} ===\n{text}")
            await _progress(
                config,
                "document_reader",
                f"📄 Done: {name}",
                detail=f"{len(text):,} characters",
            )

        combined = "\n\n".join(texts)[:6000]
        await _progress(
            config,
            "document_reader",
            f"📄 Document text ready ({len(combined):,} chars for planner)",
        )
        return {
            "research_context": {"documents": {"content": combined, "file_count": len(docs)}},
        }

    async def outline_planner(state: DeckState, config: RunnableConfig):
        deck_type = state.get("deck_type", "competitive")
        spec = get_deck_type(deck_type)
        research = state.get("research_context", {})
        base_outline = default_outline(deck_type)
        geo_info = research.get("geo", {})
        geo = geo_info.get("region") or state.get("geo") or "Global"
        customer = geo_info.get("customer") or state.get("customer") or ""
        language = state.get("language") or "en"

        await _progress(
            config,
            "outline_planner",
            f"📋 Building {spec.name} outline ({len(base_outline)} slides)...",
        )

        outline = _enrich_outline_from_context(
            base_outline,
            topic=state.get("topic", ""),
            geo=geo,
            customer=customer,
            language=language,
        )
        docs = research.get("documents", {})
        doc_content = (docs.get("content") or "") if docs else ""
        if doc_content and not docs.get("skipped"):
            outline = _enrich_outline_from_documents(outline, doc_content)
            await _progress(
                config,
                "outline_planner",
                "📋 Mapped outline to uploaded document content",
                detail=f"{len(_doc_snippets(doc_content))} source snippets",
            )

        if _PLANNING_USE_LLM:
            docs = research.get("documents", {})
            doc_summary = ""
            if docs and docs.get("content"):
                doc_summary = f"\nSource document excerpt:\n{docs['content'][:3000]}\n"
            geo_line = f"Geography: {geo}"
            if customer:
                geo_line += f" | Customer: {customer}"
            user_prompt = (
                f"Topic: {state.get('topic')}\n"
                f"Deck type: {deck_type} ({spec.slide_count_min}-{spec.slide_count_max} slides)\n"
                f"Language: {language}\n"
                f"{geo_line}\n\n"
                f"Base outline:\n{json.dumps(outline, indent=2)}\n"
                f"{doc_summary}\n"
                "Return the final outline as a JSON array. Add a short 'purpose' per slide. "
                "Keep elements and order as-is."
            )
            await _progress(
                config,
                "outline_planner",
                "🤖 AI refining outline...",
                detail=f"Timeout {_PLANNING_LLM_TIMEOUT_S:.0f}s",
            )
            t0 = time.perf_counter()
            try:
                response = await asyncio.wait_for(
                    llm.ainvoke(
                        [
                            SystemMessage(content=OUTLINE_PLANNER_PROMPT),
                            HumanMessage(content=user_prompt),
                        ],
                        config,
                    ),
                    timeout=_PLANNING_LLM_TIMEOUT_S,
                )
                elapsed = round(time.perf_counter() - t0, 1)
                parsed = _parse_json_block(_message_content(response.content))
                if isinstance(parsed, list) and len(parsed) > 0:
                    outline = parsed
                    await _progress(
                        config,
                        "outline_planner",
                        f"📋 Outline ready — {len(outline)} slides ({elapsed}s, AI)",
                    )
                else:
                    raise ValueError("outline must be a non-empty list")
            except asyncio.TimeoutError:
                log.warning("outline_planner LLM timed out after %ss", _PLANNING_LLM_TIMEOUT_S)
                await _progress(
                    config,
                    "outline_planner",
                    f"📋 Outline ready — {len(outline)} slides (LLM timed out, using template)",
                    level="warn",
                )
            except Exception as exc:
                log.warning("outline_planner LLM failed: %s", exc)
                await _progress(
                    config,
                    "outline_planner",
                    f"📋 Outline ready — {len(outline)} slides (LLM failed, using template)",
                    detail=str(exc)[:120],
                    level="warn",
                )
        else:
            await _progress(
                config,
                "outline_planner",
                f"📋 Outline ready — {len(outline)} slides",
                detail="Instant plan (set PLANNING_USE_LLM=true to refine with AI)",
            )

        return {"outline": outline}

    async def content_writer(state: DeckState, config: RunnableConfig):
        template_id = state.get("template_id") or DEFAULT_TEMPLATE_ID
        outline = state.get("outline") or default_outline(state.get("deck_type", "competitive"))
        research = state.get("research_context", {})
        feedback = state.get("validation_feedback") or ""
        language = state.get("language") or "en"
        total = len(outline)

        research_text = json.dumps(research, indent=2, default=str)[:10000]
        slide_specs: list[dict] = []
        progress_events: list[dict] = []

        await _progress(
            config,
            "content_writer",
            f"✍️ Writing content for {total} slides...",
            detail=f"Template: {template_id} · Language: {language}",
        )

        for idx, entry in enumerate(outline, start=1):
            element = entry.get("element", "title-block")
            await _progress(
                config,
                "content_writer",
                f"✍️ Slide {idx}/{total}: {element.replace('-', ' ')}",
                detail=(entry.get("purpose") or "")[:80],
            )

            schema = get_element_schema.invoke({"template_id": template_id, "element": element})
            schema_text = json.dumps(schema, indent=2, default=str)

            user_prompt = (
                f"Topic: {state.get('topic')}\n"
                f"Language: {language}\n"
                f"Slide {idx} of {total}\n"
                f"Outline entry: {json.dumps(entry)}\n"
                f"Element schema:\n{schema_text}\n\n"
                f"Research context:\n{research_text}\n"
            )
            if element in ("image-content", "title-block"):
                image_query = entry.get("purpose") or state.get("topic") or element
                available_images = search_images.invoke({"query": image_query, "top_k": 8})
                if available_images:
                    user_prompt += (
                        "\nAvailable stock images (use image_ref when appropriate):\n"
                        f"{json.dumps(available_images, indent=2, default=str)}\n"
                    )
            if feedback:
                user_prompt += f"\nFix these validation issues:\n{feedback}\n"

            try:
                response = await llm.ainvoke(
                    [SystemMessage(content=CONTENT_WRITER_PROMPT), HumanMessage(content=user_prompt)],
                    config,
                )
            except Exception as llm_exc:
                err_str = str(llm_exc)
                if "401" in err_str or "Authentication" in err_str or "token_not_found" in err_str:
                    raise RuntimeError(
                        "LLM API key is invalid or expired (401 Unauthorized). "
                        "Please update LLM_API_KEY and restart the server."
                    ) from llm_exc
                raise

            try:
                spec = _parse_json_block(_message_content(response.content))
                if not isinstance(spec, dict):
                    raise ValueError("slide spec must be an object")
                if "fields" in spec and isinstance(spec["fields"], dict):
                    nested = spec.pop("fields")
                    for k, v in nested.items():
                        if k not in spec:
                            spec[k] = v
                if "element" not in spec:
                    spec["element"] = element
                spec.pop("template_id", None)
                spec.pop("_validation_errors", None)
            except Exception:
                spec = {"element": element, "title": state.get("topic", "Presentation")}

            validation = validate_slide_spec.invoke({"template_id": template_id, "spec": spec})
            if not validation.get("valid"):
                spec["_validation_errors"] = validation.get("errors", [])

            slide_specs.append(spec)
            slide_event = {"slide_index": idx, **spec}
            progress_events.append(
                {"event": "slide_spec", "data": json.dumps(slide_event, default=str)}
            )
            await _emit(config, "slide_spec", slide_event)
            await _progress(config, "content_writer", f"✅ Slide {idx}/{total} complete")

        await _progress(config, "content_writer", f"✍️ All {total} slides written")
        return {
            "slide_specs": slide_specs,
            "validation_feedback": "",
            "progress_events": progress_events,
        }

    async def deck_builder_node(state: DeckState, config: RunnableConfig):
        template_id = state.get("template_id") or DEFAULT_TEMPLATE_ID
        slide_specs = state.get("slide_specs") or []
        deck_type = state.get("deck_type", "competitive")
        topic_slug = _slugify(state.get("topic", "deck"))
        output_name = f"{topic_slug}-{deck_type}.pptx"

        await _progress(
            config,
            "deck_builder",
            f"🔨 Assembling PPTX ({len(slide_specs)} slides)...",
            detail=f"Template: {template_id}",
        )

        clean_specs = []
        for s in slide_specs:
            cleaned = {k: v for k, v in s.items() if not k.startswith("_")}
            clean_specs.append(cleaned)

        result = build_presentation.invoke(
            {
                "template_id": template_id,
                "slides": clean_specs,
                "output_name": output_name,
            }
        )

        deck_path = ""
        result_str = str(result)
        # Always try to extract a .pptx path from the result — warnings don't mean failure
        match = re.search(r"((?:/[\w.\-]+)+\.pptx)", result_str)
        if match:
            deck_path = match.group(1)
        elif result_str.strip().endswith(".pptx"):
            deck_path = result_str.strip()
        elif "Built presentation:" in result_str or "Saved:" in result_str:
            # fallback: derive from expected output name
            deck_path = str(Path("decks") / output_name)

        # Only treat as failure if no path found AND result contains "Error"
        if not deck_path:
            if "Error" in result_str:
                await _progress(
                    config,
                    "deck_builder",
                    "⚠️ PPTX build failed",
                    detail=str(result)[:200],
                    level="error",
                )
                return {
                    "deck_path": "",
                    "messages": [AIMessage(content=str(result))],
                }
            # Last-resort: derive from expected name
            deck_path = str(Path("decks") / output_name)
            log.warning("[deck_builder] could not parse path from result, using %s", deck_path)

        path_obj = Path(deck_path)
        if not path_obj.is_absolute():
            path_obj = Path(__file__).resolve().parent.parent.parent / deck_path

        size_kb = round(path_obj.stat().st_size / 1024) if path_obj.exists() else 0
        download_url = f"/api/v1/download?path={quote(str(path_obj))}"
        preview_url = f"/office/preview/{quote(path_obj.name)}?embed=1"
        deck_ready = {
            "path": str(path_obj),
            "download_url": download_url,
            "preview_url": preview_url,
            "filename": path_obj.name,
            "slides": len(slide_specs),
            "size_kb": size_kb,
            "deck_type": deck_type,
            "template_id": template_id,
        }
        await _progress(
            config,
            "deck_builder",
            f"🎉 Deck saved ({size_kb} KB) — ready to download",
            detail=path_obj.name,
        )
        log.info("[deck_builder] deck_ready path=%s download_url=%s", path_obj, download_url)
        await _emit(config, "deck_ready", deck_ready)

        return {
            "deck_path": str(path_obj),
            "progress_events": [
                {"event": "deck_ready", "data": json.dumps(deck_ready)},
            ],
        }

    async def validator(state: DeckState, config: RunnableConfig):
        template_id = state.get("template_id") or DEFAULT_TEMPLATE_ID
        slide_specs = state.get("slide_specs") or []
        outline = state.get("outline") or []

        tool_results = []
        for i, spec in enumerate(slide_specs):
            result = validate_slide_spec.invoke({"template_id": template_id, "spec": spec})
            if not result.get("valid"):
                tool_results.append(f"Slide {i + 1}: {result.get('errors', [])}")

        specs_text = json.dumps(slide_specs, indent=2, default=str)[:15000]
        outline_text = json.dumps(outline, indent=2, default=str)

        validation_prompt = (
            f"{VALIDATOR_PROMPT}\n\n"
            f"Outline:\n{outline_text}\n\n"
            f"Slide specs:\n{specs_text}\n\n"
            f"Tool validation errors:\n{tool_results or 'None'}"
        )

        response = await llm.ainvoke([HumanMessage(content=validation_prompt)], config)
        content = _message_content(response.content).strip()

        update: dict[str, Any] = {
            "messages": [response],
            "validation_count": state.get("validation_count", 0) + 1,
        }
        if content.startswith("FIX_NEEDED"):
            update["validation_feedback"] = content
        return update

    def after_validator(state: DeckState):
        messages = state.get("messages") or []
        if not messages:
            return END
        last = messages[-1]
        content = _message_content(last.content).strip()
        if content.startswith("FIX_NEEDED") and state.get("validation_count", 0) < 2:
            return "content_writer"
        return END

    return {
        "skills_context_node": skills_context_node,
        "geo_context_node": geo_context_node,
        "geo_context_node_llm": geo_context_node_llm,
        "web_research_node": web_research_node,
        "document_reader_node": document_reader_node,
        "outline_planner": outline_planner,
        "content_writer": content_writer,
        "deck_builder_node": deck_builder_node,
        "validator": validator,
        "after_validator": after_validator,
    }


def create_graph(llm=None):
    """Create the full end-to-end LangGraph deck generation workflow."""
    llm = llm or create_llm()
    nodes = _make_workflow_nodes(llm)

    def fan_out(state: DeckState):
        return [
            Send("skills_context", state),
            Send("geo_context", state),
            Send("web_research", state),
        ]

    workflow = StateGraph(DeckState)
    workflow.add_node("skills_context", nodes["skills_context_node"])
    workflow.add_node("geo_context", nodes["geo_context_node"])
    workflow.add_node("web_research", nodes["web_research_node"])
    workflow.add_node("outline_planner", nodes["outline_planner"])
    workflow.add_node("content_writer", nodes["content_writer"])
    workflow.add_node("deck_builder", nodes["deck_builder_node"])
    workflow.add_node("validator", nodes["validator"])

    workflow.add_conditional_edges(
        START,
        fan_out,
        ["skills_context", "geo_context", "web_research"],
    )
    workflow.add_edge("skills_context", "outline_planner")
    workflow.add_edge("geo_context", "outline_planner")
    workflow.add_edge("web_research", "outline_planner")
    workflow.add_edge("outline_planner", "content_writer")
    workflow.add_edge("content_writer", "deck_builder")
    workflow.add_edge("deck_builder", "validator")
    workflow.add_conditional_edges("validator", nodes["after_validator"])

    return workflow.compile()


def create_planning_graph(llm=None):
    """Phase 1: research + document ingestion + outline planning."""
    llm = llm or create_llm()
    nodes = _make_workflow_nodes(llm)

    def fan_out(state: DeckState):
        return [
            Send("skills_context", state),
            Send("geo_context", state),
            Send("web_research", state),
            Send("document_reader", state),
        ]

    workflow = StateGraph(DeckState)
    workflow.add_node("skills_context", nodes["skills_context_node"])
    workflow.add_node("geo_context", nodes["geo_context_node"])
    workflow.add_node("web_research", nodes["web_research_node"])
    workflow.add_node("document_reader", nodes["document_reader_node"])
    workflow.add_node("outline_planner", nodes["outline_planner"])

    workflow.add_conditional_edges(
        START,
        fan_out,
        ["skills_context", "geo_context", "web_research", "document_reader"],
    )
    workflow.add_edge("skills_context", "outline_planner")
    workflow.add_edge("geo_context", "outline_planner")
    workflow.add_edge("web_research", "outline_planner")
    workflow.add_edge("document_reader", "outline_planner")
    workflow.add_edge("outline_planner", END)

    return workflow.compile()


def create_building_graph(llm=None):
    """Phase 2: geo research (LLM) + content writing + PPTX build.

    Skips the LLM validator so ``deck_ready`` streams as soon as the file is written
    (validator was delaying ``completed`` by another full LLM round-trip).
    """
    llm = llm or create_llm()
    nodes = _make_workflow_nodes(llm)

    workflow = StateGraph(DeckState)
    workflow.add_node("geo_context", nodes["geo_context_node_llm"])
    workflow.add_node("content_writer", nodes["content_writer"])
    workflow.add_node("deck_builder", nodes["deck_builder_node"])

    workflow.add_edge(START, "geo_context")
    workflow.add_edge("geo_context", "content_writer")
    workflow.add_edge("content_writer", "deck_builder")
    workflow.add_edge("deck_builder", END)

    return workflow.compile()


_REFINE_SYSTEM = """\
You are a presentation outline editor. The user will provide a current slide outline (as JSON) and a plain-language instruction.
Your job is to apply the instruction to the outline and return the updated outline as JSON.

Rules:
- Preserve the same JSON structure for each slide: {slide_index, element, purpose, section_marker}
- Re-index slide_index sequentially starting from 1 after any additions or removals
- Only change what the instruction asks; leave all other slides untouched
- Keep section_marker values intact (they drive PPTX layout selection)
- Reply ONLY with valid JSON: {"outline": [...], "message": "<1-sentence summary of change>"}
- No markdown fences, no extra text outside the JSON object
"""

_REFINE_TIMEOUT_S = 30


async def refine_outline_with_llm(
    *,
    outline: list[dict],
    instruction: str,
    topic: str = "",
    deck_type: str = "",
    geo: str = "",
) -> dict:
    """Apply a natural-language refinement instruction to an outline via LLM.

    Falls back to returning the original outline unchanged if the LLM call
    fails or times out, so the UI always gets a valid response.
    """
    llm = create_llm()

    user_prompt = (
        f"Topic: {topic}\n"
        f"Deck type: {deck_type}\n"
        f"Geo: {geo}\n\n"
        f"Current outline:\n{json.dumps(outline, indent=2)}\n\n"
        f"Instruction: {instruction}"
    )

    try:
        response = await asyncio.wait_for(
            llm.ainvoke([
                SystemMessage(content=_REFINE_SYSTEM),
                HumanMessage(content=user_prompt),
            ]),
            timeout=_REFINE_TIMEOUT_S,
        )
        raw = response.content.strip()
        # Strip markdown fences if the model adds them anyway
        if raw.startswith("```"):
            raw = re.sub(r"^```[a-z]*\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw.strip())
        result = json.loads(raw)
        updated = result.get("outline", outline)
        # Reindex
        for idx, slide in enumerate(updated, start=1):
            slide["slide_index"] = idx
        return {
            "outline": updated,
            "message": result.get("message", "Outline updated."),
        }
    except asyncio.TimeoutError:
        log.warning("refine_outline_with_llm timed out after %ss", _REFINE_TIMEOUT_S)
        return {"outline": outline, "message": "⚠️ Refinement timed out — original outline kept."}
    except Exception as exc:
        log.warning("refine_outline_with_llm failed: %s", exc)
        return {"outline": outline, "message": f"⚠️ Refinement failed ({exc}) — original outline kept."}


def build_initial_state(
    *,
    topic: str,
    deck_type: str = "competitive",
    template_id: str | None = None,
    customer: str = "",
    geo: str = "",
    language: str = "en",
    include_web_research: bool = False,
    source_documents: list[str] | None = None,
) -> DeckState:
    return DeckState(
        messages=[],
        topic=topic,
        deck_type=deck_type,
        template_id=template_id or DEFAULT_TEMPLATE_ID,
        customer=customer,
        geo=geo,
        language=language,
        include_web_research=include_web_research,
        source_documents=source_documents or [],
        research_context={},
        outline=[],
        slide_specs=[],
        deck_path="",
        validation_count=0,
        validation_feedback="",
        progress_events=[],
    )
