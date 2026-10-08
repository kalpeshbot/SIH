import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session
from datetime import datetime, timezone

from app.models.trainee import Trainee
from app.models.device import Device
from app.models.zone import Zone
from app.models.session import Session as DBSession
from app.models.safety_event import SafetyEvent, MachineBaseline
from app.services.intelligence_engine import (
    evaluate_sensor_health,
    assess_cross_sensor_corroboration,
    generate_explainable_alert,
    build_safety_event
)


@pytest.fixture(autouse=True)
def setup_base_entities(client: TestClient):
    """Seed prerequisite database records for testing."""
    # 1. Trainee
    client.post("/api/trainees", json={"trainee_id": "TR-INTEL-1", "name": "Jane Intel"})
    # 2. Zone
    client.post("/api/zones", json={"zone_id": "ZONE-LATHE-1", "name": "Lathe Machining Bay"})
    # 3. Devices with various device_types
    client.post("/api/devices", json={
        "device_id": "DEV-MNODE-1",
        "device_type": "MACHINE_NODE",
        "status": "ONLINE"
    })
    client.post("/api/devices", json={
        "device_id": "DEV-GATEWAY-1",
        "device_type": "GATEWAY",
        "status": "ONLINE"
    })
    client.post("/api/devices", json={
        "device_id": "DEV-HANDHELD-1",
        "device_type": "HANDHELD",
        "status": "ONLINE"
    })
    # 4. Active Session
    client.post("/api/sessions", json={
        "session_id": "SESS-INTEL-100",
        "trainee_id": "TR-INTEL-1",
        "device_id": "DEV-MNODE-1",
        "zone_id": "ZONE-LATHE-1",
        "session_type": "LEAK_DETECTION"
    })


# -------------------------------------------------------------
# Part 2 & 3: Device Type Compatibility Tests
# -------------------------------------------------------------

def test_device_type_support(client: TestClient):
    """Verify MACHINE_NODE and GATEWAY device types are accepted alongside HANDHELD and WEARABLE."""
    for dtype in ["MACHINE_NODE", "GATEWAY", "WEARABLE", "HANDHELD", "BEACON"]:
        resp = client.post("/api/devices", json={
            "device_id": f"DEV-TYPE-TEST-{dtype}",
            "device_type": dtype,
            "status": "ONLINE"
        })
        assert resp.status_code == 201, f"Failed for device_type {dtype}: {resp.text}"
        assert resp.json()["device_type"] == dtype


def test_invalid_device_type_rejected(client: TestClient):
    """Reject invalid device types."""
    resp = client.post("/api/devices", json={
        "device_id": "DEV-INVALID-TYPE",
        "device_type": "QUANTUM_SENSOR",
        "status": "ONLINE"
    })
    assert resp.status_code == 422


# -------------------------------------------------------------
# Part 4, 5, 6: Sensor Health & Confidence Engine Tests
# -------------------------------------------------------------

def test_sensor_health_warmup_detection():
    """Gas sensor in warm-up period should not be marked trustworthy."""
    result = evaluate_sensor_health("GAS_LEVEL", raw_value=120.0, uptime_seconds=5.0)
    assert result["status"] == "WARMING_UP"
    assert result["trustworthy"] is False


def test_sensor_health_saturated():
    """Saturated sensor output should be detected as SATURATED."""
    result = evaluate_sensor_health("VIBRATION", raw_value=99999.0, uptime_seconds=60.0)
    assert result["status"] == "SATURATED"
    assert result["trustworthy"] is False


def test_sensor_health_stuck_constant():
    """Stuck signal should be marked UNRELIABLE."""
    result = evaluate_sensor_health("PRESSURE", raw_value=5.0, uptime_seconds=60.0, consecutive_constant_samples=150)
    assert result["status"] == "UNRELIABLE"
    assert result["trustworthy"] is False


def test_sensor_health_normal_ok():
    """Normal operational sensor should report OK and trustworthy."""
    result = evaluate_sensor_health("VIBRATION", raw_value=2.4, uptime_seconds=60.0)
    assert result["status"] == "OK"
    assert result["trustworthy"] is True


