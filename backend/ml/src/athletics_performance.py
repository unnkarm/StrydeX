"""Athletics-only performance scoring and explainable improvement guidance.

The deployed model consists of event/category-specific quadratic regressions
trained on the 2025 scoring tables.  An objective mark is converted first to
World Athletics-equivalent points and then to a user-facing 0-100 StrydeX
score.  Body measurements and demographic proxies never change the score.

Recommendations are deliberately explainable.  They combine the selected
event family's common performance priorities, the athlete's own same-event
history, and explicitly logged recovery/context fields.  They do not pretend
that StrydeX has learned causal training advice from a dataset it does not yet
have.
"""

from __future__ import annotations

import datetime as dt
import json
import math
import re
from pathlib import Path
from typing import Any, Iterable


BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_MODEL_PATH = BASE_DIR / "models" / "athletics_performance_model_2025.json"

WIND_SENSITIVE_EVENTS = {"100m", "200m", "100mH", "110mH", "LJ", "TJ"}
INDOOR_SHARED_EVENTS = {"50m", "55m", "60m", "50mH", "55mH", "60mH", "HJ", "PV", "LJ", "TJ", "SP"}
INDOOR_ONLY_EVENTS = {"50m", "55m", "60m", "50mH", "55mH", "60mH"}

DISPLAY_NAMES = {
    "HJ": "High jump",
    "PV": "Pole vault",
    "LJ": "Long jump",
    "TJ": "Triple jump",
    "SP": "Shot put",
    "DT": "Discus throw",
    "HT": "Hammer throw",
    "JT": "Javelin throw",
    "Dec.": "Decathlon",
    "Hept.": "Heptathlon",
    "Hept. sh": "Indoor heptathlon",
    "Pent. sh": "Indoor pentathlon",
    "3000m SC": "3000m steeplechase",
    "2000m SC": "2000m steeplechase",
    "Road Marathon": "Marathon",
    "Road HM": "Half marathon",
}

ALIASES = {
    "100msprint": "100m",
    "200msprint": "200m",
    "400msprint": "400m",
    "5km": "5000m",
    "5ktrack": "5000m",
    "10km": "10000m",
    "10ktrack": "10000m",
    "10kmroadrace": "Road 10 km",
    "road10km": "Road 10 km",
    "halfmarathon": "Road HM",
    "marathon": "Road Marathon",
    "100mhurdles": "100mH",
    "110mhurdles": "110mH",
    "400mhurdles": "400mH",
    "2000msteeplechase": "2000m SC",
    "3000msteeplechase": "3000m SC",
    "longjump": "LJ",
    "highjump": "HJ",
    "polevault": "PV",
    "triplejump": "TJ",
    "shotput": "SP",
    "discusthrow": "DT",
    "discus": "DT",
    "hammerthrow": "HT",
    "hammer": "HT",
    "javelinthrow": "JT",
    "javelin": "JT",
    "decathlon": "Dec.",
    "heptathlon": "Hept.",
    "pentathlon": "Pent. sh",
    "4x100mrelay": "4x100m",
    "4x400mrelay": "4x400m",
    "mixed4x400mrelay": "4x400mix",
}

UNIT_ALIASES = {
    "s": "seconds",
    "sec": "seconds",
    "second": "seconds",
    "seconds": "seconds",
    "m": "metres",
    "meter": "metres",
    "meters": "metres",
    "metre": "metres",
    "metres": "metres",
    "point": "points",
    "points": "points",
    "pts": "points",
}

