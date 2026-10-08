# Reliability, Safety & Hardening Documentation (Phase 7)

## Overview
Phase 7 hardens the SIH 2.0 system against realistic failure conditions when communicating with physical ESP32 boards, networks with packet drop/delays, or invalid user actions. It ensures the backend fails safely, the database maintains referential integrity, and the alert engine prevents uncontrolled alert spam.

---

## Hardening Architectural Directives

### 1. Reading API Validation & Value Constraints
- **Finite Float Enforcement**: `POST /api/readings` enforces that `value` is a finite number (`math.isfinite(value)`). Payloads containing `NaN`, `Infinity`, or `-Infinity` are rejected immediately with `422 Unprocessable Entity`.
- **String Field Validation**: All text fields (`session_id`, `device_id`, `sensor_type`, `unit`, `status`) reject empty or whitespace-only strings with `422 Unprocessable Entity`.
- **Timestamp UTC Fallback**: Timezone-aware UTC timestamp parsing is enforced. Omitted timestamps fall back to server UTC time. Malformed dates return a `422` error without database mutation.

### 2. Device / Session Assignment Consistency
- **Assignment Guard**: `POST /api/readings` verifies that `reading.device_id` matches `session.device_id` assigned to `reading.session_id`. Posting a reading with a device ID different from the session's assigned device is rejected with `400 Bad Request`.

### 3. Session Lifecycle Enforcements
- **Terminal State Lock**: Readings are strictly rejected if posted to a closed session (`COMPLETED`, `CANCELLED`).
- **State Machine Protection**: Invalid lifecycle transitions (e.g. attempting to transition from `COMPLETED` or `CANCELLED` back to `ACTIVE`) return `400 Bad Request`.
- **Deletion Protection**: Active sessions cannot be deleted (`409 Conflict`). Historical trainees or devices with active/recorded sessions cannot be deleted (`409 Conflict`).

### 4. Device Heartbeat & last_seen Isolation
- **Heartbeat Endpoint**: `POST /api/devices/{device_id}/heartbeat` updates `last_seen` timestamp for existing registered devices (`200 OK`) or returns `404 Not Found` for unregistered devices.
- **Side-Effect Isolation**: Heartbeat execution ONLY updates `last_seen`. It never creates sessions, readings, or alerts, nor does it mutate battery levels or firmware versions.

### 5. Alert Engine Deduplication & Acknowledgement
- **Alert Deduplication**: When a sensor reading breaches a hazard threshold, the alert engine verifies if an active (unacknowledged) alert of the same severity and hazard type exists for that specific session. If found, duplicate alert creation is suppressed.
- **Re-triggering on Post-Acknowledgement**: If a trainer acknowledges an alert (`acknowledged = True`), subsequent hazardous readings trigger a new alert record cleanly.
- **Alert Session Isolation**: Queries for hazard alerts support `session_id` and `acknowledged` query filtering (`GET /api/alerts?session_id=...&acknowledged=...`).

### 6. Mass Assignment & Data Security
- API request models explicitly use schema classes (`SensorReadingCreate`, `DeviceCreate`, `SessionCreate`, `TraineeCreate`, `ZoneCreate`) to prevent injection of internal model IDs, database paths, or unintended relational attributes.
- No internal stack traces, database file paths, or system secrets are exposed in API responses.

### 7. Frontend Failure Resilience
- Frontend API calls use structured error handling (`ApiError`). Network connection drops return `"Unable to connect to the backend server. Verify the service is running."` (`status: 0`).
- UI components feature clean `ErrorState` views with explicit `onRetry` actions instead of crashing or showing stale fake data.
