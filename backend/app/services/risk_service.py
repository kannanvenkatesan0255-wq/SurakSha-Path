"""Modular, explainable risk assessment engine for Suraksha Path.

Evaluates segment-level safety evidence and route-level safety comparisons.
Separates risk estimate, confidence, and data completeness as distinct concepts.
Never treats missing data as zero risk or proof of safety.
"""

import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from sqlalchemy.orm import Session

from ..models.domain import RoadSegment, EvidenceItem
from ..schemas.risk import (
    RiskWeights,
    SegmentRiskEvaluation,
    SegmentEvidenceDetail,
    SegmentSafetyAssessment,
    RouteSafetyAssessment,
    ContributingFactor,
    EvidenceCoverageBreakdown,
    AssessmentStatus,
    RiskLevel,
    MethodologyInfo,
)
from .evidence_service import EvidenceService
from .confidence_engine import ConfidenceEngine

logger = logging.getLogger(__name__)

METHODOLOGY_VERSION = "SURAKSHA-HEURISTIC-V1"

CORE_EVIDENCE_CATEGORIES = [
    "LIGHTING",
    "POLICE_PRESENCE",
    "ROAD_CHARACTERISTIC",
    "PEDESTRIAN_INFRASTRUCTURE",
    "COMMUNITY_REPORT",
]

DISCLAIMER_TEXT = (
    "Suraksha Path is an evidence-based contextual advisory system. "
    "It does not predict crime events and does not guarantee personal safety. "
    "Route evaluations reflect available environmental audits and community reports; "
    "unassessed segments carry unknown risk."
)


