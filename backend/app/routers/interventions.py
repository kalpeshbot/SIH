"""
MORD Trainer Intervention Router (Phase 15B)

Provides endpoints to record trainer corrective interventions and retrieve
before-and-after telemetry window comparisons.
"""

from typing import List, Optional
from datetime import datetime, timezone
import json
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.database.database import get_session
from app.models.inspection import TrainerIntervention, Inspection
from app.models.safety_event import SafetyEvent
from app.models.session import Session as DBSession
from app.schemas.inspection import (
    TrainerInterventionCreate,
    TrainerInterventionRead,
    VALID_INTERVENTION_CATEGORIES,
    VALID_INTERVENTION_OUTCOMES
)
from app.services.intervention_service import compare_intervention_effect

router = APIRouter(prefix="/api/interventions", tags=["Trainer Interventions"])


def _get_intervention_by_identifier(identifier: str, db: Session) -> TrainerIntervention:
    """Finds an intervention by integer primary key or unique intervention_id string."""
    if identifier.isdigit():
        inv_by_id = db.get(TrainerIntervention, int(identifier))
        if inv_by_id:
            return inv_by_id

    inv_by_code = db.exec(
        select(TrainerIntervention).where(TrainerIntervention.intervention_id == identifier)
    ).first()
    if inv_by_code:
        return inv_by_code

    raise HTTPException(status_code=404, detail=f"Intervention '{identifier}' not found")


def _format_intervention_read(inv: TrainerIntervention) -> TrainerInterventionRead:
    before_data = None
    if inv.before_window_json:
        try:
            before_data = json.loads(inv.before_window_json)
        except Exception:
            before_data = None

    after_data = None
    if inv.after_window_json:
        try:
            after_data = json.loads(inv.after_window_json)
        except Exception:
            after_data = None

    return TrainerInterventionRead(
        id=inv.id or 0,
        intervention_id=inv.intervention_id,
        session_id=inv.session_id,
        inspection_id=inv.inspection_id,
        event_id=inv.event_id,
        machine_id=inv.machine_id,
        trainer_id=inv.trainer_id,
        category=inv.category,
        notes=inv.notes,
        timestamp=inv.timestamp,
        before_window_data=before_data,
        after_window_data=after_data,
        comparison_outcome=inv.comparison_outcome,
        comparison_notes=inv.comparison_notes,
        created_at=inv.created_at
    )


@router.get("", response_model=List[TrainerInterventionRead])
def list_interventions(
    session_id: Optional[str] = Query(default=None),
    inspection_id: Optional[str] = Query(default=None),
    event_id: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    outcome: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_session)
):
    """Retrieve recorded trainer interventions with optional filtering."""
    query = select(TrainerIntervention)
    if session_id:
        query = query.where(TrainerIntervention.session_id == session_id)
    if inspection_id:
        query = query.where(TrainerIntervention.inspection_id == inspection_id)
    if event_id:
        query = query.where(TrainerIntervention.event_id == event_id)
    if category:
        query = query.where(TrainerIntervention.category == category.upper())
    if outcome:
        query = query.where(TrainerIntervention.comparison_outcome == outcome.upper())

    query = query.order_by(TrainerIntervention.timestamp.desc()).offset(offset).limit(limit)
    interventions = db.exec(query).all()
    return [_format_intervention_read(inv) for inv in interventions]


@router.post("", response_model=TrainerInterventionRead, status_code=status.HTTP_201_CREATED)
def create_intervention(
    data: TrainerInterventionCreate,
    db: Session = Depends(get_session)
):
    """
    Records a trainer intervention and computes before-and-after comparison.
    Performs cross-session validation against associated session, inspection, and safety event.
    """
    # 1. Unique intervention_id check
    existing = db.exec(
        select(TrainerIntervention).where(TrainerIntervention.intervention_id == data.intervention_id)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Intervention with intervention_id '{data.intervention_id}' already exists"
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

    # 3. Associated inspection validation (if provided)
    if data.inspection_id:
        insp = db.exec(
            select(Inspection).where(Inspection.inspection_id == data.inspection_id)
        ).first()
        if not insp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Associated Inspection '{data.inspection_id}' not found"
            )
        if insp.session_id != data.session_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Cross-session error: Inspection '{data.inspection_id}' belongs to session "
                    f"'{insp.session_id}', not '{data.session_id}'"
                )
            )

    # 4. Associated safety event validation (if provided)
    if data.event_id:
        se = db.exec(
            select(SafetyEvent).where(SafetyEvent.event_id == data.event_id)
        ).first()
        if not se:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Associated SafetyEvent '{data.event_id}' not found"
            )
        if se.session_id != data.session_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Cross-session error: SafetyEvent '{data.event_id}' belongs to session "
                    f"'{se.session_id}', not '{data.session_id}'"
                )
            )

    # 5. Evaluate before-and-after comparison
    comparison_res = compare_intervention_effect(
        before_window=data.before_window_data,
        after_window=data.after_window_data
    )

    now = datetime.now(timezone.utc)
    inv_ts = data.timestamp or now

    notes_text = data.comparison_notes or comparison_res["comparison_notes"]

    new_inv = TrainerIntervention(
        intervention_id=data.intervention_id,
        session_id=data.session_id,
        inspection_id=data.inspection_id,
        event_id=data.event_id,
        machine_id=data.machine_id,
        trainer_id=data.trainer_id,
        category=data.category,
        notes=data.notes,
        timestamp=inv_ts,
        before_window_json=json.dumps(data.before_window_data) if data.before_window_data else None,
        after_window_json=json.dumps(data.after_window_data) if data.after_window_data else None,
        comparison_outcome=comparison_res["comparison_outcome"],
        comparison_notes=notes_text,
        created_at=now
    )

    db.add(new_inv)
    db.commit()
    db.refresh(new_inv)

    return _format_intervention_read(new_inv)


@router.get("/{identifier}", response_model=TrainerInterventionRead)
def get_intervention(identifier: str, db: Session = Depends(get_session)):
    """Retrieve details of a single trainer intervention."""
    inv = _get_intervention_by_identifier(identifier, db)
    return _format_intervention_read(inv)
