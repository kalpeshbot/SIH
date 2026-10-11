"""
MORD Maintenance-Ready Evidence Export Service (Phase 15B)

Produces audit-ready, tamper-evident JSON and CSV export packages for:
1. Individual Evidence-Guided Inspections
2. Full Session Evidence Packages (Inspections, Events, Interventions, Alerts, Telemetry)

SECURITY - CSV SPREADSHEET FORMULA INJECTION DEFENSE:
- Neutralizes formula injection on untrusted text fields starting with dangerous
  formula characters (=, +, -, @, \\t, \\r, \\n, %) by prepending a single quote (').
- Preserves genuine numeric integers and floats.
- Sanitizes dynamically at export time without modifying the underlying database records.
- PDF Generation Note: No third-party PDF library is pre-installed in the local environment;
  JSON and CSV are fully implemented, and the HTML/PDF template extension point is documented.
"""

import csv
import io
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlmodel import Session, select

from app.models.session import Session as DBSession
from app.models.reading import SensorReading
from app.models.alert import Alert
from app.models.safety_event import SafetyEvent, MachineBaseline
from app.models.inspection import Inspection, InspectionEvidence, TrainerIntervention
from app.services.analytics_service import get_session_analytics
from app.services.evidence_quality_engine import assess_evidence_quality

EXPORT_SCHEMA_VERSION = "1.0.0"


def sanitize_csv_cell(value: Any) -> Any:
    """
    Neutralizes CSV / spreadsheet formula injection.
    If a string value starts with dangerous formula execution triggers
    (=, +, -, @, \\t, \\r, \\n, %), prefix with a single quote (')
    without mutating the underlying database record.
    Preserves valid numeric integers and floats.
    """
    if value is None:
        return ""
    if isinstance(value, (int, float, bool)):
        return value
    val_str = str(value)

    # Check leading control characters
    if val_str.startswith(("\t", "\r", "\n")):
        return "'" + val_str

    stripped = val_str.lstrip(" \t\r\n")
    if stripped and stripped[0] in ("=", "+", "-", "@", "\t", "\r", "%"):
        try:
            float(val_str)
            return val_str
        except ValueError:
            return "'" + val_str
    return val_str


def sanitize_row(row: List[Any]) -> List[Any]:
    """Applies CSV formula injection neutralization to an entire row."""
    return [sanitize_csv_cell(c) for c in row]


# =========================================================================
# EXISTING SESSION EXPORTS (HARDENED WITH CSV FORMULA DEFENSE)
# =========================================================================