class RiskService:
    """Service boundary for segment-level and route-level safety risk assessment."""

    def __init__(self, db: Session):
        self.db = db
        self.evidence_service = EvidenceService(db)

    def evaluate_segment_safety(
        self,
        segment_code: str,
        departure_time: Optional[str] = None,
    ) -> SegmentSafetyAssessment:
        """
        Evaluates a road segment's safety profile based strictly on verified evidence.
        Produces explicit status: ASSESSED, LIMITED_EVIDENCE, INSUFFICIENT_DATA, or STALE_EVIDENCE.
        """
        segment = self.db.query(RoadSegment).filter(RoadSegment.segment_code == segment_code).first()
        if not segment:
            raise ValueError(f"Road segment '{segment_code}' not found in database.")

        evidence_items = (
            self.db.query(EvidenceItem)
            .filter(EvidenceItem.segment_code == segment_code)
            .all()
        )

        now = datetime.now(timezone.utc)
        categories_found = set(item.category for item in evidence_items)
        covered_categories = [c for c in CORE_EVIDENCE_CATEGORIES if c in categories_found]
        missing_categories = [c for c in CORE_EVIDENCE_CATEGORIES if c not in categories_found]
        coverage_ratio = len(covered_categories) / max(1, len(CORE_EVIDENCE_CATEGORIES))

        coverage_breakdown = EvidenceCoverageBreakdown(
            total_categories_evaluated=len(CORE_EVIDENCE_CATEGORIES),
            covered_categories=covered_categories,
            missing_categories=missing_categories,
            coverage_ratio=round(coverage_ratio, 2),
        )

        limitations = [
            "No street-level crime incidence geodata is publicly published in Chennai.",
            "Absence of reported hazards or missing data does NOT indicate that a road is safe.",
            "Assessments are advisory and heuristic; never a safety guarantee.",
        ]

        # 1. Handle Zero Evidence: INSUFFICIENT_DATA
        if not evidence_items:
            return SegmentSafetyAssessment(
                segment_code=segment.segment_code,
                road_name=segment.name,
                corridor=segment.corridor,
                status="INSUFFICIENT_DATA",
                risk_level="UNKNOWN",
                safety_score=None,  # Explicitly None - never fake 0 or 100
                confidence_score=10.0,  # Baseline uncertainty
                evidence_coverage=coverage_breakdown,
                contributing_factors=[],
                missing_data_warnings=[
                    f"No safety evidence records exist for segment '{segment_code}'.",
                    "Risk cannot be defensibly calculated without observable evidence.",
                ],
                temporal_context="No temporal evaluation possible with zero evidence.",
                limitations=limitations,
                assessed_at=now,
                methodology_version=METHODOLOGY_VERSION,
                is_synthetic=segment.is_synthetic,
            )

        # 2. Evaluate Freshness and Individual Impacts
        contributing_factors = []
        effective_impacts = []
        all_stale = True

        for item in evidence_items:
            decay_factor, is_stale, days_old = self.evidence_service.calculate_freshness(
                item.observed_at, item.category, now
            )
            if not is_stale:
                all_stale = False

            eff_impact = item.impact_score * item.confidence_weight * decay_factor
            effective_impacts.append(eff_impact)

            direction = "POSITIVE" if eff_impact > 0 else ("NEGATIVE" if eff_impact < 0 else "NEUTRAL")
            recency_desc = (
                f"{days_old} days ago (decay: {decay_factor:.2f})"
                if days_old is not None
                else "Undated observation"
            )

            contributing_factors.append(
                ContributingFactor(
                    factor_name=item.factor_name,
                    category=item.category,
                    direction=direction,
                    impact_score=round(eff_impact, 2),
                    evidence_id=item.evidence_id,
                    source_name=item.source_name,
                    recency_description=recency_desc,
                )
            )

        # 3. Determine Assessment Status
        if all_stale:
            status: AssessmentStatus = "STALE_EVIDENCE"
        elif len(evidence_items) < 3 or len(covered_categories) < 2:
            status: AssessmentStatus = "LIMITED_EVIDENCE"
        else:
            status: AssessmentStatus = "ASSESSED"

        # 4. Calculate Heuristic Safety Score
        # Anchor starting point: 50.0 (neutral center)
        net_impact = sum(effective_impacts)
        raw_score = 50.0 + net_impact
        # Clamped to [15.0, 95.0] (absolute 0 or 100 is non-empirical in urban mobility)
        final_safety_score = round(max(15.0, min(95.0, raw_score)), 1)

        # 5. Determine Risk Level
        if final_safety_score >= 70.0:
            risk_level: RiskLevel = "LOW"
        elif final_safety_score >= 45.0:
            risk_level: RiskLevel = "MEDIUM"
        else:
            risk_level: RiskLevel = "HIGH"

        # 6. Calculate Confidence
        confidence_score = ConfidenceEngine.calculate_segment_confidence(
            evidence_items=evidence_items,
            covered_categories_count=len(covered_categories),
            total_expected_categories=len(CORE_EVIDENCE_CATEGORIES),
        )

        missing_warnings = []
        if missing_categories:
            missing_warnings.append(
                f"Missing evidence streams: {', '.join(missing_categories)}."
            )

        # 7. Temporal Nocturnal Context
        temporal_context = "Standard daytime conditions evaluated."
        if departure_time:
            is_nocturnal = self._is_nocturnal_time(departure_time)
            if is_nocturnal:
                if "LIGHTING" not in categories_found:
                    # Penalize confidence when traveling at night without verified lighting data
                    confidence_score = max(10.0, round(confidence_score * 0.8, 1))
                    temporal_context = (
                        f"Nocturnal departure ({departure_time}): CRITICAL - Verified street lighting "
                        f"data is missing for this corridor."
                    )
                    missing_warnings.append("Nocturnal risk: Street lighting unverified.")
                else:
                    temporal_context = (
                        f"Nocturnal departure ({departure_time}): Verified lighting audits included."
                    )
            else:
                temporal_context = f"Daylight departure ({departure_time}) evaluated."

        return SegmentSafetyAssessment(
            segment_code=segment.segment_code,
            road_name=segment.name,
            corridor=segment.corridor,
            status=status,
            risk_level=risk_level,
            safety_score=final_safety_score,
            confidence_score=confidence_score,
            evidence_coverage=coverage_breakdown,
            contributing_factors=contributing_factors,
            missing_data_warnings=missing_warnings,
            temporal_context=temporal_context,
            limitations=limitations,
            assessed_at=now,
            methodology_version=METHODOLOGY_VERSION,
            is_synthetic=segment.is_synthetic,
        )

    def evaluate_route_safety(
        self,
        route_id: str,
        segments: List[Any],
        departure_time: Optional[str] = None,
    ) -> RouteSafetyAssessment:
        """
        Aggregates segment-level safety assessments into a comprehensive route assessment.
        Calculates distance-weighted safety score over assessed segments only,
        and accurately reports unassessed coverage gaps.
        """
        if not segments:
            return RouteSafetyAssessment(
                route_id=route_id,
                status="INSUFFICIENT_DATA",
                overall_risk_level="UNKNOWN",
                composite_safety_score=None,
                composite_confidence_score=10.0,
                total_route_length_meters=0.0,
                assessed_length_meters=0.0,
                unassessed_length_meters=0.0,
                length_coverage_ratio=0.0,
                total_segments_count=0,
                assessed_segments_count=0,
                unassessed_segments_count=0,
                highest_risk_segment_code=None,
                highest_risk_reason=None,
                segment_assessments=[],
                route_disclaimer=DISCLAIMER_TEXT,
                methodology_version=METHODOLOGY_VERSION,
            )

        segment_assessments: List[SegmentSafetyAssessment] = []
        total_length = 0.0
        assessed_length = 0.0
        unassessed_length = 0.0

        assessed_scores = []
        assessed_lengths = []
        segment_confidences = []
        all_lengths = []

        lowest_score = 999.0
        bottleneck_code = None
        bottleneck_reason = None

        for seg in segments:
            code = getattr(seg, "segment_code", None) or seg.get("segment_code") if isinstance(seg, dict) else str(seg)
            length = float(getattr(seg, "length_meters", 100.0) if hasattr(seg, "length_meters") else seg.get("length_meters", 100.0) if isinstance(seg, dict) else 100.0)
            total_length += length
            all_lengths.append(length)

            try:
                assessment = self.evaluate_segment_safety(code, departure_time)
            except ValueError:
                # Unmatched or unknown segment
                assessment = SegmentSafetyAssessment(
                    segment_code=code,
                    road_name="Unmatched Corridor Segment",
                    corridor=None,
                    status="INSUFFICIENT_DATA",
                    risk_level="UNKNOWN",
                    safety_score=None,
                    confidence_score=10.0,
                    evidence_coverage=EvidenceCoverageBreakdown(
                        total_categories_evaluated=len(CORE_EVIDENCE_CATEGORIES),
                        covered_categories=[],
                        missing_categories=CORE_EVIDENCE_CATEGORIES,
                        coverage_ratio=0.0,
                    ),
                    contributing_factors=[],
                    missing_data_warnings=["Segment not registered in road network dataset."],
                    temporal_context=None,
                    limitations=[DISCLAIMER_TEXT],
                    assessed_at=datetime.now(timezone.utc),
                    methodology_version=METHODOLOGY_VERSION,
                    is_synthetic=True,
                )

            segment_assessments.append(assessment)
            segment_confidences.append(assessment.confidence_score)

            if assessment.safety_score is not None and assessment.status in ("ASSESSED", "LIMITED_EVIDENCE"):
                assessed_length += length
                assessed_scores.append(assessment.safety_score)
                assessed_lengths.append(length)

                if assessment.safety_score < lowest_score:
                    lowest_score = assessment.safety_score
                    bottleneck_code = assessment.segment_code
                    reasons = [f.factor_name for f in assessment.contributing_factors if f.direction == "NEGATIVE"]
                    bottleneck_reason = (
                        f"Lower safety score ({assessment.safety_score}): {'; '.join(reasons)}"
                        if reasons
                        else f"Lower score ({assessment.safety_score}) due to limited positive evidence"
                    )
            else:
                unassessed_length += length

        # Coverage ratio
        coverage_ratio = assessed_length / max(1.0, total_length)

        # Route status
        assessed_count = len(assessed_scores)
        unassessed_count = len(segments) - assessed_count

        if assessed_count == 0:
            route_status = "INSUFFICIENT_DATA"
            composite_score = None
            overall_risk: RiskLevel = "UNKNOWN"
        elif unassessed_count == 0:
            route_status = "ASSESSED"
        else:
            route_status = "PARTIALLY_ASSESSED"

        # Distance-weighted composite score over assessed portions
        if assessed_scores and assessed_length > 0:
            composite_score = round(
                sum(s * l for s, l in zip(assessed_scores, assessed_lengths)) / assessed_length,
                1,
            )
            if composite_score >= 70.0:
                overall_risk: RiskLevel = "LOW"
            elif composite_score >= 45.0:
                overall_risk: RiskLevel = "MEDIUM"
            else:
                overall_risk: RiskLevel = "HIGH"

        # Distance-weighted route confidence
        route_confidence = ConfidenceEngine.calculate_route_confidence(
            segment_confidences=segment_confidences,
            segment_lengths=all_lengths,
            unassessed_length=unassessed_length,
            total_length=total_length,
        )

        return RouteSafetyAssessment(
            route_id=route_id,
            status=route_status,
            overall_risk_level=overall_risk,
            composite_safety_score=composite_score,
            composite_confidence_score=route_confidence,
            total_route_length_meters=round(total_length, 1),
            assessed_length_meters=round(assessed_length, 1),
            unassessed_length_meters=round(unassessed_length, 1),
            length_coverage_ratio=round(coverage_ratio, 2),
            total_segments_count=len(segments),
            assessed_segments_count=assessed_count,
            unassessed_segments_count=unassessed_count,
            highest_risk_segment_code=bottleneck_code,
            highest_risk_reason=bottleneck_reason,
            segment_assessments=segment_assessments,
            route_disclaimer=DISCLAIMER_TEXT,
            methodology_version=METHODOLOGY_VERSION,
        )

    def get_methodology_info(self) -> MethodologyInfo:
        """Returns details about the risk assessment heuristic methodology."""
        from .evidence_service import CATEGORY_HALF_LIFE_DAYS
        return MethodologyInfo(
            methodology_name="Suraksha Path Evidence-Based Safety Heuristic",
            version=METHODOLOGY_VERSION,
            status="CONFIGURABLE_HEURISTIC_V1",
            assumptions=[
                "Evidence weights are heuristic baselines and do not constitute validated crime predictions.",
                "Multi-lane divided carriageways and street lighting have positive safety associations.",
                "Isolated blind spots, unlit stretches, and reported hazards have negative safety impact.",
                "Zero reports or missing data are strictly treated as unknown risk, never safe.",
                "Old evidence decays exponentially based on category-specific half-life policies.",
            ],
            supported_evidence_categories=CORE_EVIDENCE_CATEGORIES,
            freshness_half_lives_days=CATEGORY_HALF_LIFE_DAYS,
            known_limitations=[
                "No official crime occurrence database is publicly available for Chennai street coordinates.",
                "Nocturnal travel risk is heavily dependent on street lighting and activity presence.",
            ],
        )

    def evaluate_segment_risk(self, segment_code: str, weights: RiskWeights = None) -> SegmentRiskEvaluation:
        """Backward-compatible method for legacy callers."""
        try:
            assessment = self.evaluate_segment_safety(segment_code)
            return SegmentRiskEvaluation(
                segment_code=assessment.segment_code,
                name=assessment.road_name or f"Segment {segment_code}",
                corridor=assessment.corridor or "Chennai Arterial Corridor",
                safety_score=assessment.safety_score if assessment.safety_score is not None else 50.0,
                confidence_score=assessment.confidence_score,
                primary_risks=assessment.missing_data_warnings,
                positive_factors=[f.factor_name for f in assessment.contributing_factors if f.direction == "POSITIVE"],
                evidence=[
                    SegmentEvidenceDetail(
                        factor_name=f.factor_name,
                        source_type=f.category,
                        impact_score=f.impact_score,
                        confidence_weight=0.85,
                        freshness=f.recency_description,
                        details=f.source_name,
                        is_synthetic=False,
                    )
                    for f in assessment.contributing_factors
                ],
                is_synthetic=assessment.is_synthetic,
            )
        except Exception:
            return SegmentRiskEvaluation(
                segment_code=segment_code,
                name=f"Segment {segment_code}",
                corridor="Chennai Corridor",
                safety_score=50.0,
                confidence_score=10.0,
                primary_risks=["Unassessed segment"],
                positive_factors=[],
                evidence=[],
                is_synthetic=True,
            )

    @staticmethod
    def _is_nocturnal_time(time_str: str) -> bool:
        """Determines if a time string (e.g., '21:30', '03:15') falls between 20:00 and 06:00."""
        try:
            parts = time_str.split(":")
            hour = int(parts[0])
            return hour >= 20 or hour < 6
        except Exception:
            return False
