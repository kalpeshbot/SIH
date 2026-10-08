from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.database.database import get_session
from app.models.zone import Zone
from app.models.device import Device
from app.schemas.zone import ZoneCreate, ZoneUpdate

router = APIRouter(prefix="/api/zones", tags=["Zones"])

@router.get("")
def read_zones(session: Session = Depends(get_session)):
    return session.exec(select(Zone)).all()

@router.get("/{id}")
def read_zone(id: int, session: Session = Depends(get_session)):
    zone = session.get(Zone, id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    return zone

@router.post("", status_code=status.HTTP_201_CREATED)
def create_zone(zone: ZoneCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(Zone).where(Zone.zone_id == zone.zone_id)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Zone ID already exists")
    db_zone = Zone.model_validate(zone)
    session.add(db_zone)
    session.commit()
    session.refresh(db_zone)
    return db_zone

@router.patch("/{id}")
def update_zone(id: int, zone_update: ZoneUpdate, session: Session = Depends(get_session)):
    db_zone = session.get(Zone, id)
    if not db_zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    update_data = zone_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_zone, key, value)
    session.add(db_zone)
    session.commit()
    session.refresh(db_zone)
    return db_zone

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_zone(id: int, session: Session = Depends(get_session)):
    zone = session.get(Zone, id)
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    # Safety: block deletion if zone has devices assigned
    devices_exist = session.exec(
        select(Device).where(Device.zone_id == zone.zone_id)
    ).first()
    if devices_exist:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete zone with assigned devices. Reassign or remove devices first."
        )
    session.delete(zone)
    session.commit()
