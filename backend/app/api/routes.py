"""Centralized API routing definition."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from .health import router as health_router
from ..schemas.routing import RoutePlanRequest, RoutePlanResponse
from ..schemas.community import CommunityReportCreate, CommunityReportResponse
from ..schemas.feedback import JourneyFeedbackCreate, FeedbackReassessmentResponse
from ..services.routing_service import RoutingService
from ..services.community_service import CommunityService
from ..services.feedback_service import FeedbackService

api_router = APIRouter()

# Mount health routes
api_router.include_router(health_router)

# Route Planning endpoint
@api_router.post("/routes/plan", response_model=RoutePlanResponse, tags=["Routing"])
def plan_routes(
    request: RoutePlanRequest,
    db: Session = Depends(get_db),
) -> RoutePlanResponse:
    """Generate multi-route alternatives (Fastest, Balanced, Safest)."""
    service = RoutingService(db=db)
    return service.generate_route_alternatives(request)

# Community Reporting endpoint
@api_router.post("/community/reports", response_model=CommunityReportResponse, status_code=status.HTTP_201_CREATED, tags=["Community"])
def create_report(
    report: CommunityReportCreate,
    db: Session = Depends(get_db),
) -> CommunityReportResponse:
    """Submit a crowd-sourced safety report with trust weighting."""
    service = CommunityService(db=db)
    return service.submit_report(report)

# Feedback & Reassessment endpoint
@api_router.post("/feedback", response_model=FeedbackReassessmentResponse, status_code=status.HTTP_201_CREATED, tags=["Feedback"])
def submit_feedback(
    feedback: JourneyFeedbackCreate,
    db: Session = Depends(get_db),
) -> FeedbackReassessmentResponse:
    """Submit post-journey feedback to trigger segment and route reassessment."""
    service = FeedbackService(db=db)
    return service.submit_journey_feedback(feedback)


# ==============================================================================
# Road Network Segmentation & Geospatial Data Endpoints (Phase 7)
# ==============================================================================

import json
from typing import List, Optional, Dict, Any
from ..models.domain import RoadSegment
from ..schemas.road_segment import (
    RoadSegmentResponse,
    BoundingBoxQuery,
    ProximityQuery,
    RouteMatchRequest,
    RouteMatchResponse,
    IngestionSummary,
    ProvenanceResponse,
)
from ..services.road_network_service import RoadNetworkService

def _segment_to_response(s: RoadSegment) -> RoadSegmentResponse:
    coords = []
    if s.geometry_geojson:
        try:
            coords = json.loads(s.geometry_geojson).get("coordinates", [])
        except Exception:
            pass
    if not coords:
        coords = [[s.start_lng, s.start_lat], [s.end_lng, s.end_lat]]

    meta = None
    if s.source_metadata_json:
        try:
            meta = json.loads(s.source_metadata_json)
        except Exception:
            pass

    return RoadSegmentResponse(
        id=s.id,
        segment_code=s.segment_code,
        name=s.name,
        corridor=s.corridor,
        city=s.city or "Chennai",
        start_lat=s.start_lat,
        start_lng=s.start_lng,
        end_lat=s.end_lat,
        end_lng=s.end_lng,
        length_meters=s.length_meters,
        geometry_geojson=s.geometry_geojson,
        coordinates=coords,
        road_classification=s.road_classification,
        source_feature_id=s.source_feature_id,
        source_dataset=s.source_dataset,
        source_metadata=meta,
        is_synthetic=bool(s.is_synthetic),
        safety_score=s.current_safety_score,
        confidence_score=s.confidence_score,
        created_at=s.created_at.isoformat() if s.created_at else None,
        updated_at=s.updated_at.isoformat() if s.updated_at else None,
    )

@api_router.get("/segments", tags=["Road Network"])
def list_segments(
    corridor: Optional[str] = None,
    classification: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Queries road segments with optional filtering and pagination."""
    service = RoadNetworkService(db=db)
    segments, total = service.query_segments(
        corridor=corridor,
        classification=classification,
        search=search,
        limit=min(limit, 100),
        offset=offset,
    )
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [_segment_to_response(s) for s in segments],
    }

@api_router.get("/segments/provenance", response_model=ProvenanceResponse, tags=["Road Network"])
def get_provenance(db: Session = Depends(get_db)) -> ProvenanceResponse:
    """Retrieves road network data sources, coverage, licensing, and attribution metadata."""
    service = RoadNetworkService(db=db)
    return service.get_provenance()

@api_router.get("/segments/{segment_code}", response_model=RoadSegmentResponse, tags=["Road Network"])
def get_segment(segment_code: str, db: Session = Depends(get_db)) -> RoadSegmentResponse:
    """Retrieves a single road segment by its unique stable identifier."""
    service = RoadNetworkService(db=db)
    segment = service.get_segment_by_code(segment_code)
    if not segment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Road segment with code '{segment_code}' not found in Chennai road network.",
        )
    return _segment_to_response(segment)

@api_router.post("/segments/bbox", response_model=List[RoadSegmentResponse], tags=["Road Network"])
def query_bbox(
    query: BoundingBoxQuery,
    db: Session = Depends(get_db),
) -> List[RoadSegmentResponse]:
    """Retrieves road segments intersecting a geographic bounding box."""
    service = RoadNetworkService(db=db)
    segments = service.query_segments_bbox(
        min_lat=query.min_lat,
        min_lng=query.min_lng,
        max_lat=query.max_lat,
        max_lng=query.max_lng,
        limit=query.limit,
    )
    return [_segment_to_response(s) for s in segments]

@api_router.post("/segments/near", tags=["Road Network"])
def query_near(
    query: ProximityQuery,
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    """Retrieves road segments within radius_meters of a coordinate, sorted by proximity."""
    service = RoadNetworkService(db=db)
    results = service.query_segments_near(
        lat=query.lat,
        lng=query.lng,
        radius_meters=query.radius_meters,
        limit=query.limit,
    )
    return [
        {
            "segment": _segment_to_response(s),
            "distance_meters": dist_m,
        }
        for s, dist_m in results
    ]

@api_router.post("/segments/match-route", response_model=RouteMatchResponse, tags=["Road Network"])
def match_route(
    request: RouteMatchRequest,
    db: Session = Depends(get_db),
) -> RouteMatchResponse:
    """Associates an arbitrary route polyline with discrete Chennai road-network segments."""
    service = RoadNetworkService(db=db)
    return service.match_route_to_segments(
        route_coordinates=request.coordinates,
        tolerance_meters=request.tolerance_meters,
    )

@api_router.post("/segments/ingest", response_model=IngestionSummary, tags=["Road Network"])
def ingest_road_network(
    force_reload: bool = False,
    db: Session = Depends(get_db),
) -> IngestionSummary:
    """Triggers road network dataset ingestion from the verified Chennai road network source."""
    service = RoadNetworkService(db=db)
    return service.ingest_road_network(force_reload=force_reload)
