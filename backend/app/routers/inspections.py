"""
MORD Evidence-Guided Inspection Router (Phase 15B)

Provides complete inspection workflow endpoints:
- Template listing and route initialization
- Inspection record lifecycle (create, update step, add evidence, complete, cancel)
- Evidence quality assessment
- Maintenance-ready JSON / CSV export with formula injection defense
"""

import json
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import JSONResponse
from sqlmodel import Session, select

from app.database.database import get_session
from app.models.inspection import Inspection, InspectionEvidence, TrainerIntervention
from app.models.safety_event import SafetyEvent, MachineBaseline
from app.models.session import Session as DBSession
from app.models.device import Device
from app.models.zone import Zone
from app.schemas.inspection import (
    InspectionCreate,
    InspectionRead,
    InspectionComplete,
    InspectionStepUpdate,
    InspectionStepItem,
    InspectionEvidenceCreate,
    InspectionEvidenceRead,
    InspectionTemplateRead,
    EvidenceQualityAssessmentResponse,
    VALID_INSPECTION_DECISIONS,
    VALID_STEP_STATUSES
)
from app.services.inspection_templates import (
    get_all_templates,
    get_template_by_id,
    instantiate_template_steps
)
from app.services.evidence_quality_engine import assess_evidence_quality
from app.services.export_service import export_inspection_json, export_inspection_csv

router = APIRouter(prefix="/api/inspections", tags=["Evidence-Guided Inspection"])


def _get_inspection_by_identifier(identifier: str, db: Session) -> Inspection:
    """Finds an inspection by integer primary key or unique inspection_id string."""
    if identifier.isdigit():
        insp_by_id = db.get(Inspection, int(identifier))
        if insp_by_id:
            return insp_by_id

    insp_by_code = db.exec(
        select(Inspection).where(Inspection.inspection_id == identifier)
    ).first()
    if insp_by_code:
        return insp_by_code

    raise HTTPException(status_code=404, detail=f"Inspection '{identifier}' not found")


def _format_inspection_read(insp: Inspection, db: Session) -> InspectionRead:
    """Helper to deserialize checklist JSON and attach evidence items."""
    checklist_items: List[InspectionStepItem] = []
    if insp.checklist_json:
        try:
            raw_list = json.loads(insp.checklist_json)
            checklist_items = [InspectionStepItem(**item) for item in raw_list]
        except Exception:
            checklist_items = []

    evidence_records = db.exec(
        select(InspectionEvidence)
        .where(InspectionEvidence.inspection_id == insp.inspection_id)
        .order_by(InspectionEvidence.timestamp.asc())  # type: ignore
    ).all()

    evidence_reads = [
        InspectionEvidenceRead(
            id=e.id or 0,
            evidence_id=e.evidence_id,
            inspection_id=e.inspection_id,
            session_id=e.session_id,
            evidence_type=e.evidence_type,
            source=e.source,
            reference_id=e.reference_id,
            value=e.value,
            unit=e.unit,
            notes=e.notes,
            timestamp=e.timestamp,
            created_at=e.created_at
        )
        for e in evidence_records
    ]

    return InspectionRead(
        id=insp.id or 0,
        inspection_id=insp.inspection_id,
        session_id=insp.session_id,
        device_id=insp.device_id,
        zone_id=insp.zone_id,
        machine_id=insp.machine_id,
        event_id=insp.event_id,
        trainer_id=insp.trainer_id,
        template_id=insp.template_id,
        status=insp.status,
        decision=insp.decision,
        reason=insp.reason,
        checklist=checklist_items,
        measurement_source=insp.measurement_source,
        sensor_health_state=insp.sensor_health_state,
        machine_state=insp.machine_state,
        baseline_id=insp.baseline_id,
        trainer_notes=insp.trainer_notes,
        outcome_notes=insp.outcome_notes,
        created_at=insp.created_at,
        updated_at=insp.updated_at,
        completed_at=insp.completed_at,
        evidence_items=evidence_reads
    )


