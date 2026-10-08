"""
MORD Intelligence Engine & Service Layer (Phase 13)

This module defines the architectural interfaces and reasoning pipeline for converting
raw/validated sensor signals, sensor health, and machine context into explainable
safety events, structured debrief evidence, and baseline tracking.

Pipeline:
  raw signal -> validated signal -> sensor health -> signal features ->
  machine/session context -> anomaly interpretation -> confidence ->
  hazard/event state -> trainee guidance -> trainer intervention -> near-miss/event evidence
"""

import logging
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

from app.models.safety_event import SafetyEvent, MachineBaseline
from app.schemas.intelligence import (
    ExplainableAlertContract,
    SignalFeaturesContract,
    VALID_MACHINE_STATES,
    VALID_SENSOR_HEALTH,
    VALID_CONFIDENCE_LEVELS,
    VALID_EVENT_TYPES,
    VALID_EVENT_STATUSES
)

logger = logging.getLogger(__name__)


def evaluate_sensor_health(
    sensor_type: str,
    raw_value: float,
    uptime_seconds: float = 0.0,
    is_connected: bool = True,
    consecutive_constant_samples: int = 0
) -> Dict[str, Any]:
    """
    Evaluates raw physical sensor health before signal interpretation.
    Prevents uncalibrated/warming sensors from generating false alarms,
    and detects frozen/disconnected sensors.
    """
    if not is_connected:
        return {
            "status": "DISCONNECTED",
            "trustworthy": False,
            "reason": f"Sensor {sensor_type} signal is disconnected or missing"
        }

    # Example: MQ gas sensors require warm-up time before readings become trustworthy
    if sensor_type in {"GAS_LEVEL", "MQ4", "MQ6"} and uptime_seconds < 20.0:
        return {
            "status": "WARMING_UP",
            "trustworthy": False,
            "reason": f"Sensor {sensor_type} is warming up ({uptime_seconds:.1f}s / 20.0s threshold)"
        }

    # Saturated sensor detection
    if raw_value >= 9999.0 or raw_value <= -9999.0:
        return {
            "status": "SATURATED",
            "trustworthy": False,
            "reason": f"Sensor {sensor_type} output is saturated at {raw_value}"
        }

    # Stuck/frozen signal detection
    if consecutive_constant_samples > 100:
        return {
            "status": "UNRELIABLE",
            "trustworthy": False,
            "reason": f"Sensor {sensor_type} has constant identical output for {consecutive_constant_samples} samples"
        }

    return {
        "status": "OK",
        "trustworthy": True,
        "reason": "Sensor operational within valid electrical and operational bounds"
    }


def assess_cross_sensor_corroboration(
    primary_sensor: str,
    corroborating_sensors: List[str]
) -> Dict[str, Any]:
    """
    Evaluates multi-sensor corroboration to determine confidence level.
    e.g. Vibration anomaly + Acoustic elevation = HIGH confidence.
    Single sensor exceeding threshold without corroboration = MEDIUM confidence.
    """
    if not corroborating_sensors:
        return {
            "confidence_level": "MEDIUM",
            "reason": f"{primary_sensor} anomaly detected without corroborating secondary channel."
        }
    
    corroborating_list = ", ".join(corroborating_sensors)
    return {
        "confidence_level": "HIGH",
        "reason": f"{primary_sensor} anomaly corroborated by {corroborating_list}."
    }


def generate_explainable_alert(
    condition: str,
    evidence: str,
    confidence: str,
    sensor_status: str,
    recommended_action: str
) -> ExplainableAlertContract:
    """
    Constructs a deterministic, structured explainable alert for trainers and trainees.
    """
    if confidence not in VALID_CONFIDENCE_LEVELS:
        confidence = "MEDIUM"
    if sensor_status not in VALID_SENSOR_HEALTH:
        sensor_status = "UNKNOWN"

    return ExplainableAlertContract(
        condition=condition,
        evidence=evidence,
        confidence=confidence,
        sensor_status=sensor_status,
        recommended_action=recommended_action
    )


def build_safety_event(
    event_id: str,
    session_id: str,
    device_id: str,
    event_type: str,
    severity: str = "WARNING",
    zone_id: Optional[str] = None,
    machine_id: Optional[str] = None,
    confidence_level: str = "MEDIUM",
    confidence_reason: Optional[str] = None,
    triggering_sensor_types: Optional[str] = None,
    context_state: Optional[str] = "UNKNOWN",
    trainer_note: Optional[str] = None
) -> SafetyEvent:
    """
    Instantiates a persistent SafetyEvent record ready for lifecycle tracking.
    """
    now = datetime.now(timezone.utc)
    return SafetyEvent(
        event_id=event_id,
        session_id=session_id,
        device_id=device_id,
        zone_id=zone_id,
        machine_id=machine_id,
        event_type=event_type,
        severity=severity,
        status="DETECTED",
        confidence_level=confidence_level,
        confidence_reason=confidence_reason,
        triggering_sensor_types=triggering_sensor_types,
        context_state=context_state,
        started_at=now,
        trainer_note=trainer_note,
        created_at=now,
        updated_at=now
    )
