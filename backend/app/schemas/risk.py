"""Schemas for segment risk scoring, evidence-based assessment, and route aggregation."""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field

AssessmentStatus = Literal[
    "ASSESSED",
    "LIMITED_EVIDENCE",
    "INSUFFICIENT_DATA",
    "STALE_EVIDENCE",
]

RiskLevel = Literal[
    "LOW",
    "MEDIUM",
    "HIGH",
    "UNKNOWN",
]


class RiskWeights(BaseModel):
    lighting_weight: float = Field(0.35, ge=0.0, le=1.0)
    crowd_activity_weight: float = Field(0.25, ge=0.0, le=1.0)
    police_presence_weight: float = Field(0.20, ge=0.0, le=1.0)
    community_reports_weight: float = Field(0.20, ge=0.0, le=1.0)


class SegmentEvidenceDetail(BaseModel):
    factor_name: str
    source_type: str
    impact_score: float
    confidence_weight: float
    freshness: str
    details: Optional[str] = None
    is_synthetic: bool = False


class ContributingFactor(BaseModel):
    factor_name: str
    category: str
    direction: Literal["POSITIVE", "NEGATIVE", "NEUTRAL"]
    impact_score: float
    evidence_id: Optional[str] = None
    source_name: str
    recency_description: str


class EvidenceCoverageBreakdown(BaseModel):
    total_categories_evaluated: int
    covered_categories: List[str]
    missing_categories: List[str]
    coverage_ratio: float = Field(..., ge=0.0, le=1.0)


class SegmentSafetyAssessment(BaseModel):
    segment_code: str
    road_name: Optional[str] = None
    corridor: Optional[str] = None
    status: AssessmentStatus
    risk_level: RiskLevel
    safety_score: Optional[float] = Field(None, ge=0.0, le=100.0, description="Available only when supported by evidence; None if INSUFFICIENT_DATA")
    confidence_score: float = Field(..., ge=0.0, le=100.0, description="Evaluates evidence density, freshness, and completeness independently from risk")
    evidence_coverage: EvidenceCoverageBreakdown
    contributing_factors: List[ContributingFactor] = Field(default_factory=list)
    missing_data_warnings: List[str] = Field(default_factory=list)
    temporal_context: Optional[str] = None
    limitations: List[str] = Field(default_factory=list)
    assessed_at: datetime
    methodology_version: str = "SURAKSHA-HEURISTIC-V1"
    is_synthetic: bool = False


class RouteSafetyAssessment(BaseModel):
    route_id: str
    status: Literal["ASSESSED", "PARTIALLY_ASSESSED", "INSUFFICIENT_DATA"]
    overall_risk_level: RiskLevel
    composite_safety_score: Optional[float] = Field(None, ge=0.0, le=100.0, description="Length-weighted score over assessed segments only; None if insufficient data")
    composite_confidence_score: float = Field(..., ge=0.0, le=100.0, description="Length-weighted confidence across the entire route")
    total_route_length_meters: float
    assessed_length_meters: float
    unassessed_length_meters: float
    length_coverage_ratio: float = Field(..., ge=0.0, le=1.0)
    total_segments_count: int
    assessed_segments_count: int
    unassessed_segments_count: int
    highest_risk_segment_code: Optional[str] = None
    highest_risk_reason: Optional[str] = None
    segment_assessments: List[SegmentSafetyAssessment] = Field(default_factory=list)
    route_disclaimer: str
    methodology_version: str = "SURAKSHA-HEURISTIC-V1"


class SegmentRiskEvaluation(BaseModel):
    """Backward compatible evaluation schema for Phase 3/4 consumers."""
    segment_code: str
    name: str
    corridor: str
    safety_score: float = Field(..., ge=0.0, le=100.0)
    confidence_score: float = Field(..., ge=0.0, le=100.0)
    primary_risks: List[str] = Field(default_factory=list)
    positive_factors: List[str] = Field(default_factory=list)
    evidence: List[SegmentEvidenceDetail] = Field(default_factory=list)
    is_synthetic: bool = False


class MethodologyInfo(BaseModel):
    methodology_name: str
    version: str
    status: str
    assumptions: List[str]
    supported_evidence_categories: List[str]
    freshness_half_lives_days: Dict[str, float]
    known_limitations: List[str]