FAMILY_GUIDANCE = {
    "sprints": {
        "area": "Acceleration and speed maintenance",
        "actions": [
            "Use timed acceleration and flying-sprint sessions so progress is measurable.",
            "Review block, transition, and upright mechanics separately on video.",
            "Keep high-speed repetitions high quality and stop when times deteriorate materially.",
        ],
    },
    "hurdles": {
        "area": "Hurdle rhythm and clearance",
        "actions": [
            "Track approach rhythm and touchdown times, not only the final race time.",
            "Review lead-leg and trail-leg symmetry with a coach or side-on video.",
            "Train sprint speed and hurdle rhythm as separate measurable qualities.",
        ],
    },
    "middle_distance": {
        "area": "Race pace and finishing speed",
        "actions": [
            "Record split consistency for event-pace repetitions.",
            "Build aerobic work progressively and retain a small dose of speed work.",
            "Use race or time-trial splits to identify where pace first drops.",
        ],
    },
    "distance_running": {
        "area": "Aerobic durability and pacing",
        "actions": [
            "Track weekly load and event-pace splits instead of adding distance blindly.",
            "Use controlled threshold work to improve sustainable pace.",
            "Review late-race slowing to separate pacing errors from endurance limitations.",
        ],
    },
    "road_running": {
        "area": "Sustainable pace and race execution",
        "actions": [
            "Compare even-split and negative-split attempts under similar conditions.",
            "Track long-run consistency and event-pace segments over several weeks.",
            "Log course and weather context before comparing road results.",
        ],
    },
    "steeplechase": {
        "area": "Barrier efficiency under fatigue",
        "actions": [
            "Measure lap splits and barrier rhythm together.",
            "Review water-jump and late-race barrier technique on video.",
            "Combine event-pace conditioning with technically clean barrier practice.",
        ],
    },
    "race_walks": {
        "area": "Legal technique and pace durability",
        "actions": [
            "Use qualified coaching feedback to monitor contact and knee-straightening rules.",
            "Track cadence, split stability, and technical warnings together.",
            "Build event pace without allowing technique to break down.",
        ],
    },
    "relays": {
        "area": "Exchange quality and leg execution",
        "actions": [
            "Time exchange-zone entry and exit rather than judging exchanges by appearance.",
            "Test leg order using repeatable splits and exchange compatibility.",
            "Practise exchanges at realistic speed before increasing volume.",
        ],
    },
    "horizontal_jumps": {
        "area": "Approach consistency and take-off",
        "actions": [
            "Record approach check marks and board accuracy for every quality attempt.",
            "Review penultimate-step and take-off positions on side-on video.",
            "Separate approach, take-off, flight, and landing when identifying lost distance.",
        ],
    },
    "vertical_jumps": {
        "area": "Approach, plant, and clearance",
        "actions": [
            "Track approach consistency before changing technical cues.",
            "Use video to review the plant/take-off position and bar clearance separately.",
            "Progress jump-specific power work without sacrificing technical quality.",
        ],
    },
    "throws": {
        "area": "Release efficiency and force transfer",
        "actions": [
            "Measure legal throws and release consistency, not only the single best attempt.",
            "Review footwork, delivery position, and release as separate phases on video.",
            "Coordinate technical work and strength development with an event coach.",
        ],
    },
    "combined_events": {
        "area": "Weak-event identification and two-day consistency",
        "actions": [
            "Log every component-event mark so the largest points opportunity is visible.",
            "Prioritise the weakest high-upside event instead of treating all events equally.",
            "Track how later-event scores change as fatigue accumulates.",
        ],
    },
}


def _value(item: Any, name: str, default: Any = None) -> Any:
    if isinstance(item, dict):
        return item.get(name, default)
    return getattr(item, name, default)


JUMP_CONTEXT_METRICS = {
    "approach_speed_mps": ("Approach speed", "m/s", "higher"),
    "takeoff_velocity_mps": ("Take-off velocity", "m/s", "higher"),
    "takeoff_angle_deg": ("Take-off angle", "degrees", "track"),
    "takeoff_contact_time_ms": ("Take-off contact time", "ms", "track"),
    "approach_consistency_pct": ("Approach consistency", "%", "higher"),
    "board_accuracy_cm": ("Board accuracy error", "cm", "lower"),
    "takeoff_distance_cm": ("Take-off distance", "cm", "track"),
    "reactive_strength_index": ("Reactive strength index", None, "higher"),
    "vertical_jump_cm": ("Vertical jump", "cm", "higher"),
    "weight_lifted_kg": ("Lower-body strength test", "kg", "higher"),
    "sleep_hours_per_night": ("Sleep", "hours", "higher"),
    "mental_focus_level": ("Mental focus", "/10", "higher"),
    "fatigue_score": ("Fatigue", "/10", "lower"),
    "soreness_score": ("Soreness", "/10", "lower"),
    "session_rpe": ("Session RPE", "/10", "track"),
}


