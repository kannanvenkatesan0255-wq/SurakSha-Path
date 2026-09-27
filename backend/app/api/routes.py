from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Header, Query
from sqlalchemy.orm import Session
from ..database import get_db
from .health import router as health_router
from ..schemas.routing import RoutePlanRequest, RoutePlanResponse, RouteAlternative
from ..schemas.community import (
    CommunityReportCreate,
    CommunityReportResponse,
    ReportInteractionCreate,
    ReportModerationAction,
    CommunityReportsListResponse,
    CategoryInfo,
)
from ..schemas.feedback import JourneyFeedbackCreate, FeedbackReassessmentResponse
from ..schemas.contextual import (
    CurrentContextResponse,
    ContextEvaluateRequest,
    ContextEvaluateResponse,
    RouteReassessContextRequest,
)
from ..schemas.journey import (
    ChennaiHelplinesResponse,
    JourneyStartRequest,
    JourneySessionState,
    JourneyTransitionRequest,
)
import logging
from ..services.routing_service import RoutingService
from ..services.community_service import CommunityService
from ..services.feedback_service import FeedbackService
from ..services.contextual_service import ContextualService
from ..services.journey_service import JourneyService
from ..models.domain import RoadSegment
from ..config import settings

logger = logging.getLogger(__name__)

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

# ==============================================================================
# Phase 9: Trust-Weighted Community Intelligence Endpoints
# ==============================================================================

@api_router.get("/community/categories", response_model=List[CategoryInfo], tags=["Community"])
def get_community_categories(
    db: Session = Depends(get_db),
) -> List[CategoryInfo]:
    """Retrieve controlled observation categories, base impact, and decay rates."""
    service = CommunityService(db=db)
    return service.get_categories()


