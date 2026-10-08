from pydantic import BaseModel
from datetime import datetime

class AlertCreate(BaseModel):
    session_id: str | None = None
    device_id: str | None = None
    hazard_type: str
    severity: str
    message: str

class AlertUpdate(BaseModel):
    acknowledged: bool | None = None
