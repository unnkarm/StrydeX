import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr


# ---------- Auth ----------
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    role: str = "athlete"  # athlete | coach | scout


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeResponse(BaseModel):
    id: int
    email: str
    role: str
    has_profile: bool


# ---------- Athlete Profile ----------
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


# ---------- Performance Log ----------
class PerformanceLogIn(BaseModel):
    duration_min: Optional[float] = None
    distance_km: Optional[float] = None
    sprint_time_sec: Optional[float] = None
    vertical_jump_cm: Optional[float] = None
    weight_lifted_kg: Optional[float] = None
    notes: Optional[str] = None


class PerformanceLogOut(PerformanceLogIn):
    id: int
    date: datetime.datetime

    class Config:
        from_attributes = True


# ---------- Video / AI Report ----------
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
    """Full video payload including the per-frame skeleton/angle series
    used by the analysis dashboard (pose overlay, joint-angle graphs)."""
    frame_series: Optional[List[Dict[str, Any]]] = None


# ---------- Public Portfolio ----------
class PortfolioOut(BaseModel):
    profile: AthleteProfileOut
    performance_logs: List[PerformanceLogOut]
    videos: List[VideoOut]


# ---------- Scout Search ----------
class ScoutResult(BaseModel):
    username: str
    name: str
    sport: Optional[str]
    position: Optional[str]
    age: Optional[int]
    region: Optional[str]
    verified: bool

    class Config:
        from_attributes = True


# ---------- Coach verification ----------
class VerifyRequest(BaseModel):
    coach_name: str
