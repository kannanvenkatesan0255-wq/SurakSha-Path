"""Automated unit and integration tests for Phase 11 Route Explainability, Safety Score & Confidence Dashboard.

Validates:
- Safety Score semantics (scale [15.0-95.0], neutral anchor 50.0, advisory nature, no crime prediction claim).
- Confidence Score distinctness from Safety Score (epistemic data certainty vs. environmental safety).
- Evidence coverage calculations and sparse coverage caution flags.
- Segment-level contribution, traversal order, bottleneck identification, and coordinate preservation.
- Category evidence breakdown (Lighting, Police, Pedestrian, Road, Community) with prototype weights.
- Dynamic "Why This Route?" justification for FASTEST, BALANCED, and SAFEST strategies.
- Nocturnal departure lighting gap handling.
- Absence of reports treated as unknown risk, never proof of safety.
- Explainability API endpoints (/api/safety/routes/explain and /api/safety/semantics).
"""

import unittest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.schemas.routing import RouteAlternative, RouteMetrics, SegmentSummary
from backend.app.services.explainability_service import ExplainabilityService


def _build_test_alternative(
    route_id: str = "ROUTE-ALT-1",
    route_type: str = "BALANCED",
    title: str = "Test Arterial Corridor",
    duration_min: float = 15.0,
    distance_km: float = 8.5,
    safety_score: float | None = 76.5,
    confidence_score: float = 82.0,
    coverage_ratio: float = 0.80,
    bottleneck_segment: str | None = None,
    bottleneck_reason: str | None = None,
    is_synthetic: bool = False,
) -> RouteAlternative:
    """Helper creating a test RouteAlternative with discrete segment summaries."""
    segments = [
        SegmentSummary(
            segment_code="SEG-ANNA-01",
            name="Anna Salai North",
            length_meters=3000.0,
            safety_score=80.0,
            confidence_score=88.0,
            status="ASSESSED",
            risk_level="LOW",
            road_classification="primary",
            corridor="Anna Salai",
            covered_categories=["LIGHTING", "POLICE_PRESENCE", "ROAD_CHARACTERISTIC"],
            key_factors=["Lighting: Continuous LED", "Police: Station beat"],
            coordinates=[[80.27, 13.08], [80.26, 13.07]],
        ),
        SegmentSummary(
            segment_code="SEG-ANNA-02",
            name="Anna Salai Mid Underpass",
            length_meters=2500.0,
            safety_score=52.0 if bottleneck_segment == "SEG-ANNA-02" else 72.0,
            confidence_score=75.0,
            status="LIMITED_EVIDENCE",
            risk_level="MEDIUM",
            road_classification="primary",
            corridor="Anna Salai",
            covered_categories=["ROAD_CHARACTERISTIC"],
            missing_categories=["LIGHTING"],
            key_factors=["Unlit underpass stretch"],
            is_bottleneck=bool(bottleneck_segment == "SEG-ANNA-02"),
            bottleneck_reason=bottleneck_reason if bottleneck_segment == "SEG-ANNA-02" else None,
            coordinates=[[80.26, 13.07], [80.25, 13.06]],
        ),
        SegmentSummary(
            segment_code="SEG-USMAN-01",
            name="Usman Road South",
            length_meters=3000.0,
            safety_score=78.0,
            confidence_score=85.0,
            status="ASSESSED",
            risk_level="LOW",
            road_classification="primary",
            corridor="T. Nagar Arterial",
            covered_categories=["LIGHTING", "PEDESTRIAN_INFRASTRUCTURE", "COMMUNITY_REPORT"],
            key_factors=["High footfall commercial corridor", "Footpath: Continuous"],
            coordinates=[[80.25, 13.06], [80.23, 13.04]],
        ),
    ]

    return RouteAlternative(
        route_id=route_id,
        route_type=route_type,
        recommended_for=route_type,
        title=title,
        summary="Anna Salai, Usman Road",
        metrics=RouteMetrics(
            distance_meters=distance_km * 1000.0,
            distance_km=distance_km,
            duration_seconds=duration_min * 60.0,
            duration_minutes=duration_min,
            duration_type="ESTIMATED_FREE_FLOW",
            traffic_aware=False,
        ),
        coordinates=[[80.27, 13.08], [80.25, 13.06], [80.23, 13.04]],
        is_selected=True,
        safety_assessment_status="EVALUATED_ASSESSED",
        safety_score=safety_score,
        confidence_score=confidence_score,
        evidence_coverage_ratio=coverage_ratio,
        detour_penalty_minutes=0.0 if route_type == "FASTEST" else 2.0,
        safety_advantage_points=12.0 if route_type == "SAFEST" else 6.0,
        preference_fit_score=92.0,
        bottleneck_segment_code=bottleneck_segment,
        bottleneck_reason=bottleneck_reason,
        segments=segments,
        is_synthetic=is_synthetic,
    )


