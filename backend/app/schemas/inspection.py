import math
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import Optional, List, Dict, Any

# Controlled Vocabularies for Phase 15B
VALID_INSPECTION_DECISIONS = {
    "CONFIRMED_BY_TRAINER",
    "REFUTED_BY_TRAINER",
    "INCONCLUSIVE",
    "INSUFFICIENT_EVIDENCE"
}

VALID_INSPECTION_STATUSES = {
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED"
}

VALID_STEP_STATUSES = {
    "PENDING",
    "COMPLETED",
    "SKIPPED",
    "FOLLOW_UP_REQUIRED"
}

VALID_EVIDENCE_TYPES = {
    "TELEMETRY_READING",
    "SAFETY_EVENT",
    "SENSOR_HEALTH",
    "BASELINE_REFERENCE",
    "TRAINER_OBSERVATION",
    "MANUAL_MEASUREMENT"
}

VALID_EVIDENCE_SOURCES = {
    "MANUAL",
    "SENSOR",
    "BASELINE",
    "CALCULATED"
}

VALID_INTERVENTION_CATEGORIES = {
    "WORKHOLDING_ADJUSTMENT",
    "TOOL_INSPECTION",
    "SPEED_FEED_ADJUSTMENT",
    "COOLANT_RESTORE",
    "SHUTDOWN_CHECK",
    "OTHER"
}

VALID_INTERVENTION_OUTCOMES = {
    "IMPROVED",
    "UNCHANGED",
    "WORSENED",
    "INCONCLUSIVE"
}

VALID_EVIDENCE_QUALITY_STATUSES = {
    "SUFFICIENT",
    "DEGRADED",
    "INSUFFICIENT"
}

VALID_TREND_STATES = {
    "TRANSIENT",
    "PERSISTENT",
    "ESCALATING",
    "RECOVERING",
    "UNKNOWN"
}


class InspectionStepItem(BaseModel):
    step_id: str
    instruction: str
    component: Optional[str] = None
    reference_position: Optional[str] = None
    status: str = "PENDING"
    observation: Optional[str] = None
    evidence_reference: Optional[str] = None
    completed_at: Optional[datetime] = None

    @field_validator("status")
    @classmethod
    def validate_step_status(cls, v: str) -> str:
        v_upper = v.upper().strip()
        if v_upper not in VALID_STEP_STATUSES:
            raise ValueError(f"Step status must be one of {sorted(VALID_STEP_STATUSES)}")
        return v_upper


class InspectionStepUpdate(BaseModel):
    status: str
    observation: Optional[str] = None
    evidence_reference: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_step_status(cls, v: str) -> str:
        v_upper = v.upper().strip()
        if v_upper not in VALID_STEP_STATUSES:
            raise ValueError(f"Step status must be one of {sorted(VALID_STEP_STATUSES)}")
        return v_upper


class InspectionCreate(BaseModel):
    inspection_id: str
    session_id: str
    device_id: Optional[str] = None
    zone_id: Optional[str] = None
    machine_id: Optional[str] = None
    event_id: Optional[str] = None
    trainer_id: Optional[str] = None
    template_id: Optional[str] = None
    reason: str
    checklist: Optional[List[InspectionStepItem]] = None
    measurement_source: Optional[str] = "MANUAL_OBSERVATION"
    sensor_health_state: Optional[str] = "UNKNOWN"
    machine_state: Optional[str] = "UNKNOWN"
    baseline_id: Optional[str] = None
    trainer_notes: Optional[str] = None

    @field_validator("inspection_id", "session_id", "reason")
    @classmethod
    def must_not_be_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field must not be empty or whitespace")
        return v.strip()


class InspectionComplete(BaseModel):
    decision: str
    outcome_notes: Optional[str] = None
    trainer_notes: Optional[str] = None

    @field_validator("decision")
    @classmethod
    def validate_decision(cls, v: str) -> str:
        v_upper = v.upper().strip()
        if v_upper not in VALID_INSPECTION_DECISIONS:
            raise ValueError(f"Decision must be one of {sorted(VALID_INSPECTION_DECISIONS)}")
        return v_upper


