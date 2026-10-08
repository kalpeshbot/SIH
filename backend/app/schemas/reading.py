from pydantic import BaseModel
from datetime import datetime

class SensorReadingCreate(BaseModel):
    session_id: str
    device_id: str
    sensor_type: str
    value: float
    unit: str
    status: str
    timestamp: datetime | None = None
