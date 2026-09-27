"""Integration tests for Phase 13 Contextual API endpoints."""

import unittest
from fastapi.testclient import TestClient

from backend.app.main import app


class TestContextualAPI(unittest.TestCase):
    """Test suite for Phase 13 API endpoints."""

    def setUp(self):
        self.client = TestClient(app)

    def test_get_current_context_endpoint(self):
        """GET /api/context/current returns valid solar and environmental data in Asia/Kolkata."""
        res = self.client.get("/api/context/current")
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertIn("solar_context", data)
        self.assertIn("environmental_context", data)
        self.assertEqual(data["timezone"], "Asia/Kolkata (IST: UTC+5:30)")
        self.assertIn("IST", data["current_time_ist"])

        solar = data["solar_context"]
        self.assertIn(solar["solar_phase"], ["DAYLIGHT", "GOLDEN_HOUR", "CIVIL_TWILIGHT", "NIGHT_EARLY", "NIGHT_LATE"])
        self.assertIn("sunrise_ist", solar)
        self.assertIn("sunset_ist", solar)

        env = data["environmental_context"]
        self.assertIn("temperature_celsius", env)
        self.assertIn("weather_description", env)
        self.assertIn(env["provenance"], ["LIVE_OPEN_METEO", "HOURLY_FORECAST", "HISTORICAL_CLIMATE_BASELINE"])

    def test_post_evaluate_context_endpoint(self):
        """POST /api/context/evaluate evaluates solar and weather for a specific date and time."""
        payload = {
            "journey_date": "2026-09-28",
            "departure_time": "20:30",
            "segment_codes": ["SEG-OSM-W24483756"],
        }
        res = self.client.post("/api/context/evaluate", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["journey_date"], "2026-09-28")
        self.assertEqual(data["departure_time"], "20:30")
        self.assertTrue(data["is_departure_future"])
        self.assertEqual(data["solar_context"]["solar_phase"], "NIGHT_EARLY")
        self.assertTrue(data["solar_context"]["is_dark"])

    def test_post_reassess_route_endpoint(self):
        """POST /api/context/reassess-route reassesses an alternative preserving kinematics."""
        route_payload = {
            "route_id": "ROUTE-TEST-REASSESS-01",
            "route_type": "BALANCED",
            "title": "via Poonamallee High Road",
            "summary": "Poonamallee High Road",
            "metrics": {
                "distance_meters": 4200.0,
                "distance_km": 4.2,
                "duration_seconds": 660.0,
                "duration_minutes": 11.0,
                "duration_type": "ESTIMATED_FREE_FLOW",
                "traffic_aware": False,
            },
            "coordinates": [[80.2707, 13.0827], [80.2500, 13.0600]],
            "safety_score": 75.0,
            "confidence_score": 80.0,
            "segments": [
                {
                    "segment_code": "SEG-PHR-01",
                    "name": "Poonamallee High Road",
                    "length_meters": 4200.0,
                    "safety_score": 75.0,
                    "confidence_score": 80.0,
                    "lighting_level": 0.8,
                }
            ],
        }

        reassess_req = {
            "route": route_payload,
            "journey_date": "2026-09-28",
            "departure_time": "23:30",
        }
        res = self.client.post("/api/context/reassess-route", json=reassess_req)
        self.assertEqual(res.status_code, 200)
        data = res.json()

        self.assertEqual(data["status"], "SUCCESS")
        updated_route = data["route"]
        # Kinematics are invariant
        self.assertEqual(updated_route["metrics"]["distance_meters"], 4200.0)
        self.assertEqual(updated_route["metrics"]["duration_minutes"], 11.0)
        self.assertEqual(len(updated_route["coordinates"]), 2)
        # Contextual report attached
        self.assertIn("contextual_report", updated_route)
        self.assertEqual(updated_route["contextual_report"]["solar_context"]["solar_phase"], "NIGHT_LATE")


if __name__ == "__main__":
    unittest.main()
