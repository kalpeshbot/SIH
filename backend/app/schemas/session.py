from pydantic import BaseModel
from datetime import datetime

class SessionCreate(BaseModel):
    session_id: str
    trainee_id: str
    device_id: str
    session_type: str
    start_time: datetime | None = None

class SessionUpdate(BaseModel):
    status: str | None = None
    result: str | None = None
    end_time: datetime | None = None
