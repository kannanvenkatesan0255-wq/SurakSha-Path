"""Confidence calculation engine for Suraksha Path.

Computes data certainty, evidence density, and recency independently from the risk/safety score.
High safety score with low confidence signals uncertainty (under-audited corridor);
Moderate safety with high confidence signals well-corroborated, reliable telemetry.
"""

from typing import List, Optional
from datetime import datetime, timezone


class ConfidenceEngine:
    """Computes evidence confidence and completeness metrics."""

    @staticmethod
    def calculate_segment_confidence(
        evidence_items: list,
        covered_categories_count: int,
        total_expected_categories: int = 5,
    ) -> float:
        """
        Calculates confidence score (10.0 to 100.0) based on:
        1. Category diversity ratio (up to 40 pts)
        2. Evidence item density (up to 30 pts)
        3. Average evidence freshness and verification status (up to 30 pts)
        """
        if not evidence_items:
            # Baseline confidence for unassessed segments
            return 10.0

        # 1. Category Diversity: proportion of core safety categories covered
        diversity_ratio = min(1.0, covered_categories_count / max(1, total_expected_categories))
        diversity_pts = diversity_ratio * 40.0

        # 2. Evidence Density: corroboration from multiple records
        count = len(evidence_items)
        density_pts = min(30.0, count * 7.5)

        # 3. Source Quality & Verification
        verified_count = sum(
            1 for item in evidence_items
            if getattr(item, "verification_status", None) in ("VERIFIED", "CORROBORATED")
        )
        quality_ratio = verified_count / max(1, count)
        quality_pts = quality_ratio * 30.0

        raw_confidence = diversity_pts + density_pts + quality_pts
        clamped = max(15.0, min(95.0, raw_confidence))
        return round(clamped, 1)

    @staticmethod
    def calculate_route_confidence(
        segment_confidences: List[float],
        segment_lengths: List[float],
        unassessed_length: float,
        total_length: float,
    ) -> float:
        """
        Computes distance-weighted confidence across the entire route,
        accounting for both assessed segments and unassessed coverage gaps.
        """
        if total_length <= 0.0 or not segment_confidences:
            return 10.0

        assessed_weighted_sum = sum(
            c * l for c, l in zip(segment_confidences, segment_lengths)
        )
        # Unassessed portions contribute at baseline 10% confidence
        unassessed_weighted = 10.0 * max(0.0, unassessed_length)

        total_confidence = (assessed_weighted_sum + unassessed_weighted) / total_length
        return round(max(10.0, min(95.0, total_confidence)), 1)
