"""
Phase 5: Trainer Workflow Tests
Tests cover: trainer workflow, device exclusivity, zone selection,
session lifecycle, device firmware version, session completion, and alert association.
"""
from fastapi.testclient import TestClient


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def seed_trainee(client, tid="TRN-P5-001", name="Phase5 Trainee"):
    return client.post("/api/trainees", json={"trainee_id": tid, "name": name})

def seed_device(client, did="DEV-P5-001", dtype="HANDHELD", firmware="0.2.0"):
    return client.post("/api/devices", json={
        "device_id": did, "device_type": dtype,
        "firmware_version": firmware, "status": "ONLINE"
    })

def seed_zone(client, zid="ZONE-P5-001", name="Bay A"):
    return client.post("/api/zones", json={"zone_id": zid, "name": name})

def seed_session(client, sid="SESS-P5-001", tid="TRN-P5-001",
                 did="DEV-P5-001", zid=None, stype="TRAINING"):
    body = {"session_id": sid, "trainee_id": tid, "device_id": did, "session_type": stype}
    if zid:
        body["zone_id"] = zid
    return client.post("/api/sessions", json=body)


# ─────────────────────────────────────────────
# Device Registration (Phase 5 fields)
# ─────────────────────────────────────────────

def test_device_create_with_firmware(client: TestClient):
    """Devices can be registered with a firmware_version field."""
    r = seed_device(client, "DEV-FW-001", firmware="0.2.0")
    assert r.status_code == 201
    assert r.json()["firmware_version"] == "0.2.0"

def test_device_firmware_optional(client: TestClient):
    """firmware_version is optional; None when omitted."""
    r = client.post("/api/devices", json={"device_id": "DEV-NO-FW", "device_type": "BEACON"})
    assert r.status_code == 201
    assert r.json()["firmware_version"] is None

def test_device_duplicate_rejected(client: TestClient):
    """Duplicate device_id returns 400."""
    seed_device(client, "DEV-DUP")
    r = seed_device(client, "DEV-DUP")
    assert r.status_code == 400

def test_device_blank_id_rejected(client: TestClient):
    """Blank device_id is rejected with 422."""
    r = client.post("/api/devices", json={"device_id": "   ", "device_type": "HANDHELD"})
    assert r.status_code == 422

def test_device_invalid_status_rejected(client: TestClient):
    """Invalid status value is rejected with 422."""
    r = client.post("/api/devices", json={
        "device_id": "DEV-BAD-STATUS", "device_type": "HANDHELD", "status": "SLEEPING"
    })
    assert r.status_code == 422


# ─────────────────────────────────────────────
# Session Creation – Trainer Workflow
# ─────────────────────────────────────────────

def test_session_create_with_zone(client: TestClient):
    """Session can be created with a zone_id."""
    seed_trainee(client)
    seed_device(client)
    seed_zone(client)
    r = seed_session(client, zid="ZONE-P5-001")
    assert r.status_code == 201
    body = r.json()
    assert body["zone_id"] == "ZONE-P5-001"
    assert body["status"] == "ACTIVE"

def test_session_create_without_zone(client: TestClient):
    """Session can be created without a zone (zone_id is optional)."""
    seed_trainee(client, "TRN-NZ")
    seed_device(client, "DEV-NZ")
    r = seed_session(client, "SESS-NZ", "TRN-NZ", "DEV-NZ")
    assert r.status_code == 201
    assert r.json()["zone_id"] is None

def test_session_invalid_trainee(client: TestClient):
    """Session creation with unknown trainee returns 400."""
    seed_device(client, "DEV-IT")
    r = client.post("/api/sessions", json={
        "session_id": "SESS-IT", "trainee_id": "TRN-GHOST",
        "device_id": "DEV-IT", "session_type": "TRAINING"
    })
    assert r.status_code == 400
    assert "trainee_id" in r.json()["detail"].lower()

def test_session_invalid_device(client: TestClient):
    """Session creation with unknown device returns 400."""
    seed_trainee(client, "TRN-ID")
    r = client.post("/api/sessions", json={
        "session_id": "SESS-ID", "trainee_id": "TRN-ID",
        "device_id": "DEV-GHOST", "session_type": "TRAINING"
    })
    assert r.status_code == 400
    assert "device_id" in r.json()["detail"].lower()

