from fastapi.testclient import TestClient

def test_create_trainee(client: TestClient):
    response = client.post("/api/trainees", json={"trainee_id": "TEST-001", "name": "Test Trainee"})
    assert response.status_code == 201
    assert response.json()["trainee_id"] == "TEST-001"

def test_duplicate_trainee(client: TestClient):
    client.post("/api/trainees", json={"trainee_id": "TEST-001", "name": "Test Trainee"})
    response = client.post("/api/trainees", json={"trainee_id": "TEST-001", "name": "Test Trainee 2"})
    assert response.status_code == 400

def test_read_trainee(client: TestClient):
    post_resp = client.post("/api/trainees", json={"trainee_id": "TEST-002", "name": "Test Trainee 2"})
    t_id = post_resp.json()["id"]
    get_resp = client.get(f"/api/trainees/{t_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["name"] == "Test Trainee 2"

def test_update_trainee(client: TestClient):
    post_resp = client.post("/api/trainees", json={"trainee_id": "TEST-003", "name": "Test Trainee 3"})
    t_id = post_resp.json()["id"]
    patch_resp = client.patch(f"/api/trainees/{t_id}", json={"name": "Updated Name"})
    assert patch_resp.status_code == 200
    assert patch_resp.json()["name"] == "Updated Name"

def test_delete_trainee(client: TestClient):
    post_resp = client.post("/api/trainees", json={"trainee_id": "TEST-004", "name": "Test Trainee 4"})
    t_id = post_resp.json()["id"]
    del_resp = client.delete(f"/api/trainees/{t_id}")
    assert del_resp.status_code == 204
    get_resp = client.get(f"/api/trainees/{t_id}")
    assert get_resp.status_code == 404