def _pearson(pairs: list[tuple[float, float]]) -> float | None:
    if len(pairs) < 5:
        return None
    x_values = [pair[0] for pair in pairs]
    y_values = [pair[1] for pair in pairs]
    x_mean = sum(x_values) / len(x_values)
    y_mean = sum(y_values) / len(y_values)
    numerator = sum((x - x_mean) * (y - y_mean) for x, y in pairs)
    x_spread = sum((x - x_mean) ** 2 for x in x_values)
    y_spread = sum((y - y_mean) ** 2 for y in y_values)
    denominator = math.sqrt(x_spread * y_spread)
    return numerator / denominator if denominator > 0 else None


def _jump_context_analysis(
    logs: list[Any],
    latest: Any,
    event_code: str,
    athlete_profile: Any | None,
) -> dict:
    is_long_jump = event_code.removesuffix(" sh") == "LJ"
    is_high_jump = event_code.removesuffix(" sh") == "HJ"
    if not (is_long_jump or is_high_jump):
        return {
            "context_completeness_pct": 0.0,
            "performance_drivers": [],
            "body_context": {},
            "personalised_model_status": "not_applicable",
            "personalised_model_note": "Jump-specific driver analysis applies to long jump and high jump results.",
        }

    relevant = [
        "approach_speed_mps",
        "takeoff_velocity_mps",
        "takeoff_angle_deg",
        "takeoff_contact_time_ms",
        "approach_consistency_pct",
        "reactive_strength_index",
        "vertical_jump_cm",
        "sleep_hours_per_night",
        "mental_focus_level",
        "fatigue_score",
        "soreness_score",
        "session_rpe",
    ]
    relevant.append("board_accuracy_cm" if is_long_jump else "takeoff_distance_cm")
    present = [name for name in relevant if _value(latest, name) is not None]
    completeness = round(len(present) / len(relevant) * 100.0, 1)

    drivers = []
    ready_driver_count = 0
    for name in present:
        label, unit, desired = JUMP_CONTEXT_METRICS[name]
        pairs = [
            (float(_value(log, name)), float(_value(log, "performance_metric")))
            for log in logs
            if _value(log, name) is not None and _value(log, "performance_metric") is not None
        ]
        correlation = _pearson(pairs)
        if correlation is None:
            relationship = "insufficient_history"
            evidence = f"Logged for the latest result; {len(pairs)} comparable paired result(s) are available."
        elif correlation >= 0.5:
            ready_driver_count += 1
            relationship = "positive_association"
            evidence = f"Across {len(pairs)} same-event results, higher {label.lower()} coincided with higher scores (r={correlation:.2f})."
        elif correlation <= -0.5:
            ready_driver_count += 1
            relationship = "negative_association"
            evidence = f"Across {len(pairs)} same-event results, higher {label.lower()} coincided with lower scores (r={correlation:.2f})."
        else:
            relationship = "inconclusive"
            evidence = f"Across {len(pairs)} same-event results, no clear personal relationship is visible yet (r={correlation:.2f})."
        drivers.append(
            {
                "metric": name,
                "label": label,
                "latest_value": round(float(_value(latest, name)), 2),
                "unit": unit,
                "data_points": len(pairs),
                "relationship": relationship,
                "evidence": evidence,
                "desired_direction": desired,
            }
        )

    height = _value(athlete_profile, "height_cm") if athlete_profile is not None else None
    weight = _value(athlete_profile, "weight_kg") if athlete_profile is not None else None
    strength = _value(latest, "weight_lifted_kg")
    body_context = {
        "height_cm": float(height) if height is not None else None,
        "weight_kg": float(weight) if weight is not None else None,
        "bmi": float(_value(latest, "bmi")) if _value(latest, "bmi") is not None else None,
        "body_fat_percentage": float(_value(latest, "body_fat_percentage")) if _value(latest, "body_fat_percentage") is not None else None,
        "vertical_jump_cm": float(_value(latest, "vertical_jump_cm")) if _value(latest, "vertical_jump_cm") is not None else None,
        "strength_to_weight_ratio": round(float(strength) / float(weight), 2) if strength is not None and weight else None,
    }
    status = "driver_analysis_ready" if len(logs) >= 8 and ready_driver_count >= 2 else "collecting_data"
    note = (
        "Personal driver analysis is observational and uses only this athlete's same-event history; associations are not causal."
        if status == "driver_analysis_ready"
        else "Collect at least eight same-event results with consistent technique and recovery measurements before treating personal drivers as established."
    )
    return {
        "context_completeness_pct": completeness,
        "performance_drivers": drivers,
        "body_context": body_context,
        "personalised_model_status": status,
        "personalised_model_note": note,
    }


