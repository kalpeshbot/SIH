"""
Unit and integration tests for MORD Phase 15B Intelligence:
- Evidence-guided inspection workflow & templates
- Deterministic evidence quality engine
- State-conditioned baseline comparison & anomaly explanations
- Hazard persistence, escalation, and recovery
- Trainer intervention effect comparison
- Session replay & trainer intelligence analytics
- Maintenance-ready export & CSV formula injection security
"""

import json
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select

from app.models.session import Session as DBSession
from app.models.trainee import Trainee
from app.models.device import Device
from app.models.zone import Zone
from app.models.reading import SensorReading
from app.models.safety_event import SafetyEvent, MachineBaseline
from app.models.inspection import Inspection, InspectionEvidence, TrainerIntervention

from app.services.inspection_templates import get_all_templates, get_template_by_id
from app.services.evidence_quality_engine import assess_evidence_quality
from app.services.anomaly_explanation_engine import compare_feature_to_baseline, normalize_machine_state
from app.services.event_trend_engine import classify_event_trend
from app.services.intervention_service import compare_intervention_effect
from app.services.export_service import sanitize_csv_cell, export_inspection_csv, export_session_evidence_package_csv
from app.services.session_replay_service import get_session_replay_timeline, get_trainer_intelligence_analytics


@pytest.fixture
def base_setup(client: TestClient, session: Session):
    """Seed base trainee, device, zone, and active session with unique identifiers."""
    import uuid
    uid = uuid.uuid4().hex[:8]
    t_id = f"TR-15B-{uid}"
    d_id = f"DEV-15B-{uid}"
    z_id = f"ZONE-15B-{uid}"
    s_id = f"SESS-15B-{uid}"

    trainee = Trainee(trainee_id=t_id, name="Alex Carter")
    device = Device(device_id=d_id, device_type="MACHINE_NODE", battery=95, status="ONLINE")
    zone = Zone(zone_id=z_id, name="Machining Cell A")
    session.add(trainee)
    session.add(device)
    session.add(zone)
    session.commit()

    db_sess = DBSession(
        session_id=s_id,
        trainee_id=t_id,
        device_id=d_id,
        zone_id=z_id,
        session_type="INSPECTION_PRACTICE",
        status="ACTIVE",
        start_time=datetime.now(timezone.utc)
    )
    session.add(db_sess)
    session.commit()

    return {
        "trainee_id": t_id,
        "device_id": d_id,
        "zone_id": z_id,
        "session_id": s_id
    }



# =========================================================================
# 1. INSPECTION TEMPLATES & WORKFLOW
# =========================================================================

def test_inspection_templates_service():
    templates = get_all_templates()
    assert len(templates) >= 3
    template_ids = {t.template_id for t in templates}
    assert "LATHE_MECHANICAL_INSPECTION" in template_ids
    assert "PUMP_PIPE_INSPECTION" in template_ids
    assert "GENERAL_WORKSHOP_INSPECTION" in template_ids

    lathe = get_template_by_id("LATHE_MECHANICAL_INSPECTION")
    assert lathe is not None
    assert len(lathe.steps) == 5
    assert lathe.steps[0].step_id == "LATHE-STEP-1"


