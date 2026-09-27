"""Main FastAPI entry point for Suraksha Path."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .config import settings
from .database import init_db
from .api.routes import api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("suraksha_path")

from .core.security import SecurityHeadersMiddleware, RequestSizeLimitMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown lifecycle events."""
    logger.info("Initializing Suraksha Path application and database...")
    init_db()
    logger.info("Database initialized successfully.")

    # Production readiness security checks
    if settings.ENVIRONMENT.lower() == "production":
        if settings.DEBUG:
            logger.warning("SECURITY WARNING: Application is configured in PRODUCTION mode with DEBUG=True! Set DEBUG=False for production.")
        if settings.MODERATOR_KEY == "suraksha-chennai-moderator-2026":
            logger.warning("SECURITY WARNING: Using default development MODERATOR_KEY in production! Please override with a cryptographically random secret.")

    # Automatically ingest Chennai road network segments if table is empty (Phase 7)
    try:
        from .database import SessionLocal
        from .models.domain import RoadSegment
        from .services.road_network_service import RoadNetworkService
        with SessionLocal() as db:
            segment_count = db.query(RoadSegment).count()
            if segment_count == 0:
                logger.info("Ingesting initial Chennai road-network segments from OpenStreetMap dataset...")
                svc = RoadNetworkService(db)
                summary = svc.ingest_road_network()
                logger.info(f"Ingested {summary.features_imported} road segments into Chennai database.")
            else:
                logger.info(f"Chennai road network active with {segment_count} segments.")

            # Automatically ingest Chennai safety evidence if table is empty (Phase 8)
            from .models.domain import EvidenceItem
            from .services.evidence_service import EvidenceService
            evd_count = db.query(EvidenceItem).count()
            if evd_count == 0:
                logger.info("Ingesting Chennai safety evidence baseline from curated dataset...")
                evd_path = os.path.join(os.path.dirname(__file__), "data", "chennai_safety_evidence.json")
                if os.path.exists(evd_path):
                    evd_svc = EvidenceService(db)
                    evd_summary = evd_svc.ingest_evidence_dataset(evd_path)
                    logger.info(f"Ingested {evd_summary['imported_count']} safety evidence items into database.")
            else:
                logger.info(f"Chennai safety evidence active with {evd_count} items.")

            # Automatically seed demo community reports if empty (Phase 9)
            from .services.community_service import CommunityService
            comm_svc = CommunityService(db)
            comm_svc.seed_demo_reports()
    except Exception as ex:
        logger.warning(f"Initial road-network/evidence/community ingestion check skipped: {ex}")

    yield
    logger.info("Shutting down Suraksha Path application...")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Evidence-based, context-aware safe route navigation API prototype.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Defensive Security Middlewares (Phase 17)
# 1. Content Security Policy, X-Content-Type-Options, Frame protection, Referrer Policy
app.add_middleware(SecurityHeadersMiddleware)

# 2. Request body size limit (1 MB max payload to prevent Denial of Service)
app.add_middleware(RequestSizeLimitMiddleware, max_bytes=1_048_576)

# 3. CORS Middleware setup with explicit allowed methods and headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Admin-Key", "X-User-Id", "X-Client-Version"],
)

# Mount all API endpoints under /api
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/", tags=["Root"])
def root():
    """Root entry point with service metadata."""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "online",
        "docs_url": "/docs",
        "health_url": f"{settings.API_V1_STR}/health",
        "disclaimer": settings.DISCLAIMER_TEXT,
    }

# Standardized error handling - sanitizes path and protects query parameters/secrets
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred. Please verify backend logs.",
            "path": request.url.path,
        },
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)
