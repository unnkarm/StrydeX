"""Train the CrossFit performance model from the supplied athletes archive.

The source contains one row per athlete and several objective benchmark
results.  We turn those results into a 0-100 percentile score, then predict
that score from fields StrydeX already collects.  Names, teams, affiliates,
and athlete identifiers are deliberately never loaded.

Example:
    backend/venv/bin/python backend/ml/src/train_crossfit_performance_model.py \
        /home/michael/Downloads/athletes.csv.zip
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import sklearn
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder


BASE_DIR = Path(__file__).resolve().parent.parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
MODELS_DIR = ARTIFACTS_DIR / "models"

MODEL_PATH = MODELS_DIR / "crossfit_performance_model.joblib"
DATASET_PATH = ARTIFACTS_DIR / "crossfit_performance_holdout.joblib"
METADATA_PATH = MODELS_DIR / "crossfit_performance_model_metadata.json"

FEATURE_COLUMNS = [
    "age",
    "height_cm",
    "weight_kg",
    "bmi",
    "region",
    "training_hours_per_week",
    "training_intensity",
]
NUMERIC_FEATURES = [
    "age",
    "height_cm",
    "weight_kg",
    "bmi",
    "training_hours_per_week",
]
CATEGORICAL_FEATURES = ["region", "training_intensity"]

# Plausibility bounds remove sentinel values (notably 8,388,607) and obvious
# unit/data-entry errors.  Time events are seconds; strength events are pounds.
BENCHMARKS = {
    "fran": (60, 1200, False),
    "helen": (180, 1800, False),
    "grace": (30, 1200, False),
    "filthy50": (600, 3600, False),
    "fgonebad": (10, 700, True),
    "run400": (35, 300, False),
    "run5k": (720, 3600, False),
    "candj": (20, 500, True),
    "snatch": (15, 400, True),
    "deadlift": (30, 800, True),
    "backsq": (30, 700, True),
    "pullups": (1, 150, True),
}
SOURCE_COLUMNS = [
    "age",
    "height",
    "weight",
    "region",
    "schedule",
    *BENCHMARKS,
]


def _clean_source(frame: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Return model features and plausible benchmark values."""

    benchmarks = pd.DataFrame(index=frame.index)
    for name, (lower, upper, _) in BENCHMARKS.items():
        values = pd.to_numeric(frame[name], errors="coerce")
        benchmarks[name] = values.where(values.between(lower, upper))

    age = pd.to_numeric(frame["age"], errors="coerce")
    height_inches = pd.to_numeric(frame["height"], errors="coerce")
    weight_pounds = pd.to_numeric(frame["weight"], errors="coerce")

    age = age.where(age.between(16, 80))
    height_inches = height_inches.where(height_inches.between(48, 84))
    weight_pounds = weight_pounds.where(weight_pounds.between(75, 500))
    height_cm = height_inches * 2.54
    weight_kg = weight_pounds * 0.45359237

    schedule = frame["schedule"].fillna("").astype(str).str.lower()
    multiple_three = schedule.str.contains(r"multiple workouts.*3\+", regex=True)
    multiple_two = schedule.str.contains(r"multiple workouts.*2x", regex=True)
    one_daily = schedule.str.contains("1 workout", regex=False)

    features = pd.DataFrame(
        {
            "age": age,
            "height_cm": height_cm,
            "weight_kg": weight_kg,
            "bmi": weight_kg / (height_cm / 100.0) ** 2,
            "region": frame["region"].replace("", np.nan),
            # Conservative estimates from the survey's schedule categories.
            "training_hours_per_week": np.select(
                [multiple_three, multiple_two, one_daily],
                [12.0, 9.0, 6.0],
                default=7.0,
            ),
            "training_intensity": np.where(
                multiple_three | multiple_two, "High", "Medium"
            ),
        },
        index=frame.index,
    )
    return features, benchmarks


