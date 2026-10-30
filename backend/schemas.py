import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field


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

    # Objective track-and-field result used by the athletics scoring model.
    competition_category: Optional[str] = None
    environment: Optional[str] = "outdoor"
    result_value: Optional[float] = None
    result_unit: Optional[str] = None
    wind_speed_mps: Optional[float] = None

    # Optional personalised jump context. Range validation prevents impossible
    # sensor/form values from entering the longitudinal analysis.
    approach_speed_mps: Optional[float] = Field(None, gt=0, le=15)
    takeoff_velocity_mps: Optional[float] = Field(None, gt=0, le=15)
    takeoff_angle_deg: Optional[float] = Field(None, ge=0, le=90)
    takeoff_contact_time_ms: Optional[float] = Field(None, gt=0, le=1000)
    approach_consistency_pct: Optional[float] = Field(None, ge=0, le=100)
    board_accuracy_cm: Optional[float] = Field(None, ge=0, le=300)
    takeoff_distance_cm: Optional[float] = Field(None, ge=0, le=500)
    reactive_strength_index: Optional[float] = Field(None, ge=0, le=10)
    fatigue_score: Optional[float] = Field(None, ge=0, le=10)
    soreness_score: Optional[float] = Field(None, ge=0, le=10)
    session_rpe: Optional[float] = Field(None, ge=0, le=10)
    pain_present: Optional[bool] = None


PerformanceLogIn = PerformanceLogCreate


class PerformanceLogOut(PerformanceLogCreate):
    id: int
    athlete_id: int
    date: datetime.datetime
    performance_metric: Optional[float] = None
    scoring_event_code: Optional[str] = None
    world_athletics_points: Optional[int] = None
    scoring_version: Optional[str] = None
    wind_legal: Optional[bool] = None

    class Config:
        from_attributes = True


class DailyCheckinIn(BaseModel):
    total_steps: Optional[int] = 8000
    calories: Optional[float] = 2200.0
    very_active_minutes: Optional[int] = 30
    fairly_active_minutes: Optional[int] = 20
    lightly_active_minutes: Optional[int] = 180
    sedentary_minutes: Optional[int] = 480
    total_minutes_asleep: Optional[float] = 450.0
    total_time_in_bed: Optional[float] = 480.0
    avg_heart_rate: Optional[float] = 68.0


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


class AthleticsScoreIn(BaseModel):
    competition_category: str
    event: str
    result_value: float
    result_unit: Optional[str] = None
    environment: str = "outdoor"
    wind_speed_mps: Optional[float] = None


class AthleticsScoreOut(BaseModel):
    competition_category: str
    event: str
    event_code: str
    event_family: str
    environment: str
    result_value: float
    result_unit: str
    world_athletics_points: int
    performance_score: float
    score_band: str
    competitive_tier: Optional[str] = None
    wind_speed_mps: Optional[float] = None
    wind_legal: Optional[bool] = None
    wind_corrected_result: Optional[float] = None
    scoring_version: str
    notes: List[str]


class AthleticsEventOut(BaseModel):
    event: str
    event_code: str
    family: str
    unit: str
    environment: str


class AthleticsImprovementPriority(BaseModel):
    priority: str
    area: str
    reason: str
    actions: List[str]


class AthleticsPerformanceDriver(BaseModel):
    metric: str
    label: str
    latest_value: float
    unit: Optional[str] = None
    data_points: int
    relationship: str
    evidence: str


class AthleticsReviewOut(BaseModel):
    model_config = {"protected_namespaces": ()}

    overall_score: Optional[float] = None
    score_band: Optional[str] = None
    primary_event: Optional[str] = None
    latest_result: Optional[AthleticsScoreOut] = None
    change_points: Optional[float] = None
    confidence: str
    historical_scores: List[Dict[str, Any]]
    next_milestone: Optional[Dict[str, Any]] = None
    improvement_priorities: List[AthleticsImprovementPriority]
    context_completeness_pct: float = 0.0
    performance_drivers: List[AthleticsPerformanceDriver] = Field(default_factory=list)
    body_context: Dict[str, Any] = Field(default_factory=dict)
    personalised_model_status: str = "insufficient_data"
    personalised_model_note: str
    model_note: str


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

    overall_score: Optional[float] = None
    overall_change_pct: Optional[float] = None
    speed_score: Optional[float] = None
    strength_score: Optional[float] = None
    technique_score: Optional[float] = None
    endurance_score: Optional[float] = None
    focus_points: Optional[List[str]] = None
    historical_scores: Optional[List[Dict[str, Any]]] = None
    ai_recommendations: Optional[Dict[str, Any]] = None


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
