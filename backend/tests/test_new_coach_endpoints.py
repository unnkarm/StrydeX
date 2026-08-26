import unittest
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

import analytics
from fastapi.testclient import TestClient
from main import app

class TestRebrandedMovementRisk(unittest.TestCase):
    def test_predict_movement_risk_fallback(self):
        res = analytics.predict_movement_risk(latest_log=None, latest_checkin=None)
        self.assertEqual(res["risk_pct"], 0.0)
        self.assertEqual(res["risk_band"], "low")
        self.assertIn("No performance information", res["reasons"][0])


class TestCricketCoachChatRouter(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_ask_coach_default_unauthorized(self):
        # Unauthenticated request should return 401 Unauthorized
        res = self.client.post("/coach/ask", json={"query": "Should I bowl today?"})
        self.assertEqual(res.status_code, 401)

if __name__ == "__main__":
    unittest.main()
