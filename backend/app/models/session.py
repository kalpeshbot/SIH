from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime, timezone

class Session(SQLModel, table=True):
    __tablename__ = "sessions"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(unique=True, index=True)
    trainee_id: str = Field(foreign_key="trainees.trainee_id")
    device_id: str = Field(foreign_key="devices.device_id")
    session_type: str # LEAK_DETECTION, WATER_LEAK, GAS_HAZARD, TRAINING, DEMO
    status: str = "ACTIVE" # ACTIVE, COMPLETED, CANCELLED, FAULT
    result: Optional[str] = None # NORMAL, WARNING, DANGER, FAULT, INCONCLUSIVE
    zone_id: Optional[str] = Field(default=None, foreign_key="zones.zone_id")
    start_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    end_time: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

