from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.database.database import get_session
from app.models.trainee import Trainee
from app.schemas.trainee import TraineeCreate, TraineeUpdate

router = APIRouter(prefix="/api/trainees", tags=["Trainees"])

@router.get("")
def read_trainees(session: Session = Depends(get_session)):
    return session.exec(select(Trainee)).all()

@router.get("/{id}")
def read_trainee(id: int, session: Session = Depends(get_session)):
    trainee = session.get(Trainee, id)
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")
    return trainee

@router.post("", status_code=status.HTTP_201_CREATED)
def create_trainee(trainee: TraineeCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(Trainee).where(Trainee.trainee_id == trainee.trainee_id)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Trainee ID already exists")
    
    db_trainee = Trainee.model_validate(trainee)
    session.add(db_trainee)
    session.commit()
    session.refresh(db_trainee)
    return db_trainee

@router.patch("/{id}")
def update_trainee(id: int, trainee_update: TraineeUpdate, session: Session = Depends(get_session)):
    db_trainee = session.get(Trainee, id)
    if not db_trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")
    
    update_data = trainee_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_trainee, key, value)
        
    session.add(db_trainee)
    session.commit()
    session.refresh(db_trainee)
    return db_trainee

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_trainee(id: int, session: Session = Depends(get_session)):
    trainee = session.get(Trainee, id)
    if not trainee:
        raise HTTPException(status_code=404, detail="Trainee not found")
    session.delete(trainee)
    session.commit()
