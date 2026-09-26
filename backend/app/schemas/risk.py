"""Schemas for segment risk scoring, evidence, and factors."""

from typing import List, Optional, Dict
from pydantic import BaseModel, Field

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
    is_synthetic: bool = True

class SegmentRiskEvaluation(BaseModel):
    segment_code: str
    name: str
    corridor: str
    safety_score: float = Field(..., ge=0.0, le=100.0)
    confidence_score: float = Field(..., ge=0.0, le=100.0)
    primary_risks: List[str] = Field(default_factory=list)
    positive_factors: List[str] = Field(default_factory=list)
    evidence: List[SegmentEvidenceDetail] = Field(default_factory=list)
    is_synthetic: bool = True
