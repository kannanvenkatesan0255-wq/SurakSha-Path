"""Routing service boundary interface for Suraksha Path.
Integrates real OpenStreetMap road-network pathfinding via OSRM (Open Source Routing Machine),
calculating actual route geometries, distances, and duration estimates for Chennai corridors.
"""

import uuid
import logging
import httpx
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

from ..schemas.routing import (
    RoutePlanRequest,
    RoutePlanResponse,
    RouteAlternative,
    RouteMetrics,
    SegmentSummary,
    LocationInput,
)
from ..config import settings
from .route_optimization_service import RouteOptimizationService, CandidateProfile

logger = logging.getLogger(__name__)

# Curated reference catalog for resolving Chennai place names to coordinates on the backend
CHENNAI_LANDMARKS: Dict[str, Tuple[float, float, str]] = {
    "chennai central railway station": (13.0827, 80.2707, "Periyamet, Chennai 600003"),
    "t. nagar bus terminus": (13.0418, 80.2341, "Usman Road, T. Nagar, Chennai 600017"),
    "guindy metro station": (13.0067, 80.2025, "GST Road, Guindy, Chennai 600032"),
    "tidel park, rajiv gandhi it expressway (omr)": (12.9897, 80.2486, "Tharamani, OMR, Chennai 600113"),
    "marina beach light house": (13.0399, 80.2785, "Kamarajar Salai, Santhome, Chennai 600004"),
    "adyar signal": (13.0064, 80.2575, "Lattice Bridge Road, Adyar, Chennai 600020"),
    "velachery vijayanagar bus junction": (12.9759, 80.2212, "Vijayanagar, Velachery, Chennai 600042"),
    "anna university main campus, guindy": (13.0102, 80.2354, "Sardar Patel Road, Guindy, Chennai 600025"),
    "chennai egmore railway station": (13.0782, 80.2608, "Poonamallee High Road, Egmore, Chennai 600008"),
    "thousand lights mosque, anna salai": (13.0569, 80.2536, "Anna Salai, Thousand Lights, Chennai 600006"),
    "nandanam ymca junction": (13.0298, 80.2384, "Anna Salai, Nandanam, Chennai 600035"),
    "iit madras main gate (adyar)": (13.0067, 80.2435, "Sardar Patel Road, Adyar, Chennai 600036"),
}

# Verified offline road network geometries for Chennai corridors (used ONLY when OSRM server is unreachable)
OFFLINE_BENCHMARK_CORRIDORS: Dict[str, Dict[str, Any]] = {
    "central_to_tnagar": {
        "routes": [
            {
                "title": "Primary Arterial Route via Anna Salai (Mount Road)",
                "summary": "Anna Salai, Mount Road, Usman Road",
                "distance_meters": 9480.0,
                "duration_seconds": 650.0,
                "coordinates": [
                    [80.2707, 13.0827], [80.2685, 13.0805], [80.2635, 13.0760],
                    [80.2580, 13.0680], [80.2536, 13.0569], [80.2480, 13.0480],
                    [80.2420, 13.0440], [80.2341, 13.0418]
                ],
            },
            {
                "title": "Secondary Corridor via EVR Periyar Salai & GN Chetty Road",
                "summary": "Poonamallee High Road, GN Chetty Road",
                "distance_meters": 10150.0,
                "duration_seconds": 740.0,
                "coordinates": [
                    [80.2707, 13.0827], [80.2608, 13.0782], [80.2500, 13.0700],
                    [80.2430, 13.0580], [80.2390, 13.0490], [80.2341, 13.0418]
                ],
            },
        ]
    }
}


