from pydantic import BaseModel

class TraineeCreate(BaseModel):
    trainee_id: str
    name: str

class TraineeUpdate(BaseModel):
    name: str | None = None
