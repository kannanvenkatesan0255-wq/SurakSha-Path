"""Unit tests for Route Planning API, OSRM routing engine integration, and validation."""

import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.routing_service import RoutingService

class TestRoutingAPI(unittest.TestCase):
    """Test suite for POST /api/routes/plan endpoint."""

    def setUp(self):
        self.client = TestClient(app)

    def test_plan_route_live_osrm_or_fallback(self):
        """Verify successful route generation returns real route alternatives and navigation metrics."""
        payload = {
            "origin": {
                "name": "Chennai Central Railway Station",
                "lat": 13.0827,
                "lng": 80.2707,
                "is_resolved": True,
            },
            "destination": {
                "name": "T. Nagar Bus Terminus",
                "lat": 13.0418,
                "lng": 80.2341,
                "is_resolved": True,
            },
            "journey_date": "2026-09-27",
            "departure_time": "21:30",
            "route_preference": "BALANCED",
            "safety_weight_preference": 0.5,
            "avoid_unlit_areas": True,
        }

        response = self.client.post("/api/routes/plan", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["status"], "SUCCESS")
        self.assertEqual(data["routing_status"], "COMPLETED_PHASE_6_ROUTING_ENGINE")
        self.assertIn("OpenStreetMap", data["provider"])
        self.assertFalse(data["traffic_data_available"])
        self.assertTrue(data["journey_id"].startswith("JRN-"))

        # Verify route alternatives
        alternatives = data.get("alternatives", [])
        self.assertGreaterEqual(len(alternatives), 1)

        first_alt = alternatives[0]
        self.assertTrue(first_alt["route_id"].startswith("ROUTE-ALT-"))
        self.assertIn("metrics", first_alt)
        self.assertGreater(first_alt["metrics"]["distance_meters"], 1000)
        self.assertGreater(first_alt["metrics"]["duration_seconds"], 60)
        self.assertEqual(first_alt["metrics"]["traffic_aware"], False)

        # Verify GeoJSON coordinates
        coords = first_alt.get("coordinates", [])
        self.assertGreater(len(coords), 10)
        # Verify first point is [lng, lat]
        self.assertAlmostEqual(coords[0][0], 80.27, delta=0.05)
        self.assertAlmostEqual(coords[0][1], 13.08, delta=0.05)

        # Verify safety scoring disclaimer
        self.assertIn(first_alt["safety_assessment_status"], ["PENDING_PHASE_7_SAFETY_SCORING", "EVALUATED_PARTIALLY_ASSESSED", "EVALUATED_ASSESSED"])
        self.assertTrue(any(term in first_alt["safety_disclaimer"] for term in ["Phase 7", "Evidence-Based Assessment"]))

    def test_plan_route_identical_endpoints_rejected(self):
        """Verify identical origin and destination name is rejected by validation."""
        payload = {
            "origin": {"name": "Chennai Central Railway Station"},
            "destination": {"name": "chennai central railway station"},
            "route_preference": "BALANCED",
        }

        response = self.client.post("/api/routes/plan", json=payload)
        self.assertEqual(response.status_code, 422)
        errors = response.json().get("detail", [])
        self.assertTrue(any("identical" in str(err).lower() for err in errors))

    def test_plan_route_identical_coordinates_rejected(self):
        """Verify identical geographic coordinates are rejected by validation."""
        payload = {
            "origin": {"name": "Station North Gate", "lat": 13.0827, "lng": 80.2707},
            "destination": {"name": "Station Main Porch", "lat": 13.0827, "lng": 80.2707},
            "route_preference": "FASTEST",
        }

        response = self.client.post("/api/routes/plan", json=payload)
        self.assertEqual(response.status_code, 422)
        errors = response.json().get("detail", [])
        self.assertTrue(any("identical" in str(err).lower() for err in errors))

    def test_plan_route_invalid_preference_rejected(self):
        """Verify invalid route preference is rejected."""
        payload = {
            "origin": {"name": "Chennai Central"},
            "destination": {"name": "T. Nagar"},
            "route_preference": "INVALID_PREFERENCE",
        }

        response = self.client.post("/api/routes/plan", json=payload)
        self.assertEqual(response.status_code, 422)

    def test_routing_service_single_route_not_fabricated(self):
        """Verify that when OSRM returns only 1 route, service does not fabricate fake alternatives."""
        service = RoutingService()

        # Inject single route mock response
        mock_response = {
            "code": "Ok",
            "routes": [
                {
                    "distance": 8200.0,
                    "duration": 580.0,
                    "summary": "Sardar Patel Road",
                    "geometry": {
                        "coordinates": [[80.2025, 13.0067], [80.2200, 13.0080], [80.2486, 12.9897]]
                    },
                }
            ],
        }

        service.mock_osrm_response = mock_response

        from backend.app.schemas.routing import RoutePlanRequest, LocationInput

        req = RoutePlanRequest(
            origin=LocationInput(name="Guindy Metro", lat=13.0067, lng=80.2025),
            destination=LocationInput(name="OMR TIDEL", lat=12.9897, lng=80.2486),
            route_preference="FASTEST",
        )

        res = service.generate_route_alternatives(req)
        self.assertEqual(res.status, "SUCCESS")
        self.assertEqual(len(res.alternatives), 1)
        self.assertEqual(res.alternatives[0].route_type, "FASTEST")
        self.assertEqual(res.alternatives[0].metrics.distance_km, 8.2)

    def test_routing_service_no_route_found(self):
        """Verify graceful handling when OSRM reports NoRoute."""
        service = RoutingService()
        service.mock_osrm_response = {"code": "NoRoute", "routes": []}

        from backend.app.schemas.routing import RoutePlanRequest, LocationInput

        req = RoutePlanRequest(
            origin=LocationInput(name="Island Point", lat=13.0800, lng=80.3500),
            destination=LocationInput(name="T. Nagar", lat=13.0418, lng=80.2341),
            route_preference="FASTEST",
        )

        res = service.generate_route_alternatives(req)
        self.assertEqual(res.status, "NO_ROUTE_FOUND")
        self.assertEqual(len(res.alternatives), 0)
        self.assertIn("No viable road connection", res.message)

    def test_routing_service_deduplicates_identical_routes(self):
        """Verify that duplicate OSRM route geometries are deduplicated."""
        service = RoutingService()
        mock_response = {
            "code": "Ok",
            "routes": [
                {
                    "distance": 9000.0,
                    "duration": 600.0,
                    "summary": "Anna Salai",
                    "geometry": {"coordinates": [[80.27, 13.08], [80.25, 13.06], [80.23, 13.04]]},
                },
                # Duplicate route with virtually identical distance and coordinates
                {
                    "distance": 9002.0,
                    "duration": 601.0,
                    "summary": "Anna Salai",
                    "geometry": {"coordinates": [[80.27, 13.08], [80.25, 13.06], [80.23, 13.04]]},
                },
                # Genuine alternative
                {
                    "distance": 10500.0,
                    "duration": 720.0,
                    "summary": "Poonamallee High Road",
                    "geometry": {"coordinates": [[80.27, 13.08], [80.26, 13.07], [80.24, 13.05], [80.23, 13.04]]},
                },
            ],
        }

        service.mock_osrm_response = mock_response

        from backend.app.schemas.routing import RoutePlanRequest, LocationInput

        req = RoutePlanRequest(
            origin=LocationInput(name="Central", lat=13.0827, lng=80.2707),
            destination=LocationInput(name="T. Nagar", lat=13.0418, lng=80.2341),
            route_preference="BALANCED",
        )

        res = service.generate_route_alternatives(req)
        self.assertEqual(res.status, "SUCCESS")
        # 3 raw routes with 1 duplicate -> exactly 2 unique routes returned
        self.assertEqual(len(res.alternatives), 2)
        self.assertEqual(res.alternatives[0].route_type, "FASTEST")
        self.assertEqual(res.alternatives[1].route_type, "BALANCED")
        self.assertEqual(res.selected_route_id, res.alternatives[1].route_id)

if __name__ == "__main__":
    unittest.main()
