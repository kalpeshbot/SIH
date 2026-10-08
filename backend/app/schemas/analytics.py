from typing import Optional, List, Dict
from pydantic import BaseModel
from datetime import datetime
from app.models.alert import Alert

class SensorStatItem(BaseModel):
    sensor_type: str
    unit: str
    count: int
    min: float
    max: float
    avg: float

class ReadingStatistics(BaseModel):
    total_readings: int
    first_reading_time: Optional[datetime] = None
    last_reading_time: Optional[datetime] = None
    by_sensor_type: List[SensorStatItem] = []

class AlertSeverityCounts(BaseModel):
    INFO: int = 0
    WARNING: int = 0
    DANGER: int = 0
    CRITICAL: int = 0
    FAULT: int = 0

class AlertStatistics(BaseModel):
    total_alerts: int
    unacknowledged_alerts: int
    acknowledged_alerts: int
    severity_counts: AlertSeverityCounts
    first_alert_time: Optional[datetime] = None
    latest_alert_time: Optional[datetime] = None

class SessionSummary(BaseModel):
    id: int
    session_id: str
    trainee_id: str
    device_id: str
    device_type: Optional[str] = None
    firmware_version: Optional[str] = None
    zone_id: Optional[str] = None
    status: str
    session_type: str
    result: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    duration_formatted: str
    reading_count: int
    alert_count: int

class SessionAnalytics(BaseModel):
    session: SessionSummary
    reading_stats: ReadingStatistics
    alert_stats: AlertStatistics
    recent_alerts: List[Alert] = []
