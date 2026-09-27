"""Domain models for Suraksha Path database."""

from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship
from ..database import Base

def utc_now():
    return datetime.now(timezone.utc)

class RoadSegment(Base):
    """Represents a discrete road segment in the urban transport network."""

    __tablename__ = "road_segments"

    id = Column(Integer, primary_key=True, index=True)
    segment_code = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    corridor = Column(String(128), index=True)  # e.g., "Anna Salai", "OMR", "Guindy"
    city = Column(String(64), default="Chennai")
    
    # Coordinates (start/end or GeoJSON coordinates)
    start_lat = Column(Float, nullable=False)
    start_lng = Column(Float, nullable=False)
    end_lat = Column(Float, nullable=False)
    end_lng = Column(Float, nullable=False)
    geometry_geojson = Column(Text, nullable=True)  # Detailed GeoJSON LineString
    length_meters = Column(Float, default=100.0)

    # Road Network Sourced Metadata (Phase 7)
    source_feature_id = Column(String(64), nullable=True, index=True)  # e.g., "way/24483756"
    road_classification = Column(String(64), nullable=True, index=True)  # e.g., "primary", "trunk", "secondary"
    source_dataset = Column(String(128), default="OpenStreetMap / Chennai Network")
    source_metadata_json = Column(Text, nullable=True)  # JSON string for lanes, oneway, maxspeed, surface
    from_node_id = Column(String(64), nullable=True)
    to_node_id = Column(String(64), nullable=True)

    # Core Safety & Context Attributes
    lighting_level = Column(Float, default=0.7)  # 0.0 to 1.0 (poor to excellent)
    crowd_density = Column(Float, default=0.6)  # 0.0 to 1.0 (isolated to active)
    police_presence = Column(Float, default=0.5)  # 0.0 to 1.0
    cctv_coverage = Column(Float, default=0.4)  # 0.0 to 1.0
    commercial_activity = Column(Float, default=0.6)  # 0.0 to 1.0

    # Scores
    baseline_safety_score = Column(Float, default=70.0)  # 0 to 100
    current_safety_score = Column(Float, default=70.0)  # Dynamically reassessed
    confidence_score = Column(Float, default=80.0)  # 0 to 100 (data completeness/recency)
    
    # Assessment & Evidence State (Phase 8)
    evidence_count = Column(Integer, default=0)
    assessment_status = Column(String(32), default="UNASSESSED")  # UNASSESSED, ASSESSED, LIMITED_EVIDENCE, INSUFFICIENT_DATA, STALE_EVIDENCE

    # Metadata
    is_synthetic = Column(Boolean, default=True)  # Clear synthetic demonstration labeling
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    evidence_items = relationship("EvidenceItem", back_populates="segment", cascade="all, delete-orphan")
    community_reports = relationship("CommunityReport", back_populates="segment")


class EvidenceItem(Base):
    """Represents a discrete, provenance-tracked piece of safety evidence."""

    __tablename__ = "evidence_items"

    id = Column(Integer, primary_key=True, index=True)
    evidence_id = Column(String(64), unique=True, index=True, nullable=False)
    segment_id = Column(Integer, ForeignKey("road_segments.id"), index=True, nullable=True)
    segment_code = Column(String(64), index=True, nullable=True)  # Direct stable link
    
    # Categorization & Provenance
    category = Column(String(64), index=True, nullable=False)  # LIGHTING, POLICE_PRESENCE, ROAD_CHARACTERISTIC, PEDESTRIAN_INFRASTRUCTURE, COMMUNITY_REPORT, INCIDENT
    source_type = Column(String(64), nullable=False)  # SOURCED_PUBLIC_DATA, MUNICIPAL_AUDIT, COMMUNITY_OBSERVATION, THIRD_PARTY, SYNTHETIC_BENCHMARK
    source_name = Column(String(128), nullable=False)  # e.g. "OpenStreetMap Contributors", "Greater Chennai Police"
    source_reference = Column(String(255), nullable=True)  # e.g. "OSM way/24483756", "Station Outpost Directory"
    
    factor_name = Column(String(128), nullable=False)  # Human-readable factor label
    impact_score = Column(Float, default=0.0)  # Relative heuristic influence (-10.0 to +10.0)
    confidence_weight = Column(Float, default=0.8)  # Data reliability weight (0.0 to 1.0)
    
    # Spatial Attributes
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    
    # Temporal & Freshness
    observed_at = Column(DateTime, nullable=True)  # Actual real-world observation/event timestamp
    ingested_at = Column(DateTime, default=utc_now)  # Database ingestion timestamp
    freshness_timestamp = Column(DateTime, default=utc_now)  # Kept for backward compatibility
    
    details = Column(Text, nullable=True)
    attributes_json = Column(Text, nullable=True)  # Structured JSON for category-specific properties
    verification_status = Column(String(32), default="UNVERIFIED")  # VERIFIED, CORROBORATED, UNVERIFIED, DISPUTED
    is_synthetic = Column(Boolean, default=False)  # Distinguishes real sourced data from synthetic benchmarks

    segment = relationship("RoadSegment", back_populates="evidence_items")


