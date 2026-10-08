import csv
import io
import json
from typing import Dict, Any
from sqlmodel import Session, select
from app.models.session import Session as DBSession
from app.models.reading import SensorReading
from app.models.alert import Alert
from app.services.analytics_service import get_session_analytics

def export_session_json(db_session: DBSession, db: Session) -> Dict[str, Any]:
    analytics = get_session_analytics(db_session, db)
    
    readings = db.exec(
        select(SensorReading)
        .where(SensorReading.session_id == db_session.session_id)
        .order_by(SensorReading.timestamp.asc()) # type: ignore
    ).all()

    alerts = db.exec(
        select(Alert)
        .where(Alert.session_id == db_session.session_id)
        .order_by(Alert.timestamp.desc()) # type: ignore
    ).all()

    return {
        "session_summary": analytics.session.model_dump(mode="json"),
        "reading_statistics": analytics.reading_stats.model_dump(mode="json"),
        "alert_statistics": analytics.alert_stats.model_dump(mode="json"),
        "readings": [
            {
                "id": r.id,
                "session_id": r.session_id,
                "device_id": r.device_id,
                "timestamp": r.timestamp.isoformat(),
                "sensor_type": r.sensor_type,
                "value": r.value,
                "unit": r.unit,
                "status": r.status,
            }
            for r in readings
        ],
        "alerts": [
            {
                "id": a.id,
                "session_id": a.session_id,
                "device_id": a.device_id,
                "timestamp": a.timestamp.isoformat(),
                "hazard_type": a.hazard_type,
                "severity": a.severity,
                "message": a.message,
                "acknowledged": a.acknowledged,
            }
            for a in alerts
        ],
    }


def export_session_csv(db_session: DBSession, db: Session) -> str:
    analytics = get_session_analytics(db_session, db)
    s = analytics.session

    readings = db.exec(
        select(SensorReading)
        .where(SensorReading.session_id == db_session.session_id)
        .order_by(SensorReading.timestamp.asc()) # type: ignore
    ).all()

    alerts = db.exec(
        select(Alert)
        .where(Alert.session_id == db_session.session_id)
        .order_by(Alert.timestamp.desc()) # type: ignore
    ).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # 1. Header / Summary Section
    writer.writerow(["=== SESSION SUMMARY ==="])
    writer.writerow([
        "session_id",
        "trainee_id",
        "device_id",
        "device_type",
        "firmware_version",
        "zone_id",
        "status",
        "session_type",
        "result",
        "start_time",
        "end_time",
        "duration_formatted",
        "reading_count",
        "alert_count",
    ])
    writer.writerow([
        s.session_id,
        s.trainee_id,
        s.device_id,
        s.device_type or "",
        s.firmware_version or "",
        s.zone_id or "",
        s.status,
        s.session_type,
        s.result or "",
        s.start_time.isoformat() if s.start_time else "",
        s.end_time.isoformat() if s.end_time else "",
        s.duration_formatted,
        s.reading_count,
        s.alert_count,
    ])
    writer.writerow([])

    # 2. Readings Section
    writer.writerow(["=== SENSOR READINGS ==="])
    writer.writerow(["timestamp", "session_id", "device_id", "sensor_type", "value", "unit", "status"])
    for r in readings:
        writer.writerow([
            r.timestamp.isoformat() if r.timestamp else "",
            r.session_id,
            r.device_id,
            r.sensor_type,
            r.value,
            r.unit,
            r.status,
        ])
    writer.writerow([])

    # 3. Alerts Section
    writer.writerow(["=== HAZARD ALERTS ==="])
    writer.writerow(["timestamp", "session_id", "device_id", "hazard_type", "severity", "message", "acknowledged"])
    for a in alerts:
        writer.writerow([
            a.timestamp.isoformat() if a.timestamp else "",
            a.session_id or "",
            a.device_id or "",
            a.hazard_type,
            a.severity,
            a.message,
            a.acknowledged,
        ])

    return output.getvalue()


def export_readings_csv(db_session: DBSession, db: Session) -> str:
    readings = db.exec(
        select(SensorReading)
        .where(SensorReading.session_id == db_session.session_id)
        .order_by(SensorReading.timestamp.asc()) # type: ignore
    ).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["timestamp", "session_id", "device_id", "sensor_type", "value", "unit", "status"])
    for r in readings:
        writer.writerow([
            r.timestamp.isoformat() if r.timestamp else "",
            r.session_id,
            r.device_id,
            r.sensor_type,
            r.value,
            r.unit,
            r.status,
        ])
    return output.getvalue()


def export_alerts_csv(db_session: DBSession, db: Session) -> str:
    alerts = db.exec(
        select(Alert)
        .where(Alert.session_id == db_session.session_id)
        .order_by(Alert.timestamp.desc()) # type: ignore
    ).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["timestamp", "session_id", "device_id", "hazard_type", "severity", "message", "acknowledged"])
    for a in alerts:
        writer.writerow([
            a.timestamp.isoformat() if a.timestamp else "",
            a.session_id or "",
            a.device_id or "",
            a.hazard_type,
            a.severity,
            a.message,
            a.acknowledged,
        ])
    return output.getvalue()