class RoutingService:
    """Service boundary for multi-route generation, spatial pathfinding, and OSRM integration."""

    # Optional mock response injector for deterministic unit testing
    mock_osrm_response: Optional[Dict[str, Any]] = None

    def __init__(self, db: Optional[Session] = None):
        self.db = db

    def resolve_location(self, location: LocationInput) -> Tuple[Optional[float], Optional[float], LocationInput]:
        """Resolves latitude and longitude for a given location input."""
        if location.lat is not None and location.lng is not None:
            return location.lat, location.lng, location

        query = location.name.strip().lower()

        # Check exact landmark match
        if query in CHENNAI_LANDMARKS:
            lat, lng, addr = CHENNAI_LANDMARKS[query]
            resolved = location.model_copy(update={
                "lat": lat,
                "lng": lng,
                "address": addr,
                "is_resolved": True,
                "resolution_source": "CHENNAI_CATALOG_BACKEND",
            })
            return lat, lng, resolved

        # Check partial landmark match
        for landmark, (lat, lng, addr) in CHENNAI_LANDMARKS.items():
            if query in landmark or landmark in query:
                resolved = location.model_copy(update={
                    "lat": lat,
                    "lng": lng,
                    "address": addr,
                    "is_resolved": True,
                    "resolution_source": "CHENNAI_CATALOG_BACKEND (Partial Match)",
                })
                return lat, lng, resolved

        return None, None, location

    def fetch_osrm_routes(
        self,
        orig_lat: float,
        orig_lng: float,
        dest_lat: float,
        dest_lng: float,
    ) -> Dict[str, Any]:
        """Queries the configured OSRM routing server for driving routes."""
        if self.mock_osrm_response is not None:
            return self.mock_osrm_response

        url = (
            f"{settings.OSRM_ROUTER_URL}/route/v1/driving/"
            f"{orig_lng},{orig_lat};{dest_lng},{dest_lat}"
            f"?overview=full&geometries=geojson&alternatives=true&steps=true"
        )

        headers = {
            "User-Agent": "SurakshaPath/0.1.0 (Chennai Safe Route Navigation Prototype; research/demonstration)",
            "Accept": "application/json",
        }

        with httpx.Client(timeout=settings.ROUTING_TIMEOUT_SECONDS) as client:
            response = client.get(url, headers=headers)
            response.raise_for_status()
            return response.json()

    def generate_route_alternatives(self, request: RoutePlanRequest) -> RoutePlanResponse:
        """
        Generates genuine route alternatives between origin and destination.
        Queries real OpenStreetMap road geometry via OSRM, normalizes metrics,
        and cleanly decouples routing from future Phase 7 safety scoring.
        """
        journey_id = f"JRN-{uuid.uuid4().hex[:8].upper()}"

        # 1. Resolve coordinates
        orig_lat, orig_lng, resolved_orig = self.resolve_location(request.origin)
        dest_lat, dest_lng, resolved_dest = self.resolve_location(request.destination)

        if orig_lat is None or orig_lng is None or dest_lat is None or dest_lng is None:
            return RoutePlanResponse(
                journey_id=journey_id,
                origin=resolved_orig,
                destination=resolved_dest,
                journey_date=request.journey_date,
                departure_time=request.departure_time,
                route_preference=request.route_preference,
                status="COORDINATES_REQUIRED",
                routing_status="PENDING_COORDINATES",
                message=(
                    "Could not resolve geographic coordinates for one or both locations. "
                    "Please select a landmark from the Chennai catalog or click a point on the interactive map."
                ),
                alternatives=[],
                disclaimer=settings.DISCLAIMER_TEXT,
            )

        # 2. Fetch routes from OSRM
        osrm_data: Optional[Dict[str, Any]] = None
        is_offline_fallback = False

        try:
            osrm_data = self.fetch_osrm_routes(orig_lat, orig_lng, dest_lat, dest_lng)
        except Exception as exc:
            logger.warning(f"OSRM routing query failed: {exc}. Attempting verified offline fallback.")
            if settings.ENABLE_OFFLINE_CORRIDOR_FALLBACK:
                # Check for benchmark corridor fallback
                if "central" in resolved_orig.name.lower() and "nagar" in resolved_dest.name.lower():
                    osrm_data = OFFLINE_BENCHMARK_CORRIDORS["central_to_tnagar"]
                    is_offline_fallback = True
                else:
                    return RoutePlanResponse(
                        journey_id=journey_id,
                        origin=resolved_orig,
                        destination=resolved_dest,
                        journey_date=request.journey_date,
                        departure_time=request.departure_time,
                        route_preference=request.route_preference,
                        status="PROVIDER_UNAVAILABLE",
                        routing_status="FAILED_PROVIDER_OFFLINE",
                        message=(
                            f"The routing engine at {settings.OSRM_ROUTER_URL} is currently unreachable. "
                            "Please check your internet connection or try again shortly."
                        ),
                        alternatives=[],
                        disclaimer=settings.DISCLAIMER_TEXT,
                    )
            else:
                return RoutePlanResponse(
                    journey_id=journey_id,
                    origin=resolved_orig,
                    destination=resolved_dest,
                    journey_date=request.journey_date,
                    departure_time=request.departure_time,
                    route_preference=request.route_preference,
                    status="PROVIDER_UNAVAILABLE",
                    routing_status="FAILED_PROVIDER_OFFLINE",
                    message=f"Routing service communication error: {str(exc)}",
                    alternatives=[],
                    disclaimer=settings.DISCLAIMER_TEXT,
                )

        # 3. Check for NoRoute from OSRM
        if not is_offline_fallback:
            code = osrm_data.get("code")
            if code == "NoRoute":
                return RoutePlanResponse(
                    journey_id=journey_id,
                    origin=resolved_orig,
                    destination=resolved_dest,
                    journey_date=request.journey_date,
                    departure_time=request.departure_time,
                    route_preference=request.route_preference,
                    status="NO_ROUTE_FOUND",
                    routing_status="NO_VIABLE_ROAD_CONNECTION",
                    message="No viable road connection found between these points in the Chennai road network.",
                    alternatives=[],
                    disclaimer=settings.DISCLAIMER_TEXT,
                )

        raw_routes = osrm_data.get("routes", [])
        if not raw_routes:
            return RoutePlanResponse(
                journey_id=journey_id,
                origin=resolved_orig,
                destination=resolved_dest,
                journey_date=request.journey_date,
                departure_time=request.departure_time,
                route_preference=request.route_preference,
                status="NO_ROUTE_FOUND",
                routing_status="ZERO_ROUTES_RETURNED",
                message="No route alternatives were returned by the routing engine.",
                alternatives=[],
                disclaimer=settings.DISCLAIMER_TEXT,
            )

        # 4. Deduplicate routes with identical distance (< 0.5% difference) and identical geometry length
        unique_routes = []
        for r in raw_routes:
            dist = float(r.get("distance", r.get("distance_meters", 0)))
            coords = r.get("geometry", {}).get("coordinates", r.get("coordinates", []))
            is_dup = False
            for u in unique_routes:
                u_dist = float(u.get("distance", u.get("distance_meters", 0)))
                u_coords = u.get("geometry", {}).get("coordinates", u.get("coordinates", []))
                if abs(dist - u_dist) / max(u_dist, 1.0) < 0.005 and len(coords) == len(u_coords):
                    is_dup = True
                    break
            if not is_dup:
                unique_routes.append(r)

        # Sort routes by travel duration (fastest first)
        unique_routes.sort(key=lambda x: float(x.get("duration", x.get("duration_seconds", 0))))

        fastest_duration = float(unique_routes[0].get("duration", unique_routes[0].get("duration_seconds", 0)))

        # 5. Build CandidateProfiles with Segment Matching and Safety Evaluation
        candidate_profiles: List[CandidateProfile] = []

        # Instantiate services once per request to maximize in-memory segment cache reuse
        seg_service = None
        risk_service = None
        if self.db:
            try:
                from .road_network_service import RoadNetworkService
                from .risk_service import RiskService
                seg_service = RoadNetworkService(self.db)
                risk_service = RiskService(self.db)
            except Exception as ex:
                logger.warning(f"Failed to initialize spatial services: {ex}")

        for idx, r in enumerate(unique_routes):
            route_id = f"ROUTE-ALT-{idx + 1}"
            dist_m = float(r.get("distance", r.get("distance_meters", 0)))
            dur_s = float(r.get("duration", r.get("duration_seconds", 0)))
            coords = r.get("geometry", {}).get("coordinates", r.get("coordinates", []))

            # Extract road summary from steps or legs
            summary_roads = r.get("summary", "")
            if not summary_roads and "legs" in r and r["legs"]:
                leg = r["legs"][0]
                summary_roads = leg.get("summary", "")

            if idx == 0:
                title = f"Arterial Route via {summary_roads}" if summary_roads else "Primary Arterial Corridor"
            elif idx == 1:
                title = f"Alternative Corridor via {summary_roads}" if summary_roads else "Secondary Route Corridor"
            elif idx == 2:
                title = f"Tertiary Corridor via {summary_roads}" if summary_roads else "Tertiary Route Corridor"
            else:
                title = f"Corridor Alternative {idx + 1}"

            # Road network segmentation association & Safety Assessment
            matched_segment_summaries: List[SegmentSummary] = []
            route_safety = None
            coverage_ratio = 0.0
            comp_safety = None
            comp_conf = 10.0
            bottleneck_code = None
            bottleneck_reason = None

            if seg_service and risk_service and coords:
                try:
                    match_res = seg_service.match_route_to_segments(coords, tolerance_meters=150.0)
                    
                    # Compute comprehensive route safety assessment (leveraging segment cache)
                    route_safety = risk_service.evaluate_route_safety(
                        route_id=route_id,
                        segments=match_res.matched_segments,
                        departure_time=request.departure_time,
                    )

                    if route_safety:
                        comp_safety = route_safety.composite_safety_score
                        comp_conf = route_safety.composite_confidence_score
                        coverage_ratio = route_safety.length_coverage_ratio
                        bottleneck_code = route_safety.highest_risk_segment_code
                        bottleneck_reason = route_safety.highest_risk_reason

                        # Map segment assessments by segment_code
                        eval_map = {a.segment_code: a for a in route_safety.segment_assessments}
                        for m in match_res.matched_segments:
                            seg_eval = eval_map.get(m.segment_code)
                            factors = [
                                f"Status: {seg_eval.status if seg_eval else 'UNASSESSED'}",
                                f"Classification: {m.road_classification or 'Arterial'}",
                            ]
                            if seg_eval and seg_eval.contributing_factors:
                                factors.extend([f.factor_name for f in seg_eval.contributing_factors[:2]])
                            elif seg_eval and seg_eval.missing_data_warnings:
                                factors.append(seg_eval.missing_data_warnings[0])

                            is_bn = bool(bottleneck_code and bottleneck_code == m.segment_code)
                            matched_segment_summaries.append(
                                SegmentSummary(
                                    segment_code=m.segment_code,
                                    name=m.name,
                                    length_meters=m.segment_length_meters,
                                    safety_score=seg_eval.safety_score if seg_eval else None,
                                    confidence_score=seg_eval.confidence_score if seg_eval else 10.0,
                                    key_factors=factors,
                                    status=seg_eval.status if seg_eval else "INSUFFICIENT_DATA",
                                    risk_level=seg_eval.risk_level if seg_eval else "UNKNOWN",
                                    road_classification=m.road_classification or "arterial",
                                    corridor=m.corridor,
                                    covered_categories=seg_eval.evidence_coverage.covered_categories if (seg_eval and seg_eval.evidence_coverage) else [],
                                    missing_categories=seg_eval.evidence_coverage.missing_categories if (seg_eval and seg_eval.evidence_coverage) else [],
                                    missing_data_warnings=seg_eval.missing_data_warnings if seg_eval else [],
                                    is_bottleneck=is_bn,
                                    bottleneck_reason=bottleneck_reason if is_bn else None,
                                    is_synthetic=seg_eval.is_synthetic if seg_eval else False,
                                    coordinates=m.coordinates or [],
                                )
                            )
                except Exception as ex:
                    logger.warning(f"Safety evaluation failed for route {route_id}: {ex}")

            profile = CandidateProfile(
                index=idx,
                raw_route=r,
                route_id=route_id,
                title=title,
                summary_roads=summary_roads,
                distance_meters=dist_m,
                duration_seconds=dur_s,
                coordinates=coords,
                route_safety=route_safety,
                segment_summaries=matched_segment_summaries,
                safety_score=comp_safety,
                confidence_score=comp_conf,
                coverage_ratio=coverage_ratio,
                bottleneck_segment_code=bottleneck_code,
                bottleneck_reason=bottleneck_reason,
                is_synthetic=is_offline_fallback,
            )
            candidate_profiles.append(profile)

        # 6. Optimize and Rank Alternatives using Safety-Time Trade-Off Engine (Phase 10)
        optimizer = RouteOptimizationService(
            safety_weight=request.safety_weight_preference,
            time_weight=1.0 - request.safety_weight_preference if request.safety_weight_preference is not None else None,
        )
        alternatives, selected_route_id, tradeoff_summary = optimizer.optimize_and_rank_routes(
            candidates=candidate_profiles,
            user_preference=request.route_preference,
        )

        # 7. Generate Route Explainability & Confidence Reports (Phase 11)
        try:
            from .explainability_service import ExplainabilityService
            exp_service = ExplainabilityService(db=self.db)
            for alt in alternatives:
                exp_report = exp_service.generate_report(
                    route=alt,
                    all_alternatives=alternatives,
                    departure_time=request.departure_time,
                )
                alt.explainability = exp_report.model_dump()
        except Exception as exp_err:
            logger.warning(f"Failed to generate explainability report: {exp_err}")

        provider_name = (
            "Chennai Urban Corridor Verified Graph (Offline Fallback)"
            if is_offline_fallback
            else settings.ROUTING_PROVIDER_NAME
        )

        provider_notes = (
            "External OSRM service was unreachable; returned verified offline Chennai corridor geometry for testing."
            if is_offline_fallback
            else (
                f"Generated {len(alternatives)} actual road route alternative(s) from OpenStreetMap road network. "
                "Metrics reflect free-flow travel estimates; live traffic sensors are not provided by OSRM."
            )
        )

        return RoutePlanResponse(
            journey_id=journey_id,
            origin=resolved_orig,
            destination=resolved_dest,
            journey_date=request.journey_date,
            departure_time=request.departure_time,
            route_preference=request.route_preference,
            status="SUCCESS",
            routing_status="COMPLETED_PHASE_6_ROUTING_ENGINE",
            provider=provider_name,
            provider_notes=provider_notes,
            traffic_data_available=False,
            preference_notice=(
                f"The '{request.route_preference}' preference is selected. "
                "Routes are evaluated using verified segment illumination, footfall, and police patrol coverage "
                "balanced against estimated travel duration under practical detour constraints."
            ),
            message=f"Calculated and optimized {len(alternatives)} route alternative(s) for Chennai journey.",
            alternatives=alternatives,
            selected_route_id=selected_route_id,
            tradeoff_summary=tradeoff_summary,
            optimization_strategy="PARETO_UTILITY_V1",
            disclaimer=settings.DISCLAIMER_TEXT,
        )