def export_session_json(db_session: DBSession, db: Session) -> Dict[str, Any]:
    analytics = get_session_analytics(db_session, db)
    
    readings = db.exec(
        select(SensorReading)
        .where(SensorReading.session_id == db_session.session_id)
        .order_by(SensorReading.timestamp.asc())  # type: ignore
    ).all()

    alerts = db.exec(
        select(Alert)
        .where(Alert.session_id == db_session.session_id)
        .order_by(Alert.timestamp.desc())  # type: ignore
    ).all()

    return {
        "export_metadata": {
            "schema_version": EXPORT_SCHEMA_VERSION,
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "export_type": "SESSION_TELEMETRY"
        },
        "session_summary": analytics.session.model_dump(mode="json"),
        "reading_statistics": analytics.reading_stats.model_dump(mode="json"),
        "alert_statistics": analytics.alert_stats.model_dump(mode="json"),
        "readings": [
            {
                "id": r.id,
                "session_id": r.session_id,
                "device_id": r.device_id,
                "timestamp": r.timestamp.isoformat() if r.timestamp else "",
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
                "timestamp": a.timestamp.isoformat() if a.timestamp else "",
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
        .order_by(SensorReading.timestamp.asc())  # type: ignore
    ).all()

    alerts = db.exec(
        select(Alert)
        .where(Alert.session_id == db_session.session_id)
        .order_by(Alert.timestamp.desc())  # type: ignore
    ).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # 1. Header / Summary Section
    writer.writerow(sanitize_row(["=== SESSION SUMMARY ==="]))
    writer.writerow(sanitize_row([
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
    ]))
    writer.writerow(sanitize_row([
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
    ]))
    writer.writerow([])

    # 2. Readings Section
    writer.writerow(sanitize_row(["=== SENSOR READINGS ==="]))
    writer.writerow(sanitize_row(["timestamp", "session_id", "device_id", "sensor_type", "value", "unit", "status"]))
    for r in readings:
        writer.writerow(sanitize_row([
            r.timestamp.isoformat() if r.timestamp else "",
            r.session_id,
            r.device_id,
            r.sensor_type,
            r.value,
            r.unit,
            r.status,
        ]))
    writer.writerow([])

    # 3. Alerts Section
    writer.writerow(sanitize_row(["=== HAZARD ALERTS ==="]))
    writer.writerow(sanitize_row(["timestamp", "session_id", "device_id", "hazard_type", "severity", "message", "acknowledged"]))
    for a in alerts:
        writer.writerow(sanitize_row([
            a.timestamp.isoformat() if a.timestamp else "",
            a.session_id or "",
            a.device_id or "",
            a.hazard_type,
            a.severity,
            a.message,
            a.acknowledged,
        ]))

    return output.getvalue()


def export_readings_csv(db_session: DBSession, db: Session) -> str:
    readings = db.exec(
        select(SensorReading)
        .where(SensorReading.session_id == db_session.session_id)
        .order_by(SensorReading.timestamp.asc())  # type: ignore
    ).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(sanitize_row(["timestamp", "session_id", "device_id", "sensor_type", "value", "unit", "status"]))
    for r in readings:
        writer.writerow(sanitize_row([
            r.timestamp.isoformat() if r.timestamp else "",
            r.session_id,
            r.device_id,
            r.sensor_type,
            r.value,
            r.unit,
            r.status,
        ]))
    return output.getvalue()


def export_alerts_csv(db_session: DBSession, db: Session) -> str:
    alerts = db.exec(
        select(Alert)
        .where(Alert.session_id == db_session.session_id)
        .order_by(Alert.timestamp.desc())  # type: ignore
    ).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(sanitize_row(["timestamp", "session_id", "device_id", "hazard_type", "severity", "message", "acknowledged"]))
    for a in alerts:
        writer.writerow(sanitize_row([
            a.timestamp.isoformat() if a.timestamp else "",
            a.session_id or "",
            a.device_id or "",
            a.hazard_type,
            a.severity,
            a.message,
            a.acknowledged,
        ]))
    return output.getvalue()


# =========================================================================
# PHASE 15B: INSPECTION EXPORTS
# =========================================================================

def export_inspection_json(inspection: Inspection, db: Session) -> Dict[str, Any]:
    """Generates structured JSON evidence package for a specific inspection."""
    evidence_items = db.exec(
        select(InspectionEvidence)
        .where(InspectionEvidence.inspection_id == inspection.inspection_id)
        .order_by(InspectionEvidence.timestamp.asc())  # type: ignore
    ).all()

    interventions = db.exec(
        select(TrainerIntervention)
        .where(TrainerIntervention.inspection_id == inspection.inspection_id)
        .order_by(TrainerIntervention.timestamp.asc())  # type: ignore
    ).all()

    # Associated event
    safety_event = None
    if inspection.event_id:
        safety_event = db.exec(
            select(SafetyEvent).where(SafetyEvent.event_id == inspection.event_id)
        ).first()

    # Associated baseline
    baseline = None
    if inspection.baseline_id:
        baseline = db.exec(
            select(MachineBaseline).where(MachineBaseline.baseline_id == inspection.baseline_id)
        ).first()

    # Perform evidence quality assessment
    quality = assess_evidence_quality(
        readings=[],
        evidence_items=evidence_items,
        sensor_health_statuses={"PRIMARY": inspection.sensor_health_state or "UNKNOWN"},
        baseline=baseline,
        machine_state=inspection.machine_state,
        require_baseline=bool(inspection.baseline_id)
    )

    checklist_steps = []
    if inspection.checklist_json:
        try:
            checklist_steps = json.loads(inspection.checklist_json)
        except Exception:
            checklist_steps = []

    completed_steps_count = sum(1 for s in checklist_steps if s.get("status") == "COMPLETED")
    skipped_steps_count = sum(1 for s in checklist_steps if s.get("status") == "SKIPPED")

    return {
        "export_metadata": {
            "schema_version": EXPORT_SCHEMA_VERSION,
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "export_type": "EVIDENCE_GUIDED_INSPECTION"
        },
        "inspection": {
            "inspection_id": inspection.inspection_id,
            "session_id": inspection.session_id,
            "device_id": inspection.device_id,
            "zone_id": inspection.zone_id,
            "machine_id": inspection.machine_id,
            "event_id": inspection.event_id,
            "trainer_id": inspection.trainer_id,
            "template_id": inspection.template_id,
            "status": inspection.status,
            "decision": inspection.decision,
            "reason": inspection.reason,
            "measurement_source": inspection.measurement_source,
            "sensor_health_state": inspection.sensor_health_state,
            "machine_state": inspection.machine_state,
            "baseline_id": inspection.baseline_id,
            "trainer_notes": inspection.trainer_notes,
            "outcome_notes": inspection.outcome_notes,
            "created_at": inspection.created_at.isoformat() if inspection.created_at else "",
            "updated_at": inspection.updated_at.isoformat() if inspection.updated_at else "",
            "completed_at": inspection.completed_at.isoformat() if inspection.completed_at else None,
        },
        "checklist": {
            "total_steps": len(checklist_steps),
            "completed_steps": completed_steps_count,
            "skipped_steps": skipped_steps_count,
            "steps": checklist_steps
        },
        "evidence_quality_assessment": {
            "status": quality.status,
            "quality_issues": quality.quality_issues,
            "supporting_evidence_refs": quality.supporting_evidence_refs,
            "missing_evidence_requirements": quality.missing_evidence_requirements,
            "explanation": quality.explanation,
            "assessment_timestamp": quality.assessment_timestamp.isoformat()
        },
        "evidence_records": [
            {
                "evidence_id": e.evidence_id,
                "evidence_type": e.evidence_type,
                "source": e.source,
                "reference_id": e.reference_id,
                "value": e.value,
                "unit": e.unit,
                "notes": e.notes,
                "timestamp": e.timestamp.isoformat() if e.timestamp else ""
            }
            for e in evidence_items
        ],
        "interventions": [
            {
                "intervention_id": i.intervention_id,
                "category": i.category,
                "notes": i.notes,
                "comparison_outcome": i.comparison_outcome,
                "comparison_notes": i.comparison_notes,
                "timestamp": i.timestamp.isoformat() if i.timestamp else ""
            }
            for i in interventions
        ],
        "associated_safety_event": {
            "event_id": safety_event.event_id,
            "event_type": safety_event.event_type,
            "severity": safety_event.severity,
            "status": safety_event.status,
            "trend_state": safety_event.trend_state,
            "persistence_count": safety_event.persistence_count
        } if safety_event else None,
        "associated_baseline": {
            "baseline_id": baseline.baseline_id,
            "feature_name": baseline.feature_name,
            "baseline_value": baseline.baseline_value,
            "sample_count": baseline.sample_count,
            "validity_state": baseline.validity_state
        } if baseline else None
    }


def export_inspection_csv(inspection: Inspection, db: Session) -> str:
    """Generates sanitized multi-table CSV review for an inspection."""
    evidence_items = db.exec(
        select(InspectionEvidence)
        .where(InspectionEvidence.inspection_id == inspection.inspection_id)
        .order_by(InspectionEvidence.timestamp.asc())  # type: ignore
    ).all()

    interventions = db.exec(
        select(TrainerIntervention)
        .where(TrainerIntervention.inspection_id == inspection.inspection_id)
        .order_by(TrainerIntervention.timestamp.asc())  # type: ignore
    ).all()

    checklist_steps = []
    if inspection.checklist_json:
        try:
            checklist_steps = json.loads(inspection.checklist_json)
        except Exception:
            checklist_steps = []

    output = io.StringIO()
    writer = csv.writer(output)

    # 1. Summary Header
    writer.writerow(sanitize_row(["=== INSPECTION RECORD SUMMARY ==="]))
    writer.writerow(sanitize_row([
        "inspection_id",
        "session_id",
        "device_id",
        "zone_id",
        "machine_id",
        "event_id",
        "trainer_id",
        "status",
        "decision",
        "reason",
        "machine_state",
        "sensor_health",
        "created_at",
        "completed_at",
        "trainer_notes",
        "outcome_notes"
    ]))
    writer.writerow(sanitize_row([
        inspection.inspection_id,
        inspection.session_id,
        inspection.device_id or "",
        inspection.zone_id or "",
        inspection.machine_id or "",
        inspection.event_id or "",
        inspection.trainer_id or "",
        inspection.status,
        inspection.decision or "",
        inspection.reason,
        inspection.machine_state or "",
        inspection.sensor_health_state or "",
        inspection.created_at.isoformat() if inspection.created_at else "",
        inspection.completed_at.isoformat() if inspection.completed_at else "",
        inspection.trainer_notes or "",
        inspection.outcome_notes or ""
    ]))
    writer.writerow([])

    # 2. Checklist Steps
    writer.writerow(sanitize_row(["=== CHECKLIST STEPS ==="]))
    writer.writerow(sanitize_row([
        "step_id",
        "component",
        "reference_position",
        "status",
        "instruction",
        "observation",
        "completed_at"
    ]))
    for s in checklist_steps:
        writer.writerow(sanitize_row([
            s.get("step_id", ""),
            s.get("component", ""),
            s.get("reference_position", ""),
            s.get("status", ""),
            s.get("instruction", ""),
            s.get("observation", ""),
            s.get("completed_at", "")
        ]))
    writer.writerow([])

    # 3. Evidence Items
    writer.writerow(sanitize_row(["=== RECORDED EVIDENCE ==="]))
    writer.writerow(sanitize_row([
        "evidence_id",
        "evidence_type",
        "source",
        "reference_id",
        "value",
        "unit",
        "notes",
        "timestamp"
    ]))
    for e in evidence_items:
        writer.writerow(sanitize_row([
            e.evidence_id,
            e.evidence_type,
            e.source,
            e.reference_id or "",
            e.value if e.value is not None else "",
            e.unit or "",
            e.notes or "",
            e.timestamp.isoformat() if e.timestamp else ""
        ]))
    writer.writerow([])

    # 4. Interventions
    writer.writerow(sanitize_row(["=== TRAINER INTERVENTIONS ==="]))
    writer.writerow(sanitize_row([
        "intervention_id",
        "category",
        "comparison_outcome",
        "notes",
        "comparison_notes",
        "timestamp"
    ]))
    for i in interventions:
        writer.writerow(sanitize_row([
            i.intervention_id,
            i.category,
            i.comparison_outcome,
            i.notes,
            i.comparison_notes or "",
            i.timestamp.isoformat() if i.timestamp else ""
        ]))

    return output.getvalue()


# =========================================================================
# PHASE 15B: COMPLETE SESSION EVIDENCE PACKAGE (REPLAY & DEBRIEF)
# =========================================================================

def export_session_evidence_package_json(session_id: str, db: Session) -> Dict[str, Any]:
    """Generates complete replay & maintenance debrief package for a training session."""
    db_session = db.exec(
        select(DBSession).where(DBSession.session_id == session_id)
    ).first()

    inspections = db.exec(
        select(Inspection).where(Inspection.session_id == session_id)
    ).all()

    safety_events = db.exec(
        select(SafetyEvent).where(SafetyEvent.session_id == session_id)
    ).all()

    interventions = db.exec(
        select(TrainerIntervention).where(TrainerIntervention.session_id == session_id)
    ).all()

    alerts = db.exec(
        select(Alert).where(Alert.session_id == session_id)
    ).all()

    return {
        "export_metadata": {
            "schema_version": EXPORT_SCHEMA_VERSION,
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "export_type": "SESSION_COMPLETE_EVIDENCE_PACKAGE",
            "session_id": session_id
        },
        "session": {
            "session_id": db_session.session_id if db_session else session_id,
            "trainee_id": db_session.trainee_id if db_session else None,
            "device_id": db_session.device_id if db_session else None,
            "status": db_session.status if db_session else "UNKNOWN",
            "start_time": db_session.start_time.isoformat() if db_session and db_session.start_time else None,
            "end_time": db_session.end_time.isoformat() if db_session and db_session.end_time else None
        },
        "inspections": [
            export_inspection_json(insp, db)["inspection"]
            for insp in inspections
        ],
        "safety_events": [
            {
                "event_id": se.event_id,
                "event_type": se.event_type,
                "severity": se.severity,
                "status": se.status,
                "confidence_level": se.confidence_level,
                "trend_state": se.trend_state,
                "persistence_count": se.persistence_count,
                "started_at": se.started_at.isoformat() if se.started_at else None,
                "acknowledged_at": se.acknowledged_at.isoformat() if se.acknowledged_at else None,
                "resolved_at": se.resolved_at.isoformat() if se.resolved_at else None
            }
            for se in safety_events
        ],
        "interventions": [
            {
                "intervention_id": inv.intervention_id,
                "category": inv.category,
                "notes": inv.notes,
                "comparison_outcome": inv.comparison_outcome,
                "comparison_notes": inv.comparison_notes,
                "timestamp": inv.timestamp.isoformat() if inv.timestamp else None
            }
            for inv in interventions
        ],
        "alerts": [
            {
                "id": a.id,
                "hazard_type": a.hazard_type,
                "severity": a.severity,
                "message": a.message,
                "acknowledged": a.acknowledged,
                "timestamp": a.timestamp.isoformat() if a.timestamp else None
            }
            for a in alerts
        ]
    }


def export_session_evidence_package_csv(session_id: str, db: Session) -> str:
    """Generates sanitized multi-table CSV package for session debrief."""
    package = export_session_evidence_package_json(session_id, db)
    output = io.StringIO()
    writer = csv.writer(output)

    # 1. Session Summary
    writer.writerow(sanitize_row(["=== SESSION OVERVIEW ==="]))
    writer.writerow(sanitize_row(["session_id", "trainee_id", "device_id", "status", "start_time", "end_time"]))
    s = package["session"]
    writer.writerow(sanitize_row([
        s.get("session_id", ""),
        s.get("trainee_id", ""),
        s.get("device_id", ""),
        s.get("status", ""),
        s.get("start_time", ""),
        s.get("end_time", "")
    ]))
    writer.writerow([])

    # 2. Inspections
    writer.writerow(sanitize_row(["=== SESSION INSPECTIONS ==="]))
    writer.writerow(sanitize_row([
        "inspection_id", "status", "decision", "reason", "machine_id", "zone_id", "created_at", "completed_at", "trainer_notes"
    ]))
    for insp in package.get("inspections", []):
        writer.writerow(sanitize_row([
            insp.get("inspection_id", ""),
            insp.get("status", ""),
            insp.get("decision", ""),
            insp.get("reason", ""),
            insp.get("machine_id", ""),
            insp.get("zone_id", ""),
            insp.get("created_at", ""),
            insp.get("completed_at", ""),
            insp.get("trainer_notes", "")
        ]))
    writer.writerow([])

    # 3. Safety Events
    writer.writerow(sanitize_row(["=== SAFETY EVENTS ==="]))
    writer.writerow(sanitize_row([
        "event_id", "event_type", "severity", "status", "trend_state", "persistence_count", "started_at", "acknowledged_at", "resolved_at"
    ]))
    for se in package.get("safety_events", []):
        writer.writerow(sanitize_row([
            se.get("event_id", ""),
            se.get("event_type", ""),
            se.get("severity", ""),
            se.get("status", ""),
            se.get("trend_state", ""),
            se.get("persistence_count", 0),
            se.get("started_at", ""),
            se.get("acknowledged_at", ""),
            se.get("resolved_at", "")
        ]))
    writer.writerow([])

    # 4. Interventions
    writer.writerow(sanitize_row(["=== INTERVENTIONS ==="]))
    writer.writerow(sanitize_row([
        "intervention_id", "category", "comparison_outcome", "notes", "comparison_notes", "timestamp"
    ]))
    for inv in package.get("interventions", []):
        writer.writerow(sanitize_row([
            inv.get("intervention_id", ""),
            inv.get("category", ""),
            inv.get("comparison_outcome", ""),
            inv.get("notes", ""),
            inv.get("comparison_notes", ""),
            inv.get("timestamp", "")
        ]))

    return output.getvalue()
