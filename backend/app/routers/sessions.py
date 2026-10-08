from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import JSONResponse
from sqlmodel import Session, select
from datetime import datetime, timezone
from app.database.database import get_session
from app.models.session import Session as DBSession
from app.models.trainee import Trainee
from app.models.device import Device
from app.models.zone import Zone
from app.models.reading import SensorReading
from app.schemas.session import SessionCreate, SessionUpdate
from app.schemas.analytics import SessionAnalytics
from app.services.analytics_service import get_session_analytics
from app.services.export_service import (
    export_session_json,
    export_session_csv,
    export_readings_csv,
    export_alerts_csv,
)

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])

def _get_session_by_identifier(identifier: str, db: Session) -> DBSession:
    if identifier.isdigit():
        sess_by_id = db.get(DBSession, int(identifier))
        if sess_by_id:
            return sess_by_id
    
    sess_by_code = db.exec(
        select(DBSession).where(DBSession.session_id == identifier)
    ).first()
    if sess_by_code:
        return sess_by_code

    raise HTTPException(status_code=404, detail="Session not found")

# Valid lifecycle transitions: from_status -> set of allowed next statuses
ALLOWED_TRANSITIONS = {
    "ACTIVE":    {"COMPLETED", "CANCELLED", "FAULT"},
    "COMPLETED": set(),          # terminal state
    "CANCELLED": set(),          # terminal state
    "FAULT":     {"COMPLETED", "CANCELLED"},
}

# Terminal states that reject new readings
TERMINAL_STATES = {"COMPLETED", "CANCELLED"}


@router.get("")
def read_sessions(session: Session = Depends(get_session)):
    return session.exec(select(DBSession)).all()


@router.get("/{id}")
def read_session(id: int, session: Session = Depends(get_session)):
    db_sess = session.get(DBSession, id)
    if not db_sess:
        raise HTTPException(status_code=404, detail="Session not found")
    return db_sess


@router.post("", status_code=status.HTTP_201_CREATED)
def create_session(sess_create: SessionCreate, session: Session = Depends(get_session)):
    # Validate trainee exists
    trainee = session.exec(
        select(Trainee).where(Trainee.trainee_id == sess_create.trainee_id)
    ).first()
    if not trainee:
        raise HTTPException(status_code=400, detail=f"Invalid trainee_id: '{sess_create.trainee_id}' does not exist")

    # Validate device exists
    device = session.exec(
        select(Device).where(Device.device_id == sess_create.device_id)
    ).first()
    if not device:
        raise HTTPException(status_code=400, detail=f"Invalid device_id: '{sess_create.device_id}' does not exist")

    # Device exclusivity: reject if device already has an active session
    existing_active = session.exec(
        select(DBSession).where(
            DBSession.device_id == sess_create.device_id,
            DBSession.status == "ACTIVE",
        )
    ).first()
    if existing_active:
        raise HTTPException(
            status_code=409,
            detail=(
                f"Device '{sess_create.device_id}' is already assigned to active session "
                f"'{existing_active.session_id}'. Complete or cancel that session first."
            ),
        )

    # Validate zone exists if provided
    if sess_create.zone_id:
        zone = session.exec(
            select(Zone).where(Zone.zone_id == sess_create.zone_id)
        ).first()
        if not zone:
            raise HTTPException(
                status_code=400, detail=f"Invalid zone_id: '{sess_create.zone_id}' does not exist"
            )

    # Reject duplicate session ID
    existing = session.exec(
        select(DBSession).where(DBSession.session_id == sess_create.session_id)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Session ID already exists")

    db_sess = DBSession(
        session_id=sess_create.session_id,
        trainee_id=sess_create.trainee_id,
        device_id=sess_create.device_id,
        zone_id=sess_create.zone_id,
        session_type=sess_create.session_type,
        status="ACTIVE",
        start_time=sess_create.start_time or datetime.now(timezone.utc),
    )
    session.add(db_sess)
    session.commit()
    session.refresh(db_sess)
    return db_sess


@router.patch("/{id}")
def update_session(id: int, sess_update: SessionUpdate, session: Session = Depends(get_session)):
    db_sess = session.get(DBSession, id)
    if not db_sess:
        raise HTTPException(status_code=404, detail="Session not found")

    # Enforce lifecycle transitions
    if sess_update.status is not None:
        allowed = ALLOWED_TRANSITIONS.get(db_sess.status, set())
        if sess_update.status not in allowed:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Cannot transition session from '{db_sess.status}' to '{sess_update.status}'. "
                    f"Allowed transitions: {sorted(allowed) if allowed else 'none (terminal state)'}"
                ),
            )

    update_data = sess_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_sess, key, value)

    session.add(db_sess)
    session.commit()
    session.refresh(db_sess)
    return db_sess


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(id: int, session: Session = Depends(get_session)):
    db_sess = session.get(DBSession, id)
    if not db_sess:
        raise HTTPException(status_code=404, detail="Session not found")
    if db_sess.status == "ACTIVE":
        raise HTTPException(
            status_code=409,
            detail="Cannot delete an active session. Cancel it first.",
        )
    session.delete(db_sess)
    session.commit()


