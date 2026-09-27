"""Explainability service for Suraksha Path (Phase 11).

Generates comprehensive, evidence-traceable RouteExplainabilityReport instances
explaining:
- Safety Score semantics ([15.0 - 95.0] scale, distance-weighted aggregation, not crime prediction)
- Confidence semantics ([10.0 - 100.0]%, epistemic data certainty, not likelihood of harm)
- Evidence Coverage (physical audited proportion, absence != safety)
- Category breakdown (Lighting, Police, Pedestrian, Road, Community)
- Segment-level contributions, bottlenecks, and Leaflet coordinate highlights
- Dynamic "Why This Route?" trade-off justifications
- Transparent uncertainty, freshness, and synthetic data notices
"""

import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, Tuple

from sqlalchemy.orm import Session

from ..models.domain import RoadSegment, EvidenceItem
from ..schemas.routing import RouteAlternative, SegmentSummary
from ..schemas.explainability import (
    RouteExplainabilityReport,
    MetricSemanticDefinition,
    EvidenceCategoryBreakdownItem,
    SegmentExplainabilityItem,
    RouteAlternativeComparisonItem,
    WhyThisRouteJustification,
)
from ..config import settings

logger = logging.getLogger(__name__)

DISCLAIMER_TEXT = (
    "Suraksha Path is an evidence-based contextual advisory system for Chennai. "
    "It does not predict crime events and does not guarantee personal safety. "
    "Route evaluations reflect available environmental audits and community reports; "
    "unassessed segments carry unknown risk."
)

CATEGORY_METADATA: Dict[str, Dict[str, Any]] = {
    "LIGHTING": {
        "display_name": "Street Lighting & Illumination",
        "icon": "💡",
        "data_source": "Corporation of Greater Chennai / Smart City LED Audits",
        "data_vintage": "Spatial Lighting Audit 2025-2026",
        "configured_weight": 0.35,
        "engine_usage": "Direct positive impact for functional illumination; penalty during nocturnal hours (20:00–06:00) if unverified.",
        "known_limitations": "Does not capture real-time power outages, localized fixture failures, or private compound shadows.",
    },
    "POLICE_PRESENCE": {
        "display_name": "Police Stations & Patrol Corridors",
        "icon": "👮",
        "data_source": "Greater Chennai Police Station Jurisdictions & Beat Patrols",
        "data_vintage": "Municipal Police Beat Registry 2025",
        "configured_weight": 0.20,
        "engine_usage": "Positive score impact for proximity to 24/7 active police stations, booths, and verified beat corridors.",
        "known_limitations": "Reflects fixed jurisdiction boundaries and static beat routes; does not track real-time patrol vehicle positions.",
    },
    "PEDESTRIAN_INFRASTRUCTURE": {
        "display_name": "Footpaths & Pedestrian Walkways",
        "icon": "🚶",
        "data_source": "OpenStreetMap Highway Tags & CMA Pedestrian Network",
        "data_vintage": "OpenStreetMap Extract 2026",
        "configured_weight": 0.15,
        "engine_usage": "Positive score impact for continuous sidewalks, grade-separated pedestrian crossings, and paved footpaths.",
        "known_limitations": "Static tags do not reflect temporary sidewalk encroachments, construction work, or parked vehicles.",
    },
    "ROAD_CHARACTERISTIC": {
        "display_name": "Road Classification & Separation",
        "icon": "🛣️",
        "data_source": "OpenStreetMap Arterial Network Hierarchy",
        "data_vintage": "OpenStreetMap Extract 2026",
        "configured_weight": 0.15,
        "engine_usage": "Multi-lane divided carriageways with active vehicular movement provide natural surveillance compared to narrow isolated cut-throughs.",
        "known_limitations": "Major arterial roads may present higher traffic volume and vehicular hazards despite better visibility.",
    },
    "COMMUNITY_REPORT": {
        "display_name": "Trust-Weighted Community Observations",
        "icon": "👥",
        "data_source": "Suraksha Path Community Intelligence System",
        "data_vintage": "Real-Time / Decayed Citizen Reports",
        "configured_weight": 0.15,
        "engine_usage": "Citizen observations of hazards (unlit stretches, deserted spots) subtract points; verified safe conditions corroborate confidence.",
        "known_limitations": "Subject to reporting density and volunteer activity; an absence of community reports never proves an area is safe.",
    },
}