def _percentile_scores(
    reference: pd.DataFrame, values: pd.DataFrame
) -> pd.DataFrame:
    """Score benchmark values against training-only empirical distributions."""

    scores = pd.DataFrame(index=values.index, dtype=float)
    for name, (_, _, higher_is_better) in BENCHMARKS.items():
        ordered = np.sort(reference[name].dropna().to_numpy(dtype=float))
        raw = values[name].to_numpy(dtype=float)
        valid = ~np.isnan(raw)
        percentile = np.full(raw.shape, np.nan, dtype=float)
        percentile[valid] = np.searchsorted(
            ordered, raw[valid], side="right"
        ) / len(ordered) * 100.0
        if not higher_is_better:
            percentile[valid] = 100.0 - percentile[valid]
        scores[name] = percentile
    return scores


def _build_pipeline() -> Pipeline:
    preprocessor = ColumnTransformer(
        [
            ("numeric", SimpleImputer(strategy="median"), NUMERIC_FEATURES),
            (
                "categorical",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        (
                            "one_hot",
                            OneHotEncoder(
                                handle_unknown="ignore",
                                sparse_output=False,
                            ),
                        ),
                    ]
                ),
                CATEGORICAL_FEATURES,
            ),
        ]
    )
    model = HistGradientBoostingRegressor(
        max_iter=250,
        learning_rate=0.08,
        max_leaf_nodes=31,
        min_samples_leaf=30,
        l2_regularization=3.0,
        random_state=42,
    )
    return Pipeline([("preprocessor", preprocessor), ("model", model)])


def train(source: Path) -> dict:
    raw = pd.read_csv(
        source,
        compression="infer",
        usecols=SOURCE_COLUMNS,
        low_memory=False,
    )
    features, benchmarks = _clean_source(raw)
    eligible = benchmarks.notna().sum(axis=1) >= 4
    features = features.loc[eligible]
    benchmarks = benchmarks.loc[eligible]

    train_index, test_index = train_test_split(
        np.arange(len(features)), test_size=0.2, random_state=42
    )
    train_benchmarks = benchmarks.iloc[train_index]
    train_scores = _percentile_scores(train_benchmarks, train_benchmarks).mean(
        axis=1, skipna=True
    )
    test_scores = _percentile_scores(
        train_benchmarks, benchmarks.iloc[test_index]
    ).mean(axis=1, skipna=True)

    X_train = features.iloc[train_index][FEATURE_COLUMNS]
    X_test = features.iloc[test_index][FEATURE_COLUMNS]
    pipeline = _build_pipeline()
    pipeline.fit(X_train, train_scores)
    predictions = np.clip(pipeline.predict(X_test), 0.0, 100.0)
    baseline = np.full(test_scores.shape, float(train_scores.mean()))

    metrics = {
        "samples": int(len(test_scores)),
        "mae": float(mean_absolute_error(test_scores, predictions)),
        "rmse": float(mean_squared_error(test_scores, predictions) ** 0.5),
        "r2": float(r2_score(test_scores, predictions)),
        "baseline_mae": float(mean_absolute_error(test_scores, baseline)),
        "beats_baseline": bool(
            mean_absolute_error(test_scores, predictions)
            < mean_absolute_error(test_scores, baseline)
        ),
    }
    metadata = {
        "model_version": 1,
        "source_rows": int(len(raw)),
        "eligible_rows": int(len(features)),
        "minimum_benchmarks": 4,
        "feature_columns": FEATURE_COLUMNS,
        "target": "mean training-reference percentile across valid benchmarks",
        "direct_identifiers_loaded": False,
        "library_versions": {
            "numpy": np.__version__,
            "pandas": pd.__version__,
            "scikit_learn": sklearn.__version__,
            "joblib": joblib.__version__,
        },
        "holdout_metrics": metrics,
    }

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, MODEL_PATH, compress=3)
    joblib.dump(
        {
            "X_test": X_test,
            "y_test": test_scores,
            "y_train_mean": float(train_scores.mean()),
            "split_strategy": "random athlete holdout; percentile anchors fit on train only",
        },
        DATASET_PATH,
        compress=3,
    )
    METADATA_PATH.write_text(json.dumps(metadata, indent=2) + "\n")
    return metadata


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path, help="athletes.csv or athletes.csv.zip")
    args = parser.parse_args()
    if not args.source.exists():
        parser.error(f"dataset does not exist: {args.source}")
    metadata = train(args.source)
    print(json.dumps(metadata, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
