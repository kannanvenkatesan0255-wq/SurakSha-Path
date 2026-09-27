"""Road network segmentation, ingestion, spatial indexing, and route-to-segment association service."""

import json
import logging
import math
import os
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from ..models.domain import RoadSegment
from ..schemas.road_segment import (
    RoadSegmentCreate,
    RoadSegmentResponse,
    RoadSegmentSummary,
    MatchedSegmentItem,
    RouteMatchResponse,
    IngestionSummary,
    ProvenanceResponse,
)

logger = logging.getLogger(__name__)

# Bounding box constraints for Chennai Metropolitan Area (WGS84)
CHENNAI_BOUNDS = {
    "min_lat": 12.70,
    "max_lat": 13.40,
    "min_lng": 79.80,
    "max_lng": 80.50,
}

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates geodesic distance between two points in meters using Haversine formula."""
    if lat1 == lat2 and lon1 == lon2:
        return 0.0
    r = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c

def point_to_segment_distance_meters(px: float, py: float, x1: float, y1: float, x2: float, y2: float) -> float:
    """
    Computes minimum perpendicular distance in meters from point (px=lat, py=lng)
    to segment (x1=lat, y1=lng) -> (x2=lat, y2=lng).
    """
    seg_len_sq = (x2 - x1) ** 2 + (y2 - y1) ** 2
    if seg_len_sq < 1e-12:
        return haversine_distance_meters(px, py, x1, y1)

    # Project point onto line segment: t in [0, 1]
    t = max(0.0, min(1.0, ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / seg_len_sq))
    proj_x = x1 + t * (x2 - x1)
    proj_y = y1 + t * (y2 - y1)
    return haversine_distance_meters(px, py, proj_x, proj_y)

def calculate_linestring_length_meters(coordinates: List[List[float]]) -> float:
    """Calculates cumulative length in meters along a GeoJSON coordinates array [[lng, lat], ...]."""
    total = 0.0
    for i in range(len(coordinates) - 1):
        lng1, lat1 = coordinates[i]
        lng2, lat2 = coordinates[i + 1]
        total += haversine_distance_meters(lat1, lng1, lat2, lng2)
    return total


class RoadNetworkService:
    """Service handling road segment ingestion, querying, and route-to-segment association."""

    DEFAULT_DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "chennai_road_network.json")

    def __init__(self, db: Session):
        self.db = db

    def generate_segment_code(self, source_feature_id: Optional[str], index: int = 0, name: str = "road") -> str:
        """Generates a stable, deterministic segment identifier."""
        if source_feature_id:
            # Clean up OSM prefix e.g. "way/24483756" -> "WAY24483756"
            clean_id = source_feature_id.replace("/", "").replace("way", "W").upper()
            if index > 0:
                return f"SEG-OSM-{clean_id}-{index:02d}"
            return f"SEG-OSM-{clean_id}"
        
        # Fallback to deterministic name slug
        clean_name = "".join(c.upper() for c in name if c.isalnum())[:12]
        return f"SEG-CHN-{clean_name}-{index:02d}"

    def ingest_road_network(
        self,
        source_data: Optional[Dict[str, Any]] = None,
        file_path: Optional[str] = None,
        force_reload: bool = False,
    ) -> IngestionSummary:
        """
        Ingests road segments from GeoJSON feature collection or local verified file.
        Idempotent: skips existing segments by segment_code unless force_reload is True.
        """
        import_ts = datetime.now(timezone.utc).isoformat()
        
        if source_data is None:
            path_to_use = file_path or self.DEFAULT_DATA_PATH
            if not os.path.exists(path_to_use):
                return IngestionSummary(
                    source_name="OpenStreetMap / Local Extract",
                    source_dataset="Not Found",
                    license="ODbL 1.0",
                    attribution="© OpenStreetMap contributors",
                    import_timestamp=import_ts,
                    features_examined=0,
                    features_imported=0,
                    features_skipped_duplicates=0,
                    features_rejected=1,
                    rejection_reasons=[f"Data file not found at {path_to_use}"],
                    total_active_segments=self.db.query(RoadSegment).count(),
                )
            with open(path_to_use, "r", encoding="utf-8") as f:
                source_data = json.load(f)

        provenance = source_data.get("provenance", {})
        source_name = provenance.get("source_name", "OpenStreetMap")
        source_dataset = provenance.get("source_dataset", "Chennai Arterial Road Network")
        license_str = provenance.get("license", "Open Database License (ODbL) 1.0")
        attribution = provenance.get("attribution", "© OpenStreetMap contributors")
        is_synthetic = bool(provenance.get("is_synthetic", False))
        bbox = provenance.get("bounding_box", None)

        features = source_data.get("features", [])
        features_examined = len(features)
        features_imported = 0
        features_skipped = 0
        features_rejected = 0
        rejection_reasons = []

        existing_codes = {s.segment_code for s in self.db.query(RoadSegment.segment_code).all()}

        for idx, feat in enumerate(features):
            geom = feat.get("geometry", {})
            props = feat.get("properties", {})
            geom_type = geom.get("type")
            coords = geom.get("coordinates", [])

            # Validation 1: Geometry must be LineString
            if geom_type != "LineString":
                features_rejected += 1
                rejection_reasons.append(f"Feature {idx}: unsupported geometry type '{geom_type}' (expected LineString)")
                continue

            # Validation 2: LineString must have >= 2 coordinate pairs
            if not coords or len(coords) < 2:
                features_rejected += 1
                rejection_reasons.append(f"Feature {idx}: invalid coordinate count ({len(coords)} points)")
                continue

            # Validation 3: Check coordinate bounds for Chennai
            coords_valid = True
            for pt in coords:
                if len(pt) < 2:
                    coords_valid = False
                    break
                lng, lat = pt[0], pt[1]
                if not (CHENNAI_BOUNDS["min_lat"] <= lat <= CHENNAI_BOUNDS["max_lat"] and
                        CHENNAI_BOUNDS["min_lng"] <= lng <= CHENNAI_BOUNDS["max_lng"]):
                    coords_valid = False
                    rejection_reasons.append(
                        f"Feature {idx} ({props.get('name', 'unnamed')}): coordinate [{lat}, {lng}] out of Chennai bounds"
                    )
                    break

            if not coords_valid:
                features_rejected += 1
                continue

            # Extract properties
            name = props.get("name", "Unnamed Road").strip()
            corridor = props.get("corridor", "Chennai Demonstration Corridor")
            classification = props.get("road_classification", props.get("highway", "primary")).lower()
            source_feature_id = props.get("source_feature_id") or props.get("osm_id")
            if source_feature_id and not str(source_feature_id).startswith("way/"):
                source_feature_id = f"way/{source_feature_id}"

            segment_code = self.generate_segment_code(source_feature_id, idx, name)

            # Duplicate check
            if segment_code in existing_codes and not force_reload:
                features_skipped += 1
                continue

            start_lng, start_lat = coords[0]
            end_lng, end_lat = coords[-1]
            length_m = calculate_linestring_length_meters(coords)

            # Metadata tags
            metadata_dict = {
                "lanes": props.get("lanes", 4),
                "oneway": props.get("oneway", False),
                "maxspeed": props.get("maxspeed", 50),
                "surface": props.get("surface", "asphalt"),
                "source_feature_id": source_feature_id,
            }

            # Create or update segment
            segment = RoadSegment(
                segment_code=segment_code,
                name=name,
                corridor=corridor,
                city=props.get("city", "Chennai"),
                start_lat=start_lat,
                start_lng=start_lng,
                end_lat=end_lat,
                end_lng=end_lng,
                length_meters=round(length_m, 2),
                geometry_geojson=json.dumps(geom),
                source_feature_id=source_feature_id,
                road_classification=classification,
                source_dataset=source_dataset,
                source_metadata_json=json.dumps(metadata_dict),
                is_synthetic=is_synthetic,
                lighting_level=0.7,
                crowd_density=0.6,
                police_presence=0.5,
                cctv_coverage=0.4,
                commercial_activity=0.6,
            )

            self.db.add(segment)
            existing_codes.add(segment_code)
            features_imported += 1

        self.db.commit()

        total_active = self.db.query(RoadSegment).count()
        logger.info(
            f"Road network ingestion completed: {features_imported} imported, "
            f"{features_skipped} skipped duplicates, {features_rejected} rejected, total={total_active}"
        )

        return IngestionSummary(
            source_name=source_name,
            source_dataset=source_dataset,
            license=license_str,
            attribution=attribution,
            import_timestamp=import_ts,
            features_examined=features_examined,
            features_imported=features_imported,
            features_skipped_duplicates=features_skipped,
            features_rejected=features_rejected,
            rejection_reasons=rejection_reasons[:10],
            total_active_segments=total_active,
            bounding_box=bbox,
            is_synthetic_fixture=is_synthetic,
        )

    def get_segment_by_code(self, segment_code: str) -> Optional[RoadSegment]:
        """Retrieves a single road segment by its stable identifier."""
        return self.db.query(RoadSegment).filter(RoadSegment.segment_code == segment_code).first()

    def query_segments(
        self,
        corridor: Optional[str] = None,
        classification: Optional[str] = None,
        search: Optional[str] = None,
        is_synthetic: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[RoadSegment], int]:
        """Queries road segments with filtering and pagination."""
        query = self.db.query(RoadSegment)

        if corridor:
            query = query.filter(RoadSegment.corridor.ilike(f"%{corridor}%"))
        if classification:
            query = query.filter(RoadSegment.road_classification == classification.lower())
        if search:
            query = query.filter(
                or_(
                    RoadSegment.name.ilike(f"%{search}%"),
                    RoadSegment.segment_code.ilike(f"%{search}%"),
                    RoadSegment.corridor.ilike(f"%{search}%"),
                )
            )
        if is_synthetic is not None:
            query = query.filter(RoadSegment.is_synthetic == is_synthetic)

        total_count = query.count()
        segments = query.order_by(RoadSegment.id.asc()).offset(offset).limit(limit).all()
        return segments, total_count

    def query_segments_bbox(
        self,
        min_lat: float,
        min_lng: float,
        max_lat: float,
        max_lng: float,
        limit: int = 100,
    ) -> List[RoadSegment]:
        """Finds road segments intersecting a geographic bounding box."""
        query = self.db.query(RoadSegment).filter(
            or_(
                and_(
                    RoadSegment.start_lat >= min_lat,
                    RoadSegment.start_lat <= max_lat,
                    RoadSegment.start_lng >= min_lng,
                    RoadSegment.start_lng <= max_lng,
                ),
                and_(
                    RoadSegment.end_lat >= min_lat,
                    RoadSegment.end_lat <= max_lat,
                    RoadSegment.end_lng >= min_lng,
                    RoadSegment.end_lng <= max_lng,
                ),
            )
        )
        return query.limit(limit).all()

    def query_segments_near(
        self,
        lat: float,
        lng: float,
        radius_meters: float = 500.0,
        limit: int = 20,
    ) -> List[Tuple[RoadSegment, float]]:
        """Finds segments within radius_meters of a coordinate, sorted by distance ascending."""
        # Convert radius to approximate latitude/longitude bounding box (1 deg ~ 111 km)
        margin_deg = (radius_meters / 111000.0) * 1.5
        candidates = self.query_segments_bbox(
            min_lat=lat - margin_deg,
            min_lng=lng - margin_deg,
            max_lat=lat + margin_deg,
            max_lng=lng + margin_deg,
            limit=limit * 5,
        )

        results = []
        for segment in candidates:
            # Compute distance to segment points or line
            d_start = haversine_distance_meters(lat, lng, segment.start_lat, segment.start_lng)
            d_end = haversine_distance_meters(lat, lng, segment.end_lat, segment.end_lng)
            d_mid = point_to_segment_distance_meters(
                lat, lng, segment.start_lat, segment.start_lng, segment.end_lat, segment.end_lng
            )
            min_d = min(d_start, d_end, d_mid)
            if min_d <= radius_meters:
                results.append((segment, round(min_d, 1)))

        results.sort(key=lambda x: x[1])
        return results[:limit]

    def match_route_to_segments(
        self,
        route_coordinates: List[List[float]],
        tolerance_meters: float = 35.0,
    ) -> RouteMatchResponse:
        """
        Associates an arbitrary route polyline (GeoJSON [[lng, lat], ...]) with discrete road segments.
        Preserves traversal order, calculates coverage, and reports unmatched sections.
        """
        if not route_coordinates or len(route_coordinates) < 2:
            return RouteMatchResponse(
                matched_segments=[],
                total_route_length_meters=0.0,
                matched_length_meters=0.0,
                unmatched_length_meters=0.0,
                coverage_ratio=0.0,
                unmatched_segments_count=0,
                status="NO_SEGMENTS_IN_CORRIDOR",
                notice="Route coordinates empty or too short for segmentation matching.",
            )

        total_route_len = calculate_linestring_length_meters(route_coordinates)

        # Compute bounding box of route with tolerance margin
        route_lats = [pt[1] for pt in route_coordinates]
        route_lngs = [pt[0] for pt in route_coordinates]
        margin_deg = (tolerance_meters / 111000.0) * 2.0

        candidates = self.query_segments_bbox(
            min_lat=min(route_lats) - margin_deg,
            min_lng=min(route_lngs) - margin_deg,
            max_lat=max(route_lats) + margin_deg,
            max_lng=max(route_lngs) + margin_deg,
            limit=250,
        )

        if not candidates:
            return RouteMatchResponse(
                matched_segments=[],
                total_route_length_meters=round(total_route_len, 1),
                matched_length_meters=0.0,
                unmatched_length_meters=round(total_route_len, 1),
                coverage_ratio=0.0,
                unmatched_segments_count=0,
                status="NO_SEGMENTS_IN_CORRIDOR",
                notice="No road-network segments found within the corridor bounding box.",
            )

        # Match each candidate against route points to determine proximity and traversal index
        matched_candidates = []

        for seg in candidates:
            # Parse segment coordinates
            seg_coords = []
            if seg.geometry_geojson:
                try:
                    seg_geom = json.loads(seg.geometry_geojson)
                    seg_coords = seg_geom.get("coordinates", [])
                except Exception:
                    pass
            if not seg_coords:
                seg_coords = [[seg.start_lng, seg.start_lat], [seg.end_lng, seg.end_lat]]

            # Check proximity: test all vertices along the segment against the route polyline
            points_within_tolerance = 0
            min_dist_to_route = float("inf")
            earliest_route_idx = float("inf")

            for s_lng, s_lat in seg_coords:
                pt_min_d = float("inf")
                pt_earliest_r = float("inf")
                for r_idx in range(len(route_coordinates) - 1):
                    r_lng1, r_lat1 = route_coordinates[r_idx]
                    r_lng2, r_lat2 = route_coordinates[r_idx + 1]

                    d = point_to_segment_distance_meters(s_lat, s_lng, r_lat1, r_lng1, r_lat2, r_lng2)
                    if d < pt_min_d:
                        pt_min_d = d
                        pt_earliest_r = r_idx

                if pt_min_d <= tolerance_meters:
                    points_within_tolerance += 1
                if pt_min_d < min_dist_to_route:
                    min_dist_to_route = pt_min_d
                    earliest_route_idx = pt_earliest_r

            if points_within_tolerance > 0 and min_dist_to_route <= tolerance_meters:
                matched_candidates.append({
                    "segment": seg,
                    "traversal_index": earliest_route_idx,
                    "distance_to_route": min_dist_to_route,
                    "coordinates": seg_coords,
                })

        # Sort by chronological traversal order along the route
        matched_candidates.sort(key=lambda x: (x["traversal_index"], x["distance_to_route"]))

        # Deduplicate consecutive identical segments
        final_matched: List[MatchedSegmentItem] = []
        seen_codes = set()
        matched_len = 0.0

        for item in matched_candidates:
            seg = item["segment"]
            if seg.segment_code in seen_codes:
                continue
            seen_codes.add(seg.segment_code)

            matched_len += seg.length_meters
            final_matched.append(
                MatchedSegmentItem(
                    traversal_order=len(final_matched) + 1,
                    segment_code=seg.segment_code,
                    name=seg.name,
                    corridor=seg.corridor,
                    road_classification=seg.road_classification,
                    segment_length_meters=seg.length_meters,
                    matched_length_meters=seg.length_meters,
                    source_feature_id=seg.source_feature_id,
                    coordinates=item["coordinates"],
                )
            )

        unmatched_len = max(0.0, total_route_len - matched_len)
        coverage_ratio = min(1.0, round(matched_len / total_route_len, 4)) if total_route_len > 0 else 0.0

        if coverage_ratio >= 0.85:
            status = "MATCHED_FULL"
        elif coverage_ratio > 0.0:
            status = "MATCHED_PARTIAL"
        else:
            status = "NO_SEGMENTS_IN_CORRIDOR"

        notice = (
            f"Matched {len(final_matched)} discrete road segments along corridor ({round(coverage_ratio * 100, 1)}% coverage). "
            f"Safety scoring and evidence will be computed in Phase 8."
        )

        return RouteMatchResponse(
            matched_segments=final_matched,
            total_route_length_meters=round(total_route_len, 1),
            matched_length_meters=round(matched_len, 1),
            unmatched_length_meters=round(unmatched_len, 1),
            coverage_ratio=coverage_ratio,
            unmatched_segments_count=max(0, len(route_coordinates) - len(final_matched)),
            status=status,
            notice=notice,
        )

    def get_provenance(self) -> ProvenanceResponse:
        """Retrieves data provenance metadata for imported road segments."""
        total_segments = self.db.query(RoadSegment).count()
        
        # Corridors breakdown
        corridors = [
            row[0] for row in self.db.query(RoadSegment.corridor).distinct().all() if row[0]
        ]

        # Classifications breakdown
        classifications: Dict[str, int] = {}
        for row in self.db.query(RoadSegment.road_classification, func.count(RoadSegment.id)).group_by(RoadSegment.road_classification).all():
            if row[0]:
                classifications[row[0]] = row[1]

        sources = [
            {
                "name": "OpenStreetMap",
                "dataset": "Chennai Arterial Road Network",
                "license": "Open Database License (ODbL) 1.0",
                "attribution": "© OpenStreetMap contributors",
                "geographic_scope": "Chennai Metropolitan Area (CMA)",
                "coordinate_reference_system": "EPSG:4326 (WGS84)",
                "is_synthetic": False,
            }
        ]

        return ProvenanceResponse(
            sources=sources,
            total_segments=total_segments,
            corridors_covered=sorted(corridors),
            classifications=classifications,
            license="Open Database License (ODbL) 1.0",
            attribution="© OpenStreetMap contributors",
        )
