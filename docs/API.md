# API Documentation

## Health & System

### `GET /health`
- **Purpose**: Check the health status of the backend service and SQLite database connection.
- **Request**: None
- **Response**: `200 OK`
  ```json
  {
    "status": "ok",
    "service": "sih-backend",
    "database": "connected"
  }
  ```

---

## Trainees (`/api/trainees`)

### `GET /api/trainees`
- **Purpose**: List all trainees.
- **Response**: `200 OK` `[TraineeRead]`

### `GET /api/trainees/{id}`
- **Purpose**: Retrieve a trainee by integer primary key ID.
- **Response**: `200 OK` `TraineeRead` | `404 Not Found`

### `POST /api/trainees`
- **Purpose**: Create a new trainee.
- **Request Body**: `{"trainee_id": "TRN-001", "name": "Alice Smith"}`
- **Response**: `201 Created` `TraineeRead` | `400 Bad Request` (Duplicate ID) | `422 Unprocessable Entity` (Empty/blank field)

### `PATCH /api/trainees/{id}`
- **Purpose**: Update a trainee's name.
- **Request Body**: `{"name": "Alice Johnson"}`
- **Response**: `200 OK` `TraineeRead` | `404 Not Found` | `422 Unprocessable Entity`

### `DELETE /api/trainees/{id}`
- **Purpose**: Delete a trainee.
- **Response**: `204 No Content` | `404 Not Found` | `409 Conflict` (Trainee has linked active/historical sessions)

---

## Zones (`/api/zones`)

### `GET /api/zones`
- **Purpose**: List all zones.
- **Response**: `200 OK` `[ZoneRead]`

### `GET /api/zones/{id}`
- **Purpose**: Retrieve a zone by integer primary key ID.
- **Response**: `200 OK` `ZoneRead` | `404 Not Found`

### `POST /api/zones`
- **Purpose**: Create a new zone.
- **Request Body**: `{"zone_id": "BAY-A", "name": "Bay A", "description": "Assembly Bay"}`
- **Response**: `201 Created` `ZoneRead` | `400 Bad Request` (Duplicate ID) | `422 Unprocessable Entity`

### `PATCH /api/zones/{id}`
- **Purpose**: Update zone details.
- **Request Body**: `{"name": "New Bay Name", "description": "Updated description"}`
- **Response**: `200 OK` `ZoneRead` | `404 Not Found`

### `DELETE /api/zones/{id}`
- **Purpose**: Delete a zone.
- **Response**: `204 No Content` | `404 Not Found` | `409 Conflict` (Zone has assigned devices)

---

## Devices (`/api/devices`)

### `GET /api/devices`
- **Purpose**: List all devices.
- **Response**: `200 OK` `[DeviceRead]`

### `GET /api/devices/{id}`
- **Purpose**: Retrieve a device by integer primary key ID.
- **Response**: `200 OK` `DeviceRead` | `404 Not Found`

### `POST /api/devices`
- **Purpose**: Register a new device.
- **Request Body**:
  ```json
  {
    "device_id": "HANDHELD-001",
    "device_type": "HANDHELD",
    "status": "ONLINE",
    "battery": 95,
    "zone_id": "BAY-A"
  }
  ```
- **Validation**: `device_type` (non-blank), `status` (ONLINE, OFFLINE, FAULT, UNKNOWN), `battery` (0-100), `zone_id` (must exist or null).
- **Response**: `201 Created` `DeviceRead` | `400 Bad Request` | `422 Unprocessable Entity`

### `PATCH /api/devices/{id}`
- **Purpose**: Update device status, battery level, or zone assignment.
- **Request Body**: `{"status": "FAULT", "battery": 75, "zone_id": "BAY-B"}`
- **Response**: `200 OK` `DeviceRead` | `400 Bad Request` | `404 Not Found` | `422 Unprocessable Entity`

### `DELETE /api/devices/{id}`
- **Purpose**: Delete a device.
- **Response**: `204 No Content` | `404 Not Found` | `409 Conflict` (Device has recorded sensor readings)

---

## Sessions (`/api/sessions`)

### `GET /api/sessions`
- **Purpose**: List all training sessions.
- **Response**: `200 OK` `[SessionRead]`

### `GET /api/sessions/{id}`
- **Purpose**: Retrieve a session by integer primary key ID.
- **Response**: `200 OK` `SessionRead` | `404 Not Found`

### `POST /api/sessions`
- **Purpose**: Start a new session.
- **Request Body**:
  ```json
  {
    "session_id": "SESS-2026-001",
    "trainee_id": "TRN-001",
    "device_id": "HANDHELD-001",
    "session_type": "TRAINING"
  }
  ```
