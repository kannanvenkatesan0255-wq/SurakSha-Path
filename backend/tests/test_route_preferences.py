"""Tests for Route Preferences Integration in Routing Engine (Phase 15)."""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_route_plan_with_personalized_preferences():
    """Verify route planning accepts and honors personalized route preferences."""
    payload = {
        "origin": {"name": "Chennai Central Railway Station", "lat": 13.0827, "lng": 80.2707},
        "destination": {"name": "T. Nagar Bus Terminus", "lat": 13.0418, "lng": 80.2341},
        "route_preference": "SAFEST",
        "safety_weight_preference": 0.8,
        "avoid_unlit_areas": True,
        "max_detour_minutes_preference": 15.0,
        "min_confidence_preference": 50.0,
        "prioritize_active_corridors": True,
    }
    res = client.post("/api/routes/plan", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["route_preference"] == "SAFEST"
    assert len(data["alternatives"]) >= 1

    # Verify each alternative preserves distinct Safety Score and Confidence
    for alt in data["alternatives"]:
        assert alt["route_type"] in ("FASTEST", "BALANCED", "SAFEST", "ALTERNATIVE")
        if alt.get("safety_score") is not None:
            # Score is within defined scale
            assert 15.0 <= alt["safety_score"] <= 95.0
        if alt.get("confidence_score") is not None:
            # Confidence is within 10-100%
            assert 10.0 <= alt["confidence_score"] <= 100.0


def test_route_plan_rejects_out_of_bounds_preferences():
    """Validates that preference parameters outside allowed bounds are rejected."""
    # safety_weight_preference > 1.0
    bad_payload_weight = {
        "origin": {"name": "Chennai Central"},
        "destination": {"name": "T. Nagar"},
        "route_preference": "BALANCED",
        "safety_weight_preference": 1.5,
    }
    res = client.post("/api/routes/plan", json=bad_payload_weight)
    assert res.status_code == 422

    # max_detour_minutes_preference < 0.0
    bad_payload_detour = {
        "origin": {"name": "Chennai Central"},
        "destination": {"name": "T. Nagar"},
        "route_preference": "BALANCED",
        "max_detour_minutes_preference": -5.0,
    }
    res = client.post("/api/routes/plan", json=bad_payload_detour)
    assert res.status_code == 422
