"""Pydantic schemas for safety evidence items, provenance, and data quality."""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, model_validator, ConfigDict


EvidenceCategory = Literal[
    "LIGHTING",
    "POLICE_PRESENCE",
    "ROAD_CHARACTERISTIC",
    "PEDESTRIAN_INFRASTRUCTURE",
    "COMMUNITY_REPORT",
    "INCIDENT",
    "ENVIRONMENTAL",
]

SourceType = Literal[
    "SOURCED_PUBLIC_DATA",
    "MUNICIPAL_AUDIT",
    "COMMUNITY_OBSERVATION",
    "THIRD_PARTY",
    "SYNTHETIC_BENCHMARK",
]

VerificationStatus = Literal[
    "VERIFIED",
    "CORROBORATED",
    "UNVERIFIED",
    "DISPUTED",
]


class EvidenceBase(BaseModel):
    category: EvidenceCategory
    source_type: SourceType
    source_name: str = Field(..., min_length=2, max_length=128)
    source_reference: Optional[str] = Field(None, max_length=255)
    factor_name: str = Field(..., min_length=3, max_length=128)
    impact_score: float = Field(0.0, ge=-10.0, le=10.0, description="Heuristic safety impact (-10 to +10)")
    confidence_weight: float = Field(0.8, ge=0.0, le=1.0, description="Evidence source reliability (0 to 1)")
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    segment_code: Optional[str] = Field(None, max_length=64)
    observed_at: Optional[datetime] = None
    details: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = Field(default_factory=dict)
    verification_status: VerificationStatus = "UNVERIFIED"
    is_synthetic: bool = False

    @model_validator(mode="after")
    def validate_spatial_bounds(self):
        # If one coordinate is given, both must be valid
        if (self.latitude is not None and self.longitude is None) or (self.latitude is None and self.longitude is not None):
            raise ValueError("Both latitude and longitude must be provided together.")
        return self


class EvidenceCreate(EvidenceBase):
    evidence_id: Optional[str] = Field(None, description="Optional custom ID; auto-generated if omitted")


class EvidenceResponse(BaseModel):
    id: int
    evidence_id: str
    segment_code: Optional[str] = None
    category: str
    source_type: str
    source_name: str
    source_reference: Optional[str] = None
    factor_name: str
    impact_score: float
    confidence_weight: float
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    observed_at: Optional[datetime] = None
    ingested_at: datetime
    freshness_days: Optional[float] = None
    is_stale: bool = False
    details: Optional[str] = None
    attributes: Dict[str, Any] = Field(default_factory=dict)
    verification_status: str
    is_synthetic: bool

    model_config = ConfigDict(from_attributes=True)


class EvidenceFilterParams(BaseModel):
    segment_code: Optional[str] = None
    category: Optional[str] = None
    source_type: Optional[str] = None
    verification_status: Optional[str] = None
    is_synthetic: Optional[bool] = None
    limit: int = Field(50, ge=1, le=500)
    offset: int = Field(0, ge=0)


class EvidenceProvenanceReport(BaseModel):
    source_name: str
    source_type: str
    source_url_or_ref: str
    geographic_coverage: str
    license_and_attribution: str
    observation_period: Optional[str] = None
    update_frequency: str
    known_limitations: List[str]
    records_count: int
    is_synthetic: bool
