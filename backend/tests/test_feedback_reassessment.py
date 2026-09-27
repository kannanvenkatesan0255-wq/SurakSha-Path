"""Unittest test suite for Phase 12 Feedback-Driven Reassessment & Continuous Improvement."""

import unittest
import uuid
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.database import SessionLocal, init_db
from backend.app.models.domain import (
    RoadSegment,
    EvidenceItem,
    CommunityReport,
    AssessmentFeedback,
    ReassessmentAuditLog,
)
from backend.app.config import settings

client = TestClient(app)


class TestFeedbackReassessment(unittest.TestCase):
    """Test suite covering feedback ingestion, review, controlled reassessment, and audit logs."""

    @classmethod
    def setUpClass(cls):
        init_db()
        cls.db = SessionLocal()

        # Create test segment
        cls.test_seg_code = f"SEG-FB-TEST-{uuid.uuid4().hex[:6].upper()}"
        cls.test_seg = RoadSegment(
            segment_code=cls.test_seg_code,
            name="Feedback Test Corridor",
            corridor="Anna Salai",
            city="Chennai",
            start_lat=13.0450,
            start_lng=80.2450,
            end_lat=13.0480,
            end_lng=80.2480,
            length_meters=450.0,
            baseline_safety_score=65.0,
            current_safety_score=65.0,
            confidence_score=50.0,
            assessment_status="LIMITED_EVIDENCE",
            is_synthetic=True,
        )
        cls.db.add(cls.test_seg)
        cls.db.commit()
        cls.db.refresh(cls.test_seg)

        # Seed an initial reassessment audit log for the test segment
        initial_log = ReassessmentAuditLog(
            audit_id=f"LOG-{uuid.uuid4().hex[:8].upper()}",
            trigger_type="BASELINE_INGESTION",
            trigger_reference_id="TEST_SEED",
            segment_code=cls.test_seg_code,
            previous_safety_score=60.0,
            new_safety_score=65.0,
            score_delta=5.0,
            previous_confidence=40.0,
            new_confidence=50.0,
            confidence_delta=10.0,
            previous_status="UNASSESSED",
            new_status="LIMITED_EVIDENCE",
            explanation_summary="Initial test baseline assessment.",
            created_at=datetime.now(timezone.utc),
        )
        cls.db.add(initial_log)
        cls.db.commit()

    @classmethod

    def tearDownClass(cls):
        # Cleanup test data
        cls.db.query(ReassessmentAuditLog).filter(ReassessmentAuditLog.segment_code == cls.test_seg_code).delete()
        cls.db.query(AssessmentFeedback).filter(AssessmentFeedback.target_segment_code == cls.test_seg_code).delete()
        cls.db.query(EvidenceItem).filter(EvidenceItem.segment_code == cls.test_seg_code).delete()
        cls.db.query(RoadSegment).filter(RoadSegment.segment_code == cls.test_seg_code).delete()
        cls.db.commit()
        cls.db.close()

    def test_feedback_types_catalog(self):
        """Verify GET /api/feedback/types returns all controlled feedback categories."""
        response = client.get("/api/feedback/types")
        self.assertEqual(response.status_code, 200)
        types = response.json()
        self.assertGreaterEqual(len(types), 7)
        keys = [t["type_key"] for t in types]
        self.assertIn("CONDITION_CHANGED", keys)
        self.assertIn("OBSERVATION_OUTDATED", keys)
        self.assertIn("REPORT_INACCURATE", keys)
        self.assertIn("INFRASTRUCTURE_ISSUE", keys)
        self.assertIn("ASSESSMENT_INCONSISTENT", keys)
        self.assertIn("LOCATION_ASSOCIATION_ERROR", keys)
        self.assertIn("GENERAL_PRODUCT_FEEDBACK", keys)

        # Check that GENERAL_PRODUCT_FEEDBACK does not affect safety scores
        gen_type = next(t for t in types if t["type_key"] == "GENERAL_PRODUCT_FEEDBACK")
        self.assertFalse(gen_type["affects_safety_score"])

    def test_submit_valid_infrastructure_feedback(self):
        """Verify submitting infrastructure defect feedback triggers reassessment."""
        payload = {
            "feedback_type": "INFRASTRUCTURE_ISSUE",
            "operational_intent": "NEW_OBSERVATION",
            "target_type": "SEGMENT",
            "target_segment_code": self.test_seg_code,
            "description": "Streetlight pole damaged near intersection, stretch is completely dark.",
            "reporter_id": "commuter_anna_salai",
        }
        response = client.post("/api/feedback/submit", json=payload)
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertTrue(data["reassessment_triggered"])
        self.assertIn(self.test_seg_code, data["affected_segments"])
        self.assertIsNotNone(data["segment_reassessment"])

        # Check reporter privacy masking
        self.assertTrue(data["feedback"]["reporter_id_masked"].startswith("com****"))
        self.assertNotIn("commuter_anna_salai", data["feedback"]["reporter_id_masked"])

    def test_submit_general_product_feedback_does_not_affect_scores(self):
        """Verify general UX feedback is resolved immediately without triggering segment reassessment."""
        payload = {
            "feedback_type": "GENERAL_PRODUCT_FEEDBACK",
            "operational_intent": "GENERAL_FEEDBACK",
            "target_type": "GENERAL",
            "description": "Love the dark mode interface, please add Tamil language route audio.",
            "reporter_id": "chennai_user_01",
        }
        response = client.post("/api/feedback/submit", json=payload)
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertFalse(data["reassessment_triggered"])
        self.assertEqual(data["affected_segments"], [])
        self.assertIsNone(data["segment_reassessment"])
        self.assertEqual(data["feedback"]["status"], "RESOLVED")

    def test_idempotent_submission(self):
        """Verify repeated submission with same idempotency_key returns identical feedback without duplicate reassessment."""
        idempotency_key = f"IDEMP-{uuid.uuid4().hex}"
        payload = {
            "feedback_type": "CONDITION_CHANGED",
            "operational_intent": "CORRECTION",
            "target_type": "SEGMENT",
            "target_segment_code": self.test_seg_code,
            "description": "Street light has been fixed and is fully operational again.",
            "reporter_id": "test_runner",
            "idempotency_key": idempotency_key,
        }
        res1 = client.post("/api/feedback/submit", json=payload)
        self.assertEqual(res1.status_code, 201)
        fb_id_1 = res1.json()["feedback"]["feedback_id"]

        # Resend identical request
        res2 = client.post("/api/feedback/submit", json=payload)
        self.assertEqual(res2.status_code, 201)
        fb_id_2 = res2.json()["feedback"]["feedback_id"]

        self.assertEqual(fb_id_1, fb_id_2)

    def test_moderation_review_workflow(self):
        """Verify moderator review can accept a pending dispute and execute reassessment."""
        # Submit feedback requiring review
        payload = {
            "feedback_type": "ASSESSMENT_INCONSISTENT",
            "operational_intent": "DISPUTE",
            "target_type": "SEGMENT",
            "target_segment_code": self.test_seg_code,
            "description": "The score is calculated too high; this street has significant blindspots at night.",
            "reporter_id": "dispute_user_99",
        }
        res = client.post("/api/feedback/submit", json=payload)
        self.assertEqual(res.status_code, 201)
        fb = res.json()["feedback"]
        self.assertEqual(fb["status"], "PENDING_REVIEW")
        feedback_id = fb["feedback_id"]

        # 1. Attempt moderation with invalid key
        bad_rev = client.post(
            f"/api/feedback/{feedback_id}/review",
            json={
                "target_status": "ACCEPTED",
                "moderator_id": "mod_ravi",
                "moderator_key": "wrong_key_123",
                "review_notes": "Attempt unauthorized review",
            },
        )
        self.assertEqual(bad_rev.status_code, 403)

        # 2. Attempt self-moderation (moderator is the reporter)
        self_mod = client.post(
            f"/api/feedback/{feedback_id}/review",
            json={
                "target_status": "ACCEPTED",
                "moderator_id": "dispute_user_99",
                "moderator_key": settings.MODERATOR_KEY,
                "review_notes": "Attempt self approval",
            },
        )
        self.assertEqual(self_mod.status_code, 403)

        # 3. Legitimate moderation review
        good_rev = client.post(
            f"/api/feedback/{feedback_id}/review",
            json={
                "target_status": "ACCEPTED",
                "moderator_id": "mod_officer_chennai",
                "moderator_key": settings.MODERATOR_KEY,
                "review_notes": "Field survey corroborates blindspot condition.",
            },
        )
        self.assertEqual(good_rev.status_code, 200)
        reviewed_fb = good_rev.json()
        self.assertEqual(reviewed_fb["status"], "ACCEPTED")
        self.assertTrue(reviewed_fb["reassessment_applied"])

    def test_direct_segment_reassessment_endpoint(self):
        """Verify POST /api/feedback/reassess-segment/{segment_code} updates scores and records audit log."""
        res = client.post(f"/api/feedback/reassess-segment/{self.test_seg_code}")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["segment_code"], self.test_seg_code)
        self.assertTrue(data["reassessment_applied"])
        self.assertIsNotNone(data["audit_log"])
        self.assertIn("LOG-", data["audit_log"]["audit_id"])

    def test_segment_history_endpoint(self):
        """Verify GET /api/feedback/segment/{segment_code}/history returns audit logs and feedback."""
        res = client.get(f"/api/feedback/segment/{self.test_seg_code}/history")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["segment_code"], self.test_seg_code)
        self.assertGreaterEqual(data["total_reassessments"], 1)
        self.assertIn("audit_logs", data)
        self.assertIn("disclaimer", data)

    def test_audit_log_query(self):
        """Verify GET /api/feedback-audit-log returns historical audit logs."""
        res = client.get(f"/api/feedback-audit-log?segment_code={self.test_seg_code}")
        self.assertEqual(res.status_code, 200)
        items = res.json()
        self.assertIsInstance(items, list)
        self.assertGreaterEqual(len(items), 1)

    def test_legacy_journey_feedback_endpoint(self):
        """Verify legacy POST /api/feedback still functions cleanly."""
        payload = {
            "route_evaluation_id": 101,
            "affected_segment_code": self.test_seg_code,
            "perceived_safety_rating": 4,
            "felt_safe": True,
            "comments": "Smooth transit corridor.",
        }
        res = client.post("/api/feedback", json=payload)
        self.assertIn(res.status_code, (200, 201))
        data = response_data = res.json()

        self.assertTrue(data["reassessment_triggered"])
        self.assertIn(self.test_seg_code, data["affected_segments_identified"])


if __name__ == "__main__":
    unittest.main()
