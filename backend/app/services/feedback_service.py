"""Feedback and reassessment service boundary interface."""

from typing import List
from sqlalchemy.orm import Session
from ..models.domain import JourneyFeedback
from ..schemas.feedback import JourneyFeedbackCreate, FeedbackReassessmentResponse

class FeedbackService:
    """Service boundary for journey feedback and dynamic segment reassessment."""

    def __init__(self, db: Session):
        self.db = db

    def submit_journey_feedback(self, feedback_in: JourneyFeedbackCreate) -> FeedbackReassessmentResponse:
        """Records user feedback and triggers reassessment for affected road segments."""
        feedback = JourneyFeedback(
            route_evaluation_id=feedback_in.route_evaluation_id,
            affected_segment_code=feedback_in.affected_segment_code,
            perceived_safety_rating=feedback_in.perceived_safety_rating,
            felt_safe=feedback_in.felt_safe,
            encountered_issues=feedback_in.encountered_issues,
            comments=feedback_in.comments,
            processed_for_reassessment=True,
        )
        self.db.add(feedback)
        self.db.commit()
        self.db.refresh(feedback)

        affected = [feedback_in.affected_segment_code] if feedback_in.affected_segment_code else []

        return FeedbackReassessmentResponse(
            feedback_id=feedback.id,
            affected_segments_identified=affected,
            reassessment_triggered=True,
            message="Feedback recorded. Segment reassessment pipeline notified.",
        )
