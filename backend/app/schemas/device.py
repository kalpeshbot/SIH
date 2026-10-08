from pydantic import BaseModel, Field, field_validator

VALID_STATUSES = {"ONLINE", "OFFLINE", "FAULT", "UNKNOWN"}

class DeviceCreate(BaseModel):
    device_id: str
    device_type: str
    status: str = "OFFLINE"
    battery: int | None = Field(default=None, ge=0, le=100)
    zone_id: str | None = None

    @field_validator("device_id", "device_type")
    @classmethod
    def must_not_be_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field must not be empty or whitespace")
        return v

    @field_validator("status")
    @classmethod
    def status_must_be_valid(cls, v: str) -> str:
        if v not in VALID_STATUSES:
            raise ValueError(f"status must be one of {VALID_STATUSES}")
        return v

class DeviceUpdate(BaseModel):
    status: str | None = None
    battery: int | None = Field(default=None, ge=0, le=100)
    zone_id: str | None = None

    @field_validator("status")
    @classmethod
    def status_must_be_valid(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_STATUSES:
            raise ValueError(f"status must be one of {VALID_STATUSES}")
        return v
