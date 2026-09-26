"""Unittest test suite for health and root endpoints."""

import unittest
from fastapi.testclient import TestClient
from backend.app.main import app

class TestHealthEndpoints(unittest.TestCase):
    """Test suite for health and system metadata endpoints."""

    def setUp(self):
        self.client = TestClient(app)

    def test_root_endpoint(self):
        """Verify root endpoint responds with status and documentation links."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "online")
        self.assertIn("Suraksha Path", data["app"])
        self.assertIn("disclaimer", data)

    def test_health_endpoint(self):
        """Verify /api/health returns healthy status and active services."""
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["city_context"], "Chennai, India")
        self.assertTrue(data["database"]["connected"])
        self.assertIn("routing_service", data["active_services"])
        self.assertIn("disclaimer", data)

if __name__ == "__main__":
    unittest.main()