def test_inspection_full_lifecycle(client: TestClient, base_setup: dict):
    # 1. Create inspection with template
    create_resp = client.post("/api/inspections", json={
        "inspection_id": "INSP-TEST-001",
        "session_id": base_setup["session_id"],
        "template_id": "LATHE_MECHANICAL_INSPECTION",
        "machine_id": "LATHE-01",
        "reason": "Vibration elevation observed during turning operation",
        "trainer_id": "TR-LEAD-01"
    })
    assert create_resp.status_code == 201
    data = create_resp.json()
    assert data["inspection_id"] == "INSP-TEST-001"
    assert data["status"] == "IN_PROGRESS"
    assert len(data["checklist"]) == 5
    assert data["checklist"][0]["status"] == "PENDING"

    # 2. Update checklist steps
    step_resp = client.patch(
        f"/api/inspections/INSP-TEST-001/steps/{data['checklist'][0]['step_id']}",
        json={
            "status": "COMPLETED",
            "observation": "Chuck jaws torqued to specification; no deflection detected."
        }
    )
    assert step_resp.status_code == 200
    updated_insp = step_resp.json()
    assert updated_insp["checklist"][0]["status"] == "COMPLETED"
    assert "torqued" in updated_insp["checklist"][0]["observation"]

    # Skip step 2
    step2_resp = client.patch(
        f"/api/inspections/INSP-TEST-001/steps/{data['checklist'][1]['step_id']}",
        json={
            "status": "SKIPPED",
            "observation": "Enclosure locked during spindle spin-down."
        }
    )
    assert step2_resp.status_code == 200
    assert step2_resp.json()["checklist"][1]["status"] == "SKIPPED"

    # 3. Add manual evidence record
    ev_resp = client.post("/api/inspections/INSP-TEST-001/evidence", json={
        "evidence_id": "EV-001",
        "evidence_type": "MANUAL_MEASUREMENT",
        "source": "MANUAL",
        "value": 1.45,
        "unit": "mm/s",
        "notes": "Dial indicator radial runout check."
    })
    assert ev_resp.status_code == 201
    ev_data = ev_resp.json()
    assert ev_data["value"] == 1.45
    assert ev_data["unit"] == "mm/s"

    # 4. Evidence Quality endpoint
    eq_resp = client.get("/api/inspections/INSP-TEST-001/evidence-quality")
    assert eq_resp.status_code == 200
    eq_data = eq_resp.json()
    assert eq_data["status"] in {"SUFFICIENT", "DEGRADED", "INSUFFICIENT"}

    # 5. Complete inspection
    comp_resp = client.post("/api/inspections/INSP-TEST-001/complete", json={
        "decision": "CONFIRMED_BY_TRAINER",
        "outcome_notes": "Slight spindle bearing looseness confirmed; adjusted pre-load nut.",
        "trainer_notes": "Trainee guided on correct torque wrench usage."
    })
    assert comp_resp.status_code == 200
    comp_data = comp_resp.json()
    assert comp_data["status"] == "COMPLETED"
    assert comp_data["decision"] == "CONFIRMED_BY_TRAINER"
    assert comp_data["completed_at"] is not None

    # Step modification rejected after completion
    err_patch = client.patch(
        f"/api/inspections/INSP-TEST-001/steps/{data['checklist'][0]['step_id']}",
        json={"status": "PENDING"}
    )
    assert err_patch.status_code == 400


def test_inspection_decision_validation(client: TestClient, base_setup: dict):
    client.post("/api/inspections", json={
        "inspection_id": "INSP-DEC-001",
        "session_id": base_setup["session_id"],
        "reason": "Test decision validation"
    })

    # Invalid decision
    bad_resp = client.post("/api/inspections/INSP-DEC-001/complete", json={
        "decision": "ARBITRARY_DECISION"
    })
    assert bad_resp.status_code == 422

    # Valid decision: INSUFFICIENT_EVIDENCE
    good_resp = client.post("/api/inspections/INSP-DEC-001/complete", json={
        "decision": "INSUFFICIENT_EVIDENCE",
        "outcome_notes": "Missing baseline data"
    })
    assert good_resp.status_code == 200
    assert good_resp.json()["decision"] == "INSUFFICIENT_EVIDENCE"


def test_cross_session_inspection_rejection(client: TestClient, session: Session, base_setup: dict):
    # Create another device and session
    other_dev = Device(device_id="DEV-OTHER-99", device_type="MACHINE_NODE", battery=90, status="ONLINE")
    session.add(other_dev)
    session.commit()

    other_sess = DBSession(
        session_id="SESS-OTHER-99",
        trainee_id=base_setup["trainee_id"],
        device_id="DEV-OTHER-99",
        session_type="INSPECTION",
        status="ACTIVE",
        start_time=datetime.now(timezone.utc)
    )
    session.add(other_sess)

    # Event belonging to SESS-OTHER-99
    event = SafetyEvent(
        event_id="EVT-OTHER-01",
        session_id="SESS-OTHER-99",
        device_id="DEV-OTHER-99",
        event_type="VIBRATION_ANOMALY",
        severity="WARNING"
    )
    session.add(event)
    session.commit()


    # Attempt to associate EVT-OTHER-01 with base_setup["session_id"]
    resp = client.post("/api/inspections", json={
        "inspection_id": "INSP-CROSS-01",
        "session_id": base_setup["session_id"],
        "event_id": "EVT-OTHER-01",
        "reason": "Testing cross session error"
    })
    assert resp.status_code == 400
    assert "Cross-session" in resp.json()["detail"]


