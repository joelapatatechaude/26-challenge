"""FastAPI + SSE endpoint for Field Enablement PPT generation."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
import time
import uuid
from pathlib import Path
from typing import AsyncGenerator

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("ppt.api")

_HEARTBEAT_INTERVAL_S = 2.0

from fastapi import FastAPI, File, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

_SRC = Path(__file__).resolve().parent.parent
_PROJECT_ROOT = _SRC.parent
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from agent.deck_types import DEFAULT_TEMPLATE_ID, default_outline, list_deck_types  # noqa: E402
from agent.graph import (  # noqa: E402
    build_initial_state,
    create_building_graph,
    create_graph,
    create_planning_graph,
    refine_outline_with_llm,
)
from agent.llm import create_llm  # noqa: E402

_GEO_LANG: dict[str, str] = {
    "germany": "de", "deutschland": "de", "de": "de", "dach": "de",
    "france": "fr", "fr": "fr",
    "spain": "es", "españa": "es", "es": "es",
    "italy": "it", "italia": "it", "it": "it",
    "netherlands": "nl", "nederland": "nl", "nl": "nl",
    "japan": "ja", "jp": "ja", "ja": "ja",
    "brazil": "pt-br", "brasil": "pt-br", "br": "pt-br",
    "portugal": "pt", "pt": "pt",
}

_ALLOWED_UPLOAD_EXTENSIONS = {".pdf", ".docx", ".pptx"}
_UPLOAD_ROOT = Path("/tmp/ppt-uploads")
_DECKS_DIR = _PROJECT_ROOT / "decks"


def _infer_language_from_geo(geo: str) -> str | None:
    """Return ISO language code if geo clearly implies a non-English locale."""
    lower = geo.lower()
    for key, lang in _GEO_LANG.items():
        if key in lower:
            return lang
    return None


class JobStore:
    def __init__(self, ttl_seconds: int = 3600):
        self._jobs: dict[str, dict] = {}
        self._extractions: dict[str, dict] = {}  # keyed by upload_id
        self._ttl = ttl_seconds

    def create(self, state: dict) -> str:
        job_id = str(uuid.uuid4())
        self._jobs[job_id] = {"state": state, "created_at": time.time()}
        self._cleanup()
        return job_id

    def get(self, job_id: str) -> dict | None:
        entry = self._jobs.get(job_id)
        if entry and (time.time() - entry["created_at"]) < self._ttl:
            return entry["state"]
        return None

    def update(self, job_id: str, state: dict):
        if job_id in self._jobs:
            self._jobs[job_id]["state"] = state

    def delete(self, job_id: str):
        self._jobs.pop(job_id, None)

    def start_extraction(self, upload_id: str, template_id: str, task: asyncio.Task) -> None:
        self._extractions[upload_id] = {
            "template_id": template_id,
            "task": task,
            "status": "running",
            "created_at": time.time(),
        }

    def get_extraction(self, upload_id: str) -> dict | None:
        return self._extractions.get(upload_id)

    def set_extraction_done(self, upload_id: str, status: str = "done") -> None:
        entry = self._extractions.get(upload_id)
        if entry:
            entry["status"] = status
            entry["task"] = None  # release task reference

    def _cleanup(self):
        now = time.time()
        expired = [k for k, v in self._jobs.items() if now - v["created_at"] > self._ttl]
        for k in expired:
            del self._jobs[k]
        expired_ext = [k for k, v in self._extractions.items() if now - v["created_at"] > self._ttl]
        for k in expired_ext:
            del self._extractions[k]


_CORS_ORIGINS = [
    origin.strip()
    for origin in __import__("os").environ.get(
        "CORS_ALLOWED_ORIGINS", "http://localhost:3000"
    ).split(",")
    if origin.strip()
]

app = FastAPI(
    title="Field Enablement PPT Agent",
    description="LangGraph agent that generates branded Red Hat enablement decks with SSE streaming.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_graph = None
_planning_graph = None
_building_graph = None
_job_store = JobStore()


def get_graph():
    global _graph
    if _graph is None:
        _graph = create_graph(create_llm())
    return _graph


def get_planning_graph():
    global _planning_graph
    if _planning_graph is None:
        _planning_graph = create_planning_graph(create_llm())
    return _planning_graph


def get_building_graph():
    global _building_graph
    if _building_graph is None:
        _building_graph = create_building_graph(create_llm())
    return _building_graph


class GenerateRequest(BaseModel):
    topic: str = Field(..., min_length=1, description="Deck topic or vision")
    deck_type: str = Field(default="competitive", description="elevator|competitive|power_hour|questionnaire|assessment")
    customer: str = Field(default="", description="Optional customer name")
    geo: str = Field(default="", description="Geography / region for sovereignty context")
    language: str = Field(default="en", description="Output language code")
    template_id: str = Field(default=DEFAULT_TEMPLATE_ID, description="Skills template ID")
    include_web_research: bool = Field(default=False, description="Opt-in web research")
    source_documents: list[str] = Field(default_factory=list)


class ApproveRequest(BaseModel):
    outline: list[dict] = Field(..., description="Approved/edited outline")


def _resolve_language(req: GenerateRequest) -> str:
    language = req.language
    if language == "en" and req.geo:
        inferred = _infer_language_from_geo(req.geo)
        if inferred:
            language = inferred
    return language


def _build_request_state(req: GenerateRequest, language: str) -> dict:
    return build_initial_state(
        topic=req.topic.strip(),
        deck_type=req.deck_type,
        template_id=req.template_id or DEFAULT_TEMPLATE_ID,
        customer=req.customer,
        geo=req.geo,
        language=language,
        include_web_research=req.include_web_research,
        source_documents=req.source_documents,
    )


async def _run_extraction(pptx_path: str, upload_id: str, output_root: Path) -> str:
    """Run the template extraction pipeline in a thread (CPU-bound work)."""

    def _extract_sync() -> str:
        from classifier.template_detector import detect_template
        from extractor.layout_blueprint_extractor import save_blueprints
        from writer.knowledge_writer import generate_all

        pptx = Path(pptx_path)

        # Step 1: Detect template
        detect_template(pptx, interactive=False)
        template_id = f"upload-{upload_id[:8]}"

        # Step 2: Extract layout blueprints
        try:
            save_blueprints(str(pptx), output_root, template_id)
        except Exception as exc:
            print(f"  Blueprint extraction warning: {exc}")

        # Step 3: Extract assets
        try:
            from extractor.asset_extractor import extract_assets
            extract_assets(path=pptx, template_id=template_id, output_root=output_root)
        except Exception as exc:
            print(f"  Asset extraction warning: {exc}")

        # Step 4: Generate knowledge (element schemas, agent index)
        try:
            generate_all(output_root, template_id)
        except Exception as exc:
            print(f"  Knowledge generation warning: {exc}")

        return template_id

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _extract_sync)


async def _stream_graph_events(
    request: Request,
    graph,
    initial: dict,
    *,
    on_complete=None,
    phase_label: str = "generate",
) -> AsyncGenerator[dict, None]:
    event_queue: asyncio.Queue = asyncio.Queue()
    config = {"configurable": {"event_queue": event_queue}}
    started = time.time()
    last_heartbeat = started
    log.info("[%s] graph run started (deck_type=%s)", phase_label, initial.get("deck_type"))

    async def run_graph() -> None:
        try:
            result = await graph.ainvoke(initial, config)
            elapsed = round(time.time() - started, 1)
            log.info("[%s] graph completed in %ss", phase_label, elapsed)
            if on_complete is not None:
                await on_complete(result)
        except Exception as exc:
            log.exception("[%s] graph failed: %s", phase_label, exc)
            raise
        finally:
            await event_queue.put(None)

    task = asyncio.create_task(run_graph())

    try:
        while True:
            if await request.is_disconnected():
                log.warning("[%s] client disconnected", phase_label)
                task.cancel()
                break

            try:
                evt = await asyncio.wait_for(event_queue.get(), timeout=0.5)
            except asyncio.TimeoutError:
                now = time.time()
                if now - last_heartbeat >= _HEARTBEAT_INTERVAL_S:
                    elapsed = int(now - started)
                    last_heartbeat = now
                    yield {
                        "event": "heartbeat",
                        "data": json.dumps({
                            "status": f"⏳ Still working… ({elapsed}s)",
                            "elapsed_s": elapsed,
                            "phase": phase_label,
                        }),
                    }
                continue

            if evt is None:
                break
            ev_name = evt.get("event", "")
            if ev_name in ("deck_ready", "outline_ready", "completed"):
                log.info("[sse] event=%s data=%s", ev_name, (evt.get("data") or "")[:200])
            yield evt

        if not task.cancelled():
            await task
    except asyncio.CancelledError:
        task.cancel()
        raise


@app.get("/health", tags=["ops"])
async def health() -> dict:
    return {
        "status": "ok",
        "agent_build": "plan-review-2026-05-25",
        "phased_generate": True,
    }


@app.get("/api/v1/deck-types", tags=["discovery"])
async def deck_types() -> list[dict]:
    return list_deck_types()


@app.post("/api/v1/upload", tags=["files"])
async def upload_files(files: list[UploadFile] = File(...)):
    upload_id = str(uuid.uuid4())
    upload_dir = _UPLOAD_ROOT / upload_id
    upload_dir.mkdir(parents=True, exist_ok=True)

    saved_paths: list[str] = []
    pptx_path: str | None = None

    for upload in files:
        ext = Path(upload.filename or "").suffix.lower()
        if ext not in _ALLOWED_UPLOAD_EXTENSIONS:
            return JSONResponse(
                status_code=422,
                content={
                    "detail": f"Unsupported file type {ext!r}. Allowed: {sorted(_ALLOWED_UPLOAD_EXTENSIONS)}"
                },
            )

        safe_name = Path(upload.filename or f"upload{ext}").name
        dest = upload_dir / safe_name
        content = await upload.read()
        dest.write_bytes(content)
        saved_paths.append(str(dest))
        if ext == ".pptx":
            pptx_path = str(dest)

    response: dict = {"upload_id": upload_id, "paths": saved_paths}

    # Kick off background extraction for PPTX files
    if pptx_path:
        template_id = f"upload-{upload_id[:8]}"
        output_root = _PROJECT_ROOT / "skills-output"

        async def _bg_extract():
            log.info("[extract] started upload_id=%s template=%s", upload_id, template_id)
            try:
                await _run_extraction(pptx_path, upload_id, output_root)
                _job_store.set_extraction_done(upload_id, "done")
                log.info("[extract] complete upload_id=%s", upload_id)
            except Exception as exc:
                _job_store.set_extraction_done(upload_id, "failed")
                log.exception("[extract] failed upload_id=%s: %s", upload_id, exc)

        task = asyncio.create_task(_bg_extract())
        _job_store.start_extraction(upload_id, template_id, task)
        response["extraction_template_id"] = template_id
        response["extraction_status"] = "running"
        log.info("[upload] pptx saved, background extraction started: %s", template_id)

    log.info("[upload] upload_id=%s files=%s", upload_id, [Path(p).name for p in saved_paths])
    return response


@app.get("/api/v1/download", tags=["files"])
async def download(path: str):
    _DECKS_DIR.mkdir(parents=True, exist_ok=True)
    decks_root = _DECKS_DIR.resolve()

    requested = Path(path)
    if not requested.is_absolute():
        requested = decks_root / requested

    resolved = requested.resolve()
    if not str(resolved).startswith(str(decks_root)):
        return JSONResponse(status_code=403, content={"detail": "Access denied"})

    if not resolved.exists() or not resolved.is_file():
        return JSONResponse(status_code=404, content={"detail": "File not found"})

    return FileResponse(
        path=str(resolved),
        filename=resolved.name,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
    )


@app.post("/api/v1/generate", tags=["generate"])
async def generate(request: Request):
    body = await request.json()
    try:
        req = GenerateRequest(**body)
    except Exception as exc:
        return JSONResponse(status_code=422, content={"detail": str(exc)})

    if not req.topic.strip():
        return JSONResponse(
            status_code=422,
            content={"detail": "Field 'topic' is required and must be non-empty."},
        )

    language = _resolve_language(req)
    initial = _build_request_state(req, language)
    log.info(
        "[plan] topic=%r deck_type=%s geo=%s docs=%d lang=%s",
        req.topic[:60],
        req.deck_type,
        req.geo,
        len(req.source_documents),
        language,
    )

    async def event_generator() -> AsyncGenerator[dict, None]:
        graph = get_planning_graph()
        job_id_holder: dict[str, str] = {}

        yield {
            "event": "progress",
            "data": json.dumps({
                "status": f"🚀 Starting {req.deck_type} deck planning…",
                "step": "start",
                "level": "info",
            }),
        }

        final_state: dict = {}

        async def on_complete(result: dict) -> None:
            nonlocal final_state
            final_state = result
            job_id = _job_store.create(dict(result))
            job_id_holder["job_id"] = job_id

        try:
            async for evt in _stream_graph_events(
                request, graph, initial, on_complete=on_complete, phase_label="planning",
            ):
                yield evt

            outline = final_state.get("outline") or default_outline(req.deck_type)
            if not final_state.get("outline"):
                log.warning("[plan] graph returned no outline — using default for deck_type=%s", req.deck_type)
            job_id = job_id_holder.get("job_id", "")
            if not job_id and outline:
                job_id = _job_store.create({**initial, **final_state, "outline": outline})
                job_id_holder["job_id"] = job_id
            log.info("[plan] outline_ready job_id=%s slides=%d", job_id, len(outline))

            extraction_info = {}
            for doc_path in (req.source_documents or []):
                parts = Path(doc_path).parts
                for i, part in enumerate(parts):
                    if part == "ppt-uploads" and i + 1 < len(parts):
                        upload_id = parts[i + 1]
                        extraction = _job_store.get_extraction(upload_id)
                        if extraction:
                            extraction_info = {
                                "extraction_status": extraction.get("status", "unknown"),
                                "extraction_template_id": extraction.get("template_id"),
                                "upload_id": upload_id,
                            }
                        break

            research = final_state.get("research_context") or {}
            doc_meta = research.get("documents") or {}
            doc_names = [Path(p).name for p in (req.source_documents or [])]
            planning_context = {
                "deck_type": req.deck_type,
                "geo": req.geo,
                "slide_count": len(outline),
                "documents": doc_names,
                "document_chars": len(doc_meta.get("content") or ""),
                "used_llm": os.environ.get("PLANNING_USE_LLM", "").lower() in ("1", "true", "yes"),
            }

            yield {
                "event": "outline_ready",
                "data": json.dumps({
                    "job_id": job_id,
                    "outline": outline,
                    "message": "Outline ready — review and click Approve & Build to generate the PPTX",
                    "planning_context": planning_context,
                    **extraction_info,
                }),
            }
            yield {
                "event": "completed",
                "data": json.dumps({
                    "status": "outline_ready",
                    "job_id": job_id,
                    "message": "Planning complete (no PPTX yet — approve outline to build)",
                }),
            }
        except Exception as exc:
            yield {
                "event": "progress",
                "data": json.dumps({"status": f"⚠️ Error: {exc}"}),
            }
            yield {
                "event": "completed",
                "data": json.dumps({"status": "failed", "error": str(exc)}),
            }

    return EventSourceResponse(
        event_generator(),
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/api/v1/jobs/{job_id}/status", tags=["generate"])
async def job_status(job_id: str):
    # Check if this is an extraction ID (upload_id)
    extraction = _job_store.get_extraction(job_id)
    if extraction:
        status = extraction.get("status", "unknown")
        # Check if task is still running
        task = extraction.get("task")
        if task and not task.done():
            status = "running"
        elif task and task.done() and extraction.get("status") == "running":
            try:
                task.result()  # propagate exceptions
                status = "done"
            except Exception:
                status = "failed"
            _job_store.set_extraction_done(job_id, status)

        return {
            "job_id": job_id,
            "extraction_status": status,
            "extraction_template_id": extraction.get("template_id"),
        }

    # Check if this is a generation job ID
    stored = _job_store.get(job_id)
    if stored:
        outline = stored.get("outline") or []
        research = stored.get("research_context") or {}
        doc_meta = research.get("documents") or {}
        doc_names = [Path(p).name for p in (stored.get("source_documents") or [])]
        return {
            "job_id": job_id,
            "status": "outline_ready" if outline else "pending",
            "outline": outline,
            "topic": stored.get("topic"),
            "deck_type": stored.get("deck_type"),
            "geo": stored.get("geo"),
            "planning_context": {
                "deck_type": stored.get("deck_type"),
                "geo": stored.get("geo"),
                "slide_count": len(outline),
                "documents": doc_names,
                "document_chars": len(doc_meta.get("content") or ""),
            },
        }

    return JSONResponse(status_code=404, content={"detail": f"Job {job_id} not found"})


@app.post("/api/v1/generate/{job_id}/refine", tags=["generate"])
async def refine(job_id: str, request: Request):
    """Apply a natural-language refinement instruction to the current job outline.

    Body: {"instruction": "...", "outline": [...]}
    Returns: {"outline": [...], "message": "..."}
    """
    body = await request.json()
    instruction = (body.get("instruction") or "").strip()
    outline = body.get("outline") or []

    if not instruction:
        return JSONResponse(status_code=422, content={"detail": "instruction is required"})
    if not outline:
        return JSONResponse(status_code=422, content={"detail": "outline is required"})

    stored = _job_store.get(job_id)
    if stored is None:
        return JSONResponse(status_code=404, content={"detail": f"Job {job_id} not found"})

    topic = stored.get("topic", "")
    deck_type = stored.get("deck_type", "competitive")
    geo = stored.get("geo", "")

    log.info("refine[%s]: instruction=%r", job_id, instruction[:120])
    result = await refine_outline_with_llm(
        outline=outline,
        instruction=instruction,
        topic=topic,
        deck_type=deck_type,
        geo=geo,
    )

    # Persist the updated outline back so /approve sees the latest version
    _job_store.update(job_id, {**stored, "outline": result["outline"]})

    return JSONResponse(content=result)


@app.post("/api/v1/generate/{job_id}/approve", tags=["generate"])
async def approve(job_id: str, request: Request):
    body = await request.json()
    try:
        req = ApproveRequest(**body)
    except Exception as exc:
        return JSONResponse(status_code=422, content={"detail": str(exc)})

    stored = _job_store.get(job_id)
    if stored is None:
        return JSONResponse(status_code=404, content={"detail": f"Job {job_id} not found or expired"})

    state = dict(stored)
    state["outline"] = req.outline
    state["slide_specs"] = []
    state["deck_path"] = ""
    state["validation_count"] = 0
    state["validation_feedback"] = ""

    # Check if there's a background extraction to await
    # Look for upload_id in source_documents paths
    extracted_template_id = None
    extraction = None
    for doc_path in (state.get("source_documents") or []):
        parts = Path(doc_path).parts
        # paths are like /tmp/ppt-uploads/{upload_id}/filename.pptx
        for i, part in enumerate(parts):
            if part == "ppt-uploads" and i + 1 < len(parts):
                upload_id = parts[i + 1]
                extraction = _job_store.get_extraction(upload_id)
                if extraction:
                    task = extraction.get("task")
                    if task and not task.done():
                        try:
                            await asyncio.wait_for(task, timeout=120.0)
                        except asyncio.TimeoutError:
                            pass
                    if extraction.get("status") == "done" or (task and task.done()):
                        extracted_template_id = extraction.get("template_id")
                break

    if extracted_template_id:
        state["template_id"] = extracted_template_id
        log.info("[build] using extracted template %s", extracted_template_id)
    elif extraction:
        log.warning("[build] extraction not ready, using default template")

    _job_store.update(job_id, state)
    log.info("[build] job_id=%s slides=%d template=%s", job_id, len(req.outline), state.get("template_id"))

    async def event_generator() -> AsyncGenerator[dict, None]:
        graph = get_building_graph()

        template_msg = f" using {extracted_template_id} template" if extracted_template_id else ""
        yield {
            "event": "progress",
            "data": json.dumps({
                "status": f"🚀 Building deck from approved outline{template_msg}…",
                "step": "start",
                "level": "info",
            }),
        }

        try:
            async for evt in _stream_graph_events(
                request, graph, state, phase_label="building",
            ):
                yield evt

            yield {
                "event": "completed",
                "data": json.dumps({
                    "status": "completed",
                    "job_id": job_id,
                    "message": "Build stream finished",
                }),
            }
        except Exception as exc:
            yield {
                "event": "progress",
                "data": json.dumps({"status": f"⚠️ Error: {exc}"}),
            }
            yield {
                "event": "completed",
                "data": json.dumps({"status": "failed", "error": str(exc), "job_id": job_id}),
            }

    return EventSourceResponse(
        event_generator(),
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