# =========================================================================
# TEMPLATES ENDPOINTS
# =========================================================================

@router.get("/templates", response_model=List[InspectionTemplateRead])
def list_inspection_templates():
    """Retrieve all standard reusable inspection route templates."""
    return get_all_templates()


@router.get("/templates/{template_id}", response_model=InspectionTemplateRead)
def get_inspection_template(template_id: str):
    """Retrieve a specific reusable inspection template."""
    tmpl = get_template_by_id(template_id)
    if not tmpl:
        raise HTTPException(status_code=404, detail=f"Inspection template '{template_id}' not found")
    return tmpl


# =========================================================================
# INSPECTION CRUD & WORKFLOW
# =========================================================================

@router.get("", response_model=List[InspectionRead])
def list_inspections(
    session_id: Optional[str] = Query(default=None),
    machine_id: Optional[str] = Query(default=None),
    zone_id: Optional[str] = Query(default=None),
    event_id: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    decision: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_session)
):
    """List inspections with optional filtering and pagination."""
    query = select(Inspection)
    if session_id:
        query = query.where(Inspection.session_id == session_id)
    if machine_id:
        query = query.where(Inspection.machine_id == machine_id)
    if zone_id:
        query = query.where(Inspection.zone_id == zone_id)
    if event_id:
        query = query.where(Inspection.event_id == event_id)
    if status_filter:
        query = query.where(Inspection.status == status_filter.upper())
    if decision:
        query = query.where(Inspection.decision == decision.upper())

    query = query.order_by(Inspection.created_at.desc()).offset(offset).limit(limit)
    inspections = db.exec(query).all()
    return [_format_inspection_read(i, db) for i in inspections]


@router.post("", response_model=InspectionRead, status_code=status.HTTP_201_CREATED)
def create_inspection(
    data: InspectionCreate,
    db: Session = Depends(get_session)
):
    """
    Creates an inspection record.
    Performs cross-session validation, event association check, and checklist initialization.
    """
    # 1. Unique ID check
    existing = db.exec(
        select(Inspection).where(Inspection.inspection_id == data.inspection_id)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Inspection with inspection_id '{data.inspection_id}' already exists"
        )

    # 2. Session validation
    sess = db.exec(
        select(DBSession).where(DBSession.session_id == data.session_id)
    ).first()
    if not sess:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{data.session_id}' not found"
        )

    # 3. Associated safety event check (if provided)
    if data.event_id:
        event = db.exec(
            select(SafetyEvent).where(SafetyEvent.event_id == data.event_id)
        ).first()
        if not event:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Associated SafetyEvent '{data.event_id}' not found"
            )
        # Prevent cross-session mismatch
        if event.session_id != data.session_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Cross-session reference error: SafetyEvent '{data.event_id}' belongs to session "
                    f"'{event.session_id}', not '{data.session_id}'"
                )
            )

    # 4. Initialize checklist from template or input
    checklist_steps = []
    if data.checklist:
        checklist_steps = [s.model_dump(mode="json") for s in data.checklist]
    elif data.template_id:
        instantiated = instantiate_template_steps(data.template_id)
        checklist_steps = [s.model_dump(mode="json") for s in instantiated]

    now = datetime.now(timezone.utc)
    new_insp = Inspection(
        inspection_id=data.inspection_id,
        session_id=data.session_id,
        device_id=data.device_id or (sess.device_id if sess else None),
        zone_id=data.zone_id or (sess.zone_id if sess else None),
        machine_id=data.machine_id,
        event_id=data.event_id,
        trainer_id=data.trainer_id,
        template_id=data.template_id,
        status="IN_PROGRESS",
        decision=None,
        reason=data.reason,
        checklist_json=json.dumps(checklist_steps),
        measurement_source=data.measurement_source or "MANUAL_OBSERVATION",
        sensor_health_state=data.sensor_health_state or "UNKNOWN",
        machine_state=data.machine_state or "UNKNOWN",
        baseline_id=data.baseline_id,
        trainer_notes=data.trainer_notes,
        outcome_notes=None,
        created_at=now,
        updated_at=now,
        completed_at=None
    )

    db.add(new_insp)
    db.commit()
    db.refresh(new_insp)

    return _format_inspection_read(new_insp, db)