class CommunityReport(Base):
    """Represents a crowd-sourced safety observation with trust weighting (Phase 9)."""

    __tablename__ = "community_reports"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String(64), unique=True, index=True, nullable=False)
    segment_id = Column(Integer, ForeignKey("road_segments.id"), nullable=True, index=True)
    segment_code = Column(String(64), nullable=True, index=True)
    
    # Classification & Content
    category = Column(String(64), nullable=False, index=True)  # POOR_LIGHTING, DESERTED_STRETCH, OBSTRUCTED_FOOTPATH, etc.
    title = Column(String(128), nullable=True)
    description = Column(Text, nullable=False)
    location_name = Column(String(255), nullable=True)
    
    # Spatial Attributes
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    # Trust & Verification weighting
    reporter_id = Column(String(64), default="anon_user", index=True)
    reporter_reliability = Column(Float, default=0.75)  # 0.1 to 1.0 based on past verification
    confirmation_count = Column(Integer, default=0)  # Distinct user corroborations
    dispute_count = Column(Integer, default=0)  # Distinct user accuracy challenges
    flag_count = Column(Integer, default=0)  # Moderation flags
    
    # Transparent Lifecycle State
    verification_status = Column(String(32), default="SUBMITTED", index=True)  # SUBMITTED, UNDER_REVIEW, VERIFIED, DISPUTED, REJECTED, EXPIRED
    status_notes = Column(Text, nullable=True)
    
    # Temporal & Freshness
    observed_at = Column(DateTime, default=utc_now, nullable=False)  # Time of actual event/condition
    reported_at = Column(DateTime, default=utc_now)  # Time of database submission
    moderated_at = Column(DateTime, nullable=True)
    moderated_by = Column(String(64), nullable=True)
    expires_at = Column(DateTime, nullable=True)
    
    # Computed Calibrated Impact
    effective_trust_weight = Column(Float, default=0.5)  # Composite W in [0.0, 1.0]
    safety_score_impact = Column(Float, default=0.0)  # Signed effect on segment score (-10 to +8)
    
    is_active = Column(Boolean, default=True)
    is_synthetic = Column(Boolean, default=False)  # Distinguishes demo seeds from live community reports

    # Relationships
    segment = relationship("RoadSegment", back_populates="community_reports")
    interactions = relationship("ReportInteraction", back_populates="report", cascade="all, delete-orphan")


class ReportInteraction(Base):
    """
    Tracks individual user interactions (confirmations, disputes, flags)
    to strictly enforce single-interaction constraints and prevent manipulation.
    """

    __tablename__ = "report_interactions"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(Integer, ForeignKey("community_reports.id"), nullable=False, index=True)
    user_id = Column(String(64), nullable=False, index=True)
    interaction_type = Column(String(32), nullable=False)  # "CONFIRM", "DISPUTE", "FLAG"
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    __table_args__ = (
        UniqueConstraint("report_id", "user_id", "interaction_type", name="uq_report_user_interaction"),
    )

    report = relationship("CommunityReport", back_populates="interactions")


class RouteEvaluation(Base):
    """Stores generated route options for comparison and history."""

    __tablename__ = "route_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    origin_name = Column(String(128), nullable=False)
    destination_name = Column(String(128), nullable=False)
    origin_lat = Column(Float, nullable=False)
    origin_lng = Column(Float, nullable=False)
    destination_lat = Column(Float, nullable=False)
    destination_lng = Column(Float, nullable=False)
    
    route_type = Column(String(32), nullable=False)  # "FASTEST", "BALANCED", "SAFEST"
    total_distance_meters = Column(Float, nullable=False)
    total_duration_seconds = Column(Float, nullable=False)
    
    # Core separate metrics
    safety_score = Column(Float, nullable=False)  # 0 to 100
    confidence_score = Column(Float, nullable=False)  # 0 to 100
    
    explanation_summary = Column(Text, nullable=True)
    segments_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=utc_now)


