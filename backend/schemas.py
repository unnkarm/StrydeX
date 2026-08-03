import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr


# ==========================================================
# Authentication
# ==========================================================

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    role: str = "athlete"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class MessageResponse(BaseModel):
    message: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    id: int
    email: str
    role: str
    has_profile: bool


# ==========================================================
# Athlete profile
# ==========================================================

class AthleteProfileIn(BaseModel):
    username: str
    name: str

    age: Optional[int] = None
    sport: Optional[str] = None
    position: Optional[str] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    academy: Optional[str] = None
    region: Optional[str] = None
    bio: Optional[str] = None


class AthleteProfileOut(AthleteProfileIn):
    id: int
    verified: bool
    verified_by: Optional[str] = None

    class Config:
        from_attributes = True


# ==========================================================
# Performance log
# ==========================================================

class PerformanceLogCreate(BaseModel):
    sport_type: str
    event: str

    training_hours_per_week: Optional[float] = None
    average_heart_rate: Optional[float] = None
    bmi: Optional[float] = None
    sleep_hours_per_night: Optional[float] = None
    daily_caloric_intake: Optional[float] = None
    hydration_level: Optional[float] = None

    injury_history: str
    previous_competition_performance: Optional[float] = None

    # Categorical field
    training_intensity: str

    resting_heart_rate: Optional[float] = None
    body_fat_percentage: Optional[float] = None
    vo2_max: Optional[float] = None
    event_distance: Optional[float] = None

    altitude_training: str

    # Numeric score
    mental_focus_level: Optional[float] = None


class PerformanceLogOut(PerformanceLogCreate):
    id: int
    athlete_id: int
    date: datetime.datetime

    performance_metric: Optional[float] = None

    class Config:
        from_attributes = True


# Backward compatibility with your router
PerformanceLogIn = PerformanceLogCreate


# ==========================================================
# Daily readiness check-in
# ==========================================================

class DailyCheckinIn(BaseModel):
    total_steps: int
    calories: float

    very_active_minutes: int
    fairly_active_minutes: int
    lightly_active_minutes: int
    sedentary_minutes: int

    total_minutes_asleep: float
    total_time_in_bed: float
    avg_heart_rate: float


class DailyCheckinOut(DailyCheckinIn):
    id: int
    athlete_id: int
    date: datetime.datetime

    readiness_score: Optional[float] = None
    recommendation: Optional[str] = None

    class Config:
        from_attributes = True


# ==========================================================
# Analytics: trends
# ==========================================================

class TrendPoint(BaseModel):
    date: datetime.datetime
    value: float


class MetricTrend(BaseModel):
    metric: str
    label: str
    unit: str

    points: List[TrendPoint]

    change_pct: Optional[float] = None
    best_month: Optional[str] = None


class TrendsOut(BaseModel):
    sprint_time: MetricTrend
    vertical_jump: MetricTrend
    weekly_sessions: List[TrendPoint]

    consistency_pct: Optional[float] = None
    insights: List[str]


# ==========================================================
# Analytics: personal records
# ==========================================================

class PersonalRecordEntry(BaseModel):
    metric: str
    label: str
    unit: str
    value: float
    date: datetime.datetime
    is_current_best: bool


# ==========================================================
# Analytics: prediction
# ==========================================================

class PredictionOut(BaseModel):
    metric: str
    label: str
    unit: str

    current: Optional[float] = None
    predicted_30d: Optional[float] = None
    predicted_90d: Optional[float] = None
    confidence_pct: Optional[float] = None
    note: Optional[str] = None


# ==========================================================
# Analytics: injury risk
# ==========================================================

class InjuryRiskOut(BaseModel):
    risk_pct: float
    risk_band: str
    reasons: List[str]


# ==========================================================
# Analytics: readiness
# ==========================================================

class ReadinessOut(BaseModel):
    readiness_pct: Optional[float] = None
    recommendation: Optional[str] = None
    checked_in_today: bool


# ==========================================================
# Analytics: summary
# ==========================================================

class IntelligenceSummaryOut(BaseModel):
    sprint_pb: Optional[float] = None
    sprint_trend_pct: Optional[float] = None
    new_pb_days_ago: Optional[int] = None

    predicted_next_month: Optional[float] = None

    injury_risk_pct: Optional[float] = None
    injury_risk_band: Optional[str] = None

    readiness_pct: Optional[float] = None
    readiness_recommendation: Optional[str] = None


# ==========================================================
# Video and AI report
# ==========================================================

class AIReportOut(BaseModel):
    summary: str

    strengths: Optional[str] = None
    weaknesses: Optional[str] = None
    drills: Optional[str] = None

    class Config:
        from_attributes = True


class VideoOut(BaseModel):
    id: int
    title: str

    tags: Optional[str] = None
    uploaded_at: datetime.datetime
    visibility: str
    coach_comment: Optional[str] = None

    duration_sec: Optional[float] = None
    fps: Optional[float] = None
    frame_count: Optional[int] = None

    motion_score: Optional[float] = None
    est_max_speed_score: Optional[float] = None

    avg_knee_angle_deg: Optional[float] = None
    avg_trunk_lean_deg: Optional[float] = None
    estimated_cadence_spm: Optional[float] = None
    pose_summary: Optional[str] = None

    ai_report: Optional[AIReportOut] = None

    class Config:
        from_attributes = True


# ==========================================================
# Public portfolio
# ==========================================================

class PortfolioOut(BaseModel):
    profile: AthleteProfileOut
    performance_logs: List[PerformanceLogOut]
    videos: List[VideoOut]


# ==========================================================
# Scout search
# ==========================================================

class ScoutResult(BaseModel):
    username: str
    name: str

    sport: Optional[str] = None
    position: Optional[str] = None
    age: Optional[int] = None
    region: Optional[str] = None

    verified: bool

    class Config:
        from_attributes = True


# ==========================================================
# Coach verification
# ==========================================================

class VerifyRequest(BaseModel):
    coach_name: str
