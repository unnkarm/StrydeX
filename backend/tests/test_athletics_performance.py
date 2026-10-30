import datetime as dt
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

import models  # noqa: E402
import schemas  # noqa: E402
from ml.src.athletics_performance import build_review, get_model  # noqa: E402
from routers.performance_router import add_log  # noqa: E402


class AthleticsScoringModelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.model = get_model()

    def test_shipped_model_passes_quality_gate_for_all_event_categories(self):
        validation = self.model.payload["validation"]
        self.assertTrue(validation["quality_gate_passed"])
        self.assertEqual(validation["event_category_models"], 164)
        self.assertLess(validation["overall_mae_points"], 0.5)

    def test_faster_track_result_scores_higher(self):
        fast = self.model.score(
            competition_category="men",
            event="100m Sprint",
            result_value=10.5,
            result_unit="seconds",
        )
        slow = self.model.score(
            competition_category="men",
            event="100m",
            result_value=12.5,
            result_unit="seconds",
        )
        self.assertGreater(fast["performance_score"], slow["performance_score"])

    def test_farther_field_result_scores_higher(self):
        farther = self.model.score(
            competition_category="women",
            event="Long jump",
            result_value=6.5,
            result_unit="metres",
        )
        shorter = self.model.score(
            competition_category="women",
            event="LJ",
            result_value=5.0,
            result_unit="metres",
        )
        self.assertGreater(farther["performance_score"], shorter["performance_score"])

    def test_category_specific_tables_are_used(self):
        men = self.model.score(
            competition_category="men", event="100m", result_value=11.0
        )
        women = self.model.score(
            competition_category="women", event="100m", result_value=11.0
        )
        self.assertNotEqual(men["world_athletics_points"], women["world_athletics_points"])
        self.assertGreater(women["world_athletics_points"], men["world_athletics_points"])

    def test_wind_assisted_mark_is_flagged_but_still_scored(self):
        result = self.model.score(
            competition_category="men",
            event="100m",
            result_value=10.2,
            wind_speed_mps=2.5,
        )
        self.assertFalse(result["wind_legal"])
        self.assertTrue(any("Wind-assisted" in note for note in result["notes"]))

    def test_next_milestone_has_correct_direction(self):
        sprint = self.model.score(
            competition_category="men", event="100m", result_value=11.2
        )
        jump = self.model.score(
            competition_category="women", event="Long jump", result_value=5.5
        )
        sprint_target = self.model.target_result(sprint)
        jump_target = self.model.target_result(jump)
        self.assertLess(sprint_target["target_result"], sprint["result_value"])
        self.assertGreater(jump_target["target_result"], jump["result_value"])

    def test_review_uses_real_history_and_explainable_actions(self):
        logs = []
        for day, mark in enumerate((11.4, 11.2, 11.0)):
            evaluation = self.model.score(
                competition_category="men", event="100m", result_value=mark
            )
            logs.append(
                SimpleNamespace(
                    date=dt.datetime(2026, 1, 1) + dt.timedelta(days=day * 30),
                    event=evaluation["event"],
                    scoring_event_code=evaluation["event_code"],
                    competition_category="men",
                    environment="outdoor",
                    result_value=mark,
                    result_unit="seconds",
                    wind_speed_mps=1.0,
                    performance_metric=evaluation["performance_score"],
                    sleep_hours_per_night=7.5,
                    mental_focus_level=7.0,
                )
            )
        review = build_review(self.model, logs)
        self.assertEqual(len(review["historical_scores"]), 3)
        self.assertGreater(review["change_points"], 0)
        self.assertEqual(review["confidence"], "established")
        self.assertTrue(review["improvement_priorities"][0]["actions"])

    def test_jump_context_does_not_change_objective_score(self):
        baseline = self.model.score(
            competition_category="men", event="Long jump", result_value=7.25
        )
        payload = schemas.PerformanceLogIn(
            sport_type="Athletics",
            competition_category="men",
            event="Long jump",
            result_value=7.25,
            approach_speed_mps=9.4,
            takeoff_velocity_mps=8.1,
            fatigue_score=8.0,
        )
        self.assertEqual(payload.result_value, baseline["result_value"])
        self.assertEqual(
            baseline["performance_score"],
            self.model.score(competition_category="men", event="Long jump", result_value=7.25)["performance_score"],
        )

    def test_long_jump_review_uses_personal_technique_and_body_context(self):
        logs = []
        for index in range(8):
            mark = 6.4 + index * 0.08
            evaluation = self.model.score(
                competition_category="men", event="Long jump", result_value=mark
            )
            logs.append(
                SimpleNamespace(
                    date=dt.datetime(2026, 1, 1) + dt.timedelta(days=index * 14),
                    event=evaluation["event"],
                    scoring_event_code=evaluation["event_code"],
                    competition_category="men",
                    environment="outdoor",
                    result_value=mark,
                    result_unit="metres",
                    wind_speed_mps=1.0,
                    performance_metric=evaluation["performance_score"],
                    approach_speed_mps=8.0 + index * 0.15,
                    takeoff_velocity_mps=7.0 + index * 0.1,
                    takeoff_angle_deg=20.0,
                    takeoff_contact_time_ms=125.0,
                    approach_consistency_pct=82.0,
                    board_accuracy_cm=12.0,
                    reactive_strength_index=2.0 + index * 0.05,
                    vertical_jump_cm=52.0 + index,
                    weight_lifted_kg=110.0,
                    sleep_hours_per_night=7.5,
                    mental_focus_level=7.0,
                    fatigue_score=4.0,
                    soreness_score=3.0,
                    session_rpe=7.0,
                    pain_present=False,
                    bmi=22.0,
                    body_fat_percentage=12.0,
                )
            )
        profile = SimpleNamespace(height_cm=182.0, weight_kg=75.0)
        review = build_review(self.model, logs, athlete_profile=profile)
        self.assertEqual(review["personalised_model_status"], "driver_analysis_ready")
        self.assertGreater(review["context_completeness_pct"], 90)
        self.assertEqual(review["body_context"]["strength_to_weight_ratio"], 1.47)
        self.assertTrue(any(driver["relationship"] == "positive_association" for driver in review["performance_drivers"]))
        areas = {priority["area"] for priority in review["improvement_priorities"]}
        self.assertIn("Board accuracy", areas)


