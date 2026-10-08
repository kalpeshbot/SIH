import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool
from app.main import app as fastapi_app
from app.database.database import get_session
from app.database import database

# Use in-memory SQLite for testing
sqlite_url = "sqlite://"
engine = create_engine(
    sqlite_url, 
    connect_args={"check_same_thread": False}, 
    poolclass=StaticPool
)

def get_session_override():
    with Session(engine) as session:
        yield session

fastapi_app.dependency_overrides[get_session] = get_session_override

@pytest.fixture(name="client")
def client_fixture():
    # Override the engine used in lifespan to create tables in memory
    original_engine = database.engine
    database.engine = engine
    
    with TestClient(fastapi_app) as client:
        yield client
        
    # Restore original engine
    database.engine = original_engine

