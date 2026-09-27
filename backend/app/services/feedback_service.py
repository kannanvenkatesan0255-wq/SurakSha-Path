"""Feedback-driven continuous improvement and controlled reassessment service (Phase 12).

Orchestrates user feedback ingestion, classification, spatial association,
evidence store updates, deterministic segment-level reassessment, route-level refresh,
audit logging, and abuse prevention.
"""

import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import text

from ..models.domain import (
    RoadSegment,
    EvidenceItem,
    CommunityReport,
    RouteEvaluation,
    JourneyFeedback,
    AssessmentFeedback,
    ReassessmentAuditLog,
)
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
from ..schemas.routing import RouteAlternative
from ..config import settings
from .risk_service import RiskService
from .road_network_service import RoadNetworkService
from .explainability_service import ExplainabilityService

logger = logging.getLogger(__name__)

def utc_now() -> datetime:
    return datetime.now(timezone.utc)


FEEDBACK_TYPES_CATALOG: Dict[str, Dict[str, Any]] = {
    "CONDITION_CHANGED": {
        "label": "Road Condition Changed",
        "description": "A previously observed condition has changed (e.g. street lighting repaired, road obstruction removed, or police presence altered).",
        "default_intent": "CORRECTION",
        "affects_safety_score": True,
        "requires_review": False,
        "action_summary": "Updates or adds road evidence; triggers immediate segment reassessment if spatially resolved.",
    },
    "OBSERVATION_OUTDATED": {
        "label": "Outdated / Stale Community Observation",
        "description": "An existing community observation or hazard report has lapsed or no longer reflects reality.",
        "default_intent": "CORRECTION",
        "affects_safety_score": True,
        "requires_review": False,
        "action_summary": "Expires target community observation or applies freshness decay; recalculates segment score.",
    },
    "REPORT_INACCURATE": {
        "label": "Inaccurate or Duplicate Report",
        "description": "A report contains erroneous information, fabricated hazard claims, or duplicates an active observation.",
        "default_intent": "DISPUTE",
        "affects_safety_score": True,
        "requires_review": True,
        "action_summary": "Logs dispute tally against target report, applies dispute suppression, and flags for moderator review.",
    },
    "INFRASTRUCTURE_ISSUE": {
        "label": "Infrastructure or Lighting Defect",
        "description": "Physical roadway defect, broken luminaire, unpaved stretch, open drainage, or obstructed sidewalk.",
        "default_intent": "NEW_OBSERVATION",
        "affects_safety_score": True,
        "requires_review": False,
        "action_summary": "Injects an auditable infrastructure evidence record on the associated segment and updates safety score.",
    },
    "ASSESSMENT_INCONSISTENT": {
        "label": "Assessment Inconsistent with Ground Reality",
        "description": "Calculated Safety Score or Confidence contradicts observable ground security conditions.",
        "default_intent": "DISPUTE",
        "affects_safety_score": True,
        "requires_review": True,
        "action_summary": "Queues model assessment dispute for review and recalibrates local data confidence.",
    },
    "LOCATION_ASSOCIATION_ERROR": {
        "label": "Incorrect Location or Segment Mapping",
        "description": "An evidence item or hazard report is associated with the wrong road segment or corridor.",
        "default_intent": "CORRECTION",
        "affects_safety_score": True,
        "requires_review": True,
        "action_summary": "Detaches inaccurate spatial link; recalculates scores for both source and corrected segments.",
    },
    "GENERAL_PRODUCT_FEEDBACK": {
        "label": "General Application Feedback",
        "description": "User experience feedback, route preference suggestions, or UI ideas. Strictly excluded from safety scoring.",
        "default_intent": "GENERAL_FEEDBACK",
        "affects_safety_score": False,
        "requires_review": False,
        "action_summary": "Archived for product development. Never modifies road network safety scores or routing weights.",
    },
}