class InspectionEvidenceCreate(BaseModel):
    evidence_id: str
    evidence_type: str
    source: str = "MANUAL"
    reference_id: Optional[str] = None
    value: Optional[float] = None
    unit: Optional[str] = None
    notes: Optional[str] = None
    timestamp: Optional[datetime] = None

    @field_validator("evidence_id")
    @classmethod
    def must_not_be_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("evidence_id must not be empty")
        return v.strip()

    @field_validator("evidence_type")
    @classmethod
    def validate_evidence_type(cls, v: str) -> str:
        v_upper = v.upper().strip()
        if v_upper not in VALID_EVIDENCE_TYPES:
            raise ValueError(f"evidence_type must be one of {sorted(VALID_EVIDENCE_TYPES)}")
        return v_upper

    @field_validator("source")
    @classmethod
    def validate_source(cls, v: str) -> str:
        v_upper = v.upper().strip()
        if v_upper not in VALID_EVIDENCE_SOURCES:
            raise ValueError(f"source must be one of {sorted(VALID_EVIDENCE_SOURCES)}")
        return v_upper

    @field_validator("value")
    @classmethod
    def validate_value(cls, v: Optional[float]) -> Optional[float]:
        if v is not None:
            if not math.isfinite(v):
                raise ValueError("Evidence value must be a finite numeric value")
            if not (-1e9 <= v <= 1e9):
                raise ValueError("Evidence value is outside realistic bounds")
        return v


class InspectionEvidenceRead(BaseModel):
    id: int
    evidence_id: str
    inspection_id: str
    session_id: str
    evidence_type: str
    source: str
    reference_id: Optional[str] = None
    value: Optional[float] = None
    unit: Optional[str] = None
    notes: Optional[str] = None
    timestamp: datetime
    created_at: datetime


class InspectionRead(BaseModel):
    id: int
    inspection_id: str
    session_id: str
    device_id: Optional[str] = None
    zone_id: Optional[str] = None
    machine_id: Optional[str] = None
    event_id: Optional[str] = None
    trainer_id: Optional[str] = None
    template_id: Optional[str] = None
    status: str
    decision: Optional[str] = None
    reason: str
    checklist: List[InspectionStepItem] = []
    measurement_source: Optional[str] = None
    sensor_health_state: Optional[str] = None
    machine_state: Optional[str] = None
    baseline_id: Optional[str] = None
    trainer_notes: Optional[str] = None
    outcome_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    evidence_items: List[InspectionEvidenceRead] = []


class TrainerInterventionCreate(BaseModel):
    intervention_id: str
    session_id: str
    inspection_id: Optional[str] = None
    event_id: Optional[str] = None
    machine_id: Optional[str] = None
    trainer_id: Optional[str] = None
    category: str
    notes: str = Field(max_length=2000)
    timestamp: Optional[datetime] = None
    before_window_data: Optional[Dict[str, Any]] = None
    after_window_data: Optional[Dict[str, Any]] = None
    comparison_notes: Optional[str] = None

    @field_validator("intervention_id", "session_id", "notes")
    @classmethod
    def must_not_be_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Field must not be empty or whitespace")
        return v.strip()

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        v_upper = v.upper().strip()
        if v_upper not in VALID_INTERVENTION_CATEGORIES:
            raise ValueError(f"category must be one of {sorted(VALID_INTERVENTION_CATEGORIES)}")
        return v_upper


class TrainerInterventionRead(BaseModel):
    id: int
    intervention_id: str
    session_id: str
    inspection_id: Optional[str] = None
    event_id: Optional[str] = None
    machine_id: Optional[str] = None
    trainer_id: Optional[str] = None
    category: str
    notes: str
    timestamp: datetime
    before_window_data: Optional[Dict[str, Any]] = None
    after_window_data: Optional[Dict[str, Any]] = None
    comparison_outcome: str
    comparison_notes: Optional[str] = None
    created_at: datetime


class EvidenceQualityAssessmentResponse(BaseModel):
    status: str  # SUFFICIENT, DEGRADED, INSUFFICIENT
    quality_issues: List[str]
    supporting_evidence_refs: List[str]
    missing_evidence_requirements: List[str]
    explanation: str
    assessment_timestamp: datetime


class InspectionTemplateRead(BaseModel):
    template_id: str
    title: str
    category: str
    description: str
    steps: List[InspectionStepItem]
