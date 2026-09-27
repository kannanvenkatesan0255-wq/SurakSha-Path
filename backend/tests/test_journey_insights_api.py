"""Tests for Journey Insights, Safety Analytics, and Route Preferences (Phase 15)."""

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.services.journey_service import JourneyService, CHENNAI_TIMEZONE
from app.schemas.journey import JourneyStatus

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_journey_state():
    """Ensure clean journey service history and default preferences before each test."""
    JourneyService.clear_history()
    JourneyService.reset_preferences()
    yield
    JourneyService.clear_history()
    JourneyService.reset_preferences()


def test_empty_journey_analytics():
    """Empty history yields valid zeroed metrics without crashing or dividing by zero."""
    res = client.get("/api/journey/analytics?include_demo=false")
    assert res.status_code == 200
    data = res.json()
    assert data["total_journeys"] == 0
    assert data["completed_journeys"] == 0
    assert data["cancelled_journeys"] == 0
    assert data["total_distance_km"] == 0.0
    assert data["total_duration_minutes"] == 0.0
    assert data["average_duration_minutes"] == 0.0
    assert data["average_safety_score"] is None
    assert data["daily_activity"] == []
    assert len(data["duration_distribution"]) == 4


def test_journey_recording_and_analytics_calculation():
    """Records journeys and verifies strict exclusion of cancelled journeys from completed metrics."""
    now = datetime.now(CHENNAI_TIMEZONE)
    today_ymd = now.strftime("%Y-%m-%d")

    # Record 1: Completed Balanced Journey (10 km, 30 min, safety 80.0, conf 85.0)
    client.post("/api/journey/record", json={
        "journey_id": "TEST-JRN-01",
        "status": "COMPLETED",
        "origin": "Chennai Central",
        "destination": "T. Nagar",
        "route_type": "BALANCED",
        "distance_km": 10.0,
        "duration_minutes": 30.0,
        "elapsed_seconds": 1800,
        "safety_score": 80.0,
        "confidence_score": 85.0,
        "date_ymd": today_ymd,
        "is_demo": False,
    })

    # Record 2: Completed Safest Journey (5 km, 20 min, safety 90.0, conf 95.0)
    client.post("/api/journey/record", json={
        "journey_id": "TEST-JRN-02",
        "status": "COMPLETED",
        "origin": "Guindy",
        "destination": "Adyar",
        "route_type": "SAFEST",
        "distance_km": 5.0,
        "duration_minutes": 20.0,
        "elapsed_seconds": 1200,
        "safety_score": 90.0,
        "confidence_score": 95.0,
        "date_ymd": today_ymd,
        "is_demo": False,
    })

    # Record 3: Cancelled Fastest Journey (12 km, 25 min) - MUST NOT be counted as completed
    client.post("/api/journey/record", json={
        "journey_id": "TEST-JRN-03",
        "status": "CANCELLED",
        "origin": "Koyambedu",
        "destination": "Anna Nagar",
        "route_type": "FASTEST",
        "distance_km": 12.0,
        "duration_minutes": 25.0,
        "elapsed_seconds": 300,
        "safety_score": 75.0,
        "confidence_score": 70.0,
        "date_ymd": today_ymd,
        "is_demo": False,
    })

    res = client.get("/api/journey/analytics?include_demo=false")
    assert res.status_code == 200
    analytics = res.json()

    assert analytics["total_journeys"] == 3
    assert analytics["completed_journeys"] == 2
    assert analytics["cancelled_journeys"] == 1
    # Total distance is strictly 10.0 + 5.0 = 15.0 km (excludes cancelled 12.0 km)
    assert analytics["total_distance_km"] == 15.0
    # Total duration is strictly 30.0 + 20.0 = 50.0 min (excludes cancelled 25.0 min)
    assert analytics["total_duration_minutes"] == 50.0
    # Average duration is 50.0 / 2 = 25.0 min
    assert analytics["average_duration_minutes"] == 25.0
    # Average safety score is (80.0 + 90.0) / 2 = 85.0
    assert analytics["average_safety_score"] == 85.0
    # Average confidence score is (85.0 + 95.0) / 2 = 90.0
    assert analytics["average_confidence_score"] == 90.0

    # Route type distribution
    assert analytics["route_type_breakdown"]["BALANCED"] == 1
    assert analytics["route_type_breakdown"]["SAFEST"] == 1
    assert analytics["route_type_breakdown"]["FASTEST"] == 1


def test_journey_duplicate_prevention_idempotency():
    """Duplicate submissions with same journey_id update the record instead of duplicating it."""
    payload = {
        "journey_id": "IDEMPOTENT-01",
        "status": "COMPLETED",
        "origin": "Tambaram",
        "destination": "Velachery",
        "route_type": "BALANCED",
        "distance_km": 14.0,
        "duration_minutes": 35.0,
        "elapsed_seconds": 2100,
        "date_ymd": "2026-09-27",
    }
    # First post
    r1 = client.post("/api/journey/record", json=payload)
    assert r1.status_code == 201

    # Second post with identical journey_id
    r2 = client.post("/api/journey/record", json=payload)
    assert r2.status_code == 201

    # Verify history contains only 1 record
    history_res = client.get("/api/journey/history?include_demo=false")
    history = history_res.json()
    assert len(history) == 1
    assert history[0]["journey_id"] == "IDEMPOTENT-01"


