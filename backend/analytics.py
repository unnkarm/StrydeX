import datetime
import logging
import statistics
from pathlib import Path
from typing import Optional

import joblib
import pandas as pd

logger = logging.getLogger(__name__)

# ==========================================================
# Paths
# ==========================================================

BASE_DIR = Path(__file__).resolve().parent
ARTIFACTS_DIR = BASE_DIR / "ml" / "artifacts"

MODELS_DIR = ARTIFACTS_DIR / "models"
ENCODERS_DIR = ARTIFACTS_DIR / "encoders"

# ==========================================================
# Load Models and Preprocessors
# ==========================================================

performance_model = None
injury_model = None
readiness_model = None

performance_preprocessor = None
injury_preprocessor = None

try:
    performance_model = joblib.load(
        MODELS_DIR / "performance_model.joblib"
    )

    injury_model = joblib.load(
        MODELS_DIR / "injury_model.joblib"
    )

    readiness_model = joblib.load(
        MODELS_DIR / "readiness_model.joblib"
    )

    performance_preprocessor = joblib.load(
        ENCODERS_DIR / "performance_preprocessor.joblib"
    )

    injury_preprocessor = joblib.load(
        ENCODERS_DIR / "injury_preprocessor.joblib"
    )

    logger.info("All StrydeX ML artifacts loaded successfully.")

except Exception:
    logger.exception("Failed to load one or more ML artifacts.")


def validate_models() -> None:
    """Raise a clear startup error when an artifact is unavailable."""

    missing = []

    if performance_model is None:
        missing.append("performance_model.joblib")

    if injury_model is None:
        missing.append("injury_model.joblib")

    if readiness_model is None:
        missing.append("readiness_model.joblib")

    if performance_preprocessor is None:
        missing.append("performance_preprocessor.joblib")

    if injury_preprocessor is None:
        missing.append("injury_preprocessor.joblib")

    if missing:
        raise RuntimeError(
            "Missing or invalid ML artifacts: "
            + ", ".join(missing)
        )


# ==========================================================
# General helpers
# ==========================================================

def _safe_float(value, default: float = 0.0) -> float:
    try:
        if value is None:
            return default

        return float(value)

    except (TypeError, ValueError):
        return default


def _safe_int(value, default: int = 0) -> int:
    try:
        if value is None:
            return default

        return int(value)

    except (TypeError, ValueError):
        return default


def _safe_string(value, default: str = "Unknown") -> str:
    if value is None:
        return default

    text = str(value).strip()

    return text if text else default


def performance_model_categories(sport, event) -> tuple[str, str]:
    """Map broad UI categories to categories represented in model training."""
    raw_sport = _safe_string(sport)
    known_sports = {"Basketball", "Cycling", "Running", "Soccer", "Swimming", "Tennis"}
    sport_aliases = {
        "Athletics": "Running",
    }
    model_sport = raw_sport if raw_sport in known_sports else sport_aliases.get(raw_sport, "Unknown")

    raw_event = _safe_string(event)
    known_events = {"100m Sprint", "10km Road Race", "50m Freestyle", "Marathon"}
    if raw_event in known_events:
        model_event = raw_event
    else:
        normalized = raw_event.lower().replace(" ", "")
        if "marathon" in normalized:
            model_event = "Marathon"
        elif "10km" in normalized or normalized.startswith("10k"):
            model_event = "10km Road Race"
        elif "freestyle" in normalized:
            model_event = "50m Freestyle"
        elif "sprint" in normalized:
            model_event = "100m Sprint"
        else:
            model_event = "Unknown"

    return model_sport, model_event


def injury_model_position(sport, position) -> str:
    """Map detailed positions only where the injury dataset has a true match."""
    if _safe_string(sport) != "Basketball":
        return "Unknown"

    return {
        "Center": "Center",
        "Small Forward": "Forward",
        "Power Forward": "Forward",
        "Point Guard": "Guard",
        "Shooting Guard": "Guard",
    }.get(_safe_string(position), "Unknown")


PERFORMANCE_NUMERIC_DEFAULTS = {
    "training_hours_per_week": 22.685,
    "average_heart_rate": 125.75,
    "bmi": 25.0,
    "sleep_hours_per_night": 7.0,
    "daily_caloric_intake": 2761.7,
    "hydration_level": 75.4,
    "previous_competition_performance": 50.28,
    "resting_heart_rate": 70.1,
    "body_fat_percentage": 17.3,
    "vo2_max": 55.0,
    "event_distance": 2530.595,
    "mental_focus_level": 5.5,
}