- **Behavior**: Forces initial status to `"ACTIVE"`. Validates that `trainee_id` and `device_id` exist.
- **Response**: `201 Created` `SessionRead` | `400 Bad Request` (Duplicate session ID or invalid FK)

### `PATCH /api/sessions/{id}`
- **Purpose**: Transition session state or record final result.
- **State Machine Rules**:
  - `ACTIVE` -> `PAUSED`, `COMPLETED`, `CANCELLED`
  - `PAUSED` -> `ACTIVE`, `CANCELLED`
  - `COMPLETED` / `CANCELLED` -> Terminal (no further transitions allowed)
- **Request Body**: `{"status": "COMPLETED", "result": "PASS", "end_time": "2026-10-08T22:00:00Z"}`
- **Response**: `200 OK` `SessionRead` | `400 Bad Request` (Invalid state transition) | `404 Not Found`

### `GET /api/sessions/{session_id}/readings`
- **Purpose**: Retrieve all time-series sensor readings recorded for a specific session code (e.g. `SESS-2026-001`).
- **Response**: `200 OK` `[ReadingRead]` | `404 Not Found` (Session does not exist)

### `GET /api/sessions/{identifier}/analytics`
- **Purpose**: Compute data-backed session summary, duration, per-sensor reading statistics (min/max/avg), alert severity counts, and chronological alert timeline.
- **Identifier**: Integer primary key `id` OR string code `session_id`.
- **Response**: `200 OK` `SessionAnalytics` | `404 Not Found`

### `GET /api/sessions/{identifier}/export`
- **Purpose**: Export complete session metadata, summary aggregates, telemetry, and alerts.
- **Query Parameter**: `format` (`csv` or `json`, default `csv`).
- **Response**: `200 OK` File Attachment (`session_{session_id}_export.csv` or `.json`) | `400 Bad Request` | `404 Not Found`

### `GET /api/sessions/{identifier}/export/readings`
- **Purpose**: Export time-series sensor readings for the specified session.
- **Query Parameter**: `format` (`csv` or `json`, default `csv`).
- **Response**: `200 OK` File Attachment (`readings_{session_id}.csv` or `.json`) | `400 Bad Request` | `404 Not Found`

### `GET /api/sessions/{identifier}/export/alerts`
- **Purpose**: Export hazard alerts for the specified session.
- **Query Parameter**: `format` (`csv` or `json`, default `csv`).
- **Response**: `200 OK` File Attachment (`alerts_{session_id}.csv` or `.json`) | `400 Bad Request` | `404 Not Found`

---

## Sensor Readings Ingestion (`/api/readings`)

### `POST /api/readings`
- **Purpose**: High-throughput ingestion endpoint for ESP32 devices and simulators.
- **Request Body**:
  ```json
  {
    "session_id": "SESS-2026-001",
    "device_id": "HANDHELD-001",
    "sensor_type": "gas_ch4",
    "value": 450.0,
    "unit": "ppm",
    "status": "NORMAL",
    "timestamp": "2026-10-08T22:15:00Z"
  }
  ```
  *(Note: `timestamp` is optional; defaults to server UTC time if omitted)*
- **Rules & Checks**:
  1. Validates that `session_id` and `device_id` exist (`400 Bad Request` if invalid).
  2. Blocks readings if session is in terminal state `COMPLETED` or `CANCELLED` (`400 Bad Request`).
  3. Evaluates alert thresholds in the Alert Engine (`evaluate_reading`).
  4. Automatically triggers an Alert record if hazard thresholds are breached (with deduplication for identical active unacknowledged alerts).
- **Response**: `201 Created` `SensorReadingRead` | `400 Bad Request` | `422 Unprocessable Entity`

---

## Alerts (`/api/alerts`)

### `GET /api/alerts`
- **Purpose**: List hazard alerts. Supports filtering.
- **Query Parameters**:
  - `session_id` (optional string): Filter alerts by session
  - `acknowledged` (optional boolean): Filter by acknowledgment state
- **Response**: `200 OK` `[AlertRead]`

### `GET /api/alerts/{id}`
- **Purpose**: Retrieve an alert by integer ID.
- **Response**: `200 OK` `AlertRead` | `404 Not Found`

### `POST /api/alerts`
- **Purpose**: Manually trigger an alert.
- **Request Body**:
  ```json
  {
    "session_id": "SESS-2026-001",
    "device_id": "HANDHELD-001",
    "alert_type": "HIGH_GAS",
    "severity": "CRITICAL",
    "message": "CH4 concentration exceeded 1000 ppm"
  }
  ```
- **Response**: `201 Created` `AlertRead` | `400 Bad Request` | `422 Unprocessable Entity`

### `PATCH /api/alerts/{id}`
- **Purpose**: Acknowledge an alert.
- **Request Body**: `{"acknowledged": true}`
- **Response**: `200 OK` `AlertRead` | `404 Not Found`
