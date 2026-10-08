from pydantic import BaseModel

class ZoneCreate(BaseModel):
    zone_id: str
    name: str
    description: str | None = None

class ZoneUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