def performance_numeric_value(name: str, value) -> float:
    """Use the training-data median when a performance input is unavailable."""
    return _safe_float(value, default=PERFORMANCE_NUMERIC_DEFAULTS[name])


def _latest_log(logs: list):
    valid_logs = [
        log
        for log in logs
        if getattr(log, "date", None) is not None
    ]

    if not valid_logs:
        return None

    return max(
        valid_logs,
        key=lambda log: log.date,
    )


def _series(logs: list, field: str) -> list:
    values = []

    for log in logs:
        date = getattr(log, "date", None)
        value = getattr(log, field, None)

        if date is None or value is None:
            continue

        values.append(
            (
                date,
                float(value),
            )
        )

    return sorted(
        values,
        key=lambda item: item[0],
    )


def _pct_change(
    series: list,
    lower_is_better: bool = False,
) -> Optional[float]:

    if len(series) < 2:
        return None

    first = series[0][1]
    last = series[-1][1]

    if first == 0:
        return None

    change = ((last - first) / abs(first)) * 100

    if lower_is_better:
        change = -change

    return round(change, 1)


def _best_month(
    series: list,
    lower_is_better: bool = False,
) -> Optional[str]:

    if not series:
        return None

    monthly_values = {}

    for date, value in series:
        month = date.strftime("%B %Y")

        monthly_values.setdefault(
            month,
            [],
        ).append(value)

    monthly_averages = {
        month: statistics.mean(values)
        for month, values in monthly_values.items()
    }

    if lower_is_better:
        return min(
            monthly_averages,
            key=monthly_averages.get,
        )

    return max(
        monthly_averages,
        key=monthly_averages.get,
    )


# ==========================================================
# Performance feature builder
# ==========================================================

def build_performance_dataframe(log) -> pd.DataFrame:
    """
    Build exactly the feature columns used to train the
    performance preprocessor.
    """

    model_sport, model_event = performance_model_categories(
        getattr(log, "sport_type", None),
        getattr(log, "event", None),
    )

    return pd.DataFrame(
        [
            {
                "sport_type": model_sport,
                "event": model_event,
                "training_hours_per_week": performance_numeric_value(
                    "training_hours_per_week",
                    getattr(
                        log,
                        "training_hours_per_week",
                        None,
                    )
                ),
                "average_heart_rate": performance_numeric_value(
                    "average_heart_rate",
                    getattr(
                        log,
                        "average_heart_rate",
                        None,
                    )
                ),
                "bmi": performance_numeric_value(
                    "bmi", getattr(log, "bmi", None)
                ),
                "sleep_hours_per_night": performance_numeric_value(
                    "sleep_hours_per_night",
                    getattr(
                        log,
                        "sleep_hours_per_night",
                        None,
                    )
                ),
                "daily_caloric_intake": performance_numeric_value(
                    "daily_caloric_intake",
                    getattr(
                        log,
                        "daily_caloric_intake",
                        None,
                    )
                ),
                "hydration_level": performance_numeric_value(
                    "hydration_level",
                    getattr(
                        log,
                        "hydration_level",
                        None,
                    )
                ),
                "injury_history": _safe_string(
                    getattr(
                        log,
                        "injury_history",
                        None,
                    ),
                    default="None",
                ),
                "previous_competition_performance": performance_numeric_value(
                    "previous_competition_performance",
                    getattr(
                        log,
                        "previous_competition_performance",
                        None,
                    )
                ),
                "training_intensity": _safe_string(
                    getattr(
                        log,
                        "training_intensity",
                        None,
                    ),
                    default="Medium",
                ),
                "resting_heart_rate": performance_numeric_value(
                    "resting_heart_rate",
                    getattr(
                        log,
                        "resting_heart_rate",
                        None,
                    )
                ),
                "body_fat_percentage": performance_numeric_value(
                    "body_fat_percentage",
                    getattr(
                        log,
                        "body_fat_percentage",
                        None,
                    )
                ),
                "vo2_max": performance_numeric_value(
                    "vo2_max", getattr(log, "vo2_max", None)
                ),
                "event_distance": performance_numeric_value(
                    "event_distance",
                    getattr(
                        log,
                        "event_distance",
                        None,
                    )
                ),
                "altitude_training": _safe_string(
                    getattr(
                        log,
                        "altitude_training",
                        None,
                    ),
                    default="No",
                ),
                "mental_focus_level": performance_numeric_value(
                    "mental_focus_level",
                    getattr(
                        log,
                        "mental_focus_level",
                        None,
                    )
                ),
            }
        ]
    )


