from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from datetime import datetime, timezone
from app.database.database import get_session
from app.models.reading import SensorReading
from app.models.alert import Alert
from app.models.session import Session as DBSession
from app.models.device import Device
from app.schemas.reading import SensorReadingCreate
from app.services.alert_engine import evaluate_reading

router = APIRouter(prefix="/api/readings", tags=["Sensor Readings"])

@router.post("", status_code=status.HTTP_201_CREATED)
def create_reading(reading: SensorReadingCreate, session: Session = Depends(get_session)):
    # Validate session exists
    db_sess = session.exec(select(DBSession).where(DBSession.session_id == reading.session_id)).first()
    if not db_sess:
        raise HTTPException(status_code=400, detail="Invalid session_id: session does not exist")

    # Validate session is still active
    if db_sess.status not in ("ACTIVE",):
        raise HTTPException(status_code=400, detail=f"Session is {db_sess.status}; cannot add readings to a closed session")

    # Validate device exists and update last_seen
    db_device = session.exec(select(Device).where(Device.device_id == reading.device_id)).first()
    if not db_device:
        raise HTTPException(status_code=400, detail="Invalid device_id: device does not exist")

    # Validate device/session assignment consistency
    if db_sess.device_id != reading.device_id:
        raise HTTPException(
            status_code=400,
            detail=f"Device '{reading.device_id}' is not assigned to session '{reading.session_id}' (assigned device is '{db_sess.device_id}')",
        )

    db_device.last_seen = datetime.now(timezone.utc)
    session.add(db_device)

    # Resolve timestamp
    ts = reading.timestamp if reading.timestamp is not None else datetime.now(timezone.utc)

    db_reading = SensorReading(
        session_id=reading.session_id,
        device_id=reading.device_id,
        sensor_type=reading.sensor_type,
        value=reading.value,
        unit=reading.unit,
        status=reading.status,
        timestamp=ts,
    )
    session.add(db_reading)

    # Evaluate for alerts with deduplication
    alert = evaluate_reading(db_reading)
    if alert:
        # Deduplication: only create a new alert if no active alert of same severity exists for this session+hazard_type
        existing_alert = session.exec(
            select(Alert).where(
                Alert.session_id == reading.session_id,
                Alert.hazard_type == alert.hazard_type,
                Alert.severity == alert.severity,
                Alert.acknowledged == False,
            )
        ).first()
        if not existing_alert:
            session.add(alert)

    session.commit()
    session.refresh(db_reading)
    return db_reading
