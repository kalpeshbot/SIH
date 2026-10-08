from sqlmodel import SQLModel
# Import all models to ensure they are registered with SQLModel metadata
from app.models.trainee import Trainee
from app.models.zone import Zone
from app.models.device import Device
from app.models.session import Session
from app.models.reading import SensorReading
from app.models.alert import Alert

__all__ = ["Trainee", "Zone", "Device", "Session", "SensorReading", "Alert"]
