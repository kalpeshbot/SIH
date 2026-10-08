from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.database.database import get_session
from app.models.alert import Alert
from app.schemas.alert import AlertCreate, AlertUpdate

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

@router.get("")
def read_alerts(session: Session = Depends(get_session)):
    return session.exec(select(Alert)).all()

@router.get("/{id}")
def read_alert(id: int, session: Session = Depends(get_session)):
    alert = session.get(Alert, id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert

@router.post("", status_code=status.HTTP_201_CREATED)
def create_alert(alert: AlertCreate, session: Session = Depends(get_session)):
    db_alert = Alert.model_validate(alert)
    session.add(db_alert)
    session.commit()
    session.refresh(db_alert)
    return db_alert

@router.patch("/{id}")
def update_alert(id: int, alert_update: AlertUpdate, session: Session = Depends(get_session)):
    db_alert = session.get(Alert, id)
    if not db_alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    update_data = alert_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_alert, key, value)
        
    session.add(db_alert)
    session.commit()
    session.refresh(db_alert)
    return db_alert
