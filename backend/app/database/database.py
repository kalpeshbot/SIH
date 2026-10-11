import os
from sqlmodel import SQLModel, create_engine, Session
from app.core.config import settings

# Make sure data directory exists for sqlite
if settings.DATABASE_URL.startswith("sqlite:///"):
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    os.makedirs(os.path.dirname(db_path), exist_ok=True)

from sqlalchemy import text

connect_args = {"check_same_thread": False}
engine = create_engine(settings.DATABASE_URL, echo=settings.DEBUG, connect_args=connect_args)

def run_migrations(db_engine):
    """
    Safe, backward-compatible SQLite migration helper.
    Ensures pre-existing database tables acquire new schema columns without
    dropping or recreating tables.
    """
    with db_engine.connect() as conn:
        # Check safety_events table columns
        try:
            res = conn.execute(text("PRAGMA table_info(safety_events)"))
            existing_cols = {row[1] for row in res.fetchall()}
            if existing_cols:
                if "trend_state" not in existing_cols:
                    conn.execute(text("ALTER TABLE safety_events ADD COLUMN trend_state TEXT"))
                if "trend_reason" not in existing_cols:
                    conn.execute(text("ALTER TABLE safety_events ADD COLUMN trend_reason TEXT"))
                if "persistence_count" not in existing_cols:
                    conn.execute(text("ALTER TABLE safety_events ADD COLUMN persistence_count INTEGER DEFAULT 0"))
                conn.commit()
        except Exception:
            pass

        # Check machine_baselines table columns
        try:
            res = conn.execute(text("PRAGMA table_info(machine_baselines)"))
            existing_cols = {row[1] for row in res.fetchall()}
            if existing_cols:
                if "version" not in existing_cols:
                    conn.execute(text("ALTER TABLE machine_baselines ADD COLUMN version INTEGER DEFAULT 1"))
                if "validity_state" not in existing_cols:
                    conn.execute(text("ALTER TABLE machine_baselines ADD COLUMN validity_state TEXT DEFAULT 'VALID'"))
                if "capture_period_seconds" not in existing_cols:
                    conn.execute(text("ALTER TABLE machine_baselines ADD COLUMN capture_period_seconds REAL"))
                if "source" not in existing_cols:
                    conn.execute(text("ALTER TABLE machine_baselines ADD COLUMN source TEXT DEFAULT 'CALIBRATION_RUN'"))
                conn.commit()
        except Exception:
            pass

def create_db_and_tables():
    # Import all models to ensure metadata is populated
    import app.models # noqa
    SQLModel.metadata.create_all(engine)
    run_migrations(engine)

def get_session():
    with Session(engine) as session:
        yield session