def _normalise_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def _normalise_category(value: str) -> str:
    key = _normalise_key(value)
    mapping = {
        "m": "men",
        "male": "men",
        "men": "men",
        "man": "men",
        "w": "women",
        "f": "women",
        "female": "women",
        "women": "women",
        "woman": "women",
    }
    try:
        return mapping[key]
    except KeyError as exc:
        raise ValueError("competition_category must be 'men' or 'women'") from exc


def _normalise_environment(value: str | None) -> str:
    key = _normalise_key(value or "outdoor")
    if key in {"outdoor", "outdoors"}:
        return "outdoor"
    if key in {"indoor", "indoors"}:
        return "indoor"
    raise ValueError("environment must be 'outdoor' or 'indoor'")


class AthleticsPerformanceModel:
    """Load and use all event-specific athletics scoring regressions."""

    def __init__(self, model_path: Path | str = DEFAULT_MODEL_PATH):
        self.model_path = Path(model_path)
        try:
            self.payload = json.loads(self.model_path.read_text())
        except FileNotFoundError as exc:
            raise RuntimeError(f"Athletics scoring model is missing: {self.model_path}") from exc
        if not self.payload.get("validation", {}).get("quality_gate_passed"):
            raise RuntimeError("Athletics scoring model did not pass its build quality gate")

    @property
    def version(self) -> str:
        return str(self.payload["model_version"])

    def _events(self, category: str) -> dict[str, dict]:
        return self.payload["events"][_normalise_category(category)]

    def resolve_event(
        self,
        competition_category: str,
        event: str,
        environment: str | None = "outdoor",
    ) -> tuple[str, str]:
        category = _normalise_category(competition_category)
        venue = _normalise_environment(environment)
        events = self._events(category)
        raw = event.strip()
        key = _normalise_key(raw)

        direct = next((code for code in events if _normalise_key(code) == key), None)
        code = direct or ALIASES.get(key)

        if key in {"hurdles", "hurdle"}:
            code = "60mH" if venue == "indoor" else ("110mH" if category == "men" else "100mH")
        if key in {"combined", "combinedevents"}:
            if venue == "indoor":
                code = "Hept. sh" if category == "men" else "Pent. sh"
            else:
                code = "Dec." if category == "men" else "Hept."
        if key in {"throws", "throw"}:
            raise ValueError("Choose a specific throwing event: shot put, discus, hammer, or javelin")

        if code is None:
            raise ValueError(f"Unsupported athletics event: {event}")

        outdoor_code = code.removesuffix(" sh")
        indoor_code = f"{outdoor_code} sh"
        if venue == "indoor" and indoor_code in events:
            code = indoor_code
        elif venue == "indoor" and code not in INDOOR_SHARED_EVENTS and not code.endswith(" sh"):
            raise ValueError(f"{DISPLAY_NAMES.get(code, code)} is not a supported indoor event")
        elif venue == "outdoor" and code.endswith(" sh"):
            code = outdoor_code

        if code not in events:
            raise ValueError(
                f"{DISPLAY_NAMES.get(code, code)} is not available for the {category} category"
            )
        return category, code

    def list_events(self, competition_category: str, environment: str = "outdoor") -> list[dict]:
        category = _normalise_category(competition_category)
        venue = _normalise_environment(environment)
        rows = []
        for code, model in self._events(category).items():
            is_indoor_variant = code.endswith(" sh")
            if venue == "outdoor" and (is_indoor_variant or code in INDOOR_ONLY_EVENTS):
                continue
            if venue == "indoor" and not is_indoor_variant:
                indoor_variant = f"{code} sh"
                if indoor_variant in self._events(category):
                    continue
                if code not in INDOOR_SHARED_EVENTS:
                    continue
            rows.append(
                {
                    "event": DISPLAY_NAMES.get(code, code.replace(" sh", " (indoor)")),
                    "event_code": code,
                    "family": model["family"],
                    "unit": model["unit"],
                    "environment": "indoor" if is_indoor_variant else venue,
                }
            )
        return sorted(rows, key=lambda row: (row["family"], row["event"]))

    @staticmethod
    def _raw_points(model: dict, result_value: float) -> float:
        a, b, c = model["coefficients"]
        return a * result_value * result_value + b * result_value + c

    @staticmethod
    def _bounded_points(model: dict, result_value: float) -> int:
        low = float(model["mark_min"])
        high = float(model["mark_max"])
        higher_is_better = bool(model["higher_is_better"])

        if higher_is_better:
            if result_value <= low:
                return 0
            if result_value >= high:
                return 1400
        else:
            if result_value <= low:
                return 1400
            if result_value >= high:
                return 0

        return int(round(max(0.0, min(1400.0, AthleticsPerformanceModel._raw_points(model, result_value)))))

    def score(
        self,
        *,
        competition_category: str,
        event: str,
        result_value: float,
        result_unit: str | None = None,
        environment: str = "outdoor",
        wind_speed_mps: float | None = None,
    ) -> dict:
        category, event_code = self.resolve_event(competition_category, event, environment)
        model = self._events(category)[event_code]
        try:
            mark = float(result_value)
        except (TypeError, ValueError) as exc:
            raise ValueError("result_value must be numeric") from exc
        if not math.isfinite(mark) or mark <= 0:
            raise ValueError("result_value must be a positive finite number")

        expected_unit = model["unit"]
        if result_unit is not None:
            normalised_unit = UNIT_ALIASES.get(_normalise_key(result_unit))
            if normalised_unit != expected_unit:
                raise ValueError(f"{DISPLAY_NAMES.get(event_code, event_code)} results must use {expected_unit}")

        points = self._bounded_points(model, mark)
        performance_score = round(points / 14.0, 1)
        base_event = event_code.removesuffix(" sh")
        wind_sensitive = base_event in WIND_SENSITIVE_EVENTS
        wind_legal = None
        wind_corrected = None
        if wind_sensitive and wind_speed_mps is not None:
            w_speed = float(wind_speed_mps)
            wind_legal = w_speed <= 2.0
            if expected_unit == "seconds":
                # Aerodynamic wind adjustment (Mureika / Ward-Smith approximation)
                coeff = 0.09 if "200" in base_event else 0.05
                wind_corrected = round(mark + (coeff * w_speed), 3)

        notes = []
        if wind_legal is False:
            correction_str = f", zero-wind equivalent is ~{wind_corrected:.2f}s" if wind_corrected is not None else ""
            notes.append(f"Wind-assisted mark: useful for training analysis but not a legal comparable mark{correction_str}.")
        elif wind_speed_mps is not None and float(wind_speed_mps) < 0 and wind_corrected is not None:
            notes.append(f"Headwind mark ({wind_speed_mps:+.1f} m/s): zero-wind equivalent is ~{wind_corrected:.2f}s.")

        if mark < model["mark_min"] or mark > model["mark_max"]:
            notes.append("Result is outside the 2025 table range, so the score was capped.")

        return {
            "competition_category": category,
            "event": DISPLAY_NAMES.get(event_code, event_code.replace(" sh", " (indoor)")),
            "event_code": event_code,
            "event_family": model["family"],
            "environment": _normalise_environment(environment),
            "result_value": mark,
            "result_unit": expected_unit,
            "world_athletics_points": points,
            "performance_score": performance_score,
            "score_band": score_band(performance_score),
            "competitive_tier": competitive_tier(points),
            "wind_speed_mps": float(wind_speed_mps) if wind_speed_mps is not None else None,
            "wind_legal": wind_legal,
            "wind_corrected_result": wind_corrected,
            "scoring_version": self.version,
            "notes": notes,
        }

    def target_result(self, evaluation: dict, score_gain: float = 2.5) -> dict | None:
        category = evaluation["competition_category"]
        event_code = evaluation["event_code"]
        model = self._events(category)[event_code]
        current_points = int(evaluation["world_athletics_points"])
        target_points = min(1400, int(math.ceil(current_points + score_gain * 14)))
        if target_points <= current_points:
            return None

        low = float(model["mark_min"])
        high = float(model["mark_max"])
        for _ in range(80):
            middle = (low + high) / 2.0
            points = self._bounded_points(model, middle)
            if model["higher_is_better"]:
                if points < target_points:
                    low = middle
                else:
                    high = middle
            else:
                if points > target_points:
                    low = middle
                else:
                    high = middle

        target_mark = (low + high) / 2.0
        current_mark = float(evaluation["result_value"])
        improvement = (
            target_mark - current_mark
            if model["higher_is_better"]
            else current_mark - target_mark
        )
        return {
            "target_score": round(target_points / 14.0, 1),
            "target_points": target_points,
            "target_result": round(target_mark, 3),
            "result_unit": model["unit"],
            "required_improvement": round(max(0.0, improvement), 3),
            "direction": "increase" if model["higher_is_better"] else "decrease",
        }


