"""Unit tests for Journey Lifecycle, Safety Check-In, and SOS Workflow (Phase 14)."""

import pytest
from fastapi import HTTPException
from app.services.journey_service import JourneyService, CHENNAI_PUBLIC_HELPLINES
from app.schemas.journey import (
    JourneyStatus,
    CheckInStatus,
    JourneyEventType,
    JourneyStartRequest,
    JourneyTransitionRequest,
)


def test_get_chennai_emergency_helplines():
    """Verify Chennai emergency numbers catalog contains key verified helplines."""
    response = JourneyService.get_chennai_helplines()
    assert response.city == "Chennai"
    assert len(response.helplines) >= 6
    
    numbers = {h.number for h in response.helplines}
    assert "100" in numbers  # Police
    assert "112" in numbers  # National ERSS
    assert "1091" in numbers # Women Safety
    assert "108" in numbers  # Ambulance
    assert "1913" in numbers # GCC Flood & Civic
    assert "The Suraksha Path prototype provides dialable shortcuts" in response.disclaimer


def test_journey_lifecycle_start_and_status():
    """Verify journey initialization creates an ACTIVE session with scheduled check-in."""
    req = JourneyStartRequest(
        origin="Chennai Central",
        destination="T. Nagar",
        route_id="ROUTE-TEST-01",
        route_type="BALANCED",
        distance_km=7.5,
        duration_minutes=24.0,
        safety_score=78.5,
        confidence_score=85.0,
        check_in_interval_minutes=15,
        location_sharing_enabled=False,
    )
    session = JourneyService.start_journey(req)

    assert session.journey_id.startswith("JRN-")
    assert session.status == JourneyStatus.ACTIVE
    assert session.origin == "Chennai Central"
    assert session.destination == "T. Nagar"
    assert session.next_check_in_ist is not None
    assert session.check_in_status == CheckInStatus.PENDING
    assert session.sos_active is False
    assert len(session.events) == 1
    assert session.events[0].event_type == JourneyEventType.JOURNEY_STARTED


def test_journey_valid_lifecycle_transitions():
    """Verify valid state transitions: ACTIVE -> PAUSED -> ACTIVE -> COMPLETED."""
    start_req = JourneyStartRequest(
        origin="Guindy",
        destination="Adyar",
        check_in_interval_minutes=10,
    )
    session = JourneyService.start_journey(start_req)
    j_id = session.journey_id

    # 1. Pause
    paused = JourneyService.transition_journey(JourneyTransitionRequest(journey_id=j_id, action="pause"))
    assert paused.status == JourneyStatus.PAUSED
    assert any(e.event_type == JourneyEventType.JOURNEY_PAUSED for e in paused.events)

    # 2. Resume
    resumed = JourneyService.transition_journey(JourneyTransitionRequest(journey_id=j_id, action="resume"))
    assert resumed.status == JourneyStatus.ACTIVE
    assert any(e.event_type == JourneyEventType.JOURNEY_RESUMED for e in resumed.events)

    # 3. Complete
    completed = JourneyService.transition_journey(JourneyTransitionRequest(journey_id=j_id, action="complete"))
    assert completed.status == JourneyStatus.COMPLETED
    assert completed.next_check_in_ist is None
    assert any(e.event_type == JourneyEventType.JOURNEY_COMPLETED for e in completed.events)


def test_journey_cancel_transition():
    """Verify cancellation transition from active journey."""
    start_req = JourneyStartRequest(
        origin="Koyambedu",
        destination="Marina Beach",
        check_in_interval_minutes=20,
    )
    session = JourneyService.start_journey(start_req)
    j_id = session.journey_id

    cancelled = JourneyService.transition_journey(JourneyTransitionRequest(journey_id=j_id, action="cancel"))
    assert cancelled.status == JourneyStatus.CANCELLED
    assert cancelled.next_check_in_ist is None
    assert any(e.event_type == JourneyEventType.JOURNEY_CANCELLED for e in cancelled.events)


def test_journey_invalid_transitions_rejected():
    """Verify invalid transitions raise HTTP 400 exceptions."""
    start_req = JourneyStartRequest(
        origin="Velachery",
        destination="Tambaram",
    )
    session = JourneyService.start_journey(start_req)
    j_id = session.journey_id

    # Complete the journey
    JourneyService.transition_journey(JourneyTransitionRequest(journey_id=j_id, action="complete"))

    # Attempting to pause a COMPLETED journey must fail
    with pytest.raises(HTTPException) as exc_info:
        JourneyService.transition_journey(JourneyTransitionRequest(journey_id=j_id, action="pause"))
    assert exc_info.value.status_code == 400
    assert "Cannot pause journey in 'COMPLETED' state" in exc_info.value.detail

    # Attempting to resume a COMPLETED journey must fail
    with pytest.raises(HTTPException) as exc_info:
        JourneyService.transition_journey(JourneyTransitionRequest(journey_id=j_id, action="resume"))
    assert exc_info.value.status_code == 400


def test_safety_check_in_workflow():
    """Verify check-in confirmation and assistance requests."""
    start_req = JourneyStartRequest(
        origin="Egmore",
        destination="Mylapore",
        check_in_interval_minutes=15,
    )
    session = JourneyService.start_journey(start_req)
    j_id = session.journey_id

    # Commuter responds "I'm OK"
    ok_res = JourneyService.transition_journey(JourneyTransitionRequest(journey_id=j_id, action="check_in_ok"))
    assert ok_res.check_in_status == CheckInStatus.CONFIRMED_OK
    assert ok_res.next_check_in_ist is not None
    assert any(e.event_type == JourneyEventType.CHECK_IN_COMPLETED for e in ok_res.events)

    # Missed check-in event
    missed_res = JourneyService.transition_journey(JourneyTransitionRequest(journey_id=j_id, action="check_in_missed"))
    assert missed_res.check_in_status == CheckInStatus.MISSED
    assert missed_res.missed_check_in_count == 1
    assert any(e.event_type == JourneyEventType.CHECK_IN_MISSED for e in missed_res.events)

    # Resolve missed check-in
    resolved_res = JourneyService.transition_journey(JourneyTransitionRequest(journey_id=j_id, action="check_in_missed_resolved"))
    assert resolved_res.check_in_status == CheckInStatus.RESOLVED

    # Commuter indicates "I need help"
    help_res = JourneyService.transition_journey(JourneyTransitionRequest(journey_id=j_id, action="check_in_help"))
    assert help_res.check_in_status == CheckInStatus.ASSISTANCE_REQUESTED
    assert help_res.sos_active is True
    assert any(e.event_type == JourneyEventType.SOS_ACTIVATED for e in help_res.events)


def test_sos_workflow_activation_and_resolution():
    """Verify deliberate SOS activation and resolution actions."""
    start_req = JourneyStartRequest(
        origin="Saidapet",
        destination="Besant Nagar",
    )
    session = JourneyService.start_journey(start_req)
    j_id = session.journey_id

    # Activate SOS directly
    sos_res = JourneyService.transition_journey(JourneyTransitionRequest(journey_id=j_id, action="sos_activate"))
    assert sos_res.sos_active is True
    assert any(e.event_type == JourneyEventType.SOS_ACTIVATED for e in sos_res.events)

    # Resolve SOS
    res_res = JourneyService.transition_journey(JourneyTransitionRequest(journey_id=j_id, action="sos_resolve"))
    assert res_res.sos_active is False
    assert any(e.event_type == JourneyEventType.SOS_RESOLVED for e in res_res.events)
