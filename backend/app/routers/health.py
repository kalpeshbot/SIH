from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from app.database.database import get_session

router = APIRouter(tags=["Health"])

@router.get("/health")
def health_check(session: Session = Depends(get_session)):
    db_status = "connected"
    try:
        session.exec(select(1)).first()
    except Exception:
        db_status = "disconnected"
        
    return {
        "status": "ok",
        "service": "sih-backend",
        "database": db_status
    }
