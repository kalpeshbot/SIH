from pydantic import BaseModel, field_validator
from datetime import datetime, timezone

class SensorReadingCreate(BaseModel):
    session_id: str
    device_id: str
    sensor_type: str
    value: float
    unit: str
    status: str
    timestamp: datetime | None = None

    @field_validator("session_id", "device_id", "sensor_type", "unit", "status")
    @classmethod
    def must_not_be_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field must not be empty or whitespace")
        return v
