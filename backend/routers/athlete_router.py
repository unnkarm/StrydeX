from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import uuid
from pathlib import Path

import models
import schemas
from database import get_db
from auth import get_current_user, require_role

router = APIRouter(prefix="/athletes", tags=["athletes"])


@router.post("/avatar", response_model=schemas.MessageResponse)
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if user.role != "athlete":
        raise HTTPException(status_code=403, detail="Only athletes can upload a profile picture")

    profile = user.athlete_profile
    if not profile:
        import random
        email_prefix = user.email.split("@")[0]
        username = f"{email_prefix}_{random.randint(1000, 9999)}"
        profile = models.AthleteProfile(
            user_id=user.id,
            username=username,
            name=email_prefix,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    ext = file.filename.split(".")[-1] if "." in file.filename else "png"
    filename = f"avatar_{uuid.uuid4().hex}.{ext}"

    dest_path = Path("C:/Users/HP/Desktop/strydex/frontend/public/avatars")
    dest_path.mkdir(parents=True, exist_ok=True)

    file_path = dest_path / filename
    with open(file_path, "wb") as buffer:
        buffer.write(file.file.read())

    profile.profile_picture = f"/avatars/{filename}"
    db.commit()
    db.refresh(profile)

    return schemas.MessageResponse(message=f"/avatars/{filename}")



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
