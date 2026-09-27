"""Pytest root configuration and path resolver for Suraksha Path backend."""

import os
import sys

backend_dir = os.path.abspath(os.path.dirname(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

root_dir = os.path.abspath(os.path.join(backend_dir, ".."))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)
