"""Build the StrydeX athletics scoring model from the 2025 scoring tables.

The source SQLite file is expected to contain a ``points`` table with the
columns ``gender``, ``event``, ``mark`` and ``points``.  For every
competition-category/event pair this script fits a quadratic regression that
maps an objective result (seconds, metres, or combined-event points) to the
1-1400 World Athletics-equivalent points scale.

The generated JSON is small enough to ship with the API and contains no
athlete records.  It is a scoring model, not a future-performance model.

Example:
    python backend/ml/src/build_athletics_scoring_model.py \
        backend/ml/datasets/external/iaaf-2025.sqlite
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sqlite3
from pathlib import Path

import numpy as np


BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT = BASE_DIR / "models" / "athletics_performance_model_2025.json"

SOURCE_TITLE = "World Athletics Scoring Tables of Athletics, 2025 revised edition"
SOURCE_URL = (
    "https://worldathletics.org/download/download?"
    "filename=4f77dcb3-2945-4c58-ad8b-955a999b13e8.pdf"
)
DERIVED_DATA_URL = "https://github.com/jchen1/iaaf-scoring-tables"

# Two PDF-extraction artefacts in the derived table violate the otherwise
# monotonic relationship between mark and points.  They are excluded before
# fitting and recorded in the model metadata.
KNOWN_SOURCE_OUTLIERS = {
    ("men", "110mH"): {(10.50, 401)},
    ("men", "50mH"): {(18.56, 401)},
}

FIELD_EVENTS = {"HJ", "PV", "LJ", "TJ", "SP", "DT", "HT", "JT"}
COMBINED_EVENTS = {"Dec.", "Hept.", "Hept. sh", "Pent. sh"}


def _event_family(event: str) -> str:
    base = event.removesuffix(" sh")
    if base in {"LJ", "TJ"}:
        return "horizontal_jumps"
    if base in {"HJ", "PV"}:
        return "vertical_jumps"
    if base in {"SP", "DT", "HT", "JT"}:
        return "throws"
    if event in COMBINED_EVENTS or base in {"Dec.", "Hept.", "Pent."}:
        return "combined_events"
    if base.startswith("4x"):
        return "relays"
    if "W" in base and ("mW" in base or "kmW" in base):
        return "race_walks"
    if base.endswith("H"):
        return "hurdles"
    if "SC" in base:
        return "steeplechase"
    if base.startswith("Road"):
        return "road_running"

    digits = "".join(character for character in base if character.isdigit())
    distance = int(digits) if digits else 0
    if base in {"Mile", "2 Miles"}:
        distance = 1609 if base == "Mile" else 3219
    if distance and distance <= 500:
        return "sprints"
    if distance and distance <= 3000:
        return "middle_distance"
    return "distance_running"


def _unit(event: str) -> str:
    base = event.removesuffix(" sh")
    if base in FIELD_EVENTS:
        return "metres"
    if event in COMBINED_EVENTS or base in {"Dec.", "Hept.", "Pent."}:
        return "points"
    return "seconds"


def _higher_is_better(event: str) -> bool:
    return _unit(event) != "seconds"


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _load_rows(connection: sqlite3.Connection, gender: str, event: str) -> list[tuple[float, int]]:
    rows = [
        (float(mark), int(points))
        for mark, points in connection.execute(
            "SELECT mark, points FROM points WHERE gender = ? AND event = ?",
            (gender, event),
        )
    ]
    excluded = KNOWN_SOURCE_OUTLIERS.get((gender, event), set())
    return [row for row in rows if row not in excluded]


def build(source: Path, output: Path = DEFAULT_OUTPUT) -> dict:
    if not source.exists():
        raise FileNotFoundError(source)

    connection = sqlite3.connect(source)
    try:
        table = connection.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='points'"
        ).fetchone()
        if table is None:
            raise ValueError("Source database has no points table")

        pairs = connection.execute(
            "SELECT DISTINCT gender, event FROM points ORDER BY gender, event"
        ).fetchall()
        event_models: dict[str, dict[str, dict]] = {"men": {}, "women": {}}
        all_errors: list[float] = []

        for gender, event in pairs:
            rows = _load_rows(connection, gender, event)
            if len(rows) < 20:
                raise ValueError(f"Too few rows for {gender}/{event}: {len(rows)}")

            marks = np.asarray([mark for mark, _ in rows], dtype=float)
            points = np.asarray([value for _, value in rows], dtype=float)
            coefficients = np.polyfit(marks, points, deg=2)
            predictions = np.polyval(coefficients, marks)
            errors = np.abs(predictions - points)
            residual = float(np.sum((predictions - points) ** 2))
            total = float(np.sum((points - points.mean()) ** 2))
            r_squared = 1.0 - residual / total if total else 1.0

            event_models[gender][event] = {
                "coefficients": [float(value) for value in coefficients],
                "mark_min": float(marks.min()),
                "mark_max": float(marks.max()),
                "points_min": int(points.min()),
                "points_max": int(points.max()),
                "unit": _unit(event),
                "higher_is_better": _higher_is_better(event),
                "family": _event_family(event),
                "fit": {
                    "samples": int(len(rows)),
                    "mae_points": float(errors.mean()),
                    "max_error_points": float(errors.max()),
                    "r2": float(r_squared),
                },
            }
            all_errors.extend(errors.tolist())
    finally:
        connection.close()

    failed = [
        f"{gender}/{event}"
        for gender, events in event_models.items()
        for event, model in events.items()
        if model["fit"]["mae_points"] > 0.5 or model["fit"]["r2"] < 0.999
    ]
    if failed:
        raise ValueError("Model quality gate failed for: " + ", ".join(failed))

    payload = {
        "model_name": "StrydeX athletics performance scoring model",
        "model_version": "2025.1",
        "model_type": "event-specific quadratic regression",
        "target": "World Athletics-equivalent result points",
        "points_range": [0, 1400],
        "strydex_score_formula": "round(clamp(points, 0, 1400) / 14, 1)",
        "source": {
            "title": SOURCE_TITLE,
            "official_url": SOURCE_URL,
            "derived_data_url": DERIVED_DATA_URL,
            "source_sha256": _sha256(source),
            "known_rows_excluded": [
                {"competition_category": gender, "event": event, "mark": mark, "points": points}
                for (gender, event), rows in KNOWN_SOURCE_OUTLIERS.items()
                for mark, points in sorted(rows)
            ],
        },
        "validation": {
            "event_category_models": sum(len(events) for events in event_models.values()),
            "overall_mae_points": float(np.mean(all_errors)),
            "maximum_allowed_event_mae_points": 0.5,
            "minimum_allowed_event_r2": 0.999,
            "quality_gate_passed": True,
        },
        "limitations": [
            "Scores objective results; it does not infer performance from body measurements.",
            "It is not an official World Athletics ranking and adds no placing or competition-category bonus.",
            "Senior scoring tables are not age grading tables.",
            "Future-performance forecasts require longitudinal athlete results and are evaluated separately.",
        ],
        "events": event_models,
    }

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    return payload


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path, help="2025 scoring-table SQLite database")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    payload = build(args.source, args.output)
    print(
        json.dumps(
            {
                "output": str(args.output),
                "validation": payload["validation"],
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
