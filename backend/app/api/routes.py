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
