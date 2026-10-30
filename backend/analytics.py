import datetime
import logging
import statistics
from pathlib import Path
from typing import Optional

import joblib
import pandas as pd
from ml.src.athletics_performance import build_review, get_model as get_athletics_model

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

injury_model = None
readiness_model = None

injury_preprocessor = None

athletics_performance_model = get_athletics_model()


def _load_optional_joblib(path: Path):
    try:
        return joblib.load(path)
    except Exception as exc:
        logger.warning("Optional ML artifact unavailable at %s: %s", path, exc)
        return None


injury_model = _load_optional_joblib(MODELS_DIR / "injury_model.joblib")
readiness_model = _load_optional_joblib(MODELS_DIR / "readiness_model.joblib")
injury_preprocessor = _load_optional_joblib(ENCODERS_DIR / "injury_preprocessor.joblib")


def validate_models() -> None:
    """Validate the deployed athletics model.

    Injury/readiness artifacts remain optional MVP features; their existing
    functions already provide explicit fallbacks when an artifact is absent.
    """

    if not athletics_performance_model.payload["validation"]["quality_gate_passed"]:
        raise RuntimeError("Athletics performance model failed its quality gate")


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


def forecast_performance(logs: list) -> dict:
    """Forecast the stored session score from the athlete's dated history.

    The athletics model scores an objective result; it does not invent future
    training inputs. Future estimates therefore come only from the athlete's
    own scored-result trend and are withheld until there is enough history.
    """

    scored_logs = [
        log
        for log in logs
        if getattr(log, "performance_metric", None) is not None
        and getattr(log, "date", None) is not None
    ]
    if scored_logs:
        latest = max(scored_logs, key=lambda log: log.date)
        latest_event = getattr(latest, "scoring_event_code", None) or getattr(latest, "event", None)
        latest_category = getattr(latest, "competition_category", None)
        same_event_logs = [
            log
            for log in scored_logs
            if (getattr(log, "scoring_event_code", None) or getattr(log, "event", None)) == latest_event
            and getattr(log, "competition_category", None) == latest_category
        ]
    else:
        same_event_logs = []

    series = _series(same_event_logs, "performance_metric")
    current = series[-1][1] if series else None
    unavailable = {
        "current": current,
        "predicted_30d": None,
        "predicted_90d": None,
        "confidence_pct": None,
    }

    if not series:
        return {
            **unavailable,
            "note": "No scored athletics results are available yet.",
        }

    distinct_days = {date.date() for date, _ in series}
    span_days = (series[-1][0] - series[0][0]).total_seconds() / 86400
    if len(series) < 4 or len(distinct_days) < 3 or span_days < 7:
        return {
            **unavailable,
            "note": (
                "A same-event forecast needs at least 4 scored results across 3 days "
                "and a history spanning 7 days."
            ),
        }

    start = series[0][0]
    x_values = [
        (date - start).total_seconds() / 86400
        for date, _ in series
    ]
    y_values = [value for _, value in series]
    x_mean = statistics.mean(x_values)
    y_mean = statistics.mean(y_values)
    denominator = sum((x - x_mean) ** 2 for x in x_values)

    if denominator == 0:
        return {
            **unavailable,
            "note": "Sessions need to be logged on different dates to forecast a trend.",
        }

    slope = sum(
        (x - x_mean) * (y - y_mean)
        for x, y in zip(x_values, y_values)
    ) / denominator
    intercept = y_mean - slope * x_mean
    fitted = [intercept + slope * x for x in x_values]
    residual_sum = sum(
        (actual - estimate) ** 2
        for actual, estimate in zip(y_values, fitted)
    )
    total_sum = sum((value - y_mean) ** 2 for value in y_values)
    r_squared = max(0.0, 1.0 - (residual_sum / total_sum)) if total_sum else 0.0
    latest_day = x_values[-1]

    def projected(days: int) -> float:
        raw_change = slope * days
        # Apply biological saturation curve: human adaptation slows over extended horizons
        decay = 1.0 / (1.0 + 0.02 * days)
        tapered_change = raw_change * decay
        return round(max(0.0, min(100.0, current + tapered_change)), 2)

    return {
        "current": round(current, 2),
        "predicted_30d": projected(30),
        "predicted_90d": projected(90),
        "confidence_pct": round(r_squared * 100, 1),
        "note": (
            f"Longitudinal trend projection from {len(series)} dated result scores. "
            f"Historical trend fit (R²) is {round(r_squared * 100)}%."
        ),
    }


