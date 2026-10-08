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
