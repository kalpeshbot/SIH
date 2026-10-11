"""
MORD Session Replay & Trainer Intelligence Service (Phase 15B)

Provides:
1. Chronological Session Replay timeline unified across:
   - Session lifecycle milestones
   - SafetyEvent detection, acknowledgement, and resolution
   - Alert triggers and acknowledgements
   - Inspection creation, step progression, and completion
   - Trainer corrective interventions
2. Evidence-backed Trainer Analytics:
   - Unresolved inspections
   - Repeated events by machine and zone
   - Explicit timing analytics (time to acknowledge, time to resolve)
   - Inspection step completion and skipped step counts
   - Intervention outcomes breakdown

CRITICAL RULES:
- Never generate synthetic historical events that were not recorded.
- Never calculate punitive trainee scores.
- Treat missing timestamps honestly; do not treat missing durations as zero.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from sqlmodel import Session, select

from app.models.session import Session as DBSession
from app.models.safety_event import SafetyEvent
from app.models.alert import Alert
from app.models.inspection import Inspection, InspectionEvidence, TrainerIntervention
from app.services.evidence_quality_engine import assess_evidence_quality
import json


def get_session_replay_timeline(
    session_id: str,
    db: Session,
    record_type: Optional[str] = None,
    machine_id: Optional[str] = None,
    zone_id: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
) -> Dict[str, Any]:
    """
    Constructs a unified, chronological timeline of real session records.
    Bounded and paginated to support large sessions safely.
    """
    timeline_items: List[Dict[str, Any]] = []

    # 1. Session Lifecycle
    db_session = db.exec(
        select(DBSession).where(DBSession.session_id == session_id)
    ).first()

    if db_session:
        if db_session.start_time:
            timeline_items.append({
                "record_type": "SESSION_LIFECYCLE",
                "id": f"sess-start-{db_session.session_id}",
                "timestamp": db_session.start_time,
                "title": f"Session Started ({db_session.session_type})",
                "machine_id": None,
                "zone_id": db_session.zone_id,
                "severity": "INFO",
                "status": "STARTED",
                "details": {
                    "trainee_id": db_session.trainee_id,
                    "device_id": db_session.device_id,
                    "status": db_session.status
                }
            })
        if db_session.end_time:
            timeline_items.append({
                "record_type": "SESSION_LIFECYCLE",
                "id": f"sess-end-{db_session.session_id}",
                "timestamp": db_session.end_time,
                "title": f"Session Ended ({db_session.result or 'COMPLETED'})",
                "machine_id": None,
                "zone_id": db_session.zone_id,
                "severity": "INFO",
                "status": db_session.status,
                "details": {
                    "result": db_session.result,
                    "duration_seconds": (db_session.end_time - db_session.start_time).total_seconds()
                    if db_session.start_time else None
                }
            })

    # 2. Safety Events
    events = db.exec(
        select(SafetyEvent).where(SafetyEvent.session_id == session_id)
    ).all()

    for se in events:
        if se.started_at:
            timeline_items.append({
                "record_type": "SAFETY_EVENT",
                "id": f"event-det-{se.event_id}",
                "timestamp": se.started_at,
                "title": f"Safety Event Detected: {se.event_type}",
                "machine_id": se.machine_id,
                "zone_id": se.zone_id,
                "severity": se.severity,
                "status": se.status,
                "details": {
                    "event_id": se.event_id,
                    "confidence_level": se.confidence_level,
                    "confidence_reason": se.confidence_reason,
                    "trend_state": se.trend_state,
                    "trend_reason": se.trend_reason,
                    "persistence_count": se.persistence_count,
                    "triggering_sensors": se.triggering_sensor_types
                }
            })
        if se.acknowledged_at:
            timeline_items.append({
                "record_type": "SAFETY_EVENT",
                "id": f"event-ack-{se.event_id}",
                "timestamp": se.acknowledged_at,
                "title": f"Safety Event Acknowledged: {se.event_type}",
                "machine_id": se.machine_id,
                "zone_id": se.zone_id,
                "severity": "INFO",
                "status": "ACKNOWLEDGED",
                "details": {
                    "event_id": se.event_id,
                    "trainer_note": se.trainer_note
                }
            })
        if se.resolved_at:
            timeline_items.append({
                "record_type": "SAFETY_EVENT",
                "id": f"event-res-{se.event_id}",
                "timestamp": se.resolved_at,
                "title": f"Safety Event Resolved: {se.event_type}",
                "machine_id": se.machine_id,
                "zone_id": se.zone_id,
                "severity": "INFO",
                "status": "RESOLVED",
                "details": {
                    "event_id": se.event_id,
                    "duration_seconds": se.duration_seconds
                }
            })

    # 3. Alerts
    alerts = db.exec(
        select(Alert).where(Alert.session_id == session_id)
    ).all()

    for a in alerts:
        if a.timestamp:
            timeline_items.append({
                "record_type": "ALERT",
                "id": f"alert-{a.id}",
                "timestamp": a.timestamp,
                "title": f"Hazard Alert: {a.hazard_type}",
                "machine_id": None,
                "zone_id": None,
                "severity": a.severity,
                "status": "ACKNOWLEDGED" if a.acknowledged else "ACTIVE",
                "details": {
                    "alert_id": a.id,
                    "message": a.message,
                    "device_id": a.device_id,
                    "acknowledged": a.acknowledged
                }
            })

    # 4. Inspections
    inspections = db.exec(
        select(Inspection).where(Inspection.session_id == session_id)
    ).all()

    for insp in inspections:
        if insp.created_at:
            timeline_items.append({
                "record_type": "INSPECTION",
                "id": f"insp-init-{insp.inspection_id}",
                "timestamp": insp.created_at,
                "title": f"Inspection Initiated: {insp.reason}",
                "machine_id": insp.machine_id,
                "zone_id": insp.zone_id,
                "severity": "INFO",
                "status": insp.status,
                "details": {
                    "inspection_id": insp.inspection_id,
                    "event_id": insp.event_id,
                    "trainer_id": insp.trainer_id,
                    "template_id": insp.template_id,
                    "measurement_source": insp.measurement_source
                }
            })
        if insp.completed_at:
            timeline_items.append({
                "record_type": "INSPECTION",
                "id": f"insp-done-{insp.inspection_id}",
                "timestamp": insp.completed_at,
                "title": f"Inspection Completed: {insp.decision or 'NO_DECISION'}",
                "machine_id": insp.machine_id,
                "zone_id": insp.zone_id,
                "severity": "INFO" if insp.decision in {"REFUTED_BY_TRAINER", "CONFIRMED_BY_TRAINER"} else "WARNING",
                "status": insp.status,
                "details": {
                    "inspection_id": insp.inspection_id,
                    "decision": insp.decision,
                    "outcome_notes": insp.outcome_notes,
                    "trainer_notes": insp.trainer_notes
                }
            })

    # 5. Trainer Interventions
    interventions = db.exec(
        select(TrainerIntervention).where(TrainerIntervention.session_id == session_id)
    ).all()

    for inv in interventions:
        if inv.timestamp:
            timeline_items.append({
                "record_type": "INTERVENTION",
                "id": f"inv-{inv.intervention_id}",
                "timestamp": inv.timestamp,
                "title": f"Trainer Intervention: {inv.category}",
                "machine_id": inv.machine_id,
                "zone_id": None,
                "severity": "INFO",
                "status": inv.comparison_outcome,
                "details": {
                    "intervention_id": inv.intervention_id,
                    "category": inv.category,
                    "notes": inv.notes,
                    "comparison_outcome": inv.comparison_outcome,
                    "comparison_notes": inv.comparison_notes,
                    "inspection_id": inv.inspection_id,
                    "event_id": inv.event_id
                }
            })

    # Normalize timestamps with timezone awareness for sorting
    def get_sort_key(item):
        ts = item["timestamp"]
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        return ts

    timeline_items.sort(key=get_sort_key)

    # Filtering
    filtered = timeline_items
    if record_type:
        filtered = [it for it in filtered if it["record_type"] == record_type.upper()]
    if machine_id:
        filtered = [it for it in filtered if it.get("machine_id") == machine_id]
    if zone_id:
        filtered = [it for it in filtered if it.get("zone_id") == zone_id]

    total_count = len(filtered)
    paged = filtered[offset : offset + limit]

    # Convert timestamps to ISO string for JSON serialization
    serialized_paged = []
    for it in paged:
        item_copy = dict(it)
        item_copy["timestamp"] = item_copy["timestamp"].isoformat()
        serialized_paged.append(item_copy)

    return {
        "session_id": session_id,
        "total_records": total_count,
        "limit": limit,
        "offset": offset,
        "records": serialized_paged
    }


def get_trainer_intelligence_analytics(
    db: Session,
    session_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Computes evidence-backed trainer analytics across one or all sessions.
    Strictly forbids fabricated metrics or punitive individual trainee scores.
    """
    # 1. Inspections Query
    insp_query = select(Inspection)
    if session_id:
        insp_query = insp_query.where(Inspection.session_id == session_id)
    inspections = db.exec(insp_query).all()

    total_inspections = len(inspections)
    unresolved_inspections = sum(1 for i in inspections if i.status == "IN_PROGRESS")
    completed_inspections = sum(1 for i in inspections if i.status == "COMPLETED")
    cancelled_inspections = sum(1 for i in inspections if i.status == "CANCELLED")

    decision_counts: Dict[str, int] = {
        "CONFIRMED_BY_TRAINER": 0,
        "REFUTED_BY_TRAINER": 0,
        "INCONCLUSIVE": 0,
        "INSUFFICIENT_EVIDENCE": 0
    }
    completed_steps_total = 0
    skipped_steps_total = 0
    follow_up_steps_total = 0

    for i in inspections:
        if i.decision and i.decision in decision_counts:
            decision_counts[i.decision] += 1
        if i.checklist_json:
            try:
                steps = json.loads(i.checklist_json)
                for s in steps:
                    st = s.get("status")
                    if st == "COMPLETED":
                        completed_steps_total += 1
                    elif st == "SKIPPED":
                        skipped_steps_total += 1
                    elif st == "FOLLOW_UP_REQUIRED":
                        follow_up_steps_total += 1
            except Exception:
                pass

    # 2. Safety Events & Response Timing
    se_query = select(SafetyEvent)
    if session_id:
        se_query = se_query.where(SafetyEvent.session_id == session_id)
    events = db.exec(se_query).all()

    repeated_by_machine: Dict[str, int] = {}
    repeated_by_zone: Dict[str, int] = {}
    event_type_distribution: Dict[str, int] = {}
    trend_state_distribution: Dict[str, int] = {}

    ack_durations: List[float] = []
    res_durations: List[float] = []
    missing_ack_count = 0
    missing_res_count = 0

    for se in events:
        m_id = se.machine_id or "UNASSIGNED"
        repeated_by_machine[m_id] = repeated_by_machine.get(m_id, 0) + 1

        z_id = se.zone_id or "UNASSIGNED"
        repeated_by_zone[z_id] = repeated_by_zone.get(z_id, 0) + 1

        event_type_distribution[se.event_type] = event_type_distribution.get(se.event_type, 0) + 1
        trend = se.trend_state or "UNKNOWN"
        trend_state_distribution[trend] = trend_state_distribution.get(trend, 0) + 1

        # Acknowledgment latency calculation
        if se.started_at and se.acknowledged_at:
            delta = (se.acknowledged_at - se.started_at).total_seconds()
            if delta >= 0:
                ack_durations.append(delta)
        else:
            missing_ack_count += 1

        # Resolution latency calculation
        if se.duration_seconds is not None and se.duration_seconds >= 0:
            res_durations.append(se.duration_seconds)
        elif se.started_at and se.resolved_at:
            delta = (se.resolved_at - se.started_at).total_seconds()
            if delta >= 0:
                res_durations.append(delta)
        else:
            missing_res_count += 1

    avg_ack_seconds = round(sum(ack_durations) / len(ack_durations), 1) if ack_durations else None
    avg_res_seconds = round(sum(res_durations) / len(res_durations), 1) if res_durations else None

    # 3. Interventions Query
    inv_query = select(TrainerIntervention)
    if session_id:
        inv_query = inv_query.where(TrainerIntervention.session_id == session_id)
    interventions = db.exec(inv_query).all()

    intervention_outcomes: Dict[str, int] = {
        "IMPROVED": 0,
        "UNCHANGED": 0,
        "WORSENED": 0,
        "INCONCLUSIVE": 0
    }
    intervention_categories: Dict[str, int] = {}

    for inv in interventions:
        if inv.comparison_outcome in intervention_outcomes:
            intervention_outcomes[inv.comparison_outcome] += 1
        intervention_categories[inv.category] = intervention_categories.get(inv.category, 0) + 1

    return {
        "session_filter": session_id,
        "inspections": {
            "total": total_inspections,
            "unresolved": unresolved_inspections,
            "completed": completed_inspections,
            "cancelled": cancelled_inspections,
            "decisions": decision_counts,
            "checklist_steps": {
                "completed": completed_steps_total,
                "skipped": skipped_steps_total,
                "follow_up_required": follow_up_steps_total
            }
        },
        "safety_events": {
            "total": len(events),
            "by_type": event_type_distribution,
            "by_trend": trend_state_distribution,
            "repeated_by_machine": repeated_by_machine,
            "repeated_by_zone": repeated_by_zone,
            "timing_metrics": {
                "average_time_to_acknowledge_seconds": avg_ack_seconds,
                "acknowledged_samples_count": len(ack_durations),
                "unacknowledged_or_missing_samples": missing_ack_count,
                "average_time_to_resolve_seconds": avg_res_seconds,
                "resolved_samples_count": len(res_durations),
                "unresolved_or_missing_samples": missing_res_count
            }
        },
        "interventions": {
            "total": len(interventions),
            "outcomes": intervention_outcomes,
            "categories": intervention_categories
        }
    }
