import pytest
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
def setup_test_data(client: TestClient):
    with Session(engine) as session:
        # Check/create trainee
        trainee = session.exec(select(Trainee).where(Trainee.trainee_id == "TR-TEST-1")).first()
        if not trainee:
            trainee = Trainee(trainee_id="TR-TEST-1", name="Alice Smith")
            session.add(trainee)

        # Check/create device
        device = session.exec(select(Device).where(Device.device_id == "DEV-TEST-1")).first()
        if not device:
            device = Device(device_id="DEV-TEST-1", device_type="HANDHELD", firmware_version="1.2.0")
            session.add(device)

        # Check/create zone
        zone = session.exec(select(Zone).where(Zone.zone_id == "ZONE-TEST-1")).first()
        if not zone:
            zone = Zone(zone_id="ZONE-TEST-1", name="Testing Area")
            session.add(zone)

        session.commit()

        # Clean existing readings, alerts, and sessions for test session IDs
        test_session_ids = ["SESS-ANALYTICS-1", "SESS-ANALYTICS-2", "SESS-EMPTY"]
        for sid in test_session_ids:
            for r in session.exec(select(SensorReading).where(SensorReading.session_id == sid)).all():
                session.delete(r)
            for a in session.exec(select(Alert).where(Alert.session_id == sid)).all():
                session.delete(a)
            for s in session.exec(select(DBSession).where(DBSession.session_id == sid)).all():
                session.delete(s)
        session.commit()

        now = datetime.now(timezone.utc)
        start_time = now - timedelta(minutes=15)
        end_time = now

        sess1 = DBSession(
            session_id="SESS-ANALYTICS-1",
            trainee_id="TR-TEST-1",
            device_id="DEV-TEST-1",
            zone_id="ZONE-TEST-1",
            session_type="LEAK_DETECTION",
            status="COMPLETED",
            result="PASS",
            start_time=start_time,
            end_time=end_time,
        )

        sess2 = DBSession(
            session_id="SESS-ANALYTICS-2",
            trainee_id="TR-TEST-1",
            device_id="DEV-TEST-1",
            zone_id="ZONE-TEST-1",
            session_type="GAS_HAZARD",
            status="ACTIVE",
            start_time=now - timedelta(minutes=5),
        )

        session.add(sess1)
        session.add(sess2)
        session.commit()

        # Add readings to SESS-ANALYTICS-1
        r1 = SensorReading(
            session_id="SESS-ANALYTICS-1",
            device_id="DEV-TEST-1",
            sensor_type="VIBRATION",
            value=12.5,
            unit="m/s2",
            status="NORMAL",
            timestamp=start_time + timedelta(minutes=1),
        )
        r2 = SensorReading(
            session_id="SESS-ANALYTICS-1",
            device_id="DEV-TEST-1",
            sensor_type="VIBRATION",
            value=25.0,
            unit="m/s2",
            status="WARNING",
            timestamp=start_time + timedelta(minutes=2),
        )
        r3 = SensorReading(
            session_id="SESS-ANALYTICS-1",
            device_id="DEV-TEST-1",
            sensor_type="GAS_LEVEL",
            value=450.0,
            unit="ppm",
            status="DANGER",
            timestamp=start_time + timedelta(minutes=3),
        )

        # Add readings to SESS-ANALYTICS-2 (isolation test)
        r4 = SensorReading(
            session_id="SESS-ANALYTICS-2",
            device_id="DEV-TEST-1",
            sensor_type="VIBRATION",
            value=99.9,
            unit="m/s2",
            status="DANGER",
            timestamp=now - timedelta(minutes=1),
        )

        session.add_all([r1, r2, r3, r4])

        # Add alerts to SESS-ANALYTICS-1
        a1 = Alert(
            session_id="SESS-ANALYTICS-1",
            device_id="DEV-TEST-1",
            hazard_type="VIBRATION",
            severity="WARNING",
            message="High vibration detected",
            acknowledged=False,
            timestamp=start_time + timedelta(minutes=2),
        )
        a2 = Alert(
            session_id="SESS-ANALYTICS-1",
            device_id="DEV-TEST-1",
            hazard_type="GAS",
            severity="DANGER",
            message="Critical gas level breach",
            acknowledged=True,
            timestamp=start_time + timedelta(minutes=3),
        )

        session.add_all([a1, a2])
        session.commit()

        return {
            "sess1_id": sess1.id,
            "sess1_code": "SESS-ANALYTICS-1",
            "sess2_id": sess2.id,
            "sess2_code": "SESS-ANALYTICS-2",
        }


