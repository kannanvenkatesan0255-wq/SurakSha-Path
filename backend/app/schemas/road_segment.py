"""Schemas for road network segmentation, spatial queries, and route matching."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator

class RoadSegmentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Road or street name")
    corridor: Optional[str] = Field(None, max_length=128, description="Corridor name (e.g. Anna Salai Corridor)")
    road_classification: Optional[str] = Field("unclassified", description="OSM classification: primary, trunk, secondary, tertiary, residential")
    start_lat: float = Field(..., ge=-90.0, le=90.0)
    start_lng: float = Field(..., ge=-180.0, le=180.0)
    end_lat: float = Field(..., ge=-90.0, le=90.0)
    end_lng: float = Field(..., ge=-180.0, le=180.0)
    length_meters: float = Field(..., ge=0.0)
    source_feature_id: Optional[str] = Field(None, description="Source ID (e.g. OSM way ID way/123456)")
    source_dataset: str = Field("OpenStreetMap / Chennai Network", description="Source provider or dataset name")
    is_synthetic: bool = Field(False, description="Whether this segment is a synthetic test fixture or real sourced data")

class RoadSegmentCreate(RoadSegmentBase):
    segment_code: Optional[str] = Field(None, description="Unique segment code. Auto-generated if omitted.")
    geometry_geojson: Optional[str] = Field(None, description="Detailed GeoJSON LineString JSON string")
    source_metadata_json: Optional[str] = Field(None, description="JSON string of source tags (lanes, oneway, maxspeed)")
    from_node_id: Optional[str] = None
    to_node_id: Optional[str] = None

class RoadSegmentSummary(BaseModel):
    segment_code: str
    name: str
    corridor: Optional[str] = None
    road_classification: Optional[str] = None
    length_meters: float
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float
    source_feature_id: Optional[str] = None
    is_synthetic: bool = False

class RoadSegmentResponse(BaseModel):
    id: int
    segment_code: str
    name: str
    corridor: Optional[str] = None
    city: str = "Chennai"
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float
    length_meters: float
    geometry_geojson: Optional[str] = None
    coordinates: List[List[float]] = Field(default_factory=list, description="GeoJSON [lng, lat] coordinate array")
    road_classification: Optional[str] = None
    source_feature_id: Optional[str] = None
    source_dataset: Optional[str] = None
    source_metadata: Optional[Dict[str, Any]] = None
    is_synthetic: bool = False
    # Explicitly optional - safety scoring is decoupled (Phase 8+)
    safety_score: Optional[float] = None
    confidence_score: Optional[float] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class BoundingBoxQuery(BaseModel):
    min_lat: float = Field(..., ge=-90.0, le=90.0)
    min_lng: float = Field(..., ge=-180.0, le=180.0)
    max_lat: float = Field(..., ge=-90.0, le=90.0)
    max_lng: float = Field(..., ge=-180.0, le=180.0)
    limit: int = Field(100, ge=1, le=500)

    @model_validator(mode="after")
    def validate_bounds(self):
        if self.min_lat > self.max_lat:
            raise ValueError("min_lat cannot be greater than max_lat")
        if self.min_lng > self.max_lng:
            raise ValueError("min_lng cannot be greater than max_lng")
        return self

class ProximityQuery(BaseModel):
    lat: float = Field(..., ge=-90.0, le=90.0)
    lng: float = Field(..., ge=-180.0, le=180.0)
    radius_meters: float = Field(500.0, ge=10.0, le=10000.0)
    limit: int = Field(20, ge=1, le=100)

class MatchedSegmentItem(BaseModel):
    traversal_order: int
    segment_code: str
    name: str
    corridor: Optional[str] = None
    road_classification: Optional[str] = None
    segment_length_meters: float
    matched_length_meters: float
    source_feature_id: Optional[str] = None
    coordinates: List[List[float]] = Field(default_factory=list)

class RouteMatchRequest(BaseModel):
    coordinates: List[List[float]] = Field(..., min_length=2, description="GeoJSON coordinates array [[lng, lat], ...]")
    tolerance_meters: float = Field(35.0, ge=5.0, le=200.0, description="Spatial matching buffer in meters")

class RouteMatchResponse(BaseModel):
    matched_segments: List[MatchedSegmentItem] = Field(default_factory=list)
    total_route_length_meters: float
    matched_length_meters: float
    unmatched_length_meters: float
    coverage_ratio: float = Field(..., ge=0.0, le=1.0)
    unmatched_segments_count: int = 0
    status: str = Field("MATCHED_PARTIAL", description="MATCHED_FULL, MATCHED_PARTIAL, or NO_SEGMENTS_IN_CORRIDOR")
    notice: str

class IngestionSummary(BaseModel):
    source_name: str
    source_dataset: str
    license: str
    attribution: str
    import_timestamp: str
    features_examined: int
    features_imported: int
    features_skipped_duplicates: int
    features_rejected: int
    rejection_reasons: List[str] = Field(default_factory=list)
    total_active_segments: int = 0
    bounding_box: Optional[List[float]] = None
    is_synthetic_fixture: bool = False

class ProvenanceResponse(BaseModel):
    sources: List[Dict[str, Any]]
    total_segments: int
    corridors_covered: List[str]
    classifications: Dict[str, int]
    license: str
    attribution: str
