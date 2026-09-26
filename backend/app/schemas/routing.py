"""Schemas for routing requests and alternatives."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class LatLng(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)
    name: Optional[str] = None

class RoutePlanRequest(BaseModel):
    origin: LatLng
    destination: LatLng
    departure_time: Optional[str] = None  # ISO timestamp or HH:MM
    safety_weight_preference: float = Field(0.5, ge=0.0, le=1.0, description="0.0 = prioritize speed, 1.0 = prioritize safety")
    avoid_unlit_areas: bool = Field(True, description="Strict filter for unlit segments")

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
    origin: LatLng
    destination: LatLng
    alternatives: List[RouteAlternative]
    trade_off_analysis: str
    disclaimer: str