def test_analytics_completed_session(client: TestClient, setup_test_data):
    code = setup_test_data["sess1_code"]
    response = client.get(f"/api/sessions/{code}/analytics")
    assert response.status_code == 200
    data = response.json()

    sess_summary = data["session"]
    assert sess_summary["session_id"] == "SESS-ANALYTICS-1"
    assert sess_summary["trainee_id"] == "TR-TEST-1"
    assert sess_summary["device_id"] == "DEV-TEST-1"
    assert sess_summary["device_type"] == "HANDHELD"
    assert sess_summary["firmware_version"] == "1.2.0"
    assert sess_summary["status"] == "COMPLETED"
    assert sess_summary["reading_count"] == 3
    assert sess_summary["alert_count"] == 2
    assert sess_summary["duration_formatted"] == "15 min"

    # Readings stats
    reading_stats = data["reading_stats"]
    assert reading_stats["total_readings"] == 3
    assert len(reading_stats["by_sensor_type"]) == 2

    vib_stat = next(s for s in reading_stats["by_sensor_type"] if s["sensor_type"] == "VIBRATION")
    assert vib_stat["count"] == 2
    assert vib_stat["min"] == 12.5
    assert vib_stat["max"] == 25.0
    assert vib_stat["avg"] == 18.75

    # Alert stats
    alert_stats = data["alert_stats"]
    assert alert_stats["total_alerts"] == 2
    assert alert_stats["unacknowledged_alerts"] == 1
    assert alert_stats["acknowledged_alerts"] == 1
    assert alert_stats["severity_counts"]["WARNING"] == 1
    assert alert_stats["severity_counts"]["DANGER"] == 1


def test_analytics_active_session(client: TestClient, setup_test_data):
    code = setup_test_data["sess2_code"]
    response = client.get(f"/api/sessions/{code}/analytics")
    assert response.status_code == 200
    data = response.json()

    assert data["session"]["status"] == "ACTIVE"
    assert data["session"]["reading_count"] == 1
    assert data["session"]["alert_count"] == 0
    assert data["session"]["duration_formatted"] != "—"


def test_analytics_empty_session(client: TestClient, setup_test_data):
    with Session(engine) as session:
        empty_sess = DBSession(
            session_id="SESS-EMPTY",
            trainee_id="TR-TEST-1",
            device_id="DEV-TEST-1",
            session_type="TRAINING",
            status="COMPLETED",
            start_time=datetime.now(timezone.utc) - timedelta(minutes=10),
            end_time=datetime.now(timezone.utc),
        )
        session.add(empty_sess)
        session.commit()
        empty_id = empty_sess.id

    response = client.get(f"/api/sessions/{empty_id}/analytics")
    assert response.status_code == 200
    data = response.json()

    assert data["session"]["reading_count"] == 0
    assert data["session"]["alert_count"] == 0
    assert data["reading_stats"]["total_readings"] == 0
    assert data["reading_stats"]["by_sensor_type"] == []
    assert data["alert_stats"]["total_alerts"] == 0


def test_session_isolation(client: TestClient, setup_test_data):
    code1 = setup_test_data["sess1_code"]
    code2 = setup_test_data["sess2_code"]

    res1 = client.get(f"/api/sessions/{code1}/analytics").json()
    res2 = client.get(f"/api/sessions/{code2}/analytics").json()

    # Session 1 must have 3 readings and 2 alerts
    assert res1["session"]["reading_count"] == 3
    assert res1["session"]["alert_count"] == 2

    # Session 2 must have 1 reading and 0 alerts
    assert res2["session"]["reading_count"] == 1
    assert res2["session"]["alert_count"] == 0

    # Ensure Session 1 readings do NOT include Session 2 reading (value 99.9)
    vib_stat1 = next(s for s in res1["reading_stats"]["by_sensor_type"] if s["sensor_type"] == "VIBRATION")
    assert vib_stat1["max"] == 25.0


def test_invalid_session_analytics(client: TestClient):
    response = client.get("/api/sessions/NON-EXISTENT-SESSION/analytics")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_export_json(client: TestClient, setup_test_data):
    code = setup_test_data["sess1_code"]
    response = client.get(f"/api/sessions/{code}/export?format=json")
    assert response.status_code == 200
    data = response.json()

    assert "session_summary" in data
    assert data["session_summary"]["session_id"] == "SESS-ANALYTICS-1"
    assert len(data["readings"]) == 3
    assert len(data["alerts"]) == 2


def test_export_csv(client: TestClient, setup_test_data):
    code = setup_test_data["sess1_code"]
    response = client.get(f"/api/sessions/{code}/export?format=csv")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    csv_text = response.text

    assert "=== SESSION SUMMARY ===" in csv_text
    assert "SESS-ANALYTICS-1" in csv_text
    assert "=== SENSOR READINGS ===" in csv_text
    assert "VIBRATION" in csv_text
    assert "=== HAZARD ALERTS ===" in csv_text


def test_export_readings_csv(client: TestClient, setup_test_data):
    code = setup_test_data["sess1_code"]
    response = client.get(f"/api/sessions/{code}/export/readings?format=csv")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "timestamp,session_id,device_id" in response.text
    assert "SESS-ANALYTICS-1" in response.text
    assert "SESS-ANALYTICS-2" not in response.text


def test_export_alerts_csv(client: TestClient, setup_test_data):
    code = setup_test_data["sess1_code"]
    response = client.get(f"/api/sessions/{code}/export/alerts?format=csv")
    assert response.status_code == 200
    assert "text/csv" in response.headers["content-type"]
    assert "hazard_type,severity,message" in response.text
    assert "Critical gas level breach" in response.text


def test_invalid_export_format(client: TestClient, setup_test_data):
    code = setup_test_data["sess1_code"]
    response = client.get(f"/api/sessions/{code}/export?format=xml")
    assert response.status_code == 400
    assert "Invalid export format" in response.json()["detail"]
