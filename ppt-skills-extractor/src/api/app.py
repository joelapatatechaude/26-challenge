"""FastAPI service exposing the LangGraph presentation agent.

Endpoints
---------
GET  /health               liveness probe
GET  /ready                readiness probe
GET  /api/templates        list available templates
POST /api/chat             stream agent response (SSE)
GET  /api/decks/{filename} download a generated .pptx
"""

from __future__ import annotations

import os
import sys
import uuid
from pathlib import Path
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

# Ensure src/ is on sys.path
_SRC = Path(__file__).resolve().parent.parent
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from agent.agent import stream_response  # noqa: E402
from agent.tools import ALL_TOOLS, SKILLS_ROOT  # noqa: E402

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

_DECKS_DIR = Path(os.environ.get("DECKS_DIR", _SRC.parent / "decks"))
_DECKS_DIR.mkdir(parents=True, exist_ok=True)

_CORS_ORIGINS = [
    o.strip()
    for o in os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="PPT Skills Agent",
    description="LangGraph agent that generates Red Hat brand-compliant presentations.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Probes
# ---------------------------------------------------------------------------

@app.get("/health", tags=["ops"])
async def health() -> dict:
    return {"status": "ok"}


@app.get("/ready", tags=["ops"])
async def ready() -> dict:
    """Check that the skills-output index and at least one template are present."""
    index = SKILLS_ROOT / "index.yaml"
    if not index.exists():
        raise HTTPException(503, detail="skills-output/index.yaml not found")
    templates_dir = SKILLS_ROOT / "templates"
    if not templates_dir.exists() or not any(templates_dir.iterdir()):
        raise HTTPException(503, detail="No templates found in skills-output/templates/")
    return {"status": "ready"}


# ---------------------------------------------------------------------------
# Templates
# ---------------------------------------------------------------------------

@app.get("/api/templates", tags=["agent"])
async def get_templates() -> list[dict]:
    """Return available templates with brand summaries."""
    list_templates = next(t for t in ALL_TOOLS if t.name == "list_templates")
    return list_templates.invoke({})


# ---------------------------------------------------------------------------
# Chat (SSE)
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User's message")
    session_id: str | None = Field(
        default=None,
        description="Conversation session ID for multi-turn memory. Auto-generated if absent.",
    )
    template_id: str | None = Field(
        default=None,
        description="Pre-select a template. Agent will ask if omitted.",
    )
    language: str | None = Field(
        default=None,
        description=(
            "BCP-47 language tag for output (e.g. 'fr', 'ja', 'es'). "
            "Omit to let the agent auto-detect from the message."
        ),
    )


async def _sse_generator(
    message: str,
    session_id: str,
    template_id: str | None,
    language: str | None,
) -> AsyncIterator[str]:
    """Wrap agent token stream as SSE-formatted lines."""
    yield f"data: session_id={session_id}\n\n"
    try:
        async for chunk in stream_response(
            message=message,
            session_id=session_id,
            template_id=template_id,
            language=language,
        ):
            # Escape newlines inside a single SSE data field
            escaped = chunk.replace("\n", "\ndata: ")
            yield f"data: {escaped}\n\n"
    except Exception as exc:
        yield f"data: [error] {exc}\n\n"
    finally:
        yield "data: [done]\n\n"


@app.post("/api/chat", tags=["agent"])
async def chat(req: ChatRequest) -> StreamingResponse:
    """Stream the agent's response as Server-Sent Events.

    The client reads ``data:`` lines until it receives ``data: [done]``.
    The first line always carries the resolved ``session_id`` so the client
    can maintain multi-turn context.
    """
    session_id = req.session_id or str(uuid.uuid4())
    return StreamingResponse(
        _sse_generator(req.message, session_id, req.template_id, req.language),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ---------------------------------------------------------------------------
# Deck download
# ---------------------------------------------------------------------------

@app.get("/api/decks/{filename}", tags=["agent"])
async def download_deck(filename: str) -> FileResponse:
    """Serve a generated .pptx file by name."""
    if "/" in filename or "\\" in filename:
        raise HTTPException(400, detail="Invalid filename")
    path = _DECKS_DIR / filename
    if not path.exists():
        raise HTTPException(404, detail=f"Deck '{filename}' not found")
    return FileResponse(
        path,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        filename=filename,
    )
