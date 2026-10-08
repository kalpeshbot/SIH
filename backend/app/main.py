from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.database.database import create_db_and_tables
from app.routers import health, trainees, devices, zones, sessions, readings, alerts

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database
    create_db_and_tables()
    yield
    # Cleanup if needed

app = FastAPI(
    title=settings.APP_NAME,
    version="0.1.0",
    description="Backend API for the SIH Diagnostic Training System prototype.",
    lifespan=lifespan
)

# CORS configuration for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(health.router)
app.include_router(trainees.router)
app.include_router(devices.router)
app.include_router(zones.router)
app.include_router(sessions.router)
app.include_router(readings.router)
app.include_router(alerts.router)
