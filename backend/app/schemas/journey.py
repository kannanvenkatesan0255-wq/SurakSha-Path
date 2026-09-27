"""Pydantic schemas for Journey Lifecycle, Safety Check-In, and SOS Workflow (Phase 14)."""

from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field


class JourneyStatus(str, Enum):
    """Permitted lifecycle states for a journey."""
    NOT_STARTED = "NOT_STARTED"
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class CheckInStatus(str, Enum):
    """Status of safety check-in prompts."""
    PENDING = "PENDING"
    CONFIRMED_OK = "CONFIRMED_OK"
    ASSISTANCE_REQUESTED = "ASSISTANCE_REQUESTED"
    MISSED = "MISSED"
    RESOLVED = "RESOLVED"


class JourneyEventType(str, Enum):
    """Categorization of audit log events recorded during journey monitoring."""
    JOURNEY_STARTED = "JOURNEY_STARTED"
    CHECK_IN_COMPLETED = "CHECK_IN_COMPLETED"
    CHECK_IN_MISSED = "CHECK_IN_MISSED"
    CHECK_IN_MISSED_RESOLVED = "CHECK_IN_MISSED_RESOLVED"
    JOURNEY_PAUSED = "JOURNEY_PAUSED"
    JOURNEY_RESUMED = "JOURNEY_RESUMED"
    SOS_ACTIVATED = "SOS_ACTIVATED"
    SOS_RESOLVED = "SOS_RESOLVED"
    JOURNEY_COMPLETED = "JOURNEY_COMPLETED"
    JOURNEY_CANCELLED = "JOURNEY_CANCELLED"


class LocationSharingStatus(str, Enum):
    """Location privacy state for the journey session."""
    OFF_BY_DEFAULT = "OFF_BY_DEFAULT"
    OPT_IN_ACTIVE = "OPT_IN_ACTIVE"
    PERMISSION_DENIED = "PERMISSION_DENIED"
    UNAVAILABLE = "UNAVAILABLE"
    SIMULATED_DEMO = "SIMULATED_DEMO"


class EmergencyHelpline(BaseModel):
    """Verified emergency telephone contact in Chennai."""
    name: str = Field(..., description="Official entity name")
    number: str = Field(..., description="Dialable telephone string")
    category: str = Field(..., description="Emergency domain (Police, Women, Medical, Disaster)")
    description: str = Field(..., description="Jurisdiction and purpose")
    dial_uri: str = Field(..., description="Standard RFC 3966 tel URI")
    operating_hours: str = Field(default="24/7 Toll-Free")


class ChennaiHelplinesResponse(BaseModel):
    """Official Chennai emergency contact directory."""
    city: str = "Chennai"
    helplines: List[EmergencyHelpline]
    disclaimer: str = Field(
        default="These numbers connect to actual Tamil Nadu emergency responders. The in-app prototype does not automatically dial or transmit location data.",
        description="Public safety disclaimer"
    )


class JourneyStartRequest(BaseModel):
    """Request payload to initiate a monitored journey."""
    origin: str = Field(..., min_length=2, description="Origin point or station")
    destination: str = Field(..., min_length=2, description="Destination point or station")
    route_id: Optional[str] = Field(None, description="Calculated route ID from routing engine")
    route_type: str = Field(default="BALANCED", description="FASTEST, BALANCED, or SAFEST")
    distance_km: Optional[float] = Field(None, ge=0.0, description="Estimated distance in km")
    duration_minutes: Optional[float] = Field(None, ge=0.0, description="Estimated duration in minutes")
    safety_score: Optional[float] = Field(None, ge=0.0, le=100.0, description="Aggregate Safety Score")
    confidence_score: Optional[float] = Field(None, ge=0.0, le=100.0, description="Data Confidence Score")
    check_in_interval_minutes: int = Field(default=15, ge=1, le=120, description="Scheduled check-in cadence in minutes")
    location_sharing_enabled: bool = Field(default=False, description="Explicit opt-in for location tracking")
    is_demo_mode: bool = Field(default=False, description="Whether simulation demo features are active")


class JourneyEventRecord(BaseModel):
    """Auditable minimal log entry for journey monitoring events."""
    event_id: str = Field(..., description="Unique event identifier")
    event_type: JourneyEventType = Field(..., description="Categorical event type")
    timestamp_ist: str = Field(..., description="Formatted timestamp in Asia/Kolkata (IST)")
    summary: str = Field(..., description="Brief human-readable message")
    details: Optional[str] = Field(None, description="Optional non-sensitive context or rationale")


class JourneySessionState(BaseModel):
    """Current state of an active, paused, or completed journey session."""
    journey_id: str = Field(..., description="Unique journey session ID")
    status: JourneyStatus = Field(..., description="Current lifecycle state")
    origin: str
    destination: str
    route_id: Optional[str] = None
    route_type: str = "BALANCED"
    distance_km: Optional[float] = None
    duration_minutes: Optional[float] = None
    safety_score: Optional[float] = None
    confidence_score: Optional[float] = None
    start_time_ist: str = Field(..., description="Session creation time in IST")
    elapsed_seconds: int = Field(default=0, ge=0, description="Cumulative active seconds")
    next_check_in_ist: Optional[str] = Field(None, description="Scheduled time for next safety check-in prompt")
    check_in_interval_minutes: int = 15
    check_in_status: CheckInStatus = CheckInStatus.PENDING
    missed_check_in_count: int = 0
    sos_active: bool = False
    location_sharing_status: LocationSharingStatus = LocationSharingStatus.OFF_BY_DEFAULT
    events: List[JourneyEventRecord] = Field(default_factory=list, description="Chronological event ledger")
    disclaimer: str = Field(
        default="Suraksha Path journey monitoring is an in-app prototype. It does not automatically notify police or dispatch emergency services.",
        description="Prototype safety notice"
    )


class JourneyTransitionRequest(BaseModel):
    """Command to execute a validated state transition on an existing journey."""
    journey_id: str = Field(..., description="Target journey identifier")
    action: str = Field(..., description="Action: pause, resume, complete, cancel, check_in_ok, check_in_help, sos_activate, sos_resolve")
    details: Optional[str] = Field(None, description="Optional operator or commuter notes")
