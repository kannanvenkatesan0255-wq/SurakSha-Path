"""Vercel Serverless and local entry point for Suraksha Path FastAPI backend."""

import os
import sys
from pathlib import Path

# Ensure the backend directory is in the Python search path so 'app.*' imports resolve cleanly
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Also ensure project root is in sys.path if running from repository root
root_dir = backend_dir.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

from app.main import app

__all__ = ["app"]

if __name__ == "__main__":
    import uvicorn
    from app.config import settings
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
