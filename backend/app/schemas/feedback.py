"""Schemas for post-journey feedback and reassessment triggers."""

from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field

def get_utc_now():
    return datetime.now(timezone.utc)

class JourneyFeedbackCreate(BaseModel):
    route_evaluation_id: Optional[int] = None
    affected_segment_code: Optional[str] = None
    perceived_safety_rating: int = Field(..., ge=1, le=5, description="1 = Very unsafe, 5 = Very safe")
    felt_safe: bool = True
    encountered_issues: Optional[str] = None
    comments: Optional[str] = None

class FeedbackReassessmentResponse(BaseModel):
    feedback_id: int
    affected_segments_identified: List[str]
    reassessment_triggered: bool
    message: str
    updated_at: datetime = Field(default_factory=get_utc_now)
