"""Integration tests for Journey Monitoring API endpoints (Phase 14)."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_api_get_chennai_emergency_helplines():
    """Verify GET /api/journey/helplines returns verified emergency contacts."""
    res = client.get("/api/journey/helplines")
    assert res.status_code == 200
    data = res.json()
    assert data["city"] == "Chennai"
    assert len(data["helplines"]) >= 6
    assert any(h["number"] == "100" for h in data["helplines"])
    assert any(h["number"] == "1091" for h in data["helplines"])


def test_api_start_and_transition_journey():
    """Verify POST /api/journey/session and POST /api/journey/transition endpoints."""
    # 1. Start Journey
    payload = {
        "origin": "Chennai Central",
        "destination": "Besant Nagar Beach",
        "route_id": "ROUTE-ALT-02",
        "route_type": "SAFEST",
        "distance_km": 14.2,
        "duration_minutes": 38.0,
        "safety_score": 82.0,
        "confidence_score": 88.0,
        "check_in_interval_minutes": 15,
        "location_sharing_enabled": False,
        "is_demo_mode": False,
    }
    start_res = client.post("/api/journey/session", json=payload)
    assert start_res.status_code == 200
    session_data = start_res.json()
    journey_id = session_data["journey_id"]
    assert session_data["status"] == "ACTIVE"
    assert session_data["origin"] == "Chennai Central"
    assert len(session_data["events"]) == 1

    # 2. Get Journey Session
    get_res = client.get(f"/api/journey/session/{journey_id}")
    assert get_res.status_code == 200
    assert get_res.json()["journey_id"] == journey_id

    # 3. Transition: Check-in OK
    chk_res = client.post(
        "/api/journey/transition",
        json={"journey_id": journey_id, "action": "check_in_ok"},
    )
    assert chk_res.status_code == 200
    assert chk_res.json()["check_in_status"] == "CONFIRMED_OK"

    # 4. Transition: Pause
    pause_res = client.post(
        "/api/journey/transition",
        json={"journey_id": journey_id, "action": "pause"},
    )
    assert pause_res.status_code == 200
    assert pause_res.json()["status"] == "PAUSED"

    # 5. Transition: Resume
    resume_res = client.post(
        "/api/journey/transition",
        json={"journey_id": journey_id, "action": "resume"},
    )
    assert resume_res.status_code == 200
    assert resume_res.json()["status"] == "ACTIVE"

    # 6. Transition: Complete
    comp_res = client.post(
        "/api/journey/transition",
        json={"journey_id": journey_id, "action": "complete"},
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "COMPLETED"


def test_api_journey_not_found():
    """Verify 404 response for nonexistent journey session."""
    res = client.get("/api/journey/session/JRN-NONEXISTENT")
    assert res.status_code == 404
