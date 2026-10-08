from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from datetime import datetime, timezone
from app.database.database import get_session
from app.models.session import Session as DBSession
from app.models.trainee import Trainee
from app.models.device import Device
from app.models.reading import SensorReading
from app.schemas.session import SessionCreate, SessionUpdate

router = APIRouter(prefix="/api/sessions", tags=["Sessions"])

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
    # Validate trainee
    if not session.exec(select(Trainee).where(Trainee.trainee_id == sess_create.trainee_id)).first():
        raise HTTPException(status_code=400, detail="Invalid trainee_id")
        
    # Validate device
    if not session.exec(select(Device).where(Device.device_id == sess_create.device_id)).first():
        raise HTTPException(status_code=400, detail="Invalid device_id")
        
    existing = session.exec(select(DBSession).where(DBSession.session_id == sess_create.session_id)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Session ID already exists")
    
    db_sess = DBSession.model_validate(sess_create.model_dump(exclude_unset=True))
    session.add(db_sess)
    session.commit()
    session.refresh(db_sess)
    return db_sess

@router.patch("/{id}")
def update_session(id: int, sess_update: SessionUpdate, session: Session = Depends(get_session)):
    db_sess = session.get(DBSession, id)
    if not db_sess:
        raise HTTPException(status_code=404, detail="Session not found")
    
    update_data = sess_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_sess, key, value)
        
    session.add(db_sess)
    session.commit()
    session.refresh(db_sess)
    return db_sess

@router.get("/{session_id}/readings")
def read_session_readings(session_id: str, session: Session = Depends(get_session)):
    return session.exec(select(SensorReading).where(SensorReading.session_id == session_id)).all()
