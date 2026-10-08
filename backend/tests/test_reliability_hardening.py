import pytest
import math
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from datetime import datetime, timezone, timedelta
from tests.conftest import engine
from app.models.trainee import Trainee
from app.models.device import Device
from app.models.zone import Zone
from app.models.session import Session as DBSession
from app.models.reading import SensorReading
from app.models.alert import Alert

@pytest.fixture
def setup_hardening_data(client: TestClient):
    with Session(engine) as session:
        # Check/create trainee
        trainee = session.exec(select(Trainee).where(Trainee.trainee_id == "TR-HARDEN-1")).first()
        if not trainee:
            trainee = Trainee(trainee_id="TR-HARDEN-1", name="Bob Miller")
            session.add(trainee)

        # Check/create devices
        dev1 = session.exec(select(Device).where(Device.device_id == "DEV-HARDEN-1")).first()
        if not dev1:
            dev1 = Device(device_id="DEV-HARDEN-1", device_type="HANDHELD", firmware_version="2.0.0", battery=90)
            session.add(dev1)

        dev2 = session.exec(select(Device).where(Device.device_id == "DEV-HARDEN-2")).first()
        if not dev2:
            dev2 = Device(device_id="DEV-HARDEN-2", device_type="WEARABLE", firmware_version="2.0.0", battery=85)
            session.add(dev2)

        session.commit()

        # Clean existing sessions/readings/alerts
        test_sids = ["SESS-HARDEN-ACTIVE", "SESS-HARDEN-COMPLETED", "SESS-HARDEN-DEDUP"]
        for sid in test_sids:
            for r in session.exec(select(SensorReading).where(SensorReading.session_id == sid)).all():
                session.delete(r)
            for a in session.exec(select(Alert).where(Alert.session_id == sid)).all():
                session.delete(a)
            for s in session.exec(select(DBSession).where(DBSession.session_id == sid)).all():
                session.delete(s)
        session.commit()

        now = datetime.now(timezone.utc)
        sess_active = DBSession(
            session_id="SESS-HARDEN-ACTIVE",
            trainee_id="TR-HARDEN-1",
            device_id="DEV-HARDEN-1",
            session_type="TRAINING",
            status="ACTIVE",
            start_time=now - timedelta(minutes=10),
        )

        sess_completed = DBSession(
            session_id="SESS-HARDEN-COMPLETED",
            trainee_id="TR-HARDEN-1",
            device_id="DEV-HARDEN-2",
            session_type="TRAINING",
            status="COMPLETED",
            start_time=now - timedelta(minutes=30),
            end_time=now - timedelta(minutes=10),
        )

        sess_dedup = DBSession(
            session_id="SESS-HARDEN-DEDUP",
            trainee_id="TR-HARDEN-1",
            device_id="DEV-HARDEN-1",
            session_type="TRAINING",
            status="ACTIVE",
            start_time=now - timedelta(minutes=5),
        )

        session.add(sess_active)
        session.add(sess_completed)
        session.add(sess_dedup)
        session.commit()

        return {
            "active_sid": "SESS-HARDEN-ACTIVE",
            "completed_sid": "SESS-HARDEN-COMPLETED",
            "dedup_sid": "SESS-HARDEN-DEDUP",
            "dev1": "DEV-HARDEN-1",
            "dev2": "DEV-HARDEN-2",
        }


def test_reading_validation_success(client: TestClient, setup_hardening_data):
    sid = setup_hardening_data["active_sid"]
    did = setup_hardening_data["dev1"]

    res = client.post("/api/readings", json={
        "session_id": sid,
        "device_id": did,
        "sensor_type": "VIBRATION",
        "value": 15.5,
        "unit": "m/s2",
        "status": "NORMAL"
    })
    assert res.status_code == 201
    data = res.json()
    assert data["session_id"] == sid
    assert data["device_id"] == did
    assert data["value"] == 15.5


def test_reading_device_session_mismatch(client: TestClient, setup_hardening_data):
    sid = setup_hardening_data["active_sid"] # assigned to DEV-HARDEN-1
    did = setup_hardening_data["dev2"] # DEV-HARDEN-2

    # Attempting to post a reading for DEV-HARDEN-2 on SESS-HARDEN-ACTIVE (assigned to DEV-HARDEN-1)
    res = client.post("/api/readings", json={
        "session_id": sid,
        "device_id": did,
        "sensor_type": "VIBRATION",
        "value": 10.0,
        "unit": "m/s2",
        "status": "NORMAL"
    })
    assert res.status_code == 400
    assert "not assigned to session" in res.json()["detail"].lower()


