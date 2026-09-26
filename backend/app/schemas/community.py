"""Schemas for trust-weighted community reports."""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field

class CommunityReportCreate(BaseModel):
    category: str = Field(..., description="POOR_LIGHTING, DESERTED_AREA, HARASSMENT, ROAD_HAZARD, POLICE_PATROL_ACTIVE")
    description: str = Field(..., min_length=5, max_length=1000)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    segment_code: Optional[str] = None
    reporter_id: Optional[str] = "anon_user"

class CommunityReportResponse(BaseModel):
    id: int
    category: str
    description: str
    latitude: float
    longitude: float
    segment_code: Optional[str] = None
    reporter_reliability: float
    confirmation_count: int
    verification_status: str
    reported_at: datetime
    effective_trust_weight: float = Field(..., description="Weight calculated from recency, confirmations, and reliability")
    is_synthetic: bool = True
