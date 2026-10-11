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

### 7. `SafetyEvent` (`safety_events`)
Structured intelligence events with confidence and trend classification.
- `id` (int, Primary Key)
- `event_id` (string, Unique Index)
- `session_id` (string, Foreign Key -> `sessions.session_id`)
- `device_id` (string, Foreign Key -> `devices.device_id`)
- `zone_id` (string, Optional Foreign Key -> `zones.zone_id`)
- `machine_id` (string, Optional Index)
- `event_type` (string): e.g. `VIBRATION_ANOMALY`, `ACOUSTIC_ANOMALY`
- `severity` (string): `INFO`, `WARNING`, `DANGER`, `CRITICAL`
- `status` (string): `DETECTED`, `ACKNOWLEDGED`, `RESOLVED`, `DISMISSED`
- `confidence_level` (string): `LOW`, `MEDIUM`, `HIGH`
- `confidence_reason` (string, Optional)
- `trend_state` (string, Optional): `TRANSIENT`, `PERSISTENT`, `ESCALATING`, `RECOVERING`, `UNKNOWN`
- `trend_reason` (string, Optional)
- `persistence_count` (int, Default 0)
- `started_at`, `acknowledged_at`, `resolved_at` (datetime UTC)

### 8. `MachineBaseline` (`machine_baselines`)
State-conditioned machine baseline profiles.
- `id` (int, Primary Key)
- `baseline_id` (string, Unique Index)
- `machine_id` (string, Index)
- `sensor_type` (string)
- `machine_state` (string): `IDLE`, `STARTUP`, `ACTIVE`, `COOLDOWN`
- `feature_name` (string): `RMS`, `PEAK`, `CREST_FACTOR`, `KURTOSIS`
- `baseline_value` (float)
- `spread` (float, Optional)
- `sample_count` (int)
- `version` (int, Default 1)
- `validity_state` (string): `VALID`, `INSUFFICIENT_SAMPLES`, `STALE`, `INVALIDATED`
- `capture_period_seconds` (float, Optional)
- `source` (string, Default `CALIBRATION_RUN`)

### 9. `Inspection` (`inspections`)
Evidence-guided walk-around inspection records.
- `id` (int, Primary Key)
- `inspection_id` (string, Unique Index)
- `session_id` (string, Foreign Key -> `sessions.session_id`, Index)
- `device_id` (string, Optional)
- `zone_id` (string, Optional)
- `machine_id` (string, Optional)
- `event_id` (string, Optional Foreign Key -> `safety_events.event_id`)
- `trainer_id` (string, Optional)
- `template_id` (string, Optional)
- `status` (string): `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
- `decision` (string, Optional): `CONFIRMED_BY_TRAINER`, `REFUTED_BY_TRAINER`, `INCONCLUSIVE`, `INSUFFICIENT_EVIDENCE`
- `reason` (string)
- `checklist_json` (string, JSON): Ordered checklist steps and landmark positions
- `measurement_source` (string, Default `MANUAL_OBSERVATION`)
- `sensor_health_state` (string, Default `UNKNOWN`)
- `machine_state` (string, Default `UNKNOWN`)
- `baseline_id` (string, Optional)
- `trainer_notes`, `outcome_notes` (string, Optional)
- `created_at`, `updated_at`, `completed_at` (datetime UTC)

### 10. `InspectionEvidence` (`inspection_evidence`)
Empirical observation and measurement records supporting an inspection.
- `id` (int, Primary Key)
- `evidence_id` (string, Unique Index)
- `inspection_id` (string, Foreign Key -> `inspections.inspection_id`, Index)
- `session_id` (string, Index)
- `evidence_type` (string): `MANUAL_MEASUREMENT`, `TRAINER_OBSERVATION`, `TELEMETRY_READING`, `SENSOR_HEALTH`, `BASELINE_REFERENCE`
- `source` (string): `MANUAL`, `SENSOR`, `BASELINE`, `CALCULATED`
- `reference_id` (string, Optional)
- `value` (float, Optional finite value)
- `unit` (string, Optional)
- `notes` (string, Optional)
- `timestamp`, `created_at` (datetime UTC)

### 11. `TrainerIntervention` (`trainer_interventions`)
Trainer corrective interventions and pre/post telemetry window comparisons.
- `id` (int, Primary Key)
- `intervention_id` (string, Unique Index)
- `session_id` (string, Foreign Key -> `sessions.session_id`, Index)
- `inspection_id` (string, Optional Foreign Key -> `inspections.inspection_id`)
- `event_id` (string, Optional Foreign Key -> `safety_events.event_id`)
- `machine_id`, `trainer_id` (string, Optional)
- `category` (string): e.g. `WORKHOLDING_ADJUSTMENT`, `TOOL_INSPECTION`, `SPEED_FEED_ADJUSTMENT`
- `notes` (string)
- `timestamp` (datetime UTC)
- `before_window_json`, `after_window_json` (string, JSON, Optional)
- `comparison_outcome` (string): `IMPROVED`, `UNCHANGED`, `WORSENED`, `INCONCLUSIVE`
- `comparison_notes` (string, Optional)

---

## Non-Destructive Database Migrations
SQLite does not automatically alter existing table schemas when new fields are added via `create_all()`.
MORD implements **`run_migrations()`** in `app/database/database.py`:
- Inspects SQLite table columns dynamically using `PRAGMA table_info(<table_name>)`.
- Safely executes backward-compatible `ALTER TABLE <table_name> ADD COLUMN <col_name> <type>` queries only if the column does not already exist.
- Never recreates, drops, or alters existing customer records or databases.
