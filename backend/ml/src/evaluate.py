"""Evaluate every StrydeX ML artifact against its untouched holdout.

Run from any directory with:
    backend/venv/bin/python backend/ml/src/evaluate.py

Use ``--strict`` in CI to fail when a deployed model misses its quality gate.
The command is read-only: it never trains, deletes, or overwrites artifacts.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
    roc_auc_score,
)

from readiness_scoring import calculate_readiness_score


BASE_DIR = Path(__file__).resolve().parent.parent
ARTIFACTS_DIR = BASE_DIR / "artifacts"
MODELS_DIR = ARTIFACTS_DIR / "models"


def _regression_metrics(model, dataset: dict) -> dict:
    y_train = np.asarray(dataset["y_train"], dtype=float)
    y_test = np.asarray(dataset["y_test"], dtype=float)
    predictions = model.predict(dataset["X_test"])
    baseline = np.full(y_test.shape, y_train.mean())
    errors = np.abs(y_test - predictions)
    return {
        "samples": int(y_test.size),
        "mae": float(mean_absolute_error(y_test, predictions)),
        "rmse": float(mean_squared_error(y_test, predictions) ** 0.5),
        "r2": float(r2_score(y_test, predictions)),
        "baseline_mae": float(mean_absolute_error(y_test, baseline)),
        "within_5_points": float(np.mean(errors <= 5)),
        "beats_baseline": bool(mean_absolute_error(y_test, predictions) < mean_absolute_error(y_test, baseline)),
    }


def _crossfit_metrics(model, dataset: dict) -> dict:
    y_test = np.asarray(dataset["y_test"], dtype=float)
    predictions = np.clip(model.predict(dataset["X_test"]), 0.0, 100.0)
    baseline = np.full(y_test.shape, float(dataset["y_train_mean"]))
    mae = mean_absolute_error(y_test, predictions)
    baseline_mae = mean_absolute_error(y_test, baseline)
    return {
        "samples": int(y_test.size),
        "mae": float(mae),
        "rmse": float(mean_squared_error(y_test, predictions) ** 0.5),
        "r2": float(r2_score(y_test, predictions)),
        "baseline_mae": float(baseline_mae),
        "within_10_points": float(np.mean(np.abs(y_test - predictions) <= 10)),
        "beats_baseline": bool(mae < baseline_mae),
    }


def _injury_metrics(model, dataset: dict, threshold: float = 0.5) -> dict:
    y_test = np.asarray(dataset["y_test"], dtype=int)
    probabilities = model.predict_proba(dataset["X_test"])[:, 1]
    predictions = (probabilities >= threshold).astype(int)
    majority_accuracy = max(float(y_test.mean()), 1.0 - float(y_test.mean()))
    return {
        "samples": int(y_test.size),
        "positive_samples": int(y_test.sum()),
        "threshold": threshold,
        "accuracy": float(accuracy_score(y_test, predictions)),
        "majority_baseline_accuracy": majority_accuracy,
        "balanced_accuracy": float(balanced_accuracy_score(y_test, predictions)),
        "precision": float(precision_score(y_test, predictions, zero_division=0)),
        "recall": float(recall_score(y_test, predictions, zero_division=0)),
        "f1": float(f1_score(y_test, predictions, zero_division=0)),
        "roc_auc": float(roc_auc_score(y_test, probabilities)),
        "confusion_matrix": confusion_matrix(y_test, predictions).tolist(),
    }


def _readiness_formula_metrics(dataset: dict) -> dict:
    frame = dataset["X_test"]
    expected = np.asarray(dataset["y_test"], dtype=float)
    predictions = np.asarray(
        [
            calculate_readiness_score(
                total_minutes_asleep=row.totalminutesasleep,
                very_active_minutes=row.veryactiveminutes,
                average_heart_rate=row.avg_heart_rate,
                sedentary_minutes=row.sedentaryminutes,
            )
            for row in frame.itertuples(index=False)
        ]
    )
    return {
        "samples": int(expected.size),
        "mae": float(mean_absolute_error(expected, predictions)),
        "rmse": float(mean_squared_error(expected, predictions) ** 0.5),
        "r2": float(r2_score(expected, predictions)),
        "note": "Exact engineered formula; not an independently validated ML target.",
    }


def evaluate() -> dict:
    results = {}

    crossfit_dataset = ARTIFACTS_DIR / "crossfit_performance_holdout.joblib"
    crossfit_model = MODELS_DIR / "crossfit_performance_model.joblib"
    if crossfit_dataset.exists() and crossfit_model.exists():
        results["crossfit_performance"] = _crossfit_metrics(
            joblib.load(crossfit_model), joblib.load(crossfit_dataset)
        )

    for suffix in ("", "_v2"):
        dataset_path = ARTIFACTS_DIR / f"injury_dataset{suffix}.joblib"
        model_path = MODELS_DIR / f"injury_model{suffix}.joblib"
        if dataset_path.exists() and model_path.exists():
            threshold = 0.5
            metadata_path = MODELS_DIR / f"injury_model{suffix}_metadata.json"
            if metadata_path.exists():
                threshold = float(json.loads(metadata_path.read_text())["decision_threshold"])
            results[f"injury{suffix or '_deployed'}"] = _injury_metrics(
                joblib.load(model_path), joblib.load(dataset_path), threshold
            )

    for name in ("performance", "readiness"):
        for suffix in ("", "_v2"):
            dataset_path = ARTIFACTS_DIR / f"{name}_dataset{suffix}.joblib"
            model_path = MODELS_DIR / f"{name}_model{suffix}.joblib"
            if dataset_path.exists() and model_path.exists():
                results[f"{name}{suffix or '_deployed'}"] = _regression_metrics(
                    joblib.load(model_path), joblib.load(dataset_path)
                )

    readiness_dataset = ARTIFACTS_DIR / "readiness_dataset_v2.joblib"
    if not readiness_dataset.exists():
        readiness_dataset = ARTIFACTS_DIR / "readiness_dataset.joblib"
    results["readiness_formula"] = _readiness_formula_metrics(joblib.load(readiness_dataset))
    return results


def _quality_gates(results: dict) -> dict[str, bool]:
    injury = results.get("injury_v2", results.get("injury_deployed", {}))
    performance = results.get("performance_v2", results.get("performance_deployed", {}))
    formula = results["readiness_formula"]
    crossfit = results.get("crossfit_performance", {})
    return {
        "injury": bool(
            injury.get("recall", 0) >= 0.70
            and injury.get("balanced_accuracy", 0) >= 0.70
        ),
        "generic_performance": bool(
            performance.get("r2", -1) > 0
            and performance.get("beats_baseline", False)
        ),
        "crossfit_performance": bool(
            crossfit.get("r2", -1) >= 0.35
            and crossfit.get("beats_baseline", False)
        ),
        "readiness_formula": bool(formula.get("mae", 1) < 1e-9),
    }


def _passes_quality_gates(results: dict) -> bool:
    return all(_quality_gates(results).values())


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true", help="emit machine-readable JSON")
    parser.add_argument("--strict", action="store_true", help="exit nonzero when quality gates fail")
    args = parser.parse_args()
    results = evaluate()
    gates = _quality_gates(results)
    passed = all(gates.values())
    payload = {
        "quality_gates_passed": passed,
        "quality_gates": gates,
        "results": results,
    }
    print(json.dumps(payload, indent=2))
    return int(args.strict and not passed)


if __name__ == "__main__":
    raise SystemExit(main())
