from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime, timezone

class SafetyEvent(SQLModel, table=True):
    __tablename__ = "safety_events"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    event_id: str = Field(unique=True, index=True)
    session_id: str = Field(foreign_key="sessions.session_id", index=True)
    device_id: str = Field(foreign_key="devices.device_id", index=True)
    zone_id: Optional[str] = Field(default=None, foreign_key="zones.zone_id")
    machine_id: Optional[str] = Field(default=None, index=True)
    event_type: str # VIBRATION_ANOMALY, ACOUSTIC_ANOMALY, GAS_ANOMALY, PRESSURE_ANOMALY, WETNESS_EVENT, SENSOR_FAULT, MULTI_SENSOR_HAZARD, UNKNOWN_ANOMALY
    severity: str # INFO, WARNING, DANGER, CRITICAL, FAULT
    status: str = "DETECTED" # DETECTED, ACKNOWLEDGED, RESOLVED, DISMISSED
    confidence_level: str = "MEDIUM" # LOW, MEDIUM, HIGH
    confidence_reason: Optional[str] = None
    triggering_sensor_types: Optional[str] = None # JSON array or comma-separated list of sensor types
    context_state: Optional[str] = None # IDLE, STARTUP, ACTIVE, COOLDOWN, MAINTENANCE, UNKNOWN
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ended_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    trainer_note: Optional[str] = None
    trend_state: Optional[str] = None # TRANSIENT, PERSISTENT, ESCALATING, RECOVERING, UNKNOWN
    trend_reason: Optional[str] = None
    persistence_count: Optional[int] = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MachineBaseline(SQLModel, table=True):
    __tablename__ = "machine_baselines"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    baseline_id: str = Field(unique=True, index=True)
    machine_id: str = Field(index=True)
    sensor_type: str # VIBRATION, ACOUSTIC, TEMPERATURE, PRESSURE, GAS_LEVEL, CURRENT
    machine_state: str # IDLE, STARTUP, ACTIVE, COOLDOWN, MAINTENANCE, UNKNOWN
    feature_name: str # RMS, PEAK, CREST_FACTOR, KURTOSIS, BAND_ENERGY, BAND_RATIO, RATE_OF_CHANGE, PERSISTENCE, BASELINE_DEVIATION
    baseline_value: float
    spread: Optional[float] = None # e.g. MAD or standard deviation
    sample_count: int = 0
    version: int = 1
    validity_state: str = "VALID" # VALID, INSUFFICIENT_SAMPLES, STALE, INVALIDATED
    capture_period_seconds: Optional[float] = None
    source: Optional[str] = "CALIBRATION_RUN"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
