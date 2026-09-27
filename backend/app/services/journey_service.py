"""Journey Lifecycle, Safety Check-In, and SOS Workflow Service (Phase 14).

Manages state machine transitions, safety check-in scheduling,
emergency helpline directories, and auditable event ledgers for Chennai commuters.
"""

import uuid
import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import Dict, List, Optional
from fastapi import HTTPException, status

from ..schemas.journey import (
    JourneyStatus,
    CheckInStatus,
    JourneyEventType,
    LocationSharingStatus,
    EmergencyHelpline,
    ChennaiHelplinesResponse,
    JourneyStartRequest,
    JourneyEventRecord,
    JourneySessionState,
    JourneyTransitionRequest,
)

logger = logging.getLogger(__name__)

# Native Chennai Timezone (IST: UTC+5:30)
CHENNAI_TIMEZONE = ZoneInfo("Asia/Kolkata")

# Verified Public Emergency Helplines for Chennai & Tamil Nadu
CHENNAI_PUBLIC_HELPLINES = [
    EmergencyHelpline(
        name="Greater Chennai Police Control Room",
        number="100",
        category="Police",
        description="Unified police dispatch for emergencies across Chennai Metropolitan Police jurisdiction.",
        dial_uri="tel:100",
        operating_hours="24/7 Toll-Free",
    ),
    EmergencyHelpline(
        name="National Emergency Response Support System",
        number="112",
        category="Police / General",
        description="Single emergency number for police, fire, and ambulance across Tamil Nadu.",
        dial_uri="tel:112",
        operating_hours="24/7 Toll-Free",
    ),
    EmergencyHelpline(
        name="Chennai Police Women Helpline (Kavalan)",
        number="1091",
        category="Women Safety",
        description="Dedicated helpline managed by Greater Chennai All-Women Police Stations (AWPS).",
        dial_uri="tel:1091",
        operating_hours="24/7 Toll-Free",
    ),
    EmergencyHelpline(
        name="Tamil Nadu Emergency Medical & Ambulance Service",
        number="108",
        category="Medical / Ambulance",
        description="State ambulance dispatch and emergency trauma assistance (GVK EMRI).",
        dial_uri="tel:108",
        operating_hours="24/7 Toll-Free",
    ),
    EmergencyHelpline(
        name="Chennai Traffic Police Helpline",
        number="103",
        category="Traffic / Transit",
        description="Assistance for road blockages, accidents, and transit disruptions in Chennai.",
        dial_uri="tel:103",
        operating_hours="24/7 Toll-Free",
    ),
    EmergencyHelpline(
        name="Tamil Nadu Fire and Rescue Services",
        number="101",
        category="Fire & Rescue",
        description="Fire emergency, structural collapse, and flood rescue operations.",
        dial_uri="tel:101",
        operating_hours="24/7 Toll-Free",
    ),
    EmergencyHelpline(
        name="Greater Chennai Corporation (GCC) Disaster & Flood Helpline",
        number="1913",
        category="Civic / Disaster",
        description="Municipal flood response, subway waterlogging, tree falls, and civic hazards.",
        dial_uri="tel:1913",
        operating_hours="24/7 Toll-Free",
    ),
    EmergencyHelpline(
        name="National Childline Helpline",
        number="1098",
        category="Child Protection",
        description="Emergency outreach and protection for children in distress or danger.",
        dial_uri="tel:1098",
        operating_hours="24/7 Toll-Free",
    ),
]


