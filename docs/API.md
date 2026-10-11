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

---

## Evidence-Guided Inspections (`/api/inspections`)

### `GET /api/inspections/templates`
- **Purpose**: List standard reusable walk-around inspection route templates (`LATHE_MECHANICAL_INSPECTION`, `PUMP_PIPE_INSPECTION`, `GENERAL_WORKSHOP_INSPECTION`).
- **Response**: `200 OK` `[InspectionTemplateRead]`

### `GET /api/inspections`
- **Purpose**: List inspections with optional filters (`session_id`, `machine_id`, `zone_id`, `status`, `decision`, `limit`, `offset`).
- **Response**: `200 OK` `[InspectionRead]`

### `POST /api/inspections`
- **Purpose**: Create a new inspection record from template or manual route.
- **Request Body**: `InspectionCreate` (includes `inspection_id`, `session_id`, `template_id`, `reason`, `machine_id`, `trainer_notes`)
- **Response**: `201 Created` `InspectionRead` | `400 Bad Request` | `409 Conflict`

### `GET /api/inspections/{id}`
- **Purpose**: Retrieve inspection detail including ordered checklist and evidence items.
- **Response**: `200 OK` `InspectionRead` | `404 Not Found`

### `PATCH /api/inspections/{id}/steps/{step_id}`
- **Purpose**: Update an individual checklist step status (`PENDING`, `COMPLETED`, `SKIPPED`, `FOLLOW_UP_REQUIRED`) and observation.
- **Response**: `200 OK` `InspectionRead` | `400 Bad Request` | `404 Not Found`

### `POST /api/inspections/{id}/evidence`
- **Purpose**: Record a structured manual or telemetry evidence observation.
- **Request Body**: `InspectionEvidenceCreate` (`evidence_id`, `evidence_type`, `source`, `value`, `unit`, `notes`)
- **Response**: `201 Created` `InspectionEvidenceRead` | `409 Conflict` | `422 Unprocessable Entity`

### `POST /api/inspections/{id}/complete`
- **Purpose**: Conclude an inspection by recording the trainer's final decision (`CONFIRMED_BY_TRAINER`, `REFUTED_BY_TRAINER`, `INCONCLUSIVE`, `INSUFFICIENT_EVIDENCE`).
- **Request Body**: `InspectionComplete` (`decision`, `outcome_notes`, `trainer_notes`)
- **Response**: `200 OK` `InspectionRead` | `400 Bad Request`

### `POST /api/inspections/{id}/cancel`
- **Purpose**: Cancel an active inspection.
- **Response**: `200 OK` `InspectionRead` | `400 Bad Request`

### `GET /api/inspections/{id}/evidence-quality`
- **Purpose**: Deterministically evaluate evidence quality for this inspection (`SUFFICIENT`, `DEGRADED`, `INSUFFICIENT`).
- **Response**: `200 OK` `EvidenceQualityAssessmentResponse`

### `GET /api/inspections/{id}/export`
- **Purpose**: Export inspection package in structured JSON or spreadsheet-safe CSV (`format=json` or `format=csv`).
- **Security**: CSV formula injection characters (`=`, `+`, `-`, `@`, `\t`, `\r`, `\n`) are neutralized dynamically without modifying database records.
- **Response**: `200 OK` `application/json` or `text/csv`

---

## Trainer Corrective Interventions (`/api/interventions`)

### `GET /api/interventions`
- **Purpose**: List recorded trainer interventions with filters (`session_id`, `inspection_id`, `category`, `outcome`).
- **Response**: `200 OK` `[TrainerInterventionRead]`

### `POST /api/interventions`
- **Purpose**: Record an intervention and compute deterministic pre- and post-intervention telemetry comparison.
- **Request Body**: `TrainerInterventionCreate` (`intervention_id`, `session_id`, `category`, `notes`, `before_window_data`, `after_window_data`)
- **Response**: `201 Created` `TrainerInterventionRead` (includes `comparison_outcome`: `IMPROVED`, `UNCHANGED`, `WORSENED`, `INCONCLUSIVE`)

---

## Session Replay & Debrief Packages (`/api/sessions`)

### `GET /api/sessions/{id}/replay`
- **Purpose**: Retrieve unified chronological timeline replay of all records in a session (lifecycles, safety events, alerts, inspections, interventions).
- **Query Parameters**: `record_type`, `machine_id`, `zone_id`, `limit`, `offset`.
- **Response**: `200 OK` `SessionReplayResponse`

### `GET /api/sessions/{id}/export/evidence-package`
- **Purpose**: Download complete session evidence package (JSON or sanitized CSV).
- **Response**: `200 OK` `application/json` or `text/csv`

---

## Trainer Intelligence Analytics (`/api/trainer`)

### `GET /api/trainer/analytics`
- **Purpose**: Aggregate evidence-backed workshop intelligence metrics: unresolved inspections, repeated events by machine and zone, response latencies (mean time to acknowledge, mean time to resolve), and skipped steps count.
- **Response**: `200 OK` `TrainerIntelligenceAnalytics`
