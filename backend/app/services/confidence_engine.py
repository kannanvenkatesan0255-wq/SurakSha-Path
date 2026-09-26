"""Confidence calculation engine boundary interface."""

class ConfidenceEngine:
    """
    Computes data certainty and freshness metrics independently from the safety score.
    High safety score with low confidence signals uncertainty;
    Moderate safety with high confidence signals well-corroborated evidence.
    """

    @staticmethod
    def calculate_segment_confidence(
        data_points_count: int,
        recency_hours: float,
        has_official_audit: bool = True,
    ) -> float:
        """Foundational method for computing confidence percentage."""
        base = 60.0 if has_official_audit else 40.0
        data_bonus = min(data_points_count * 5.0, 25.0)
        recency_penalty = min(recency_hours * 0.1, 15.0)
        score = max(10.0, min(100.0, base + data_bonus - recency_penalty))
        return round(score, 1)