class JourneyService:
    """Manages journey monitoring sessions, check-in cadences, and in-app SOS workflows."""

    # In-memory storage for active sessions in the prototype instance
    _sessions: Dict[str, JourneySessionState] = {}

    @classmethod
    def get_chennai_helplines(cls) -> ChennaiHelplinesResponse:
        """Returns the verified Chennai emergency helpline directory."""
        return ChennaiHelplinesResponse(
            city="Chennai",
            helplines=CHENNAI_PUBLIC_HELPLINES,
            disclaimer=(
                "These emergency numbers connect directly to official Tamil Nadu public responders. "
                "The Suraksha Path prototype provides dialable shortcuts but does NOT dispatch emergency services automatically."
            ),
        )

    @classmethod
    def get_current_ist_time(cls) -> datetime:
        """Returns current time localized to Asia/Kolkata."""
        return datetime.now(CHENNAI_TIMEZONE)

    @classmethod
    def format_ist(cls, dt: datetime) -> str:
        """Formats datetime object to human-readable IST string."""
        return dt.strftime("%Y-%m-%d %H:%M:%S IST")

    @classmethod
    def start_journey(cls, request: JourneyStartRequest) -> JourneySessionState:
        """
        Initiates a new journey session from a selected route.
        Enforces valid initialization and schedules the initial check-in prompt.
        """
        now = cls.get_current_ist_time()
        journey_id = f"JRN-{uuid.uuid4().hex[:8].upper()}"
        
        # Calculate initial check-in time
        next_check_in_dt = now + timedelta(minutes=request.check_in_interval_minutes)
        next_check_in_str = cls.format_ist(next_check_in_dt)

        # Initial event record
        initial_event = JourneyEventRecord(
            event_id=f"EVT-{uuid.uuid4().hex[:6].upper()}",
            event_type=JourneyEventType.JOURNEY_STARTED,
            timestamp_ist=cls.format_ist(now),
            summary=f"Journey started from {request.origin} to {request.destination}",
            details=(
                f"Preference: {request.route_type} | Interval: {request.check_in_interval_minutes}m | "
                f"Distance: {request.distance_km or 'N/A'}km | Safety Score: {request.safety_score or 'N/A'}"
            ),
        )

        location_status = (
            LocationSharingStatus.OPT_IN_ACTIVE
            if request.location_sharing_enabled
            else LocationSharingStatus.OFF_BY_DEFAULT
        )
        if request.is_demo_mode:
            location_status = LocationSharingStatus.SIMULATED_DEMO

        session = JourneySessionState(
            journey_id=journey_id,
            status=JourneyStatus.ACTIVE,
            origin=request.origin,
            destination=request.destination,
            route_id=request.route_id,
            route_type=request.route_type,
            distance_km=request.distance_km,
            duration_minutes=request.duration_minutes,
            safety_score=request.safety_score,
            confidence_score=request.confidence_score,
            start_time_ist=cls.format_ist(now),
            elapsed_seconds=0,
            next_check_in_ist=next_check_in_str,
            check_in_interval_minutes=request.check_in_interval_minutes,
            check_in_status=CheckInStatus.PENDING,
            missed_check_in_count=0,
            sos_active=False,
            location_sharing_status=location_status,
            events=[initial_event],
            disclaimer=(
                "Suraksha Path journey monitoring is an in-app prototype. "
                "It does not automatically notify police or dispatch emergency services."
            ),
        )

        cls._sessions[journey_id] = session
        logger.info(f"Started journey {journey_id} ({request.origin} -> {request.destination})")
        return session

    @classmethod
    def get_session(cls, journey_id: str) -> JourneySessionState:
        """Retrieves an active or completed journey session by ID."""
        session = cls._sessions.get(journey_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Journey session '{journey_id}' was not found.",
            )
        return session

    @classmethod
    def transition_journey(cls, request: JourneyTransitionRequest) -> JourneySessionState:
        """
        Executes a validated state transition or check-in/SOS action on an existing journey.
        Strictly prevents invalid lifecycle transitions (e.g., resuming completed journey).
        """
        session = cls.get_session(request.journey_id)
        now = cls.get_current_ist_time()
        now_str = cls.format_ist(now)
        action = request.action.strip().lower()

        # Helper to append events
        def add_event(evt_type: JourneyEventType, summary: str, details: Optional[str] = None):
            event = JourneyEventRecord(
                event_id=f"EVT-{uuid.uuid4().hex[:6].upper()}",
                event_type=evt_type,
                timestamp_ist=now_str,
                summary=summary,
                details=details or request.details,
            )
            session.events.append(event)

        # 1. PAUSE JOURNEY
        if action == "pause":
            if session.status == JourneyStatus.PAUSED:
                return session  # Idempotent
            if session.status != JourneyStatus.ACTIVE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot pause journey in '{session.status.value}' state. Only ACTIVE journeys can be paused.",
                )
            session.status = JourneyStatus.PAUSED
            add_event(JourneyEventType.JOURNEY_PAUSED, "Journey paused by commuter")
            return session

        # 2. RESUME JOURNEY
        elif action == "resume":
            if session.status == JourneyStatus.ACTIVE:
                return session  # Idempotent
            if session.status != JourneyStatus.PAUSED:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot resume journey in '{session.status.value}' state. Only PAUSED journeys can be resumed.",
                )
            session.status = JourneyStatus.ACTIVE
            # Recalculate next check-in window from current resume time
            next_check_in_dt = now + timedelta(minutes=session.check_in_interval_minutes)
            session.next_check_in_ist = cls.format_ist(next_check_in_dt)
            add_event(JourneyEventType.JOURNEY_RESUMED, "Journey resumed by commuter")
            return session

        # 3. COMPLETE JOURNEY
        elif action == "complete":
            if session.status == JourneyStatus.COMPLETED:
                return session  # Idempotent
            if session.status not in (JourneyStatus.ACTIVE, JourneyStatus.PAUSED):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot complete journey in '{session.status.value}' state. Only ACTIVE or PAUSED journeys can be completed.",
                )
            session.status = JourneyStatus.COMPLETED
            session.next_check_in_ist = None
            session.sos_active = False
            add_event(JourneyEventType.JOURNEY_COMPLETED, "Journey completed successfully at destination")
            return session

        # 4. CANCEL JOURNEY
        elif action == "cancel":
            if session.status == JourneyStatus.CANCELLED:
                return session  # Idempotent
            if session.status not in (JourneyStatus.ACTIVE, JourneyStatus.PAUSED):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot cancel journey in '{session.status.value}' state. Only ACTIVE or PAUSED journeys can be cancelled.",
                )
            session.status = JourneyStatus.CANCELLED
            session.next_check_in_ist = None
            session.sos_active = False
            add_event(JourneyEventType.JOURNEY_CANCELLED, "Journey cancelled by commuter")
            return session

        # 5. CHECK-IN: CONFIRM OK
        elif action == "check_in_ok":
            if session.status != JourneyStatus.ACTIVE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot submit check-in while journey is in '{session.status.value}' state.",
                )
            session.check_in_status = CheckInStatus.CONFIRMED_OK
            next_check_in_dt = now + timedelta(minutes=session.check_in_interval_minutes)
            session.next_check_in_ist = cls.format_ist(next_check_in_dt)
            add_event(
                JourneyEventType.CHECK_IN_COMPLETED,
                "Safety check-in: Commuter confirmed OK",
                details=f"Next prompt scheduled in {session.check_in_interval_minutes} minutes.",
            )
            return session

        # 6. CHECK-IN: ASSISTANCE REQUESTED
        elif action == "check_in_help":
            if session.status != JourneyStatus.ACTIVE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot request assistance while journey is in '{session.status.value}' state.",
                )
            session.check_in_status = CheckInStatus.ASSISTANCE_REQUESTED
            session.sos_active = True
            add_event(
                JourneyEventType.CHECK_IN_COMPLETED,
                "Safety check-in: Commuter indicated need for assistance",
                details="Activated in-app SOS state and emergency helpline directory.",
            )
            add_event(
                JourneyEventType.SOS_ACTIVATED,
                "In-App SOS activated via check-in prompt",
                details="Prototype guidance presented. Emergency helplines available.",
            )
            return session

        # 7. MISSED CHECK-IN NOTIFICATION
        elif action == "check_in_missed":
            if session.status != JourneyStatus.ACTIVE:
                return session
            session.check_in_status = CheckInStatus.MISSED
            session.missed_check_in_count += 1
            add_event(
                JourneyEventType.CHECK_IN_MISSED,
                f"Safety check-in missed (Count: {session.missed_check_in_count})",
                details=(
                    "Check-in prompt expired without response. This is an uncertain status and does NOT prove immediate danger. "
                    "No external emergency dispatch was triggered."
                ),
            )
            return session

        # 8. RESOLVE MISSED CHECK-IN
        elif action == "check_in_missed_resolved":
            if session.status != JourneyStatus.ACTIVE:
                return session
            session.check_in_status = CheckInStatus.RESOLVED
            next_check_in_dt = now + timedelta(minutes=session.check_in_interval_minutes)
            session.next_check_in_ist = cls.format_ist(next_check_in_dt)
            add_event(
                JourneyEventType.CHECK_IN_MISSED_RESOLVED,
                "Missed check-in resolved: Commuter confirmed safe",
                details=f"Resumed regular check-in cadence ({session.check_in_interval_minutes}m).",
            )
            return session

        # 9. SOS ACTIVATION
        elif action == "sos_activate":
            session.sos_active = True
            add_event(
                JourneyEventType.SOS_ACTIVATED,
                "In-App SOS Mode activated by commuter",
                details="High-visibility emergency state displayed. Emergency helplines accessible.",
            )
            return session

        # 10. SOS RESOLUTION
        elif action == "sos_resolve":
            session.sos_active = False
            add_event(
                JourneyEventType.SOS_RESOLVED,
                "In-App SOS Mode resolved: Commuter confirmed safe",
                details="Standard monitoring resumed.",
            )
            return session

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown journey transition action '{action}'.",
            )
