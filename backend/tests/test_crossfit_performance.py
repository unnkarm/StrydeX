import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

import numpy as np
import pandas as pd


BACKEND_DIR = Path(__file__).resolve().parents[1]
ML_SRC_DIR = BACKEND_DIR / "ml" / "src"
sys.path.insert(0, str(BACKEND_DIR))
sys.path.insert(0, str(ML_SRC_DIR))

import analytics  # noqa: E402
from train_crossfit_performance_model import (  # noqa: E402
    BENCHMARKS,
    _clean_source,
    _percentile_scores,
)


class CrossFitTrainingDataTests(unittest.TestCase):
    def test_cleaning_rejects_sentinels_and_converts_units(self):
        row = {
            "age": 30,
            "height": 70,
            "weight": 180,
            "region": "North East",
            "schedule": "I do multiple workouts in a day 3+ times a week|",
            **{name: 100 for name in BENCHMARKS},
        }
        row["deadlift"] = 8_388_607
        features, benchmarks = _clean_source(pd.DataFrame([row]))

        self.assertAlmostEqual(features.iloc[0]["height_cm"], 177.8)
        self.assertAlmostEqual(features.iloc[0]["weight_kg"], 81.6466266)
        self.assertEqual(features.iloc[0]["training_hours_per_week"], 12.0)
        self.assertEqual(features.iloc[0]["training_intensity"], "High")
        self.assertTrue(np.isnan(benchmarks.iloc[0]["deadlift"]))

    def test_percentile_direction_matches_benchmark_semantics(self):
        reference = pd.DataFrame(
            {name: [100.0, 200.0, 300.0] for name in BENCHMARKS}
        )
        values = pd.DataFrame(
            {name: [100.0, 300.0] for name in BENCHMARKS}
        )
        scores = _percentile_scores(reference, values)

        self.assertGreater(scores.loc[0, "fran"], scores.loc[1, "fran"])
        self.assertLess(scores.loc[0, "deadlift"], scores.loc[1, "deadlift"])


class CrossFitInferenceTests(unittest.TestCase):
    def test_crossfit_aliases(self):
        self.assertTrue(analytics.is_crossfit_sport("CrossFit"))
        self.assertTrue(analytics.is_crossfit_sport("cross fit"))
        self.assertFalse(analytics.is_crossfit_sport("Weightlifting"))

    def test_prediction_handles_unseen_region_and_missing_bmi(self):
        profile = SimpleNamespace(
            age=29,
            height_cm=176.0,
            weight_kg=78.0,
            region="Asia",
        )
        score = analytics.predict_crossfit_score(
            profile,
            {
                "bmi": None,
                "training_hours_per_week": 8.0,
                "training_intensity": "High",
            },
        )
        self.assertGreaterEqual(score, 0.0)
        self.assertLessEqual(score, 100.0)


if __name__ == "__main__":
    unittest.main()
