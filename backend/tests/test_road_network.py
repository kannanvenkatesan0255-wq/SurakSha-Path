import os
import unittest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.models.domain import RoadSegment
from backend.app.services.road_network_service import (
    RoadNetworkService,
    haversine_distance_meters,
    point_to_segment_distance_meters,
    calculate_linestring_length_meters,
)

TEST_DB_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "test_road_network.db"))
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


class RoadNetworkTestCase(unittest.TestCase):
    """Test suite covering ingestion, queries, route matching, and provenance."""

    def setUp(self):
        Base.metadata.create_all(bind=engine)
        app.dependency_overrides[get_db] = override_get_db
        self.client = TestClient(app)
        self.db = TestingSessionLocal()
        self.service = RoadNetworkService(self.db)

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

    def test_01_haversine_and_geometry_calculations(self):
        """Test geodesic distance and line length calculations."""
        # Distance between Chennai Central and Egmore (~1.3 km)
        d = haversine_distance_meters(13.0827, 80.2707, 13.0782, 80.2608)
        self.assertTrue(1100.0 <= d <= 1500.0, f"Calculated distance was {d}m")

        # Zero distance to self
        self.assertEqual(haversine_distance_meters(13.0827, 80.2707, 13.0827, 80.2707), 0.0)

        # Cumulative LineString length
        coords = [[80.2707, 13.0827], [80.2650, 13.0800], [80.2608, 13.0782]]
        total_len = calculate_linestring_length_meters(coords)
        self.assertTrue(total_len > 1000.0)

    def test_02_stable_segment_code_generation(self):
        """Test that segment codes are deterministic and preserve source OSM way IDs."""
        code1 = self.service.generate_segment_code("way/24483756", index=0)
        code2 = self.service.generate_segment_code("way/24483756", index=0)
        self.assertEqual(code1, code2)
        self.assertEqual(code1, "SEG-OSM-W24483756")

        sub_code = self.service.generate_segment_code("way/24483756", index=3)
        self.assertEqual(sub_code, "SEG-OSM-W24483756-03")

        fallback_code = self.service.generate_segment_code(None, index=1, name="Anna Salai")
        self.assertTrue(fallback_code.startswith("SEG-CHN-ANNASALAI"))

    def test_03_ingest_road_network_from_authentic_dataset(self):
        """Test importing Chennai road network from verified OpenStreetMap dataset."""
        summary = self.service.ingest_road_network()
        self.assertGreater(summary.features_examined, 0)
        self.assertGreater(summary.features_imported, 0)
        self.assertEqual(summary.features_rejected, 0)
        self.assertEqual(summary.license, "Open Database License (ODbL) 1.0")
        self.assertEqual(summary.attribution, "© OpenStreetMap contributors")
        self.assertFalse(summary.is_synthetic_fixture)

        # Check records in database
        count = self.db.query(RoadSegment).count()
        self.assertEqual(count, summary.features_imported)

        # Verify a specific segment
        anna_salai = self.db.query(RoadSegment).filter(RoadSegment.name.ilike("%Anna Salai%")).first()
        self.assertIsNotNone(anna_salai)
        self.assertEqual(anna_salai.road_classification, "trunk")
        self.assertTrue(anna_salai.length_meters > 500.0)
        self.assertFalse(anna_salai.is_synthetic)

    def test_04_duplicate_ingestion_is_idempotent(self):
        """Test that repeated ingestion skips duplicates without modifying existing data."""
        sum1 = self.service.ingest_road_network()
        initial_count = self.db.query(RoadSegment).count()

        # Second ingestion without force_reload
        sum2 = self.service.ingest_road_network(force_reload=False)
        self.assertEqual(sum2.features_imported, 0)
        self.assertEqual(sum2.features_skipped_duplicates, sum1.features_imported)
        self.assertEqual(self.db.query(RoadSegment).count(), initial_count)

    def test_05_rejection_of_invalid_coordinates(self):
        """Test that out-of-bounds coordinates or malformed geometries are rejected with reasons."""
        malformed_data = {
            "provenance": {"source_name": "Test Fixture", "is_synthetic": True},
            "features": [
                {
                    "type": "Feature",
                    "properties": {"name": "Out of Bounds Road"},
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [[10.0, 50.0], [10.1, 50.1]]  # In Europe, outside Chennai!
                    }
                },
                {
                    "type": "Feature",
                    "properties": {"name": "Single Point Road"},
                    "geometry": {
                        "type": "LineString",
                        "coordinates": [[80.2707, 13.0827]]  # Only 1 point!
                    }
                },
                {
                    "type": "Feature",
                    "properties": {"name": "Polygon Road"},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[80.27, 13.08], [80.28, 13.08], [80.27, 13.08]]]
                    }
                }
            ]
        }

        summary = self.service.ingest_road_network(source_data=malformed_data)
        self.assertEqual(summary.features_imported, 0)
        self.assertEqual(summary.features_rejected, 3)
        self.assertEqual(len(summary.rejection_reasons), 3)

    def test_06_spatial_query_bbox(self):
        """Test bounding box queries for segments."""
        self.service.ingest_road_network()

        # Query central Chennai bounding box
        bbox_segments = self.service.query_segments_bbox(
            min_lat=13.05,
            min_lng=80.23,
            max_lat=13.09,
            max_lng=80.28,
            limit=50,
        )
        self.assertGreater(len(bbox_segments), 0)
        for s in bbox_segments:
            # Must intersect bounding box
            lat_in = (13.05 <= s.start_lat <= 13.09) or (13.05 <= s.end_lat <= 13.09)
            lng_in = (80.23 <= s.start_lng <= 80.28) or (80.23 <= s.end_lng <= 80.28)
            self.assertTrue(lat_in and lng_in)

    def test_07_spatial_query_near_coordinate(self):
        """Test proximity query near a landmark coordinate."""
        self.service.ingest_road_network()

        # Near Chennai Central Station (13.0827, 80.2707)
        results = self.service.query_segments_near(
            lat=13.0827,
            lng=80.2707,
            radius_meters=1000.0,
            limit=5,
        )
        self.assertGreater(len(results), 0)
        closest_seg, closest_dist = results[0]
        self.assertTrue(closest_dist <= 1000.0)
        # Segments must be ordered ascending by distance
        distances = [d for _, d in results]
        self.assertEqual(distances, sorted(distances))

    def test_08_route_to_segment_matching(self):
        """Test associating an actual Chennai route polyline with discrete road segments."""
        self.service.ingest_road_network()

        # Route from Chennai Central to T. Nagar via Anna Salai
        central_to_tnagar_route = [
            [80.2707, 13.0827],
            [80.2685, 13.0805],
            [80.2635, 13.0760],
            [80.2580, 13.0680],
            [80.2536, 13.0569],
            [80.2480, 13.0480],
            [80.2420, 13.0440],
            [80.2341, 13.0418],
        ]

        match_res = self.service.match_route_to_segments(central_to_tnagar_route, tolerance_meters=150.0)
        self.assertIn(match_res.status, ["MATCHED_FULL", "MATCHED_PARTIAL"])
        self.assertGreater(len(match_res.matched_segments), 0)
        self.assertTrue(match_res.coverage_ratio > 0.0)

        # Check sequential traversal order (1, 2, 3...)
        orders = [s.traversal_order for s in match_res.matched_segments]
        self.assertEqual(orders, list(range(1, len(orders) + 1)))

        # Sourced attributes must be present
        first_seg = match_res.matched_segments[0]
        self.assertIsNotNone(first_seg.segment_code)
        self.assertIsNotNone(first_seg.name)
        self.assertIsNotNone(first_seg.road_classification)

    def test_09_unmatched_route_handling(self):
        """Test route matching when route passes outside the covered road network."""
        self.service.ingest_road_network()

        # Hypothetical route in an uncovered area (e.g. far North Chennai: Ennore 13.25, 80.32)
        remote_route = [
            [80.3200, 13.2500],
            [80.3250, 13.2550],
            [80.3300, 13.2600],
        ]

        match_res = self.service.match_route_to_segments(remote_route, tolerance_meters=50.0)
        self.assertEqual(match_res.status, "NO_SEGMENTS_IN_CORRIDOR")
        self.assertEqual(len(match_res.matched_segments), 0)
        self.assertEqual(match_res.coverage_ratio, 0.0)
        self.assertEqual(match_res.matched_length_meters, 0.0)
        self.assertTrue(match_res.unmatched_length_meters > 0.0)

    def test_10_api_endpoints_integration(self):
        """Test all REST API endpoints for road segments."""
        # 1. Ingest via API
        ingest_res = self.client.post("/api/segments/ingest")
        self.assertEqual(ingest_res.status_code, 200)
        ingest_data = ingest_res.json()
        self.assertGreater(ingest_data["features_imported"], 0)

        # 2. List segments
        list_res = self.client.get("/api/segments?limit=10")
        self.assertEqual(list_res.status_code, 200)
        list_data = list_res.json()
        self.assertGreater(list_data["total"], 0)
        self.assertEqual(len(list_data["items"]), min(10, list_data["total"]))

        first_code = list_data["items"][0]["segment_code"]

        # 3. Get single segment
        single_res = self.client.get(f"/api/segments/{first_code}")
        self.assertEqual(single_res.status_code, 200)
        self.assertEqual(single_res.json()["segment_code"], first_code)

        # 4. 404 on nonexistent segment
        notFound_res = self.client.get("/api/segments/SEG-NONEXISTENT-999")
        self.assertEqual(notFound_res.status_code, 404)

        # 5. Provenance endpoint
        prov_res = self.client.get("/api/segments/provenance")
        self.assertEqual(prov_res.status_code, 200)
        prov_data = prov_res.json()
        self.assertIn("ODbL", prov_data["license"])
        self.assertIn("OpenStreetMap", prov_data["attribution"])
        self.assertGreater(prov_data["total_segments"], 0)

        # 6. Bbox endpoint
        bbox_res = self.client.post(
            "/api/segments/bbox",
            json={"min_lat": 13.00, "min_lng": 80.20, "max_lat": 13.10, "max_lng": 80.30, "limit": 20},
        )
        self.assertEqual(bbox_res.status_code, 200)
        self.assertIsInstance(bbox_res.json(), list)

        # 7. Proximity endpoint
        near_res = self.client.post(
            "/api/segments/near",
            json={"lat": 13.0827, "lng": 80.2707, "radius_meters": 1500.0, "limit": 5},
        )
        self.assertEqual(near_res.status_code, 200)
        self.assertGreater(len(near_res.json()), 0)

        # 8. Match route endpoint
        match_res = self.client.post(
            "/api/segments/match-route",
            json={
                "coordinates": [
                    [80.2707, 13.0827],
                    [80.2608, 13.0782],
                    [80.2500, 13.0700],
                    [80.2341, 13.0418],
                ],
                "tolerance_meters": 150.0,
            },
        )
        self.assertEqual(match_res.status_code, 200)
        self.assertIn("matched_segments", match_res.json())

    def test_11_route_generation_enriches_alternatives_with_segments(self):
        """Test that route planning endpoint enriches alternatives with traversed segments."""
        self.service.ingest_road_network()

        response = self.client.post(
            "/api/routes/plan",
            json={
                "origin": {"name": "Chennai Central Railway Station"},
                "destination": {"name": "T. Nagar Bus Terminus"},
                "route_preference": "BALANCED",
            },
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreater(len(data["alternatives"]), 0)

        # Check that traversed segments were linked
        first_alt = data["alternatives"][0]
        self.assertIn("segments", first_alt)
        self.assertGreater(len(first_alt["segments"]), 0)

        # Segments must have real code, name, and classification
        seg0 = first_alt["segments"][0]
        self.assertTrue(seg0["segment_code"].startswith("SEG-"))
        self.assertTrue(len(seg0["name"]) > 0)
        self.assertIsNone(seg0["safety_score"])  # Decoupled: safety score is None in Phase 7


if __name__ == "__main__":
    unittest.main()
