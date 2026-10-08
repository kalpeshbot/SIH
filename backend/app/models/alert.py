from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime, timezone

class Alert(SQLModel, table=True):
    __tablename__ = "alerts"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: Optional[str] = Field(default=None, foreign_key="sessions.session_id", index=True)
    device_id: Optional[str] = Field(default=None, foreign_key="devices.device_id", index=True)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    hazard_type: str # GAS, WATER, PRESSURE, VIBRATION, SENSOR_FAULT, SYSTEM
    severity: str # INFO, WARNING, DANGER, FAULT
    message: str
    acknowledged: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
