# Contributing

Thanks for helping out. This guide covers everything you need to run the stack locally, make changes, and submit a pull request.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Local Dev Environment](#local-dev-environment)
- [Service Ports](#service-ports)
- [Optional Profiles](#optional-profiles)
- [Hot Reload](#hot-reload)
- [Common Commands](#common-commands)
- [Project Structure](#project-structure)
- [Submitting Changes](#submitting-changes)

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Podman or Docker | 4+ | `podman compose` or `docker compose` |
| Git | any | |

That's it — no Python or Node needed locally. Everything runs inside containers.

---

## Getting Started

```bash
# 1. Clone
git clone <repo-url>
cd 26-challenge

# 2. Create your local env file
cp .env.dev.example .env

# 3. Open .env and set your LLM credentials
#    At minimum: LLM_MODEL + one of OPENAI_API_KEY / ANTHROPIC_API_KEY
#    For a local model (Ollama/vLLM) set LLM_API_BASE instead
```

Once `.env` is ready:

```bash
podman compose -f dev-compose.yml up -d
```

That's it. The first run pulls images and installs dependencies — takes ~2 minutes. Subsequent starts are fast because deps are cached in named volumes.

---

## Local Dev Environment

All services use stock base images with your source tree bind-mounted. **No Docker image builds are required.**

| Container | Image | Source mount |
|-----------|-------|--------------|
| `26-ppt-agent` | `python:3.11-slim` | `./ppt-skills-extractor` → `/app` |
| `26-sovereignty-demo` | `node:22-slim` (amd64) | `./Geo-Persistence` → `/workspace` |

The Python backend starts with `uvicorn --reload`, so saving any `.py` file restarts the server automatically. The Vite frontend uses HMR — changes appear in the browser instantly without a page refresh.

### LLM Configuration

Set these in `.env`:

```dotenv
# Model — any LiteLLM-compatible identifier
LLM_MODEL=gpt-4o                        # OpenAI
# LLM_MODEL=anthropic/claude-opus-4-5  # Anthropic
# LLM_MODEL=openai/mistral-large       # vLLM or Ollama proxy

# Leave empty for OpenAI direct; set for local/proxy
LLM_API_BASE=

# Provider key — set whichever matches your model
OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=...
```

---

## Service Ports

| Port | Service | URL |
|------|---------|-----|
| `8200` | ppt-agent (FastAPI) | http://localhost:8200/health |
| `5173` | sovereignty-demo (Vite UI) | http://localhost:5173 |
| `5174` | mockup-sandbox | http://localhost:5174 `[profile: mockup]` |
| `3000` | file-bridge | http://localhost:3000 `[profile: office]` |
| `8081` | ONLYOFFICE | http://localhost:8081 `[profile: office]` |
| `3001` | geo-api (Express) | http://localhost:3001 `[profile: db]` |
| `5432` | PostgreSQL | localhost:5432 `[profile: db]` |

---

## Optional Profiles

The core stack (ppt-agent + sovereignty-demo) starts by default. Extra services are opt-in:

```bash
# PostgreSQL + Express API server
podman compose -f dev-compose.yml --profile db up -d

# ONLYOFFICE editor + file bridge
podman compose -f dev-compose.yml --profile office up -d

# Mockup sandbox Vite app
podman compose -f dev-compose.yml --profile mockup up -d

# Everything at once
COMPOSE_PROFILES=db,office,mockup podman compose -f dev-compose.yml up -d
```

---

## Hot Reload

| Service | Trigger | Behaviour |
|---------|---------|-----------|
| `ppt-agent` | Save any `.py` file under `ppt-skills-extractor/src/` | uvicorn reloads within ~1s |
| `sovereignty-demo` | Save any file under `Geo-Persistence/artifacts/sovereignty-demo/src/` | Vite HMR updates in the browser without a full refresh |

---

## Common Commands

```bash
# Status
podman compose -f dev-compose.yml ps

# Logs (follow)
podman compose -f dev-compose.yml logs -f ppt-agent
podman compose -f dev-compose.yml logs -f sovereignty-demo

# Restart a single service
podman compose -f dev-compose.yml restart ppt-agent

# Stop everything
podman compose -f dev-compose.yml down

# Stop and wipe all volumes (full clean slate)
podman compose -f dev-compose.yml down -v

# Smoke-test the agent API
curl http://localhost:8200/health
curl http://localhost:8200/api/templates
```

---

## Project Structure

```
26-challenge/
├── dev-compose.yml          ← local dev compose (this file)
├── .env.dev.example         ← env var template — copy to .env
├── ppt-skills-extractor/    ← FastAPI + LangGraph agent
│   ├── src/
│   │   ├── agent/           ← LangGraph ReAct agent + tools
│   │   ├── api/             ← FastAPI routes (/health, /api/chat, /api/templates)
│   │   ├── generator/       ← PPTX deck builders
│   │   └── ...
│   ├── skills/              ← Knowledge base (YAML + SKILL.md docs)
│   ├── templates/           ← Red Hat .pptx template files
│   └── requirements.txt
└── Geo-Persistence/         ← pnpm monorepo (Node.js)
    ├── artifacts/
    │   ├── sovereignty-demo/  ← Vite + React UI (port 5173)
    │   ├── mockup-sandbox/    ← Vite mockup preview (port 5174)
    │   └── api-server/        ← Express API server (port 3001)
    └── lib/
        ├── db/                ← Drizzle ORM schema + migrations
        └── api-client-react/  ← Generated React Query hooks
```

---

## Submitting Changes

1. Create a feature branch: `git checkout -b feat/my-change`
2. Make your changes — the dev compose reflects them immediately
3. Commit with a clear message describing the *why*, not just the *what*
4. Push and open a pull request against `main`

Please keep PRs focused — one logical change per PR makes review much easier.
