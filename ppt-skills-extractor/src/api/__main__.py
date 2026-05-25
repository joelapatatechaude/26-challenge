"""Run the FastAPI agent service with uvicorn.

Usage (from project root):
    PYTHONPATH=src python -m api
"""

import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "api.app:app",
        host="0.0.0.0",
        port=8080,
        log_level="info",
    )