@router.get("/{identifier}", response_model=InspectionRead)
def get_inspection(identifier: str, db: Session = Depends(get_session)):
    """Retrieve full details for an inspection, including checklist and evidence items."""
    insp = _get_inspection_by_identifier(identifier, db)
    return _format_inspection_read(insp, db)


@router.patch("/{identifier}/steps/{step_id}", response_model=InspectionRead)
def update_inspection_step(
    identifier: str,
    step_id: str,
    update_data: InspectionStepUpdate,
    db: Session = Depends(get_session)
):
    """
    Updates the status, observation, and evidence reference for an individual checklist step.
    Valid statuses: PENDING, COMPLETED, SKIPPED, FOLLOW_UP_REQUIRED.
    """
    insp = _get_inspection_by_identifier(identifier, db)
    if insp.status == "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify steps of a completed inspection"
        )

    steps: List[Dict] = []
    if insp.checklist_json:
        try:
            steps = json.loads(insp.checklist_json)
        except Exception:
            steps = []

    step_found = False
    now = datetime.now(timezone.utc)
    for s in steps:
        if s.get("step_id") == step_id:
            step_found = True
            s["status"] = update_data.status
            if update_data.observation is not None:
                s["observation"] = update_data.observation
            if update_data.evidence_reference is not None:
                s["evidence_reference"] = update_data.evidence_reference
            if update_data.status in {"COMPLETED", "SKIPPED"}:
                s["completed_at"] = now.isoformat()
            break

    if not step_found:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Step '{step_id}' not found in inspection checklist"
        )

    insp.checklist_json = json.dumps(steps)
    insp.updated_at = now
    db.add(insp)
    db.commit()
    db.refresh(insp)

    return _format_inspection_read(insp, db)


@router.post("/{identifier}/evidence", response_model=InspectionEvidenceRead, status_code=status.HTTP_201_CREATED)
def add_inspection_evidence(
    identifier: str,
    evidence_in: InspectionEvidenceCreate,
    db: Session = Depends(get_session)
):
    """
    Records a structured evidence item (manual measurement, observation, telemetry ref)
    associated with an inspection.
    """
    insp = _get_inspection_by_identifier(identifier, db)

    # Unique evidence_id check
    existing = db.exec(
        select(InspectionEvidence).where(InspectionEvidence.evidence_id == evidence_in.evidence_id)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Evidence record with evidence_id '{evidence_in.evidence_id}' already exists"
        )

    now = datetime.now(timezone.utc)
    item_ts = evidence_in.timestamp or now

    ev_record = InspectionEvidence(
        evidence_id=evidence_in.evidence_id,
        inspection_id=insp.inspection_id,
        session_id=insp.session_id,
        evidence_type=evidence_in.evidence_type,
        source=evidence_in.source,
        reference_id=evidence_in.reference_id,
        value=evidence_in.value,
        unit=evidence_in.unit,
        notes=evidence_in.notes,
        timestamp=item_ts,
        created_at=now
    )

    db.add(ev_record)
    insp.updated_at = now
    db.add(insp)
    db.commit()
    db.refresh(ev_record)

    return InspectionEvidenceRead(
        id=ev_record.id or 0,
        evidence_id=ev_record.evidence_id,
        inspection_id=ev_record.inspection_id,
        session_id=ev_record.session_id,
        evidence_type=ev_record.evidence_type,
        source=ev_record.source,
        reference_id=ev_record.reference_id,
        value=ev_record.value,
        unit=ev_record.unit,
        notes=ev_record.notes,
        timestamp=ev_record.timestamp,
        created_at=ev_record.created_at
    )


