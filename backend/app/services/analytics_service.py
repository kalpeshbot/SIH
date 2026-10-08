from typing import Optional, List
from datetime import datetime, timezone
from sqlmodel import Session, select
from app.models.session import Session as DBSession
from app.models.device import Device
from app.models.reading import SensorReading
from app.models.alert import Alert
from app.schemas.analytics import (
    SessionAnalytics,
    SessionSummary,
    ReadingStatistics,
    SensorStatItem,
    AlertStatistics,
    AlertSeverityCounts,
)

def format_duration(start_time: datetime, end_time: Optional[datetime] = None, is_active: bool = False) -> tuple[Optional[float], str]:
    if end_time is None and is_active:
        end_time = datetime.now(timezone.utc)
    
    if end_time is None:
        return None, "—"

    # Make timezone aware if naive
    if start_time.tzinfo is None:
        start_time = start_time.replace(tzinfo=timezone.utc)
    if end_time.tzinfo is None:
        end_time = end_time.replace(tzinfo=timezone.utc)

    seconds = (end_time - start_time).total_seconds()
    if seconds < 0:
        seconds = 0.0

    total_mins = int(seconds // 60)
    remaining_secs = int(seconds % 60)

    if total_mins == 0:
        formatted = f"{remaining_secs}s"
    elif total_mins < 60:
        formatted = f"{total_mins} min"
    else:
        hours = total_mins // 60
        mins = total_mins % 60
        if mins > 0:
            formatted = f"{hours} hr {mins} min"
        else:
            formatted = f"{hours} hr"

    return round(seconds, 1), formatted


def get_session_analytics(db_session: DBSession, db: Session) -> SessionAnalytics:
    # 1. Device Metadata
    device = db.exec(
        select(Device).where(Device.device_id == db_session.device_id)
    ).first()
    device_type = device.device_type if device else None
    firmware_version = device.firmware_version if device else None

    # 2. Sensor Readings Analytics (strictly isolated to db_session.session_id)
    readings = db.exec(
        select(SensorReading)
        .where(SensorReading.session_id == db_session.session_id)
        .order_by(SensorReading.timestamp.asc()) # type: ignore
    ).all()

    total_readings = len(readings)
    first_reading_time = readings[0].timestamp if total_readings > 0 else None
    last_reading_time = readings[-1].timestamp if total_readings > 0 else None

    # Group reading statistics by sensor_type dynamically
    sensor_groups: dict[str, list[SensorReading]] = {}
    for r in readings:
        sensor_groups.setdefault(r.sensor_type, []).append(r)

    sensor_stats_list: List[SensorStatItem] = []
    for st_name, st_readings in sensor_groups.items():
        vals = [r.value for r in st_readings]
        unit = st_readings[0].unit if st_readings else ""
        min_val = round(min(vals), 2)
        max_val = round(max(vals), 2)
        avg_val = round(sum(vals) / len(vals), 2)
        sensor_stats_list.append(
            SensorStatItem(
                sensor_type=st_name,
                unit=unit,
                count=len(vals),
                min=min_val,
                max=max_val,
                avg=avg_val,
            )
        )

    reading_stats = ReadingStatistics(
        total_readings=total_readings,
        first_reading_time=first_reading_time,
        last_reading_time=last_reading_time,
        by_sensor_type=sensor_stats_list,
    )

    # 3. Alerts Analytics (strictly isolated to db_session.session_id)
    alerts = db.exec(
        select(Alert)
        .where(Alert.session_id == db_session.session_id)
        .order_by(Alert.timestamp.desc()) # type: ignore
    ).all()

    total_alerts = len(alerts)
    unack_count = sum(1 for a in alerts if not a.acknowledged)
    ack_count = total_alerts - unack_count

    sev_counts = AlertSeverityCounts()
    for a in alerts:
        sev = a.severity.upper()
        if sev == "INFO":
            sev_counts.INFO += 1
        elif sev == "WARNING":
            sev_counts.WARNING += 1
        elif sev == "DANGER":
            sev_counts.DANGER += 1
        elif sev == "CRITICAL":
            sev_counts.CRITICAL += 1
        elif sev == "FAULT":
            sev_counts.FAULT += 1

    first_alert_time = min((a.timestamp for a in alerts), default=None)
    latest_alert_time = max((a.timestamp for a in alerts), default=None)

    alert_stats = AlertStatistics(
        total_alerts=total_alerts,
        unacknowledged_alerts=unack_count,
        acknowledged_alerts=ack_count,
        severity_counts=sev_counts,
        first_alert_time=first_alert_time,
        latest_alert_time=latest_alert_time,
    )

    # 4. Duration Calculation
    is_active = db_session.status == "ACTIVE"
    duration_secs, duration_fmt = format_duration(
        start_time=db_session.start_time,
        end_time=db_session.end_time,
        is_active=is_active,
    )

    # 5. Session Summary
    summary = SessionSummary(
        id=db_session.id if db_session.id is not None else 0,
        session_id=db_session.session_id,
        trainee_id=db_session.trainee_id,
        device_id=db_session.device_id,
        device_type=device_type,
        firmware_version=firmware_version,
        zone_id=db_session.zone_id,
        status=db_session.status,
        session_type=db_session.session_type,
        result=db_session.result,
        start_time=db_session.start_time,
        end_time=db_session.end_time,
        duration_seconds=duration_secs,
        duration_formatted=duration_fmt,
        reading_count=total_readings,
        alert_count=total_alerts,
    )

    return SessionAnalytics(
        session=summary,
        reading_stats=reading_stats,
        alert_stats=alert_stats,
        recent_alerts=alerts,
    )
