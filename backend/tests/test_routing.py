"""Unit tests for Route Planning API contract and validation."""

import unittest
from fastapi.testclient import TestClient
from backend.app.main import app

class TestRoutingAPI(unittest.TestCase):
    """Test suite for POST /api/routes/plan endpoint."""

    def setUp(self):
        self.client = TestClient(app)

    def test_plan_route_valid_request(self):
        """Verify successful route plan validation returns 200 with pending routing status."""
        payload = {
            "origin": {
                "name": "Chennai Central Railway Station",
                "lat": 13.0827,
                "lng": 80.2707,
                "is_resolved": True,
                "resolution_source": "CHENNAI_DEMO_CATALOG"
            },
            "destination": {
                "name": "T. Nagar Bus Terminus",
                "lat": 13.0418,
                "lng": 80.2341,
                "is_resolved": True,
                "resolution_source": "CHENNAI_DEMO_CATALOG"
            },
            "journey_date": "2026-09-27",
            "departure_time": "21:30",
            "route_preference": "BALANCED",
            "safety_weight_preference": 0.7,
            "avoid_unlit_areas": True
        }

        response = self.client.post("/api/routes/plan", json=payload)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "VALIDATED")
        self.assertEqual(data["routing_status"], "PENDING_ROUTING_ENGINE_PHASE_5")
        self.assertEqual(data["route_preference"], "BALANCED")
        self.assertTrue(data["journey_id"].startswith("JRN-"))
        # Strictly verify no fabricated fake alternatives are returned in Phase 4
        self.assertEqual(data["alternatives"], [])
        self.assertIn("Phase 5", data["message"])

    def test_plan_route_identical_endpoints_rejected(self):
        """Verify identical origin and destination is rejected by validation."""
        payload = {
            "origin": {"name": "Chennai Central Railway Station"},
            "destination": {"name": "chennai central railway station"},
            "route_preference": "BALANCED"
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
            "route_preference": "INVALID_PREFERENCE"
        }

        response = self.client.post("/api/routes/plan", json=payload)
        self.assertEqual(response.status_code, 422)

if __name__ == "__main__":
    unittest.main()
