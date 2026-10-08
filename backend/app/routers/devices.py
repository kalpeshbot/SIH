from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.database.database import get_session
from app.models.device import Device
from app.models.reading import SensorReading
from app.schemas.device import DeviceCreate, DeviceUpdate
from datetime import datetime, timezone

router = APIRouter(prefix="/api/devices", tags=["Devices"])

@router.get("")
def read_devices(session: Session = Depends(get_session)):
    return session.exec(select(Device)).all()

@router.get("/{id}")
def read_device(id: int, session: Session = Depends(get_session)):
    device = session.get(Device, id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device

@router.post("", status_code=status.HTTP_201_CREATED)
def create_device(device: DeviceCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(Device).where(Device.device_id == device.device_id)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Device ID already exists")
    db_device = Device.model_validate(device)
    session.add(db_device)
    session.commit()
    session.refresh(db_device)
    return db_device

@router.patch("/{id}")
def update_device(id: int, device_update: DeviceUpdate, session: Session = Depends(get_session)):
    db_device = session.get(Device, id)
    if not db_device:
        raise HTTPException(status_code=404, detail="Device not found")
    update_data = device_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_device, key, value)
    
    now = datetime.now(timezone.utc)
    db_device.updated_at = now
    db_device.last_seen = now
    
    session.add(db_device)
    session.commit()
    session.refresh(db_device)
    return db_device

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_device(id: int, session: Session = Depends(get_session)):
    device = session.get(Device, id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    # Safety: block deletion if device has readings
    readings_exist = session.exec(
        select(SensorReading).where(SensorReading.device_id == device.device_id)
    ).first()
    if readings_exist:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete device with existing sensor readings. Historical data would be lost."
        )
    session.delete(device)
    session.commit()

@router.post("/{device_id}/heartbeat", status_code=status.HTTP_200_OK)
def device_heartbeat(device_id: str, session: Session = Depends(get_session)):
    db_device = session.exec(select(Device).where(Device.device_id == device_id)).first()
    if not db_device:
        raise HTTPException(status_code=404, detail="Device not found")
    db_device.last_seen = datetime.now(timezone.utc)
    session.add(db_device)
    session.commit()
    return {"status": "ok"}

