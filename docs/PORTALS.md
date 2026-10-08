# MORD Portal Architecture

This document describes the two portal experiences in MORD and their routing architecture.

## Overview

```text
MORD
├── Trainee Portal (/trainee)
└── Trainer Console (/trainer)
         ├── Live Monitoring (Dashboard)
         ├── Sessions
         ├── Session Detail
         ├── Trainees
         ├── Devices
         ├── Zones
         ├── Alerts
         └── Settings
```

---

## Trainer Console — Live Monitoring

The Trainer Dashboard at `/trainer` includes a dedicated **Live Monitoring Panel** that shows real-time data from active sessions directly from backend records.

### Core Question the Trainer Dashboard Answers
1. *Is anyone currently being monitored?*
2. *Which trainee is active?*
3. *Which device is active?*
4. *Which zone?*
5. *Are readings arriving?*
6. *When was the last reading?*
7. *Are there active hazards?*
8. *What is the recent telemetry trend?*

### Live Status Indicator

The `● LIVE` indicator reflects real backend state:

| State | Meaning |
|---|---|
| `● LIVE` | Session active, device connected (<30s heartbeat), real sensor readings present |
| `● WAITING` | Session active and device online, but no sensor readings yet received |
| `● OFFLINE` | Device disconnected or silent >30s |
| `● NO SESSION` | No active training sessions currently |
| `● ERROR` | Backend unreachable |

The indicator **never** claims LIVE when backend data is unavailable.

### Telemetry Graph

- Rendered using **Recharts** (already installed, `recharts@^2.15.1`).
- Plots actual `SensorReading` records from `GET /api/sessions/{session_id}/readings`.
- Shows the most recent `60` readings for the selected session/sensor type.
- Sensor type selector only shows sensor types that have actual data — never shows a fake sensor option.
- When 0 readings exist: displays **"WAITING FOR SENSOR DATA"** — never a fake waveform.
- `isAnimationActive={false}` — graph only updates when real new data arrives; no synthetic animation.

### Session Selection

- If exactly 1 active session: automatically displayed.
- If 2+ active sessions: dropdown selector shown. Each session's graph is isolated to `SensorReading.session_id === selectedSession.session_id`.
- Alert feed also scoped strictly to `Alert.session_id === selectedSession.session_id`.

### Polling Behavior

- Parent `DashboardPage` polls all sessions, devices, and global alerts every **4 seconds**.
- `LiveMonitoringPanel` additionally polls session-specific readings + alerts every **3 seconds** independently.
- No WebSockets, MQTT, or SSE — polling only.

### Offline / Error Behavior

- If polling fails, a `Connection Error` banner appears with the exact error message.
- `● LIVE` changes to `● ERROR` — stale data is not presented as live.
- When device has not sent heartbeat for >30s, device card shows `● CONNECTION LOST`.
- "Updated X seconds ago" timestamp is shown based on actual last successful poll.

### Empty Data Behavior

| Situation | Displayed |
|---|---|
| No active sessions | **NO ACTIVE SESSIONS** — static empty state, no graph |
| Session active, no readings | **WAITING FOR SENSOR DATA** — explicit waiting placeholder |
| Device offline | `● CONNECTION LOST` on device card |
| Backend unavailable | `Connection Error` banner + `● ERROR` live indicator |

No fake values, waveforms, or fabricated metrics are ever shown.

---

## Trainee Portal Design & Core Principles

The Trainee Portal operates on the core principle: **"Tell me what I need to know."**
It provides immediate, unmistakable visual answers to the trainee's primary safety questions:
1. *Am I safe?*
2. *Is my device connected?*
3. *What zone am I in?*
4. *Is my session active?*
5. *Is there a hazard?*
6. *What action should I take?*

### Safety State Matrix

The Trainee Portal dynamically evaluates safety telemetry from the backend into 7 distinct safety states:

| Safety State | Visual Banner | Trigger Conditions |
|---|---|---|
| **NORMAL** | Calm Green | Session ACTIVE, Device ONLINE, real sensor readings present, 0 active warning/danger alerts |
| **DANGER** | High Contrast Red | Active unacknowledged alert with severity `DANGER` or `CRITICAL` |
| **WARNING** | Amber / Yellow | Active unacknowledged alert with severity `WARNING` |
| **FAULT** | Warning Amber | Sensor or system fault reported |
| **OFFLINE** | Red / Connection Lost | Device status `OFFLINE` or silent for >30s or backend unreachable |
| **NO SESSION** | Neutral Muted Gray | No active session found for selected trainee profile |
| **WAITING FOR DATA** | Cyan / Blue | Session ACTIVE and device ONLINE, but 0 sensor readings transmitted yet |

> **CRITICAL RULE**: No fake sensor readings, fake alerts, or arbitrary numeric safety scores are ever generated or shown.

---

## Route Map

| Path | Component | Description |
|---|---|---|
| `/` | `PortalSelectionPage` | Compact industrial portal selection screen |
| `/trainee` | `TraineePortalPage` | Trainee Profile Selector grid |
| `/trainee?trainee_id=TRN-001` | `TraineePortalPage` | Trainee safety dashboard for selected trainee |
| `/trainer` | `DashboardPage` | Trainer Console with Live Monitoring Panel |
| `/trainer/sessions` | `SessionsPage` | Session listing, creation, and management |
| `/trainer/sessions/:id` | `SessionDetailPage` | Session detail, analytics, and exports |
| `/trainer/trainees` | `TraineesPage` | Trainee directory and management |
| `/trainer/devices` | `DevicesPage` | ESP32 device registry and last-seen monitoring |
| `/trainer/zones` | `ZonesPage` | Safety zone configuration |
| `/trainer/alerts` | `AlertsPage` | Industrial alert logs and resolution |
| `/trainer/settings` | `SettingsPage` | System configurations |

### Compatibility Redirects

Legacy routes redirect to their `/trainer/*` counterparts:
- `/sessions` → `/trainer/sessions`
- `/sessions/:id` → `/trainer/sessions/:id`
- `/trainees` → `/trainer/trainees`
- `/devices` → `/trainer/devices`
- `/zones` → `/trainer/zones`
- `/alerts` → `/trainer/alerts`
- `/settings` → `/trainer/settings`
- `/privacy`, `/terms`, `/about` → `/trainer/*` equivalents

---

## Technical & Data Flow Design

- **Trainee Profile Selection**: `?trainee_id=TRN-001` query parameter or grid selector from `GET /api/trainees`.
- **Session Discovery (Trainee Portal)**: `GET /api/sessions` filtered by `trainee_id` and `status === 'ACTIVE'`.
- **Session Discovery (Trainer Dashboard)**: `GET /api/sessions` filtered for `ACTIVE | PAUSED`, with session isolation by `session_id`.
- **Device Connectivity**: Based on `device.last_seen` — CONNECTED (<30s), RECENT (<5m), OFFLINE (>5m), NEVER.
- **Polling Cycle**: Dashboard: 4s, Trainee Portal: 3s. No WebSockets.
- **Alert Acknowledgement**: Exclusive to Trainer Console. Trainee Portal shows alerts read-only.
- **Sensor Graph Data**: Uses `GET /api/sessions/{session_id}/readings`, last 60 readings.
- **Backend Integrity**: Zero backend code changes. All 164 pytest tests passing.
