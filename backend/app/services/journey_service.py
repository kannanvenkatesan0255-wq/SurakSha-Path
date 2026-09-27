"""Journey Lifecycle, Safety Check-In, and SOS Workflow Service (Phase 14).

Manages state machine transitions, safety check-in scheduling,
emergency helpline directories, and auditable event ledgers for Chennai commuters.
"""

import uuid
import logging
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from typing import Dict, List, Optional, Any
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
    UserRoutePreferences,
    JourneyRecordItem,
    JourneyRecordCreateRequest,
    DailyActivityPoint,
    DurationBucket,
    JourneyHistorySummary,
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
    
    # In-memory archival history ledger for completed/cancelled journeys (Phase 15)
    _history: List[JourneyRecordItem] = []

    # Configured commuter route preferences (Phase 15)
    _preferences: UserRoutePreferences = UserRoutePreferences()

    # Pre-seeded Chennai demo journey samples (explicitly labeled as demo data)
    _demo_history: List[JourneyRecordItem] = [
        JourneyRecordItem(
            journey_id="DEMO-JRN-001",
            status=JourneyStatus.COMPLETED,
            origin="Chennai Central Railway Station",
            destination="T. Nagar Bus Terminus",
            route_type="BALANCED",
            distance_km=8.4,
            duration_minutes=24.5,
            elapsed_seconds=1470,
            safety_score=81.2,
            confidence_score=85.0,
            start_time_ist="2026-09-25 18:30:00 IST",
            end_time_ist="2026-09-25 18:54:30 IST",
            date_ymd="2026-09-25",
            is_demo=True,
            events_count=3,
            check_in_count=1,
            missed_check_in_count=0,
            sos_activated=False,
        ),
        JourneyRecordItem(
            journey_id="DEMO-JRN-002",
            status=JourneyStatus.COMPLETED,
            origin="Guindy Metro Station",
            destination="IIT Madras Research Park",
            route_type="SAFEST",
            distance_km=5.2,
            duration_minutes=16.0,
            elapsed_seconds=960,
            safety_score=88.5,
            confidence_score=91.0,
            start_time_ist="2026-09-26 19:15:00 IST",
            end_time_ist="2026-09-26 19:31:00 IST",
            date_ymd="2026-09-26",
            is_demo=True,
            events_count=3,
            check_in_count=1,
            missed_check_in_count=0,
            sos_activated=False,
        ),
        JourneyRecordItem(
            journey_id="DEMO-JRN-003",
            status=JourneyStatus.COMPLETED,
            origin="Egmore Railway Station",
            destination="Marina Beach Light House",
            route_type="FASTEST",
            distance_km=6.1,
            duration_minutes=17.5,
            elapsed_seconds=1050,
            safety_score=74.0,
            confidence_score=78.0,
            start_time_ist="2026-09-27 10:00:00 IST",
            end_time_ist="2026-09-27 10:17:30 IST",
            date_ymd="2026-09-27",
            is_demo=True,
            events_count=2,
            check_in_count=1,
            missed_check_in_count=0,
            sos_activated=False,
        ),
        JourneyRecordItem(
            journey_id="DEMO-JRN-004",
            status=JourneyStatus.COMPLETED,
            origin="Tambaram Sanatorium",
            destination="Velachery MRTS",
            route_type="BALANCED",
            distance_km=14.2,
            duration_minutes=38.0,
            elapsed_seconds=2280,
            safety_score=79.0,
            confidence_score=82.5,
            start_time_ist="2026-09-27 14:20:00 IST",
            end_time_ist="2026-09-27 14:58:00 IST",
            date_ymd="2026-09-27",
            is_demo=True,
            events_count=4,
            check_in_count=2,
            missed_check_in_count=0,
            sos_activated=False,
        ),
        JourneyRecordItem(
            journey_id="DEMO-JRN-005",
            status=JourneyStatus.CANCELLED,
            origin="Koyambedu CMBT",
            destination="Anna Nagar West Depot",
            route_type="FASTEST",
            distance_km=4.0,
            duration_minutes=11.0,
            elapsed_seconds=420,
            safety_score=72.0,
            confidence_score=75.0,
            start_time_ist="2026-09-27 17:00:00 IST",
            end_time_ist="2026-09-27 17:07:00 IST",
            date_ymd="2026-09-27",
            is_demo=True,
            events_count=2,
            check_in_count=0,
            missed_check_in_count=0,
            sos_activated=False,
        ),
    ]

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
            cls._archive_session_to_history(session, now)
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
            cls._archive_session_to_history(session, now)
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

    # =========================================================================
    # Phase 15: Journey Insights, Safety Analytics & Route Preferences
    # =========================================================================

    @classmethod
    def _archive_session_to_history(cls, session: JourneySessionState, now: datetime) -> JourneyRecordItem:
        """Archives a completed or cancelled journey session into the local in-memory history ledger."""
        date_ymd = now.strftime("%Y-%m-%d")
        now_str = cls.format_ist(now)
        dur_min = session.duration_minutes if session.duration_minutes is not None else round(session.elapsed_seconds / 60.0, 1)

        record = JourneyRecordItem(
            journey_id=session.journey_id,
            status=session.status,
            origin=session.origin,
            destination=session.destination,
            route_type=session.route_type,
            distance_km=session.distance_km or 0.0,
            duration_minutes=dur_min,
            elapsed_seconds=session.elapsed_seconds,
            safety_score=session.safety_score,
            confidence_score=session.confidence_score,
            start_time_ist=session.start_time_ist,
            end_time_ist=now_str,
            date_ymd=date_ymd,
            is_demo=session.location_sharing_status == LocationSharingStatus.SIMULATED_DEMO,
            events_count=len(session.events),
            check_in_count=sum(1 for e in session.events if e.event_type == JourneyEventType.CHECK_IN_COMPLETED),
            missed_check_in_count=session.missed_check_in_count,
            sos_activated=session.sos_active or any(e.event_type == JourneyEventType.SOS_ACTIVATED for e in session.events),
        )

        for idx, item in enumerate(cls._history):
            if item.journey_id == session.journey_id:
                cls._history[idx] = record
                return record

        cls._history.append(record)
        return record

    @classmethod
    def record_journey(cls, request: JourneyRecordCreateRequest) -> JourneyRecordItem:
        """Explicitly records or syncs a completed/cancelled journey into the ledger."""
        now = cls.get_current_ist_time()
        date_ymd = request.date_ymd or now.strftime("%Y-%m-%d")
        now_str = cls.format_ist(now)

        record = JourneyRecordItem(
            journey_id=request.journey_id,
            status=request.status,
            origin=request.origin,
            destination=request.destination,
            route_type=request.route_type,
            distance_km=request.distance_km,
            duration_minutes=request.duration_minutes or round(request.elapsed_seconds / 60.0, 1),
            elapsed_seconds=request.elapsed_seconds,
            safety_score=request.safety_score,
            confidence_score=request.confidence_score,
            start_time_ist=request.start_time_ist or now_str,
            end_time_ist=request.end_time_ist or now_str,
            date_ymd=date_ymd,
            is_demo=request.is_demo,
            events_count=1,
            check_in_count=0,
            missed_check_in_count=0,
            sos_activated=False,
        )

        for idx, item in enumerate(cls._history):
            if item.journey_id == record.journey_id:
                cls._history[idx] = record
                return record

        cls._history.append(record)
        return record

    @classmethod
    def get_history(
        cls,
        status: Optional[str] = None,
        route_type: Optional[str] = None,
        days: Optional[int] = None,
        include_demo: bool = False,
    ) -> List[JourneyRecordItem]:
        """Retrieves recorded journeys filtered by status, route type, and time window."""
        records = list(cls._history)
        if include_demo:
            existing_ids = {r.journey_id for r in records}
            records.extend([d for d in cls._demo_history if d.journey_id not in existing_ids])

        now = cls.get_current_ist_time()

        filtered: List[JourneyRecordItem] = []
        for r in records:
            if status and r.status.value.upper() != status.strip().upper():
                continue
            if route_type and r.route_type.upper() != route_type.strip().upper():
                continue
            if days is not None and days > 0:
                try:
                    r_dt = datetime.strptime(r.date_ymd, "%Y-%m-%d").date()
                    delta_days = (now.date() - r_dt).days
                    if delta_days > days:
                        continue
                except Exception:
                    pass
            filtered.append(r)

        filtered.sort(key=lambda r: (r.date_ymd, r.start_time_ist), reverse=True)
        return filtered

    @classmethod
    def get_analytics(
        cls,
        days: Optional[int] = None,
        route_type: Optional[str] = None,
        status_filter: Optional[str] = None,
        include_demo: bool = False,
    ) -> JourneyHistorySummary:
        """
        Calculates aggregated journey insights strictly from available records.
        Cancelled and incomplete journeys are strictly excluded from completed metrics.
        """
        records = cls.get_history(
            status=status_filter,
            route_type=route_type,
            days=days,
            include_demo=include_demo,
        )

        completed_records = [r for r in records if r.status == JourneyStatus.COMPLETED]
        cancelled_records = [r for r in records if r.status == JourneyStatus.CANCELLED]
        active_records = [r for r in records if r.status in (JourneyStatus.ACTIVE, JourneyStatus.PAUSED)]

        total_journeys = len(records)
        completed_count = len(completed_records)
        cancelled_count = len(cancelled_records)
        active_count = len(active_records)

        # Distance and travel duration strictly from completed journeys
        total_dist_km = round(sum(r.distance_km for r in completed_records), 2)
        total_dur_min = round(sum(r.duration_minutes for r in completed_records), 1)
        avg_dur_min = round(total_dur_min / completed_count, 1) if completed_count > 0 else 0.0

        scores = [r.safety_score for r in completed_records if r.safety_score is not None]
        avg_safety = round(sum(scores) / len(scores), 1) if scores else None

        confs = [r.confidence_score for r in completed_records if r.confidence_score is not None]
        avg_conf = round(sum(confs) / len(confs), 1) if confs else None

        # Route-type distribution across all records
        route_types = {"FASTEST": 0, "BALANCED": 0, "SAFEST": 0}
        for r in records:
            rt = r.route_type.upper()
            if rt in route_types:
                route_types[rt] += 1
            else:
                route_types[rt] = 1

        # Status breakdown
        statuses = {"COMPLETED": completed_count, "CANCELLED": cancelled_count}
        if active_count > 0:
            statuses["ACTIVE"] = active_count

        # Daily activity aggregation
        daily_dict: Dict[str, Dict[str, Any]] = {}
        for r in records:
            d = r.date_ymd
            if d not in daily_dict:
                daily_dict[d] = {"date": d, "count": 0, "distance_km": 0.0, "duration_minutes": 0.0}
            daily_dict[d]["count"] += 1
            if r.status == JourneyStatus.COMPLETED:
                daily_dict[d]["distance_km"] += r.distance_km
                daily_dict[d]["duration_minutes"] += r.duration_minutes

        daily_activity = [
            DailyActivityPoint(
                date=k,
                count=v["count"],
                distance_km=round(v["distance_km"], 2),
                duration_minutes=round(v["duration_minutes"], 1),
            )
            for k, v in sorted(daily_dict.items())
        ]

        # Duration distribution histogram (completed journeys)
        b_lt15 = sum(1 for r in completed_records if r.duration_minutes < 15.0)
        b_15_30 = sum(1 for r in completed_records if 15.0 <= r.duration_minutes < 30.0)
        b_30_45 = sum(1 for r in completed_records if 30.0 <= r.duration_minutes < 45.0)
        b_gte45 = sum(1 for r in completed_records if r.duration_minutes >= 45.0)

        duration_distribution = [
            DurationBucket(bucket="< 15 min", count=b_lt15, label="Short commute (< 15m)"),
            DurationBucket(bucket="15–30 min", count=b_15_30, label="Standard commute (15–30m)"),
            DurationBucket(bucket="30–45 min", count=b_30_45, label="Extended commute (30–45m)"),
            DurationBucket(bucket="45+ min", count=b_gte45, label="Long-distance trip (45m+)"),
        ]

        range_label = f"last_{days}_days" if days else "all"

        return JourneyHistorySummary(
            total_journeys=total_journeys,
            completed_journeys=completed_count,
            cancelled_journeys=cancelled_count,
            active_or_paused_journeys=active_count,
            total_distance_km=total_dist_km,
            total_duration_minutes=total_dur_min,
            average_duration_minutes=avg_dur_min,
            average_safety_score=avg_safety,
            average_confidence_score=avg_conf,
            route_type_breakdown=route_types,
            status_breakdown=statuses,
            daily_activity=daily_activity,
            duration_distribution=duration_distribution,
            time_range_applied=range_label,
            is_demo_included=include_demo,
        )

    @classmethod
    def clear_history(cls) -> Dict[str, Any]:
        """Clears local in-memory journey history for privacy."""
        count = len(cls._history)
        cls._history.clear()
        return {
            "status": "SUCCESS",
            "cleared_count": count,
            "message": "Journey history successfully cleared from local session memory.",
        }

    @classmethod
    def get_preferences(cls) -> UserRoutePreferences:
        """Retrieves current commuter route preferences."""
        return cls._preferences

    @classmethod
    def update_preferences(cls, prefs: UserRoutePreferences) -> UserRoutePreferences:
        """Updates commuter route preferences."""
        cls._preferences = prefs
        return cls._preferences

    @classmethod
    def reset_preferences(cls) -> UserRoutePreferences:
        """Resets route preferences to default balanced values."""
        cls._preferences = UserRoutePreferences()
        return cls._preferences