def score_band(score: float) -> str:
    if score >= 85:
        return "elite"
    if score >= 70:
        return "advanced"
    if score >= 50:
        return "competitive"
    if score >= 30:
        return "developing"
    return "foundation"


def competitive_tier(points: int) -> str:
    if points >= 1200:
        return "World Class / International Elite"
    if points >= 1000:
        return "Senior National / NCAA D1 Standard"
    if points >= 800:
        return "Collegiate Regional / Senior Club"
    if points >= 600:
        return "State / High School Varsity"
    return "Developmental / Junior"


def _dated_scored_logs(logs: Iterable[Any]) -> list[Any]:
    return sorted(
        [
            log
            for log in logs
            if _value(log, "date") is not None
            and _value(log, "performance_metric") is not None
            and _value(log, "event") is not None
        ],
        key=lambda log: _value(log, "date"),
    )


def build_review(
    model: AthleticsPerformanceModel,
    logs: Iterable[Any],
    latest_checkin: Any | None = None,
    athlete_profile: Any | None = None,
) -> dict:
    scored = _dated_scored_logs(logs)
    if not scored:
        return {
            "overall_score": None,
            "score_band": None,
            "primary_event": None,
            "latest_result": None,
            "change_points": None,
            "confidence": "insufficient_data",
            "historical_scores": [],
            "next_milestone": None,
            "context_completeness_pct": 0.0,
            "performance_drivers": [],
            "body_context": {},
            "personalised_model_status": "insufficient_data",
            "personalised_model_note": "Log an objective result before personalised jump analysis can begin.",
            "improvement_priorities": [
                {
                    "priority": "high",
                    "area": "Establish an objective baseline",
                    "reason": "No scored track-and-field result has been logged.",
                    "actions": [
                        "Log the exact event, competition category, environment, and official result.",
                        "Use seconds for track events, metres for field events, and points for combined events.",
                    ],
                }
            ],
            "model_note": "The score model is ready; personalised guidance starts after the first result.",
        }

    latest_date = _value(scored[-1], "date")
    cutoff = latest_date - dt.timedelta(days=365)
    recent = [log for log in scored if _value(log, "date") >= cutoff]
    grouped: dict[tuple[str, str, str], list[Any]] = {}
    for log in recent:
        key = (
            str(_value(log, "scoring_event_code", _value(log, "event"))),
            str(_value(log, "competition_category", "unknown")),
            str(_value(log, "environment", "outdoor")),
        )
        grouped.setdefault(key, []).append(log)

    def group_rating(group: list[Any]) -> float:
        best = sorted((float(_value(log, "performance_metric")) for log in group), reverse=True)[:3]
        return sum(best) / len(best)

    primary_key, primary_logs = max(grouped.items(), key=lambda item: group_rating(item[1]))
    overall_score = round(group_rating(primary_logs), 1)
    latest = primary_logs[-1]
    latest_score = float(_value(latest, "performance_metric"))
    first_score = float(_value(primary_logs[0], "performance_metric"))
    change_points = round(latest_score - first_score, 1) if len(primary_logs) >= 2 else None

    event_input = _value(latest, "scoring_event_code", _value(latest, "event"))
    category = _value(latest, "competition_category")
    environment = _value(latest, "environment", "outdoor")
    evaluation = None
    if category and _value(latest, "result_value") is not None:
        evaluation = model.score(
            competition_category=category,
            event=event_input,
            result_value=_value(latest, "result_value"),
            result_unit=_value(latest, "result_unit"),
            environment=environment,
            wind_speed_mps=_value(latest, "wind_speed_mps"),
        )

    family = evaluation["event_family"] if evaluation else "sprints"
    guidance = FAMILY_GUIDANCE[family]
    jump_context = _jump_context_analysis(
        primary_logs,
        latest,
        evaluation["event_code"] if evaluation else primary_key[0],
        athlete_profile,
    )
    priorities = [
        {
            "priority": "high",
            "area": guidance["area"],
            "reason": f"This is the main controllable performance area for {family.replace('_', ' ')}.",
            "actions": guidance["actions"],
        }
    ]

    milestone = model.target_result(evaluation) if evaluation else None
    if milestone:
        direction_word = "faster" if milestone["direction"] == "decrease" else "farther/higher"
        priorities.insert(
            0,
            {
                "priority": "high",
                "area": "Next measurable result milestone",
                "reason": (
                    f"About {milestone['required_improvement']} {milestone['result_unit']} {direction_word} "
                    f"would move the score from {evaluation['performance_score']} to approximately "
                    f"{milestone['target_score']}."
                ),
                "actions": [
                    "Use the target as a medium-term benchmark, not as a prediction or deadline.",
                    "Compare attempts only when timing, wind, equipment, and competition conditions are credible.",
                ],
            },
        )

    if len(primary_logs) < 3:
        priorities.append(
            {
                "priority": "medium",
                "area": "Build a reliable same-event baseline",
                "reason": f"Only {len(primary_logs)} scored result(s) are available for the primary event.",
                "actions": [
                    "Log at least three comparable results before treating a trend as meaningful.",
                    "Keep event, environment, wind, and measurement method consistent.",
                ],
            }
        )

    if jump_context["personalised_model_status"] != "not_applicable":
        if jump_context["context_completeness_pct"] < 50:
            priorities.append(
                {
                    "priority": "medium",
                    "area": "Complete the personalised jump context",
                    "reason": (
                        f"Only {jump_context['context_completeness_pct']}% of the recommended technique, "
                        "power, and recovery measurements were logged for the latest result."
                    ),
                    "actions": [
                        "Prioritise approach speed, take-off velocity, approach consistency, vertical jump, fatigue, soreness, and sleep.",
                        "Use the same device and measurement method so sessions remain comparable.",
                    ],
                }
            )

        approach_consistency = _value(latest, "approach_consistency_pct")
        if approach_consistency is not None and float(approach_consistency) < 85:
            priorities.insert(
                1,
                {
                    "priority": "high",
                    "area": "Approach consistency",
                    "reason": f"The latest logged approach consistency was {float(approach_consistency):.1f}%.",
                    "actions": [
                        "Track check-mark variation across quality attempts before changing the approach length.",
                        "Review the final two strides on video and repeat the same measurement protocol next session.",
                    ],
                },
            )

        event_code = evaluation["event_code"].removesuffix(" sh") if evaluation else primary_key[0]
        board_error = _value(latest, "board_accuracy_cm")
        if event_code == "LJ" and board_error is not None and float(board_error) > 10:
            priorities.insert(
                1,
                {
                    "priority": "high",
                    "area": "Board accuracy",
                    "reason": f"The latest take-off was logged {float(board_error):.1f} cm from the board reference.",
                    "actions": [
                        "Use approach check marks and record the board error for every quality attempt.",
                        "Stabilise the approach before trying to gain distance by reaching at take-off.",
                    ],
                },
            )

        fatigue = _value(latest, "fatigue_score")
        soreness = _value(latest, "soreness_score")
        pain = bool(_value(latest, "pain_present", False))
        if pain or (fatigue is not None and float(fatigue) >= 7) or (soreness is not None and float(soreness) >= 6):
            reasons = []
            if pain:
                reasons.append("pain was reported")
            if fatigue is not None and float(fatigue) >= 7:
                reasons.append(f"fatigue was {float(fatigue):.1f}/10")
            if soreness is not None and float(soreness) >= 6:
                reasons.append(f"soreness was {float(soreness):.1f}/10")
            priorities.insert(
                0,
                {
                    "priority": "high",
                    "area": "Recovery and medical review",
                    "reason": "; ".join(reasons).capitalize() + ".",
                    "actions": [
                        "Do not use a performance prediction to override pain or medical guidance.",
                        "Review jump volume and recovery with the coach before the next high-intensity session.",
                    ],
                },
            )

        for driver in jump_context["performance_drivers"]:
            desired = driver.get("desired_direction")
            relationship = driver["relationship"]
            supports_driver = (
                (desired == "higher" and relationship == "positive_association")
                or (desired == "lower" and relationship == "negative_association")
            )
            if supports_driver:
                priorities.append(
                    {
                        "priority": "medium",
                        "area": f"Personal driver: {driver['label']}",
                        "reason": driver["evidence"],
                        "actions": [
                            "Discuss this personal association with the coach before changing training.",
                            "Continue logging the metric under comparable conditions to see whether the relationship persists.",
                        ],
                    }
                )
                break

    sleep_hours = _value(latest, "sleep_hours_per_night")
    if sleep_hours is None and latest_checkin is not None:
        minutes = _value(latest_checkin, "total_minutes_asleep")
        sleep_hours = float(minutes) / 60.0 if minutes is not None else None
    if (sleep_hours is not None and float(sleep_hours) < 7.0) or (change_points is not None and change_points < -1.0):
        reasons = []
        if sleep_hours is not None and float(sleep_hours) < 7.0:
            reasons.append(f"latest logged sleep was {float(sleep_hours):.1f} hours")
        if change_points is not None and change_points < -1.0:
            reasons.append(f"same-event score changed by {change_points} points")
        priorities.append(
            {
                "priority": "high",
                "area": "Recovery and load review",
                "reason": "; ".join(reasons).capitalize() + ".",
                "actions": [
                    "Review recent load and recovery with the coach before simply adding more volume.",
                    "Track sleep and session quality beside results to find repeatable patterns.",
                ],
            }
        )

    mental_focus = _value(latest, "mental_focus_level")
    if mental_focus is not None and float(mental_focus) < 6.0:
        priorities.append(
            {
                "priority": "medium",
                "area": "Competition execution",
                "reason": f"The latest mental-focus rating was {float(mental_focus):.1f}/10.",
                "actions": [
                    "Use one repeatable pre-event routine and record whether it was followed.",
                    "Review controllable execution cues after the event instead of judging only the outcome.",
                ],
            }
        )

    if evaluation and evaluation["wind_legal"] is False:
        priorities.insert(
            0,
            {
                "priority": "high",
                "area": "Record a legal comparison mark",
                "reason": f"The latest wind reading was {evaluation['wind_speed_mps']} m/s.",
                "actions": [
                    "Keep the wind-assisted result for training context.",
                    "Use a legal-wind result for official progress comparison.",
                ],
            },
        )

    confidence = "established" if len(primary_logs) >= 3 else "developing" if len(primary_logs) == 2 else "low"
    historical = [
        {
            "date": _value(log, "date").isoformat(),
            "month": _value(log, "date").strftime("%b %Y"),
            "score": round(float(_value(log, "performance_metric")), 1),
            "event": _value(log, "event"),
        }
        for log in primary_logs
    ]

    return {
        "overall_score": overall_score,
        "score_band": score_band(overall_score),
        "primary_event": evaluation["event"] if evaluation else primary_key[0],
        "latest_result": evaluation,
        "change_points": change_points,
        "confidence": confidence,
        "historical_scores": historical,
        "next_milestone": milestone,
        "context_completeness_pct": jump_context["context_completeness_pct"],
        "performance_drivers": jump_context["performance_drivers"],
        "body_context": jump_context["body_context"],
        "personalised_model_status": jump_context["personalised_model_status"],
        "personalised_model_note": jump_context["personalised_model_note"],
        "improvement_priorities": priorities[:5],
        "model_note": (
            "Overall score is the average of up to the best three primary-event results in the last 365 days. "
            "Recommendations are evidence-linked; they are not causal claims."
        ),
    }


_DEFAULT_MODEL: AthleticsPerformanceModel | None = None


def get_model() -> AthleticsPerformanceModel:
    global _DEFAULT_MODEL
    if _DEFAULT_MODEL is None:
        _DEFAULT_MODEL = AthleticsPerformanceModel()
    return _DEFAULT_MODEL
