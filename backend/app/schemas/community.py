"""Pydantic schemas for Trust-Weighted Community Intelligence (Phase 9)."""

from datetime import datetime
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, field_validator
from ..core.security import sanitize_user_text

class CommunityReportCreate(BaseModel):
    """Payload for submitting a new location-based safety observation."""

    category: str = Field(
        ...,
        description="Observation category from controlled list (e.g. POOR_LIGHTING, DESERTED_STRETCH, ACTIVE_POLICE_PRESENCE)",
    )
    description: str = Field(
        ...,
        min_length=10,
        max_length=1000,
        description="Detailed description of the observed condition (10-1000 characters)",
    )
    latitude: float = Field(
        ...,
        description="Observation latitude (Chennai bounds: 12.80 to 13.30)",
    )
    longitude: float = Field(
        ...,
        description="Observation longitude (Chennai bounds: 80.00 to 80.35)",
    )
    location_name: Optional[str] = Field(
        None,
        max_length=255,
        description="Human-readable landmark or address description",
    )
    observed_at: Optional[datetime] = Field(
        None,
        description="Timestamp when condition was observed. Defaults to current time if omitted.",
    )
    segment_code: Optional[str] = Field(
        None,
        max_length=64,
        description="Optional explicitly identified road segment code",
    )

    @field_validator("description", mode="after")
    @classmethod
    def sanitize_description(cls, v: str) -> str:
        cleaned = sanitize_user_text(v, max_length=1000)
        if not cleaned or len(cleaned) < 10:
            raise ValueError("Description must contain at least 10 non-script characters.")
        return cleaned

    @field_validator("location_name", mode="after")
    @classmethod
    def sanitize_location(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_user_text(v, max_length=255)

    @field_validator("latitude")
    @classmethod
    def validate_latitude(cls, v: float) -> float:
        if not (12.80 <= v <= 13.30):
            raise ValueError(f"Latitude {v} is outside the Chennai Metropolitan Area (12.80 - 13.30 N)")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_longitude(cls, v: float) -> float:
        if not (80.00 <= v <= 80.35):
            raise ValueError(f"Longitude {v} is outside the Chennai Metropolitan Area (80.00 - 80.35 E)")
        return v


class ReportInteractionCreate(BaseModel):
    """User response to an existing report (confirm, dispute, flag)."""

    interaction_type: Optional[Literal["CONFIRM", "DISPUTE", "FLAG"]] = Field(
        None,
        description="Interaction type: CONFIRM (corroborate), DISPUTE (contest accuracy), or FLAG (moderate)",
    )
    comments: Optional[str] = Field(
        None,
        max_length=500,
        description="Optional contextual comment explaining the confirmation or dispute",
    )

    @field_validator("comments", mode="after")
    @classmethod
    def sanitize_comments(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_user_text(v, max_length=500)


class ReportModerationAction(BaseModel):
    """Moderation action performed by authorized platform reviewer."""

    status: Literal["VERIFIED", "REJECTED", "UNDER_REVIEW"] = Field(
        ...,
        description="Target moderation status",
    )
    notes: Optional[str] = Field(
        None,
        max_length=500,
        description="Administrative moderation notes or field audit reference",
    )

    @field_validator("notes", mode="after")
    @classmethod
    def sanitize_notes(cls, v: Optional[str]) -> Optional[str]:
        return sanitize_user_text(v, max_length=500)


class CommunityReportResponse(BaseModel):
    """Publicly safe representation of a community observation (never exposes private reporter data)."""

    report_id: str
    segment_code: Optional[str] = None
    category: str
    category_label: str
    title: Optional[str] = None
    description: str
    location_name: Optional[str] = None
    latitude: float
    longitude: float
    reporter_display: str = "Community Contributor"
    reporter_reliability: float
    confirmation_count: int
    dispute_count: int
    flag_count: int
    verification_status: str
    status_notes: Optional[str] = None
    observed_at: datetime
    reported_at: datetime
    expires_at: Optional[datetime] = None
    effective_trust_weight: float
    safety_score_impact: float
    is_active: bool
    is_synthetic: bool
    how_this_contributes: Dict[str, Any]

    class Config:
        from_attributes = True


class CommunityReportsListResponse(BaseModel):
    """Paginated list of community reports."""

    items: List[CommunityReportResponse]
    total: int
    limit: int
    offset: int


class CategoryInfo(BaseModel):
    """Controlled category metadata."""

    category: str
    label: str
    base_impact: float
    half_life_hours: float
    validity_hours: float
    evidence_category: str
