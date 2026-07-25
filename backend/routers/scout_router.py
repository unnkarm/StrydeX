from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(prefix="/scout", tags=["scout"])


@router.get("/search", response_model=List[schemas.ScoutResult])
def search_athletes(
    sport: Optional[str] = None,
    position: Optional[str] = None,
    region: Optional[str] = None,
    age_min: Optional[int] = None,
    age_max: Optional[int] = None,
    verified_only: bool = False,
    db: Session = Depends(get_db),
):
    q = db.query(models.AthleteProfile)
    if sport:
        q = q.filter(models.AthleteProfile.sport.ilike(f"%{sport}%"))
    if position:
        q = q.filter(models.AthleteProfile.position.ilike(f"%{position}%"))
    if region:
        q = q.filter(models.AthleteProfile.region.ilike(f"%{region}%"))
    if age_min is not None:
        q = q.filter(models.AthleteProfile.age >= age_min)
    if age_max is not None:
        q = q.filter(models.AthleteProfile.age <= age_max)
    if verified_only:
        q = q.filter(models.AthleteProfile.verified == True)  # noqa: E712

    return q.limit(50).all()
