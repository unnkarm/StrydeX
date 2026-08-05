from typing import List

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import analytics
import models
import schemas
from auth import get_current_user
from database import get_db


router = APIRouter(
    prefix="/performance",
    tags=["performance"],
)


def _require_profile(user: models.User) -> models.AthleteProfile:
    if not user.athlete_profile:
        raise HTTPException(
            status_code=400,
            detail="Create an athlete profile first",
        )

    return user.athlete_profile


@router.post("/", response_model=schemas.PerformanceLogOut)
def add_log(
    payload: schemas.PerformanceLogIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    profile = _require_profile(user)

    input_data = payload.model_dump()
    if analytics.is_crossfit_sport(input_data["sport_type"]):
        try:
            predicted_performance = analytics.predict_crossfit_score(
                profile, input_data
            )
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"CrossFit performance prediction failed: {exc}",
            ) from exc
    else:
        predicted_performance = _predict_generic_performance(input_data)

    log = models.PerformanceLog(
        athlete_id=profile.id,
        **input_data,
        performance_metric=predicted_performance,
    )

    db.add(log)

    try:
        db.commit()
        db.refresh(log)

    except Exception:
        db.rollback()
        raise

    return log


def _predict_generic_performance(input_data: dict) -> float:
    """Keep the existing model for sports not represented by the new data."""

    model_sport, model_event = analytics.performance_model_categories(
        input_data["sport_type"],
        input_data["event"],
    )
    numeric_values = {
        name: analytics.performance_numeric_value(name, input_data.get(name))
        for name in analytics.PERFORMANCE_NUMERIC_DEFAULTS
    }

    # The feature names and order must match feature_engineering.py.
    model_input = pd.DataFrame(
        [
            {
                "sport_type": model_sport,
                "event": model_event,
                "training_hours_per_week": numeric_values["training_hours_per_week"],
                "average_heart_rate": numeric_values["average_heart_rate"],
                "bmi": numeric_values["bmi"],
                "sleep_hours_per_night": numeric_values["sleep_hours_per_night"],
                "daily_caloric_intake": numeric_values["daily_caloric_intake"],
                "hydration_level": numeric_values["hydration_level"],
                "injury_history": input_data[
                    "injury_history"
                ],
                "previous_competition_performance": numeric_values["previous_competition_performance"],
                "training_intensity": input_data[
                    "training_intensity"
                ],
                "resting_heart_rate": numeric_values["resting_heart_rate"],
                "body_fat_percentage": numeric_values["body_fat_percentage"],
                "vo2_max": numeric_values["vo2_max"],
                "event_distance": numeric_values["event_distance"],
                "altitude_training": input_data[
                    "altitude_training"
                ],
                "mental_focus_level": numeric_values["mental_focus_level"],
            }
        ]
    )

    try:
        processed_input = (
            analytics.performance_preprocessor.transform(
                model_input
            )
        )

        predicted_performance = float(
            analytics.performance_model.predict(
                processed_input
            )[0]
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Performance prediction failed: {exc}",
        ) from exc

    predicted_performance = round(
        max(0.0, min(100.0, predicted_performance)),
        2,
    )

    return predicted_performance


@router.get(
    "/me",
    response_model=List[schemas.PerformanceLogOut],
)
def list_my_logs(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    profile = _require_profile(user)

    return (
        db.query(models.PerformanceLog)
        .filter(
            models.PerformanceLog.athlete_id == profile.id
        )
        .order_by(models.PerformanceLog.date.desc())
        .all()
    )
