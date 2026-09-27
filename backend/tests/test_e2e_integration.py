"""
End-to-End Integration and User Acceptance Test Suite (Phase 18).

Covers all core end-to-end user journeys across the integrated Suraksha Path system:
- FLOW A: Application Entry & System Health Check
- FLOW B: Route Planning & Alternative Generation (Fastest, Balanced, Safest)
- FLOW C: Safety Assessment, Epistemic Confidence, & Contextual Reassessment
- FLOW D: Community Evidence Reporting, Verification, & Controlled Moderation
- FLOW E: Journey Lifecycle Monitoring, Check-Ins, SOS & Chennai Helplines
- FLOW F: Journey History Ledger, Safety Analytics & User Route Preferences
- FLOW G: Privacy Controls, History Purging & Security Boundaries
- FLOW H: Continuous Feedback Reassessment & Governance Audit Logs
"""

import uuid
from datetime import datetime
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.services.journey_service import JourneyService, CHENNAI_TIMEZONE
from app.database import SessionLocal, init_db
from app.models.domain import RoadSegment, ReassessmentAuditLog, AssessmentFeedback

client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_journey_state():
    """Ensure clean journey state before and after each test."""
    JourneyService.clear_history()
    JourneyService.reset_preferences()
    yield
    JourneyService.clear_history()
    JourneyService.reset_preferences()


