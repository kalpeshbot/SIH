from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime, timezone

class Device(SQLModel, table=True):
    __tablename__ = "devices"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    device_id: str = Field(unique=True, index=True)
    device_type: str # HANDHELD, WEARABLE, BEACON
    firmware_version: Optional[str] = None # e.g. "0.2.0"
    status: str = "OFFLINE" # ONLINE, OFFLINE, FAULT, UNKNOWN
    battery: Optional[int] = Field(default=None, ge=0, le=100)
    zone_id: Optional[str] = Field(default=None, foreign_key="zones.zone_id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_seen: Optional[datetime] = None