@router.post("/{identifier}/complete", response_model=InspectionRead)
def complete_inspection(
    identifier: str,
    data: InspectionComplete,
    db: Session = Depends(get_session)
):
    """
    Finalizes an inspection by recording the trainer's conclusive decision.
    Valid decisions: CONFIRMED_BY_TRAINER, REFUTED_BY_TRAINER, INCONCLUSIVE, INSUFFICIENT_EVIDENCE.
    """
    insp = _get_inspection_by_identifier(identifier, db)
    if insp.status == "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inspection is already completed"
        )

    now = datetime.now(timezone.utc)
    insp.status = "COMPLETED"
    insp.decision = data.decision
    if data.outcome_notes:
        insp.outcome_notes = data.outcome_notes
    if data.trainer_notes:
        insp.trainer_notes = data.trainer_notes
    insp.completed_at = now
    insp.updated_at = now

    db.add(insp)
    db.commit()
    db.refresh(insp)

    return _format_inspection_read(insp, db)


@router.post("/{identifier}/cancel", response_model=InspectionRead)
def cancel_inspection(
    identifier: str,
    cancellation_notes: Optional[str] = None,
    db: Session = Depends(get_session)
):
    """Cancels an inspection without recording a final validation decision."""
    insp = _get_inspection_by_identifier(identifier, db)
    if insp.status == "COMPLETED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot cancel an already completed inspection"
        )

    now = datetime.now(timezone.utc)
    insp.status = "CANCELLED"
    if cancellation_notes:
        insp.outcome_notes = f"CANCELLED: {cancellation_notes}"
    insp.updated_at = now

    db.add(insp)
    db.commit()
    db.refresh(insp)

    return _format_inspection_read(insp, db)


# =========================================================================
# EVIDENCE QUALITY ASSESSMENT
# =========================================================================

@router.get("/{identifier}/evidence-quality", response_model=EvidenceQualityAssessmentResponse)
def evaluate_inspection_evidence_quality(
    identifier: str,
    db: Session = Depends(get_session)
):
    """
    Performs deterministic evidence quality evaluation for this inspection record.
    Evaluates sensor health, baseline sample depth, missing data, and stale windows.
    """
    insp = _get_inspection_by_identifier(identifier, db)

    evidence_records = db.exec(
        select(InspectionEvidence)
        .where(InspectionEvidence.inspection_id == insp.inspection_id)
    ).all()

    baseline = None
    if insp.baseline_id:
        baseline = db.exec(
            select(MachineBaseline).where(MachineBaseline.baseline_id == insp.baseline_id)
        ).first()

    return assess_evidence_quality(
        readings=[],
        evidence_items=evidence_records,
        sensor_health_statuses={"PRIMARY": insp.sensor_health_state or "UNKNOWN"},
        baseline=baseline,
        machine_state=insp.machine_state,
        require_baseline=bool(insp.baseline_id)
    )


# =========================================================================
# MAINTENANCE EXPORT (JSON & CSV)
# =========================================================================

@router.get("/{identifier}/export")
def export_inspection_record(
    identifier: str,
    format: str = Query(default="json"),
    db: Session = Depends(get_session)
):
    """
    Exports a comprehensive inspection package in structured JSON or spreadsheet-safe CSV.
    Neutralizes CSV formula injection characters dynamically.
    """
    insp = _get_inspection_by_identifier(identifier, db)
    fmt = format.lower().strip()

    if fmt == "json":
        data = export_inspection_json(insp, db)
        return JSONResponse(
            content=data,
            headers={
                "Content-Disposition": f'attachment; filename="inspection_{insp.inspection_id}.json"'
            }
        )
    elif fmt == "csv":
        csv_content = export_inspection_csv(insp, db)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="inspection_{insp.inspection_id}.csv"'
            }
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid format requested. Supported formats: 'json', 'csv'"
        )
