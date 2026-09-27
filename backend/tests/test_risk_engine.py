"""Comprehensive automated test suite for Phase 8 Evidence-Based Safety & Risk Assessment Engine.

Tests:
- Valid and invalid evidence records, coordinate bounds, missing provenance
- Duplicate evidence detection
- Evidence category freshness half-life decay
- Segment-to-evidence direct and spatial association
- Deterministic risk assessment and score clamping
- Insufficient-data, limited-data, and assessed states (ensuring missing data != safe)
- Confidence and coverage separated from risk
- Route aggregation over full, partial, and unmatched segments
- Nocturnal departure time evaluation
- Traceable contributing factors
- REST API safety and evidence endpoints
"""

import os
import json
import unittest
from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.models.domain import RoadSegment, EvidenceItem
from backend.app.schemas.evidence import EvidenceCreate
from backend.app.services.evidence_service import EvidenceService, CATEGORY_HALF_LIFE_DAYS
from backend.app.services.confidence_engine import ConfidenceEngine
from backend.app.services.risk_service import RiskService
from backend.app.services.road_network_service import RoadNetworkService

TEST_DB_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "test_risk_engine.db"))
TEST_SQLALCHEMY_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"

engine = create_engine(
    TEST_SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


class TestRiskAssessmentEngine(unittest.TestCase):
    """Test suite for safety evidence and risk assessment engine."""

    def setUp(self):
        Base.metadata.create_all(bind=engine)
        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)
        self.db = TestingSessionLocal()

        # Seed test road segments
        self.seg1 = RoadSegment(
            segment_code="SEG-TEST-ANNA-01",
            name="Anna Salai North",
            corridor="Anna Salai",
            start_lat=13.0730,
            start_lng=80.2660,
            end_lat=13.0650,
            end_lng=80.2580,
            length_meters=1200.0,
            road_classification="trunk",
            source_feature_id="way/99001",
            source_dataset="Test Fixture",
            geometry_geojson=json.dumps({
                "type": "LineString",
                "coordinates": [[80.2660, 13.0730], [80.2620, 13.0690], [80.2580, 13.0650]]
            }),
            is_synthetic=True,
        )
        self.seg2 = RoadSegment(
            segment_code="SEG-TEST-POON-01",
            name="Poonamallee High Road Central",
            corridor="Poonamallee High Road",
            start_lat=13.0827,
            start_lng=80.2707,
            end_lat=13.0790,
            end_lng=80.2610,
            length_meters=1100.0,
            road_classification="primary",
            source_feature_id="way/99002",
            source_dataset="Test Fixture",
            geometry_geojson=json.dumps({
                "type": "LineString",
                "coordinates": [[80.2707, 13.0827], [80.2650, 13.0750], [80.2610, 13.0790]]
            }),
            is_synthetic=True,
        )
        self.seg_unassessed = RoadSegment(
            segment_code="SEG-TEST-UNASSESSED-01",
            name="Silent Residential Lane",
            corridor="Mylapore",
            start_lat=13.0350,
            start_lng=80.2680,
            end_lat=13.0320,
            end_lng=80.2650,
            length_meters=400.0,
            road_classification="residential",
            source_feature_id="way/99003",
            source_dataset="Test Fixture",
            geometry_geojson=json.dumps({
                "type": "LineString",
                "coordinates": [[80.2680, 13.0350], [80.2650, 13.0320]]
            }),
            is_synthetic=True,
        )
        self.db.add_all([self.seg1, self.seg2, self.seg_unassessed])
        self.db.commit()

        self.evidence_service = EvidenceService(self.db)
        self.risk_service = RiskService(self.db)

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=engine)
        app.dependency_overrides.clear()

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()
        if os.path.exists(TEST_DB_FILE):
            try:
                os.remove(TEST_DB_FILE)
            except Exception:
                pass

    # --------------------------------------------------------------------------
    # 1. Evidence Creation, Validation, and Quality Checks
    # --------------------------------------------------------------------------
    def test_create_valid_evidence_record(self):
        """Verify valid evidence record creation and automatic segment association."""
        evd = EvidenceCreate(
            category="LIGHTING",
            source_type="SOURCED_PUBLIC_DATA",
            source_name="GCC Streetlight Register",
            source_reference="Audit 2026",
            factor_name="LED Luminaire Lighting",
            impact_score=7.0,
            confidence_weight=0.9,
            latitude=13.0730,
            longitude=80.2660,
            segment_code="SEG-TEST-ANNA-01",
            observed_at=datetime.now(timezone.utc),
            verification_status="VERIFIED",
        )
        res = self.evidence_service.create_evidence(evd)
        self.assertTrue(res.evidence_id.startswith("EVD-LIG-"))
        self.assertEqual(res.segment_code, "SEG-TEST-ANNA-01")
        self.assertEqual(res.impact_score, 7.0)
        self.assertEqual(res.verification_status, "VERIFIED")

    def test_reject_invalid_coordinates(self):
        """Reject records with out-of-bounds coordinates or mismatched lat/lng."""
        with self.assertRaises(ValueError):
            EvidenceCreate(
                category="LIGHTING",
                source_type="SOURCED_PUBLIC_DATA",
                source_name="Test Source",
                factor_name="Test Factor",
                latitude=95.0,  # Invalid lat > 90
                longitude=80.0,
            )
        with self.assertRaises(ValueError):
            EvidenceCreate(
                category="LIGHTING",
                source_type="SOURCED_PUBLIC_DATA",
                source_name="Test Source",
                factor_name="Test Factor",
                latitude=13.0,
                longitude=None,  # Missing lng
            )

    def test_duplicate_evidence_id_rejected(self):
        """Ensure duplicate evidence_id cannot be inserted."""
        evd = EvidenceCreate(
            evidence_id="EVD-UNIQUE-001",
            category="LIGHTING",
            source_type="SOURCED_PUBLIC_DATA",
            source_name="Test Source",
            factor_name="Test Factor",
            segment_code="SEG-TEST-ANNA-01",
        )
        self.evidence_service.create_evidence(evd)
        with self.assertRaises(ValueError):
            self.evidence_service.create_evidence(evd)

    # --------------------------------------------------------------------------
    # 2. Freshness & Decay Calculations
    # --------------------------------------------------------------------------
    def test_freshness_half_life_decay(self):
        """Verify exponential time-decay across different evidence categories."""
        now = datetime.now(timezone.utc)
        # Lighting half-life is 90 days
        obs_90d_ago = now - timedelta(days=90)
        decay, is_stale, days_old = EvidenceService.calculate_freshness(obs_90d_ago, "LIGHTING", now)
        # At exactly 1 half-life, decay should be approx 0.50
        self.assertAlmostEqual(decay, 0.50, delta=0.05)
        self.assertFalse(is_stale)
        self.assertEqual(days_old, 90.0)

        # Older than 2 half-lives (>180d) should be marked stale
        obs_200d_ago = now - timedelta(days=200)
        decay_stale, is_stale_flag, _ = EvidenceService.calculate_freshness(obs_200d_ago, "LIGHTING", now)
        self.assertTrue(is_stale_flag)
        self.assertTrue(decay_stale <= 0.25)

    def test_undated_evidence_receives_recency_discount(self):
        """Undated records should not crash and should receive a fixed discount."""
        decay, is_stale, days_old = EvidenceService.calculate_freshness(None, "LIGHTING")
        self.assertEqual(decay, 0.70)
        self.assertFalse(is_stale)
        self.assertIsNone(days_old)

    # --------------------------------------------------------------------------
    # 3. Spatial Association
    # --------------------------------------------------------------------------
    def test_spatial_proximity_evidence_association(self):
        """Verify an evidence item with coordinates near a segment is associated via proximity."""
        # Near SEG-TEST-ANNA-01 start coordinate
        evd = EvidenceCreate(
            category="POLICE_PRESENCE",
            source_type="SOURCED_PUBLIC_DATA",
            source_name="Police Directory",
            factor_name="Nearby Beat Outpost",
            latitude=13.0731,
            longitude=80.2661,
            segment_code=None,  # No explicit code; relies on spatial matching
        )
        res = self.evidence_service.create_evidence(evd)
        self.assertEqual(res.segment_code, "SEG-TEST-ANNA-01")

    def test_unmatched_evidence_handled_gracefully(self):
        """Evidence far outside the road network is stored with segment_code=None."""
        evd = EvidenceCreate(
            category="ENVIRONMENTAL",
            source_type="SOURCED_PUBLIC_DATA",
            source_name="Weather Sensor",
            factor_name="Rain Gauge",
            latitude=13.2500,  # Far North outside seeded segments
            longitude=80.1000,
            segment_code=None,
        )
        res = self.evidence_service.create_evidence(evd)
        self.assertIsNone(res.segment_code)

    # --------------------------------------------------------------------------
    # 4. Segment Risk Assessment Engine States
    # --------------------------------------------------------------------------
    def test_insufficient_data_state_for_unassessed_segment(self):
        """CRITICAL: Missing evidence must produce INSUFFICIENT_DATA with safety_score=None."""
        assessment = self.risk_service.evaluate_segment_safety("SEG-TEST-UNASSESSED-01")
        self.assertEqual(assessment.status, "INSUFFICIENT_DATA")
        self.assertIsNone(assessment.safety_score)
        self.assertEqual(assessment.risk_level, "UNKNOWN")
        self.assertEqual(assessment.confidence_score, 10.0)
        self.assertTrue(len(assessment.missing_data_warnings) > 0)

    def test_limited_evidence_state(self):
        """1-2 evidence items produce LIMITED_EVIDENCE with calculated score and moderate confidence."""
        evd1 = EvidenceCreate(
            category="LIGHTING",
            source_type="SOURCED_PUBLIC_DATA",
            source_name="GCC Lighting",
            factor_name="Main Road Illumination",
            impact_score=8.0,
            confidence_weight=0.9,
            segment_code="SEG-TEST-POON-01",
            observed_at=datetime.now(timezone.utc),
            verification_status="VERIFIED",
        )
        self.evidence_service.create_evidence(evd1)

        assessment = self.risk_service.evaluate_segment_safety("SEG-TEST-POON-01")
        self.assertEqual(assessment.status, "LIMITED_EVIDENCE")
        self.assertIsNotNone(assessment.safety_score)
        self.assertTrue(assessment.safety_score > 50.0)
        self.assertTrue(assessment.confidence_score < 70.0)

    def test_fully_assessed_state_and_contributing_factors(self):
        """Multiple corroborated categories produce ASSESSED state with traceable factors."""
        now = datetime.now(timezone.utc)
        items = [
            EvidenceCreate(
                category="LIGHTING",
                source_type="SOURCED_PUBLIC_DATA",
                source_name="GCC Lighting",
                factor_name="Continuous LED Lighting",
                impact_score=8.5,
                confidence_weight=0.95,
                segment_code="SEG-TEST-ANNA-01",
                observed_at=now,
                verification_status="VERIFIED",
            ),
            EvidenceCreate(
                category="POLICE_PRESENCE",
                source_type="SOURCED_PUBLIC_DATA",
                source_name="Police Outpost Directory",
                factor_name="24/7 Police Outpost (< 100m)",
                impact_score=7.5,
                confidence_weight=0.90,
                segment_code="SEG-TEST-ANNA-01",
                observed_at=now,
                verification_status="VERIFIED",
            ),
            EvidenceCreate(
                category="ROAD_CHARACTERISTIC",
                source_type="SOURCED_PUBLIC_DATA",
                source_name="OSM Road Tags",
                factor_name="Divided Dual Carriageway",
                impact_score=6.0,
                confidence_weight=0.92,
                segment_code="SEG-TEST-ANNA-01",
                observed_at=now,
                verification_status="VERIFIED",
            ),
        ]
        for it in items:
            self.evidence_service.create_evidence(it)

        assessment = self.risk_service.evaluate_segment_safety("SEG-TEST-ANNA-01")
        self.assertEqual(assessment.status, "ASSESSED")
        self.assertEqual(assessment.risk_level, "LOW")
        self.assertTrue(assessment.safety_score >= 70.0)
        self.assertTrue(assessment.confidence_score >= 70.0)
        self.assertEqual(len(assessment.contributing_factors), 3)

        # Verify traceability of factors
        for f in assessment.contributing_factors:
            self.assertTrue(f.evidence_id.startswith("EVD-"))
            self.assertEqual(f.direction, "POSITIVE")

    def test_contradictory_evidence_handling(self):
        """Positive infrastructure balanced against negative hazard report in net impact."""
        now = datetime.now(timezone.utc)
        pos = EvidenceCreate(
            category="LIGHTING",
            source_type="SOURCED_PUBLIC_DATA",
            source_name="GCC Lighting",
            factor_name="Street Lighting",
            impact_score=7.0,
            confidence_weight=0.9,
            segment_code="SEG-TEST-POON-01",
            observed_at=now,
            verification_status="VERIFIED",
        )
        neg = EvidenceCreate(
            category="COMMUNITY_REPORT",
            source_type="COMMUNITY_OBSERVATION",
            source_name="Community Hazard Report",
            factor_name="Broken Footpath & Encroachment",
            impact_score=-6.0,
            confidence_weight=0.8,
            segment_code="SEG-TEST-POON-01",
            observed_at=now,
            verification_status="CORROBORATED",
        )
        self.evidence_service.create_evidence(pos)
        self.evidence_service.create_evidence(neg)

        assessment = self.risk_service.evaluate_segment_safety("SEG-TEST-POON-01")
        directions = {f.direction for f in assessment.contributing_factors}
        self.assertIn("POSITIVE", directions)
        self.assertIn("NEGATIVE", directions)
        # Net impact should be near neutral around 50.0
        self.assertTrue(45.0 <= assessment.safety_score <= 55.0)

    # --------------------------------------------------------------------------
    # 5. Temporal Nocturnal Evaluation
    # --------------------------------------------------------------------------
    def test_nocturnal_evaluation_penalizes_missing_lighting(self):
        """Traveling at night (e.g. 23:30) without verified street lighting triggers penalty and warning."""
        now = datetime.now(timezone.utc)
        # Add only police presence, no lighting
        evd = EvidenceCreate(
            category="POLICE_PRESENCE",
            source_type="SOURCED_PUBLIC_DATA",
            source_name="Police Outpost",
            factor_name="Police Booth",
            impact_score=7.0,
            confidence_weight=0.9,
            segment_code="SEG-TEST-POON-01",
            observed_at=now,
            verification_status="VERIFIED",
        )
        self.evidence_service.create_evidence(evd)

        daytime_eval = self.risk_service.evaluate_segment_safety("SEG-TEST-POON-01", departure_time="14:00")
        nocturnal_eval = self.risk_service.evaluate_segment_safety("SEG-TEST-POON-01", departure_time="23:30")

        self.assertTrue(nocturnal_eval.confidence_score < daytime_eval.confidence_score)
        self.assertTrue(any("Nocturnal risk" in w for w in nocturnal_eval.missing_data_warnings))

    # --------------------------------------------------------------------------
    # 6. Route-Level Safety Aggregation
    # --------------------------------------------------------------------------
    def test_route_aggregation_with_mixed_assessed_and_unassessed(self):
        """Route with both assessed and unassessed segments returns PARTIALLY_ASSESSED with exact coverage."""
        now = datetime.now(timezone.utc)
        evd = EvidenceCreate(
            category="LIGHTING",
            source_type="SOURCED_PUBLIC_DATA",
            source_name="GCC Lighting",
            factor_name="Continuous LED Lighting",
            impact_score=8.0,
            confidence_weight=0.95,
            segment_code="SEG-TEST-ANNA-01",
            observed_at=now,
            verification_status="VERIFIED",
        )
        self.evidence_service.create_evidence(evd)

        segments = [
            {"segment_code": "SEG-TEST-ANNA-01", "length_meters": 1200.0},
            {"segment_code": "SEG-TEST-UNASSESSED-01", "length_meters": 800.0},
        ]
        route_eval = self.risk_service.evaluate_route_safety("ROUTE-01", segments)

        self.assertEqual(route_eval.status, "PARTIALLY_ASSESSED")
        self.assertEqual(route_eval.total_segments_count, 2)
        self.assertEqual(route_eval.assessed_segments_count, 1)
        self.assertEqual(route_eval.unassessed_segments_count, 1)
        self.assertEqual(route_eval.assessed_length_meters, 1200.0)
        self.assertEqual(route_eval.unassessed_length_meters, 800.0)
        self.assertEqual(route_eval.length_coverage_ratio, 0.6)  # 1200 / 2000
        self.assertIsNotNone(route_eval.composite_safety_score)

    def test_route_aggregation_all_unassessed(self):
        """Route with zero assessed segments returns INSUFFICIENT_DATA and composite_safety_score=None."""
        segments = [
            {"segment_code": "SEG-TEST-UNASSESSED-01", "length_meters": 500.0},
        ]
        route_eval = self.risk_service.evaluate_route_safety("ROUTE-EMPTY", segments)
        self.assertEqual(route_eval.status, "INSUFFICIENT_DATA")
        self.assertIsNone(route_eval.composite_safety_score)
        self.assertEqual(route_eval.overall_risk_level, "UNKNOWN")

    # --------------------------------------------------------------------------
    # 7. REST API Endpoints Verification
    # --------------------------------------------------------------------------
    def test_api_get_segment_safety(self):
        """GET /api/safety/segments/{code} returns structured assessment."""
        resp = self.client.get("/api/safety/segments/SEG-TEST-UNASSESSED-01")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["segment_code"], "SEG-TEST-UNASSESSED-01")
        self.assertEqual(data["status"], "INSUFFICIENT_DATA")
        self.assertIsNone(data["safety_score"])

    def test_api_get_segment_safety_404(self):
        """GET /api/safety/segments/NONEXISTENT returns 404."""
        resp = self.client.get("/api/safety/segments/SEG-NONEXISTENT")
        self.assertEqual(resp.status_code, 404)

    def test_api_evaluate_route_safety(self):
        """POST /api/safety/routes/evaluate returns aggregate route assessment."""
        payload = {
            "route_id": "ROUTE-TEST-01",
            "segment_codes": ["SEG-TEST-ANNA-01", "SEG-TEST-UNASSESSED-01"],
            "departure_time": "18:00",
        }
        resp = self.client.post("/api/safety/routes/evaluate", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["route_id"], "ROUTE-TEST-01")
        self.assertIn(data["status"], ("ASSESSED", "PARTIALLY_ASSESSED", "INSUFFICIENT_DATA"))

    def test_api_query_evidence_and_provenance(self):
        """Verify GET /api/safety/evidence and GET /api/safety/provenance."""
        # Ingest an item
        evd = EvidenceCreate(
            category="LIGHTING",
            source_type="SOURCED_PUBLIC_DATA",
            source_name="OpenStreetMap Lighting",
            factor_name="Street Lighting",
            segment_code="SEG-TEST-ANNA-01",
        )
        self.evidence_service.create_evidence(evd)

        # Query evidence
        evd_resp = self.client.get("/api/safety/evidence?category=LIGHTING")
        self.assertEqual(evd_resp.status_code, 200)
        self.assertTrue(evd_resp.json()["total"] >= 1)

        # Provenance
        prov_resp = self.client.get("/api/safety/provenance")
        self.assertEqual(prov_resp.status_code, 200)
        self.assertTrue(len(prov_resp.json()) >= 1)

        # Methodology
        meth_resp = self.client.get("/api/safety/methodology")
        self.assertEqual(meth_resp.status_code, 200)
        self.assertEqual(meth_resp.json()["version"], "SURAKSHA-HEURISTIC-V1")


if __name__ == "__main__":
    unittest.main()
