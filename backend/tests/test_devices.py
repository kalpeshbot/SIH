from fastapi.testclient import TestClient

def test_create_device(client: TestClient):
    response = client.post("/api/devices", json={"device_id": "DEV-001", "device_type": "HANDHELD", "battery": 90})
    assert response.status_code == 201
    assert response.json()["device_id"] == "DEV-001"

def test_invalid_battery(client: TestClient):
    response = client.post("/api/devices", json={"device_id": "DEV-002", "device_type": "HANDHELD", "battery": 150})
    assert response.status_code == 422 # Pydantic validation error

def test_read_device(client: TestClient):
    post_resp = client.post("/api/devices", json={"device_id": "DEV-003", "device_type": "WEARABLE", "battery": 50})
    d_id = post_resp.json()["id"]
    get_resp = client.get(f"/api/devices/{d_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["device_type"] == "WEARABLE"

def test_last_seen_null_on_create(client: TestClient):
    """A newly registered device has no last_seen timestamp."""
    resp = client.post("/api/devices", json={"device_id": "DEV-LS-NEW", "device_type": "HANDHELD", "battery": 75})
    assert resp.status_code == 201
    assert resp.json()["last_seen"] is None

def test_heartbeat_updates_last_seen(client: TestClient):
    """POSTing to /heartbeat sets last_seen to a non-null timestamp."""
    # Create device
    client.post("/api/devices", json={"device_id": "DEV-HB-001", "device_type": "WEARABLE", "battery": 80})

    hb_resp = client.post("/api/devices/DEV-HB-001/heartbeat")
    assert hb_resp.status_code == 200
    assert hb_resp.json() == {"status": "ok"}

    # Verify last_seen is now set
    devices = client.get("/api/devices").json()
    dev = next(d for d in devices if d["device_id"] == "DEV-HB-001")
    assert dev["last_seen"] is not None

def test_heartbeat_404_unknown_device(client: TestClient):
    """Heartbeat returns 404 for an unregistered device ID."""
    resp = client.post("/api/devices/NONEXISTENT-DEVICE/heartbeat")
    assert resp.status_code == 404

def test_reading_updates_device_last_seen(client: TestClient):
    """POSTing a sensor reading automatically updates the device's last_seen."""
    # Seed a trainee, device, and active session
    client.post("/api/trainees", json={"trainee_id": "TRN-LS-001", "name": "LS Tester"})
    client.post("/api/devices", json={"device_id": "DEV-LS-READ", "device_type": "WEARABLE", "battery": 90})
    client.post("/api/sessions", json={
        "session_id": "SESS-LS-001",
        "trainee_id": "TRN-LS-001",
        "device_id": "DEV-LS-READ",
        "session_type": "TRAINING"
    })

    # Confirm last_seen is null before any reading
    devices_before = client.get("/api/devices").json()
    dev_before = next(d for d in devices_before if d["device_id"] == "DEV-LS-READ")
    assert dev_before["last_seen"] is None

    # Post a reading
    client.post("/api/readings", json={
        "session_id": "SESS-LS-001",
        "device_id": "DEV-LS-READ",
        "sensor_type": "test_signal",
        "value": 42.0,
        "unit": "units",
        "status": "NORMAL"
    })

    # Confirm last_seen is now populated
    devices_after = client.get("/api/devices").json()
    dev_after = next(d for d in devices_after if d["device_id"] == "DEV-LS-READ")
    assert dev_after["last_seen"] is not None