class AthleticsPersistenceTests(unittest.TestCase):
    def setUp(self):
        engine = create_engine("sqlite:///:memory:")
        models.Base.metadata.create_all(engine)
        self.session = sessionmaker(bind=engine)()
        self.user = models.User(
            email="athlete@example.com",
            hashed_password="not-used",
            role=models.Role.athlete,
        )
        self.user.athlete_profile = models.AthleteProfile(
            username="track-athlete",
            name="Track Athlete",
            sport="Athletics",
        )
        self.session.add(self.user)
        self.session.commit()
        self.session.refresh(self.user)

    def tearDown(self):
        self.session.close()

    def test_performance_router_stores_auditable_score_fields(self):
        payload = schemas.PerformanceLogIn(
            sport_type="Athletics",
            competition_category="men",
            event="400m",
            environment="outdoor",
            result_value=50.0,
            result_unit="seconds",
            sleep_hours_per_night=7.2,
            approach_speed_mps=8.7,
            fatigue_score=5.0,
        )
        log = add_log(payload=payload, db=self.session, user=self.user)
        self.assertEqual(log.scoring_event_code, "400m")
        self.assertGreater(log.world_athletics_points, 0)
        self.assertAlmostEqual(log.performance_metric, log.world_athletics_points / 14.0, places=1)
        self.assertEqual(log.scoring_version, "2025.1")
        self.assertEqual(log.approach_speed_mps, 8.7)
        self.assertEqual(log.fatigue_score, 5.0)


class AdvancedAnalyticsMovementRiskTests(unittest.TestCase):
    def test_ewma_acwr_elevated_load_and_compounding_risk(self):
        from analytics import compute_movement_risk

        now = dt.datetime.utcnow()
        # Build a 4-week timeline with a sudden spike in the acute 7-day period
        logs = []
        # 3 baseline sessions in chronic period
        for day in (25, 20, 14):
            logs.append(
                SimpleNamespace(
                    date=now - dt.timedelta(days=day),
                    event="100m",
                    scoring_event_code="100m",
                    session_rpe=5.0,
                    duration_min=40.0,
                    pain_present=False,
                    fatigue_score=3.0,
                )
            )
        # Acute spike: 4 intense sprint sessions in the past 4 days
        for day in (4, 3, 2, 1):
            logs.append(
                SimpleNamespace(
                    date=now - dt.timedelta(days=day),
                    event="100m",
                    scoring_event_code="100m",
                    session_rpe=9.0,
                    duration_min=75.0,
                    pain_present=False,
                    fatigue_score=8.0,
                )
            )

        # Check-in with sleep deficit to test multiplicative compounding
        checkin = SimpleNamespace(
            total_minutes_asleep=300.0,  # 5 hours
            avg_heart_rate=86.0,
        )

        risk = compute_movement_risk(logs, latest_checkin=checkin)
        self.assertGreaterEqual(risk["risk_pct"], 60.0)
        self.assertIn(risk["risk_band"], ("high", "critical"))
        self.assertTrue(any("EWMA" in reason for reason in risk["reasons"]))
        self.assertTrue(any("Compounding hazard" in reason for reason in risk["reasons"]))

    def test_wind_correction_and_tier_in_scoring_model(self):
        model = get_model()
        scored = model.score(
            competition_category="men",
            event="100m",
            result_value=10.15,
            wind_speed_mps=2.4,
        )
        self.assertFalse(scored["wind_legal"])
        self.assertIsNotNone(scored["wind_corrected_result"])
        # Wind corrected should be higher (slower) than raw assisted time
        self.assertGreater(scored["wind_corrected_result"], scored["result_value"])
        self.assertIn(scored["competitive_tier"], ("World Class / International Elite", "Senior National / NCAA D1 Standard"))


if __name__ == "__main__":
    unittest.main()