# =========================================================================
# 2. EVIDENCE QUALITY ENGINE
# =========================================================================

def test_evidence_quality_engine_rules():
    # Test 1: Completely empty dataset -> INSUFFICIENT
    res_empty = assess_evidence_quality(readings=[], evidence_items=[])
    assert res_empty.status == "INSUFFICIENT"
    assert any("No sensor telemetry" in issue for issue in res_empty.quality_issues)

    # Test 2: Non-finite reading -> INSUFFICIENT
    r_nan = SensorReading(session_id="SESS-01", device_id="D-01", sensor_type="VIBRATION", value=float("nan"))
    res_nan = assess_evidence_quality(readings=[r_nan])
    assert res_nan.status == "INSUFFICIENT"
    assert any("non-finite" in issue for issue in res_nan.quality_issues)

    # Test 3: Sensor DISCONNECTED -> INSUFFICIENT
    r_normal = SensorReading(
        session_id="SESS-01",
        device_id="D-01",
        sensor_type="VIBRATION",
        value=2.5,
        timestamp=datetime.now(timezone.utc)
    )
    res_disc = assess_evidence_quality(
        readings=[r_normal],
        sensor_health_statuses={"PRIMARY": "DISCONNECTED"}
    )
    assert res_disc.status == "INSUFFICIENT"

    # Test 4: Sensor WARMING_UP -> DEGRADED
    res_warm = assess_evidence_quality(
        readings=[r_normal],
        sensor_health_statuses={"PRIMARY": "WARMING_UP"}
    )
    assert res_warm.status == "DEGRADED"

    # Test 5: Stale readings -> DEGRADED
    stale_ts = datetime.now(timezone.utc) - timedelta(seconds=120)
    r_stale = SensorReading(session_id="SESS-01", device_id="D-01", sensor_type="VIBRATION", value=2.0, timestamp=stale_ts)
    res_stale = assess_evidence_quality(readings=[r_stale], stale_threshold_seconds=60.0)
    assert res_stale.status == "DEGRADED"
    assert any("stale" in issue for issue in res_stale.quality_issues)

    # Test 6: Baseline sample count < 20 -> DEGRADED
    baseline_few = MachineBaseline(
        baseline_id="BASE-01",
        machine_id="M-01",
        sensor_type="VIBRATION",
        machine_state="ACTIVE",
        feature_name="RMS",
        baseline_value=1.5,
        sample_count=12,
        validity_state="VALID"
    )
    res_base = assess_evidence_quality(
        readings=[r_normal],
        baseline=baseline_few,
        min_baseline_samples=20,
        machine_state="ACTIVE"
    )
    assert res_base.status == "DEGRADED"
    assert any("below minimum policy" in issue for issue in res_base.quality_issues)

    # Test 7: Fresh, healthy, valid baseline with >= 20 samples -> SUFFICIENT
    baseline_good = MachineBaseline(
        baseline_id="BASE-02",
        machine_id="M-01",
        sensor_type="VIBRATION",
        machine_state="ACTIVE",
        feature_name="RMS",
        baseline_value=1.5,
        sample_count=35,
        validity_state="VALID"
    )
    res_good = assess_evidence_quality(
        readings=[r_normal],
        baseline=baseline_good,
        sensor_health_statuses={"PRIMARY": "OK"},
        machine_state="ACTIVE",
        min_baseline_samples=20
    )
    assert res_good.status == "SUFFICIENT"


# =========================================================================
# 3. BASELINES & ANOMALY EXPLANATION
# =========================================================================

