import datetime
import enum

from sqlalchemy import (
    JSON,
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
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    athlete_profile = relationship(
        "AthleteProfile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )


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
    verified = Column(Boolean, default=False, nullable=False)
    verified_by = Column(String, nullable=True)

    user = relationship("User", back_populates="athlete_profile")
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


class PerformanceLog(Base):
    __tablename__ = "performance_logs"

    id = Column(Integer, primary_key=True, index=True)
    athlete_id = Column(Integer, ForeignKey("athlete_profiles.id"), nullable=False)
    date = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    # Original MVP fields
    duration_min = Column(Float, nullable=True)
    distance_km = Column(Float, nullable=True)
    sprint_time_sec = Column(Float, nullable=True)
    vertical_jump_cm = Column(Float, nullable=True)
    weight_lifted_kg = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)

    # Analytics / ML fields
    sport_type = Column(String, nullable=True)
    event = Column(String, nullable=True)
    training_hours_per_week = Column(Float, nullable=True)
    average_heart_rate = Column(Float, nullable=True)
    bmi = Column(Float, nullable=True)
    sleep_hours_per_night = Column(Float, nullable=True)
    daily_caloric_intake = Column(Float, nullable=True)
    hydration_level = Column(Float, nullable=True)
    injury_history = Column(String, nullable=True)
    previous_competition_performance = Column(Float, nullable=True)
    training_intensity = Column(String, nullable=True)
    resting_heart_rate = Column(Float, nullable=True)
    body_fat_percentage = Column(Float, nullable=True)
    vo2_max = Column(Float, nullable=True)
    event_distance = Column(Float, nullable=True)
    altitude_training = Column(String, nullable=True)
    mental_focus_level = Column(Float, nullable=True)
    performance_metric = Column(Float, nullable=True)

    athlete = relationship("AthleteProfile", back_populates="performance_logs")


class DailyCheckin(Base):
    __tablename__ = "daily_checkins"

    id = Column(Integer, primary_key=True, index=True)
    athlete_id = Column(Integer, ForeignKey("athlete_profiles.id"), nullable=False)
    date = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    total_steps = Column(Integer, nullable=True)
    calories = Column(Float, nullable=True)
    very_active_minutes = Column(Integer, nullable=True)
    fairly_active_minutes = Column(Integer, nullable=True)
    lightly_active_minutes = Column(Integer, nullable=True)
    sedentary_minutes = Column(Integer, nullable=True)
    total_minutes_asleep = Column(Float, nullable=True)
    total_time_in_bed = Column(Float, nullable=True)
    avg_heart_rate = Column(Float, nullable=True)
    readiness_score = Column(Float, nullable=True)
    recommendation = Column(Text, nullable=True)

    athlete = relationship("AthleteProfile", back_populates="checkins")


class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    athlete_id = Column(Integer, ForeignKey("athlete_profiles.id"), nullable=False)
    title = Column(String, nullable=False)
    tags = Column(String, nullable=True)
    filepath = Column(String, nullable=False)
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    visibility = Column(String, default="public", nullable=False)
    coach_comment = Column(Text, nullable=True)

    sport = Column(String, nullable=True)
    movement = Column(String, nullable=True)
    camera_angle = Column(String, nullable=True)

    duration_sec = Column(Float, nullable=True)
    fps = Column(Float, nullable=True)
    frame_count = Column(Integer, nullable=True)
    motion_score = Column(Float, nullable=True)
    est_max_speed_score = Column(Float, nullable=True)
    avg_knee_angle_deg = Column(Float, nullable=True)
    avg_trunk_lean_deg = Column(Float, nullable=True)
    estimated_cadence_spm = Column(Float, nullable=True)
    pose_summary = Column(Text, nullable=True)

    score_technique = Column(Float, nullable=True)
    score_stability = Column(Float, nullable=True)
    score_symmetry = Column(Float, nullable=True)
    score_efficiency = Column(Float, nullable=True)
    score_overall = Column(Float, nullable=True)
    phases = Column(JSON, nullable=True)
    frame_series = Column(JSON, nullable=True)

    ai_report = relationship(
        "AIReport",
        back_populates="video",
        uselist=False,
        cascade="all, delete-orphan",
    )
    athlete = relationship("AthleteProfile", back_populates="videos")


class AIReport(Base):
    __tablename__ = "ai_reports"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), unique=True, nullable=False)
    summary = Column(Text, nullable=False)
    strengths = Column(Text, nullable=True)
    weaknesses = Column(Text, nullable=True)
    drills = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)

    video = relationship("Video", back_populates="ai_report")

