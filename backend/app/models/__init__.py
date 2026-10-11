from sqlmodel import SQLModel
# Import all models to ensure they are registered with SQLModel metadata
from app.models.trainee import Trainee
from app.models.zone import Zone
from app.models.device import Device
from app.models.session import Session
from app.models.reading import SensorReading
from app.models.alert import Alert
from app.models.safety_event import SafetyEvent, MachineBaseline
from app.models.inspection import Inspection, InspectionEvidence, TrainerIntervention

__all__ = [
    "Trainee", "Zone", "Device", "Session", "SensorReading", "Alert",
    "SafetyEvent", "MachineBaseline", "Inspection", "InspectionEvidence", "TrainerIntervention"
]
