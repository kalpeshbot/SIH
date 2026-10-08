from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.database.database import get_session
from app.models.device import Device
from app.schemas.device import DeviceCreate, DeviceUpdate

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
        
    session.add(db_device)
    session.commit()
    session.refresh(db_device)
    return db_device

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_device(id: int, session: Session = Depends(get_session)):
    device = session.get(Device, id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    session.delete(device)
    session.commit()
