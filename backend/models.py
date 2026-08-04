import datetime
import enum
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, Enum, JSON
)
from sqlalchemy.orm import relationship
from database import Base


class Role(str, enum.Enum):
    athlete = "athlete"
    coach = "coach"
    scout = "scout"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(Role), default=Role.athlete, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    athlete_profile = relationship("AthleteProfile", back_populates="user", uselist=False)


class AthleteProfile(Base):
    __tablename__ = "athlete_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=True)
    sport = Column(String, nullable=True)
    position = Column(String, nullable=True)
    height_cm = Column(Float, nullable=True)
    weight_kg = Column(Float, nullable=True)
    academy = Column(String, nullable=True)
    region = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    verified = Column(Boolean, default=False)
    verified_by = Column(String, nullable=True)
    visibility = Column(String, default="public")  # public | scouts_only | private

    user = relationship("User", back_populates="athlete_profile")
    performance_logs = relationship("PerformanceLog", back_populates="athlete", cascade="all, delete-orphan")
    videos = relationship("Video", back_populates="athlete", cascade="all, delete-orphan")


class PerformanceLog(Base):
    __tablename__ = "performance_logs"

    id = Column(Integer, primary_key=True, index=True)
    athlete_id = Column(Integer, ForeignKey("athlete_profiles.id"), nullable=False)
    date = Column(DateTime, default=datetime.datetime.utcnow)
    duration_min = Column(Float, nullable=True)
    distance_km = Column(Float, nullable=True)
    sprint_time_sec = Column(Float, nullable=True)
    vertical_jump_cm = Column(Float, nullable=True)
    weight_lifted_kg = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)

    athlete = relationship("AthleteProfile", back_populates="performance_logs")


class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    athlete_id = Column(Integer, ForeignKey("athlete_profiles.id"), nullable=False)
    title = Column(String, nullable=False)
    tags = Column(String, nullable=True)
    filepath = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    visibility = Column(String, default="public")  # public | private
    coach_comment = Column(Text, nullable=True)

    # Capture context (chosen by the athlete before analysis)
    sport = Column(String, nullable=True)
    movement = Column(String, nullable=True)
    camera_angle = Column(String, nullable=True)

    # CV-derived metrics (optical flow — general activity/explosiveness proxy)
    duration_sec = Column(Float, nullable=True)
    fps = Column(Float, nullable=True)
    frame_count = Column(Integer, nullable=True)
    motion_score = Column(Float, nullable=True)
    est_max_speed_score = Column(Float, nullable=True)

    # CV-derived metrics (MediaPipe Pose — sprint-specific biomechanics)
    avg_knee_angle_deg = Column(Float, nullable=True)
    avg_trunk_lean_deg = Column(Float, nullable=True)
    estimated_cadence_spm = Column(Float, nullable=True)
    pose_summary = Column(Text, nullable=True)

    # AI Movement Score (0-100 sub-scores derived from pose biomechanics)
    score_technique = Column(Float, nullable=True)
    score_stability = Column(Float, nullable=True)
    score_symmetry = Column(Float, nullable=True)
    score_efficiency = Column(Float, nullable=True)
    score_overall = Column(Float, nullable=True)

    # Movement timeline phases: [{"name": "Start", "t": 0.0}, ...]
    phases = Column(JSON, nullable=True)

    # Per-frame skeleton + joint-angle time series, sampled across the clip:
    # [{"t": 1.2, "lm": {"left_knee": [0.41, 0.62], ...}, "ang": {"left_knee": 142.0, ...}}, ...]
    frame_series = Column(JSON, nullable=True)

    ai_report = relationship("AIReport", back_populates="video", uselist=False, cascade="all, delete-orphan")
    athlete = relationship("AthleteProfile", back_populates="videos")


class AIReport(Base):
    __tablename__ = "ai_reports"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), unique=True, nullable=False)
    summary = Column(Text, nullable=False)
    strengths = Column(Text, nullable=True)
    weaknesses = Column(Text, nullable=True)
    drills = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    video = relationship("Video", back_populates="ai_report")
