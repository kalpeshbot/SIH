from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime, timezone

class SensorReading(SQLModel, table=True):
    __tablename__ = "sensor_readings"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(foreign_key="sessions.session_id", index=True)
    device_id: str = Field(foreign_key="devices.device_id", index=True)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    sensor_type: str # VIBRATION, PRESSURE, GAS_LEVEL, WATER, BATTERY
    value: float
    unit: str
    status: str
