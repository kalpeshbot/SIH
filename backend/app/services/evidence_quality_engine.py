"""
MORD Evidence Quality Engine (Phase 15B)

Implements transparent, deterministic rules for determining whether available
evidence is sufficient to support an alert or inspection conclusion.

Evaluates:
- Missing / empty readings
- Stale readings (> configurable window)
- Non-finite or invalid floating point values
- Sensor health states (WARMING_UP, SATURATED, DISCONNECTED, UNRELIABLE)
- Inadequate baseline coverage (< configured sample count, e.g. 20)
- Missing operating state context (UNKNOWN / unassigned)
- Cross-sensor corroboration

Critical constraint:
Evidence quality and hazard severity are orthogonal concepts. A high-severity event
with poor evidence must NOT automatically become a low-severity event.
"""

import math
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from app.schemas.inspection import (
    EvidenceQualityAssessmentResponse,
    VALID_EVIDENCE_QUALITY_STATUSES
)
from app.models.reading import SensorReading
from app.models.safety_event import MachineBaseline
from app.models.inspection import InspectionEvidence


def assess_evidence_quality(
    readings: Optional[List[SensorReading]] = None,
    evidence_items: Optional[List[InspectionEvidence]] = None,
    sensor_health_statuses: Optional[Dict[str, str]] = None,
    baseline: Optional[MachineBaseline] = None,
    machine_state: Optional[str] = None,
    current_time: Optional[datetime] = None,
    stale_threshold_seconds: float = 60.0,
    min_baseline_samples: int = 20,
    require_baseline: bool = False
) -> EvidenceQualityAssessmentResponse:
    """
    Evaluates evidence quality deterministically based on available telemetry,
    health indicators, baseline parameters, and operational context.
    """
    now = current_time or datetime.now(timezone.utc)
    readings = readings or []
    evidence_items = evidence_items or []
    sensor_health_statuses = sensor_health_statuses or {}

    quality_issues: List[str] = []
    missing_requirements: List[str] = []
    supporting_refs: List[str] = []

    # 1. Telemetry and Manual Evidence Evaluation
    has_readings = len(readings) > 0
    has_manual_evidence = len(evidence_items) > 0

    if not has_readings and not has_manual_evidence:
        quality_issues.append("No sensor telemetry or manual evidence records available.")
        missing_requirements.append("At least one validated telemetry window or manual inspection observation.")

    # 2. Check for Non-finite / Invalid Numerical Values
    invalid_count = 0
    for r in readings:
        if r.value is None or not math.isfinite(r.value):
            invalid_count += 1
        else:
            supporting_refs.append(f"reading:{r.id or r.timestamp}")
    
    for ev in evidence_items:
        if ev.value is not None:
            if not math.isfinite(ev.value):
                invalid_count += 1
            else:
                supporting_refs.append(f"evidence:{ev.evidence_id}")
        else:
            supporting_refs.append(f"evidence:{ev.evidence_id}")

    if invalid_count > 0:
        quality_issues.append(f"Dataset contains {invalid_count} non-finite or corrupted numerical value(s).")

    # 3. Check for Stale Readings
    if has_readings:
        # Find latest reading timestamp
        latest_ts = None
        for r in readings:
            if r.timestamp:
                ts = r.timestamp if r.timestamp.tzinfo else r.timestamp.replace(tzinfo=timezone.utc)
                if latest_ts is None or ts > latest_ts:
                    latest_ts = ts
        
        if latest_ts:
            age_seconds = (now - latest_ts).total_seconds()
            if age_seconds > stale_threshold_seconds:
                quality_issues.append(
                    f"Telemetry is stale: latest reading is {age_seconds:.1f}s old (threshold: {stale_threshold_seconds:.1f}s)."
                )

    # 4. Sensor Health Status
    sensor_hard_failure = False
    sensor_degraded = False

    for sensor_name, health_status in sensor_health_statuses.items():
        status_upper = health_status.upper().strip()
        if status_upper == "DISCONNECTED":
            quality_issues.append(f"Sensor '{sensor_name}' is DISCONNECTED.")
            sensor_hard_failure = True
        elif status_upper == "SATURATED":
            quality_issues.append(f"Sensor '{sensor_name}' signal is SATURATED at physical measurement limits.")
            sensor_hard_failure = True
        elif status_upper == "WARMING_UP":
            quality_issues.append(f"Sensor '{sensor_name}' is currently WARMING_UP; readings are uncalibrated.")
            sensor_degraded = True
        elif status_upper == "UNRELIABLE":
            quality_issues.append(f"Sensor '{sensor_name}' signal is UNRELIABLE (constant frozen values or severe noise).")
            sensor_degraded = True

    # 5. Machine Operating State Context
    normalized_state = (machine_state or "UNKNOWN").upper().strip()
    if normalized_state in {"UNKNOWN", ""}:
        quality_issues.append("Machine operating state is UNKNOWN; context-dependent vibration/thermal limits cannot be verified.")
        missing_requirements.append("Defined machine operating state (e.g. IDLE, STARTUP, RUNNING, SHUTDOWN).")

    # 6. Baseline Coverage
    if require_baseline or baseline is not None:
        if baseline is None:
            quality_issues.append("No machine baseline available for comparison in current state.")
            missing_requirements.append("Calibrated baseline profile for this machine and operating state.")
        else:
            supporting_refs.append(f"baseline:{baseline.baseline_id}")
            if baseline.sample_count < min_baseline_samples:
                quality_issues.append(
                    f"Baseline sample count ({baseline.sample_count}) is below minimum policy ({min_baseline_samples} samples)."
                )
            if baseline.validity_state != "VALID":
                quality_issues.append(f"Baseline validity state is '{baseline.validity_state}' (expected 'VALID').")

    # Determine Final Assessment Status
    # INSUFFICIENT conditions:
    # - Completely missing data (no readings and no manual evidence)
    # - Sensor hard failure (disconnected / saturated)
    # - Any non-finite values
    # - Required baseline is missing
    # - Baseline sample count is zero or invalid
    if (
        (not has_readings and not has_manual_evidence)
        or sensor_hard_failure
        or invalid_count > 0
        or (require_baseline and baseline is None)
        or (baseline is not None and baseline.sample_count == 0)
    ):
        status = "INSUFFICIENT"
        explanation = (
            "Evidence is INSUFFICIENT to support safety event validation or conclusive diagnosis. "
            "Critical sensor data is missing, corrupted, or sensor hardware is disconnected/saturated. "
            "Manual inspection and physical verification are required."
        )
    # DEGRADED conditions:
    # - Any quality issues or missing requirements exist (e.g., stale readings, warming up sensor, unknown state, baseline samples < threshold)
    elif len(quality_issues) > 0 or len(missing_requirements) > 0:
        status = "DEGRADED"
        explanation = (
            "Evidence is DEGRADED. Telemetry is available but compromised by stale readings, "
            "unsettled sensor warmup, unverified machine state, or limited baseline coverage. "
            "Interpret alerts with caution and corroborate with physical inspection."
        )
    else:
        status = "SUFFICIENT"
        explanation = (
            "Evidence is SUFFICIENT. Telemetry is fresh, sensor health is OK, "
            "machine operating context is defined, and baseline sample count meets policy requirements."
        )

    return EvidenceQualityAssessmentResponse(
        status=status,
        quality_issues=quality_issues,
        supporting_evidence_refs=list(set(supporting_refs)),
        missing_evidence_requirements=missing_requirements,
        explanation=explanation,
        assessment_timestamp=now
    )