class JourneyFeedback(Base):
    """User feedback submitted after a journey, enabling closed-loop reassessment."""

    __tablename__ = "journey_feedback"

    id = Column(Integer, primary_key=True, index=True)
    route_evaluation_id = Column(Integer, ForeignKey("route_evaluations.id"), nullable=True)
    affected_segment_code = Column(String(64), nullable=True, index=True)
    perceived_safety_rating = Column(Integer, nullable=False)  # 1 (very unsafe) to 5 (very safe)
    felt_safe = Column(Boolean, default=True)
    encountered_issues = Column(Text, nullable=True)
    comments = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    processed_for_reassessment = Column(Boolean, default=False)


class AssessmentFeedback(Base):
    """
    Structured user feedback for continuous model improvement and controlled reassessment (Phase 12).
    Tracks feedback type, operational intent, spatial association, review lifecycle,
    and whether reassessment was executed.
    """

    __tablename__ = "assessment_feedback"

    id = Column(Integer, primary_key=True, index=True)
    feedback_id = Column(String(64), unique=True, index=True, nullable=False)
    feedback_type = Column(String(64), nullable=False, index=True)  # CONDITION_CHANGED, OBSERVATION_OUTDATED, etc.
    operational_intent = Column(String(64), default="NEW_OBSERVATION", index=True)  # NEW_OBSERVATION, CORRECTION, CONFIRMATION, DISPUTE, GENERAL_FEEDBACK
    target_type = Column(String(32), default="SEGMENT", index=True)  # SEGMENT, ROUTE, REPORT, GENERAL
    target_id = Column(String(64), nullable=True, index=True)
    
    # Target associations
    target_segment_code = Column(String(64), nullable=True, index=True)
    target_route_id = Column(String(64), nullable=True, index=True)
    target_report_id = Column(String(64), nullable=True, index=True)
    
    # Geographic location
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    location_name = Column(String(255), nullable=True)
    
    # Observation time vs Submission time (distinguished)
    observed_at = Column(DateTime, nullable=True)
    submitted_at = Column(DateTime, default=utc_now, nullable=False)
    
    # Feedback content
    description = Column(Text, nullable=False)
    supporting_evidence_url = Column(String(255), nullable=True)
    
    # Reporter & Privacy
    reporter_id = Column(String(64), default="anon_user", index=True)
    reporter_reliability = Column(Float, default=0.75)
    
    # Transparent Lifecycle State
    status = Column(String(32), default="SUBMITTED", index=True)  # SUBMITTED, PENDING_REVIEW, ACCEPTED, REJECTED, DISPUTED, RESOLVED, EXPIRED
    review_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(String(64), nullable=True)
    
    # Reassessment execution tracking
    reassessment_applied = Column(Boolean, default=False)
    reassessment_timestamp = Column(DateTime, nullable=True)
    
    # Abuse prevention & idempotency
    idempotency_key = Column(String(64), nullable=True, index=True)
    is_synthetic = Column(Boolean, default=False)


class ReassessmentAuditLog(Base):
    """
    Auditable history of segment-level and route-level safety reassessments (Phase 12).
    Captures before-and-after scores, confidence deltas, and triggering feedback.
    """

    __tablename__ = "reassessment_audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    audit_id = Column(String(64), unique=True, index=True, nullable=False)
    trigger_type = Column(String(64), nullable=False, index=True)  # FEEDBACK_SUBMISSION, FEEDBACK_REVIEW, COMMUNITY_CORROBORATION, STALE_DECAY, ADMIN_OVERRIDE
    trigger_reference_id = Column(String(64), nullable=False, index=True)  # e.g., "FBK-XXXX" or "REP-XXXX"
    
    segment_code = Column(String(64), nullable=True, index=True)
    route_id = Column(String(64), nullable=True, index=True)
    
    # Before and after metrics
    previous_safety_score = Column(Float, nullable=True)
    new_safety_score = Column(Float, nullable=True)
    score_delta = Column(Float, nullable=True)
    
    previous_confidence = Column(Float, nullable=True)
    new_confidence = Column(Float, nullable=True)
    confidence_delta = Column(Float, nullable=True)
    
    previous_status = Column(String(32), nullable=True)
    new_status = Column(String(32), nullable=True)
    
    explanation_summary = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

