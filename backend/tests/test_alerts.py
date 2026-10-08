from fastapi.testclient import TestClient

def test_create_alert(client: TestClient):
    response = client.post("/api/alerts", json={
        "hazard_type": "GAS",
        "severity": "WARNING",
        "message": "Test warning"
    })
    assert response.status_code == 201
    assert response.json()["acknowledged"] is False

def test_read_alert(client: TestClient):
    post_resp = client.post("/api/alerts", json={
        "hazard_type": "WATER",
        "severity": "INFO",
        "message": "Test info"
    })
    a_id = post_resp.json()["id"]
    get_resp = client.get(f"/api/alerts/{a_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["hazard_type"] == "WATER"

def test_acknowledge_alert(client: TestClient):
    post_resp = client.post("/api/alerts", json={
        "hazard_type": "PRESSURE",
        "severity": "DANGER",
        "message": "Test danger"
    })
    a_id = post_resp.json()["id"]
    patch_resp = client.patch(f"/api/alerts/{a_id}", json={"acknowledged": True})
    assert patch_resp.status_code == 200
    assert patch_resp.json()["acknowledged"] is True
