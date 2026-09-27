"""Application configuration settings for Suraksha Path."""

import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# Base directory for backend
BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent

# Load local environment files if present
load_dotenv(ROOT_DIR / ".env")
load_dotenv(BASE_DIR / ".env")

class Settings:
    """Suraksha Path application settings."""

    APP_NAME: str = os.getenv("APP_NAME", "Suraksha Path API")
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() in ("true", "1", "yes")

    # API Configuration
    API_V1_STR: str = "/api"
    HOST: str = os.getenv("BACKEND_HOST", "127.0.0.1")
    PORT: int = int(os.getenv("BACKEND_PORT", "8000"))

    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Database Configuration (SQLite default with data directory in project root)
    DATA_DIR: Path = ROOT_DIR / "data"
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    DEFAULT_DB_PATH = str(DATA_DIR / "suraksha_path.db").replace("\\", "/")
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")

    # Geospatial Default Context
    DEFAULT_CITY: str = os.getenv("DEFAULT_CITY", "Chennai, India")
    DEFAULT_CENTER_LAT: float = float(os.getenv("DEFAULT_CENTER_LAT", "13.0827"))
    DEFAULT_CENTER_LNG: float = float(os.getenv("DEFAULT_CENTER_LNG", "80.2707"))

    # Routing Engine Configuration (OSRM with OpenStreetMap Road Network)
    OSRM_ROUTER_URL: str = os.getenv("OSRM_ROUTER_URL", "https://router.project-osrm.org")
    ROUTING_TIMEOUT_SECONDS: float = float(os.getenv("ROUTING_TIMEOUT_SECONDS", "8.0"))
    ROUTING_PROVIDER_NAME: str = os.getenv("ROUTING_PROVIDER_NAME", "OpenStreetMap / OSRM Driving Engine")
    ENABLE_OFFLINE_CORRIDOR_FALLBACK: bool = os.getenv("ENABLE_OFFLINE_CORRIDOR_FALLBACK", "true").lower() in ("true", "1", "yes")

    # Suraksha Path Principle Flags
    ENABLE_SYNTHETIC_DATA_LABELING: bool = True
    DISCLAIMER_TEXT: str = (
        "Suraksha Path is an evidence-based, context-aware navigational advisory prototype. "
        "It does not guarantee personal safety and does not predict crime events."
    )

    # Community Moderation Configuration
    MODERATOR_KEY: str = os.getenv("MODERATOR_KEY", "suraksha-chennai-moderator-2026")

    # Phase 10: Safety-Time Trade-Off & Route Preference Engine Settings
    # Weights for Balanced route utility: U = w_safety * (S / 100) - w_time * (delta_t / t_min)
    BALANCED_SAFETY_WEIGHT: float = float(os.getenv("BALANCED_SAFETY_WEIGHT", "0.60"))
    BALANCED_TIME_WEIGHT: float = float(os.getenv("BALANCED_TIME_WEIGHT", "0.40"))

    # Practical Detour Constraints for SAFEST candidate:
    # A candidate route will not be selected as Safest without explanation if its travel duration
    # exceeds MAX_SAFEST_DETOUR_RATIO * fastest_duration or exceeds fastest_duration + MAX_SAFEST_DETOUR_MINUTES.
    MAX_SAFEST_DETOUR_RATIO: float = float(os.getenv("MAX_SAFEST_DETOUR_RATIO", "1.40"))  # Up to +40% travel time
    MAX_SAFEST_DETOUR_MINUTES: float = float(os.getenv("MAX_SAFEST_DETOUR_MINUTES", "20.0"))  # Up to +20 minutes max detour

    # Evidence coverage thresholds
    MIN_COVERAGE_FOR_HIGH_CONFIDENCE: float = float(os.getenv("MIN_COVERAGE_FOR_HIGH_CONFIDENCE", "0.40"))
    SPARSE_EVIDENCE_THRESHOLD: float = float(os.getenv("SPARSE_EVIDENCE_THRESHOLD", "0.25"))  # Below 25% is sparse
    SPARSE_EVIDENCE_PENALTY_FACTOR: float = float(os.getenv("SPARSE_EVIDENCE_PENALTY_FACTOR", "0.85"))

settings = Settings()
