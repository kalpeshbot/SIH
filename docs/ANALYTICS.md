# Phase 6: Trainer Analytics, Session History & Export Documentation

## Overview
Phase 6 introduces a comprehensive, data-backed analytics, history, and data export layer for industrial training sessions. All analytics are computed strictly from real stored database records in SQLite without data fabrication or artificial metrics.

---

## Key Capabilities

### 1. Session Analytics & Summaries
- **Session Duration**: Computed authoritatively by the backend (`end_time - start_time` for completed sessions, `now - start_time` for active sessions) and displayed in human-friendly format (e.g., `12 min`, `1 hr 24 min`).
- **Telemetry Statistics**: Calculates total reading sample counts, first/last sample timestamps, and per-sensor numerical statistics (`min`, `max`, `avg`) dynamically for available sensor types (`VIBRATION`, `GAS_LEVEL`, `PRESSURE`, etc.).
- **Hazard Alert Breakdown**: Computes total alerts, unacknowledged vs acknowledged counts, earliest/latest alert timestamps, and severity breakdown (`INFO`, `WARNING`, `DANGER`, `CRITICAL`, `FAULT`).

### 2. Session Isolation
Analytics and export data strictly enforce session boundary isolation. Statistics for session `SESS-001` include ONLY sensor readings and hazard alerts belonging to `session_id == 'SESS-001'`, preventing cross-session data leaks even when a single physical hardware device is reused across multiple sessions.

### 3. Data Export Options
Trainers can export full session details and raw telemetry directly from the API or UI:
- **Full Session Export (`CSV` / `JSON`)**: Export session metadata summary, reading statistics, alert counts, raw readings, and alert log.
- **Readings Export (`CSV` / `JSON`)**: Export granular time-series sensor readings (`timestamp`, `session_id`, `device_id`, `sensor_type`, `value`, `unit`, `status`).
- **Alerts Export (`CSV` / `JSON`)**: Export hazard alert logs (`timestamp`, `session_id`, `device_id`, `hazard_type`, `severity`, `message`, `acknowledged`).

### 4. Trainer Session Report
A printable trainer session report view (`SessionReportModal`) provides an organized executive summary containing metadata, telemetry aggregates, hazard alert breakdowns, and a chronological event log suitable for auditing.

---

## Backend API Endpoints

### 1. Fetch Session Analytics
- **Endpoint**: `GET /api/sessions/{identifier}/analytics`
- **Identifier**: Integer primary key `id` OR string code `session_id` (e.g., `SESS-101`).
- **Response**: `SessionAnalytics` schema containing `session`, `reading_stats`, `alert_stats`, and `recent_alerts`.

### 2. Export Full Session Data
- **Endpoint**: `GET /api/sessions/{identifier}/export?format=csv` (or `format=json`)
- **Headers**: `Content-Disposition: attachment; filename="session_{session_id}_export.[csv|json]"`

### 3. Export Readings
- **Endpoint**: `GET /api/sessions/{identifier}/export/readings?format=csv` (or `format=json`)

### 4. Export Alerts
- **Endpoint**: `GET /api/sessions/{identifier}/export/alerts?format=csv` (or `format=json`)

---

## Data Integrity & Empty States
- **Zero Sensor Readings**: Displays `"No sensor readings recorded."` without fake data points.
- **Zero Hazard Alerts**: Displays `"No alerts recorded during this session."`
- **Zero Fabricated Metrics**: No synthetic confidence scores, fake uptime numbers, or mock safety percentages are introduced.