def test_journey_time_range_and_route_type_filters():
    """Filters by days and route type correctly narrow analytics."""
    now = datetime.now(CHENNAI_TIMEZONE)
    today_ymd = now.strftime("%Y-%m-%d")
    old_ymd = (now - timedelta(days=15)).strftime("%Y-%m-%d")

    # Recent journey (today)
    client.post("/api/journey/record", json={
        "journey_id": "RECENT-01",
        "status": "COMPLETED",
        "origin": "Central",
        "destination": "Egmore",
        "route_type": "FASTEST",
        "distance_km": 3.0,
        "duration_minutes": 10.0,
        "elapsed_seconds": 600,
        "date_ymd": today_ymd,
    })

    # Older journey (15 days ago)
    client.post("/api/journey/record", json={
        "journey_id": "OLDER-01",
        "status": "COMPLETED",
        "origin": "Marina",
        "destination": "Mylapore",
        "route_type": "SAFEST",
        "distance_km": 4.0,
        "duration_minutes": 12.0,
        "elapsed_seconds": 720,
        "date_ymd": old_ymd,
    })

    # Filter last 7 days: should only include RECENT-01
    res_7 = client.get("/api/journey/analytics?days=7&include_demo=false")
    data_7 = res_7.json()
    assert data_7["total_journeys"] == 1
    assert data_7["total_distance_km"] == 3.0

    # Filter last 30 days: should include both
    res_30 = client.get("/api/journey/analytics?days=30&include_demo=false")
    data_30 = res_30.json()
    assert data_30["total_journeys"] == 2
    assert data_30["total_distance_km"] == 7.0

    # Filter by route type SAFEST
    res_safest = client.get("/api/journey/analytics?route_type=SAFEST&include_demo=false")
    data_safest = res_safest.json()
    assert data_safest["total_journeys"] == 1
    assert data_safest["total_distance_km"] == 4.0


def test_clear_journey_history_privacy_control():
    """Privacy control clears journey history completely."""
    client.post("/api/journey/record", json={
        "journey_id": "PRIVATE-01",
        "status": "COMPLETED",
        "origin": "A",
        "destination": "B",
        "route_type": "BALANCED",
        "distance_km": 5.0,
        "duration_minutes": 15.0,
        "elapsed_seconds": 900,
        "date_ymd": "2026-09-27",
    })

    # Verify present
    res1 = client.get("/api/journey/history?include_demo=false")
    assert len(res1.json()) == 1

    # Clear history
    del_res = client.delete("/api/journey/history")
    assert del_res.status_code == 200
    assert del_res.json()["cleared_count"] == 1

    # Verify empty
    res2 = client.get("/api/journey/history?include_demo=false")
    assert len(res2.json()) == 0


def test_user_route_preferences_persistence_and_reset():
    """Route preferences can be retrieved, updated, and reset to defaults."""
    # Default preferences
    res_def = client.get("/api/preferences/route")
    assert res_def.status_code == 200
    default_prefs = res_def.json()
    assert default_prefs["route_preference"] == "BALANCED"
    assert default_prefs["safety_weight"] == 0.5
    assert default_prefs["avoid_unlit_areas"] is True
    assert default_prefs["max_acceptable_detour_minutes"] == 10.0

    # Update preferences to prefer Safest with higher safety weight and 20 min detour
    new_prefs = {
        "route_preference": "SAFEST",
        "safety_weight": 0.85,
        "avoid_unlit_areas": True,
        "max_acceptable_detour_minutes": 20.0,
        "min_confidence_threshold": 60.0,
        "prioritize_active_corridors": True,
    }
    res_upd = client.post("/api/preferences/route", json=new_prefs)
    assert res_upd.status_code == 200
    updated = res_upd.json()
    assert updated["route_preference"] == "SAFEST"
    assert updated["safety_weight"] == 0.85
    assert updated["max_acceptable_detour_minutes"] == 20.0

    # Reset preferences
    res_rst = client.post("/api/preferences/route/reset")
    assert res_rst.status_code == 200
    reset = res_rst.json()
    assert reset["route_preference"] == "BALANCED"
    assert reset["safety_weight"] == 0.5
    assert reset["max_acceptable_detour_minutes"] == 10.0


def test_demo_journey_seeding_and_isolation():
    """Demo journeys are isolated and labeled when requested."""
    # Default without demo data
    res_no_demo = client.get("/api/journey/history?include_demo=false")
    assert len(res_no_demo.json()) == 0

    # Request with demo data
    res_demo = client.get("/api/journey/history?include_demo=true")
    demo_list = res_demo.json()
    assert len(demo_list) >= 4
    for item in demo_list:
        assert item["is_demo"] is True