def predict_metric(
    logs: list,
    metric: str = "performance_metric",
) -> dict:
    """Return a longitudinal forecast for the supported score metric."""

    if metric != "performance_metric":
        raise ValueError(f"Unsupported prediction metric: {metric}")

    return {
        "metric": "performance_metric",
        "label": "Performance score",
        "unit": "score",
        **forecast_performance(logs),
    }


# ==========================================================
# Movement and training risk model inference (ACWR + Biomechanics)
# ==========================================================

def predict_movement_risk(
    latest_log,
    latest_checkin=None,
) -> dict:
    return compute_movement_risk([latest_log] if latest_log else [], latest_checkin)


def compute_movement_risk(
    logs: list,
    latest_checkin=None,
    latest_video=None,
) -> dict:
    """
    Evidence-based training load and movement risk analysis (EWMA ACWR + Biomechanics).
    Uses Exponentially Weighted Moving Averages (Murray/Williams standard) to eliminate
    coupling artifacts, with sprint-specific mechanical load weighting and interactive
    biological compounding.
    """
    latest = _latest_log(logs) if logs else None
    if latest is None and not logs:
        return {
            "risk_pct": 10.0,
            "risk_band": "low",
            "reasons": ["Baseline estimate: Log training sessions to monitor workload accumulation."],
        }

    # 1. Session Load with Sprint/Mechanical Weighting
    def session_load(log):
        rpe = _safe_float(getattr(log, "session_rpe", None), default=0.0)
        dur = _safe_float(getattr(log, "duration_min", None), default=45.0)
        base_load = (rpe * dur) if rpe > 0 else 0.0

        if base_load == 0.0:
            intensity_map = {"low": 3.0, "medium": 5.0, "moderate": 5.0, "high": 8.0}
            raw_int = getattr(log, "training_intensity", "medium")
            int_score = intensity_map.get(str(raw_int).lower(), 5.0) if isinstance(raw_int, str) else _safe_float(raw_int, 5.0)
            base_load = int_score * 10.0

        # Mechanical eccentric load weighting for high-velocity track and field events
        event = str(getattr(log, "scoring_event_code", None) or getattr(log, "event", "")).lower()
        if any(sprint_kw in event for sprint_kw in ("100m", "200m", "60m", "hurdle", "lj", "tj", "jump", "sprint")):
            mechanical_multiplier = 1.45  # High-velocity eccentric strain weight
        elif any(mid_kw in event for mid_kw in ("400m", "800m", "1500m")):
            mechanical_multiplier = 1.25  # Anaerobic speed-endurance strain
        else:
            mechanical_multiplier = 1.0

        return base_load * mechanical_multiplier

    valid_logs = sorted([log for log in logs if getattr(log, "date", None) is not None], key=lambda l: l.date)
    reasons = []
    base_risk = 15.0

    # 2. EWMA (Exponentially Weighted Moving Average) ACWR
    if len(valid_logs) >= 3:
        day_loads: dict[datetime.date, float] = {}
        for l in valid_logs:
            d = l.date.date()
            day_loads[d] = day_loads.get(d, 0.0) + session_load(l)

        earliest_date = min(day_loads.keys())
        today = datetime.datetime.utcnow().date()
        total_days = max(1, (today - earliest_date).days + 1)

        # Decay constants: acute N=7 (lambda=0.25), chronic N=28 (lambda=2/29=0.069)
        lambda_a = 2.0 / (7.0 + 1.0)
        lambda_c = 2.0 / (28.0 + 1.0)

        ewma_acute = 0.0
        ewma_chronic = 0.0

        for day_offset in range(min(total_days, 60)):
            curr_date = earliest_date + datetime.timedelta(days=day_offset)
            daily_l = day_loads.get(curr_date, 0.0)
            ewma_acute = daily_l * lambda_a + ewma_acute * (1.0 - lambda_a)
            ewma_chronic = daily_l * lambda_c + ewma_chronic * (1.0 - lambda_c)

        if ewma_chronic > 0.5:
            acwr = ewma_acute / ewma_chronic
            if acwr > 1.5:
                base_risk = 65.0 + min(25.0, (acwr - 1.5) * 40.0)
                reasons.append(f"Workload spike: EWMA acute workload is {acwr:.2f}x your chronic fitness base (ACWR > 1.5 hazard zone).")
            elif acwr > 1.3:
                base_risk = 35.0 + (acwr - 1.3) * 100.0
                reasons.append(f"Elevated workload: EWMA acute:chronic ratio is {acwr:.2f} (moderate strain zone).")
            elif acwr < 0.7:
                base_risk = 25.0
                reasons.append(f"Low chronic preparation: Recent volume decayed (EWMA ACWR {acwr:.2f}); progress gradual resumption.")
            else:
                base_risk = 15.0
                reasons.append(f"Optimal workload: EWMA acute:chronic ratio is {acwr:.2f} (within the 0.8–1.3 sweet spot).")
        else:
            reasons.append("Workload monitoring active: baseline load establishing over initial sessions.")
    else:
        reasons.append("Workload monitoring active: baseline load establishing over initial sessions.")

    # 3. Autonomic recovery biomarkers (Checkin)
    sleep_mins = getattr(latest_checkin, "total_minutes_asleep", 480) or 480 if latest_checkin else 480
    hr = getattr(latest_checkin, "avg_heart_rate", 70) or 70 if latest_checkin else 70

    recovery_penalty = 0.0
    if sleep_mins < 360:
        recovery_penalty += 15.0
        reasons.append(f"Sleep deficit: {sleep_mins/60:.1f}h recorded (<6h impairs collagen synthesis & neuromuscular control).")
    if hr > 82:
        recovery_penalty += 10.0
        reasons.append(f"Elevated resting/average heart rate ({int(hr)} bpm) indicates autonomic nervous strain.")

    # 4. Subjective symptoms (Fatigue, Soreness, Pain)
    symptom_penalty = 0.0
    fatigue = _safe_float(getattr(latest, "fatigue_score", None), default=0.0) if latest else 0.0
    soreness = _safe_float(getattr(latest, "soreness_score", None), default=0.0) if latest else 0.0
    pain = getattr(latest, "pain_present", False) if latest else False

    if fatigue >= 7.0:
        symptom_penalty += 10.0
        reasons.append(f"High subjective fatigue ({fatigue:.1f}/10) logged.")
    if soreness >= 7.0:
        symptom_penalty += 10.0
        reasons.append(f"Elevated muscle soreness ({soreness:.1f}/10) reported.")

    # 5. Multiplicative biological compounding
    compounding_factor = 1.0
    if base_risk >= 35.0 and (recovery_penalty > 0 or symptom_penalty > 0):
        compounding_factor = 1.25
        reasons.append("Compounding hazard: Elevated workload combined with compromised physiological recovery increases soft-tissue vulnerability.")

    total_risk = (base_risk + recovery_penalty + symptom_penalty) * compounding_factor

    # Active pain clamp: non-negotiable medical red flag
    if pain:
        total_risk = max(total_risk, 65.0) + 15.0
        reasons.insert(0, "Active pain flagged: prioritize medical/physio assessment and avoid maximal eccentric efforts.")

    # 6. Biomechanical symmetry from video
    if latest_video:
        sym = getattr(latest_video, "score_symmetry", None)
        if sym is not None and sym < 65.0:
            total_risk += 10.0
            reasons.append(f"Biomechanical asymmetry ({sym:.0f}/100) identified on video analysis.")

    final_risk = round(max(5.0, min(95.0, total_risk)), 1)
    if final_risk >= 70:
        band = "critical"
    elif final_risk >= 50:
        band = "high"
    elif final_risk >= 25:
        band = "moderate"
    else:
        band = "low"

    return {
        "risk_pct": final_risk,
        "risk_band": band,
        "reasons": reasons,
    }


# ==========================================================
# Readiness model inference
# ==========================================================

def predict_readiness(
    checkin_data: dict,
) -> tuple[float, str]:

    if readiness_model is None:
        # Heuristic fallback for readiness scoring
        sleep_hours = (checkin_data.get("total_minutes_asleep") or 480.0) / 60.0
        hr = checkin_data.get("avg_heart_rate") or 70.0

        score = 80.0
        if sleep_hours < 7.0:
            score -= (7.0 - sleep_hours) * 10.0
        else:
            score += (sleep_hours - 7.0) * 3.0

        if hr > 80:
            score -= (hr - 80) * 0.5

        readiness = round(max(0.0, min(100.0, score)), 2)
        recommendation = "Your body is primed for optimal performance today."
        if readiness < 40:
            recommendation = "Low readiness. Prioritize sleep, hydration, mobility, and recovery."
        elif readiness < 60:
            recommendation = "Moderate readiness. Reduce training intensity."
        elif readiness < 80:
            recommendation = "Good readiness. Normal training is recommended."
        else:
            recommendation = "Excellent recovery. Ready for high-intensity training."

        return readiness, recommendation


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
                    "metric": "performance_metric",
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
