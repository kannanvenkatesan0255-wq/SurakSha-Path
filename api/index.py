"""Vercel standard serverless function entry point for Suraksha Path.

Allows Vercel to route /api/* directly to the FastAPI application when
deploying either via Vercel Services or traditional Serverless Functions.
"""

import sys
from pathlib import Path

# Ensure root and backend directory are in sys.path
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"

for path in [str(root_dir), str(backend_dir)]:
    if path not in sys.path:
        sys.path.insert(0, path)

from backend.app.main import app

__all__ = ["app"]