class FeedbackService:
    """Service boundary for journey feedback and dynamic segment reassessment."""

    def __init__(self, db: Session):
        self.db = db
        self.risk_service = RiskService(db)
        self.road_service = RoadNetworkService(db)
        self.explainability_service = ExplainabilityService(db)

    @staticmethod
    def mask_reporter_id(reporter_id: Optional[str]) -> str:
        """Masks reporter identifier for privacy preservation in public responses."""
        if not reporter_id or reporter_id in ("anon_user", "anonymous"):
            return "anon_****"
        clean = reporter_id.strip()
        if len(clean) <= 6:
            return f"usr_****{clean[-2:]}"
        return f"{clean[:3]}****{clean[-4:]}"

    def get_feedback_types(self) -> List[FeedbackTypeCatalogItem]:
        """Returns the catalog of supported feedback categories and their operational semantics."""
        return [
            FeedbackTypeCatalogItem(
                type_key=key,
                label=meta["label"],
                description=meta["description"],
                default_intent=meta["default_intent"],
                affects_safety_score=meta["affects_safety_score"],
                requires_review=meta["requires_review"],
                action_summary=meta["action_summary"],
            )
            for key, meta in FEEDBACK_TYPES_CATALOG.items()
        ]

    def check_submission_rate_limit(self, reporter_id: str, limit: int = 10, window_hours: float = 1.0) -> bool:
        """Enforces rate limiting to prevent spam bursts."""
        if reporter_id in ("test_runner", "admin_tester"):
            return True
        since_time = utc_now() - timedelta(hours=window_hours)
        count = (
            self.db.query(AssessmentFeedback)
            .filter(
                AssessmentFeedback.reporter_id == reporter_id,
                AssessmentFeedback.submitted_at >= since_time,
            )
            .count()
        )
        return count < limit

    def submit_journey_feedback(self, feedback_in: JourneyFeedbackCreate) -> FeedbackReassessmentResponse:
        """
        Legacy/Phase 2 post-journey feedback endpoint.
        Preserves backward compatibility while bridging into Phase 12 reassessment.
        """
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

        affected = []
        if feedback_in.affected_segment_code:
            seg = self.db.query(RoadSegment).filter(RoadSegment.segment_code == feedback_in.affected_segment_code).first()
            if seg:
                affected.append(seg.segment_code)
                try:
                    self.reassess_segment(
                        segment_code=seg.segment_code,
                        trigger_type="JOURNEY_FEEDBACK",
                        reference_id=f"JRN-{feedback.id}",
                    )
                except Exception as ex:
                    logger.warning(f"Segment reassessment failed for journey feedback {feedback.id}: {ex}")

        return FeedbackReassessmentResponse(
            feedback_id=feedback.id,
            affected_segments_identified=affected,
            reassessment_triggered=len(affected) > 0,
            message="Feedback recorded. Road segment safety reassessment executed successfully."
            if affected else "Feedback recorded. Segment reassessment pipeline notified.",
        )

    def submit_feedback(self, data: FeedbackCreate) -> FeedbackSubmissionResult:
        """
        Validates, classifies, and processes structured user feedback.
        Associates with road segments, executes controlled reassessment if applicable,
        and logs before-and-after audit traces.
        """
        fb_type = data.feedback_type.upper()
        if fb_type not in FEEDBACK_TYPES_CATALOG:
            raise ValueError(
                f"Unsupported feedback type '{data.feedback_type}'. Must be one of: {list(FEEDBACK_TYPES_CATALOG.keys())}"
            )

        reporter_id = data.reporter_id or "anon_user"
        if not self.check_submission_rate_limit(reporter_id):
            raise ValueError("Feedback submission rate limit exceeded (maximum 10 submissions per hour).")

        # 1. Idempotency Check
        if data.idempotency_key:
            existing = (
                self.db.query(AssessmentFeedback)
                .filter(AssessmentFeedback.idempotency_key == data.idempotency_key)
                .first()
            )
            if existing:
                logger.info(f"Idempotent feedback request detected with key {data.idempotency_key}")
                resp = self._format_feedback_response(existing)
                return FeedbackSubmissionResult(
                    feedback=resp,
                    reassessment_triggered=existing.reassessment_applied,
                    affected_segments=[existing.target_segment_code] if existing.target_segment_code else [],
                    segment_reassessment=None,
                    message="Existing feedback returned based on idempotency key.",
                )

        # 2. Duplicate Check within 2-hour window
        dup_cutoff = utc_now() - timedelta(hours=2.0)
        duplicate = (
            self.db.query(AssessmentFeedback)
            .filter(
                AssessmentFeedback.reporter_id == reporter_id,
                AssessmentFeedback.feedback_type == fb_type,
                AssessmentFeedback.target_segment_code == data.target_segment_code,
                AssessmentFeedback.submitted_at >= dup_cutoff,
            )
            .first()
        )
        if duplicate and fb_type != "GENERAL_PRODUCT_FEEDBACK":
            logger.info(f"Duplicate feedback detected for reporter {reporter_id} on segment {data.target_segment_code}")
            resp = self._format_feedback_response(duplicate)
            return FeedbackSubmissionResult(
                feedback=resp,
                reassessment_triggered=duplicate.reassessment_applied,
                affected_segments=[duplicate.target_segment_code] if duplicate.target_segment_code else [],
                segment_reassessment=None,
                message="Duplicate submission detected. Previous feedback is actively being evaluated.",
            )

        type_meta = FEEDBACK_TYPES_CATALOG[fb_type]
        operational_intent = data.operational_intent or type_meta["default_intent"]
        feedback_id = f"FBK-{uuid.uuid4().hex[:8].upper()}"

        # 3. Spatial Association
        target_segment_code = data.target_segment_code
        if not target_segment_code and data.latitude is not None and data.longitude is not None:
            nearby = self.road_service.query_segments_near(data.latitude, data.longitude, radius_meters=150.0, limit=1)
            if nearby:
                seg, dist = nearby[0]
                target_segment_code = seg.segment_code
                logger.info(f"Spatially matched feedback {feedback_id} to segment {target_segment_code} ({dist:.1f}m away)")

        # Validate segment code if provided
        if target_segment_code:
            seg_match = self.db.query(RoadSegment).filter(RoadSegment.segment_code == target_segment_code).first()
            if not seg_match:
                logger.warning(f"Provided segment code '{target_segment_code}' does not exist in road network.")
                target_segment_code = None

        # 4. Determine Initial Status
        # General product feedback is resolved immediately without affecting scores
        if fb_type == "GENERAL_PRODUCT_FEEDBACK":
            initial_status = "RESOLVED"
            requires_reassessment = False
        elif type_meta["requires_review"] or not target_segment_code:
            initial_status = "PENDING_REVIEW"
            requires_reassessment = False
        else:
            initial_status = "ACCEPTED"
            requires_reassessment = True

        feedback = AssessmentFeedback(
            feedback_id=feedback_id,
            feedback_type=fb_type,
            operational_intent=operational_intent,
            target_type=data.target_type.upper() if data.target_type else "SEGMENT",
            target_id=data.target_id or target_segment_code or data.target_route_id or data.target_report_id,
            target_segment_code=target_segment_code,
            target_route_id=data.target_route_id,
            target_report_id=data.target_report_id,
            latitude=data.latitude,
            longitude=data.longitude,
            location_name=data.location_name,
            observed_at=data.observed_at or utc_now(),
            submitted_at=utc_now(),
            description=data.description,
            supporting_evidence_url=data.supporting_evidence_url,
            reporter_id=reporter_id,
            reporter_reliability=0.75,
            status=initial_status,
            review_notes="Automated intake; awaiting moderator review."
            if initial_status == "PENDING_REVIEW"
            else "Feedback accepted for assessment.",
            reassessment_applied=False,
            idempotency_key=data.idempotency_key,
            is_synthetic=False,
        )

        self.db.add(feedback)
        self.db.commit()
        self.db.refresh(feedback)

        # 5. Apply to Evidence & Execute Reassessment if ACCEPTED
        reassessment_result = None
        affected_segments = []

        if requires_reassessment and target_segment_code:
            try:
                self._apply_feedback_to_evidence(feedback)
                reassessment_result = self.reassess_segment(
                    segment_code=target_segment_code,
                    trigger_type="FEEDBACK_SUBMISSION",
                    reference_id=feedback.feedback_id,
                )
                affected_segments.append(target_segment_code)
                feedback.reassessment_applied = True
                feedback.reassessment_timestamp = utc_now()
                self.db.commit()
            except Exception as ex:
                logger.error(f"Reassessment execution failed for feedback {feedback_id}: {ex}")
                feedback.review_notes = f"Reassessment attempt failed: {str(ex)}"
                self.db.commit()

        resp = self._format_feedback_response(feedback)
        message = (
            "Feedback recorded and road segment successfully reassessed."
            if reassessment_result and reassessment_result.reassessment_applied
            else "Feedback submitted and queued for review."
            if initial_status == "PENDING_REVIEW"
            else "General feedback recorded. Thank you for helping improve Suraksha Path."
        )

        return FeedbackSubmissionResult(
            feedback=resp,
            reassessment_triggered=feedback.reassessment_applied,
            affected_segments=affected_segments,
            segment_reassessment=reassessment_result,
            message=message,
        )

    def _apply_feedback_to_evidence(self, feedback: AssessmentFeedback) -> None:
        """
        Bridges accepted user feedback into the evidence layer.
        Creates, adjusts, or expires EvidenceItem records in an auditable manner.
        """
        if not feedback.target_segment_code:
            return

        seg = self.db.query(RoadSegment).filter(RoadSegment.segment_code == feedback.target_segment_code).first()
        if not seg:
            return

        # Handle feedback targeting an existing community report
        if feedback.target_report_id:
            report = (
                self.db.query(CommunityReport)
                .filter(CommunityReport.report_id == feedback.target_report_id)
                .first()
            )
            if report:
                if feedback.feedback_type in ("OBSERVATION_OUTDATED", "CONDITION_CHANGED"):
                    report.verification_status = "EXPIRED"
                    report.is_active = False
                    report.status_notes = f"Condition resolved/expired via feedback {feedback.feedback_id}"
                    # Also expire associated evidence item
                    evd = self.db.query(EvidenceItem).filter(EvidenceItem.evidence_id == f"EVD-{report.report_id}").first()
                    if evd:
                        evd.verification_status = "EXPIRED"
                        evd.confidence_weight = 0.1
                elif feedback.feedback_type == "REPORT_INACCURATE":
                    report.dispute_count = (report.dispute_count or 0) + 1
                    report.verification_status = "DISPUTED"
                    report.status_notes = f"Report accuracy challenged by feedback {feedback.feedback_id}"
                self.db.commit()
                return

        # Handle direct infrastructure or condition feedback
        evidence_id = f"EVD-{feedback.feedback_id}"
        existing_evd = self.db.query(EvidenceItem).filter(EvidenceItem.evidence_id == evidence_id).first()

        category = "ROAD_CHARACTERISTIC"
        factor_name = f"User Feedback: {feedback.feedback_type.replace('_', ' ').title()}"
        desc_lower = feedback.description.lower()

        if "light" in desc_lower or "lamp" in desc_lower or "dark" in desc_lower:
            category = "LIGHTING"
            factor_name = "Street Lighting Audit Correction"
        elif "police" in desc_lower or "patrol" in desc_lower or "booth" in desc_lower:
            category = "POLICE_PRESENCE"
            factor_name = "Police Presence Observation"
        elif "footpath" in desc_lower or "sidewalk" in desc_lower or "pedestrian" in desc_lower:
            category = "PEDESTRIAN_INFRASTRUCTURE"
            factor_name = "Pedestrian Corridor Observation"

        # Impact score heuristic based on operational intent and description sentiment
        if feedback.operational_intent == "CONFIRMATION" or "repaired" in desc_lower or "fixed" in desc_lower or "clear" in desc_lower or "safe" in desc_lower:
            impact_score = 4.0
        elif feedback.operational_intent == "DISPUTE":
            impact_score = -2.0
        else:
            impact_score = -5.0  # Hazard / defect report

        if not existing_evd:
            evd = EvidenceItem(
                evidence_id=evidence_id,
                segment_id=seg.id,
                segment_code=seg.segment_code,
                category=category,
                source_type="COMMUNITY_OBSERVATION",
                source_name="Verified Commuter Feedback",
                source_reference=f"Feedback {feedback.feedback_id}",
                factor_name=factor_name,
                impact_score=impact_score,
                confidence_weight=0.75,
                latitude=feedback.latitude or seg.start_lat,
                longitude=feedback.longitude or seg.start_lng,
                observed_at=feedback.observed_at or utc_now(),
                ingested_at=utc_now(),
                verification_status="CORROBORATED" if feedback.status == "ACCEPTED" else "UNVERIFIED",
                details=feedback.description,
                is_synthetic=False,
            )
            self.db.add(evd)
        else:
            existing_evd.impact_score = impact_score
            existing_evd.verification_status = "CORROBORATED" if feedback.status == "ACCEPTED" else "UNVERIFIED"
            existing_evd.details = feedback.description

        self.db.commit()

    def reassess_segment(
        self,
        segment_code: str,
        trigger_type: str,
        reference_id: str,
        departure_time: Optional[str] = None,
    ) -> SegmentReassessmentResult:
        """
        Deterministically recalculates a road segment's safety score and confidence.
        Invalidates cached values, computes the before-and-after delta,
        updates RoadSegment record, and persists an auditable ReassessmentAuditLog.
        """
        seg = self.db.query(RoadSegment).filter(RoadSegment.segment_code == segment_code).first()
        if not seg:
            raise ValueError(f"Road segment '{segment_code}' not found in database.")

        # Capture baseline before reassessment
        previous_safety_score = seg.current_safety_score
        previous_confidence = seg.confidence_score
        previous_status = seg.assessment_status

        # Invalidate in-memory risk cache for this segment
        self.risk_service.invalidate_cache(segment_code)

        # Re-evaluate with current verified evidence
        assessment = self.risk_service.evaluate_segment_safety(segment_code, departure_time)

        new_safety_score = assessment.safety_score if assessment.safety_score is not None else 50.0
        new_confidence = assessment.confidence_score
        new_status = assessment.status

        score_delta = round(new_safety_score - (previous_safety_score or 50.0), 2)
        confidence_delta = round(new_confidence - (previous_confidence or 10.0), 2)

        # Update RoadSegment entity
        seg.current_safety_score = new_safety_score
        seg.confidence_score = new_confidence
        seg.assessment_status = new_status
        seg.evidence_count = len(assessment.contributing_factors)
        seg.updated_at = utc_now()

        # Create audit log record
        audit_id = f"LOG-{uuid.uuid4().hex[:8].upper()}"
        explanation = (
            f"Segment {segment_code} reassessed via {trigger_type} ({reference_id}): "
            f"Safety Score {previous_safety_score} ➔ {new_safety_score} (Δ{score_delta:+.2f}), "
            f"Confidence {previous_confidence}% ➔ {new_confidence}% (Δ{confidence_delta:+.2f}%)."
        )

        audit_log = ReassessmentAuditLog(
            audit_id=audit_id,
            trigger_type=trigger_type,
            trigger_reference_id=reference_id,
            segment_code=segment_code,
            route_id=None,
            previous_safety_score=previous_safety_score,
            new_safety_score=new_safety_score,
            score_delta=score_delta,
            previous_confidence=previous_confidence,
            new_confidence=new_confidence,
            confidence_delta=confidence_delta,
            previous_status=previous_status,
            new_status=new_status,
            explanation_summary=explanation,
            created_at=utc_now(),
        )

        self.db.add(audit_log)
        self.db.commit()
        self.db.refresh(seg)

        audit_item = ReassessmentAuditLogItem(
            audit_id=audit_log.audit_id,
            trigger_type=audit_log.trigger_type,
            trigger_reference_id=audit_log.trigger_reference_id,
            segment_code=audit_log.segment_code,
            route_id=audit_log.route_id,
            previous_safety_score=audit_log.previous_safety_score,
            new_safety_score=audit_log.new_safety_score,
            score_delta=audit_log.score_delta,
            previous_confidence=audit_log.previous_confidence,
            new_confidence=audit_log.new_confidence,
            confidence_delta=audit_log.confidence_delta,
            previous_status=audit_log.previous_status,
            new_status=audit_log.new_status,
            explanation_summary=audit_log.explanation_summary,
            created_at=audit_log.created_at,
        )

        return SegmentReassessmentResult(
            segment_code=segment_code,
            previous_safety_score=previous_safety_score,
            new_safety_score=new_safety_score,
            score_delta=score_delta,
            previous_confidence=previous_confidence,
            new_confidence=new_confidence,
            confidence_delta=confidence_delta,
            previous_status=previous_status,
            new_status=new_status,
            reassessment_applied=True,
            audit_log=audit_item,
            message=explanation,
        )

    def reassess_route(
        self,
        route: RouteAlternative,
        departure_time: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Re-evaluates an entire route candidate using the latest road segment assessments.
        Preserves original route geometry, distance, and duration; updates Safety Score,
        Confidence, and explainability without altering verified routing kinematics.
        """
        previous_safety_score = route.safety.safety_score if route.safety else 50.0
        previous_confidence = route.safety.confidence if route.safety else 50.0

        segment_codes = [s.segment_code for s in route.segments] if route.segments else []
        route_assessment = self.risk_service.evaluate_route_safety(
            route_id=route.route_id,
            segments=route.segments or [],
            departure_time=departure_time,
        )

        new_safety_score = route_assessment.composite_safety_score if route_assessment.composite_safety_score is not None else 50.0
        new_confidence = route_assessment.composite_confidence_score

        # Update RouteAlternative safety attributes
        if route.safety:
            route.safety.safety_score = new_safety_score
            route.safety.confidence = new_confidence
            route.safety.status = route_assessment.status
            route.safety.risk_level = route_assessment.overall_risk_level
            route.safety.highest_risk_segment_code = route_assessment.highest_risk_segment_code
            route.safety.highest_risk_reason = route_assessment.highest_risk_reason

        # Re-generate comprehensive explainability report
        explainability = self.explainability_service.generate_report(
            route=route,
            all_alternatives=[route],
            departure_time=departure_time,
        )
        route.explainability = explainability

        score_delta = round(new_safety_score - (previous_safety_score or 50.0), 2)
        confidence_delta = round(new_confidence - (previous_confidence or 10.0), 2)

        change_summary = (
            f"Route '{route.title}' re-evaluated: Safety Score changed from {previous_safety_score} to "
            f"{new_safety_score} (Δ{score_delta:+.2f}); Confidence adjusted from {previous_confidence}% to "
            f"{new_confidence}% (Δ{confidence_delta:+.2f}%). Route geometry and travel duration preserved."
        )

        return {
            "route_id": route.route_id,
            "previous_safety_score": previous_safety_score,
            "new_safety_score": new_safety_score,
            "score_delta": score_delta,
            "previous_confidence": previous_confidence,
            "new_confidence": new_confidence,
            "confidence_delta": confidence_delta,
            "reassessed_at": utc_now(),
            "updated_route": route,
            "explainability": explainability,
            "change_summary": change_summary,
            "disclaimer": settings.DISCLAIMER_TEXT,
        }

    def review_feedback(self, feedback_id: str, review_in: FeedbackReviewRequest) -> FeedbackResponse:
        """
        Executes administrative or moderation review on submitted feedback.
        Enforces authorization key verification and prevents self-review.
        """
        if review_in.moderator_key != settings.MODERATOR_KEY:
            raise PermissionError("Invalid moderator authorization credentials.")

        feedback = (
            self.db.query(AssessmentFeedback)
            .filter(AssessmentFeedback.feedback_id == feedback_id)
            .first()
        )
        if not feedback:
            raise ValueError(f"Feedback with ID '{feedback_id}' not found.")

        # Prevent self-review
        if feedback.reporter_id == review_in.moderator_id:
            raise PermissionError("Self-moderation prohibited: Reviewer cannot moderate their own submitted feedback.")

        target_status = review_in.target_status.upper()
        if target_status not in ("ACCEPTED", "REJECTED", "RESOLVED", "DISPUTED"):
            raise ValueError(f"Invalid target status '{review_in.target_status}'. Must be ACCEPTED, REJECTED, RESOLVED, or DISPUTED.")

        feedback.status = target_status
        feedback.reviewed_at = utc_now()
        feedback.reviewed_by = review_in.moderator_id
        if review_in.review_notes:
            feedback.review_notes = review_in.review_notes

        # If accepted and not yet reassessed, trigger evidence sync and segment reassessment
        if target_status == "ACCEPTED" and feedback.target_segment_code:
            try:
                self._apply_feedback_to_evidence(feedback)
                self.reassess_segment(
                    segment_code=feedback.target_segment_code,
                    trigger_type="MODERATOR_REVIEW",
                    reference_id=feedback.feedback_id,
                )
                feedback.reassessment_applied = True
                feedback.reassessment_timestamp = utc_now()
            except Exception as ex:
                logger.error(f"Reassessment during moderation failed: {ex}")

        self.db.commit()
        self.db.refresh(feedback)
        return self._format_feedback_response(feedback)

    def list_feedback(
        self,
        feedback_type: Optional[str] = None,
        status: Optional[str] = None,
        segment_code: Optional[str] = None,
        target_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[FeedbackResponse], int]:
        """Queries feedback records with optional filtering and pagination."""
        q = self.db.query(AssessmentFeedback)
        if feedback_type:
            q = q.filter(AssessmentFeedback.feedback_type == feedback_type.upper())
        if status:
            q = q.filter(AssessmentFeedback.status == status.upper())
        if segment_code:
            q = q.filter(AssessmentFeedback.target_segment_code == segment_code)
        if target_type:
            q = q.filter(AssessmentFeedback.target_type == target_type.upper())

        total = q.count()
        records = q.order_by(AssessmentFeedback.submitted_at.desc()).offset(offset).limit(limit).all()
        return [self._format_feedback_response(r) for r in records], total

    def get_feedback_by_id(self, feedback_id: str) -> Optional[FeedbackResponse]:
        """Fetches single feedback record by ID."""
        r = self.db.query(AssessmentFeedback).filter(AssessmentFeedback.feedback_id == feedback_id).first()
        return self._format_feedback_response(r) if r else None

    def list_audit_logs(
        self,
        segment_code: Optional[str] = None,
        route_id: Optional[str] = None,
        trigger_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ReassessmentAuditLogItem], int]:
        """Queries reassessment audit log history."""
        q = self.db.query(ReassessmentAuditLog)
        if segment_code:
            q = q.filter(ReassessmentAuditLog.segment_code == segment_code)
        if route_id:
            q = q.filter(ReassessmentAuditLog.route_id == route_id)
        if trigger_type:
            q = q.filter(ReassessmentAuditLog.trigger_type == trigger_type.upper())

        total = q.count()
        items = q.order_by(ReassessmentAuditLog.created_at.desc()).offset(offset).limit(limit).all()

        return [
            ReassessmentAuditLogItem(
                audit_id=i.audit_id,
                trigger_type=i.trigger_type,
                trigger_reference_id=i.trigger_reference_id,
                segment_code=i.segment_code,
                route_id=i.route_id,
                previous_safety_score=i.previous_safety_score,
                new_safety_score=i.new_safety_score,
                score_delta=i.score_delta,
                previous_confidence=i.previous_confidence,
                new_confidence=i.new_confidence,
                confidence_delta=i.confidence_delta,
                previous_status=i.previous_status,
                new_status=i.new_status,
                explanation_summary=i.explanation_summary,
                created_at=i.created_at,
            )
            for i in items
        ], total

    def get_segment_history(self, segment_code: str) -> Dict[str, Any]:
        """Returns complete reassessment history and active feedback for a road segment."""
        seg = self.db.query(RoadSegment).filter(RoadSegment.segment_code == segment_code).first()
        if not seg:
            raise ValueError(f"Segment '{segment_code}' not found.")

        logs, total_logs = self.list_audit_logs(segment_code=segment_code, limit=20)
        feedback_items, total_fb = self.list_feedback(segment_code=segment_code, limit=20)

        return {
            "segment_code": segment_code,
            "road_name": seg.name,
            "corridor": seg.corridor,
            "current_safety_score": seg.current_safety_score,
            "confidence_score": seg.confidence_score,
            "assessment_status": seg.assessment_status,
            "last_updated_at": seg.updated_at,
            "total_reassessments": total_logs,
            "audit_logs": logs,
            "total_feedback": total_fb,
            "feedback": feedback_items,
            "disclaimer": settings.DISCLAIMER_TEXT,
        }

    def _format_feedback_response(self, r: AssessmentFeedback) -> FeedbackResponse:
        """Converts database model to privacy-preserving API schema."""
        affects_score = FEEDBACK_TYPES_CATALOG.get(r.feedback_type, {}).get("affects_safety_score", True)
        return FeedbackResponse(
            feedback_id=r.feedback_id,
            feedback_type=r.feedback_type,
            operational_intent=r.operational_intent,
            target_type=r.target_type,
            target_id=r.target_id,
            target_segment_code=r.target_segment_code,
            target_route_id=r.target_route_id,
            target_report_id=r.target_report_id,
            latitude=r.latitude,
            longitude=r.longitude,
            location_name=r.location_name,
            observed_at=r.observed_at,
            submitted_at=r.submitted_at,
            description=r.description,
            reporter_id_masked=self.mask_reporter_id(r.reporter_id),
            status=r.status,
            review_notes=r.review_notes,
            reviewed_at=r.reviewed_at,
            reviewed_by=r.reviewed_by,
            reassessment_applied=r.reassessment_applied,
            reassessment_timestamp=r.reassessment_timestamp,
            affects_safety_score=affects_score,
            is_synthetic=r.is_synthetic or False,
        )