def test_flow_a_system_entry_and_health():
    """FLOW A: Verify application entry point, health check, and system readiness."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()

    assert data["status"] in ["ok", "healthy"]
    assert "version" in data
    assert data["database"]["connected"] is True
    assert data["database"]["status"] in ["connected", "ok"]
    assert "Chennai" in data.get("city_context", "")


def test_flow_b_route_planning_multi_alternatives():
    """FLOW B: Multi-criteria route planning for Chennai corridors with real alternatives."""
    # 1. Valid route request from Chennai Central to T. Nagar
    payload = {
        "origin": {
            "name": "Chennai Central Railway Station",
            "lat": 13.0827,
            "lng": 80.2707,
            "is_resolved": True,
        },
        "destination": {
            "name": "T. Nagar Bus Terminus",
            "lat": 13.0418,
            "lng": 80.2341,
            "is_resolved": True,
        },
        "journey_date": datetime.now(CHENNAI_TIMEZONE).strftime("%Y-%m-%d"),
        "departure_time": "21:30",
        "route_preference": "BALANCED",
        "safety_weight_preference": 0.5,
        "avoid_unlit_areas": True,
    }

    res = client.post("/api/routes/plan", json=payload)
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "SUCCESS"
    assert data["journey_id"].startswith("JRN-")
    assert len(data["alternatives"]) >= 1

    # Verify attributes of the selected alternative
    selected_alt = data["alternatives"][0]
    assert selected_alt["route_id"].startswith("ROUTE-ALT-")
    assert selected_alt["metrics"]["distance_meters"] > 0
    assert selected_alt["metrics"]["duration_seconds"] > 0
    assert len(selected_alt["coordinates"]) >= 2

    # 2. Invalid input: Identical origin and destination coordinates must be rejected
    invalid_payload = dict(payload)
    invalid_payload["destination"] = dict(payload["origin"])
    bad_res = client.post("/api/routes/plan", json=invalid_payload)
    assert bad_res.status_code in [400, 422]


def test_flow_c_safety_assessment_and_contextual_explainability():
    """FLOW C: Distinct Safety Score vs Confidence, explanatory factors & environmental context."""
    # 1. Semantics endpoint
    sem_res = client.get("/api/safety/semantics")
    assert sem_res.status_code == 200
    sem_data = sem_res.json()
    assert "safety_score" in sem_data
    assert "confidence" in sem_data
    assert sem_data["safety_score"]["scale_min"] == 15.0
    assert sem_data["safety_score"]["scale_max"] == 95.0

    # 2. First plan a route to get a real alternative
    plan_payload = {
        "origin": {
            "name": "Chennai Central Railway Station",
            "lat": 13.0827,
            "lng": 80.2707,
            "is_resolved": True,
        },
        "destination": {
            "name": "T. Nagar Bus Terminus",
            "lat": 13.0418,
            "lng": 80.2341,
            "is_resolved": True,
        },
        "journey_date": datetime.now(CHENNAI_TIMEZONE).strftime("%Y-%m-%d"),
        "departure_time": "21:30",
        "route_preference": "BALANCED",
        "safety_weight_preference": 0.5,
    }
    plan_res = client.post("/api/routes/plan", json=plan_payload)
    assert plan_res.status_code == 200
    plan_data = plan_res.json()
    alt = plan_data["alternatives"][0]

    # 3. Route explainability endpoint
    explain_payload = {
        "route": alt,
        "all_alternatives": plan_data["alternatives"],
        "departure_time": "21:30",
    }
    res = client.post("/api/safety/routes/explain", json=explain_payload)
    assert res.status_code == 200
    data = res.json()

    assert data["route_id"] == alt["route_id"]
    assert "safety_score_semantics" in data
    assert "confidence_semantics" in data
    assert "why_this_route" in data
    assert len(data["category_breakdowns"]) >= 3

    # 4. Contextual evaluation (Solar illumination & weather)
    ctx_res = client.get("/api/context/current?lat=13.0827&lng=80.2707")
    assert ctx_res.status_code == 200
    ctx_data = ctx_res.json()
    assert "solar_context" in ctx_data
    assert "environmental_context" in ctx_data
    assert "solar_phase" in ctx_data["solar_context"]


def test_flow_d_community_reporting_and_moderation():
    """FLOW D: Community hazard report submission, confirmation, and moderation safeguards."""
    unique_reporter = f"user_{uuid.uuid4().hex[:6]}"
    mod_id = f"mod_{uuid.uuid4().hex[:6]}"

    # 1. Submit report with valid category and coordinates
    report_payload = {
        "category": "POOR_LIGHTING",
        "description": "Entire 200m stretch is completely unlit after 9 PM with broken lamps.",
        "latitude": 13.0565,
        "longitude": 80.2535,
        "location_name": "Anna Salai near Thousand Lights",
    }
    create_res = client.post(
        "/api/community/reports",
        json=report_payload,
        headers={"X-User-Id": unique_reporter},
    )
    assert create_res.status_code == 201
    report = create_res.json()
    report_id = report["report_id"]
    assert report["verification_status"] == "SUBMITTED"
    assert report["category"] == "POOR_LIGHTING"

    # 2. Community interaction (confirm report)
    interactor_id = f"user_{uuid.uuid4().hex[:6]}"
    interact_res = client.post(
        f"/api/community/reports/{report_id}/confirm",
        headers={"X-User-Id": interactor_id},
    )
    assert interact_res.status_code == 200
    assert interact_res.json()["confirmation_count"] >= 1

    # 3. Moderation: Creator cannot moderate own report (self-moderation prevention)
    self_mod_res = client.post(
        f"/api/community/reports/{report_id}/moderate",
        json={"status": "VERIFIED", "notes": "Self verification attempt"},
        headers={
            "X-Moderator-Id": unique_reporter,
            "X-Admin-Key": settings.MODERATOR_KEY,
        },
    )
    assert self_mod_res.status_code == 403

    # 4. Authorized moderation by distinct moderator
    mod_res = client.post(
        f"/api/community/reports/{report_id}/moderate",
        json={"status": "VERIFIED", "notes": "Verified by Chennai operations team."},
        headers={
            "X-Moderator-Id": mod_id,
            "X-Admin-Key": settings.MODERATOR_KEY,
        },
    )
    assert mod_res.status_code == 200
    assert mod_res.json()["verification_status"] == "VERIFIED"


def test_flow_e_journey_monitoring_and_sos():
    """FLOW E: Full journey monitoring lifecycle, periodic check-in, in-app SOS, and helplines."""
    # 1. Start journey
    start_payload = {
        "origin": "Chennai Central",
        "destination": "Besant Nagar Beach",
        "route_id": "ROUTE-ALT-SAFEST",
        "route_type": "SAFEST",
        "distance_km": 14.5,
        "duration_minutes": 35.0,
        "safety_score": 84.0,
        "confidence_score": 90.0,
        "check_in_interval_minutes": 15,
        "location_sharing_enabled": False,
        "is_demo_mode": False,
    }
    start_res = client.post("/api/journey/session", json=start_payload)
    assert start_res.status_code == 200
    session = start_res.json()
    journey_id = session["journey_id"]
    assert session["status"] == "ACTIVE"
    assert session["origin"] == "Chennai Central"

    # 2. Retrieve session state
    get_res = client.get(f"/api/journey/session/{journey_id}")
    assert get_res.status_code == 200
    assert get_res.json()["journey_id"] == journey_id

    # 3. Perform Safety Check-in
    chk_res = client.post(
        "/api/journey/transition",
        json={"journey_id": journey_id, "action": "check_in_ok"},
    )
    assert chk_res.status_code == 200
    assert chk_res.json()["check_in_status"] == "CONFIRMED_OK"

    # 4. Pause journey
    pause_res = client.post(
        "/api/journey/transition",
        json={"journey_id": journey_id, "action": "pause"},
    )
    assert pause_res.status_code == 200
    assert pause_res.json()["status"] == "PAUSED"

    # 5. Resume journey
    resume_res = client.post(
        "/api/journey/transition",
        json={"journey_id": journey_id, "action": "resume"},
    )
    assert resume_res.status_code == 200
    assert resume_res.json()["status"] == "ACTIVE"

    # 6. Activate and resolve in-app SOS prototype
    sos_act_res = client.post(
        "/api/journey/transition",
        json={"journey_id": journey_id, "action": "sos_activate"},
    )
    assert sos_act_res.status_code == 200
    assert sos_act_res.json()["sos_active"] is True

    sos_res_res = client.post(
        "/api/journey/transition",
        json={"journey_id": journey_id, "action": "sos_resolve"},
    )
    assert sos_res_res.status_code == 200
    assert sos_res_res.json()["sos_active"] is False

    # 7. Complete journey
    comp_res = client.post(
        "/api/journey/transition",
        json={"journey_id": journey_id, "action": "complete"},
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "COMPLETED"

    # 8. Verify Chennai Emergency Helplines catalog without false emergency claims
    help_res = client.get("/api/journey/helplines")
    assert help_res.status_code == 200
    helplines_data = help_res.json()
    assert helplines_data["city"] == "Chennai"
    numbers = {h["number"] for h in helplines_data["helplines"]}
    assert "100" in numbers  # Police
    assert "112" in numbers  # Emergency Response
    assert "1091" in numbers # Women Safety
    assert "The Suraksha Path prototype provides dialable shortcuts" in helplines_data["disclaimer"]


def test_flow_f_journey_analytics_and_preferences():
    """FLOW F: Record completed journey, verify safety analytics, and user route preferences."""
    today_ymd = datetime.now(CHENNAI_TIMEZONE).strftime("%Y-%m-%d")

    # 1. Record completed journey in historical ledger
    rec_res = client.post("/api/journey/record", json={
        "journey_id": "E2E-JRN-COMPLETED-01",
        "status": "COMPLETED",
        "origin": "Chennai Central",
        "destination": "T. Nagar",
        "route_type": "SAFEST",
        "distance_km": 12.0,
        "duration_minutes": 28.0,
        "elapsed_seconds": 1680,
        "safety_score": 86.5,
        "confidence_score": 92.0,
        "date_ymd": today_ymd,
        "is_demo": False,
    })
    assert rec_res.status_code == 201

    # 2. Verify Analytics calculation strictly reflects completed journey
    analytics_res = client.get("/api/journey/analytics?include_demo=false")
    assert analytics_res.status_code == 200
    metrics = analytics_res.json()
    assert metrics["total_journeys"] >= 1
    assert metrics["completed_journeys"] >= 1
    assert metrics["total_distance_km"] >= 12.0
    assert metrics["average_safety_score"] is not None
    assert metrics["average_safety_score"] >= 80.0

    # 3. User Route Preferences: Update, persist, and reset
    pref_payload = {
        "route_preference": "SAFEST",
        "safety_weight": 0.85,
        "avoid_unlit_areas": True,
        "max_acceptable_detour_minutes": 20.0,
        "min_confidence_threshold": 40.0,
        "prioritize_active_corridors": True,
    }
    update_pref_res = client.post("/api/preferences/route", json=pref_payload)
    assert update_pref_res.status_code == 200
    pref_data = update_pref_res.json()
    assert pref_data["safety_weight"] == 0.85
    assert pref_data["route_preference"] == "SAFEST"

    # Reset preferences
    reset_res = client.post("/api/preferences/route/reset")
    assert reset_res.status_code == 200
    reset_data = reset_res.json()
    assert reset_data["safety_weight"] == 0.50
    assert reset_data["route_preference"] == "BALANCED"


def test_flow_g_privacy_controls_and_history_cleanup():
    """FLOW G: Privacy controls for purging local and server-side journey ledgers."""
    # Seed a journey
    client.post("/api/journey/record", json={
        "journey_id": "PRIVACY-TEST-JRN",
        "status": "COMPLETED",
        "origin": "Adyar",
        "destination": "Guindy",
        "route_type": "BALANCED",
        "distance_km": 6.5,
        "duration_minutes": 15.0,
        "elapsed_seconds": 900,
        "safety_score": 75.0,
        "confidence_score": 80.0,
        "date_ymd": "2026-09-27",
        "is_demo": False,
    })

    # Clear journey history via DELETE /api/journey/history
    clear_res = client.delete("/api/journey/history")
    assert clear_res.status_code == 200

    # Verify metrics return to zeroed baseline
    analytics_res = client.get("/api/journey/analytics?include_demo=false")
    assert analytics_res.status_code == 200
    data = analytics_res.json()
    assert data["total_journeys"] == 0
    assert data["completed_journeys"] == 0
    assert data["total_distance_km"] == 0.0


def test_flow_h_continuous_feedback_and_audit():
    """FLOW H: User feedback ingestion, safety reassessment trigger, and governance audit trail."""
    init_db()
    with SessionLocal() as db:
        test_seg_code = f"SEG-E2E-{uuid.uuid4().hex[:6].upper()}"
        seg = RoadSegment(
            segment_code=test_seg_code,
            name="E2E Integration Test Segment",
            corridor="OMR",
            city="Chennai",
            start_lat=12.9800,
            start_lng=80.2400,
            end_lat=12.9850,
            end_lng=80.2450,
            length_meters=600.0,
            baseline_safety_score=70.0,
            current_safety_score=70.0,
            confidence_score=60.0,
            assessment_status="LIMITED_EVIDENCE",
            is_synthetic=True,
        )
        db.add(seg)
        db.commit()

    try:
        # Submit infrastructure issue feedback
        fb_payload = {
            "feedback_type": "INFRASTRUCTURE_ISSUE",
            "operational_intent": "NEW_OBSERVATION",
            "target_type": "SEGMENT",
            "target_segment_code": test_seg_code,
            "description": "Street lights repaired by GCC, stretch now well-illuminated.",
            "reporter_id": "chennai_commuter_e2e",
        }
        fb_res = client.post("/api/feedback/submit", json=fb_payload)
        assert fb_res.status_code == 201
        fb_data = fb_res.json()
        assert fb_data["reassessment_triggered"] is True

        # Check audit log contains record for this segment via GET /api/feedback-audit-log
        audit_res = client.get(f"/api/feedback-audit-log?segment_code={test_seg_code}")
        assert audit_res.status_code == 200
        logs = audit_res.json()
        assert len(logs) >= 1
        assert logs[0]["segment_code"] == test_seg_code
    finally:
        with SessionLocal() as db:
            db.query(ReassessmentAuditLog).filter(ReassessmentAuditLog.segment_code == test_seg_code).delete()
            db.query(AssessmentFeedback).filter(AssessmentFeedback.target_segment_code == test_seg_code).delete()
            db.query(RoadSegment).filter(RoadSegment.segment_code == test_seg_code).delete()
            db.commit()
