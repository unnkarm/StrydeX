"""Transparent readiness scoring shared by training and API inference."""


def _clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, float(value)))


def calculate_readiness_score(
    *,
    total_minutes_asleep: float,
    very_active_minutes: float,
    average_heart_rate: float,
    sedentary_minutes: float,
) -> float:
    """Return the documented 0-100 engineered readiness score.

    This is intentionally a formula, not an ML prediction: the former model's
    target was generated from these same inputs, so direct calculation is both
    more accurate and more explainable.
    """

    sleep_score = _clamp(total_minutes_asleep / 480.0 * 100.0, 0.0, 100.0)
    activity_score = _clamp(very_active_minutes / 30.0 * 100.0, 0.0, 100.0)
    heart_score = _clamp(100.0 - abs(average_heart_rate - 70.0), 0.0, 100.0)
    sedentary_penalty = _clamp(sedentary_minutes / 1000.0 * 20.0, 0.0, 20.0)

    return _clamp(
        0.4 * sleep_score
        + 0.3 * activity_score
        + 0.3 * heart_score
        - sedentary_penalty,
        0.0,
        100.0,
    )
