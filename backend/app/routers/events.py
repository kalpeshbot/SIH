from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select
from datetime import datetime, timezone
from typing import Optional, List

from app.database.database import get_session
from app.models.safety_event import SafetyEvent
from app.models.session import Session as DBSession
from app.models.device import Device
from app.models.zone import Zone
from app.schemas.intelligence import (
    SafetyEventCreate,
    SafetyEventRead,
    SafetyEventAcknowledge,
    SafetyEventResolve
)

router = APIRouter(prefix="/api/events", tags=["Safety Events"])


def _get_event_by_identifier(identifier: str, db: Session) -> SafetyEvent:
    if identifier.isdigit():
        event_by_id = db.get(SafetyEvent, int(identifier))
        if event_by_id:
            return event_by_id

    event_by_code = db.exec(
        select(SafetyEvent).where(SafetyEvent.event_id == identifier)
    ).first()
    if event_by_code:
        return event_by_code

    raise HTTPException(status_code=404, detail="Safety event not found")


@router.get("", response_model=List[SafetyEventRead])
def read_events(
    session_id: Optional[str] = Query(default=None),
    device_id: Optional[str] = Query(default=None),
    machine_id: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    severity: Optional[str] = Query(default=None),
    event_type: Optional[str] = Query(default=None),
    confidence_level: Optional[str] = Query(default=None),
    db: Session = Depends(get_session)
):
    """
    Retrieve safety events with optional filtering.
    """
    query = select(SafetyEvent)
    if session_id:
        query = query.where(SafetyEvent.session_id == session_id)
    if device_id:
        query = query.where(SafetyEvent.device_id == device_id)
    if machine_id:
        query = query.where(SafetyEvent.machine_id == machine_id)
    if status_filter:
        query = query.where(SafetyEvent.status == status_filter.upper())
    if severity:
        query = query.where(SafetyEvent.severity == severity.upper())
    if event_type:
        query = query.where(SafetyEvent.event_type == event_type.upper())
    if confidence_level:
        query = query.where(SafetyEvent.confidence_level == confidence_level.upper())
    
    query = query.order_by(SafetyEvent.started_at.desc())
    return db.exec(query).all()


@router.get("/{identifier}", response_model=SafetyEventRead)
def read_event(identifier: str, db: Session = Depends(get_session)):
    """
    Get a specific safety event by ID or event_id.
    """
    return _get_event_by_identifier(identifier, db)


@router.post("", response_model=SafetyEventRead, status_code=status.HTTP_201_CREATED)
def create_event(event_in: SafetyEventCreate, db: Session = Depends(get_session)):
    """
    Record a new structured safety event with foreign key and session lifecycle checks.
    """
    # 1. Unique event_id check
    existing = db.exec(
        select(SafetyEvent).where(SafetyEvent.event_id == event_in.event_id)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Event with event_id '{event_in.event_id}' already exists"
        )

    # 2. Session validation & closed-session protection
    sess = db.exec(
        select(DBSession).where(DBSession.session_id == event_in.session_id)
    ).first()
    if not sess:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session '{event_in.session_id}' not found"
        )
    if sess.status in {"COMPLETED", "CANCELLED"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot record safety event for closed session in '{sess.status}' status"
        )

    # 3. Device validation
    dev = db.exec(
        select(Device).where(Device.device_id == event_in.device_id)
    ).first()
    if not dev:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device '{event_in.device_id}' not found"
        )

    # 4. Zone validation (if provided)
    if event_in.zone_id:
        zn = db.exec(
            select(Zone).where(Zone.zone_id == event_in.zone_id)
        ).first()
        if not zn:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Zone '{event_in.zone_id}' not found"
            )

    now = datetime.now(timezone.utc)
    db_event = SafetyEvent(
        event_id=event_in.event_id,
        session_id=event_in.session_id,
        device_id=event_in.device_id,
        zone_id=event_in.zone_id,
        machine_id=event_in.machine_id,
        event_type=event_in.event_type,
        severity=event_in.severity,
        status=event_in.status,
        confidence_level=event_in.confidence_level,
        confidence_reason=event_in.confidence_reason,
        triggering_sensor_types=event_in.triggering_sensor_types,
        context_state=event_in.context_state,
        started_at=now,
        trainer_note=event_in.trainer_note,
        created_at=now,
        updated_at=now
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event


@router.post("/{identifier}/acknowledge", response_model=SafetyEventRead)
def acknowledge_event(
    identifier: str,
    ack_data: SafetyEventAcknowledge,
    db: Session = Depends(get_session)
):
    """
    Acknowledge a safety event.
    """
    event = _get_event_by_identifier(identifier, db)
    now = datetime.now(timezone.utc)
    
    event.status = "ACKNOWLEDGED"
    event.acknowledged_at = now
    event.updated_at = now
    if ack_data.trainer_note:
        event.trainer_note = ack_data.trainer_note

    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.post("/{identifier}/resolve", response_model=SafetyEventRead)
def resolve_event(
    identifier: str,
    res_data: SafetyEventResolve,
    db: Session = Depends(get_session)
):
    """
    Resolve a safety event and calculate duration.
    """
    event = _get_event_by_identifier(identifier, db)
    now = datetime.now(timezone.utc)
    
    event.status = "RESOLVED"
    event.resolved_at = now
    event.ended_at = now
    event.updated_at = now
    
    # Calculate duration
    if event.started_at:
        event.duration_seconds = max(0.0, (now - event.started_at).total_seconds())

    if res_data.trainer_note:
        event.trainer_note = res_data.trainer_note

    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.post("/{identifier}/dismiss", response_model=SafetyEventRead)
def dismiss_event(identifier: str, db: Session = Depends(get_session)):
    """
    Dismiss a safety event (e.g. false alarm or non-actionable).
    """
    event = _get_event_by_identifier(identifier, db)
    now = datetime.now(timezone.utc)
    
    event.status = "DISMISSED"
    event.ended_at = now
    event.updated_at = now
    if event.started_at:
        event.duration_seconds = max(0.0, (now - event.started_at).total_seconds())

    db.add(event)
    db.commit()
    db.refresh(event)
    return event
