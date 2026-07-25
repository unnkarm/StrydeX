import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from auth import get_current_user
from cv_analysis import analyze_video
from ai_feedback import generate_feedback

router = APIRouter(prefix="/videos", tags=["videos"])

STORAGE_DIR = os.path.join(os.path.dirname(__file__), "..", "storage", "videos")
os.makedirs(STORAGE_DIR, exist_ok=True)


@router.post("/upload", response_model=schemas.VideoOut)
def upload_video(
    title: str = Form(...),
    tags: Optional[str] = Form(None),
    visibility: str = Form("public"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if not user.athlete_profile:
        raise HTTPException(status_code=400, detail="Create an athlete profile first")

    ext = os.path.splitext(file.filename)[1] or ".mp4"
    stored_name = f"{uuid.uuid4().hex}{ext}"
    stored_path = os.path.join(STORAGE_DIR, stored_name)

    with open(stored_path, "wb") as f:
        f.write(file.file.read())

    metrics = analyze_video(stored_path)

    video = models.Video(
        athlete_id=user.athlete_profile.id,
        title=title,
        tags=tags,
        filepath=stored_path,
        visibility=visibility,
        **metrics,
    )
    db.add(video)
    db.commit()
    db.refresh(video)

    feedback = generate_feedback(metrics, title)
    report = models.AIReport(video_id=video.id, **feedback)
    db.add(report)
    db.commit()
    db.refresh(video)

    return video


@router.get("/me", response_model=List[schemas.VideoOut])
def list_my_videos(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if not user.athlete_profile:
        raise HTTPException(status_code=400, detail="Create an athlete profile first")
    return (
        db.query(models.Video)
        .filter(models.Video.athlete_id == user.athlete_profile.id)
        .order_by(models.Video.uploaded_at.desc())
        .all()
    )
