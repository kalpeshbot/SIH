from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, List

# Controlled Vocabularies
VALID_MACHINE_STATES = {"IDLE", "STARTUP", "ACTIVE", "COOLDOWN", "MAINTENANCE", "UNKNOWN"}
VALID_SENSOR_HEALTH = {"OK", "WARMING_UP", "UNRELIABLE", "DISCONNECTED", "SATURATED", "STALE", "UNKNOWN"}
VALID_CONFIDENCE_LEVELS = {"LOW", "MEDIUM", "HIGH"}
VALID_EVENT_TYPES = {
    "VIBRATION_ANOMALY",
    "ACOUSTIC_ANOMALY",
    "GAS_ANOMALY",
    "PRESSURE_ANOMALY",
    "WETNESS_EVENT",
    "SENSOR_FAULT",
    "MULTI_SENSOR_HAZARD",
    "UNKNOWN_ANOMALY"
}
VALID_EVENT_STATUSES = {"DETECTED", "ACKNOWLEDGED", "RESOLVED", "DISMISSED"}
VALID_EVENT_SEVERITIES = {"INFO", "WARNING", "DANGER", "CRITICAL", "FAULT"}
VALID_FEATURE_NAMES = {
    "RMS",
    "PEAK",
    "CREST_FACTOR",
    "KURTOSIS",
    "BAND_ENERGY",
    "BAND_RATIO",
    "RATE_OF_CHANGE",
    "PERSISTENCE",
    "BASELINE_DEVIATION"
}


# Safety Event Schemas
class SafetyEventCreate(BaseModel):
    event_id: str
    session_id: str
    device_id: str
    zone_id: Optional[str] = None
    machine_id: Optional[str] = None
    event_type: str
    severity: str = "WARNING"
    status: str = "DETECTED"
    confidence_level: str = "MEDIUM"
    confidence_reason: Optional[str] = None
    triggering_sensor_types: Optional[str] = None
    context_state: Optional[str] = "UNKNOWN"
    trainer_note: Optional[str] = None

    @field_validator("event_id", "session_id", "device_id")
    @classmethod
    def must_not_be_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field must not be empty or whitespace")
        return v.strip()

    @field_validator("event_type")
    @classmethod
    def event_type_must_be_valid(cls, v: str) -> str:
        v_upper = v.upper().strip()
        if v_upper not in VALID_EVENT_TYPES:
            raise ValueError(f"event_type must be one of {sorted(VALID_EVENT_TYPES)}")
        return v_upper

    @field_validator("severity")
    @classmethod
    def severity_must_be_valid(cls, v: str) -> str:
        v_upper = v.upper().strip()
        if v_upper not in VALID_EVENT_SEVERITIES:
            raise ValueError(f"severity must be one of {sorted(VALID_EVENT_SEVERITIES)}")
        return v_upper

    @field_validator("status")
    @classmethod
    def status_must_be_valid(cls, v: str) -> str:
        v_upper = v.upper().strip()
        if v_upper not in VALID_EVENT_STATUSES:
            raise ValueError(f"status must be one of {sorted(VALID_EVENT_STATUSES)}")
        return v_upper

    @field_validator("confidence_level")
    @classmethod
    def confidence_must_be_valid(cls, v: str) -> str:
        v_upper = v.upper().strip()
        if v_upper not in VALID_CONFIDENCE_LEVELS:
            raise ValueError(f"confidence_level must be one of {sorted(VALID_CONFIDENCE_LEVELS)}")
        return v_upper

    @field_validator("context_state")
    @classmethod
    def context_state_must_be_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            v_upper = v.upper().strip()
            if v_upper not in VALID_MACHINE_STATES:
                raise ValueError(f"context_state must be one of {sorted(VALID_MACHINE_STATES)}")
            return v_upper
        return v


class SafetyEventAcknowledge(BaseModel):
    trainer_note: Optional[str] = None


class SafetyEventResolve(BaseModel):
    trainer_note: Optional[str] = None


class SafetyEventRead(BaseModel):
    id: int
    event_id: str
    session_id: str
    device_id: str
    zone_id: Optional[str] = None
    machine_id: Optional[str] = None
    event_type: str
    severity: str
    status: str
    confidence_level: str
    confidence_reason: Optional[str] = None
    triggering_sensor_types: Optional[str] = None
    context_state: Optional[str] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    trainer_note: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# Machine Baseline Schemas
class MachineBaselineCreate(BaseModel):
    baseline_id: str
    machine_id: str
    sensor_type: str
    machine_state: str = "ACTIVE"
    feature_name: str = "RMS"
    baseline_value: float
    spread: Optional[float] = None
    sample_count: int = 0

    @field_validator("baseline_id", "machine_id", "sensor_type")
    @classmethod
    def must_not_be_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field must not be empty or whitespace")
        return v.strip()

    @field_validator("machine_state")
    @classmethod
    def state_must_be_valid(cls, v: str) -> str:
        v_upper = v.upper().strip()
        if v_upper not in VALID_MACHINE_STATES:
            raise ValueError(f"machine_state must be one of {sorted(VALID_MACHINE_STATES)}")
        return v_upper

    @field_validator("feature_name")
    @classmethod
    def feature_must_be_valid(cls, v: str) -> str:
        v_upper = v.upper().strip()
        if v_upper not in VALID_FEATURE_NAMES:
            raise ValueError(f"feature_name must be one of {sorted(VALID_FEATURE_NAMES)}")
        return v_upper

    @field_validator("baseline_value")
    @classmethod
    def baseline_value_must_be_finite(cls, v: float) -> float:
        if not (-1e9 <= v <= 1e9):
            raise ValueError("baseline_value must be a finite realistic numeric value")
        return v


class MachineBaselineRead(BaseModel):
    id: int
    baseline_id: str
    machine_id: str
    sensor_type: str
    machine_state: str
    feature_name: str
    baseline_value: float
    spread: Optional[float] = None
    sample_count: int
    created_at: datetime
    updated_at: datetime


# Explainable Alert & Feature Contracts
class ExplainableAlertContract(BaseModel):
    condition: str
    evidence: str
    confidence: str # LOW, MEDIUM, HIGH
    sensor_status: str # OK, WARMING_UP, UNRELIABLE, etc.
    recommended_action: str


class SignalFeaturesContract(BaseModel):
    sensor_type: str
    feature_name: str
    feature_value: float
    unit: str
    timestamp: datetime
    sample_window_ms: int
