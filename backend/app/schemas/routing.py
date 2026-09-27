"""Schemas for routing requests and alternatives."""

import uuid
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator

class LocationInput(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Place name, landmark, or address")
    address: Optional[str] = None
    lat: Optional[float] = Field(None, ge=-90.0, le=90.0)
    lng: Optional[float] = Field(None, ge=-180.0, le=180.0)
    is_resolved: bool = Field(False, description="Whether coordinates are verified by geocoding")
    resolution_source: Optional[str] = Field(None, description="Provenance: e.g. CHENNAI_DEMO_CATALOG, OSM_NOMINATIM")

class RoutePlanRequest(BaseModel):
    origin: LocationInput
    destination: LocationInput
    journey_date: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$", description="Departure date (YYYY-MM-DD)")
    departure_time: Optional[str] = Field(None, description="Departure time (e.g. 21:30 or HH:MM)")
    route_preference: str = Field("BALANCED", pattern=r"^(FASTEST|BALANCED|SAFEST)$", description="FASTEST, BALANCED, or SAFEST")
    safety_weight_preference: float = Field(0.5, ge=0.0, le=1.0, description="0.0 = prioritize speed, 1.0 = prioritize safety")
    avoid_unlit_areas: bool = Field(True, description="Preference to avoid known unlit segments")

    @model_validator(mode="after")
    def validate_locations_distinct(self):
        orig = self.origin.name.strip().lower()
        dest = self.destination.name.strip().lower()
        if orig == dest:
            raise ValueError("Origin and destination cannot be identical. Please enter distinct locations.")
        if (
            self.origin.lat is not None and self.origin.lng is not None and
            self.destination.lat is not None and self.destination.lng is not None
        ):
            # Check if coordinates are virtually identical (< ~50 meters: ~0.0005 deg)
            if abs(self.origin.lat - self.destination.lat) < 0.0005 and abs(self.origin.lng - self.destination.lng) < 0.0005:
                raise ValueError("Origin and destination coordinates are identical. Please specify distinct geographic endpoints.")
        return self

class RouteMetrics(BaseModel):
    distance_meters: float
    distance_km: float
    duration_seconds: float
    duration_minutes: float
    duration_type: str = Field("ESTIMATED_FREE_FLOW", description="Standard road-network estimate; not live traffic")
    traffic_aware: bool = Field(False, description="OSRM routing provides estimated travel times without live traffic sensors")

class SegmentSummary(BaseModel):
    segment_code: str
    name: str
    length_meters: float
    safety_score: Optional[float] = None
    confidence_score: Optional[float] = None
    lighting_level: Optional[float] = None
    crowd_density: Optional[float] = None
    police_presence: Optional[float] = None
    key_factors: List[str] = Field(default_factory=list)
    status: Optional[str] = None
    risk_level: Optional[str] = None
    road_classification: Optional[str] = None
    corridor: Optional[str] = None
    length_percentage: Optional[float] = None
    covered_categories: List[str] = Field(default_factory=list)
    missing_categories: List[str] = Field(default_factory=list)
    missing_data_warnings: List[str] = Field(default_factory=list)
    is_bottleneck: bool = False
    bottleneck_reason: Optional[str] = None
    is_synthetic: bool = False
    coordinates: List[List[float]] = Field(default_factory=list)

class RouteAlternative(BaseModel):
    route_id: str = Field(..., description="Unique route identifier, e.g. ROUTE-ALT-1")
    route_type: str = Field(..., description="FASTEST, BALANCED, SAFEST, or ALTERNATIVE")
    title: str = Field(..., description="Human-readable title describing the route corridor")
    summary: str = Field("", description="Key roads traversed (from routing engine steps)")
    metrics: RouteMetrics
    coordinates: List[List[float]] = Field(default_factory=list, description="GeoJSON coordinates array of [lng, lat] pairs")
    is_selected: bool = False
    safety_assessment_status: str = Field(
        "PENDING_PHASE_7_SAFETY_SCORING",
        description="Safety scoring and evidence-weighted algorithms are scheduled for Phase 7"
    )
    safety_disclaimer: str = Field(
        "Safety scoring not yet applied. Navigation metrics reflect estimated road distance and travel time only."
    )
    safety_score: Optional[float] = None
    confidence_score: Optional[float] = None
    delta_time_seconds: float = 0.0
    delta_time_minutes: float = 0.0
    segments: List[SegmentSummary] = Field(default_factory=list)
    is_synthetic: bool = False

    # Phase 10: Safety-Time Trade-Off & Explainability Fields
    tradeoff_explanation: Optional[str] = Field(
        None, description="Clear, data-driven narrative explaining time vs. safety evidence trade-offs"
    )
    detour_penalty_minutes: float = Field(
        0.0, description="Detour time penalty in minutes compared to the fastest alternative"
    )
    safety_advantage_points: Optional[float] = Field(
        None, description="Safety score difference compared to the fastest alternative (+/- pts)"
    )
    preference_fit_score: Optional[float] = Field(
        None, description="Quantitative alignment score (0-100) for the requested route preference"
    )
    evidence_coverage_ratio: Optional[float] = Field(
        None, description="Proportion of route distance backed by verified evidence (0.0 - 1.0)"
    )
    recommended_for: Optional[str] = Field(
        None, description="Best-fit strategy tag: FASTEST, BALANCED, SAFEST, or ALTERNATIVE"
    )
    bottleneck_segment_code: Optional[str] = Field(
        None, description="Identifier of highest-risk or unlit segment on route"
    )
    bottleneck_reason: Optional[str] = Field(
        None, description="Contextual explanation of highest-risk segment"
    )

    # Phase 11: Route Explainability & Confidence Dashboard
    explainability: Optional[Dict[str, Any]] = Field(
        None, description="Detailed RouteExplainabilityReport dictionary for interactive dashboard"
    )

    # Phase 13: Real-Time Context, Time-of-Day & Environmental Adjustments
    contextual_report: Optional[Dict[str, Any]] = Field(
        None, description="Detailed ContextualAssessmentReport dictionary for solar illumination and weather conditions"
    )

class RoutePlanResponse(BaseModel):
    journey_id: str = Field(default_factory=lambda: f"JRN-{uuid.uuid4().hex[:8].upper()}")
    origin: LocationInput
    destination: LocationInput
    journey_date: Optional[str] = None
    departure_time: Optional[str] = None
    route_preference: str
    status: str = Field("SUCCESS", description="SUCCESS, NO_ROUTE_FOUND, or PROVIDER_ERROR")
    routing_status: str = Field(
        "COMPLETED_PHASE_6_ROUTING_ENGINE",
        description="Indicates actual road-network geometry and safety-time trade-off optimization were generated"
    )
    provider: str = Field("OpenStreetMap / OSRM Driving Engine")
    provider_notes: str = Field(
        "Actual road-network route geometries and distance/duration estimates calculated via OSRM OpenStreetMap routing."
    )
    traffic_data_available: bool = Field(False, description="Live traffic sensors are not supplied by OSRM")
    preference_notice: str = Field(
        "FASTEST prioritizes minimal travel duration. BALANCED optimizes the trade-off between time and verified safety evidence. "
        "SAFEST prioritizes road corridors with verified illumination, footfall, and surveillance within practical detour limits."
    )
    message: str = Field(...)
    alternatives: List[RouteAlternative] = Field(default_factory=list)
    selected_route_id: Optional[str] = None
    disclaimer: str

    # Phase 10: Trade-Off Engine Metadata
    tradeoff_summary: Optional[str] = Field(
        None, description="Executive summary of the speed vs. safety evidence trade-off among available alternatives"
    )
    optimization_strategy: str = Field(
        "PARETO_UTILITY_V1", description="Multi-objective trade-off method used for candidate ranking"
    )

    # Phase 13: Journey Context Assessment
    contextual_report: Optional[Dict[str, Any]] = Field(
        None, description="Contextual assessment report (solar illumination, weather, advisories) for selected route"
    )

