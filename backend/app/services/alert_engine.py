import logging
from app.models.reading import SensorReading
from app.models.alert import Alert

logger = logging.getLogger(__name__)

# Prototype thresholds - MUST BE CALIBRATED LATER
WARNING_THRESHOLD = 50.0
DANGER_THRESHOLD = 80.0
ESCALATION_TIME_SECONDS = 300

def evaluate_reading(reading: SensorReading) -> Alert | None:
    """
    Evaluates a sensor reading and generates an alert if prototype thresholds are exceeded.
    """
    if reading.sensor_type == "GAS_LEVEL":
        if reading.value >= DANGER_THRESHOLD:
            return Alert(
                session_id=reading.session_id,
                device_id=reading.device_id,
                hazard_type="GAS",
                severity="DANGER",
                message=f"DANGER: Gas level {reading.value} exceeds {DANGER_THRESHOLD}"
            )
        elif reading.value >= WARNING_THRESHOLD:
            return Alert(
                session_id=reading.session_id,
                device_id=reading.device_id,
                hazard_type="GAS",
                severity="WARNING",
                message=f"WARNING: Gas level {reading.value} exceeds {WARNING_THRESHOLD}"
            )
    return None
