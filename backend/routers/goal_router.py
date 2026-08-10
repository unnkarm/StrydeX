import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/goals", tags=["goals"])


def _require_profile(user: models.User) -> models.AthleteProfile:
    if not user.athlete_profile:
        raise HTTPException(status_code=400, detail="Create an athlete profile first")
    return user.athlete_profile


@router.get("/me", response_model=List[schemas.GoalOut])
def get_my_goals(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    profile = _require_profile(user)
    return (
        db.query(models.Goal)
        .filter(models.Goal.athlete_id == profile.id)
        .order_by(models.Goal.created_at.desc())
        .all()
    )


@router.post("/", response_model=schemas.GoalOut)
def create_goal(
    payload: schemas.GoalIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    profile = _require_profile(user)

    # Simple progress calculation:
    progress = 0.0
    if payload.current_value == payload.target_value:
        progress = 100.0
    else:
        # Standard progress percentage: if target is less than current (sprint times)
        if payload.target_value < payload.current_value:
            # We want to go down. progress = (initial - current) / (initial - target)
            # Since we don't have initial, let's say it starts at 0% and updates as current changes.
            # We can also compute progress dynamically based on their performance logs.
            pass
        else:
            # We want to go up. progress = (current / target) * 100
            pass

    goal = models.Goal(
        athlete_id=profile.id,
        title=payload.title,
        current_value=payload.current_value,
        target_value=payload.target_value,
        unit=payload.unit,
        progress_pct=progress,
        last_month_change=0.0,
        status="active",
        created_at=datetime.datetime.utcnow(),
    )

    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.post("/{goal_id}/complete", response_model=schemas.GoalOut)
def complete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    profile = _require_profile(user)
    goal = (
        db.query(models.Goal)
        .filter(models.Goal.id == goal_id, models.Goal.athlete_id == profile.id)
        .first()
    )
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    goal.status = "completed"
    goal.progress_pct = 100.0
    goal.completed_at = datetime.datetime.utcnow()

    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/{goal_id}")
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    profile = _require_profile(user)
    goal = (
        db.query(models.Goal)
        .filter(models.Goal.id == goal_id, models.Goal.athlete_id == profile.id)
        .first()
    )
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    db.delete(goal)
    db.commit()
    return {"message": "Goal deleted successfully"}
