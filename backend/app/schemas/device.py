from pydantic import BaseModel, Field

class DeviceCreate(BaseModel):
    device_id: str
    device_type: str
    status: str = "OFFLINE"
    battery: int | None = Field(default=None, ge=0, le=100)
    zone_id: str | None = None

class DeviceUpdate(BaseModel):
    status: str | None = None
    battery: int | None = Field(default=None, ge=0, le=100)
    zone_id: str | None = None
