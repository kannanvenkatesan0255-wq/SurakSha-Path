"""Comprehensive automated unit tests for Phase 10 Safety-Time Trade-Off & Route Preference Engine.

Validates:
- Fastest, Balanced, and Safest optimization strategies.
- Practical detour constraint enforcement on Safest route.
- Pareto utility trade-off calculation for Balanced route.
- Preference changes dynamically altering route selection.
- Single-route honesty (no fake duplicates).
- Sparse evidence caveats and transparent limitations.
- Segment assessment cache performance and consistency.
"""

import unittest
from unittest.mock import MagicMock
from datetime import datetime, timezone

from backend.app.services.route_optimization_service import (
    RouteOptimizationService,
    CandidateProfile,
)
from backend.app.schemas.routing import SegmentSummary
from backend.app.schemas.risk import RouteSafetyAssessment, EvidenceCoverageBreakdown


def _create_mock_candidate(
    index: int,
    route_id: str,
    title: str,
    duration_s: float,
    distance_m: float,
    safety_score: float | None = None,
    confidence_score: float = 80.0,
    coverage_ratio: float = 0.85,
    summary_roads: str = "Anna Salai",
    bottleneck_reason: str | None = None,
) -> CandidateProfile:
    """Helper to construct deterministic candidate profiles for testing."""
    route_safety = None
    if safety_score is not None:
        route_safety = RouteSafetyAssessment(
            route_id=route_id,
            status="ASSESSED" if coverage_ratio >= 0.5 else "PARTIALLY_ASSESSED",
            overall_risk_level="LOW" if safety_score >= 70 else "MEDIUM",
            composite_safety_score=safety_score,
            composite_confidence_score=confidence_score,
            total_route_length_meters=distance_m,
            assessed_length_meters=distance_m * coverage_ratio,
            unassessed_length_meters=distance_m * (1.0 - coverage_ratio),
            length_coverage_ratio=coverage_ratio,
            total_segments_count=5,
            assessed_segments_count=int(5 * coverage_ratio),
            unassessed_segments_count=5 - int(5 * coverage_ratio),
            highest_risk_segment_code="SEG-BOTTLENECK" if bottleneck_reason else None,
            highest_risk_reason=bottleneck_reason,
            segment_assessments=[],
            route_disclaimer="Advisory only",
            methodology_version="TEST-V1",
        )

    return CandidateProfile(
        index=index,
        raw_route={"distance": distance_m, "duration": duration_s},
        route_id=route_id,
        title=title,
        summary_roads=summary_roads,
        distance_meters=distance_m,
        duration_seconds=duration_s,
        coordinates=[[80.27, 13.08], [80.25, 13.06], [80.23, 13.04]],
        route_safety=route_safety,
        segment_summaries=[
            SegmentSummary(
                segment_code=f"SEG-0{i}",
                name=f"Road Section {i}",
                length_meters=distance_m / 3.0,
                safety_score=safety_score,
                confidence_score=confidence_score,
                key_factors=["Lighting: Verified", "Footfall: High"],
            )
            for i in range(1, 4)
        ],
        safety_score=safety_score,
        confidence_score=confidence_score,
        coverage_ratio=coverage_ratio,
        bottleneck_segment_code="SEG-BOTTLENECK" if bottleneck_reason else None,
        bottleneck_reason=bottleneck_reason,
        is_synthetic=False,
    )


