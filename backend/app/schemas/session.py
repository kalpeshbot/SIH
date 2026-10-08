from pydantic import BaseModel, field_validator
from datetime import datetime

VALID_SESSION_TYPES = {"TRAINING", "EXAM", "PRACTICE", "DEMO", "HARDWARE_TEST"}

class SessionCreate(BaseModel):
    session_id: str
    trainee_id: str
    device_id: str
    zone_id: str | None = None
    session_type: str
    start_time: datetime | None = None

    @field_validator("session_id", "trainee_id", "device_id")
    @classmethod
    def must_not_be_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field must not be empty or whitespace")
        return v.strip()

class SessionUpdate(BaseModel):
    status: str | None = None
    result: str | None = None
    end_time: datetime | None = None

