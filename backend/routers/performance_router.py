from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from auth import get_current_user

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
    log = models.PerformanceLog(athlete_id=profile.id, **payload.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
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