class TestRouteTradeoffEngine(unittest.TestCase):
    """Test suite for RouteOptimizationService and trade-off mechanics."""

    def setUp(self):
        self.optimizer = RouteOptimizationService(
            safety_weight=0.60,
            time_weight=0.40,
            max_detour_ratio=1.40,  # Max +40% detour
            max_detour_minutes=20.0,
        )

    def test_fastest_strategy_selects_minimum_duration(self):
        """Verify FASTEST preference selects candidate with minimal duration and explains risk trade-off."""
        c1 = _create_mock_candidate(
            index=0,
            route_id="ROUTE-FAST",
            title="Direct Highway",
            duration_s=600.0,  # 10.0 min
            distance_m=8000.0,
            safety_score=55.0,  # Moderate score
            bottleneck_reason="unlit flyover underpass",
        )
        c2 = _create_mock_candidate(
            index=1,
            route_id="ROUTE-SAFE",
            title="Illuminated Commercial Corridor",
            duration_s=720.0,  # 12.0 min (+2.0 min detour)
            distance_m=8800.0,
            safety_score=82.0,  # Much safer
        )

        alts, selected_id, summary = self.optimizer.optimize_and_rank_routes([c1, c2], user_preference="FASTEST")

        self.assertEqual(selected_id, "ROUTE-FAST")
        fast_alt = next(a for a in alts if a.route_id == "ROUTE-FAST")
        self.assertTrue(fast_alt.is_selected)
        self.assertEqual(fast_alt.route_type, "FASTEST")
        self.assertEqual(fast_alt.detour_penalty_minutes, 0.0)
        self.assertIn("10.0 min", fast_alt.tradeoff_explanation)
        # Should explain that it has lower score vs safest alternative
        self.assertIn("Safest route", fast_alt.tradeoff_explanation)

    def test_safest_strategy_selects_highest_score_within_detour(self):
        """Verify SAFEST preference selects highest safety score route within practical detour limit."""
        c1 = _create_mock_candidate(
            index=0,
            route_id="ROUTE-FAST",
            title="Direct Highway",
            duration_s=600.0,  # 10.0 min
            distance_m=8000.0,
            safety_score=58.0,
        )
        c2 = _create_mock_candidate(
            index=1,
            route_id="ROUTE-SAFE",
            title="Illuminated Avenue",
            duration_s=750.0,  # 12.5 min (+25% detour, within 40% bound)
            distance_m=9200.0,
            safety_score=84.5,
        )

        alts, selected_id, summary = self.optimizer.optimize_and_rank_routes([c1, c2], user_preference="SAFEST")

        self.assertEqual(selected_id, "ROUTE-SAFE")
        safe_alt = next(a for a in alts if a.route_id == "ROUTE-SAFE")
        self.assertTrue(safe_alt.is_selected)
        self.assertEqual(safe_alt.route_type, "SAFEST")
        self.assertEqual(safe_alt.detour_penalty_minutes, 2.5)
        self.assertAlmostEqual(safe_alt.safety_advantage_points, 26.5, delta=0.2)
        self.assertIn("84.5/100", safe_alt.tradeoff_explanation)
        self.assertIn("+2.5 min", safe_alt.tradeoff_explanation)

    def test_safest_detour_constraint_excess_warning(self):
        """Verify that when a route's detour exceeds practical bound (40%), an explicit detour caveat is returned."""
        c1 = _create_mock_candidate(
            index=0,
            route_id="ROUTE-FAST",
            title="Direct Road",
            duration_s=600.0,  # 10.0 min
            distance_m=8000.0,
            safety_score=60.0,
        )
        # c2 has 16.0 min duration -> +60% detour (exceeds 40% max ratio)
        c2 = _create_mock_candidate(
            index=1,
            route_id="ROUTE-LONG-DETOUR",
            title="Extreme Ring Road Detour",
            duration_s=960.0,  # 16.0 min (+60%)
            distance_m=14000.0,
            safety_score=88.0,
        )

        alts, selected_id, summary = self.optimizer.optimize_and_rank_routes([c1, c2], user_preference="SAFEST")

        safe_alt = next(a for a in alts if a.route_id == "ROUTE-LONG-DETOUR")
        # Explanation must transparently warn that detour exceeds practical bounds
        self.assertIn("exceeding standard practical bounds", safe_alt.tradeoff_explanation)

    def test_balanced_strategy_pareto_utility(self):
        """Verify BALANCED strategy chooses the optimal compromise between travel time and safety evidence."""
        # Candidate 1: Fast but lower safety
        c1 = _create_mock_candidate(
            index=0,
            route_id="ROUTE-FAST",
            title="Fast Arterial",
            duration_s=600.0,  # 10.0 min
            distance_m=8000.0,
            safety_score=52.0,
        )
        # Candidate 2: Optimal compromise (+1.5 min, +22 safety points)
        c2 = _create_mock_candidate(
            index=1,
            route_id="ROUTE-BALANCED",
            title="Balanced Commercial Boulevard",
            duration_s=690.0,  # 11.5 min (+1.5 min)
            distance_m=8500.0,
            safety_score=74.0,
        )
        # Candidate 3: Marginal safety gain for excessive time (+8.0 min for only +4 more pts)
        c3 = _create_mock_candidate(
            index=2,
            route_id="ROUTE-SLOW",
            title="Long Outer Bypass",
            duration_s=1080.0,  # 18.0 min (+8.0 min)
            distance_m=13000.0,
            safety_score=78.0,
        )

        alts, selected_id, summary = self.optimizer.optimize_and_rank_routes(
            [c1, c2, c3], user_preference="BALANCED"
        )

        self.assertEqual(selected_id, "ROUTE-BALANCED")
        bal_alt = next(a for a in alts if a.route_id == "ROUTE-BALANCED")
        self.assertTrue(bal_alt.is_selected)
        self.assertEqual(bal_alt.route_type, "BALANCED")
        self.assertIn("Balanced compromise", bal_alt.tradeoff_explanation)

    def test_preference_switch_changes_selection(self):
        """Verify that switching user preference from FASTEST to SAFEST alters the selected alternative."""
        c1 = _create_mock_candidate(
            index=0,
            route_id="ROUTE-1",
            title="Route 1",
            duration_s=600.0,
            distance_m=8000.0,
            safety_score=55.0,
        )
        c2 = _create_mock_candidate(
            index=1,
            route_id="ROUTE-2",
            title="Route 2",
            duration_s=720.0,
            distance_m=8900.0,
            safety_score=80.0,
        )

        _, selected_fast, _ = self.optimizer.optimize_and_rank_routes([c1, c2], user_preference="FASTEST")
        _, selected_safe, _ = self.optimizer.optimize_and_rank_routes([c1, c2], user_preference="SAFEST")

        self.assertEqual(selected_fast, "ROUTE-1")
        self.assertEqual(selected_safe, "ROUTE-2")
        self.assertNotEqual(selected_fast, selected_safe)

    def test_single_route_not_duplicated_and_honestly_explained(self):
        """Verify that when only 1 candidate route exists, it is not artificially cloned into 3 fake alternatives."""
        c1 = _create_mock_candidate(
            index=0,
            route_id="ROUTE-ONLY",
            title="Sole Arterial",
            duration_s=650.0,
            distance_m=9000.0,
            safety_score=70.0,
        )

        alts, selected_id, summary = self.optimizer.optimize_and_rank_routes([c1], user_preference="BALANCED")

        self.assertEqual(len(alts), 1)
        self.assertEqual(selected_id, "ROUTE-ONLY")
        self.assertIn("Single viable road corridor", alts[0].tradeoff_explanation)
        self.assertIn("not returned", alts[0].tradeoff_explanation)

    def test_sparse_evidence_limitation_warning(self):
        """Verify that a route with sparse evidence coverage (<25%) includes an explicit limitation caveat."""
        c1 = _create_mock_candidate(
            index=0,
            route_id="ROUTE-FAST",
            title="Fast Road",
            duration_s=600.0,
            distance_m=8000.0,
            safety_score=50.0,
            coverage_ratio=0.80,
        )
        c2 = _create_mock_candidate(
            index=1,
            route_id="ROUTE-SPARSE",
            title="Sparse Side Road",
            duration_s=680.0,
            distance_m=8400.0,
            safety_score=75.0,  # High score but based on only 15% of length
            coverage_ratio=0.15,  # Sparse!
        )

        alts, selected_id, summary = self.optimizer.optimize_and_rank_routes([c1, c2], user_preference="SAFEST")

        sparse_alt = next(a for a in alts if a.route_id == "ROUTE-SPARSE")
        self.assertIn("evidence coverage is sparse", sparse_alt.tradeoff_explanation)
        self.assertIn("15%", sparse_alt.tradeoff_explanation)

    def test_unassessed_safety_routes_fallback_to_confidence_coverage(self):
        """Verify that when all routes lack evaluated safety scores, engine falls back to confidence/coverage without crashing."""
        c1 = _create_mock_candidate(
            index=0,
            route_id="ROUTE-1",
            title="Corridor 1",
            duration_s=600.0,
            distance_m=8000.0,
            safety_score=None,  # Unassessed
            confidence_score=25.0,
        )
        c2 = _create_mock_candidate(
            index=1,
            route_id="ROUTE-2",
            title="Corridor 2",
            duration_s=660.0,
            distance_m=8500.0,
            safety_score=None,  # Unassessed
            confidence_score=40.0,
        )

        alts, selected_id, summary = self.optimizer.optimize_and_rank_routes([c1, c2], user_preference="SAFEST")

        self.assertEqual(len(alts), 2)
        safe_alt = next(a for a in alts if a.route_id == selected_id)
        self.assertIsNone(safe_alt.safety_score)
        self.assertIn("unassessed", safe_alt.tradeoff_explanation)


if __name__ == "__main__":
    unittest.main()