def test_anomaly_explanation_engine():
    # Baseline with >= 20 samples
    baseline = MachineBaseline(
        baseline_id="BASE-LATHE-RMS",
        machine_id="LATHE-01",
        sensor_type="VIBRATION",
        machine_state="ACTIVE",
        feature_name="RMS",
        baseline_value=2.0,
        spread=0.2,
        sample_count=30,
        validity_state="VALID"
    )

    # Nominal reading: 2.1 (deviation 0.1, z = 0.5)
    nom_res = compare_feature_to_baseline(2.1, baseline, current_machine_state="ACTIVE")
    assert nom_res["is_anomaly"] is False
    assert nom_res["status"] == "NOMINAL"
    assert nom_res["deviation"] == 0.1

    # Anomaly reading: 3.2 (deviation 1.2, z = 6.0 >= 3.0)
    anom_res = compare_feature_to_baseline(3.2, baseline, current_machine_state="ACTIVE")
    assert anom_res["is_anomaly"] is True
    assert anom_res["status"] == "ANOMALY_DETECTED"
    assert anom_res["rule_triggered"] == "SIGMA_SPREAD_EXCEEDED"
    assert "LATHE-01" in nom_res["baseline_used"] or "BASE-LATHE-RMS" in anom_res["baseline_used"]
    assert "not automatic machinery diagnosis" in anom_res["disclaimer"]

    # Insufficient baseline sample count (< 20)
    baseline_small = MachineBaseline(
        baseline_id="BASE-SMALL",
        machine_id="LATHE-01",
        sensor_type="VIBRATION",
        machine_state="ACTIVE",
        feature_name="RMS",
        baseline_value=2.0,
        sample_count=8,
        validity_state="VALID"
    )
    small_res = compare_feature_to_baseline(3.5, baseline_small, current_machine_state="ACTIVE")
    assert small_res["is_anomaly"] is False
    assert small_res["status"] == "INSUFFICIENT_SAMPLES"
    assert "below minimum requirement" in small_res["explanation"]


# =========================================================================
# 4. EVENT TREND, PERSISTENCE, ESCALATION, RECOVERY
# =========================================================================

def test_event_trend_engine():
    now = datetime.now(timezone.utc)
    event = SafetyEvent(
        event_id="EVT-TREND-01",
        session_id="S-01",
        device_id="D-01",
        event_type="VIBRATION_ANOMALY",
        severity="WARNING",
        started_at=now - timedelta(minutes=5),
        persistence_count=2
    )

    # 1. Missing readings -> UNKNOWN (Missing data is NOT recovery)
    trend_missing = classify_event_trend(event, recent_readings=[], threshold_value=3.0)
    assert trend_missing["trend_state"] == "UNKNOWN"
    assert "Missing data must not be interpreted as recovery" in trend_missing["trend_reason"]

    # 2. Sensor disconnected -> UNKNOWN (Disconnection is NOT recovery)
    r1 = SensorReading(session_id="S-01", device_id="D-01", sensor_type="VIBRATION", value=1.0, timestamp=now)
    trend_disc = classify_event_trend(
        event,
        recent_readings=[r1, r1, r1],
        threshold_value=3.0,
        sensor_health_status="DISCONNECTED"
    )
    assert trend_disc["trend_state"] == "UNKNOWN"
    assert "Loss of telemetry must not be interpreted as hazard recovery" in trend_disc["trend_reason"]

    # 3. Sustained elevated readings -> PERSISTENT
    r_high1 = SensorReading(session_id="S-01", device_id="D-01", sensor_type="VIBRATION", value=4.1, timestamp=now - timedelta(seconds=20))
    r_high2 = SensorReading(session_id="S-01", device_id="D-01", sensor_type="VIBRATION", value=4.2, timestamp=now - timedelta(seconds=10))
    r_high3 = SensorReading(session_id="S-01", device_id="D-01", sensor_type="VIBRATION", value=4.3, timestamp=now)
    trend_persist = classify_event_trend(event, recent_readings=[r_high1, r_high2, r_high3], threshold_value=3.0)
    assert trend_persist["trend_state"] == "PERSISTENT"
    assert trend_persist["persistence_count"] == 3

    # 4. Increasing magnitude -> ESCALATING (> 15% increase)
    r_esc1 = SensorReading(session_id="S-01", device_id="D-01", sensor_type="VIBRATION", value=3.2, timestamp=now - timedelta(seconds=20))
    r_esc2 = SensorReading(session_id="S-01", device_id="D-01", sensor_type="VIBRATION", value=4.0, timestamp=now - timedelta(seconds=10))
    r_esc3 = SensorReading(session_id="S-01", device_id="D-01", sensor_type="VIBRATION", value=5.0, timestamp=now)
    trend_esc = classify_event_trend(event, recent_readings=[r_esc1, r_esc2, r_esc3], threshold_value=3.0)
    assert trend_esc["trend_state"] == "ESCALATING"
    assert "increased by +" in trend_esc["trend_reason"]

    # 5. Consecutive sub-threshold samples with healthy sensor -> RECOVERING
    r_rec1 = SensorReading(session_id="S-01", device_id="D-01", sensor_type="VIBRATION", value=2.2, timestamp=now - timedelta(seconds=20))
    r_rec2 = SensorReading(session_id="S-01", device_id="D-01", sensor_type="VIBRATION", value=1.8, timestamp=now - timedelta(seconds=10))
    r_rec3 = SensorReading(session_id="S-01", device_id="D-01", sensor_type="VIBRATION", value=1.5, timestamp=now)
    trend_rec = classify_event_trend(event, recent_readings=[r_rec1, r_rec2, r_rec3], threshold_value=3.0)
    assert trend_rec["trend_state"] == "RECOVERING"
    assert trend_rec["persistence_count"] == 1


