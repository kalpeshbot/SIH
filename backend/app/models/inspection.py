from typing import Optional
from sqlmodel import SQLModel, Field
from datetime import datetime, timezone

class Inspection(SQLModel, table=True):
    __tablename__ = "inspections"

    id: Optional[int] = Field(default=None, primary_key=True)
    inspection_id: str = Field(unique=True, index=True)
    session_id: str = Field(foreign_key="sessions.session_id", index=True)
    device_id: Optional[str] = Field(default=None, foreign_key="devices.device_id")
    zone_id: Optional[str] = Field(default=None, foreign_key="zones.zone_id")
    machine_id: Optional[str] = Field(default=None, index=True)
    event_id: Optional[str] = Field(default=None, index=True)
    trainer_id: Optional[str] = Field(default=None, index=True)
    template_id: Optional[str] = Field(default=None)
    status: str = "IN_PROGRESS"  # IN_PROGRESS, COMPLETED, CANCELLED
    decision: Optional[str] = None  # CONFIRMED_BY_TRAINER, REFUTED_BY_TRAINER, INCONCLUSIVE, INSUFFICIENT_EVIDENCE
    reason: str
    checklist_json: Optional[str] = None  # JSON string of checklist steps
    measurement_source: Optional[str] = "MANUAL_OBSERVATION"
    sensor_health_state: Optional[str] = "UNKNOWN"
    machine_state: Optional[str] = "UNKNOWN"
    baseline_id: Optional[str] = None
    trainer_notes: Optional[str] = None
    outcome_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None


class InspectionEvidence(SQLModel, table=True):
    __tablename__ = "inspection_evidence"

    id: Optional[int] = Field(default=None, primary_key=True)
    evidence_id: str = Field(unique=True, index=True)
    inspection_id: str = Field(foreign_key="inspections.inspection_id", index=True)
    session_id: str = Field(foreign_key="sessions.session_id", index=True)
    evidence_type: str  # TELEMETRY_READING, SAFETY_EVENT, SENSOR_HEALTH, BASELINE_REFERENCE, TRAINER_OBSERVATION, MANUAL_MEASUREMENT
    source: str  # MANUAL, SENSOR, BASELINE, CALCULATED
    reference_id: Optional[str] = None  # e.g. reading ID, event ID, baseline ID
    value: Optional[float] = None
    unit: Optional[str] = None
    notes: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TrainerIntervention(SQLModel, table=True):
    __tablename__ = "trainer_interventions"

    id: Optional[int] = Field(default=None, primary_key=True)
    intervention_id: str = Field(unique=True, index=True)
    session_id: str = Field(foreign_key="sessions.session_id", index=True)
    inspection_id: Optional[str] = Field(default=None, index=True)
    event_id: Optional[str] = Field(default=None, index=True)
    machine_id: Optional[str] = Field(default=None, index=True)
    trainer_id: Optional[str] = Field(default=None)
    category: str  # WORKHOLDING_ADJUSTMENT, TOOL_INSPECTION, SPEED_FEED_ADJUSTMENT, COOLANT_RESTORE, SHUTDOWN_CHECK, OTHER
    notes: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    before_window_json: Optional[str] = None  # JSON of pre-intervention feature metrics
    after_window_json: Optional[str] = None   # JSON of post-intervention feature metrics
    comparison_outcome: str = "INCONCLUSIVE"  # IMPROVED, UNCHANGED, WORSENED, INCONCLUSIVE
    comparison_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