def test_session_invalid_zone(client: TestClient):
    """Session creation with unknown zone returns 400."""
    seed_trainee(client, "TRN-IZ")
    seed_device(client, "DEV-IZ")
    r = client.post("/api/sessions", json={
        "session_id": "SESS-IZ", "trainee_id": "TRN-IZ",
        "device_id": "DEV-IZ", "session_type": "TRAINING",
        "zone_id": "ZONE-GHOST"
    })
    assert r.status_code == 400
    assert "zone_id" in r.json()["detail"].lower()

def test_session_duplicate_rejected(client: TestClient):
    """Duplicate session_id returns 400."""
    seed_trainee(client, "TRN-DUP-S")
    seed_device(client, "DEV-DUP-S1")
    seed_device(client, "DEV-DUP-S2")
    seed_session(client, "SESS-DUP", "TRN-DUP-S", "DEV-DUP-S1")
    r = seed_session(client, "SESS-DUP", "TRN-DUP-S", "DEV-DUP-S2")
    assert r.status_code == 400

def test_session_blank_id_rejected(client: TestClient):
    """Blank session_id returns 422."""
    r = client.post("/api/sessions", json={
        "session_id": "  ", "trainee_id": "T", "device_id": "D", "session_type": "TRAINING"
    })
    assert r.status_code == 422

def test_session_blank_trainee_id_rejected(client: TestClient):
    """Blank trainee_id returns 422."""
    r = client.post("/api/sessions", json={
        "session_id": "SESS-BLK-T", "trainee_id": "  ", "device_id": "D", "session_type": "TRAINING"
    })
    assert r.status_code == 422


# ─────────────────────────────────────────────
# Device Exclusivity
# ─────────────────────────────────────────────

def test_device_exclusivity_active_session(client: TestClient):
    """Cannot assign a device to a new session if it already has an active session."""
    seed_trainee(client, "TRN-EX1")
    seed_trainee(client, "TRN-EX2")
    seed_device(client, "DEV-EX1")

    # First session – should succeed
    r1 = seed_session(client, "SESS-EX1", "TRN-EX1", "DEV-EX1")
    assert r1.status_code == 201

    # Second session with SAME device – should fail with 409
    r2 = seed_session(client, "SESS-EX2", "TRN-EX2", "DEV-EX1")
    assert r2.status_code == 409
    assert "already assigned" in r2.json()["detail"].lower()

def test_device_reusable_after_completion(client: TestClient):
    """Device becomes available again once its session is completed."""
    seed_trainee(client, "TRN-RU1")
    seed_trainee(client, "TRN-RU2")
    seed_device(client, "DEV-RU1")

    r1 = seed_session(client, "SESS-RU1", "TRN-RU1", "DEV-RU1")
    assert r1.status_code == 201
    sess_int_id = r1.json()["id"]

    # Complete the session
    client.patch(f"/api/sessions/{sess_int_id}", json={"status": "COMPLETED", "result": "PASS"})

    # Device should now be available
    r2 = seed_session(client, "SESS-RU2", "TRN-RU2", "DEV-RU1")
    assert r2.status_code == 201

def test_device_reusable_after_cancellation(client: TestClient):
    """Device becomes available again once its session is cancelled."""
    seed_trainee(client, "TRN-CANC-A")
    seed_trainee(client, "TRN-CANC-B")
    seed_device(client, "DEV-CANC-1")

    r1 = seed_session(client, "SESS-CANC1", "TRN-CANC-A", "DEV-CANC-1")
    sess_int_id = r1.json()["id"]
    client.patch(f"/api/sessions/{sess_int_id}", json={"status": "CANCELLED"})

    r2 = seed_session(client, "SESS-CANC2", "TRN-CANC-B", "DEV-CANC-1")
    assert r2.status_code == 201


# ─────────────────────────────────────────────
# Session Lifecycle Transitions
# ─────────────────────────────────────────────

def test_lifecycle_active_to_completed(client: TestClient):
    seed_trainee(client, "TRN-LC1")
    seed_device(client, "DEV-LC1")
    r = seed_session(client, "SESS-LC1", "TRN-LC1", "DEV-LC1")
    sid = r.json()["id"]
    patch = client.patch(f"/api/sessions/{sid}", json={"status": "COMPLETED", "result": "PASS"})
    assert patch.status_code == 200
    assert patch.json()["status"] == "COMPLETED"

