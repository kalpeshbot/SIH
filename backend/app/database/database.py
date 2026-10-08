import os
from sqlmodel import SQLModel, create_engine, Session
from app.core.config import settings

# Make sure data directory exists for sqlite
if settings.DATABASE_URL.startswith("sqlite:///"):
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    os.makedirs(os.path.dirname(db_path), exist_ok=True)

connect_args = {"check_same_thread": False}
engine = create_engine(settings.DATABASE_URL, echo=settings.DEBUG, connect_args=connect_args)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session