def test_reading_for_closed_session(client: TestClient, setup_hardening_data):
    sid = setup_hardening_data["completed_sid"]
    did = setup_hardening_data["dev2"]

    res = client.post("/api/readings", json={
        "session_id": sid,
        "device_id": did,
        "sensor_type": "VIBRATION",
        "value": 10.0,
        "unit": "m/s2",
        "status": "NORMAL"
    })
    assert res.status_code == 400
    assert "closed session" in res.json()["detail"].lower()


def test_reading_value_nan_inf(client: TestClient, setup_hardening_data):
    sid = setup_hardening_data["active_sid"]
    did = setup_hardening_data["dev1"]

    # Test NaN string representation in JSON float payload
    res_nan = client.post("/api/readings", json={
        "session_id": sid,
        "device_id": did,
        "sensor_type": "VIBRATION",
        "value": "NaN",
        "unit": "m/s2",
        "status": "NORMAL"
    })
    assert res_nan.status_code == 422

    # Test string representation of Infinity
    res_inf = client.post("/api/readings", json={
        "session_id": sid,
        "device_id": did,
        "sensor_type": "VIBRATION",
        "value": "Infinity",
        "unit": "m/s2",
        "status": "NORMAL"
    })
    assert res_inf.status_code == 422


def test_reading_blank_fields(client: TestClient, setup_hardening_data):
    sid = setup_hardening_data["active_sid"]
    did = setup_hardening_data["dev1"]

    res = client.post("/api/readings", json={
        "session_id": "   ",
        "device_id": did,
        "sensor_type": "VIBRATION",
        "value": 10.0,
        "unit": "m/s2",
        "status": "NORMAL"
    })
    assert res.status_code == 422


def test_heartbeat_success(client: TestClient, setup_hardening_data):
    did = setup_hardening_data["dev1"]
    res = client.post(f"/api/devices/{did}/heartbeat")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}

    # Verify last_seen was updated
    dev_res = client.get("/api/devices")
    dev = next(d for d in dev_res.json() if d["device_id"] == did)
    assert dev["last_seen"] is not None


def test_heartbeat_unknown_device(client: TestClient):
    res = client.post("/api/devices/NON-EXISTENT-DEV/heartbeat")
    assert res.status_code == 404


def test_alert_deduplication(client: TestClient, setup_hardening_data):
    sid = setup_hardening_data["dedup_sid"]
    did = setup_hardening_data["dev1"]

    # Post reading 1 breaching DANGER threshold (GAS_LEVEL >= 80)
    res1 = client.post("/api/readings", json={
        "session_id": sid,
        "device_id": did,
        "sensor_type": "GAS_LEVEL",
        "value": 85.0,
        "unit": "ppm",
        "status": "DANGER"
    })
    assert res1.status_code == 201

    # Check alert count for session
    alerts1 = client.get(f"/api/alerts?session_id={sid}").json()
    assert len(alerts1) == 1
    alert_id = alerts1[0]["id"]
    assert alerts1[0]["severity"] == "DANGER"
    assert alerts1[0]["acknowledged"] is False

    # Post reading 2 with same DANGER condition -> should NOT create duplicate alert
    res2 = client.post("/api/readings", json={
        "session_id": sid,
        "device_id": did,
        "sensor_type": "GAS_LEVEL",
        "value": 90.0,
        "unit": "ppm",
        "status": "DANGER"
    })
    assert res2.status_code == 201

    alerts2 = client.get(f"/api/alerts?session_id={sid}").json()
    assert len(alerts2) == 1

    # Acknowledge the alert
    ack_res = client.patch(f"/api/alerts/{alert_id}", json={"acknowledged": True})
    assert ack_res.status_code == 200
    assert ack_res.json()["acknowledged"] is True

    # Post reading 3 with DANGER condition after acknowledgement -> creates NEW alert
    res3 = client.post("/api/readings", json={
        "session_id": sid,
        "device_id": did,
        "sensor_type": "GAS_LEVEL",
        "value": 95.0,
        "unit": "ppm",
        "status": "DANGER"
    })
    assert res3.status_code == 201

    alerts3 = client.get(f"/api/alerts?session_id={sid}").json()
    assert len(alerts3) == 2


def test_invalid_session_lifecycle_transition(client: TestClient, setup_hardening_data):
    with Session(engine) as session:
        completed_sess = session.exec(
            select(DBSession).where(DBSession.session_id == "SESS-HARDEN-COMPLETED")
        ).first()
        sess_id = completed_sess.id

    # Attempt transition from COMPLETED to ACTIVE (terminal state transition attempt)
    res = client.patch(f"/api/sessions/{sess_id}", json={"status": "ACTIVE"})
    assert res.status_code == 400
    assert "cannot transition" in res.json()["detail"].lower()
