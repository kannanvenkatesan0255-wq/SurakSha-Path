"""Schemas for health and system status endpoints."""

from typing import Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

def get_utc_now():
    return datetime.now(timezone.utc)

class DatabaseHealth(BaseModel):
    status: str = Field(..., description="Database status, e.g. 'connected' or 'disconnected'")
    database_type: str = Field(..., description="Underlying database dialect/type")
    connected: bool = Field(..., description="Whether connection is active")
    error: Optional[str] = Field(None, description="Error message if disconnected")

class SystemHealthResponse(BaseModel):
    status: str = Field("healthy", description="Overall system health status")
    app_name: str = Field(..., description="Application name")
    version: str = Field(..., description="Application version")
    timestamp: datetime = Field(default_factory=get_utc_now)
    environment: str = Field("development")
    city_context: str = Field("Chennai, India")
    database: DatabaseHealth
    active_services: Dict[str, str] = Field(default_factory=dict)
    disclaimer: str = Field(...)

