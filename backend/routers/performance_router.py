from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user
from database import get_db
from ml.src.athletics_performance import get_model

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

    scoring_fields = {
        "competition_category",
        "event",
        "result_value",
    }
    supplied_scoring_fields = scoring_fields.intersection(input_data)
    if supplied_scoring_fields:
        missing = sorted(scoring_fields.difference(input_data))
        if missing:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Athletics result scoring requires: "
                    + ", ".join(sorted(scoring_fields))
                    + f". Missing: {', '.join(missing)}"
                ),
            )
        sport = str(input_data.get("sport_type", "Athletics")).strip().lower()
        if sport != "athletics":
            raise HTTPException(
                status_code=400,
                detail="The rebuilt performance model scores track-and-field athletics only.",
            )
        try:
            evaluation = get_model().score(
                competition_category=input_data["competition_category"],
                event=input_data["event"],
                result_value=input_data["result_value"],
                result_unit=input_data.get("result_unit"),
                environment=input_data.get("environment", "outdoor"),
                wind_speed_mps=input_data.get("wind_speed_mps"),
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        input_data.update(
            {
                "sport_type": "Athletics",
                "event": evaluation["event"],
                "competition_category": evaluation["competition_category"],
                "environment": evaluation["environment"],
                "result_value": evaluation["result_value"],
                "result_unit": evaluation["result_unit"],
                "scoring_event_code": evaluation["event_code"],
                "world_athletics_points": evaluation["world_athletics_points"],
                "performance_metric": evaluation["performance_score"],
                "scoring_version": evaluation["scoring_version"],
                "wind_speed_mps": evaluation["wind_speed_mps"],
                "wind_legal": evaluation["wind_legal"],
            }
        )

    log = models.PerformanceLog(athlete_id=profile.id, **input_data)
    db.add(log)

    try:
        db.commit()
        db.refresh(log)
    except Exception:
        db.rollback()
        raise

    return log



@router.get("/me", response_model=List[schemas.PerformanceLogOut])
def list_my_logs(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    profile = _require_profile(user)
    return (
        db.query(models.PerformanceLog)
        .filter(models.PerformanceLog.athlete_id == profile.id)
        .order_by(models.PerformanceLog.date.desc())
        .all()
    )