# ==========================================================
# Injury feature builder
# ==========================================================

def build_injury_dataframe(
    latest_log,
    latest_checkin=None,
) -> pd.DataFrame:
    """
    Build exactly the columns used by injury_feature_engineering.py.

    Some injury-model fields are not currently collected directly by
    the application. Safe defaults are used until those fields are
    added to the athlete/check-in schemas.
    """

    profile = getattr(
        latest_log,
        "athlete",
        None,
    )

    age = _safe_int(
        getattr(profile, "age", None),
        default=21,
    )

    height_cm = _safe_float(
        getattr(profile, "height_cm", None),
        default=175.0,
    )

    weight_kg = _safe_float(
        getattr(profile, "weight_kg", None),
        default=70.0,
    )

    position = injury_model_position(
        getattr(profile, "sport", None),
        getattr(profile, "position", None),
    )

    # Gender is not currently stored in AthleteProfile.
    gender = _safe_string(
        getattr(profile, "gender", None),
        default="Unknown",
    )

    training_intensity_raw = getattr(
        latest_log,
        "training_intensity",
        None,
    )

    intensity_mapping = {
        "low": 3.0,
        "medium": 6.0,
        "moderate": 6.0,
        "high": 9.0,
    }

    if isinstance(training_intensity_raw, str):
        training_intensity = intensity_mapping.get(
            training_intensity_raw.strip().lower(),
            6.0,
        )
    else:
        training_intensity = _safe_float(
            training_intensity_raw,
            default=6.0,
        )

    sleep_minutes = _safe_float(
        getattr(
            latest_checkin,
            "total_minutes_asleep",
            None,
        ),
        default=420.0,
    )

    fatigue_score = 5.0

    if sleep_minutes < 300:
        fatigue_score = 9.0
    elif sleep_minutes < 360:
        fatigue_score = 7.0
    elif sleep_minutes >= 480:
        fatigue_score = 3.0

    performance_score = _safe_float(
        getattr(
            latest_log,
            "performance_metric",
            None,
        ),
        default=50.0,
    )

    training_hours = _safe_float(
        getattr(
            latest_log,
            "training_hours_per_week",
            None,
        ),
        default=8.0,
    )

    # Temporary derived/default inputs until the application stores
    # every injury-model field directly.
    recovery_days = 2.0
    match_count = 2.0
    rest_between_events = 2.0
    team_contribution_score = performance_score

    load_balance_score = max(
        0.0,
        min(
            100.0,
            100.0
            - abs(training_hours - 10.0) * 4.0
            - max(fatigue_score - 5.0, 0.0) * 5.0,
        ),
    )

    acl_risk_score = max(
        0.0,
        min(
            100.0,
            fatigue_score * 7.0
            + training_intensity * 3.0
            - recovery_days * 5.0,
        ),
    )

    return pd.DataFrame(
        [
            {
                "age": age,
                "gender": gender,
                "height_cm": height_cm,
                "weight_kg": weight_kg,
                "position": position,
                "training_intensity": training_intensity,
                "training_hours_per_week": training_hours,
                "recovery_days_per_week": recovery_days,
                "match_count_per_week": match_count,
                "rest_between_events_days": rest_between_events,
                "fatigue_score": fatigue_score,
                "performance_score": performance_score,
                "team_contribution_score": team_contribution_score,
                "load_balance_score": load_balance_score,
                "acl_risk_score": acl_risk_score,
            }
        ]
    )


# ==========================================================
# Readiness feature builder
# ==========================================================

