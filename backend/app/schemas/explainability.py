"""Schemas for Route Explainability, Safety Score Semantics, and Confidence Dashboard (Phase 11).

Defines rigorous semantic models separating:
- Safety Score (contextual environmental risk heuristic, [15.0 - 95.0])
- Confidence Score (epistemic data completeness and reliability, [10.0 - 100.0]%)
- Evidence Coverage (physical proportion of route with usable supporting evidence)
- Category Evidence Breakdown (Lighting, Police, Pedestrian, Road, Community)
- Segment-level contribution and bottleneck identification
- Dynamic "Why This Route?" trade-off justification
"""

from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field


class MetricSemanticDefinition(BaseModel):
    """Rigorous semantic definition and limitations of an assessment metric."""
    metric_name: str
    scale: str
    scale_min: float
    scale_max: float
    neutral_anchor: Optional[float] = None
    unit: str
    definition: str
    aggregation_method: str
    what_it_establishes: str
    what_it_does_not_establish: str
    disclaimer: str


class EvidenceCategoryBreakdownItem(BaseModel):
    """Contribution and provenance of a single evidence stream."""
    category_key: str
    display_name: str
    icon: str
    is_available: bool
    record_count: int
    net_impact_points: float = Field(0.0, description="Cumulative score impact (+/- pts) across the route")
    impact_direction: Literal["POSITIVE", "NEGATIVE", "NEUTRAL", "MISSING"]
    data_source: str
    data_vintage: str
    freshness_status: Literal["FRESH", "MODERATELY_AGED", "STALE", "UNAUDITED"]
    is_synthetic: bool = False
    engine_usage: str
    known_limitations: str
    configured_weight: float = Field(..., description="Prototype heuristic weight parameter")


class SegmentExplainabilityItem(BaseModel):
    """Detailed explainability breakdown for a discrete road segment on the route."""
    traversal_order: int
    segment_code: str
    road_name: str
    corridor: Optional[str] = None
    road_classification: str
    length_meters: float
    length_percentage: float = Field(..., description="Percentage of total route length represented by this segment")
    safety_score: Optional[float] = Field(None, description="Heuristic score [15.0-95.0]; None if unassessed")
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "UNKNOWN"]
    confidence_score: float = Field(..., ge=0.0, le=100.0, description="Epistemic reliability [10.0-100.0]%")
    status: Literal["ASSESSED", "LIMITED_EVIDENCE", "INSUFFICIENT_DATA", "STALE_EVIDENCE"]
    is_bottleneck: bool = False
    bottleneck_reason: Optional[str] = None
    covered_categories: List[str] = Field(default_factory=list)
    missing_categories: List[str] = Field(default_factory=list)
    top_positive_factors: List[str] = Field(default_factory=list)
    top_negative_factors: List[str] = Field(default_factory=list)
    missing_data_warnings: List[str] = Field(default_factory=list)
    temporal_context: Optional[str] = None
    is_synthetic: bool = False
    coordinates: List[List[float]] = Field(default_factory=list, description="[[lng, lat], ...] coordinates for map highlighting")


class RouteAlternativeComparisonItem(BaseModel):
    """Comparative metrics for alternative routes."""
    route_id: str
    title: str
    route_type: str
    recommended_for: Optional[str] = None
    duration_minutes: float
    delta_duration_minutes: float
    distance_km: float
    safety_score: Optional[float] = None
    delta_safety_points: Optional[float] = None
    confidence_score: float
    coverage_ratio: float
    is_selected: bool = False
    preference_fit_score: Optional[float] = None
    summary_roads: str = ""


class WhyThisRouteJustification(BaseModel):
    """Dynamic, data-driven narrative explaining route selection."""
    selected_preference: str
    headline: str
    detailed_justification: str
    time_vs_fastest: str
    safety_vs_fastest: str
    key_differentiating_factors: List[str]
    identified_bottleneck: Optional[str] = None
    trade_off_limitations: List[str]


class RouteExplainabilityReport(BaseModel):
    """Complete explainability dashboard model for a selected route."""
    route_id: str
    route_title: str
    route_type: str
    summary_roads: str
    duration_minutes: float
    distance_km: float
    departure_time: Optional[str] = None
    assessment_timestamp: str

    # Core Metric Semantics
    safety_score: Optional[float]
    safety_score_semantics: MetricSemanticDefinition
    risk_level: Literal["LOW", "MEDIUM", "HIGH", "UNKNOWN"]

    confidence_score: float
    confidence_semantics: MetricSemanticDefinition

    evidence_coverage_ratio: float
    evidence_coverage_percentage: float
    evidence_coverage_semantics: MetricSemanticDefinition
    assessed_distance_km: float
    unassessed_distance_km: float
    total_segments_count: int
    assessed_segments_count: int
    unassessed_segments_count: int
    is_sparse_coverage: bool

    # Dynamic Justifications
    why_this_route: WhyThisRouteJustification

    # Breakdown Streams
    category_breakdowns: List[EvidenceCategoryBreakdownItem]
    segment_breakdowns: List[SegmentExplainabilityItem]
    route_comparisons: List[RouteAlternativeComparisonItem]

    # Uncertainty & Governance
    data_freshness_overall: Literal["CURRENT", "MODERATELY_AGED", "STALE", "SPARSE"]
    active_uncertainty_notices: List[str]
    disclaimer: str
    methodology_version: str = "SURAKSHA-HEURISTIC-V1"
    is_synthetic_route: bool = False