def test_cross_sensor_corroboration():
    """Verify confidence level logic for single vs corroborated anomalies."""
    single = assess_cross_sensor_corroboration("VIBRATION", [])
    assert single["confidence_level"] == "MEDIUM"

    corroborated = assess_cross_sensor_corroboration("VIBRATION", ["ACOUSTIC", "TEMPERATURE"])
    assert corroborated["confidence_level"] == "HIGH"
    assert "ACOUSTIC" in corroborated["reason"]


def test_explainable_alert_generation():
    """Generate structured explainable alert contract."""
    alert = generate_explainable_alert(
        condition="HIGH VIBRATION DURING IDLE",
        evidence="Vibration (3.8g) exceeded machine idle baseline (0.5g).",
        confidence="HIGH",
        sensor_status="OK",
        recommended_action="Stop lathe spindle and check workholding clamp."
    )
    assert alert.confidence == "HIGH"
    assert alert.sensor_status == "OK"
    assert "lathe" in alert.recommended_action


# -------------------------------------------------------------
# Part 7, 8, 9, 20: Safety Event API & Lifecycle Tests
# -------------------------------------------------------------

def test_create_safety_event(client: TestClient):
    """Create a structured SafetyEvent record."""
    resp = client.post("/api/events", json={
        "event_id": "EVT-2026-001",
        "session_id": "SESS-INTEL-100",
        "device_id": "DEV-MNODE-1",
        "zone_id": "ZONE-LATHE-1",
        "machine_id": "LATHE-01",
        "event_type": "VIBRATION_ANOMALY",
        "severity": "WARNING",
        "confidence_level": "HIGH",
        "confidence_reason": "Vibration spike persisted during IDLE state",
        "triggering_sensor_types": "VIBRATION,ACOUSTIC",
        "context_state": "IDLE",
        "trainer_note": "Observed during warm-up run"
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["event_id"] == "EVT-2026-001"
    assert data["status"] == "DETECTED"
    assert data["event_type"] == "VIBRATION_ANOMALY"
    assert data["context_state"] == "IDLE"


def test_safety_event_lifecycle_acknowledge_and_resolve(client: TestClient):
    """Test full event lifecycle: DETECTED -> ACKNOWLEDGED -> RESOLVED."""
    # 1. Create
    client.post("/api/events", json={
        "event_id": "EVT-LIFECYCLE-01",
        "session_id": "SESS-INTEL-100",
        "device_id": "DEV-MNODE-1",
        "event_type": "GAS_ANOMALY",
        "severity": "DANGER",
        "confidence_level": "MEDIUM"
    })

    # 2. Acknowledge
    ack_resp = client.post("/api/events/EVT-LIFECYCLE-01/acknowledge", json={
        "trainer_note": "Trainer intervening to inspect valve"
    })
    assert ack_resp.status_code == 200
    ack_data = ack_resp.json()
    assert ack_data["status"] == "ACKNOWLEDGED"
    assert ack_data["acknowledged_at"] is not None
    assert "valve" in ack_data["trainer_note"]

    # 3. Resolve
    res_resp = client.post("/api/events/EVT-LIFECYCLE-01/resolve", json={
        "trainer_note": "Valve closed, gas level returned to baseline"
    })
    assert res_resp.status_code == 200
    res_data = res_resp.json()
    assert res_data["status"] == "RESOLVED"
    assert res_data["resolved_at"] is not None
    assert res_data["ended_at"] is not None
    assert res_data["duration_seconds"] is not None
    assert res_data["duration_seconds"] >= 0.0


def test_safety_event_dismissal(client: TestClient):
    """Test dismissing a safety event."""
    client.post("/api/events", json={
        "event_id": "EVT-DISMISS-01",
        "session_id": "SESS-INTEL-100",
        "device_id": "DEV-MNODE-1",
        "event_type": "SENSOR_FAULT",
        "severity": "INFO"
    })
    dismiss_resp = client.post("/api/events/EVT-DISMISS-01/dismiss")
    assert dismiss_resp.status_code == 200
    assert dismiss_resp.json()["status"] == "DISMISSED"


def test_safety_event_query_filtering(client: TestClient):
    """Filter safety events by status, severity, machine_id, session_id."""
    client.post("/api/events", json={
        "event_id": "EVT-FILTER-1",
        "session_id": "SESS-INTEL-100",
        "device_id": "DEV-MNODE-1",
        "machine_id": "CNC-MILL-02",
        "event_type": "ACOUSTIC_ANOMALY",
        "severity": "CRITICAL"
    })

    # Filter by machine_id
    resp = client.get("/api/events?machine_id=CNC-MILL-02")
    assert resp.status_code == 200
    events = resp.json()
    assert len(events) == 1
    assert events[0]["event_id"] == "EVT-FILTER-1"

    # Filter by severity
    resp_crit = client.get("/api/events?severity=CRITICAL")
    assert resp_crit.status_code == 200
    assert any(e["event_id"] == "EVT-FILTER-1" for e in resp_crit.json())


# -------------------------------------------------------------
# Part 21: Security & Protection Tests
# -------------------------------------------------------------

def test_closed_session_protection(client: TestClient):
    """Cannot record safety event for a COMPLETED session."""
    # Find SESS-INTEL-100 numeric ID
    sessions = client.get("/api/sessions").json()
    sess_obj = next(s for s in sessions if s["session_id"] == "SESS-INTEL-100")
    numeric_id = sess_obj["id"]

    # Complete the session
    patch_resp = client.patch(f"/api/sessions/{numeric_id}", json={"status": "COMPLETED"})
    assert patch_resp.status_code == 200

    # Attempt to post new event to completed session
    resp = client.post("/api/events", json={
        "event_id": "EVT-AFTER-CLOSED",
        "session_id": "SESS-INTEL-100",
        "device_id": "DEV-MNODE-1",
        "event_type": "VIBRATION_ANOMALY"
    })
    assert resp.status_code == 400
    assert "closed session" in resp.json()["detail"].lower()




def test_invalid_event_type_rejected(client: TestClient):
    """Reject unapproved event types."""
    resp = client.post("/api/events", json={
        "event_id": "EVT-INVALID-TYPE",
        "session_id": "SESS-INTEL-100",
        "device_id": "DEV-MNODE-1",
        "event_type": "CYBER_ATTACK_DETECTED"
    })
    assert resp.status_code == 422


def test_invalid_confidence_level_rejected(client: TestClient):
    """Reject invalid confidence levels."""
    resp = client.post("/api/events", json={
        "event_id": "EVT-INVALID-CONF",
        "session_id": "SESS-INTEL-100",
        "device_id": "DEV-MNODE-1",
        "event_type": "VIBRATION_ANOMALY",
        "confidence_level": "99.9%"
    })
    assert resp.status_code == 422


def test_nonexistent_foreign_keys_rejected(client: TestClient):
    """Reject events referencing nonexistent session or device."""
    # Create active session for test
    client.post("/api/sessions", json={
        "session_id": "SESS-ACTIVE-2",
        "trainee_id": "TR-INTEL-1",
        "device_id": "DEV-MNODE-1",
        "session_type": "TRAINING"
    })

    # Nonexistent session
    resp1 = client.post("/api/events", json={
        "event_id": "EVT-BAD-SESS",
        "session_id": "SESS-DOES-NOT-EXIST",
        "device_id": "DEV-MNODE-1",
        "event_type": "VIBRATION_ANOMALY"
    })
    assert resp1.status_code == 404

    # Nonexistent device
    resp2 = client.post("/api/events", json={
        "event_id": "EVT-BAD-DEV",
        "session_id": "SESS-ACTIVE-2",
        "device_id": "DEV-DOES-NOT-EXIST",
        "event_type": "VIBRATION_ANOMALY"
    })
    assert resp2.status_code == 404


# -------------------------------------------------------------
# Part 11, 12, 20: Machine Baseline API Tests
# -------------------------------------------------------------

def test_machine_baseline_create_and_query(client: TestClient):
    """Create and query machine operating baselines."""
    # Create baseline
    resp = client.post("/api/baselines", json={
        "baseline_id": "BASE-LATHE01-VIB-ACTIVE",
        "machine_id": "LATHE-01",
        "sensor_type": "VIBRATION",
        "machine_state": "ACTIVE",
        "feature_name": "RMS",
        "baseline_value": 1.45,
        "spread": 0.22,
        "sample_count": 500
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["baseline_id"] == "BASE-LATHE01-VIB-ACTIVE"
    assert data["baseline_value"] == 1.45

    # Query by machine_id
    get_resp = client.get("/api/baselines/LATHE-01")
    assert get_resp.status_code == 200
    assert len(get_resp.json()) >= 1
    assert get_resp.json()[0]["machine_id"] == "LATHE-01"

    # Query with filters
    filt_resp = client.get("/api/baselines?machine_state=ACTIVE&feature_name=RMS")
    assert filt_resp.status_code == 200
    assert any(b["baseline_id"] == "BASE-LATHE01-VIB-ACTIVE" for b in filt_resp.json())


def test_machine_baseline_upsert(client: TestClient):
    """Updating baseline with same baseline_id updates existing record."""
    client.post("/api/baselines", json={
        "baseline_id": "BASE-LATHE01-IDLE",
        "machine_id": "LATHE-01",
        "sensor_type": "VIBRATION",
        "machine_state": "IDLE",
        "feature_name": "RMS",
        "baseline_value": 0.25,
        "sample_count": 100
    })

    # Upsert with new baseline_value and sample_count
    update_resp = client.post("/api/baselines", json={
        "baseline_id": "BASE-LATHE01-IDLE",
        "machine_id": "LATHE-01",
        "sensor_type": "VIBRATION",
        "machine_state": "IDLE",
        "feature_name": "RMS",
        "baseline_value": 0.28,
        "sample_count": 250
    })
    assert update_resp.status_code == 201
    assert update_resp.json()["baseline_value"] == 0.28
    assert update_resp.json()["sample_count"] == 250


# -------------------------------------------------------------
# Phase 14: Machine Node Feature Telemetry Ingestion Tests
# -------------------------------------------------------------

def test_machine_node_feature_telemetry_ingestion(client: TestClient):
    """Verify backend accepts multi-channel feature telemetry from Machine Node."""
    # 1. Register Machine Node Device
    dev_resp = client.post("/api/devices", json={
        "device_id": "MN-LATHE-01",
        "device_type": "MACHINE_NODE",
        "status": "ONLINE"
    })
    assert dev_resp.status_code in (201, 200, 400) # Created or already exists

    # 2. Create Active Session
    sess_resp = client.post("/api/sessions", json={
        "session_id": "SESS-MNODE-TEST",
        "trainee_id": "TR-INTEL-1",
        "device_id": "MN-LATHE-01",
        "session_type": "TRAINING"
    })
    assert sess_resp.status_code == 201

    # 3. Post compact feature readings (RMS, Peak, Crest Factor, Band Low)
    features = [
        ("VIBRATION_RMS", 0.4215, "g", "NORMAL"),
        ("VIBRATION_PEAK", 1.2850, "g", "NORMAL"),
        ("VIBRATION_CREST_FACTOR", 3.0486, "ratio", "NORMAL"),
        ("VIBRATION_BAND_LOW", 0.4100, "g", "NORMAL")
    ]
    for stype, sval, sunit, sstatus in features:
        read_resp = client.post("/api/readings", json={
            "session_id": "SESS-MNODE-TEST",
            "device_id": "MN-LATHE-01",
            "sensor_type": stype,
            "value": sval,
            "unit": sunit,
            "status": sstatus
        })
        assert read_resp.status_code == 201, f"Failed for {stype}: {read_resp.text}"
        assert read_resp.json()["sensor_type"] == stype

    # 4. Verify readings appear in session readings endpoint
    list_resp = client.get("/api/sessions/SESS-MNODE-TEST/readings")
    assert list_resp.status_code == 200
    types = [r["sensor_type"] for r in list_resp.json()]
    assert "VIBRATION_RMS" in types
    assert "VIBRATION_PEAK" in types
    assert "VIBRATION_CREST_FACTOR" in types

