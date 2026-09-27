"""Unit and integration tests for Phase 9: Trust-Weighted Community Intelligence."""

import os
import unittest
from datetime import datetime, timezone, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from backend.app.database import Base, get_db
from backend.app.models.domain import RoadSegment, EvidenceItem, CommunityReport, ReportInteraction
from backend.app.services.community_service import CommunityService, COMMUNITY_CATEGORIES, STATUS_MULTIPLIERS
from backend.app.schemas.community import CommunityReportCreate
from backend.app.main import app

TEST_DB_PATH = "data/test_community_intelligence.db"
TEST_DATABASE_URL = f"sqlite:///{TEST_DB_PATH}"

class TestCommunityIntelligenceEngine(unittest.TestCase):
    """Test suite for trust-weighted community reporting, corroboration, disputes, and reassessment."""

    @classmethod
    def setUpClass(cls):
        os.makedirs("data", exist_ok=True)
        if os.path.exists(TEST_DB_PATH):
            os.remove(TEST_DB_PATH)

        cls.engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
        cls.TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)

    @classmethod
    def tearDownClass(cls):
        if os.path.exists(TEST_DB_PATH):
            try:
                os.remove(TEST_DB_PATH)
            except Exception:
                pass

    def setUp(self):
        Base.metadata.create_all(bind=self.engine)
        self.db = self.TestingSessionLocal()

        # Seed sample arterial road segment for Chennai
        self.seg = RoadSegment(
            segment_code="SEG-ANNA-TEST-001",
            name="Anna Salai (Gemini Flyover Stretch)",
            corridor="Anna Salai",
            city="Chennai",
            start_lat=13.0560,
            start_lng=80.2530,
            end_lat=13.0580,
            end_lng=80.2550,
            length_meters=500.0,
            current_safety_score=70.0,
            confidence_score=75.0,
            assessment_status="ASSESSED",
            evidence_count=2,
            is_synthetic=False,
        )
        self.db.add(self.seg)
        self.db.commit()

        self.service = CommunityService(self.db)

        def override_get_db():
            try:
                yield self.db
            finally:
                pass

        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)
        app.dependency_overrides.clear()

    def test_01_categories_metadata_integrity(self):
        """Verify controlled categories exist and specify half-life and impact parameters."""
        categories = self.service.get_categories()
        self.assertGreaterEqual(len(categories), 7)
        cat_keys = {c["category"] for c in categories}
        self.assertIn("POOR_LIGHTING", cat_keys)
        self.assertIn("ACTIVE_POLICE_PRESENCE", cat_keys)
        self.assertIn("DESERTED_STRETCH", cat_keys)

        lighting = next(c for c in categories if c["category"] == "POOR_LIGHTING")
        self.assertLess(lighting["base_impact"], 0.0)
        self.assertEqual(lighting["half_life_hours"], 72.0)

    def test_02_valid_report_submission_and_segment_linking(self):
        """Test creating a valid community observation with automatic road segment association."""
        data = CommunityReportCreate(
            category="POOR_LIGHTING",
            description="All five streetlamps between Nandanam and Saidapet are completely dark.",
            latitude=13.0565,
            longitude=80.2535,
            location_name="Near Gemini Flyover, Anna Salai",
            segment_code="SEG-ANNA-TEST-001",
        )
        report = self.service.submit_report(data, reporter_id="user_commuter_1")
        self.assertIsNotNone(report.id)
        self.assertTrue(report.report_id.startswith("REP-"))
        self.assertEqual(report.segment_code, "SEG-ANNA-TEST-001")
        self.assertEqual(report.verification_status, "SUBMITTED")
        self.assertLess(report.safety_score_impact, 0.0)
        self.assertGreater(report.effective_trust_weight, 0.0)

        # Check that EvidenceItem bridge was created
        evd = self.db.query(EvidenceItem).filter(EvidenceItem.evidence_id == f"EVD-{report.report_id}").first()
        self.assertIsNotNone(evd)
        self.assertEqual(evd.source_type, "COMMUNITY_OBSERVATION")
        self.assertEqual(evd.segment_code, "SEG-ANNA-TEST-001")

    def test_03_invalid_coordinates_and_short_description_rejected(self):
        """Verify API rejects coordinates outside Chennai or excessively short descriptions."""
        # Latitude outside Chennai
        with self.assertRaises(ValueError):
            CommunityReportCreate(
                category="POOR_LIGHTING",
                description="Valid description of broken lighting stretch.",
                latitude=28.6139,  # Delhi latitude
                longitude=80.2530,
            )

        # Description too short (< 10 chars)
        with self.assertRaises(ValueError):
            CommunityReportCreate(
                category="POOR_LIGHTING",
                description="Dark road",  # 9 chars
                latitude=13.0560,
                longitude=80.2530,
            )

    def test_04_duplicate_observation_detection(self):
        """Verify that a duplicate report within 120m of the same category is detected."""
        data1 = CommunityReportCreate(
            category="POOR_LIGHTING",
            description="First report: flickering lamp post along carriage way.",
            latitude=13.0560,
            longitude=80.2530,
            segment_code="SEG-ANNA-TEST-001",
        )
        rep1 = self.service.submit_report(data1, reporter_id="user_commuter_1")

        # Check duplicate nearby (30m away)
        dup = self.service.check_duplicate_report("POOR_LIGHTING", 13.0562, 80.2532, radius_meters=120.0)
        self.assertIsNotNone(dup)
        self.assertEqual(dup.report_id, rep1.report_id)

        # Check distinct category not marked duplicate
        dup_diff = self.service.check_duplicate_report("ACTIVE_POLICE_PRESENCE", 13.0562, 80.2532)
        self.assertIsNone(dup_diff)

    def test_05_cannot_confirm_own_report(self):
        """Ensure a user cannot artificially inflate their own report's trust weight."""
        data = CommunityReportCreate(
            category="ROAD_HAZARD",
            description="Deep monsoon waterlogging obstruction near bus bay.",
            latitude=13.0560,
            longitude=80.2530,
            segment_code="SEG-ANNA-TEST-001",
        )
        report = self.service.submit_report(data, reporter_id="user_reporter_42")

        with self.assertRaises(ValueError) as ctx:
            self.service.interact_with_report(report.report_id, user_id="user_reporter_42", interaction_type="CONFIRM")
        self.assertIn("cannot confirm your own", str(ctx.exception).lower())

    def test_06_independent_confirmation_amplifies_trust_weight(self):
        """Verify that corroboration by distinct users increases confidence weight."""
        data = CommunityReportCreate(
            category="DESERTED_STRETCH",
            description="Shops closed early, unlit stretch with zero footfall.",
            latitude=13.0560,
            longitude=80.2530,
            segment_code="SEG-ANNA-TEST-001",
        )
        report = self.service.submit_report(data, reporter_id="user_original")
        initial_w = report.effective_trust_weight

        # First independent confirmation
        res1 = self.service.interact_with_report(report.report_id, user_id="user_independent_1", interaction_type="CONFIRM")
        self.assertEqual(res1.confirmation_count, 1)
        w1 = res1.effective_trust_weight
        self.assertGreater(w1, initial_w)

        # Second independent confirmation
        res2 = self.service.interact_with_report(report.report_id, user_id="user_independent_2", interaction_type="CONFIRM")
        self.assertEqual(res2.confirmation_count, 2)
        self.assertGreater(res2.effective_trust_weight, w1)

    def test_07_prevent_duplicate_confirmation_by_same_user(self):
        """Verify that the same user cannot submit multiple confirmations for one report."""
        data = CommunityReportCreate(
            category="ACTIVE_POLICE_PRESENCE",
            description="Manned mobile police patrol van at junction.",
            latitude=13.0560,
            longitude=80.2530,
            segment_code="SEG-ANNA-TEST-001",
        )
        report = self.service.submit_report(data, reporter_id="user_a")
        self.service.interact_with_report(report.report_id, user_id="user_b", interaction_type="CONFIRM")

        # Second attempt by user_b must fail
        with self.assertRaises(ValueError) as ctx:
            self.service.interact_with_report(report.report_id, user_id="user_b", interaction_type="CONFIRM")
        self.assertIn("already submitted", str(ctx.exception).lower())

    def test_08_disputes_penalize_trust_weight_and_shift_status(self):
        """Verify that community disputes dampen trust weight and trigger DISPUTED status."""
        data = CommunityReportCreate(
            category="POOR_LIGHTING",
            description="Streetlights alleged dark along main carriageway.",
            latitude=13.0560,
            longitude=80.2530,
            segment_code="SEG-ANNA-TEST-001",
        )
        report = self.service.submit_report(data, reporter_id="user_reporter")
        base_w = report.effective_trust_weight

        # Two disputes
        self.service.interact_with_report(report.report_id, user_id="user_disputer_1", interaction_type="DISPUTE")
        rep_disputed = self.service.interact_with_report(report.report_id, user_id="user_disputer_2", interaction_type="DISPUTE")

        self.assertEqual(rep_disputed.dispute_count, 2)
        self.assertEqual(rep_disputed.verification_status, "DISPUTED")
        self.assertLess(rep_disputed.effective_trust_weight, base_w)

    def test_09_moderator_verification_and_rejection(self):
        """Test administrative moderation with key validation and state transitions."""
        data = CommunityReportCreate(
            category="ACTIVE_POLICE_PRESENCE",
            description="Chennai Police beat patrol station active.",
            latitude=13.0560,
            longitude=80.2530,
            segment_code="SEG-ANNA-TEST-001",
        )
        report = self.service.submit_report(data, reporter_id="user_scout")

        # Invalid admin key rejected
        with self.assertRaises(PermissionError):
            self.service.moderate_report(
                report.report_id,
                target_status="VERIFIED",
                moderator_id="admin_1",
                moderator_key="wrong_secret_key",
            )

        # Valid admin key succeeds
        verified = self.service.moderate_report(
            report.report_id,
            target_status="VERIFIED",
            moderator_id="admin_1",
            moderator_key="suraksha-chennai-moderator-2026",
            notes="Confirmed via CCTV telemetry",
        )
        self.assertEqual(verified.verification_status, "VERIFIED")
        self.assertGreater(verified.effective_trust_weight, 0.6)

        # Moderation rejection
        rejected = self.service.moderate_report(
            report.report_id,
            target_status="REJECTED",
            moderator_id="admin_1",
            moderator_key="suraksha-chennai-moderator-2026",
            notes="False report / prank",
        )
        self.assertEqual(rejected.verification_status, "REJECTED")
        self.assertFalse(rejected.is_active)
        self.assertEqual(rejected.effective_trust_weight, 0.0)
        self.assertEqual(rejected.safety_score_impact, 0.0)

    def test_10_recency_decay_and_expiration(self):
        """Test exponential time decay and automatic expiration past validity window."""
        now = datetime.now(timezone.utc)
        report = CommunityReport(
            report_id="REP-DECAY-TEST",
            category="SUSPICIOUS_LOITERING",  # half_life: 12h, validity: 48h
            description="Aggressive loitering observed near corner.",
            latitude=13.0560,
            longitude=80.2530,
            reporter_id="user_decay",
            observed_at=now - timedelta(hours=24),  # 2 half-lives old
            reported_at=now - timedelta(hours=24),
            verification_status="SUBMITTED",
        )
        w_24h, impact_24h, _ = self.service.calculate_trust_weight(report, as_of_time=now)
        # Decay factor should be ~0.25 (0.5^2)
        self.assertLess(w_24h, 0.3)

        # Over 50 hours old (> 48h validity) -> EXPIRED
        report.observed_at = now - timedelta(hours=50)
        w_expired, impact_expired, _ = self.service.calculate_trust_weight(report, as_of_time=now)
        self.assertEqual(report.verification_status, "EXPIRED")
        self.assertEqual(w_expired, 0.0)
        self.assertEqual(impact_expired, 0.0)

    def test_11_reporter_privacy_in_api_response(self):
        """Verify reporter's private user ID is masked in response."""
        data = CommunityReportCreate(
            category="POOR_LIGHTING",
            description="Broken luminaire with live exposed wiring hazard.",
            latitude=13.0560,
            longitude=80.2530,
            segment_code="SEG-ANNA-TEST-001",
        )
        report = self.service.submit_report(data, reporter_id="kannan_personal_email_9999")
        formatted = self.service.format_report_response(report)

        self.assertNotIn("kannan_personal_email", formatted.reporter_display)
        self.assertTrue(formatted.reporter_display.startswith("Community Contributor #"))

    def test_12_submission_rate_limiting(self):
        """Verify rate limiting prevents rapid-fire submission bursts (> 5/hr)."""
        for i in range(5):
            data = CommunityReportCreate(
                category="POOR_LIGHTING",
                description=f"Rapid submission test observation number {i + 1}.",
                latitude=13.0560,
                longitude=80.2530,
                segment_code="SEG-ANNA-TEST-001",
            )
            self.service.submit_report(data, reporter_id="user_spammer")

        # 6th attempt must be rejected by rate limiter
        data_6th = CommunityReportCreate(
            category="POOR_LIGHTING",
            description="Sixth rapid submission exceeding the rate limit window.",
            latitude=13.0560,
            longitude=80.2530,
            segment_code="SEG-ANNA-TEST-001",
        )
        with self.assertRaises(ValueError) as ctx:
            self.service.submit_report(data_6th, reporter_id="user_spammer")
        self.assertIn("rate limit exceeded", str(ctx.exception).lower())

    def test_13_api_endpoints_integration(self):
        """Integration test for HTTP endpoints via FastAPI TestClient."""
        # 1. GET categories
        res = self.client.get("/api/community/categories")
        self.assertEqual(res.status_code, 200)
        cats = res.json()
        self.assertIsInstance(cats, list)

        # 2. POST report
        payload = {
            "category": "ACTIVE_POLICE_PRESENCE",
            "description": "Stationary PCR police patrol vehicle deployed at intersection.",
            "latitude": 13.0560,
            "longitude": 80.2530,
            "location_name": "Anna Salai Thousand Lights",
            "segment_code": "SEG-ANNA-TEST-001",
        }
        create_res = self.client.post("/api/community/reports", json=payload, headers={"X-User-Id": "client_tester_1"})
        self.assertEqual(create_res.status_code, 201)
        rep_json = create_res.json()
        rep_id = rep_json["report_id"]
        self.assertEqual(rep_json["verification_status"], "SUBMITTED")

        # 3. GET report detail
        detail_res = self.client.get(f"/api/community/reports/{rep_id}")
        self.assertEqual(detail_res.status_code, 200)
        self.assertEqual(detail_res.json()["report_id"], rep_id)

        # 4. POST confirm
        confirm_res = self.client.post(
            f"/api/community/reports/{rep_id}/confirm",
            headers={"X-User-Id": "client_tester_2"},
            json={"comments": "Confirmed presence of police van"},
        )
        self.assertEqual(confirm_res.status_code, 200)
        self.assertEqual(confirm_res.json()["confirmation_count"], 1)

        # 5. POST dispute
        dispute_res = self.client.post(
            f"/api/community/reports/{rep_id}/dispute",
            headers={"X-User-Id": "client_tester_3"},
            json={"interaction_type": "DISPUTE", "comments": "Van left 10 minutes ago"},
        )
        self.assertEqual(dispute_res.status_code, 200)
        self.assertEqual(dispute_res.json()["dispute_count"], 1)

        # 6. POST moderate with valid admin key
        mod_res = self.client.post(
            f"/api/community/reports/{rep_id}/moderate",
            headers={"X-Admin-Key": "suraksha-chennai-moderator-2026"},
            json={"status": "VERIFIED", "notes": "Verified via station beat record"},
        )
        self.assertEqual(mod_res.status_code, 200)
        self.assertEqual(mod_res.json()["verification_status"], "VERIFIED")

        # 7. GET reports list
        list_res = self.client.get("/api/community/reports?status=VERIFIED")
        self.assertEqual(list_res.status_code, 200)
        self.assertGreaterEqual(list_res.json()["total"], 1)

if __name__ == "__main__":
    unittest.main()
