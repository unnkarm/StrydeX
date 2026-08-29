from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

import models
import schemas
from auth import get_current_user
from database import get_db
from ml.src.athletics_performance import build_review, get_model


router = APIRouter(prefix="/athletics", tags=["athletics performance"])


def _require_profile(user: models.User) -> models.AthleteProfile:
    if not user.athlete_profile:
        raise HTTPException(status_code=400, detail="Create an athlete profile first")
    return user.athlete_profile


@router.get("/events", response_model=list[schemas.AthleticsEventOut])
def supported_events(
    competition_category: str = Query(..., description="men or women"),
    environment: str = Query("outdoor", description="outdoor or indoor"),
):
    try:
        return get_model().list_events(competition_category, environment)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/score", response_model=schemas.AthleticsScoreOut)
def score_result(payload: schemas.AthleticsScoreIn):
    """Score one objective track-and-field result without storing it."""

    try:
        return get_model().score(**payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/review", response_model=schemas.AthleticsReviewOut)
def performance_review(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    profile = _require_profile(user)
    logs = (
        db.query(models.PerformanceLog)
        .filter(models.PerformanceLog.athlete_id == profile.id)
        .order_by(models.PerformanceLog.date.asc())
        .all()
    )
    latest_checkin = (
        db.query(models.DailyCheckin)
        .filter(models.DailyCheckin.athlete_id == profile.id)
        .order_by(models.DailyCheckin.date.desc())
        .first()
    )
    try:
        return build_review(get_model(), logs, latest_checkin, profile)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
