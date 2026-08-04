from typing import List

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import analytics
import models
import schemas
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/performance", tags=["performance"])


def _require_profile(user: models.User) -> models.AthleteProfile:
    if not user.athlete_profile:
        raise HTTPException(status_code=400, detail="Create an athlete profile first")
    return user.athlete_profile


@router.post("/", response_model=schemas.PerformanceLogOut)
def add_log(
    payload: schemas.PerformanceLogIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    profile = _require_profile(user)
    input_data = payload.model_dump(exclude_none=True)

    if "sport_type" in input_data and "event" in input_data:
        model_sport, model_event = analytics.performance_model_categories(
            input_data.get("sport_type"),
            input_data.get("event"),
        )
        numeric_values = {
            name: analytics.performance_numeric_value(name, input_data.get(name))
            for name in analytics.PERFORMANCE_NUMERIC_DEFAULTS
        }

        model_input = pd.DataFrame([
            {
                "sport_type": model_sport,
                "event": model_event,
                "training_hours_per_week": numeric_values["training_hours_per_week"],
                "average_heart_rate": numeric_values["average_heart_rate"],
                "bmi": numeric_values["bmi"],
                "sleep_hours_per_night": numeric_values["sleep_hours_per_night"],
                "daily_caloric_intake": numeric_values["daily_caloric_intake"],
                "hydration_level": numeric_values["hydration_level"],
                "injury_history": input_data.get("injury_history", "Unknown"),
                "previous_competition_performance": numeric_values["previous_competition_performance"],
                "training_intensity": input_data.get("training_intensity", "Medium"),
                "resting_heart_rate": numeric_values["resting_heart_rate"],
                "body_fat_percentage": numeric_values["body_fat_percentage"],
                "vo2_max": numeric_values["vo2_max"],
                "event_distance": numeric_values["event_distance"],
                "altitude_training": input_data.get("altitude_training", "No"),
                "mental_focus_level": numeric_values["mental_focus_level"],
            }
        ])

        try:
            processed_input = analytics.performance_preprocessor.transform(model_input)
            predicted_performance = float(analytics.performance_model.predict(processed_input)[0])
            predicted_performance = round(max(0.0, min(100.0, predicted_performance)), 2)
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Performance prediction failed: {exc}") from exc
        input_data["performance_metric"] = predicted_performance

    log = models.PerformanceLog(athlete_id=profile.id, **input_data)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/me", response_model=List[schemas.PerformanceLogOut])
def list_my_logs(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    profile = _require_profile(user)
    return (
        db.query(models.PerformanceLog)
        .filter(models.PerformanceLog.athlete_id == profile.id)
        .order_by(models.PerformanceLog.date.desc())
        .all()
    )
