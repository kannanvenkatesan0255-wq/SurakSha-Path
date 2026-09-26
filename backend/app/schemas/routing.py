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
        return self

class SegmentSummary(BaseModel):
    segment_code: str
    name: str
    length_meters: float
    safety_score: float
    confidence_score: float
    lighting_level: float
    crowd_density: float
    police_presence: float
    key_factors: List[str] = Field(default_factory=list)

class RouteAlternative(BaseModel):
    route_type: str = Field(..., description="FASTEST, BALANCED, or SAFEST")
    title: str
    distance_meters: float
    duration_seconds: float
    safety_score: float = Field(..., ge=0.0, le=100.0)
    confidence_score: float = Field(..., ge=0.0, le=100.0)
    safety_delta_vs_fastest: float = Field(0.0)
    time_delta_vs_fastest_seconds: float = Field(0.0)
    summary_explanation: str
    coordinates: List[List[float]] = Field(default_factory=list, description="GeoJSON coordinates [lng, lat]")
    segments: List[SegmentSummary] = Field(default_factory=list)
    is_synthetic: bool = True

class RoutePlanResponse(BaseModel):
    journey_id: str = Field(default_factory=lambda: f"JRN-{uuid.uuid4().hex[:8].upper()}")
    origin: LocationInput
    destination: LocationInput
    journey_date: Optional[str] = None
    departure_time: Optional[str] = None
    route_preference: str
    status: str = Field("VALIDATED", description="Request validation status")
    routing_status: str = Field(
        "PENDING_ROUTING_ENGINE_PHASE_5",
        description="Indicates spatial routing engine is scheduled for integration in Phase 5"
    )
    message: str = Field(...)
    alternatives: List[RouteAlternative] = Field(default_factory=list)
    disclaimer: str
