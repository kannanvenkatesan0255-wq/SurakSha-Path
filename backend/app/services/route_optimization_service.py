"""Safety-Time Trade-Off & Route Preference Engine for Suraksha Path.

Implements multi-objective route evaluation, Pareto utility balancing,
practical detour constraint enforcement, and transparent explainability
for Fastest, Balanced, and Safest navigation strategies.
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass

from ..schemas.routing import (
    RouteAlternative,
    RouteMetrics,
    SegmentSummary,
)
from ..schemas.risk import RouteSafetyAssessment
from ..config import settings

logger = logging.getLogger(__name__)


@dataclass
class CandidateProfile:
    """Internal representation of a candidate route during trade-off analysis."""
    index: int
    raw_route: Dict[str, Any]
    route_id: str
    title: str
    summary_roads: str
    distance_meters: float
    duration_seconds: float
    coordinates: List[List[float]]
    route_safety: Optional[RouteSafetyAssessment]
    segment_summaries: List[SegmentSummary]
    safety_score: Optional[float]
    confidence_score: float
    coverage_ratio: float
    bottleneck_segment_code: Optional[str]
    bottleneck_reason: Optional[str]
    is_synthetic: bool


class RouteOptimizationService:
    """
    Reusable optimization service for evaluating route alternatives against
    distinct time-versus-safety-evidence strategies (FASTEST, BALANCED, SAFEST).
    """

    def __init__(
        self,
        safety_weight: Optional[float] = None,
        time_weight: Optional[float] = None,
        max_detour_ratio: Optional[float] = None,
        max_detour_minutes: Optional[float] = None,
    ):
        self.safety_weight = safety_weight if safety_weight is not None else settings.BALANCED_SAFETY_WEIGHT
        self.time_weight = time_weight if time_weight is not None else settings.BALANCED_TIME_WEIGHT
        self.max_detour_ratio = max_detour_ratio if max_detour_ratio is not None else settings.MAX_SAFEST_DETOUR_RATIO
        self.max_detour_minutes = max_detour_minutes if max_detour_minutes is not None else settings.MAX_SAFEST_DETOUR_MINUTES

    def optimize_and_rank_routes(
        self,
        candidates: List[CandidateProfile],
        user_preference: str = "BALANCED",
    ) -> Tuple[List[RouteAlternative], Optional[str], Optional[str]]:
        """
        Ranks candidate routes according to Fastest, Balanced, and Safest strategies.
        Applies Pareto trade-off optimization, enforces detour constraints,
        and generates metric-traceable explanations.

        Returns:
            Tuple of:
            - List[RouteAlternative]
            - selected_route_id (str)
            - tradeoff_summary (str)
        """
        if not candidates:
            return [], None, "No candidate routes available for optimization."

        # 1. Single-route scenario: Do NOT fabricate artificial duplicates
        if len(candidates) == 1:
            cand = candidates[0]
            dur_min = round(cand.duration_seconds / 60.0, 1)
            dist_km = round(cand.distance_meters / 1000.0, 2)
            
            explanation = (
                f"Single viable road corridor identified via {cand.summary_roads or 'arterial road'} "
                f"({dur_min} min, {dist_km} km). Speed vs. safety alternative corridors were not returned "
                "by the routing engine for this OD pair."
            )
            
            alt = self._build_route_alternative(
                cand=cand,
                route_type=user_preference if user_preference in ("FASTEST", "BALANCED", "SAFEST") else "FASTEST",
                recommended_for=user_preference,
                tradeoff_explanation=explanation,
                detour_minutes=0.0,
                safety_advantage=0.0 if cand.safety_score is not None else None,
                preference_fit_score=100.0,
                is_selected=True,
            )
            return [alt], alt.route_id, explanation

        # 2. Identify Baseline Fastest Route (minimizes travel duration)
        fastest_cand = min(candidates, key=lambda c: (c.duration_seconds, - (c.safety_score or 0.0), c.distance_meters))
        min_duration_s = max(1.0, fastest_cand.duration_seconds)
        max_allowed_duration = min(
            min_duration_s * self.max_detour_ratio,
            min_duration_s + self.max_detour_minutes * 60.0,
        )

        # 3. Identify Safest Candidate (highest safety score, with detour limit detection)
        candidates_with_score = [c for c in candidates if c.safety_score is not None]
        safest_cand = None
        safest_violates_detour = False

        if candidates_with_score:
            safest_cand = max(
                candidates_with_score,
                key=lambda c: (c.safety_score, c.confidence_score, -c.duration_seconds),
            )
            if safest_cand.duration_seconds > max_allowed_duration:
                safest_violates_detour = True
        else:
            safest_cand = max(
                candidates,
                key=lambda c: (c.confidence_score, c.coverage_ratio, -c.duration_seconds),
            )

        # 4. Identify Balanced Candidate using Pareto Utility:
        # Utility U = w_safety * (S / 100) - w_time * min(1.0, (duration - T_min) / T_min)
        # Adjusted for confidence: U_adj = U * (0.60 + 0.40 * (C / 100))
        balanced_scores: Dict[str, float] = {}
        for c in candidates:
            delta_t_norm = min(1.0, max(0.0, (c.duration_seconds - min_duration_s) / max(min_duration_s, 60.0)))
            if c.safety_score is not None:
                s_norm = max(0.0, min(1.0, c.safety_score / 100.0))
            else:
                s_norm = max(0.1, min(0.9, (c.confidence_score / 100.0) * 0.7))

            raw_utility = (self.safety_weight * s_norm) - (self.time_weight * delta_t_norm)
            conf_factor = 0.60 + 0.40 * (c.confidence_score / 100.0)
            adjusted_utility = raw_utility * conf_factor
            balanced_scores[c.route_id] = adjusted_utility

        balanced_cand = max(candidates, key=lambda c: (balanced_scores[c.route_id], -c.duration_seconds))

        # 5. Role and Strategy Mapping for Alternatives
        assigned_roles = self._assign_distinct_roles(
            candidates=candidates,
            fastest_cand=fastest_cand,
            balanced_cand=balanced_cand,
            safest_cand=safest_cand,
            user_preference=user_preference,
        )

        # Determine target selected route based on user preference
        preferred_route_id = None
        for cand in candidates:
            if assigned_roles.get(cand.route_id) == user_preference:
                preferred_route_id = cand.route_id
                break

        if not preferred_route_id:
            if user_preference == "FASTEST":
                preferred_route_id = fastest_cand.route_id
            elif user_preference == "SAFEST":
                preferred_route_id = safest_cand.route_id
            else:
                preferred_route_id = balanced_cand.route_id if balanced_cand.route_id in assigned_roles else candidates[0].route_id

        # 6. Build RouteAlternative list with explanations and trade-off metrics
        alternatives: List[RouteAlternative] = []
        selected_route_id = preferred_route_id

        for cand in candidates:
            role = assigned_roles.get(cand.route_id, "ALTERNATIVE")
            detour_min = round(max(0.0, cand.duration_seconds - min_duration_s) / 60.0, 1)

            # Safety advantage vs fastest baseline
            safety_advantage = None
            if cand.safety_score is not None and fastest_cand.safety_score is not None:
                safety_advantage = round(cand.safety_score - fastest_cand.safety_score, 1)
            elif cand.safety_score is not None:
                safety_advantage = round(cand.safety_score - 50.0, 1)

            # Preference fit score (0-100)
            fit_score = self._calculate_preference_fit(
                cand=cand,
                role=role,
                user_preference=user_preference,
                min_duration_s=min_duration_s,
                balanced_utility=balanced_scores.get(cand.route_id, 0.5),
            )

            # Data-driven trade-off explanation
            explanation = self._generate_tradeoff_explanation(
                cand=cand,
                role=role,
                fastest_cand=fastest_cand,
                safest_cand=safest_cand,
                detour_minutes=detour_min,
                safety_advantage=safety_advantage,
                safest_violates_detour=safest_violates_detour and (cand.route_id == safest_cand.route_id),
            )

            is_selected = (cand.route_id == preferred_route_id)

            alt = self._build_route_alternative(
                cand=cand,
                route_type=role,
                recommended_for=role,
                tradeoff_explanation=explanation,
                detour_minutes=detour_min,
                safety_advantage=safety_advantage,
                preference_fit_score=fit_score,
                is_selected=is_selected,
            )
            alternatives.append(alt)

        # Fallback selection if no exact match
        if not any(a.is_selected for a in alternatives) and alternatives:
            alternatives[0].is_selected = True
            selected_route_id = alternatives[0].route_id

        # 7. Generate Executive Trade-Off Summary
        tradeoff_summary = self._generate_tradeoff_summary(
            fastest_cand=fastest_cand,
            safest_cand=safest_cand,
            balanced_cand=balanced_cand,
            num_alternatives=len(alternatives),
        )

        return alternatives, selected_route_id, tradeoff_summary

    def _assign_distinct_roles(
        self,
        candidates: List[CandidateProfile],
        fastest_cand: CandidateProfile,
        balanced_cand: CandidateProfile,
        safest_cand: CandidateProfile,
        user_preference: str = "BALANCED",
    ) -> Dict[str, str]:
        """Assigns distinct route_type designations (FASTEST, BALANCED, SAFEST, ALTERNATIVE)."""
        roles: Dict[str, str] = {}
        roles[fastest_cand.route_id] = "FASTEST"

        if len(candidates) == 2:
            other_cand = [c for c in candidates if c.route_id != fastest_cand.route_id][0]
            if user_preference == "SAFEST" and other_cand.route_id == safest_cand.route_id:
                roles[other_cand.route_id] = "SAFEST"
            else:
                roles[other_cand.route_id] = "BALANCED"
            return roles

        # For 3 or more candidates:
        if safest_cand.route_id != fastest_cand.route_id:
            roles[safest_cand.route_id] = "SAFEST"

        if balanced_cand.route_id not in roles:
            roles[balanced_cand.route_id] = "BALANCED"
        else:
            remaining = [c for c in candidates if c.route_id not in roles]
            if remaining:
                roles[remaining[0].route_id] = "BALANCED"

        for c in candidates:
            if c.route_id not in roles:
                roles[c.route_id] = "ALTERNATIVE"

        return roles

    def _calculate_preference_fit(
        self,
        cand: CandidateProfile,
        role: str,
        user_preference: str,
        min_duration_s: float,
        balanced_utility: float,
    ) -> float:
        """Calculates a normalized 0-100 fit score for the requested user preference."""
        if user_preference == "FASTEST":
            ratio = min_duration_s / max(min_duration_s, cand.duration_seconds)
            return round(ratio * 100.0, 1)

        elif user_preference == "SAFEST":
            if cand.safety_score is not None:
                # Scale safety score [15, 95] to [0, 100]
                base_fit = max(0.0, min(100.0, ((cand.safety_score - 15.0) / 80.0) * 100.0))
                # Moderate penalty if detour is large
                detour_ratio = cand.duration_seconds / max(1.0, min_duration_s)
                if detour_ratio > self.max_detour_ratio:
                    base_fit = max(10.0, base_fit * 0.85)
                return round(base_fit, 1)
            return round(cand.confidence_score, 1)

        else:  # BALANCED
            # Map balanced utility from [-0.4, 0.6] to [0, 100]
            fit = (balanced_utility + 0.4) / 1.0 * 100.0
            return round(max(10.0, min(100.0, fit)), 1)

    def _generate_tradeoff_explanation(
        self,
        cand: CandidateProfile,
        role: str,
        fastest_cand: CandidateProfile,
        safest_cand: CandidateProfile,
        detour_minutes: float,
        safety_advantage: Optional[float],
        safest_violates_detour: bool,
    ) -> str:
        """Generates dynamic, evidence-traceable explanations based on actual route metrics."""
        dur_min = round(cand.duration_seconds / 60.0, 1)

        if role == "FASTEST":
            if safest_cand.route_id != cand.route_id and safest_cand.safety_score is not None and cand.safety_score is not None:
                score_diff = round(safest_cand.safety_score - cand.safety_score, 1)
                if score_diff > 3.0:
                    bottleneck = f"traversing {cand.bottleneck_reason or 'unlit/unmonitored arterial segments'}"
                    return (
                        f"Direct corridor minimizing travel time ({dur_min} min). However, it scores {cand.safety_score:.1f}/100 "
                        f"(-{score_diff} pts vs. Safest route) due to {bottleneck}."
                    )
            return (
                f"Direct arterial corridor optimizing travel time ({dur_min} min). "
                f"Safety evidence coverage is {int(cand.coverage_ratio * 100)}% along this path."
            )

        elif role == "SAFEST":
            if cand.safety_score is not None:
                detour_pct = int(((cand.duration_seconds - fastest_cand.duration_seconds) / max(1.0, fastest_cand.duration_seconds)) * 100)
                adv_str = f"+{safety_advantage:.1f} pts" if safety_advantage and safety_advantage > 0 else "comparable"

                if safest_violates_detour:
                    return (
                        f"Highest safety score ({cand.safety_score:.1f}/100, {adv_str} vs. Fastest), but requires a significant "
                        f"+{detour_minutes} min detour (+{detour_pct}% travel time) exceeding standard practical bounds."
                    )
                if cand.coverage_ratio < settings.SPARSE_EVIDENCE_THRESHOLD:
                    return (
                        f"Preferred for available positive safety factors ({cand.safety_score:.1f}/100, +{detour_minutes} min detour), "
                        f"but evidence coverage is sparse ({int(cand.coverage_ratio * 100)}%), so safety cannot be conclusively confirmed."
                    )
                return (
                    f"Prioritizes illuminated and monitored corridors with higher safety rating ({cand.safety_score:.1f}/100, "
                    f"{adv_str} vs. Fastest). Adds +{detour_minutes} min (+{detour_pct}% travel time)."
                )
            else:
                return (
                    f"Selected for highest relative data reliability ({cand.confidence_score:.0f}% confidence), "
                    f"as numerical safety scores are unassessed across these corridors."
                )

        elif role == "BALANCED":
            if cand.safety_score is not None and safety_advantage is not None and safety_advantage > 0:
                return (
                    f"Balanced compromise: adds only +{detour_minutes} min while achieving a {cand.safety_score:.1f}/100 safety score "
                    f"(+{safety_advantage:.1f} pts vs. Fastest) by avoiding known low-scoring arterial stretches."
                )
            elif detour_minutes > 0:
                return (
                    f"Prudent trade-off: balances travel time (+{detour_minutes} min) against road classification and "
                    f"coverage completeness ({int(cand.coverage_ratio * 100)}%)."
                )
            return f"Balanced corridor offering an even trade-off between driving duration ({dur_min} min) and road attributes."

        else:  # ALTERNATIVE
            if detour_minutes > 0:
                return f"Alternative road connection via {cand.summary_roads or 'secondary roads'} (+{detour_minutes} min)."
            return f"Alternative road connection via {cand.summary_roads or 'secondary roads'}."

    def _generate_tradeoff_summary(
        self,
        fastest_cand: CandidateProfile,
        safest_cand: CandidateProfile,
        balanced_cand: CandidateProfile,
        num_alternatives: int,
    ) -> str:
        """Constructs an executive summary of the alternative landscape."""
        fastest_min = round(fastest_cand.duration_seconds / 60.0, 1)

        if safest_cand.route_id == fastest_cand.route_id:
            return (
                f"Generated {num_alternatives} corridor alternative(s). The Fastest route ({fastest_min} min) also provides "
                "the highest safety score among evaluated paths; no speed-versus-safety penalty is incurred."
            )

        detour_min = round((safest_cand.duration_seconds - fastest_cand.duration_seconds) / 60.0, 1)
        if safest_cand.safety_score is not None and fastest_cand.safety_score is not None:
            adv = round(safest_cand.safety_score - fastest_cand.safety_score, 1)
            return (
                f"Comparing {num_alternatives} distinct route options: Safest route ({safest_cand.title}) provides a "
                f"+{adv:.1f} safety score advantage over the Fastest route in exchange for a +{detour_min} min detour. "
                f"Balanced route ({balanced_cand.title}) offers an intermediate compromise."
            )
        return (
            f"Comparing {num_alternatives} route alternative(s): Fastest takes {fastest_min} min; alternative corridors "
            f"add up to +{detour_min} min travel time with varying segment evidence coverage."
        )

    def _build_route_alternative(
        self,
        cand: CandidateProfile,
        route_type: str,
        recommended_for: str,
        tradeoff_explanation: str,
        detour_minutes: float,
        safety_advantage: Optional[float],
        preference_fit_score: float,
        is_selected: bool,
    ) -> RouteAlternative:
        """Constructs a fully populated, validated RouteAlternative schema instance."""
        dist_m = cand.distance_meters
        dur_s = cand.duration_seconds

        delta_s = max(0.0, dur_s - (cand.duration_seconds - detour_minutes * 60.0))

        if cand.route_safety and cand.route_safety.status in ("ASSESSED", "PARTIALLY_ASSESSED"):
            assessment_status = f"EVALUATED_{cand.route_safety.status}"
            safety_disclaimer = (
                f"Evidence-Based Assessment ({cand.route_safety.status}). "
                f"Coverage: {int(cand.coverage_ratio * 100)}% of route distance ({cand.route_safety.assessed_segments_count}/{cand.route_safety.total_segments_count} segments). "
                f"Overall risk: {cand.route_safety.overall_risk_level}. Does not guarantee personal safety."
            )
        else:
            assessment_status = "PENDING_PHASE_7_SAFETY_SCORING"
            safety_disclaimer = (
                "Route geometry sourced from OpenStreetMap road network. "
                f"{len(cand.segment_summaries)} discrete road segments linked (Phase 7). "
                "Multi-factor safety evidence scoring will be computed in subsequent phases."
            )

        return RouteAlternative(
            route_id=cand.route_id,
            route_type=route_type,
            title=cand.title,
            summary=cand.summary_roads,
            metrics=RouteMetrics(
                distance_meters=round(dist_m, 1),
                distance_km=round(dist_m / 1000.0, 2),
                duration_seconds=round(dur_s, 1),
                duration_minutes=round(dur_s / 60.0, 1),
                duration_type="ESTIMATED_FREE_FLOW",
                traffic_aware=False,
            ),
            coordinates=cand.coordinates,
            is_selected=is_selected,
            safety_assessment_status=assessment_status,
            safety_disclaimer=safety_disclaimer,
            safety_score=cand.safety_score,
            confidence_score=cand.confidence_score,
            delta_time_seconds=round(detour_minutes * 60.0, 1),
            delta_time_minutes=detour_minutes,
            segments=cand.segment_summaries,
            is_synthetic=cand.is_synthetic,
            tradeoff_explanation=tradeoff_explanation,
            detour_penalty_minutes=detour_minutes,
            safety_advantage_points=safety_advantage,
            preference_fit_score=preference_fit_score,
            evidence_coverage_ratio=round(cand.coverage_ratio, 2),
            recommended_for=recommended_for,
            bottleneck_segment_code=cand.bottleneck_segment_code,
            bottleneck_reason=cand.bottleneck_reason,
        )