@api_router.get("/community/reports", response_model=CommunityReportsListResponse, tags=["Community"])
def list_community_reports(
    category: Optional[str] = Query(None, description="Filter by observation category"),
    status: Optional[str] = Query(None, description="Filter by verification status"),
    segment_code: Optional[str] = Query(None, description="Filter by road segment code"),
    is_active: Optional[bool] = Query(None, description="Filter active status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> CommunityReportsListResponse:
    """Retrieve community observation reports with privacy protection and trust weights."""
    service = CommunityService(db=db)
    items, total = service.list_reports(
        category=category,
        status=status,
        segment_code=segment_code,
        is_active=is_active,
        limit=limit,
        offset=offset,
    )
    formatted = [service.format_report_response(r) for r in items]
    return CommunityReportsListResponse(items=formatted, total=total, limit=limit, offset=offset)


@api_router.post("/community/reports", response_model=CommunityReportResponse, status_code=status.HTTP_201_CREATED, tags=["Community"])
def create_community_report(
    report_in: CommunityReportCreate,
    x_user_id: Optional[str] = Header(None, description="Anonymous or session user identifier"),
    db: Session = Depends(get_db),
) -> CommunityReportResponse:
    """Submit a location-based community safety observation with trust weighting."""
    service = CommunityService(db=db)
    user_id = x_user_id or "anon_user"
    try:
        report = service.submit_report(report_in, reporter_id=user_id)
        return service.format_report_response(report)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@api_router.get("/community/reports/{report_id}", response_model=CommunityReportResponse, tags=["Community"])
def get_community_report_detail(
    report_id: str,
    db: Session = Depends(get_db),
) -> CommunityReportResponse:
    """Retrieve detail, status, and explainability breakdown for a single community report."""
    service = CommunityService(db=db)
    report = service.get_report_by_id(report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Community report with ID '{report_id}' was not found.",
        )
    return service.format_report_response(report)


@api_router.post("/community/reports/{report_id}/confirm", response_model=CommunityReportResponse, tags=["Community"])
def confirm_community_report(
    report_id: str,
    x_user_id: Optional[str] = Header(None, description="User identifier"),
    interaction: Optional[ReportInteractionCreate] = None,
    db: Session = Depends(get_db),
) -> CommunityReportResponse:
    """Independently corroborate an observed safety condition."""
    service = CommunityService(db=db)
    user_id = x_user_id or "anon_user"
    try:
        comments = interaction.comments if interaction else None
        updated = service.interact_with_report(
            report_id=report_id,
            user_id=user_id,
            interaction_type="CONFIRM",
            comments=comments,
        )
        return service.format_report_response(updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@api_router.post("/community/reports/{report_id}/dispute", response_model=CommunityReportResponse, tags=["Community"])
def dispute_community_report(
    report_id: str,
    x_user_id: Optional[str] = Header(None, description="User identifier"),
    interaction: Optional[ReportInteractionCreate] = None,
    db: Session = Depends(get_db),
) -> CommunityReportResponse:
    """Indicate that an observation may be inaccurate, resolved, or outdated."""
    service = CommunityService(db=db)
    user_id = x_user_id or "anon_user"
    try:
        comments = interaction.comments if interaction else None
        updated = service.interact_with_report(
            report_id=report_id,
            user_id=user_id,
            interaction_type="DISPUTE",
            comments=comments,
        )
        return service.format_report_response(updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@api_router.post("/community/reports/{report_id}/flag", response_model=CommunityReportResponse, tags=["Community"])
def flag_community_report(
    report_id: str,
    x_user_id: Optional[str] = Header(None, description="User identifier"),
    interaction: Optional[ReportInteractionCreate] = None,
    db: Session = Depends(get_db),
) -> CommunityReportResponse:
    """Flag an observation for moderator inspection (e.g. spam, abuse, hate speech)."""
    service = CommunityService(db=db)
    user_id = x_user_id or "anon_user"
    try:
        comments = interaction.comments if interaction else None
        updated = service.interact_with_report(
            report_id=report_id,
            user_id=user_id,
            interaction_type="FLAG",
            comments=comments,
        )
        return service.format_report_response(updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@api_router.post("/community/reports/{report_id}/moderate", response_model=CommunityReportResponse, tags=["Community"])
def moderate_community_report(
    report_id: str,
    action: ReportModerationAction,
    x_admin_key: Optional[str] = Header(None, description="Administrative authorization key"),
    db: Session = Depends(get_db),
) -> CommunityReportResponse:
    """Perform verified moderation action (VERIFIED, REJECTED, UNDER_REVIEW)."""
    service = CommunityService(db=db)
    try:
        updated = service.moderate_report(
            report_id=report_id,
            target_status=action.status,
            moderator_id="admin_moderator",
            moderator_key=x_admin_key or "",
            notes=action.notes,
        )
        return service.format_report_response(updated)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

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


# ==============================================================================
# Phase 8: Evidence-Based Safety & Risk Assessment Endpoints
# ==============================================================================

from ..schemas.risk import (
    SegmentSafetyAssessment,
    RouteSafetyAssessment,
    MethodologyInfo,
)
from ..schemas.evidence import (
    EvidenceCreate,
    EvidenceResponse,
    EvidenceFilterParams,
    EvidenceProvenanceReport,
)
from ..services.risk_service import RiskService
from ..services.evidence_service import EvidenceService
from pydantic import BaseModel


class RouteEvaluationRequest(BaseModel):
    route_id: str
    segment_codes: List[str]
    departure_time: Optional[str] = None


@api_router.get("/safety/segments/{segment_code}", response_model=SegmentSafetyAssessment, tags=["Safety Assessment"])
def get_segment_safety_assessment(
    segment_code: str,
    departure_time: Optional[str] = None,
    db: Session = Depends(get_db),
) -> SegmentSafetyAssessment:
    """Retrieve evidence-based safety assessment and explainability breakdown for a road segment."""
    service = RiskService(db=db)
    try:
        return service.evaluate_segment_safety(segment_code=segment_code, departure_time=departure_time)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@api_router.post("/safety/routes/evaluate", response_model=RouteSafetyAssessment, tags=["Safety Assessment"])
def evaluate_route_safety(
    request: RouteEvaluationRequest,
    db: Session = Depends(get_db),
) -> RouteSafetyAssessment:
    """Evaluate aggregate safety profile across a sequential list of road segments."""
    service = RiskService(db=db)
    return service.evaluate_route_safety(
        route_id=request.route_id,
        segments=request.segment_codes,
        departure_time=request.departure_time,
    )


# ==============================================================================
# Phase 11: Route Explainability, Safety Score & Confidence Dashboard Endpoints
# ==============================================================================

from ..schemas.explainability import (
    RouteExplainabilityReport,
    MetricSemanticDefinition,
)
from ..schemas.routing import RouteAlternative
from ..services.explainability_service import ExplainabilityService


class RouteExplainRequest(BaseModel):
    route: RouteAlternative
    all_alternatives: Optional[List[RouteAlternative]] = None
    departure_time: Optional[str] = None


@api_router.post("/safety/routes/explain", response_model=RouteExplainabilityReport, tags=["Safety Explainability"])
def explain_route(
    request: RouteExplainRequest,
    db: Session = Depends(get_db),
) -> RouteExplainabilityReport:
    """Generate comprehensive explainability, semantic documentation, and trade-off analysis for a route."""
    service = ExplainabilityService(db=db)
    return service.generate_report(
        route=request.route,
        all_alternatives=request.all_alternatives or [request.route],
        departure_time=request.departure_time,
    )


@api_router.get("/safety/semantics", response_model=Dict[str, MetricSemanticDefinition], tags=["Safety Explainability"])
def get_metric_semantics(
    db: Session = Depends(get_db),
) -> Dict[str, MetricSemanticDefinition]:
    """Retrieve official semantic definitions for Safety Score, Confidence, and Evidence Coverage."""
    service = ExplainabilityService(db=db)
    from ..schemas.routing import RouteMetrics
    dummy_alt = RouteAlternative(
        route_id="SEMANTICS-DUMMY",
        route_type="BALANCED",
        title="Semantics Reference",
        metrics=RouteMetrics(
            distance_meters=1000.0,
            distance_km=1.0,
            duration_seconds=120.0,
            duration_minutes=2.0,
        ),
    )
    report = service.generate_report(dummy_alt)
    return {
        "safety_score": report.safety_score_semantics,
        "confidence": report.confidence_semantics,
        "evidence_coverage": report.evidence_coverage_semantics,
    }


@api_router.get("/safety/evidence", tags=["Safety Evidence"])
def query_safety_evidence(
    segment_code: Optional[str] = None,
    category: Optional[str] = None,
    source_type: Optional[str] = None,
    verification_status: Optional[str] = None,
    is_synthetic: Optional[bool] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """Query safety evidence records with category, provenance, and segment filtering."""
    params = EvidenceFilterParams(
        segment_code=segment_code,
        category=category,
        source_type=source_type,
        verification_status=verification_status,
        is_synthetic=is_synthetic,
        limit=limit,
        offset=offset,
    )
    service = EvidenceService(db=db)
    return service.query_evidence(params)


@api_router.get("/safety/evidence/{evidence_id}", response_model=EvidenceResponse, tags=["Safety Evidence"])
def get_evidence_detail(
    evidence_id: str,
    db: Session = Depends(get_db),
) -> EvidenceResponse:
    """Fetch single evidence item details and provenance."""
    service = EvidenceService(db=db)
    item = service.get_evidence_by_id(evidence_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evidence item with ID '{evidence_id}' was not found.",
        )
    return item


@api_router.post("/safety/evidence", response_model=EvidenceResponse, status_code=status.HTTP_201_CREATED, tags=["Safety Evidence"])
def create_safety_evidence(
    evidence_in: EvidenceCreate,
    db: Session = Depends(get_db),
) -> EvidenceResponse:
    """Ingest a new validated safety evidence record with spatial association."""
    service = EvidenceService(db=db)
    try:
        return service.create_evidence(evidence_in)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@api_router.get("/safety/provenance", response_model=List[EvidenceProvenanceReport], tags=["Safety Evidence"])
def get_safety_provenance(
    db: Session = Depends(get_db),
) -> List[EvidenceProvenanceReport]:
    """Retrieve licensing, attribution, and provenance documentation for evidence datasets."""
    service = EvidenceService(db=db)
    return service.get_provenance_reports()


@api_router.get("/safety/methodology", response_model=MethodologyInfo, tags=["Safety Assessment"])
def get_safety_methodology(
    db: Session = Depends(get_db),
) -> MethodologyInfo:
    """Returns methodology details, assumptions, evidence weights, and limitations."""
    service = RiskService(db=db)
    return service.get_methodology_info()


# ==============================================================================
# Phase 12: Feedback-Driven Reassessment & Continuous Improvement Endpoints
# ==============================================================================

from ..schemas.feedback import (
    JourneyFeedbackCreate,
    FeedbackReassessmentResponse,
    FeedbackCreate,
    FeedbackResponse,
    FeedbackReviewRequest,
    ReassessmentAuditLogItem,
    SegmentReassessmentResult,
    FeedbackSubmissionResult,
    FeedbackTypeCatalogItem,
)
from ..services.feedback_service import FeedbackService


class RouteReassessRequest(BaseModel):
    route: RouteAlternative
    departure_time: Optional[str] = None


@api_router.post("/feedback", response_model=FeedbackReassessmentResponse, tags=["Feedback & Reassessment"])
def submit_post_journey_feedback(
    feedback_in: JourneyFeedbackCreate,
    db: Session = Depends(get_db),
) -> FeedbackReassessmentResponse:
    """Legacy post-journey feedback endpoint. Triggers segment reassessment."""
    service = FeedbackService(db=db)
    return service.submit_journey_feedback(feedback_in)


@api_router.get("/feedback/types", response_model=List[FeedbackTypeCatalogItem], tags=["Feedback & Reassessment"])
def get_feedback_types(
    db: Session = Depends(get_db),
) -> List[FeedbackTypeCatalogItem]:
    """Retrieve catalog of supported feedback categories, operational intents, and scoring rules."""
    service = FeedbackService(db=db)
    return service.get_feedback_types()


@api_router.post("/feedback/submit", response_model=FeedbackSubmissionResult, status_code=status.HTTP_201_CREATED, tags=["Feedback & Reassessment"])
def submit_structured_feedback(
    data: FeedbackCreate,
    db: Session = Depends(get_db),
) -> FeedbackSubmissionResult:
    """
    Submit structured feedback regarding a road segment, route, community report, or application.
    Executes controlled segment reassessment if spatially resolved and validated.
    """
    service = FeedbackService(db=db)
    try:
        return service.submit_feedback(data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@api_router.get("/feedback", response_model=List[FeedbackResponse], tags=["Feedback & Reassessment"])
def list_feedback(
    feedback_type: Optional[str] = None,
    status: Optional[str] = None,
    segment_code: Optional[str] = None,
    target_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
) -> List[FeedbackResponse]:
    """Query user feedback records with type, status, and segment filtering."""
    service = FeedbackService(db=db)
    items, _ = service.list_feedback(
        feedback_type=feedback_type,
        status=status,
        segment_code=segment_code,
        target_type=target_type,
        limit=limit,
        offset=offset,
    )
    return items


@api_router.get("/feedback/{feedback_id}", response_model=FeedbackResponse, tags=["Feedback & Reassessment"])
def get_feedback_by_id(
    feedback_id: str,
    db: Session = Depends(get_db),
) -> FeedbackResponse:
    """Fetch single feedback record by ID."""
    service = FeedbackService(db=db)
    item = service.get_feedback_by_id(feedback_id)
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Feedback record '{feedback_id}' was not found.",
        )
    return item


@api_router.post("/feedback/{feedback_id}/review", response_model=FeedbackResponse, tags=["Feedback & Reassessment"])
def review_feedback(
    feedback_id: str,
    review_in: FeedbackReviewRequest,
    db: Session = Depends(get_db),
) -> FeedbackResponse:
    """Review and moderate user feedback (requires moderator authorization key)."""
    service = FeedbackService(db=db)
    try:
        return service.review_feedback(feedback_id, review_in)
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))


@api_router.post("/feedback/reassess-segment/{segment_code}", response_model=SegmentReassessmentResult, tags=["Feedback & Reassessment"])
def trigger_segment_reassessment(
    segment_code: str,
    departure_time: Optional[str] = None,
    db: Session = Depends(get_db),
) -> SegmentReassessmentResult:
    """Explicitly recalculate safety score and confidence for a road segment and record an audit log."""
    service = FeedbackService(db=db)
    try:
        return service.reassess_segment(
            segment_code=segment_code,
            trigger_type="MANUAL_TRIGGER",
            reference_id="API_REQUEST",
            departure_time=departure_time,
        )
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))


@api_router.post("/feedback/reassess-route", tags=["Feedback & Reassessment"])
def trigger_route_reassessment(
    request: RouteReassessRequest,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Refresh a route alternative with the latest segment assessments without altering route geometry.
    Returns previous vs new scores, deltas, updated explainability, and change summary.
    """
    service = FeedbackService(db=db)
    return service.reassess_route(route=request.route, departure_time=request.departure_time)


@api_router.get("/feedback-audit-log", response_model=List[ReassessmentAuditLogItem], tags=["Feedback & Reassessment"])
def get_reassessment_audit_log(
    segment_code: Optional[str] = None,
    route_id: Optional[str] = None,
    trigger_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
) -> List[ReassessmentAuditLogItem]:
    """Retrieve historical audit logs of safety score and confidence reassessments."""
    service = FeedbackService(db=db)
    items, _ = service.list_audit_logs(
        segment_code=segment_code,
        route_id=route_id,
        trigger_type=trigger_type,
        limit=limit,
        offset=offset,
    )
    return items


@api_router.get("/feedback/segment/{segment_code}/history", tags=["Feedback & Reassessment"])
def get_segment_reassessment_history(
    segment_code: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Retrieve full reassessment audit history and feedback for a road segment."""
    service = FeedbackService(db=db)
    try:
        return service.get_segment_history(segment_code)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(ve))


# ==============================================================================
# Phase 13: Real-Time Context, Time-of-Day & Environmental Endpoints
# ==============================================================================

@api_router.get("/context/current", response_model=CurrentContextResponse, tags=["Context & Environment"])
def get_current_context(
    db: Session = Depends(get_db),
) -> CurrentContextResponse:
    """
    Retrieve real-time solar illumination and environmental weather conditions for Chennai (Asia/Kolkata).
    Uses NOAA solar algorithms and Open-Meteo current meteorological telemetry with fallback.
    """
    service = ContextualService(db=db)
    now_ist = service.get_chennai_now()
    solar = service.calculate_solar_context(now_ist)
    weather = service.get_environmental_context(now_ist, is_future=False)
    return CurrentContextResponse(
        current_time_ist=now_ist.strftime("%Y-%m-%d %H:%M:%S IST"),
        timezone="Asia/Kolkata (IST: UTC+5:30)",
        solar_context=solar,
        environmental_context=weather,
        disclaimer=settings.DISCLAIMER_TEXT,
    )


@api_router.post("/context/evaluate", response_model=ContextEvaluateResponse, tags=["Context & Environment"])
def evaluate_journey_context(
    request: ContextEvaluateRequest,
    db: Session = Depends(get_db),
) -> ContextEvaluateResponse:
    """
    Evaluate solar phase, weather, and segment modifiers for a specific journey date and departure time.
    Distinguishes current telemetry from future hourly forecasts.
    """
    service = ContextualService(db=db)
    journey_dt, is_future = service.parse_journey_datetime(request.journey_date, request.departure_time)
    solar = service.calculate_solar_context(journey_dt)
    weather = service.get_environmental_context(journey_dt, is_future=is_future)

    evaluated_segs = []
    if request.segment_codes:
        segments = db.query(RoadSegment).filter(RoadSegment.segment_code.in_(request.segment_codes)).all()
        for seg in segments:
            adj = service.evaluate_segment_context(seg, journey_dt, weather=weather)
            evaluated_segs.append(adj)

    advisories = list(weather.active_advisories)
    if solar.is_dark:
        advisories.append(f"Nocturnal journey ({solar.solar_phase}): Street lighting relevance is 100%.")

    return ContextEvaluateResponse(
        journey_date=journey_dt.strftime("%Y-%m-%d"),
        departure_time=journey_dt.strftime("%H:%M"),
        timezone="Asia/Kolkata (IST: UTC+5:30)",
        is_departure_future=is_future,
        solar_context=solar,
        environmental_context=weather,
        evaluated_segments=evaluated_segs,
        active_advisories=advisories,
        disclaimer=settings.DISCLAIMER_TEXT,
    )


@api_router.post("/context/reassess-route", response_model=Dict[str, Any], tags=["Context & Environment"])
def reassess_route_context(
    request: RouteReassessContextRequest,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Reassess an existing route alternative with new journey time and environmental conditions.
    Preserves verified routing kinematics (distance, geometry, and duration invariant).
    Updates context-adjusted scores, confidence, and contextual assessment report.
    """
    service = ContextualService(db=db)
    try:
        route_alt = RouteAlternative.model_validate(request.route)
    except Exception as ex:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid route payload for reassessment: {ex}",
        )

    # Enrich route with updated context
    report = service.enrich_route_with_context(
        route=route_alt,
        journey_date=request.journey_date,
        departure_time=request.departure_time,
    )
    route_alt.contextual_report = report.model_dump()

    # Re-evaluate explainability if explainability service available
    try:
        from ..services.explainability_service import ExplainabilityService
        exp_service = ExplainabilityService(db=db)
        exp_report = exp_service.generate_report(
            route=route_alt,
            all_alternatives=[route_alt],
            departure_time=request.departure_time,
        )
        route_alt.explainability = exp_report.model_dump()
    except Exception as exp_err:
        logger.warning(f"Failed to regenerate explainability during route reassessment: {exp_err}")

    return {
        "status": "SUCCESS",
        "route": route_alt.model_dump(),
        "contextual_report": report.model_dump(),
        "message": (
            f"Route reassessed for {request.journey_date or 'today'} at {request.departure_time or 'current time'} IST. "
            "Route geometry and travel duration are invariant."
        ),
    }


# ==============================================================================
# Phase 14: Safety Check-In, Journey Monitoring & SOS Workflow Endpoints
# ==============================================================================

@api_router.get(
    "/journey/helplines",
    response_model=ChennaiHelplinesResponse,
    tags=["Journey Monitoring"],
)
def get_chennai_emergency_helplines() -> ChennaiHelplinesResponse:
    """Retrieve verified official emergency telephone helplines for Chennai."""
    return JourneyService.get_chennai_helplines()


@api_router.post(
    "/journey/session",
    response_model=JourneySessionState,
    tags=["Journey Monitoring"],
)
def start_journey_session(
    request: JourneyStartRequest,
) -> JourneySessionState:
    """
    Start a monitored journey session for a selected route.
    Initializes state machine to ACTIVE, schedules initial check-in, and starts event ledger.
    """
    return JourneyService.start_journey(request)


@api_router.get(
    "/journey/session/{journey_id}",
    response_model=JourneySessionState,
    tags=["Journey Monitoring"],
)
def get_journey_session(
    journey_id: str,
) -> JourneySessionState:
    """Retrieve the current state and audit log of a journey session."""
    return JourneyService.get_session(journey_id)


@api_router.post(
    "/journey/transition",
    response_model=JourneySessionState,
    tags=["Journey Monitoring"],
)
def transition_journey_session(
    request: JourneyTransitionRequest,
) -> JourneySessionState:
    """
    Execute a validated state transition, safety check-in response, or SOS action.
    Enforces state machine rules and prevents invalid transitions.
    """
    return JourneyService.transition_journey(request)