@router.get("/{session_id}/readings")
def read_session_readings(session_id: str, session: Session = Depends(get_session)):
    db_sess = session.exec(
        select(DBSession).where(DBSession.session_id == session_id)
    ).first()
    if not db_sess:
        raise HTTPException(status_code=404, detail="Session not found")
    return session.exec(
        select(SensorReading).where(SensorReading.session_id == session_id)
    ).all()


@router.get("/{identifier}/analytics", response_model=SessionAnalytics)
def get_session_analytics_endpoint(identifier: str, session: Session = Depends(get_session)):
    db_sess = _get_session_by_identifier(identifier, session)
    return get_session_analytics(db_sess, session)


@router.get("/{identifier}/export")
def export_session_endpoint(identifier: str, format: str = "csv", session: Session = Depends(get_session)):
    db_sess = _get_session_by_identifier(identifier, session)
    fmt = format.lower()
    if fmt == "json":
        data = export_session_json(db_sess, session)
        return JSONResponse(
            content=data,
            headers={
                "Content-Disposition": f'attachment; filename="session_{db_sess.session_id}_export.json"'
            },
        )
    elif fmt == "csv":
        csv_str = export_session_csv(db_sess, session)
        return Response(
            content=csv_str,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="session_{db_sess.session_id}_export.csv"'
            },
        )
    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid export format. Supported formats: 'csv', 'json'",
        )


@router.get("/{identifier}/export/readings")
def export_session_readings_endpoint(identifier: str, format: str = "csv", session: Session = Depends(get_session)):
    db_sess = _get_session_by_identifier(identifier, session)
    fmt = format.lower()
    if fmt == "json":
        readings = session.exec(
            select(SensorReading).where(SensorReading.session_id == db_sess.session_id)
        ).all()
        return [r.model_dump(mode="json") for r in readings]
    elif fmt == "csv":
        csv_str = export_readings_csv(db_sess, session)
        return Response(
            content=csv_str,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="readings_{db_sess.session_id}.csv"'
            },
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid export format. Supported formats: 'csv', 'json'")


@router.get("/{identifier}/export/alerts")
def export_session_alerts_endpoint(identifier: str, format: str = "csv", session: Session = Depends(get_session)):
    db_sess = _get_session_by_identifier(identifier, session)
    fmt = format.lower()
    if fmt == "json":
        from app.models.alert import Alert
        alerts = session.exec(
            select(Alert).where(Alert.session_id == db_sess.session_id)
        ).all()
        return [a.model_dump(mode="json") for a in alerts]
    elif fmt == "csv":
        csv_str = export_alerts_csv(db_sess, session)
        return Response(
            content=csv_str,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="alerts_{db_sess.session_id}.csv"'
            },
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid export format. Supported formats: 'csv', 'json'")

