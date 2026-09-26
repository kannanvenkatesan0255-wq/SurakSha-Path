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
    
    # Metadata
    is_synthetic = Column(Boolean, default=True)  # Clear synthetic demonstration labeling
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    # Relationships
    evidence_items = relationship("EvidenceItem", back_populates="segment", cascade="all, delete-orphan")
    community_reports = relationship("CommunityReport", back_populates="segment")


class EvidenceItem(Base):
    """Represents a discrete piece of safety evidence tied to a road segment."""

    __tablename__ = "evidence_items"

    id = Column(Integer, primary_key=True, index=True)
    segment_id = Column(Integer, ForeignKey("road_segments.id"), index=True, nullable=False)
    source_type = Column(String(64), nullable=False)  # "INFRASTRUCTURE", "COMMUNITY", "POLICE_STATION", "LIGHTING_AUDIT"
    factor_name = Column(String(128), nullable=False)  # "Adequate Street Lighting", "Police Booth Proximity"
    impact_score = Column(Float, default=0.0)  # Positive or negative impact on safety (-10.0 to +10.0)
    confidence_weight = Column(Float, default=0.8)  # 0.0 to 1.0
    freshness_timestamp = Column(DateTime, default=utc_now)
    details = Column(Text, nullable=True)
    is_synthetic = Column(Boolean, default=True)

    segment = relationship("RoadSegment", back_populates="evidence_items")


class CommunityReport(Base):
    """Represents a crowd-sourced safety report with trust weighting."""

    __tablename__ = "community_reports"

    id = Column(Integer, primary_key=True, index=True)
    segment_id = Column(Integer, ForeignKey("road_segments.id"), nullable=True, index=True)
    category = Column(String(64), nullable=False)  # "POOR_LIGHTING", "DESERTED_AREA", "HARASSMENT", "ROAD_HAZARD", "POLICE_PATROL_ACTIVE"
    description = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    # Trust & Verification weighting
    reporter_id = Column(String(64), default="anon_user")
    reporter_reliability = Column(Float, default=0.8)  # 0.1 to 1.0 based on past verification
    confirmation_count = Column(Integer, default=1)  # Community upvotes / corroborations
    verification_status = Column(String(32), default="UNVERIFIED")  # "UNVERIFIED", "CORROBORATED", "OFFICIALLY_VERIFIED"
    
    # Timestamps for recency decay
    reported_at = Column(DateTime, default=utc_now)
    is_active = Column(Boolean, default=True)
    is_synthetic = Column(Boolean, default=True)

    segment = relationship("RoadSegment", back_populates="community_reports")


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
