import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr


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
    visibility: str = "public"  # public | scouts_only | private


class AthleteProfileOut(AthleteProfileIn):
    id: int
    verified: bool
    verified_by: Optional[str] = None

    class Config:
        from_attributes = True


class PerformanceLogCreate(BaseModel):
    duration_min: Optional[float] = None
    distance_km: Optional[float] = None
    sprint_time_sec: Optional[float] = None
    vertical_jump_cm: Optional[float] = None
    weight_lifted_kg: Optional[float] = None
    notes: Optional[str] = None

    sport_type: Optional[str] = None
    event: Optional[str] = None
    training_hours_per_week: Optional[float] = None
    average_heart_rate: Optional[float] = None
    bmi: Optional[float] = None
    sleep_hours_per_night: Optional[float] = None
    daily_caloric_intake: Optional[float] = None
    hydration_level: Optional[float] = None
    injury_history: Optional[str] = None
    previous_competition_performance: Optional[float] = None
    training_intensity: Optional[str] = None
    resting_heart_rate: Optional[float] = None
    body_fat_percentage: Optional[float] = None
    vo2_max: Optional[float] = None
    event_distance: Optional[float] = None
    altitude_training: Optional[str] = None
    mental_focus_level: Optional[float] = None


PerformanceLogIn = PerformanceLogCreate


class PerformanceLogOut(PerformanceLogCreate):
    id: int
    athlete_id: int
    date: datetime.datetime
    performance_metric: Optional[float] = None

    class Config:
        from_attributes = True


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


class PersonalRecordEntry(BaseModel):
    metric: str
    label: str
    unit: str
    value: float
    date: datetime.datetime
    is_current_best: bool


class PredictionOut(BaseModel):
    metric: str
    label: str
    unit: str
    current: Optional[float] = None
    predicted_30d: Optional[float] = None
    predicted_90d: Optional[float] = None
    confidence_pct: Optional[float] = None
    note: Optional[str] = None


class InjuryRiskOut(BaseModel):
    risk_pct: float
    risk_band: str
    reasons: List[str]


class ReadinessOut(BaseModel):
    readiness_pct: Optional[float] = None
    recommendation: Optional[str] = None
    checked_in_today: bool


class IntelligenceSummaryOut(BaseModel):
    sprint_pb: Optional[float] = None
    sprint_trend_pct: Optional[float] = None
    new_pb_days_ago: Optional[int] = None
    predicted_next_month: Optional[float] = None
    injury_risk_pct: Optional[float] = None
    injury_risk_band: Optional[str] = None
    readiness_pct: Optional[float] = None
    readiness_recommendation: Optional[str] = None


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
    sport: Optional[str] = None
    movement: Optional[str] = None
    camera_angle: Optional[str] = None
    duration_sec: Optional[float] = None
    fps: Optional[float] = None
    frame_count: Optional[int] = None
    motion_score: Optional[float] = None
    est_max_speed_score: Optional[float] = None
    avg_knee_angle_deg: Optional[float] = None
    avg_trunk_lean_deg: Optional[float] = None
    estimated_cadence_spm: Optional[float] = None
    pose_summary: Optional[str] = None
    score_technique: Optional[float] = None
    score_stability: Optional[float] = None
    score_symmetry: Optional[float] = None
    score_efficiency: Optional[float] = None
    score_overall: Optional[float] = None
    phases: Optional[List[Dict[str, Any]]] = None
    ai_report: Optional[AIReportOut] = None

    class Config:
        from_attributes = True


class VideoDetailOut(VideoOut):
    frame_series: Optional[List[Dict[str, Any]]] = None


class PortfolioOut(BaseModel):
    profile: AthleteProfileOut
    performance_logs: List[PerformanceLogOut]
    videos: List[VideoOut]


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


class VerifyRequest(BaseModel):
    coach_name: str
