"""
Database setup. Local dev uses SQLite (zero config).
To move to Postgres later: swap DATABASE_URL to a postgres:// URL
(e.g. Supabase/Neon connection string) — SQLAlchemy code below doesn't change.
"""
import os
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./strydex.db")

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


ATHLETICS_PERFORMANCE_COLUMNS = {
    "competition_category": "VARCHAR",
    "environment": "VARCHAR",
    "result_value": "FLOAT",
    "result_unit": "VARCHAR",
    "scoring_event_code": "VARCHAR",
    "world_athletics_points": "INTEGER",
    "scoring_version": "VARCHAR",
    "wind_speed_mps": "FLOAT",
    "wind_legal": "BOOLEAN",
    "approach_speed_mps": "FLOAT",
    "takeoff_velocity_mps": "FLOAT",
    "takeoff_angle_deg": "FLOAT",
    "takeoff_contact_time_ms": "FLOAT",
    "approach_consistency_pct": "FLOAT",
    "board_accuracy_cm": "FLOAT",
    "takeoff_distance_cm": "FLOAT",
    "reactive_strength_index": "FLOAT",
    "fatigue_score": "FLOAT",
    "soreness_score": "FLOAT",
    "session_rpe": "FLOAT",
    "pain_present": "BOOLEAN",
}


def ensure_local_schema() -> None:
    """Add athletics fields to an existing local SQLite database without deleting rows."""

    if engine.dialect.name != "sqlite":
        return
    inspector = inspect(engine)
    if "performance_logs" not in inspector.get_table_names():
        return
    existing = {column["name"] for column in inspector.get_columns("performance_logs")}
    with engine.begin() as connection:
        for name, sql_type in ATHLETICS_PERFORMANCE_COLUMNS.items():
            if name not in existing:
                connection.exec_driver_sql(
                    f'ALTER TABLE performance_logs ADD COLUMN "{name}" {sql_type}'
                )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