def test_lifecycle_active_to_cancelled(client: TestClient):
    seed_trainee(client, "TRN-LC2")
    seed_device(client, "DEV-LC2")
    r = seed_session(client, "SESS-LC2", "TRN-LC2", "DEV-LC2")
    sid = r.json()["id"]
    patch = client.patch(f"/api/sessions/{sid}", json={"status": "CANCELLED"})
    assert patch.status_code == 200
    assert patch.json()["status"] == "CANCELLED"

def test_lifecycle_completed_to_active_rejected(client: TestClient):
    """COMPLETED -> ACTIVE transition must be rejected."""
    seed_trainee(client, "TRN-LC3")
    seed_device(client, "DEV-LC3")
    r = seed_session(client, "SESS-LC3", "TRN-LC3", "DEV-LC3")
    sid = r.json()["id"]
    client.patch(f"/api/sessions/{sid}", json={"status": "COMPLETED"})
    bad = client.patch(f"/api/sessions/{sid}", json={"status": "ACTIVE"})
    assert bad.status_code == 400

def test_lifecycle_cancelled_to_active_rejected(client: TestClient):
    """CANCELLED -> ACTIVE transition must be rejected."""
    seed_trainee(client, "TRN-LC4")
    seed_device(client, "DEV-LC4")
    r = seed_session(client, "SESS-LC4", "TRN-LC4", "DEV-LC4")
    sid = r.json()["id"]
    client.patch(f"/api/sessions/{sid}", json={"status": "CANCELLED"})
    bad = client.patch(f"/api/sessions/{sid}", json={"status": "ACTIVE"})
    assert bad.status_code == 400

def test_lifecycle_completed_to_completed_rejected(client: TestClient):
    """COMPLETED -> COMPLETED must be rejected."""
    seed_trainee(client, "TRN-LC5")
    seed_device(client, "DEV-LC5")
    r = seed_session(client, "SESS-LC5", "TRN-LC5", "DEV-LC5")
    sid = r.json()["id"]
    client.patch(f"/api/sessions/{sid}", json={"status": "COMPLETED"})
    bad = client.patch(f"/api/sessions/{sid}", json={"status": "COMPLETED"})
    assert bad.status_code == 400

def test_lifecycle_active_to_fault(client: TestClient):
    """ACTIVE -> FAULT is a valid transition."""
    seed_trainee(client, "TRN-LC6")
    seed_device(client, "DEV-LC6")
    r = seed_session(client, "SESS-LC6", "TRN-LC6", "DEV-LC6")
    sid = r.json()["id"]
    patch = client.patch(f"/api/sessions/{sid}", json={"status": "FAULT"})
    assert patch.status_code == 200
    assert patch.json()["status"] == "FAULT"

def test_lifecycle_fault_to_completed(client: TestClient):
    """FAULT -> COMPLETED is a valid recovery path."""
    seed_trainee(client, "TRN-LC7")
    seed_device(client, "DEV-LC7")
    r = seed_session(client, "SESS-LC7", "TRN-LC7", "DEV-LC7")
    sid = r.json()["id"]
    client.patch(f"/api/sessions/{sid}", json={"status": "FAULT"})
    patch = client.patch(f"/api/sessions/{sid}", json={"status": "COMPLETED"})
    assert patch.status_code == 200


# ─────────────────────────────────────────────
# Readings blocked on terminal sessions
# ─────────────────────────────────────────────

def test_readings_blocked_on_completed_session(client: TestClient):
    """Backend must reject readings for a completed session."""
    seed_trainee(client, "TRN-RD1")
    seed_device(client, "DEV-RD1")
    seed_session(client, "SESS-RD1", "TRN-RD1", "DEV-RD1")
    r = client.get("/api/sessions")
    sess = next(s for s in r.json() if s["session_id"] == "SESS-RD1")
    client.patch(f"/api/sessions/{sess['id']}", json={"status": "COMPLETED"})

    bad = client.post("/api/readings", json={
        "session_id": "SESS-RD1", "device_id": "DEV-RD1",
        "sensor_type": "test", "value": 1.0, "unit": "u", "status": "NORMAL"
    })
    assert bad.status_code == 400

def test_readings_blocked_on_cancelled_session(client: TestClient):
    """Backend must reject readings for a cancelled session."""
    seed_trainee(client, "TRN-RD2")
    seed_device(client, "DEV-RD2")
    seed_session(client, "SESS-RD2", "TRN-RD2", "DEV-RD2")
    r = client.get("/api/sessions")
    sess = next(s for s in r.json() if s["session_id"] == "SESS-RD2")
    client.patch(f"/api/sessions/{sess['id']}", json={"status": "CANCELLED"})

    bad = client.post("/api/readings", json={
        "session_id": "SESS-RD2", "device_id": "DEV-RD2",
        "sensor_type": "test", "value": 1.0, "unit": "u", "status": "NORMAL"
    })
    assert bad.status_code == 400