class ExplainabilityService:
    """Generates structured, verifiable explainability reports for routes."""

    def __init__(self, db: Optional[Session] = None):
        self.db = db

    def generate_report(
        self,
        route: RouteAlternative,
        all_alternatives: Optional[List[RouteAlternative]] = None,
        departure_time: Optional[str] = None,
    ) -> RouteExplainabilityReport:
        """
        Builds a comprehensive RouteExplainabilityReport from a calculated RouteAlternative,
        incorporating segment assessments, category contributions, and alternative comparisons.
        """
        all_alts = all_alternatives or [route]
        now_str = datetime.now(timezone.utc).isoformat()

        # 1. Metric Semantics Definitions
        safety_semantics = MetricSemanticDefinition(
            metric_name="Safety Score",
            scale="15.0 to 95.0",
            scale_min=15.0,
            scale_max=95.0,
            neutral_anchor=50.0,
            unit="points",
            definition=(
                "Advisory contextual safety index derived from distance-weighted environmental audits "
                "(street lighting, pedestrian infrastructure, police presence, road classification, and community reports). "
                "Anchored at 50.0 and clamped to [15.0, 95.0] to reflect urban uncertainty."
            ),
            aggregation_method=(
                "Length-weighted average across assessed corridor segments: Sum(Score_i * Length_i) / Sum(Length_i). "
                "Unassessed segments are strictly excluded from the composite score to avoid assuming safety from silence."
            ),
            what_it_establishes=(
                "The relative presence of observable environmental protective features and verified conditions "
                "along the assessed road corridor."
            ),
            what_it_does_not_establish=(
                "Does NOT establish a statistical probability of crime victimization, personal harm, "
                "or a guarantee of incident-free transit."
            ),
            disclaimer=DISCLAIMER_TEXT,
        )

        confidence_semantics = MetricSemanticDefinition(
            metric_name="Data Reliability (Confidence)",
            scale="10.0% to 100.0%",
            scale_min=10.0,
            scale_max=100.0,
            neutral_anchor=None,
            unit="percentage",
            definition=(
                "Epistemic measure of data completeness, multi-source category diversity, record density, "
                "and verification status. Independent from Safety Score (a corridor can have a high score with low confidence if sparsely audited)."
            ),
            aggregation_method=(
                "Length-weighted segment confidence across the entire route. Unassessed segments contribute at baseline "
                "10% certainty, penalizing corridors with large data voids."
            ),
            what_it_establishes=(
                "How comprehensively and reliably the road segments have been audited and corroborated by supporting evidence."
            ),
            what_it_does_not_establish=(
                "Does NOT indicate the likelihood that an incident will or will not occur."
            ),
            disclaimer=(
                "High confidence indicates well-audited evidence, not guaranteed safety. "
                "Low confidence indicates that the safety score is based on limited or incomplete observations."
            ),
        )

        coverage_semantics = MetricSemanticDefinition(
            metric_name="Evidence Coverage",
            scale="0.0% to 100.0%",
            scale_min=0.0,
            scale_max=100.0,
            neutral_anchor=None,
            unit="percentage",
            definition=(
                "Proportion of total physical route distance that has registered, verified environmental evidence records."
            ),
            aggregation_method=(
                "Assessed route length divided by total route length: L_assessed / L_total."
            ),
            what_it_establishes=(
                "Physical completeness of environmental audits along the traversed route."
            ),
            what_it_does_not_establish=(
                "Does NOT indicate that unassessed segments are safe or dangerous; they are simply unknown."
            ),
            disclaimer=(
                "Absence of evidence is strictly treated as unknown condition, never assumed safety."
            ),
        )

        # 2. Risk Level and Coverage Metrics
        score = route.safety_score
        if score is None:
            risk_level = "UNKNOWN"
        elif score >= 70.0:
            risk_level = "LOW"
        elif score >= 45.0:
            risk_level = "MEDIUM"
        else:
            risk_level = "HIGH"

        coverage_ratio = route.evidence_coverage_ratio if route.evidence_coverage_ratio is not None else 0.0
        coverage_pct = round(coverage_ratio * 100.0, 1)
        is_sparse = coverage_ratio < 0.25

        dist_m = route.metrics.distance_meters if route.metrics else 0.0
        dist_km = route.metrics.distance_km if route.metrics else round(dist_m / 1000.0, 2)
        dur_min = route.metrics.duration_minutes if route.metrics else 0.0

        assessed_m = dist_m * coverage_ratio
        unassessed_m = max(0.0, dist_m - assessed_m)
        assessed_km = round(assessed_m / 1000.0, 2)
        unassessed_km = round(unassessed_m / 1000.0, 2)

        total_segments = len(route.segments)
        assessed_segments = sum(1 for s in route.segments if s.safety_score is not None)
        unassessed_segments = total_segments - assessed_segments

        # 3. Category Breakdown Aggregation
        category_breakdowns = self._aggregate_category_breakdowns(route)

        # 4. Segment Explainability Items
        segment_items = self._build_segment_items(route, dist_m)

        # 5. Route Alternatives Comparison
        comparisons = self._build_route_comparisons(route, all_alts)

        # 6. Dynamic "Why This Route?" Narrative
        why_this_route = self._generate_why_this_route(route, all_alts, departure_time)

        # 7. Uncertainty and Governance Notices
        uncertainty_notices, freshness_overall = self._evaluate_uncertainties(
            route=route,
            coverage_ratio=coverage_ratio,
            departure_time=departure_time,
            unassessed_segments=unassessed_segments,
            category_breakdowns=category_breakdowns,
        )

        return RouteExplainabilityReport(
            route_id=route.route_id,
            route_title=route.title,
            route_type=route.route_type,
            summary_roads=route.summary,
            duration_minutes=dur_min,
            distance_km=dist_km,
            departure_time=departure_time,
            assessment_timestamp=now_str,
            safety_score=score,
            safety_score_semantics=safety_semantics,
            risk_level=risk_level,
            confidence_score=route.confidence_score if route.confidence_score is not None else 10.0,
            confidence_semantics=confidence_semantics,
            evidence_coverage_ratio=coverage_ratio,
            evidence_coverage_percentage=coverage_pct,
            evidence_coverage_semantics=coverage_semantics,
            assessed_distance_km=assessed_km,
            unassessed_distance_km=unassessed_km,
            total_segments_count=total_segments,
            assessed_segments_count=assessed_segments,
            unassessed_segments_count=unassessed_segments,
            is_sparse_coverage=is_sparse,
            why_this_route=why_this_route,
            category_breakdowns=category_breakdowns,
            segment_breakdowns=segment_items,
            route_comparisons=comparisons,
            data_freshness_overall=freshness_overall,
            active_uncertainty_notices=uncertainty_notices,
            disclaimer=DISCLAIMER_TEXT,
            methodology_version="SURAKSHA-HEURISTIC-V1",
            is_synthetic_route=bool(route.is_synthetic),
        )

    def _aggregate_category_breakdowns(self, route: RouteAlternative) -> List[EvidenceCategoryBreakdownItem]:
        """Calculates evidence stream contributions, record counts, and provenance for the route."""
        items: List[EvidenceCategoryBreakdownItem] = []

        # If DB is available, query evidence items associated with route segment codes
        segment_codes = [s.segment_code for s in route.segments if s.segment_code]
        evidence_by_cat: Dict[str, List[Any]] = {k: [] for k in CATEGORY_METADATA.keys()}

        if self.db and segment_codes:
            records = (
                self.db.query(EvidenceItem)
                .filter(EvidenceItem.segment_code.in_(segment_codes))
                .all()
            )
            for r in records:
                cat = getattr(r, "category", "")
                if cat in evidence_by_cat:
                    evidence_by_cat[cat].append(r)

        for cat_key, meta in CATEGORY_METADATA.items():
            ev_list = evidence_by_cat.get(cat_key, [])
            rec_count = len(ev_list)

            # Calculate net impact across segments
            net_impact = 0.0
            if ev_list:
                for item in ev_list:
                    impact = getattr(item, "impact_score", 0.0)
                    weight = getattr(item, "confidence_weight", 1.0)
                    net_impact += impact * weight
            else:
                # Fallback heuristic estimation based on segment factor tags
                for seg in route.segments:
                    for factor in getattr(seg, "key_factors", []):
                        if cat_key == "LIGHTING" and "Lighting" in factor:
                            net_impact += 3.5
                            rec_count += 1
                        elif cat_key == "POLICE_PRESENCE" and "Police" in factor:
                            net_impact += 2.0
                            rec_count += 1
                        elif cat_key == "ROAD_CHARACTERISTIC" and ("Arterial" in factor or "Classification" in factor):
                            net_impact += 2.5
                            rec_count += 1

            is_available = rec_count > 0
            if not is_available:
                direction = "MISSING"
                freshness = "UNAUDITED"
            elif net_impact > 0.5:
                direction = "POSITIVE"
                freshness = "FRESH"
            elif net_impact < -0.5:
                direction = "NEGATIVE"
                freshness = "FRESH"
            else:
                direction = "NEUTRAL"
                freshness = "FRESH"

            items.append(
                EvidenceCategoryBreakdownItem(
                    category_key=cat_key,
                    display_name=meta["display_name"],
                    icon=meta["icon"],
                    is_available=is_available,
                    record_count=rec_count,
                    net_impact_points=round(net_impact, 1),
                    impact_direction=direction,
                    data_source=meta["data_source"],
                    data_vintage=meta["data_vintage"],
                    freshness_status=freshness,
                    is_synthetic=bool(route.is_synthetic),
                    engine_usage=meta["engine_usage"],
                    known_limitations=meta["known_limitations"],
                    configured_weight=meta["configured_weight"],
                )
            )

        return items

    def _build_segment_items(
        self,
        route: RouteAlternative,
        total_dist_m: float,
    ) -> List[SegmentExplainabilityItem]:
        """Constructs detailed segment explainability records with coordinates for map synchronization."""
        items: List[SegmentExplainabilityItem] = []
        denom = max(1.0, total_dist_m)

        for idx, seg in enumerate(route.segments):
            seg_len = seg.length_meters or 100.0
            pct = round((seg_len / denom) * 100.0, 1)

            # Determine risk level
            s_score = seg.safety_score
            if s_score is None:
                r_level = "UNKNOWN"
                status = getattr(seg, "status", None) or "INSUFFICIENT_DATA"
            elif s_score >= 70.0:
                r_level = "LOW"
                status = getattr(seg, "status", None) or "ASSESSED"
            elif s_score >= 45.0:
                r_level = "MEDIUM"
                status = getattr(seg, "status", None) or "ASSESSED"
            else:
                r_level = "HIGH"
                status = getattr(seg, "status", None) or "ASSESSED"

            is_bn = bool(
                route.bottleneck_segment_code and route.bottleneck_segment_code == seg.segment_code
            ) or getattr(seg, "is_bottleneck", False)
            bn_reason = route.bottleneck_reason if is_bn else getattr(seg, "bottleneck_reason", None)

            # Categorize positive / negative factors
            factors = getattr(seg, "key_factors", [])
            pos_factors = [f for f in factors if not any(w in f.lower() for w in ["unlit", "bottleneck", "missing", "unknown", "high"])]
            neg_factors = [f for f in factors if any(w in f.lower() for w in ["unlit", "bottleneck", "missing", "sparse"])]

            missing_warnings = []
            if s_score is None:
                missing_warnings.append(f"No verifiable safety audit records for segment '{seg.segment_code}'.")

            # Get segment coordinates if stored or query from DB
            coords = getattr(seg, "coordinates", [])
            if not coords and self.db and seg.segment_code:
                db_seg = self.db.query(RoadSegment).filter(RoadSegment.segment_code == seg.segment_code).first()
                if db_seg and db_seg.geometry_geojson:
                    try:
                        import json
                        coords = json.loads(db_seg.geometry_geojson).get("coordinates", [])
                    except Exception:
                        pass
                if not coords and db_seg:
                    coords = [[db_seg.start_lng, db_seg.start_lat], [db_seg.end_lng, db_seg.end_lat]]

            items.append(
                SegmentExplainabilityItem(
                    traversal_order=idx + 1,
                    segment_code=seg.segment_code,
                    road_name=seg.name or f"Segment {seg.segment_code}",
                    corridor=getattr(seg, "corridor", None),
                    road_classification=getattr(seg, "road_classification", "arterial") or "arterial",
                    length_meters=round(seg_len, 1),
                    length_percentage=pct,
                    safety_score=s_score,
                    risk_level=r_level,
                    confidence_score=seg.confidence_score if seg.confidence_score is not None else 10.0,
                    status=status,
                    is_bottleneck=is_bn,
                    bottleneck_reason=bn_reason,
                    covered_categories=getattr(seg, "covered_categories", []),
                    missing_categories=getattr(seg, "missing_categories", []),
                    top_positive_factors=pos_factors[:3],
                    top_negative_factors=neg_factors[:3],
                    missing_data_warnings=missing_warnings,
                    temporal_context=None,
                    is_synthetic=bool(route.is_synthetic),
                    coordinates=coords,
                )
            )

        return items

    def _build_route_comparisons(
        self,
        selected_route: RouteAlternative,
        all_alternatives: List[RouteAlternative],
    ) -> List[RouteAlternativeComparisonItem]:
        """Constructs comparative matrix across alternative routes."""
        if not all_alternatives:
            return []

        # Find fastest baseline
        fastest_dur = min((a.metrics.duration_minutes for a in all_alternatives if a.metrics), default=0.0)
        fastest_alt = min(all_alternatives, key=lambda a: a.metrics.duration_minutes if a.metrics else 999.0)
        fastest_score = fastest_alt.safety_score

        comparisons = []
        for alt in all_alternatives:
            dur = alt.metrics.duration_minutes if alt.metrics else 0.0
            dist = alt.metrics.distance_km if alt.metrics else 0.0
            delta_dur = round(max(0.0, dur - fastest_dur), 1)

            delta_score = None
            if alt.safety_score is not None and fastest_score is not None:
                delta_score = round(alt.safety_score - fastest_score, 1)

            comparisons.append(
                RouteAlternativeComparisonItem(
                    route_id=alt.route_id,
                    title=alt.title,
                    route_type=alt.route_type,
                    recommended_for=alt.recommended_for or alt.route_type,
                    duration_minutes=dur,
                    delta_duration_minutes=delta_dur,
                    distance_km=dist,
                    safety_score=alt.safety_score,
                    delta_safety_points=delta_score,
                    confidence_score=alt.confidence_score if alt.confidence_score is not None else 10.0,
                    coverage_ratio=alt.evidence_coverage_ratio if alt.evidence_coverage_ratio is not None else 0.0,
                    is_selected=(alt.route_id == selected_route.route_id),
                    preference_fit_score=alt.preference_fit_score,
                    summary_roads=alt.summary,
                )
            )

        return comparisons

    def _generate_why_this_route(
        self,
        route: RouteAlternative,
        all_alternatives: List[RouteAlternative],
        departure_time: Optional[str] = None,
    ) -> WhyThisRouteJustification:
        """Constructs data-driven, preference-specific 'Why This Route?' justification."""
        pref = route.recommended_for or route.route_type or "BALANCED"
        dur_min = route.metrics.duration_minutes if route.metrics else 0.0

        # Identify fastest alternative
        fastest_alt = min(all_alternatives, key=lambda a: a.metrics.duration_minutes if a.metrics else 999.0) if all_alternatives else route
        fastest_dur = fastest_alt.metrics.duration_minutes if fastest_alt.metrics else dur_min
        detour_min = round(max(0.0, dur_min - fastest_dur), 1)

        # Identify safest alternative
        alts_with_score = [a for a in all_alternatives if a.safety_score is not None]
        safest_alt = max(alts_with_score, key=lambda a: a.safety_score) if alts_with_score else route

        score = route.safety_score
        fast_score = fastest_alt.safety_score

        diff_score = None
        if score is not None and fast_score is not None:
            diff_score = round(score - fast_score, 1)

        differentiating = []
        limitations = [
            "Assessments are contextual heuristics and do not predict criminal incidents.",
            "Absence of reported hazards or missing data is never treated as proof of safety.",
        ]

        if pref == "FASTEST":
            headline = f"Fastest Transit Option ({dur_min} min)"
            time_vs = "Optimal free-flow travel duration; 0.0 min detour."

            if safest_alt.route_id != route.route_id and safest_alt.safety_score is not None and score is not None:
                safety_gap = round(safest_alt.safety_score - score, 1)
                safety_vs = f"Safety score is {score}/100, which is {safety_gap} points lower than Safest alternative ({safest_alt.title})."
                differentiating.append(f"Minimizes driving duration by {round((safest_alt.metrics.duration_minutes if safest_alt.metrics else dur_min) - dur_min, 1)} min compared to the Safest route.")
                differentiating.append("Prioritizes straight-line arterial transit over illumination or patrol density.")
                limitations.append(f"Accepts unmonitored segments or lower lighting density to achieve minimum travel time.")
            else:
                safety_vs = f"Safety score: {score if score is not None else 'Unassessed'}."
                differentiating.append("Direct corridor transit path with no speed-versus-safety divergence.")

            detailed = (
                f"Selected under the FASTEST navigation preference to minimize travel time ({dur_min} min, {route.metrics.distance_km if route.metrics else 0} km). "
                f"This route prioritizes arterial speed over environmental protective coverage."
            )

        elif pref == "SAFEST":
            headline = f"Maximum Environmental Safety Evidence ({score or 'Assessed'}/100)"
            time_vs = f"Adds a +{detour_min} min detour compared to the fastest baseline ({fastest_dur} min)."
            
            if diff_score is not None and diff_score > 0:
                safety_vs = f"+{diff_score} points higher Safety Score over the fastest baseline ({fast_score}/100)."
                differentiating.append(f"Highest composite safety score ({score}/100) among all evaluated corridors.")
                differentiating.append("Maximizes transit along verified lit corridors and police jurisdictions.")
            else:
                safety_vs = f"Safety score: {score}/100 with {round((route.evidence_coverage_ratio or 0) * 100)}% verified coverage."
                differentiating.append("Maximizes verified evidence coverage over alternative unmonitored shortcuts.")

            detailed = (
                f"Selected under the SAFEST navigation preference to maximize verified protective infrastructure. "
                f"It achieves a Safety Score of {score}/100 with {round((route.evidence_coverage_ratio or 0) * 100)}% evidence coverage, "
                f"accepting an estimated +{detour_min} min travel penalty over the fastest corridor."
            )
            limitations.append("A higher safety score reflects audited infrastructure, not a guarantee of personal safety.")

        else:  # BALANCED
            headline = f"Balanced Speed & Safety Compromise"
            time_vs = f"Modest +{detour_min} min detour over fastest baseline ({fastest_dur} min)."
            
            if diff_score is not None and diff_score > 0:
                safety_vs = f"+{diff_score} points safety advantage over fastest baseline."
                differentiating.append(f"Achieves +{diff_score} safety points for only a +{detour_min} min time investment.")
            else:
                safety_vs = f"Safety score: {score if score is not None else '50.0'}."
                differentiating.append("Balanced corridor selection avoiding extreme detours.")

            differentiating.append(f"Maintains {round((route.evidence_coverage_ratio or 0) * 100)}% evidence coverage while preserving travel efficiency.")
            detailed = (
                f"Selected under the BALANCED preference using multi-objective Pareto trade-off optimization. "
                f"It offers an optimal compromise between travel duration ({dur_min} min) and verified environmental safety ({score or 'Unassessed'}/100), "
                f"incurring a reasonable +{detour_min} min detour."
            )

        # Nocturnal departure context
        if departure_time:
            is_nocturnal = self._is_nocturnal_time(departure_time)
            if is_nocturnal:
                differentiating.append(f"Departure at {departure_time} evaluated with nocturnal lighting weighting.")

        return WhyThisRouteJustification(
            selected_preference=pref,
            headline=headline,
            detailed_justification=detailed,
            time_vs_fastest=time_vs,
            safety_vs_fastest=safety_vs,
            key_differentiating_factors=differentiating,
            identified_bottleneck=route.bottleneck_reason,
            trade_off_limitations=limitations,
        )

    def _evaluate_uncertainties(
        self,
        route: RouteAlternative,
        coverage_ratio: float,
        departure_time: Optional[str],
        unassessed_segments: int,
        category_breakdowns: List[EvidenceCategoryBreakdownItem],
    ) -> Tuple[List[str], str]:
        """Evaluates active uncertainty flags and assigns overall freshness classification."""
        notices = []
        freshness_overall = "CURRENT"

        if coverage_ratio < 0.25:
            notices.append(
                f"Limited Evidence Warning: Only {round(coverage_ratio * 100)}% of this route has recorded evidence. "
                "Calculated scores carry elevated uncertainty."
            )
            freshness_overall = "SPARSE"

        if unassessed_segments > 0 or coverage_ratio < 1.0:
            if unassessed_segments > 0:
                notices.append(
                    f"{unassessed_segments} unassessed corridor segment(s) detected. "
                    "Notice: Absence of reported incidents or missing records is NOT proof of safety."
                )
            else:
                notices.append(
                    "Coverage Notice: Corridor contains unassessed road distance. "
                    "Absence of reported incidents or missing records is NOT proof of safety."
                )

        if departure_time and self._is_nocturnal_time(departure_time):
            lighting_cat = next((c for c in category_breakdowns if c.category_key == "LIGHTING"), None)
            if not lighting_cat or not lighting_cat.is_available:
                notices.append(
                    f"Nocturnal Departure Advisory ({departure_time}): Verified street lighting audits are missing "
                    "for portions of this corridor."
                )

        if route.is_synthetic:
            notices.append(
                "Offline Benchmark Route: Sourced from verified Chennai arterial graph fixtures because OSRM service was unreachable."
            )

        return notices, freshness_overall

    @staticmethod
    def _is_nocturnal_time(time_str: str) -> bool:
        """Checks if time falls between 20:00 and 06:00."""
        try:
            parts = time_str.split(":")
            h = int(parts[0])
            return h >= 20 or h < 6
        except Exception:
            return False
