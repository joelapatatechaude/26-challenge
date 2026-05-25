# 26-Challenge Monorepo

AI-powered presentation generation platform.

## Projects

### `ppt-skills-extractor/`
FastAPI + LangGraph backend that generates sales-enablement PowerPoint decks from natural language.  
Supports LLM-assisted planning, conversational outline refinement, and PPTX generation.

**Quick start:**
```bash
cd ppt-skills-extractor
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
PYTHONPATH=src LLM_API_KEY=<key> LLM_MODEL=<model> LLM_BASE_URL=<url> \
  uvicorn agent.api:app --host 0.0.0.0 --port 8200 --reload
```

### `Geo-Persistence/`
React + Vite frontend (sovereignty-demo) that provides the conversational UI for deck generation.  
Proxies API calls to `ppt-skills-extractor` on port 8200.

**Quick start:**
```bash
cd Geo-Persistence/artifacts/sovereignty-demo
npm install
PPT_AGENT_URL=http://localhost:8200 npm run dev
```

## Architecture

```
User Browser
    │
    ▼
Geo-Persistence (Vite :5173)
    │  /api/* proxy
    ▼
ppt-skills-extractor (FastAPI :8200)
    │
    ▼
Red Hat MaaS LiteLLM (LLM inference)
```
