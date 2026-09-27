"""Unittest test suite for database connectivity and domain model tables."""

import unittest
from sqlalchemy import text
from backend.app.database import engine, check_db_connection, init_db

class TestDatabase(unittest.TestCase):
    """Test suite for database initialization and tables."""

    @classmethod
    def setUpClass(cls):
        init_db()

    def test_database_connection(self):
        """Verify database connection succeeds."""
        result = check_db_connection()
        self.assertTrue(result["connected"])
        self.assertEqual(result["status"], "connected")
        self.assertIsNone(result["error"])

    def test_tables_created(self):
        """Verify that domain model tables are registered in database."""
        with engine.connect() as conn:
            cursor = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
            tables = [row[0] for row in cursor.fetchall()]
            self.assertIn("road_segments", tables)
            self.assertIn("community_reports", tables)
            self.assertIn("evidence_items", tables)
            self.assertIn("route_evaluations", tables)
            self.assertIn("journey_feedback", tables)
            self.assertIn("assessment_feedback", tables)
            self.assertIn("reassessment_audit_logs", tables)


if __name__ == "__main__":
    unittest.main()
