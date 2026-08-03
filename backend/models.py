import datetime
import enum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from database import Base


# ==========================================================
# Roles
# ==========================================================

class Role(str, enum.Enum):
    athlete = "athlete"
    coach = "coach"
    scout = "scout"


# ==========================================================
# User
# ==========================================================

class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    email = Column(
        String,
        unique=True,
        index=True,
        nullable=False,
    )

    hashed_password = Column(
        String,
        nullable=False,
    )

    role = Column(
        Enum(Role),
        default=Role.athlete,
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        nullable=False,
    )

    athlete_profile = relationship(
        "AthleteProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )


# ==========================================================
# Athlete profile
# ==========================================================

class AthleteProfile(Base):
    __tablename__ = "athlete_profiles"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        unique=True,
        nullable=False,
    )

    username = Column(
        String,
        unique=True,
        index=True,
        nullable=False,
    )

    name = Column(
        String,
        nullable=False,
    )

    age = Column(
        Integer,
        nullable=True,
    )

    sport = Column(
        String,
        nullable=True,
    )

    position = Column(
        String,
        nullable=True,
    )

    height_cm = Column(
        Float,
        nullable=True,
    )

    weight_kg = Column(
        Float,
        nullable=True,
    )

    academy = Column(
        String,
        nullable=True,
    )

    region = Column(
        String,
        nullable=True,
    )

    bio = Column(
        Text,
        nullable=True,
    )

    verified = Column(
        Boolean,
        default=False,
        nullable=False,
    )

    verified_by = Column(
        String,
        nullable=True,
    )

    user = relationship(
        "User",
        back_populates="athlete_profile",
    )

    performance_logs = relationship(
        "PerformanceLog",
        back_populates="athlete",
        cascade="all, delete-orphan",
    )

    checkins = relationship(
        "DailyCheckin",
        back_populates="athlete",
        cascade="all, delete-orphan",
    )

    videos = relationship(
        "Video",
        back_populates="athlete",
        cascade="all, delete-orphan",
    )


# ==========================================================
# Performance log
# ==========================================================

class PerformanceLog(Base):
    __tablename__ = "performance_logs"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    athlete_id = Column(
        Integer,
        ForeignKey("athlete_profiles.id"),
        nullable=False,
    )

    date = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        nullable=False,
    )

    # ---------- Performance ML inputs ----------

    sport_type = Column(
        String,
        nullable=True,
    )

    event = Column(
        String,
        nullable=True,
    )

    training_hours_per_week = Column(
        Float,
        nullable=True,
    )

    average_heart_rate = Column(
        Float,
        nullable=True,
    )

    bmi = Column(
        Float,
        nullable=True,
    )

    sleep_hours_per_night = Column(
        Float,
        nullable=True,
    )

    daily_caloric_intake = Column(
        Float,
        nullable=True,
    )

    hydration_level = Column(
        Float,
        nullable=True,
    )

    injury_history = Column(
        String,
        nullable=True,
    )

    previous_competition_performance = Column(
        Float,
        nullable=True,
    )

    # Categorical: Low / Medium / High
    training_intensity = Column(
        String,
        nullable=True,
    )

    resting_heart_rate = Column(
        Float,
        nullable=True,
    )

    body_fat_percentage = Column(
        Float,
        nullable=True,
    )

    vo2_max = Column(
        Float,
        nullable=True,
    )

    event_distance = Column(
        Float,
        nullable=True,
    )

    altitude_training = Column(
        String,
        nullable=True,
    )

    # Numeric score
    mental_focus_level = Column(
        Float,
        nullable=True,
    )

    # Predicted by performance_model.joblib
    performance_metric = Column(
        Float,
        nullable=True,
    )

    athlete = relationship(
        "AthleteProfile",
        back_populates="performance_logs",
    )


# ==========================================================
# Daily readiness check-in
# ==========================================================

class DailyCheckin(Base):
    __tablename__ = "daily_checkins"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    athlete_id = Column(
        Integer,
        ForeignKey("athlete_profiles.id"),
        nullable=False,
    )

    date = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        nullable=False,
    )

    total_steps = Column(
        Integer,
        nullable=True,
    )

    calories = Column(
        Float,
        nullable=True,
    )

    very_active_minutes = Column(
        Integer,
        nullable=True,
    )

    fairly_active_minutes = Column(
        Integer,
        nullable=True,
    )

    lightly_active_minutes = Column(
        Integer,
        nullable=True,
    )

    sedentary_minutes = Column(
        Integer,
        nullable=True,
    )

    total_minutes_asleep = Column(
        Float,
        nullable=True,
    )

    total_time_in_bed = Column(
        Float,
        nullable=True,
    )

    avg_heart_rate = Column(
        Float,
        nullable=True,
    )

    # Predicted by readiness_model.joblib
    readiness_score = Column(
        Float,
        nullable=True,
    )

    recommendation = Column(
        Text,
        nullable=True,
    )

    athlete = relationship(
        "AthleteProfile",
        back_populates="checkins",
    )


# ==========================================================
# Video
# ==========================================================

class Video(Base):
    __tablename__ = "videos"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    athlete_id = Column(
        Integer,
        ForeignKey("athlete_profiles.id"),
        nullable=False,
    )

    title = Column(
        String,
        nullable=False,
    )

    tags = Column(
        String,
        nullable=True,
    )

    filepath = Column(
        String,
        nullable=False,
    )

    uploaded_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        nullable=False,
    )

    visibility = Column(
        String,
        default="public",
        nullable=False,
    )

    coach_comment = Column(
        Text,
        nullable=True,
    )

    # ---------- Optical-flow metrics ----------

    duration_sec = Column(
        Float,
        nullable=True,
    )

    fps = Column(
        Float,
        nullable=True,
    )

    frame_count = Column(
        Integer,
        nullable=True,
    )

    motion_score = Column(
        Float,
        nullable=True,
    )

    est_max_speed_score = Column(
        Float,
        nullable=True,
    )

    # ---------- MediaPipe pose metrics ----------

    avg_knee_angle_deg = Column(
        Float,
        nullable=True,
    )

    avg_trunk_lean_deg = Column(
        Float,
        nullable=True,
    )

    estimated_cadence_spm = Column(
        Float,
        nullable=True,
    )

    pose_summary = Column(
        Text,
        nullable=True,
    )

    ai_report = relationship(
        "AIReport",
        back_populates="video",
        uselist=False,
        cascade="all, delete-orphan",
    )

    athlete = relationship(
        "AthleteProfile",
        back_populates="videos",
    )


# ==========================================================
# AI report
# ==========================================================

class AIReport(Base):
    __tablename__ = "ai_reports"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    video_id = Column(
        Integer,
        ForeignKey("videos.id"),
        unique=True,
        nullable=False,
    )

    summary = Column(
        Text,
        nullable=False,
    )

    strengths = Column(
        Text,
        nullable=True,
    )

    weaknesses = Column(
        Text,
        nullable=True,
    )

    drills = Column(
        Text,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.datetime.utcnow,
        nullable=False,
    )

    video = relationship(
        "Video",
        back_populates="ai_report",
    )
