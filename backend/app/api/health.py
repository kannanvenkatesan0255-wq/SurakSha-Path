"""Health check and status API routes."""

from fastapi import APIRouter
from ..config import settings
from ..database import check_db_connection
from ..schemas.health import SystemHealthResponse, DatabaseHealth

router = APIRouter(tags=["Health"])

@router.get("/health", response_model=SystemHealthResponse)
def get_health() -> SystemHealthResponse:
    """
    Health check endpoint returning system status, database connectivity,
    and active domain service status.
    """
    db_check = check_db_connection()
    db_health = DatabaseHealth(
        status=db_check["status"],
        database_type=db_check["database_type"],
        connected=db_check["connected"],
        error=db_check["error"],
    )

    return SystemHealthResponse(
        status="healthy" if db_check["connected"] else "degraded",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.ENVIRONMENT,
        city_context=settings.DEFAULT_CITY,
        database=db_health,
        active_services={
            "routing_service": "ready",
            "risk_engine": "ready",
            "confidence_engine": "ready",
            "evidence_service": "ready",
            "community_service": "ready",
            "feedback_service": "ready",
        },
        disclaimer=settings.DISCLAIMER_TEXT,
    )