def build_readiness_dataframe(
    checkin_data: dict,
) -> pd.DataFrame:

    return pd.DataFrame(
        [
            {
                "totalsteps": _safe_float(
                    checkin_data.get("total_steps")
                ),
                "calories": _safe_float(
                    checkin_data.get("calories")
                ),
                "veryactiveminutes": _safe_float(
                    checkin_data.get(
                        "very_active_minutes"
                    )
                ),
                "fairlyactiveminutes": _safe_float(
                    checkin_data.get(
                        "fairly_active_minutes"
                    )
                ),
                "lightlyactiveminutes": _safe_float(
                    checkin_data.get(
                        "lightly_active_minutes"
                    )
                ),
                "sedentaryminutes": _safe_float(
                    checkin_data.get(
                        "sedentary_minutes"
                    )
                ),
                "totalminutesasleep": _safe_float(
                    checkin_data.get(
                        "total_minutes_asleep"
                    )
                ),
                "totaltimeinbed": _safe_float(
                    checkin_data.get(
                        "total_time_in_bed"
                    )
                ),
                "avg_heart_rate": _safe_float(
                    checkin_data.get(
                        "avg_heart_rate"
                    ),
                    default=70.0,
                ),
            }
        ]
    )


# ==========================================================
# Performance model inference
# ==========================================================

def predict_performance(latest_log) -> dict:
    if (
        performance_model is None
        or performance_preprocessor is None
    ):
        raise RuntimeError(
            "Performance model or preprocessor is unavailable."
        )

    if latest_log is None:
        return {
            "current": None,
            "predicted_30d": None,
            "predicted_90d": None,
            "confidence_pct": None,
            "note": "No performance logs available.",
        }

    model_input = build_performance_dataframe(
        latest_log
    )

    processed_input = (
        performance_preprocessor.transform(
            model_input
        )
    )

    prediction = float(
        performance_model.predict(
            processed_input
        )[0]
    )

    prediction = max(
        0.0,
        min(
            100.0,
            prediction,
        ),
    )

    return {
        "current": getattr(
            latest_log,
            "performance_metric",
            None,
        ),
        "predicted_30d": round(
            prediction,
            2,
        ),
        "predicted_90d": round(
            prediction,
            2,
        ),
        "confidence_pct": None,
        "note": (
            "Prediction generated using the trained "
            "performance regression model."
        ),
    }


def predict_metric(
    logs: list,
    metric: str = "performance_metric",
) -> dict:
    """
    Compatibility wrapper used by analytics_router.py.
    """

    latest = _latest_log(logs)
    prediction = predict_performance(latest)

    return {
        "metric": "performance_metric",
        "label": "Performance score",
        "unit": "score",
        **prediction,
    }


# ==========================================================
# Injury model inference
# ==========================================================

def predict_injury_risk(
    latest_log,
    latest_checkin=None,
) -> dict:

    if (
        injury_model is None
        or injury_preprocessor is None
    ):
        raise RuntimeError(
            "Injury model or preprocessor is unavailable."
        )

    if latest_log is None:
        return {
            "risk_pct": 0.0,
            "risk_band": "low",
            "reasons": [
                "No performance information is available."
            ],
        }

    model_input = build_injury_dataframe(
        latest_log,
        latest_checkin,
    )

    processed_input = (
        injury_preprocessor.transform(
            model_input
        )
    )

    probability = float(
        injury_model.predict_proba(
            processed_input
        )[0][1]
    )

    risk = round(
        max(
            0.0,
            min(
                100.0,
                probability * 100.0,
            ),
        ),
        2,
    )

    if risk >= 80:
        band = "critical"
    elif risk >= 60:
        band = "high"
    elif risk >= 30:
        band = "moderate"
    else:
        band = "low"

    reasons = [
        f"Estimated injury probability: {risk}%.",
        (
            "Prediction generated using the trained "
            "injury classification model."
        ),
    ]

    if latest_checkin is None:
        reasons.append(
            "No recent readiness check-in was available."
        )

    return {
        "risk_pct": risk,
        "risk_band": band,
        "reasons": reasons,
    }


def compute_injury_risk(
    logs: list,
    latest_checkin=None,
    latest_video=None,
) -> dict:
    """
    Compatibility function used by analytics_router.py.

    latest_video is accepted to preserve the existing route contract.
    The current trained injury model does not use video features.
    """

    latest = _latest_log(logs)

    return predict_injury_risk(
        latest,
        latest_checkin,
    )


# ==========================================================
# Readiness model inference
# ==========================================================

