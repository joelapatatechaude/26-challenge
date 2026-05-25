"""File bridge between the ppt-skills-extractor deck output and ONLYOFFICE Document Server.

Endpoints
---------
GET  /                        Deck picker — lists all .pptx files in /app/decks/
GET  /editor/{filename}       Opens the ONLYOFFICE editor for a specific deck
GET  /decks/{filename}        Serves the .pptx file to ONLYOFFICE (document download URL)
POST /callback/{filename}     ONLYOFFICE save callback — writes edited file back to /app/decks/
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
import time
from pathlib import Path

import httpx
import jwt
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates

logger = logging.getLogger("bridge")
logging.basicConfig(level=logging.INFO)

# ── Config ────────────────────────────────────────────────────────────────────

DECKS_DIR = Path(os.getenv("DECKS_DIR", "/app/decks"))
ONLYOFFICE_URL = os.getenv("ONLYOFFICE_URL", "http://onlyoffice:80")
# URL the browser uses to load DocsAPI (must be reachable from the user's machine)
ONLYOFFICE_PUBLIC_URL = os.getenv("ONLYOFFICE_PUBLIC_URL", "http://localhost:8080")
JWT_SECRET = os.getenv("ONLYOFFICE_JWT_SECRET", "ppt-skills-dev-secret")
BRIDGE_PUBLIC_URL = os.getenv("BRIDGE_PUBLIC_URL", "http://localhost:3000")

app = FastAPI(title="PPT Skills — File Bridge", version="1.0.0")
templates = Jinja2Templates(directory=Path(__file__).parent / "templates")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_jwt(payload: dict) -> str:
    """Sign a payload with HS256 for ONLYOFFICE."""
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


def _deck_key(filename: str) -> str:
    """ONLYOFFICE document key — must change when file content changes."""
    path = DECKS_DIR / filename
    if path.exists():
        stat = path.stat()
        raw = f"{filename}-{stat.st_mtime}-{stat.st_size}"
    else:
        raw = f"{filename}-{time.time()}"
    return hashlib.md5(raw.encode()).hexdigest()[:20]


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def deck_picker(request: Request):
    """List all .pptx files available for editing."""
    decks = sorted(DECKS_DIR.glob("*.pptx"), key=lambda p: p.stat().st_mtime, reverse=True)
    items = [
        {
            "name": p.name,
            "size_kb": round(p.stat().st_size / 1024, 1),
            "editor_url": f"/editor/{p.name}",
        }
        for p in decks
    ]
    return templates.TemplateResponse("picker.html", {"request": request, "decks": items})


@app.get("/decks/{filename}")
async def serve_deck(filename: str):
    """Serve the raw .pptx to ONLYOFFICE for loading."""
    path = DECKS_DIR / filename
    if not path.exists() or path.suffix.lower() != ".pptx":
        raise HTTPException(status_code=404, detail=f"Deck not found: {filename}")
    return FileResponse(
        path,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        filename=filename,
    )


def _build_editor_config(filename: str, *, view_only: bool = False) -> dict:
    """Build ONLYOFFICE DocsAPI config for edit or view-only preview."""
    doc_key = _deck_key(filename)
    download_url = f"{BRIDGE_PUBLIC_URL}/decks/{filename}"

    config = {
        "document": {
            "fileType": "pptx",
            "key": doc_key,
            "title": filename,
            "url": download_url,
            "permissions": {
                "edit": not view_only,
                "download": True,
                "print": True,
                "review": False,
            },
        },
        "documentType": "slide",
        "editorConfig": {
            "mode": "view" if view_only else "edit",
            "lang": "en",
            "user": {
                "id": "ppt-skills-user",
                "name": "PPT Skills Viewer" if view_only else "PPT Skills Editor",
            },
            "customization": {
                "autosave": not view_only,
                "forcesave": not view_only,
                "logo": {"image": "", "url": BRIDGE_PUBLIC_URL},
                "hideRightMenu": view_only,
                "toolbarHideFileName": view_only,
                "compactHeader": view_only,
            },
        },
        "height": "100%",
        "width": "100%",
        "token": "",
    }

    if not view_only:
        config["editorConfig"]["callbackUrl"] = f"{BRIDGE_PUBLIC_URL}/callback/{filename}"

    config["token"] = _make_jwt(config)
    return config


@app.get("/preview/{filename}", response_class=HTMLResponse)
async def open_preview(request: Request, filename: str):
    """View-only ONLYOFFICE embed for in-app preview (no editing)."""
    path = DECKS_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Deck not found: {filename}")

    config = _build_editor_config(filename, view_only=True)
    return templates.TemplateResponse(
        "editor.html",
        {
            "request": request,
            "filename": filename,
            "onlyoffice_url": ONLYOFFICE_PUBLIC_URL,
            "config_json": json.dumps(config),
            "view_only": True,
            "embed": request.query_params.get("embed", "1") != "0",
        },
    )


@app.get("/editor/{filename}", response_class=HTMLResponse)
async def open_editor(request: Request, filename: str):
    """Render the ONLYOFFICE editor iframe for a deck."""
    path = DECKS_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Deck not found: {filename}")

    config = _build_editor_config(filename, view_only=False)

    return templates.TemplateResponse(
        "editor.html",
        {
            "request": request,
            "filename": filename,
            "onlyoffice_url": ONLYOFFICE_PUBLIC_URL,
            "config_json": json.dumps(config),
            "view_only": False,
            "embed": False,
        },
    )


@app.post("/callback/{filename}")
async def onlyoffice_callback(filename: str, request: Request):
    """
    ONLYOFFICE save callback.

    Status codes from ONLYOFFICE:
      0 — no document with the given key
      1 — document being edited
      2 — document ready to be saved (forcesave or close)
      3 — document saving error
      4 — document closed, no changes
      6 — document forcesaved
    """
    body = await request.json()
    logger.info("Callback for %s: status=%s", filename, body.get("status"))

    status = body.get("status")

    # Status 2 or 6 = ONLYOFFICE has a saved version ready at body["url"]
    if status in (2, 6):
        download_url = body.get("url")
        if not download_url:
            logger.error("Callback status %s but no url in body", status)
            return JSONResponse({"error": 1})

        dest = DECKS_DIR / filename
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(download_url)
                resp.raise_for_status()
            dest.write_bytes(resp.content)
            logger.info("Saved %s (%d bytes)", dest, len(resp.content))
        except Exception as exc:
            logger.exception("Failed to save %s: %s", filename, exc)
            return JSONResponse({"error": 1})

    # ONLYOFFICE expects {"error": 0} on success
    return JSONResponse({"error": 0})


@app.get("/health")
async def health():
    return {"status": "ok", "decks_dir": str(DECKS_DIR)}
