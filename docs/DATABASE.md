# SIH 2.0 Database & Schema Documentation

## Overview
The SIH 2.0 prototype uses **SQLite** as its lightweight, zero-configuration local relational database, managed via **SQLModel** (Pydantic + SQLAlchemy) in FastAPI.

---

## Entity Schema & Relationships

### 1. `Trainee` (`trainees`)
Represents an industrial workshop student/operator.
- `id` (int, Primary Key)
- `trainee_id` (string, Unique Index): Business code (e.g. `TRN-001`)
- `name` (string): Full name of trainee
- `created_at` (datetime UTC)
- `updated_at` (datetime UTC)

### 2. `Device` (`devices`)
Represents a handheld, wearable, or beacon sensing device.
- `id` (int, Primary Key)
- `device_id` (string, Unique Index): Hardware identifier (e.g. `ESP32-HANDHELD-01`)
- `device_type` (string): `HANDHELD`, `WEARABLE`, or `BEACON`
- `firmware_version` (string, Optional): Installed firmware version (e.g. `0.2.0`)
- `status` (string): `ONLINE`, `OFFLINE`, `FAULT`, `UNKNOWN`
- `battery` (int, Optional): Battery percentage (0–100)
- `zone_id` (string, Foreign Key -> `zones.zone_id`, Optional): Assigned physical zone
- `last_seen` (datetime UTC, Optional): Timestamp of last heartbeat/reading
- `created_at` (datetime UTC)
- `updated_at` (datetime UTC)

### 3. `Zone` (`zones`)
Represents a physical workshop environment or bay.
- `id` (int, Primary Key)
- `zone_id` (string, Unique Index): Unique bay identifier (e.g. `BAY-A`)
- `name` (string): Human-readable zone name
- `description` (string, Optional): Zone location or machinery details
- `created_at` (datetime UTC)
- `updated_at` (datetime UTC)

### 4. `Session` (`sessions`)
Represents an active or historical diagnostic training run.
- `id` (int, Primary Key)
- `session_id` (string, Unique Index): Session code (e.g. `SESS-2026-001`)
- `trainee_id` (string, Foreign Key -> `trainees.trainee_id`): Assigned trainee
- `device_id` (string, Foreign Key -> `devices.device_id`): Assigned device
- `zone_id` (string, Foreign Key -> `zones.zone_id`, Optional): Assigned workshop zone
- `session_type` (string): Module type (e.g., `LEAK_DETECTION`, `GAS_HAZARD`)
- `status` (string): Lifecycle state (`ACTIVE`, `PAUSED`, `COMPLETED`, `CANCELLED`, `FAULT`)
- `result` (string, Optional): Assessment outcome (`PASS`, `WARNING`, `FAIL`, etc.)
- `start_time` (datetime UTC): Session start timestamp
- `end_time` (datetime UTC, Optional): Session completion/cancellation timestamp
- `created_at` (datetime UTC)

### 5. `SensorReading` (`sensor_readings`)
Time-series telemetry points recorded during an active session.
- `id` (int, Primary Key)
- `session_id` (string, Foreign Key -> `sessions.session_id`, Index): Linked session
- `device_id` (string, Foreign Key -> `devices.device_id`, Index): Linked device
- `timestamp` (datetime UTC): Sample timestamp
- `sensor_type` (string): Telemetry category (`VIBRATION`, `GAS_LEVEL`, `PRESSURE`, `BATTERY`, etc.)
- `value` (float): Finite numerical reading value
- `unit` (string): Unit of measure (`ppm`, `m/s2`, `%`, etc.)
- `status` (string): `NORMAL`, `WARNING`, `DANGER`

### 6. `Alert` (`alerts`)
Hazard alerts triggered by threshold breaches during training sessions.
- `id` (int, Primary Key)
- `session_id` (string, Foreign Key -> `sessions.session_id`, Index, Optional): Linked session
- `device_id` (string, Foreign Key -> `devices.device_id`, Index, Optional): Linked device
- `timestamp` (datetime UTC): Alert trigger timestamp
- `hazard_type` (string): Hazard category (`GAS`, `WATER`, `VIBRATION`, `SYSTEM`, etc.)
- `severity` (string): `INFO`, `WARNING`, `DANGER`, `CRITICAL`, `FAULT`
- `message` (string): Explanatory alert text
- `acknowledged` (boolean): Trainer acknowledgment status
- `created_at` (datetime UTC)

---

## Entity Relationship Overview
```text
[Trainee]  ──1:N──>  [Session]  <──N:1──  [Device]  <──N:1──  [Zone]
                        │    │
                        │    └──1:N──>  [Alert]
                        │
                        └──1:N──>  [SensorReading]
```
