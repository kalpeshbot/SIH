from fastapi import APIRouter, Depends, status
from sqlmodel import Session, select
from app.database.database import get_session
from app.models.reading import SensorReading
from app.models.alert import Alert
from app.schemas.reading import SensorReadingCreate
from app.services.alert_engine import evaluate_reading

router = APIRouter(prefix="/api/readings", tags=["Sensor Readings"])

@router.post("", status_code=status.HTTP_201_CREATED)
def create_reading(reading: SensorReadingCreate, session: Session = Depends(get_session)):
    db_reading = SensorReading.model_validate(reading)
    session.add(db_reading)
    
    # Evaluate for alerts
    alert = evaluate_reading(db_reading)
    if alert:
        session.add(alert)
        
    session.commit()
    session.refresh(db_reading)
    
    return db_reading
