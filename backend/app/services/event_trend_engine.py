"""
MORD Hazard Persistence, Escalation, and Recovery Engine (Phase 15B)

Classifies safety event trends based on stored sensor measurements and timestamps:
- TRANSIENT: Isolated spike that quickly subsided
- PERSISTENT: Ongoing deviation sustained across multiple observation windows
- ESCALATING: Deviation with increasing magnitude over the observation window
- RECOVERING: Readings returning below threshold under verified sensor connectivity
- UNKNOWN: Insufficient readings, communication dropout, or disconnected sensor

CRITICAL SAFETY RULES:
- Missing data must NEVER be interpreted as recovery.
- Sensor disconnection must NEVER be interpreted as recovery.
- State transitions must record an explicit audit reason.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import math
from app.models.safety_event import SafetyEvent
from app.models.reading import SensorReading

DEFAULT_WINDOW_SECONDS = 30.0
DEFAULT_MIN_READINGS = 3
DEFAULT_ESCALATION_PCT = 15.0


def classify_event_trend(
    event: SafetyEvent,
    recent_readings: List[SensorReading],
    threshold_value: float,
    sensor_health_status: Optional[str] = "OK",
    window_seconds: float = DEFAULT_WINDOW_SECONDS,
    min_readings: int = DEFAULT_MIN_READINGS,
    escalation_pct: float = DEFAULT_ESCALATION_PCT
) -> Dict[str, Any]:
    """
    Evaluates sensor telemetry trend for an active SafetyEvent.
    Returns trend_state, trend_reason, and updated persistence_count.
    """
    health = (sensor_health_status or "OK").upper().strip()

    # Rule 1: Distinguish sensor disconnection from recovery
    if health == "DISCONNECTED":
        return {
            "trend_state": "UNKNOWN",
            "trend_reason": "Sensor is disconnected or offline. Loss of telemetry must not be interpreted as hazard recovery.",
            "persistence_count": event.persistence_count or 0
        }

    if health in {"SATURATED", "UNRELIABLE"}:
        return {
            "trend_state": "UNKNOWN",
            "trend_reason": f"Sensor health is {health}; telemetry cannot reliably determine physical hazard trend.",
            "persistence_count": event.persistence_count or 0
        }

    # Filter valid finite readings
    valid_readings = [
        r for r in recent_readings
        if r.value is not None and math.isfinite(r.value)
    ]

    # Rule 2: Handle missing or insufficient data
    if len(valid_readings) < min_readings:
        return {
            "trend_state": "UNKNOWN",
            "trend_reason": (
                f"Insufficient valid readings in window ({len(valid_readings)}/{min_readings} required). "
                "Missing data must not be interpreted as recovery."
            ),
            "persistence_count": event.persistence_count or 0
        }

    # Sort chronologically
    sorted_readings = sorted(
        valid_readings,
        key=lambda r: r.timestamp if r.timestamp else datetime.min.replace(tzinfo=timezone.utc)
    )

    values = [r.value for r in sorted_readings]
    current_count = event.persistence_count or 0

    # Rule 3: Recovery evaluation
    # To be classified as RECOVERING, recent samples must return below threshold
    # and the latest sample must be cleanly below threshold
    sub_threshold_tail = [v for v in values[-2:] if v < threshold_value]
    all_below = all(v < threshold_value for v in values)
    
    if len(sub_threshold_tail) == 2 or all_below:
        return {
            "trend_state": "RECOVERING",
            "trend_reason": (
                f"Readings have dropped below threshold ({threshold_value}) for recent consecutive samples "
                f"(latest: {values[-1]:.2f}) under healthy sensor connectivity."
            ),
            "persistence_count": max(0, current_count - 1)
        }

    # Check if this was a single transient spike
    if len(values) >= 3 and values[0] > threshold_value and values[-1] <= threshold_value:
        return {
            "trend_state": "TRANSIENT",
            "trend_reason": (
                f"Single excursion above threshold ({values[0]:.2f} > {threshold_value}) "
                "with immediate return to nominal levels."
            ),
            "persistence_count": 0
        }

    # Measurements remain above threshold: check for ESCALATING vs PERSISTENT
    initial_val = values[0]
    latest_val = values[-1]
    val_diff = latest_val - initial_val
    pct_increase = (val_diff / initial_val * 100.0) if initial_val > 0 else 0.0

    if latest_val > threshold_value and pct_increase >= escalation_pct:
        new_count = current_count + 1
        return {
            "trend_state": "ESCALATING",
            "trend_reason": (
                f"Hazard magnitude has increased by +{pct_increase:.1f}% over the observation window "
                f"(from {initial_val:.2f} to {latest_val:.2f}, threshold: {threshold_value})."
            ),
            "persistence_count": new_count
        }

    # Persistent deviation
    new_count = current_count + 1
    return {
        "trend_state": "PERSISTENT",
        "trend_reason": (
            f"Measurement remains above threshold ({threshold_value}) across observation window "
            f"(latest: {latest_val:.2f}, persistence cycles: {new_count})."
        ),
        "persistence_count": new_count
    }