def predict_readiness(
    checkin_data: dict,
) -> tuple[float, str]:

    if readiness_model is None:
        raise RuntimeError(
            "Readiness model is unavailable."
        )

    model_input = build_readiness_dataframe(
        checkin_data
    )

    readiness = float(
        readiness_model.predict(
            model_input
        )[0]
    )

    readiness = round(
        max(
            0.0,
            min(
                100.0,
                readiness,
            ),
        ),
        2,
    )

    if readiness >= 80:
        recommendation = (
            "Excellent recovery. Ready for "
            "high-intensity training."
        )
    elif readiness >= 60:
        recommendation = (
            "Good readiness. Normal training is recommended."
        )
    elif readiness >= 40:
        recommendation = (
            "Moderate readiness. Reduce training intensity."
        )
    else:
        recommendation = (
            "Low readiness. Prioritize sleep, hydration, "
            "mobility, and recovery."
        )

    return readiness, recommendation


def compute_readiness(
    checkin_data: dict,
) -> tuple[float, str]:
    """
    Compatibility wrapper used by analytics_router.py.
    """

    return predict_readiness(checkin_data)


# ==========================================================
# Long-term trends
# ==========================================================

def compute_trends(logs: list) -> dict:
    performance_series = _series(
        logs,
        "performance_metric",
    )

    performance_trend = {
        "metric": "performance_metric",
        "label": "Performance score",
        "unit": "score",
        "points": [
            {
                "date": date,
                "value": value,
            }
            for date, value in performance_series
        ],
        "change_pct": _pct_change(
            performance_series,
            lower_is_better=False,
        ),
        "best_month": _best_month(
            performance_series,
            lower_is_better=False,
        ),
    }

    weekly = {}

    for log in logs:
        date = getattr(log, "date", None)

        if date is None:
            continue

        week_start = (
            date
            - datetime.timedelta(
                days=date.weekday()
            )
        ).date()

        key = week_start.isoformat()

        weekly[key] = weekly.get(
            key,
            0,
        ) + 1

    weekly_points = [
        {
            "date": datetime.datetime.fromisoformat(
                date
            ),
            "value": float(count),
        }
        for date, count in sorted(
            weekly.items()
        )
    ][-12:]

    consistency = None

    dated_logs = [
        log
        for log in logs
        if getattr(log, "date", None) is not None
    ]

    if dated_logs:
        dates = sorted(
            log.date
            for log in dated_logs
        )

        span_days = max(
            (
                dates[-1]
                - dates[0]
            ).days,
            1,
        )

        span_weeks = max(
            (span_days // 7) + 1,
            1,
        )

        consistency = round(
            min(
                len(weekly) / span_weeks,
                1.0,
            ) * 100,
            1,
        )

    insights = []

    change = performance_trend[
        "change_pct"
    ]

    if change is not None:
        if change >= 0:
            insights.append(
                f"Performance improved by {abs(change)}%."
            )
        else:
            insights.append(
                f"Performance decreased by {abs(change)}%."
            )

    if consistency is not None:
        insights.append(
            f"Training consistency: {consistency}%."
        )

    if performance_trend["best_month"]:
        insights.append(
            "Best performance month: "
            f"{performance_trend['best_month']}."
        )

    if not insights:
        insights.append(
            "Add more performance logs to generate trends."
        )

    # The current schema still expects sprint_time and vertical_jump.
    # Both keys temporarily expose performance-score history.
    return {
        "sprint_time": performance_trend,
        "vertical_jump": {
            **performance_trend,
            "label": "Performance score",
        },
        "weekly_sessions": weekly_points,
        "consistency_pct": consistency,
        "insights": insights,
    }


# ==========================================================
# Personal records
# ==========================================================

def compute_personal_records(
    logs: list,
) -> list[dict]:

    performance_series = _series(
        logs,
        "performance_metric",
    )

    timeline = []
    best = None

    for date, value in performance_series:
        if (
            best is None
            or value > best
        ):
            best = value

            timeline.append(
                {
                    # Compatibility with the existing summary router,
                    # which searches for sprint_time_sec.
                    "metric": "sprint_time_sec",
                    "label": "Performance score",
                    "unit": "score",
                    "value": value,
                    "date": date,
                    "is_current_best": False,
                }
            )

    if timeline:
        timeline[-1][
            "is_current_best"
        ] = True

    return timeline
