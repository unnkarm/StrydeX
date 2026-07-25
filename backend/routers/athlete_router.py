from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from auth import get_current_user, require_role

router = APIRouter(prefix="/athletes", tags=["athletes"])


@router.post("/me", response_model=schemas.AthleteProfileOut)
def upsert_my_profile(
    payload: schemas.AthleteProfileIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if user.role != "athlete":
        raise HTTPException(status_code=403, detail="Only athlete accounts can create an athlete profile")

    existing_username = (
        db.query(models.AthleteProfile)
        .filter(models.AthleteProfile.username == payload.username)
        .first()
    )
    if existing_username and existing_username.user_id != user.id:
        raise HTTPException(status_code=400, detail="Username already taken")

    profile = user.athlete_profile
    if profile is None:
        profile = models.AthleteProfile(user_id=user.id, **payload.model_dump())
        db.add(profile)
    else:
        for key, value in payload.model_dump().items():
            setattr(profile, key, value)

    db.commit()
    db.refresh(profile)
    return profile


@router.get("/me", response_model=schemas.AthleteProfileOut)
def get_my_profile(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if not user.athlete_profile:
        raise HTTPException(status_code=404, detail="No athlete profile yet")
    return user.athlete_profile


@router.post("/{athlete_id}/verify", response_model=schemas.AthleteProfileOut)
def verify_athlete(
    athlete_id: int,
    req: schemas.VerifyRequest,
    db: Session = Depends(get_db),
    coach: models.User = Depends(require_role("coach")),
):
    profile = db.query(models.AthleteProfile).filter(models.AthleteProfile.id == athlete_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Athlete not found")

    profile.verified = True
    profile.verified_by = req.coach_name
    db.commit()
    db.refresh(profile)
    return profile