# =========================================================================
# 5. TRAINER INTERVENTION & EFFECT COMPARISON
# =========================================================================

def test_trainer_intervention_comparison():
    # 1. Improvement: 4.5 -> 2.1 mm/s (decrease > 10%)
    before_win = {"feature": "RMS", "unit": "mm/s", "machine_state": "ACTIVE", "mean_value": 4.5}
    after_win = {"feature": "RMS", "unit": "mm/s", "machine_state": "ACTIVE", "mean_value": 2.1}
    res_imp = compare_intervention_effect(before_win, after_win)
    assert res_imp["comparison_outcome"] == "IMPROVED"
    assert "observed before-and-after comparison" in res_imp["comparison_notes"]

    # 2. Incompatible units -> INCONCLUSIVE
    after_bad_unit = {"feature": "RMS", "unit": "bar", "machine_state": "ACTIVE", "mean_value": 2.1}
    res_unit_err = compare_intervention_effect(before_win, after_bad_unit)
    assert res_unit_err["comparison_outcome"] == "INCONCLUSIVE"
    assert "Incompatible measurement units" in res_unit_err["comparison_notes"]

    # 3. Differing machine states -> INCONCLUSIVE
    after_diff_state = {"feature": "RMS", "unit": "mm/s", "machine_state": "IDLE", "mean_value": 2.1}
    res_state_err = compare_intervention_effect(before_win, after_diff_state)
    assert res_state_err["comparison_outcome"] == "INCONCLUSIVE"
    assert "operating state shifted" in res_state_err["comparison_notes"]

    # 4. Differing features -> INCONCLUSIVE
    after_diff_feat = {"feature": "PEAK", "unit": "mm/s", "machine_state": "ACTIVE", "mean_value": 2.1}
    res_feat_err = compare_intervention_effect(before_win, after_diff_feat)
    assert res_feat_err["comparison_outcome"] == "INCONCLUSIVE"


