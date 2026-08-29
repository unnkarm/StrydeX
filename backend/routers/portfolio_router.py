from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(prefix="/portfolio", tags=["portfolio"])


@router.get("/{username}", response_model=schemas.PortfolioOut)
def get_portfolio(username: str, db: Session = Depends(get_db)):
    profile = (
        db.query(models.AthleteProfile)
        .filter(models.AthleteProfile.username == username)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Athlete not found")

    public_videos = [v for v in profile.videos if v.visibility == "public"]

    return schemas.PortfolioOut(
        profile=profile,
        performance_logs=profile.performance_logs,
        videos=public_videos,
    )
