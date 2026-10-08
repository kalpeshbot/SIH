from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime, timezone

class Trainee(SQLModel, table=True):
    __tablename__ = "trainees"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    trainee_id: str = Field(unique=True, index=True)
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
