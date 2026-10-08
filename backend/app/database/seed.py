from sqlmodel import Session, select
from app.database.database import engine
from app.models.trainee import Trainee
from app.models.zone import Zone
from app.models.device import Device

def seed_data():
    with Session(engine) as session:
        # Check if already seeded
        if session.exec(select(Trainee)).first():
            return
            
        trainees = [
            Trainee(trainee_id="TRN-001", name="Alice Smith"),
            Trainee(trainee_id="TRN-002", name="Bob Johnson"),
            Trainee(trainee_id="TRN-003", name="Charlie Brown")
        ]
        
        zones = [
            Zone(zone_id="BAY-A", name="Bay A", description="Assembly Bay A"),
            Zone(zone_id="BAY-B", name="Bay B", description="Welding Bay B"),
            Zone(zone_id="BAY-C", name="Bay C", description="Testing Bay C")
        ]
        
        session.add_all(trainees)
        session.add_all(zones)
        session.commit()
        
        devices = [
            Device(device_id="HANDHELD-001", device_type="HANDHELD", status="ONLINE", battery=95, zone_id="BAY-A"),
            Device(device_id="WEARABLE-001", device_type="WEARABLE", status="ONLINE", battery=88, zone_id="BAY-A"),
            Device(device_id="BEACON-A", device_type="BEACON", status="ONLINE", battery=100, zone_id="BAY-A")
        ]
        
        session.add_all(devices)
        session.commit()

if __name__ == "__main__":
    seed_data()
