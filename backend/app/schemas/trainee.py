from pydantic import BaseModel, field_validator

class TraineeCreate(BaseModel):
    trainee_id: str
    name: str

    @field_validator("trainee_id", "name")
    @classmethod
    def must_not_be_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field must not be empty or whitespace")
        return v

class TraineeUpdate(BaseModel):
    name: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, v: str | None) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("Name must not be empty or whitespace")
        return v