class TestRouteExplainability(unittest.TestCase):
    """Test suite for Phase 11 Explainability Service and Dashboard Semantics."""

    def setUp(self):
        self.service = ExplainabilityService(db=None)
        self.client = TestClient(app)

    def test_safety_score_semantics_definition(self):
        """Verify Safety Score semantics explicitly define scale [15.0, 95.0] and disclaim crime prediction."""
        alt = _build_test_alternative(safety_score=78.5)
        report = self.service.generate_report(alt)

        self.assertEqual(report.safety_score, 78.5)
        self.assertEqual(report.risk_level, "LOW")
        sem = report.safety_score_semantics
        self.assertEqual(sem.scale_min, 15.0)
        self.assertEqual(sem.scale_max, 95.0)
        self.assertEqual(sem.neutral_anchor, 50.0)
        self.assertIn("Advisory contextual safety index", sem.definition)
        self.assertIn("NOT establish a statistical probability of crime", sem.what_it_does_not_establish)
        self.assertIn("does not guarantee personal safety", sem.disclaimer)

    def test_confidence_distinct_from_safety_score(self):
        """Verify Confidence measures data certainty independently from the Safety Score."""
        # Low safety score with high confidence (reliably audited unsafe/poor condition)
        alt_low_safety_high_conf = _build_test_alternative(
            safety_score=38.0,
            confidence_score=90.0,
        )
        report1 = self.service.generate_report(alt_low_safety_high_conf)
        self.assertEqual(report1.safety_score, 38.0)
        self.assertEqual(report1.risk_level, "HIGH")
        self.assertEqual(report1.confidence_score, 90.0)

        # High safety score with low confidence (sparsely audited corridor)
        alt_high_safety_low_conf = _build_test_alternative(
            safety_score=85.0,
            confidence_score=25.0,
            coverage_ratio=0.20,
        )
        report2 = self.service.generate_report(alt_high_safety_low_low_conf := alt_high_safety_low_conf)
        self.assertEqual(report2.safety_score, 85.0)
        self.assertEqual(report2.confidence_score, 25.0)
        self.assertTrue(report2.is_sparse_coverage)

        # Verify semantics clarify that confidence does NOT mean safety
        sem = report2.confidence_semantics
        self.assertIn("Epistemic measure of data completeness", sem.definition)
        self.assertIn("NOT indicate the likelihood that an incident will or will not occur", sem.what_it_does_not_establish)

    def test_evidence_coverage_calculation_and_sparse_flag(self):
        """Verify evidence coverage ratio, distance breakdown, and sparse coverage warning."""
        alt = _build_test_alternative(
            distance_km=10.0,
            coverage_ratio=0.18,  # < 25% -> sparse
        )
        report = self.service.generate_report(alt)

        self.assertEqual(report.evidence_coverage_ratio, 0.18)
        self.assertEqual(report.evidence_coverage_percentage, 18.0)
        self.assertEqual(report.assessed_distance_km, 1.8)
        self.assertEqual(report.unassessed_distance_km, 8.2)
        self.assertTrue(report.is_sparse_coverage)
        self.assertTrue(any("Limited Evidence Warning" in n for n in report.active_uncertainty_notices))

    def test_segment_level_breakdown_and_coordinate_preservation(self):
        """Verify traversed segments preserve coordinates, traversal order, and bottleneck status."""
        alt = _build_test_alternative(
            bottleneck_segment="SEG-ANNA-02",
            bottleneck_reason="Unlit underpass stretch with limited natural surveillance",
        )
        report = self.service.generate_report(alt)

        self.assertEqual(len(report.segment_breakdowns), 3)
        seg1 = report.segment_breakdowns[0]
        self.assertEqual(seg1.traversal_order, 1)
        self.assertEqual(seg1.segment_code, "SEG-ANNA-01")
        self.assertEqual(seg1.risk_level, "LOW")
        self.assertFalse(seg1.is_bottleneck)
        self.assertEqual(len(seg1.coordinates), 2)  # Coordinates preserved for map

        seg2 = report.segment_breakdowns[1]
        self.assertEqual(seg2.segment_code, "SEG-ANNA-02")
        self.assertTrue(seg2.is_bottleneck)
        self.assertEqual(seg2.bottleneck_reason, "Unlit underpass stretch with limited natural surveillance")

    def test_category_breakdown_contains_all_core_streams(self):
        """Verify Lighting, Police, Pedestrian, Road, and Community streams are represented with weights."""
        alt = _build_test_alternative()
        report = self.service.generate_report(alt)

        cat_keys = [c.category_key for c in report.category_breakdowns]
        self.assertIn("LIGHTING", cat_keys)
        self.assertIn("POLICE_PRESENCE", cat_keys)
        self.assertIn("PEDESTRIAN_INFRASTRUCTURE", cat_keys)
        self.assertIn("ROAD_CHARACTERISTIC", cat_keys)
        self.assertIn("COMMUNITY_REPORT", cat_keys)

        lighting = next(c for c in report.category_breakdowns if c.category_key == "LIGHTING")
        self.assertEqual(lighting.configured_weight, 0.35)
        self.assertIn("Corporation of Greater Chennai", lighting.data_source)
        self.assertIn("Does not capture real-time power outages", lighting.known_limitations)

    def test_dynamic_why_this_route_generation_for_fastest(self):
        """Verify dynamic 'Why This Route?' for FASTEST preference emphasizes minimal duration."""
        fastest = _build_test_alternative(route_id="ALT-1", route_type="FASTEST", duration_min=12.0, safety_score=60.0)
        safest = _build_test_alternative(route_id="ALT-2", route_type="SAFEST", duration_min=16.0, safety_score=85.0)

        report = self.service.generate_report(fastest, all_alternatives=[fastest, safest])
        why = report.why_this_route

        self.assertEqual(why.selected_preference, "FASTEST")
        self.assertIn("Fastest Transit Option", why.headline)
        self.assertIn("12.0 min", why.headline)
        self.assertIn("prioritizes arterial speed", why.detailed_justification.lower())
        self.assertTrue(any("minimizes driving duration" in f.lower() for f in why.key_differentiating_factors))

    def test_dynamic_why_this_route_generation_for_safest(self):
        """Verify dynamic 'Why This Route?' for SAFEST preference emphasizes protective factors and explains detour."""
        fastest = _build_test_alternative(route_id="ALT-1", route_type="FASTEST", duration_min=12.0, safety_score=60.0)
        safest = _build_test_alternative(route_id="ALT-2", route_type="SAFEST", duration_min=16.0, safety_score=85.0)

        report = self.service.generate_report(safest, all_alternatives=[fastest, safest])
        why = report.why_this_route

        self.assertEqual(why.selected_preference, "SAFEST")
        self.assertIn("Maximum Environmental Safety Evidence", why.headline)
        self.assertIn("+4.0 min detour", why.time_vs_fastest)
        self.assertIn("+25.0 points higher", why.safety_vs_fastest)
        self.assertTrue(any("highest composite safety score" in f.lower() for f in why.key_differentiating_factors))

    def test_nocturnal_departure_generates_advisory_when_lighting_unverified(self):
        """Verify night-time departure (e.g. 22:30) flags nocturnal context."""
        alt = _build_test_alternative()
        report = self.service.generate_report(alt, departure_time="22:30")

        self.assertEqual(report.departure_time, "22:30")
        self.assertTrue(any("22:30" in f for f in report.why_this_route.key_differentiating_factors))

    def test_absence_of_evidence_not_proof_of_safety_notice(self):
        """Verify uncertainty notices explicitly warn that unassessed segments do not imply safety."""
        alt = _build_test_alternative(coverage_ratio=0.60)
        report = self.service.generate_report(alt)

        self.assertTrue(any("Absence of reported incidents or missing records is NOT proof of safety" in n for n in report.active_uncertainty_notices))

    def test_api_explain_endpoint(self):
        """Verify POST /api/safety/routes/explain endpoint returns fully populated RouteExplainabilityReport."""
        alt = _build_test_alternative()
        payload = {
            "route": alt.model_dump(),
            "all_alternatives": [alt.model_dump()],
            "departure_time": "21:30",
        }
        res = self.client.post("/api/safety/routes/explain", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["route_id"], "ROUTE-ALT-1")
        self.assertEqual(data["safety_score_semantics"]["scale"], "15.0 to 95.0")
        self.assertEqual(data["confidence_semantics"]["unit"], "percentage")
        self.assertIn("why_this_route", data)
        self.assertEqual(len(data["category_breakdowns"]), 5)
        self.assertEqual(len(data["segment_breakdowns"]), 3)

    def test_api_semantics_endpoint(self):
        """Verify GET /api/safety/semantics endpoint returns authoritative metric definitions."""
        res = self.client.get("/api/safety/semantics")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertIn("safety_score", data)
        self.assertIn("confidence", data)
        self.assertIn("evidence_coverage", data)
        self.assertEqual(data["safety_score"]["scale_min"], 15.0)
        self.assertEqual(data["safety_score"]["scale_max"], 95.0)
        self.assertEqual(data["confidence"]["scale_min"], 10.0)
        self.assertEqual(data["confidence"]["scale_max"], 100.0)


if __name__ == "__main__":
    unittest.main()
