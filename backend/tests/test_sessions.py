from fastapi.testclient import TestClient

def setup_prerequisites(client):
    client.post("/api/trainees", json={"trainee_id": "TRN-SESS", "name": "Sess Trainee"})
    client.post("/api/devices", json={"device_id": "DEV-SESS", "device_type": "HANDHELD"})

def test_create_session(client: TestClient):
    setup_prerequisites(client)
    response = client.post("/api/sessions", json={
        "session_id": "SESS-001",
        "trainee_id": "TRN-SESS",
        "device_id": "DEV-SESS",
        "session_type": "TRAINING"
    })
    assert response.status_code == 201
    assert response.json()["session_id"] == "SESS-001"
    assert response.json()["status"] == "ACTIVE"

def test_invalid_trainee(client: TestClient):
    response = client.post("/api/sessions", json={
        "session_id": "SESS-002",
        "trainee_id": "TRN-INVALID",
        "device_id": "DEV-SESS",
        "session_type": "TRAINING"
    })
    assert response.status_code == 400
    
def test_invalid_device(client: TestClient):
    client.post("/api/trainees", json={"trainee_id": "TRN-SESS-2", "name": "Sess Trainee 2"})
    response = client.post("/api/sessions", json={
        "session_id": "SESS-003",
        "trainee_id": "TRN-SESS-2",
        "device_id": "DEV-INVALID",
        "session_type": "TRAINING"
    })
    assert response.status_code == 400
