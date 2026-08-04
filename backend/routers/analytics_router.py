import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

import models
import schemas
import analytics
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _require_profile(user: models.User) -> models.AthleteProfile:
    if not user.athlete_profile:
        raise HTTPException(status_code=400, detail="Create an athlete profile first")
    return user.athlete_profile


def _logs_for(db: Session, athlete_id: int) -> list:
    return (
        db.query(models.PerformanceLog)
        .filter(models.PerformanceLog.athlete_id == athlete_id)
        .order_by(models.PerformanceLog.date.asc())
        .all()
    )


# ---------- 1. Long-term trends ----------
@router.get("/trends", response_model=schemas.TrendsOut)
def get_trends(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    profile = _require_profile(user)
    logs = _logs_for(db, profile.id)
    return analytics.compute_trends(logs)


# ---------- 2. Personal records timeline ----------
@router.get("/records", response_model=list[schemas.PersonalRecordEntry])
def get_records(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    profile = _require_profile(user)
    logs = _logs_for(db, profile.id)
    return analytics.compute_personal_records(logs)


# ---------- 3. Performance predictions ----------
@router.get("/prediction", response_model=schemas.PredictionOut)
def get_prediction(
    metric: str = Query("sprint_time_sec", description="sprint_time_sec | vertical_jump_cm | weight_lifted_kg"),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    profile = _require_profile(user)
    logs = _logs_for(db, profile.id)
    return analytics.predict_metric(logs, metric)


# ---------- 4. Injury risk ----------
@router.get("/injury-risk", response_model=schemas.InjuryRiskOut)
def get_injury_risk(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    profile = _require_profile(user)
    logs = _logs_for(db, profile.id)
    latest_checkin = (
        db.query(models.DailyCheckin)
        .filter(models.DailyCheckin.athlete_id == profile.id)
        .order_by(models.DailyCheckin.date.desc())
        .first()
    )
    latest_video = (
        db.query(models.Video)
        .filter(models.Video.athlete_id == profile.id, models.Video.avg_knee_angle_deg.isnot(None))
        .order_by(models.Video.uploaded_at.desc())
        .first()
    )
    return analytics.compute_injury_risk(logs, latest_checkin, latest_video)


# ---------- 5. Readiness / fatigue checkin ----------
@router.post("/checkin", response_model=schemas.DailyCheckinOut)
def submit_checkin(
    payload: schemas.DailyCheckinIn,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    profile = _require_profile(user)
    score, recommendation = analytics.compute_readiness(payload.model_dump())

    checkin = models.DailyCheckin(
        athlete_id=profile.id,
        **payload.model_dump(),
        readiness_score=score,
        recommendation=recommendation,
    )
    db.add(checkin)
    db.commit()
    db.refresh(checkin)
    return checkin


@router.get("/checkins", response_model=list[schemas.DailyCheckinOut])
def list_checkins(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    profile = _require_profile(user)
    return (
        db.query(models.DailyCheckin)
        .filter(models.DailyCheckin.athlete_id == profile.id)
        .order_by(models.DailyCheckin.date.desc())
        .all()
    )


@router.get("/readiness", response_model=schemas.ReadinessOut)
def get_readiness(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    profile = _require_profile(user)
    latest = (
        db.query(models.DailyCheckin)
        .filter(models.DailyCheckin.athlete_id == profile.id)
        .order_by(models.DailyCheckin.date.desc())
        .first()
    )
    checked_in_today = bool(latest and latest.date.date() == datetime.datetime.utcnow().date())
    return schemas.ReadinessOut(
        readiness_pct=latest.readiness_score if latest else None,
        recommendation=latest.recommendation if latest else None,
        checked_in_today=checked_in_today,
    )


# ---------- Combined "athlete intelligence" dashboard ----------
@router.get("/summary", response_model=schemas.IntelligenceSummaryOut)
def get_summary(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    profile = _require_profile(user)
    logs = _logs_for(db, profile.id)

    trends = analytics.compute_trends(logs)
    records = analytics.compute_personal_records(logs)
    prediction = analytics.predict_metric(logs, "sprint_time_sec")

    latest_checkin = (
        db.query(models.DailyCheckin)
        .filter(models.DailyCheckin.athlete_id == profile.id)
        .order_by(models.DailyCheckin.date.desc())
        .first()
    )
    latest_video = (
        db.query(models.Video)
        .filter(models.Video.athlete_id == profile.id, models.Video.avg_knee_angle_deg.isnot(None))
        .order_by(models.Video.uploaded_at.desc())
        .first()
    )
    injury = analytics.compute_injury_risk(logs, latest_checkin, latest_video)

    sprint_pb_entry = next(
        (r for r in reversed(records) if r["metric"] == "sprint_time_sec" and r["is_current_best"]), None
    )
    new_pb_days_ago = None
    if sprint_pb_entry:
        new_pb_days_ago = (datetime.datetime.utcnow() - sprint_pb_entry["date"]).days

    return schemas.IntelligenceSummaryOut(
        sprint_pb=sprint_pb_entry["value"] if sprint_pb_entry else None,
        sprint_trend_pct=trends["sprint_time"]["change_pct"],
        new_pb_days_ago=new_pb_days_ago,
        predicted_next_month=prediction.get("predicted_30d"),
        injury_risk_pct=injury["risk_pct"],
        injury_risk_band=injury["risk_band"],
        readiness_pct=latest_checkin.readiness_score if latest_checkin else None,
        readiness_recommendation=latest_checkin.recommendation if latest_checkin else None,
    )
