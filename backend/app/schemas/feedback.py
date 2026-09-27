"""Schemas for feedback-driven continuous assessment and reassessment (Phase 12).

Defines structured feedback types, operational intents, review lifecycles,
audit logs, and segment/route reassessment outcomes.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum
from pydantic import BaseModel, Field

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)


class FeedbackType(str, Enum):
    CONDITION_CHANGED = "CONDITION_CHANGED"
    OBSERVATION_OUTDATED = "OBSERVATION_OUTDATED"
    REPORT_INACCURATE = "REPORT_INACCURATE"
    INFRASTRUCTURE_ISSUE = "INFRASTRUCTURE_ISSUE"
    ASSESSMENT_INCONSISTENT = "ASSESSMENT_INCONSISTENT"
    LOCATION_ASSOCIATION_ERROR = "LOCATION_ASSOCIATION_ERROR"
    GENERAL_PRODUCT_FEEDBACK = "GENERAL_PRODUCT_FEEDBACK"


class OperationalIntent(str, Enum):
    NEW_OBSERVATION = "NEW_OBSERVATION"
    CORRECTION = "CORRECTION"
    CONFIRMATION = "CONFIRMATION"
    DISPUTE = "DISPUTE"
    GENERAL_FEEDBACK = "GENERAL_FEEDBACK"


class TargetType(str, Enum):
    SEGMENT = "SEGMENT"
    ROUTE = "ROUTE"
    REPORT = "REPORT"
    GENERAL = "GENERAL"


class FeedbackStatus(str, Enum):
    SUBMITTED = "SUBMITTED"
    PENDING_REVIEW = "PENDING_REVIEW"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    DISPUTED = "DISPUTED"
    RESOLVED = "RESOLVED"
    EXPIRED = "EXPIRED"


# Backward compatibility for Phase 2 journey feedback
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


# Phase 12 Rich Feedback Schemas
class FeedbackCreate(BaseModel):
    feedback_type: str = Field(
        ...,
        description="Controlled category: CONDITION_CHANGED, OBSERVATION_OUTDATED, REPORT_INACCURATE, INFRASTRUCTURE_ISSUE, ASSESSMENT_INCONSISTENT, LOCATION_ASSOCIATION_ERROR, GENERAL_PRODUCT_FEEDBACK",
    )
    operational_intent: Optional[str] = Field(
        default=None,
        description="NEW_OBSERVATION, CORRECTION, CONFIRMATION, DISPUTE, or GENERAL_FEEDBACK",
    )
    target_type: str = Field(
        default="SEGMENT",
        description="Target entity type: SEGMENT, ROUTE, REPORT, or GENERAL",
    )
    target_id: Optional[str] = Field(
        default=None,
        description="Specific target identifier (e.g. segment code, route ID, or report ID)",
    )
    target_segment_code: Optional[str] = Field(
        default=None,
        description="Associated road segment code if applicable",
    )
    target_route_id: Optional[str] = Field(
        default=None,
        description="Associated route ID if feedback pertains to a planned route",
    )
    target_report_id: Optional[str] = Field(
        default=None,
        description="Associated community report ID if correcting or disputing a report",
    )
    latitude: Optional[float] = Field(
        default=None,
        description="Observed latitude coordinate",
    )
    longitude: Optional[float] = Field(
        default=None,
        description="Observed longitude coordinate",
    )
    location_name: Optional[str] = Field(
        default=None,
        description="Human-readable landmark or address in Chennai",
    )
    observed_at: Optional[datetime] = Field(
        default=None,
        description="Time the condition was observed (distinguished from submission time)",
    )
    description: str = Field(
        ...,
        min_length=5,
        max_length=2000,
        description="Specific factual description of observed condition or reason for feedback",
    )
    supporting_evidence_url: Optional[str] = Field(
        default=None,
        description="Optional reference or document link",
    )
    reporter_id: Optional[str] = Field(
        default="anon_user",
        description="Pseudonymous client identifier",
    )
    idempotency_key: Optional[str] = Field(
        default=None,
        description="Client-supplied UUID to guarantee idempotent submission",
    )


class FeedbackResponse(BaseModel):
    feedback_id: str
    feedback_type: str
    operational_intent: str
    target_type: str
    target_id: Optional[str] = None
    target_segment_code: Optional[str] = None
    target_route_id: Optional[str] = None
    target_report_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location_name: Optional[str] = None
    observed_at: Optional[datetime] = None
    submitted_at: datetime
    description: str
    reporter_id_masked: str
    status: str
    review_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    reassessment_applied: bool
    reassessment_timestamp: Optional[datetime] = None
    affects_safety_score: bool
    is_synthetic: bool


class FeedbackReviewRequest(BaseModel):
    target_status: str = Field(
        ...,
        description="Target lifecycle state: ACCEPTED, REJECTED, RESOLVED, DISPUTED",
    )
    moderator_id: str = Field(
        ...,
        description="Identifier of reviewing moderator or analyst",
    )
    moderator_key: str = Field(
        ...,
        description="Administrative authentication token for moderation actions",
    )
    review_notes: Optional[str] = Field(
        default=None,
        description="Official review rationale or resolution remarks",
    )


class ReassessmentAuditLogItem(BaseModel):
    audit_id: str
    trigger_type: str
    trigger_reference_id: str
    segment_code: Optional[str] = None
    route_id: Optional[str] = None
    previous_safety_score: Optional[float] = None
    new_safety_score: Optional[float] = None
    score_delta: Optional[float] = None
    previous_confidence: Optional[float] = None
    new_confidence: Optional[float] = None
    confidence_delta: Optional[float] = None
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    explanation_summary: Optional[str] = None
    created_at: datetime


class SegmentReassessmentResult(BaseModel):
    segment_code: str
    previous_safety_score: Optional[float] = None
    new_safety_score: Optional[float] = None
    score_delta: Optional[float] = None
    previous_confidence: Optional[float] = None
    new_confidence: Optional[float] = None
    confidence_delta: Optional[float] = None
    previous_status: Optional[str] = None
    new_status: Optional[str] = None
    reassessment_applied: bool
    audit_log: Optional[ReassessmentAuditLogItem] = None
    message: str


class FeedbackSubmissionResult(BaseModel):
    feedback: FeedbackResponse
    reassessment_triggered: bool
    affected_segments: List[str]
    segment_reassessment: Optional[SegmentReassessmentResult] = None
    message: str


class FeedbackTypeCatalogItem(BaseModel):
    type_key: str
    label: str
    description: str
    default_intent: str
    affects_safety_score: bool
    requires_review: bool
    action_summary: str