# ─────────────────────────────────────────────
# Session delete
# ─────────────────────────────────────────────

def test_delete_completed_session(client: TestClient):
    """Completed session can be deleted."""
    seed_trainee(client, "TRN-DEL1")
    seed_device(client, "DEV-DEL1")
    r = seed_session(client, "SESS-DEL1", "TRN-DEL1", "DEV-DEL1")
    sid = r.json()["id"]
    client.patch(f"/api/sessions/{sid}", json={"status": "COMPLETED"})
    resp = client.delete(f"/api/sessions/{sid}")
    assert resp.status_code == 204

def test_delete_active_session_rejected(client: TestClient):
    """Active session cannot be deleted directly — must be cancelled first."""
    seed_trainee(client, "TRN-DEL2")
    seed_device(client, "DEV-DEL2")
    r = seed_session(client, "SESS-DEL2", "TRN-DEL2", "DEV-DEL2")
    sid = r.json()["id"]
    resp = client.delete(f"/api/sessions/{sid}")
    assert resp.status_code == 409


# ─────────────────────────────────────────────
# Alert Association
# ─────────────────────────────────────────────

def test_alert_created_by_reading_above_threshold(client: TestClient):
    """A reading above the DANGER threshold should create an alert automatically."""
    seed_trainee(client, "TRN-ALT1")
    seed_device(client, "DEV-ALT1")
    seed_session(client, "SESS-ALT1", "TRN-ALT1", "DEV-ALT1")

    r = client.post("/api/readings", json={
        "session_id": "SESS-ALT1", "device_id": "DEV-ALT1",
        "sensor_type": "GAS_LEVEL", "value": 90.0, "unit": "ppm", "status": "DANGER"
    })
    assert r.status_code == 201

    alerts = client.get("/api/alerts").json()
    session_alerts = [a for a in alerts if a["session_id"] == "SESS-ALT1"]
    assert len(session_alerts) > 0
    assert any(a["severity"] == "DANGER" for a in session_alerts)

def test_alert_acknowledged(client: TestClient):
    """Alert can be acknowledged via PATCH."""
    r = client.post("/api/alerts", json={
        "session_id": None, "device_id": None,
        "hazard_type": "TEST", "severity": "INFO",
        "message": "Test alert"
    })
    alert_id = r.json()["id"]
    ack = client.patch(f"/api/alerts/{alert_id}", json={"acknowledged": True})
    assert ack.status_code == 200
    assert ack.json()["acknowledged"] is True

def test_alert_404(client: TestClient):
    """Getting non-existent alert returns 404."""
    r = client.get("/api/alerts/999999")
    assert r.status_code == 404


# ─────────────────────────────────────────────
# Trainee Workflow
# ─────────────────────────────────────────────

def test_trainee_list(client: TestClient):
    """Trainees list endpoint returns a list."""
    r = client.get("/api/trainees")
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_trainee_blank_id_rejected(client: TestClient):
    """Blank trainee_id returns 422."""
    r = client.post("/api/trainees", json={"trainee_id": "  ", "name": "X"})
    assert r.status_code == 422

def test_trainee_blank_name_rejected(client: TestClient):
    """Blank name returns 422."""
    r = client.post("/api/trainees", json={"trainee_id": "TRN-BLK", "name": ""})
    assert r.status_code == 422

def test_zone_list(client: TestClient):
    """Zones list endpoint returns a list."""
    r = client.get("/api/zones")
    assert r.status_code == 200
    assert isinstance(r.json(), list)

def test_session_readings_empty_for_new_session(client: TestClient):
    """A freshly created session has no readings."""
    seed_trainee(client, "TRN-EM1")
    seed_device(client, "DEV-EM1")
    seed_session(client, "SESS-EM1", "TRN-EM1", "DEV-EM1")
    r = client.get("/api/sessions/SESS-EM1/readings")
    assert r.status_code == 200
    assert r.json() == []

def test_session_readings_404_unknown_session(client: TestClient):
    """Readings for unknown session returns 404."""
    r = client.get("/api/sessions/SESS-DOES-NOT-EXIST/readings")
    assert r.status_code == 404
