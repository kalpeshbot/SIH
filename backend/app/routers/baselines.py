from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select
from datetime import datetime, timezone
from typing import Optional, List

from app.database.database import get_session
from app.models.safety_event import MachineBaseline
from app.schemas.intelligence import MachineBaselineCreate, MachineBaselineRead

router = APIRouter(prefix="/api/baselines", tags=["Machine Baselines"])


@router.get("", response_model=List[MachineBaselineRead])
def read_baselines(
    machine_id: Optional[str] = Query(default=None),
    sensor_type: Optional[str] = Query(default=None),
    machine_state: Optional[str] = Query(default=None),
    feature_name: Optional[str] = Query(default=None),
    db: Session = Depends(get_session)
):
    """
    Retrieve machine baselines with optional filtering.
    """
    query = select(MachineBaseline)
    if machine_id:
        query = query.where(MachineBaseline.machine_id == machine_id)
    if sensor_type:
        query = query.where(MachineBaseline.sensor_type == sensor_type.upper())
    if machine_state:
        query = query.where(MachineBaseline.machine_state == machine_state.upper())
    if feature_name:
        query = query.where(MachineBaseline.feature_name == feature_name.upper())

    return db.exec(query).all()


@router.get("/{machine_id}", response_model=List[MachineBaselineRead])
def read_machine_baselines(machine_id: str, db: Session = Depends(get_session)):
    """
    Retrieve all baseline records for a specific machine.
    """
    baselines = db.exec(
        select(MachineBaseline).where(MachineBaseline.machine_id == machine_id)
    ).all()
    return baselines


@router.post("", response_model=MachineBaselineRead, status_code=status.HTTP_201_CREATED)
def create_or_update_baseline(
    baseline_in: MachineBaselineCreate,
    db: Session = Depends(get_session)
):
    """
    Record or update a machine operating baseline.
    """
    existing = db.exec(
        select(MachineBaseline).where(MachineBaseline.baseline_id == baseline_in.baseline_id)
    ).first()

    now = datetime.now(timezone.utc)
    if existing:
        existing.machine_id = baseline_in.machine_id
        existing.sensor_type = baseline_in.sensor_type
        existing.machine_state = baseline_in.machine_state
        existing.feature_name = baseline_in.feature_name
        existing.baseline_value = baseline_in.baseline_value
        existing.spread = baseline_in.spread
        existing.sample_count = baseline_in.sample_count
        existing.updated_at = now
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing

    db_baseline = MachineBaseline(
        baseline_id=baseline_in.baseline_id,
        machine_id=baseline_in.machine_id,
        sensor_type=baseline_in.sensor_type,
        machine_state=baseline_in.machine_state,
        feature_name=baseline_in.feature_name,
        baseline_value=baseline_in.baseline_value,
        spread=baseline_in.spread,
        sample_count=baseline_in.sample_count,
        created_at=now,
        updated_at=now
    )
    db.add(db_baseline)
    db.commit()
    db.refresh(db_baseline)
    return db_baseline
