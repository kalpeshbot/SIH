from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime, timezone

class Zone(SQLModel, table=True):
    __tablename__ = "zones"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    zone_id: str = Field(unique=True, index=True)
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
