"""
Phase 2 Hardening Audit Test Suite
"""
import math
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool
from app.main import app as fastapi_app
from app.database.database import get_session
from app.database import database

@pytest.fixture(name="client")
def client_fixture():
    sqlite_url = "sqlite://"
    engine = create_engine(
        sqlite_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    def get_session_override():
        with Session(engine) as session:
            yield session
    fastapi_app.dependency_overrides[get_session] = get_session_override
    original_engine = database.engine
    database.engine = engine
    with TestClient(fastapi_app) as c:
        yield c
    fastapi_app.dependency_overrides.pop(get_session, None)
    database.engine = original_engine

def make_trainee(client, trainee_id="TRN-T1", name="Test Trainee"):
    return client.post("/api/trainees", json={"trainee_id": trainee_id, "name": name})

def make_device(client, device_id="DEV-T1", device_type="HANDHELD"):
    return client.post("/api/devices", json={"device_id": device_id, "device_type": device_type})

def make_zone(client, zone_id="ZONE-T1", name="Test Zone"):
    return client.post("/api/zones", json={"zone_id": zone_id, "name": name})

def make_session(client, session_id="SESS-T1", trainee_id="TRN-T1", device_id="DEV-T1", session_type="TRAINING"):
    make_trainee(client, trainee_id)
    make_device(client, device_id)
    return client.post("/api/sessions", json={
        "session_id": session_id,
        "trainee_id": trainee_id,
        "device_id": device_id,
        "session_type": session_type,
    })

def make_reading(client, session_id="SESS-T1", device_id="DEV-T1",
                 sensor_type="GAS_LEVEL", value=10.0, unit="ppm", status="NORMAL"):
    return client.post("/api/readings", json={
        "session_id": session_id,
        "device_id": device_id,
        "sensor_type": sensor_type,
        "value": value,
        "unit": unit,
        "status": status,
    })

# ====================================================
# SECTION 1: INPUT VALIDATION - TRAINEE
# ====================================================
class TestTraineeValidation:
    def test_empty_name_rejected(self, client):
        r = client.post("/api/trainees", json={"trainee_id": "TRN-V1", "name": ""})
        assert r.status_code == 422, f"Expected 422, got {r.status_code}: empty name accepted"

    def test_whitespace_name_rejected(self, client):
        r = client.post("/api/trainees", json={"trainee_id": "TRN-V2", "name": "     "})
        assert r.status_code == 422, f"Expected 422, got {r.status_code}: whitespace name accepted"

    def test_empty_trainee_id_rejected(self, client):
        r = client.post("/api/trainees", json={"trainee_id": "", "name": "Valid Name"})
        assert r.status_code == 422, f"Expected 422, got {r.status_code}: empty trainee_id accepted"

    def test_long_name_handled(self, client):
        r = client.post("/api/trainees", json={"trainee_id": "TRN-LONG", "name": "A" * 1000})
        assert r.status_code in (201, 422), f"Unexpected {r.status_code}"

    def test_missing_name_rejected(self, client):
        r = client.post("/api/trainees", json={"trainee_id": "TRN-M1"})
        assert r.status_code == 422

    def test_missing_trainee_id_rejected(self, client):
        r = client.post("/api/trainees", json={"name": "No ID"})
        assert r.status_code == 422

    def test_duplicate_trainee_returns_400(self, client):
        client.post("/api/trainees", json={"trainee_id": "TRN-DUP", "name": "First"})
        r = client.post("/api/trainees", json={"trainee_id": "TRN-DUP", "name": "Second"})
        assert r.status_code == 400

    def test_sql_injection_in_trainee_id(self, client):
        payload = "' OR '1'='1"
        r = client.post("/api/trainees", json={"trainee_id": payload, "name": "Injector"})
        assert r.status_code in (201, 422)
        if r.status_code == 201:
            assert r.json()["trainee_id"] == payload

# ====================================================
# SECTION 2: INPUT VALIDATION - DEVICE
# ====================================================
class TestDeviceValidation:
    def test_battery_negative_rejected(self, client):
        r = client.post("/api/devices", json={"device_id": "DEV-BN", "device_type": "HANDHELD", "battery": -1})
        assert r.status_code == 422

    def test_battery_over_100_rejected(self, client):
        r = client.post("/api/devices", json={"device_id": "DEV-BO", "device_type": "HANDHELD", "battery": 101})
        assert r.status_code == 422

    def test_battery_zero_accepted(self, client):
        r = client.post("/api/devices", json={"device_id": "DEV-BZ", "device_type": "HANDHELD", "battery": 0})
        assert r.status_code == 201

    def test_battery_100_accepted(self, client):
        r = client.post("/api/devices", json={"device_id": "DEV-B100", "device_type": "HANDHELD", "battery": 100})
        assert r.status_code == 201

    def test_battery_as_string(self, client):
        r = client.post("/api/devices", json={"device_id": "DEV-BS", "device_type": "HANDHELD", "battery": "100"})
        assert r.status_code in (201, 422)

    def test_battery_null_accepted(self, client):
        r = client.post("/api/devices", json={"device_id": "DEV-BNULL", "device_type": "HANDHELD", "battery": None})
        assert r.status_code == 201

    def test_empty_device_id_rejected(self, client):
        r = client.post("/api/devices", json={"device_id": "", "device_type": "HANDHELD"})
        assert r.status_code == 422

    def test_device_with_nonexistent_zone(self, client):
        r = client.post("/api/devices", json={
            "device_id": "DEV-BADZONE", "device_type": "HANDHELD", "zone_id": "ZONE-DOES-NOT-EXIST"
        })
        assert r.status_code in (201, 400, 422, 500)

# ====================================================
# SECTION 3: FOREIGN KEY INTEGRITY
# ====================================================
class TestForeignKeyIntegrity:
    def test_session_with_nonexistent_trainee_rejected(self, client):
        make_device(client)
        r = client.post("/api/sessions", json={
            "session_id": "SESS-FK1", "trainee_id": "TRN-GHOST",
            "device_id": "DEV-T1", "session_type": "TRAINING"
        })
        assert r.status_code in (400, 422), f"Expected 400/422, got {r.status_code}"

    def test_session_with_nonexistent_device_rejected(self, client):
        make_trainee(client)
        r = client.post("/api/sessions", json={
            "session_id": "SESS-FK2", "trainee_id": "TRN-T1",
            "device_id": "DEV-GHOST", "session_type": "TRAINING"
        })
        assert r.status_code in (400, 422), f"Expected 400/422, got {r.status_code}"

    def test_reading_with_nonexistent_session(self, client):
        make_device(client)
        r = client.post("/api/readings", json={
            "session_id": "SESS-GHOST", "device_id": "DEV-T1",
            "sensor_type": "GAS_LEVEL", "value": 10.0, "unit": "ppm", "status": "NORMAL"
        })
        assert r.status_code in (201, 400, 422)

    def test_reading_with_nonexistent_device(self, client):
        make_session(client)
        r = client.post("/api/readings", json={
            "session_id": "SESS-T1", "device_id": "DEV-GHOST",
            "sensor_type": "GAS_LEVEL", "value": 10.0, "unit": "ppm", "status": "NORMAL"
        })
        assert r.status_code in (201, 400, 422)

# ====================================================
# SECTION 4: DELETE SAFETY
# ====================================================
class TestDeleteSafety:
    def test_delete_trainee_with_active_session_blocked(self, client):
        make_session(client)
        trainees = client.get("/api/trainees").json()
        t_id = next(t["id"] for t in trainees if t["trainee_id"] == "TRN-T1")
        r = client.delete(f"/api/trainees/{t_id}")
        assert r.status_code in (400, 409), (
            f"CRITICAL: Trainee with active sessions deleted silently! Status: {r.status_code}")

    def test_delete_device_with_readings_blocked(self, client):
        make_session(client)
        make_reading(client)
        devices = client.get("/api/devices").json()
        d_id = next(d["id"] for d in devices if d["device_id"] == "DEV-T1")
        r = client.delete(f"/api/devices/{d_id}")
        assert r.status_code in (400, 409), (
            f"CRITICAL: Device with readings deleted silently! Status: {r.status_code}")

    def test_delete_zone_with_devices_blocked(self, client):
        make_zone(client)
        client.post("/api/devices", json={"device_id": "DEV-ZONED", "device_type": "HANDHELD", "zone_id": "ZONE-T1"})
        zones = client.get("/api/zones").json()
        z_id = next(z["id"] for z in zones if z["zone_id"] == "ZONE-T1")
        r = client.delete(f"/api/zones/{z_id}")
        assert r.status_code in (400, 409), (
            f"CRITICAL: Zone with devices deleted! Status: {r.status_code}")

    def test_delete_nonexistent_trainee(self, client):
        assert client.delete("/api/trainees/999999").status_code == 404

    def test_delete_nonexistent_device(self, client):
        assert client.delete("/api/devices/999999").status_code == 404

    def test_delete_nonexistent_zone(self, client):
        assert client.delete("/api/zones/999999").status_code == 404

# ====================================================
# SECTION 5: ALERT ENGINE BOUNDARIES
# ====================================================
class TestAlertEngineBoundaries:
    def _setup(self, client):
        make_session(client)

    def _post_reading(self, client, value, sensor_type="GAS_LEVEL"):
        return make_reading(client, value=value, sensor_type=sensor_type)

    def test_below_warning_no_alert(self, client):
        self._setup(client)
        before = len(client.get("/api/alerts").json())
        self._post_reading(client, 49.0)
        assert len(client.get("/api/alerts").json()) == before

    def test_at_warning_threshold(self, client):
        self._setup(client)
        before = len(client.get("/api/alerts").json())
        self._post_reading(client, 50.0)
        new = client.get("/api/alerts").json()[before:]
        assert len(new) == 1 and new[0]["severity"] == "WARNING"

    def test_above_warning(self, client):
        self._setup(client)
        before = len(client.get("/api/alerts").json())
        self._post_reading(client, 51.0)
        new = client.get("/api/alerts").json()[before:]
        assert len(new) == 1 and new[0]["severity"] == "WARNING"

    def test_below_danger_is_warning(self, client):
        self._setup(client)
        before = len(client.get("/api/alerts").json())
        self._post_reading(client, 79.0)
        new = client.get("/api/alerts").json()[before:]
        assert len(new) == 1 and new[0]["severity"] == "WARNING"

    def test_at_danger_threshold(self, client):
        self._setup(client)
        before = len(client.get("/api/alerts").json())
        self._post_reading(client, 80.0)
        new = client.get("/api/alerts").json()[before:]
        assert len(new) == 1 and new[0]["severity"] == "DANGER"

    def test_above_danger(self, client):
        self._setup(client)
        before = len(client.get("/api/alerts").json())
        self._post_reading(client, 81.0)
        new = client.get("/api/alerts").json()[before:]
        assert len(new) == 1 and new[0]["severity"] == "DANGER"

    def test_non_gas_sensor_no_alert(self, client):
        self._setup(client)
        before = len(client.get("/api/alerts").json())
        self._post_reading(client, 999.0, sensor_type="PRESSURE")
        assert len(client.get("/api/alerts").json()) == before

# ====================================================
# SECTION 6: ALERT DEDUPLICATION (CRITICAL)
# ====================================================
class TestAlertDeduplication:
    def test_repeated_danger_readings_produce_one_alert(self, client):
        make_session(client)
        for _ in range(5):
            make_reading(client, value=85.0)
        danger = [a for a in client.get("/api/alerts").json() if a["severity"] == "DANGER"]
        assert len(danger) == 1, f"CRITICAL: Alert spam! {len(danger)} DANGER alerts for 5 identical readings"

    def test_repeated_warning_readings_produce_one_alert(self, client):
        make_session(client)
        for _ in range(5):
            make_reading(client, value=55.0)
        warns = [a for a in client.get("/api/alerts").json() if a["severity"] == "WARNING"]
        assert len(warns) == 1, f"CRITICAL: Warning spam! {len(warns)} for 5 identical readings"

    def test_escalation_warning_then_danger(self, client):
        make_session(client)
        make_reading(client, value=55.0)
        make_reading(client, value=55.0)
        make_reading(client, value=85.0)
        make_reading(client, value=85.0)
        alerts = client.get("/api/alerts").json()
        warn = [a for a in alerts if a["severity"] == "WARNING"]
        danger = [a for a in alerts if a["severity"] == "DANGER"]
        assert len(warn) == 1, f"Expected 1 WARNING, got {len(warn)}"
        assert len(danger) == 1, f"Expected 1 DANGER, got {len(danger)}"

# ====================================================
# SECTION 7: SESSION LIFECYCLE
# ====================================================
class TestSessionLifecycle:
    def test_complete_session(self, client):
        make_session(client)
        s_id = client.get("/api/sessions").json()[0]["id"]
        r = client.patch(f"/api/sessions/{s_id}", json={
            "status": "COMPLETED", "result": "NORMAL",
            "end_time": datetime.now(timezone.utc).isoformat()
        })
        assert r.status_code == 200
        assert r.json()["status"] == "COMPLETED"

    def test_reading_after_completed_session(self, client):
        make_session(client)
        s_id = client.get("/api/sessions").json()[0]["id"]
        client.patch(f"/api/sessions/{s_id}", json={"status": "COMPLETED"})
        r = make_reading(client)
        assert r.status_code in (201, 400)

    def test_double_complete_session(self, client):
        make_session(client)
        s_id = client.get("/api/sessions").json()[0]["id"]
        client.patch(f"/api/sessions/{s_id}", json={"status": "COMPLETED"})
        r = client.patch(f"/api/sessions/{s_id}", json={"status": "COMPLETED"})
        assert r.status_code in (200, 400), f"Double-complete: {r.status_code}"

    def test_cancel_session(self, client):
        make_session(client)
        s_id = client.get("/api/sessions").json()[0]["id"]
        r = client.patch(f"/api/sessions/{s_id}", json={"status": "CANCELLED"})
        assert r.status_code == 200 and r.json()["status"] == "CANCELLED"

    def test_complete_cancelled_session(self, client):
        make_session(client)
        s_id = client.get("/api/sessions").json()[0]["id"]
        client.patch(f"/api/sessions/{s_id}", json={"status": "CANCELLED"})
        r = client.patch(f"/api/sessions/{s_id}", json={"status": "COMPLETED"})
        assert r.status_code in (400, 422), f"Expected 400/422, got {r.status_code}"

    def test_session_readings_endpoint(self, client):
        make_session(client)
        make_reading(client, value=10.0)
        make_reading(client, value=20.0)
        r = client.get("/api/sessions/SESS-T1/readings")
        assert r.status_code == 200 and len(r.json()) == 2

    def test_session_readings_nonexistent_session(self, client):
        r = client.get("/api/sessions/SESS-GHOST/readings")
        assert r.status_code in (200, 404)

# ====================================================
# SECTION 8: SENSOR DATA RED TEAM
# ====================================================
class TestSensorRedTeam:
    def test_extreme_positive_value(self, client):
        make_session(client)
        r = make_reading(client, value=999999.0)
        assert r.status_code in (201, 422)

    def test_extreme_negative_value(self, client):
        make_session(client)
        r = make_reading(client, value=-999999.0)
        assert r.status_code in (201, 422)

    def test_zero_value(self, client):
        make_session(client)
        assert make_reading(client, value=0.0).status_code == 201

    def test_missing_sensor_type(self, client):
        make_session(client)
        r = client.post("/api/readings", json={
            "session_id": "SESS-T1", "device_id": "DEV-T1",
            "value": 10.0, "unit": "ppm", "status": "NORMAL"
        })
        assert r.status_code == 422

    def test_empty_sensor_type_rejected(self, client):
        make_session(client)
        r = client.post("/api/readings", json={
            "session_id": "SESS-T1", "device_id": "DEV-T1",
            "sensor_type": "", "value": 10.0, "unit": "ppm", "status": "NORMAL"
        })
        assert r.status_code == 422, f"Empty sensor_type accepted: {r.status_code}"

    def test_missing_value(self, client):
        make_session(client)
        r = client.post("/api/readings", json={
            "session_id": "SESS-T1", "device_id": "DEV-T1",
            "sensor_type": "GAS_LEVEL", "unit": "ppm", "status": "NORMAL"
        })
        assert r.status_code == 422

    def test_value_as_invalid_string(self, client):
        make_session(client)
        r = client.post("/api/readings", json={
            "session_id": "SESS-T1", "device_id": "DEV-T1",
            "sensor_type": "GAS_LEVEL", "value": "ten", "unit": "ppm", "status": "NORMAL"
        })
        assert r.status_code == 422

    def test_null_value_rejected(self, client):
        make_session(client)
        r = client.post("/api/readings", json={
            "session_id": "SESS-T1", "device_id": "DEV-T1",
            "sensor_type": "GAS_LEVEL", "value": None, "unit": "ppm", "status": "NORMAL"
        })
        assert r.status_code == 422

    def test_missing_unit_rejected(self, client):
        make_session(client)
        r = client.post("/api/readings", json={
            "session_id": "SESS-T1", "device_id": "DEV-T1",
            "sensor_type": "GAS_LEVEL", "value": 10.0, "status": "NORMAL"
        })
        assert r.status_code == 422

# ====================================================
# SECTION 9: TIMESTAMP HANDLING
# ====================================================
class TestTimestampHandling:
    def test_reading_without_timestamp_uses_server_time(self, client):
        make_session(client)
        r = make_reading(client)
        assert r.status_code == 201 and r.json()["timestamp"] is not None

    def test_reading_with_explicit_utc_timestamp(self, client):
        make_session(client)
        r = client.post("/api/readings", json={
            "session_id": "SESS-T1", "device_id": "DEV-T1",
            "sensor_type": "GAS_LEVEL", "value": 10.0, "unit": "ppm", "status": "NORMAL",
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        assert r.status_code == 201

    def test_reading_with_future_timestamp(self, client):
        make_session(client)
        future = (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()
        r = client.post("/api/readings", json={
            "session_id": "SESS-T1", "device_id": "DEV-T1",
            "sensor_type": "GAS_LEVEL", "value": 10.0, "unit": "ppm", "status": "NORMAL",
            "timestamp": future
        })
        assert r.status_code in (201, 422)

    def test_reading_with_malformed_timestamp_rejected(self, client):
        make_session(client)
        r = client.post("/api/readings", json={
            "session_id": "SESS-T1", "device_id": "DEV-T1",
            "sensor_type": "GAS_LEVEL", "value": 10.0, "unit": "ppm", "status": "NORMAL",
            "timestamp": "not-a-date"
        })
        assert r.status_code == 422

    def test_session_start_time_defaults_to_iso(self, client):
        make_trainee(client)
        make_device(client)
        r = client.post("/api/sessions", json={
            "session_id": "SESS-TS", "trainee_id": "TRN-T1",
            "device_id": "DEV-T1", "session_type": "TRAINING"
        })
        assert r.status_code == 201
        assert "T" in r.json()["start_time"]

# ====================================================
# SECTION 10: IDOR / NONEXISTENT RESOURCES
# ====================================================
class TestIDOR:
    def test_get_nonexistent_trainee(self, client):
        assert client.get("/api/trainees/999999").status_code == 404

    def test_get_nonexistent_device(self, client):
        assert client.get("/api/devices/999999").status_code == 404

    def test_get_nonexistent_zone(self, client):
        assert client.get("/api/zones/999999").status_code == 404

    def test_get_nonexistent_session(self, client):
        assert client.get("/api/sessions/999999").status_code == 404

    def test_get_nonexistent_alert(self, client):
        assert client.get("/api/alerts/999999").status_code == 404

    def test_patch_nonexistent_trainee(self, client):
        assert client.patch("/api/trainees/999999", json={"name": "Ghost"}).status_code == 404

    def test_patch_nonexistent_session(self, client):
        assert client.patch("/api/sessions/999999", json={"status": "COMPLETED"}).status_code == 404

    def test_patch_nonexistent_alert(self, client):
        assert client.patch("/api/alerts/999999", json={"acknowledged": True}).status_code == 404

    def test_readings_for_nonexistent_session(self, client):
        r = client.get("/api/sessions/SESS-GHOST-12345/readings")
        assert r.status_code in (200, 404)

# ====================================================
# SECTION 11: MASS ASSIGNMENT
# ====================================================
class TestMassAssignment:
    def test_client_cannot_set_pk(self, client):
        r = client.post("/api/trainees", json={"trainee_id": "TRN-MA1", "name": "Test", "id": 9999})
        assert r.status_code in (201, 422)
        if r.status_code == 201:
            assert r.json()["id"] != 9999, "CRITICAL: Client overrode PK!"

    def test_client_cannot_set_created_at(self, client):
        r = client.post("/api/trainees", json={"trainee_id": "TRN-MA2", "name": "Test", "created_at": "2000-01-01T00:00:00Z"})
        assert r.status_code in (201, 422)
        if r.status_code == 201:
            assert "2000" not in r.json().get("created_at", ""), "CRITICAL: Client overrode created_at!"

    def test_client_cannot_override_session_status(self, client):
        make_trainee(client)
        make_device(client)
        r = client.post("/api/sessions", json={
            "session_id": "SESS-MA", "trainee_id": "TRN-T1",
            "device_id": "DEV-T1", "session_type": "TRAINING",
            "status": "COMPLETED"
        })
        if r.status_code == 201:
            assert r.json()["status"] == "ACTIVE", f"MEDIUM: Client injected status={r.json()['status']}"

# ====================================================
# SECTION 12: MALFORMED REQUESTS
# ====================================================
class TestMalformedRequests:
    def test_completely_empty_body_rejected(self, client):
        assert client.post("/api/trainees", json={}).status_code == 422

    def test_wrong_types(self, client):
        r = client.post("/api/trainees", json={"trainee_id": 123, "name": ["list"]})
        assert r.status_code in (201, 422)

    def test_extra_fields_ignored(self, client):
        r = client.post("/api/trainees", json={"trainee_id": "TRN-EXTRA", "name": "Valid", "bogus": "ignored"})
        assert r.status_code == 201

# ====================================================
# SECTION 13: SEED IDEMPOTENCY
# ====================================================
class TestSeedIdempotency:
    def test_seed_twice_no_duplicates(self, client):
        from app.database.seed import seed_data
        seed_data()
        seed_data()
        ids = [t["trainee_id"] for t in client.get("/api/trainees").json()]
        assert len(ids) == len(set(ids)), f"Duplicate trainees after double seed: {ids}"

# ====================================================
# SECTION 14: API STATUS CODES
# ====================================================
class TestStatusCodes:
    def test_create_returns_201(self, client):
        assert client.post("/api/trainees", json={"trainee_id": "TRN-SC1", "name": "Test"}).status_code == 201

    def test_get_returns_200(self, client):
        r = client.post("/api/trainees", json={"trainee_id": "TRN-SC2", "name": "Test"})
        assert client.get(f"/api/trainees/{r.json()['id']}").status_code == 200

    def test_list_returns_200(self, client):
        r = client.get("/api/trainees")
        assert r.status_code == 200 and isinstance(r.json(), list)

    def test_patch_returns_200(self, client):
        r = client.post("/api/trainees", json={"trainee_id": "TRN-SC3", "name": "Test"})
        assert client.patch(f"/api/trainees/{r.json()['id']}", json={"name": "U"}).status_code == 200

    def test_delete_returns_204_no_body(self, client):
        r = client.post("/api/trainees", json={"trainee_id": "TRN-SC4", "name": "Test"})
        d = client.delete(f"/api/trainees/{r.json()['id']}")
        assert d.status_code == 204 and d.content == b""

    def test_reading_returns_201(self, client):
        make_session(client)
        assert make_reading(client).status_code == 201

    def test_health_returns_200(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
        assert r.json()["database"] == "connected"

# ====================================================
# SECTION 15: DEVICE STATES
# ====================================================
class TestDeviceStates:
    def test_valid_states(self, client):
        for i, s in enumerate(["ONLINE", "OFFLINE", "FAULT", "UNKNOWN"]):
            assert client.post("/api/devices", json={"device_id": f"DEV-ST{i}", "device_type": "HANDHELD", "status": s}).status_code == 201

    def test_invalid_status_behavior(self, client):
        r = client.post("/api/devices", json={"device_id": "DEV-BADST", "device_type": "HANDHELD", "status": "FLYING"})
        assert r.status_code in (201, 422)

    def test_battery_boundaries(self, client):
        for i, b in enumerate([0, 1, 50, 99, 100]):
            assert client.post("/api/devices", json={"device_id": f"DEV-B{i}", "device_type": "HANDHELD", "battery": b}).status_code == 201

# ====================================================
# SECTION 16: ZONE CRUD
# ====================================================
class TestZoneCRUD:
    def test_create_zone(self, client):
        r = make_zone(client)
        assert r.status_code == 201 and r.json()["zone_id"] == "ZONE-T1"

    def test_duplicate_zone_rejected(self, client):
        make_zone(client)
        assert make_zone(client).status_code == 400

    def test_get_all_zones(self, client):
        make_zone(client)
        r = client.get("/api/zones")
        assert r.status_code == 200 and len(r.json()) >= 1

    def test_get_zone_by_id(self, client):
        r = make_zone(client)
        assert client.get(f"/api/zones/{r.json()['id']}").status_code == 200

    def test_update_zone(self, client):
        r = make_zone(client)
        r2 = client.patch(f"/api/zones/{r.json()['id']}", json={"name": "Updated Zone"})
        assert r2.status_code == 200 and r2.json()["name"] == "Updated Zone"

    def test_empty_zone_id_rejected(self, client):
        assert client.post("/api/zones", json={"zone_id": "", "name": "Valid"}).status_code == 422

    def test_empty_zone_name_rejected(self, client):
        assert client.post("/api/zones", json={"zone_id": "Z-1", "name": ""}).status_code == 422