def test_intervention_router_integration(client: TestClient, base_setup: dict):
    resp = client.post("/api/interventions", json={
        "intervention_id": "INV-TEST-001",
        "session_id": base_setup["session_id"],
        "category": "WORKHOLDING_ADJUSTMENT",
        "notes": "Tightened 3-jaw chuck mount and reset tailstock pressure.",
        "before_window_data": {"feature": "RMS", "unit": "mm/s", "machine_state": "ACTIVE", "mean_value": 5.0},
        "after_window_data": {"feature": "RMS", "unit": "mm/s", "machine_state": "ACTIVE", "mean_value": 2.2}
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["intervention_id"] == "INV-TEST-001"
    assert data["comparison_outcome"] == "IMPROVED"

    # Query endpoint
    list_resp = client.get(f"/api/interventions?session_id={base_setup['session_id']}")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1


# =========================================================================
# 6. SESSION REPLAY & TRAINER INTELLIGENCE
# =========================================================================

def test_session_replay_and_trainer_intelligence(client: TestClient, session: Session, base_setup: dict):
    # Add a SafetyEvent
    se = SafetyEvent(
        event_id="EVT-REPLAY-01",
        session_id=base_setup["session_id"],
        device_id=base_setup["device_id"],
        event_type="ACOUSTIC_ANOMALY",
        severity="WARNING",
        started_at=datetime.now(timezone.utc) - timedelta(minutes=4),
        acknowledged_at=datetime.now(timezone.utc) - timedelta(minutes=3),
        resolved_at=datetime.now(timezone.utc) - timedelta(minutes=1),
        duration_seconds=180.0
    )
    session.add(se)
    session.commit()

    # Replay timeline endpoint
    replay_resp = client.get(f"/api/sessions/{base_setup['session_id']}/replay")
    assert replay_resp.status_code == 200
    replay_data = replay_resp.json()
    assert replay_data["session_id"] == base_setup["session_id"]
    assert replay_data["total_records"] >= 2
    record_types = {r["record_type"] for r in replay_data["records"]}
    assert "SESSION_LIFECYCLE" in record_types
    assert "SAFETY_EVENT" in record_types

    # Trainer Analytics endpoint
    analytics_resp = client.get(f"/api/trainer/analytics?session_id={base_setup['session_id']}")
    assert analytics_resp.status_code == 200
    adata = analytics_resp.json()
    assert "inspections" in adata
    assert "safety_events" in adata
    assert "interventions" in adata
    assert adata["safety_events"]["timing_metrics"]["average_time_to_acknowledge_seconds"] is not None
    assert adata["safety_events"]["timing_metrics"]["average_time_to_resolve_seconds"] == 180.0


# =========================================================================
# 7. MAINTENANCE EXPORT & CSV FORMULA INJECTION DEFENSE
# =========================================================================

def test_csv_formula_injection_defense():
    # Test formula characters
    assert sanitize_csv_cell("=CMD|' /C calc'!A0") == "'=CMD|' /C calc'!A0"
    assert sanitize_csv_cell("+1234567") == "+1234567"  # Valid pure number string preserved
    assert sanitize_csv_cell("+cmd|' /C calc'!A0") == "'+cmd|' /C calc'!A0"
    assert sanitize_csv_cell("-5.25") == "-5.25"  # Valid pure float preserved
    assert sanitize_csv_cell("-2+3") == "'-2+3'" or sanitize_csv_cell("-2+3") == "'-2+3"
    assert sanitize_csv_cell("@SUM(1+1)") == "'@SUM(1+1)"
    assert sanitize_csv_cell("\t=1+1") == "'\t=1+1"
    assert sanitize_csv_cell("%05") == "'%05"
    assert sanitize_csv_cell(None) == ""
    assert sanitize_csv_cell(42) == 42
    assert sanitize_csv_cell(-3.14) == -3.14


def test_malicious_inputs_in_csv_export(client: TestClient, session: Session, base_setup: dict):
    # Create inspection with formula injection payload in trainer_notes and reason
    malicious_notes = "=cmd|' /C calc'!A0"
    malicious_reason = "@SUM(A1:A5)"
    malicious_step_obs = "-2+5+cmd"

    insp = Inspection(
        inspection_id="INSP-MALICIOUS-01",
        session_id=base_setup["session_id"],
        reason=malicious_reason,
        status="IN_PROGRESS",
        trainer_notes=malicious_notes,
        checklist_json=json.dumps([{
            "step_id": "STEP-1",
            "instruction": "+DDE('cmd';'/c calc';'a')",
            "component": "Chuck",
            "reference_position": "Pos1",
            "status": "COMPLETED",
            "observation": malicious_step_obs
        }])
    )
    session.add(insp)
    session.commit()

    # Request CSV export
    csv_resp = client.get("/api/inspections/INSP-MALICIOUS-01/export?format=csv")
    assert csv_resp.status_code == 200
    csv_text = csv_resp.text

    # Verify formula characters were neutralized with prepended quote
    assert "'=cmd|" in csv_text
    assert "'@SUM(" in csv_text
    assert "'+DDE(" in csv_text

    # Verify underlying database record was NOT altered
    db_insp = session.exec(select(Inspection).where(Inspection.inspection_id == "INSP-MALICIOUS-01")).first()
    assert db_insp.trainer_notes == malicious_notes  # Still original in DB!
    assert db_insp.reason == malicious_reason
