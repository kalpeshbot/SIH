# MORD Portal Architecture

This document describes the two portal experiences in MORD and their routing architecture.

## Overview

```text
MORD
├── Trainee Portal (/trainee)
└── Trainer Console (/trainer)
```

- **Trainee Portal (`/trainee`)**: A streamlined, safety-focused interface designed for trainees to observe their safety status, active session details, connected device health, zone assignment, real sensor telemetry, and active safety alerts.
- **Trainer Console (`/trainer`)**: Comprehensive monitoring, supervision, device/zone management, session control, analytics, and alert management dashboard for trainers and safety supervisors.

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

| Safety State | Visual Banner | Trigger Conditions | Trainee Action Message |
|---|---|---|---|
| **NORMAL** | Calm Green | Session ACTIVE, Device ONLINE, real sensor readings present, 0 active warning/danger alerts. | Safety monitoring active. All sensor telemetry within safe limits. |
| **DANGER** | High Contrast Red | Active unacknowledged alert with severity `DANGER` or `CRITICAL`. | STOP WORK IMMEDIATELY. Follow trainer instructions and move to safety. |
| **WARNING** | Amber / Yellow | Active unacknowledged alert with severity `WARNING`. | Elevated hazard level detected. Follow trainer instructions. |
| **FAULT** | Warning Amber | Sensor or system fault reported. | System check required. Contact your trainer before continuing work. |
| **OFFLINE** | Red / Connection Lost | Device status `OFFLINE` or silent for >30s or backend unreachable. | CONNECTION LOST — Follow established workshop safety procedures and contact your trainer. |
| **NO SESSION** | Neutral Muted Gray | No active session found for selected trainee profile. | NO ACTIVE SESSION — You are not currently in an active training session. |
| **WAITING FOR DATA** | Cyan / Blue | Session ACTIVE and device ONLINE, but 0 sensor readings transmitted yet. | Session active and device connected. Waiting for initial telemetry... |

> **CRITICAL RULE**: No fake sensor readings, fake alerts, or arbitrary numeric safety scores (e.g. "98% safe") are ever generated or shown. When no sensor data is received, the portal explicitly displays **WAITING FOR SENSOR DATA**.

---

## Route Map

| Path | Component | Description |
|---|---|---|
| `/` | `PortalSelectionPage` | Compact industrial portal selection screen (Choose between Trainee Portal and Trainer Console). |
| `/trainee` | `TraineePortalPage` | Trainee Portal interface with Trainee Selector profile grid and live safety dashboard. |
| `/trainer` | `DashboardPage` | Trainer Console overview dashboard. |
| `/trainer/sessions` | `SessionsPage` | Session listing, creation, and management. |
| `/trainer/sessions/:id` | `SessionDetailPage` | Individual session detail, analytics, and exports. |
| `/trainer/trainees` | `TraineesPage` | Trainee directory and management. |
| `/trainer/devices` | `DevicesPage` | ESP32 device registry and last-seen monitoring. |
| `/trainer/zones` | `ZonesPage` | Safety zone configuration. |
| `/trainer/alerts` | `AlertsPage` | Industrial alert logs and resolution. |
| `/trainer/settings` | `SettingsPage` | System configurations and settings. |

### Compatibility Redirects

Legacy routes are automatically redirected to their `/trainer/*` counterparts to maintain full backward compatibility for bookmarks and direct navigation:

- `/sessions` → `/trainer/sessions`
- `/sessions/:id` → `/trainer/sessions/:id`
- `/trainees` → `/trainer/trainees`
- `/devices` → `/trainer/devices`
- `/zones` → `/trainer/zones`
- `/alerts` → `/trainer/alerts`
- `/settings` → `/trainer/settings`
- `/privacy` → `/trainer/privacy`
- `/terms` → `/trainer/terms`
- `/about` → `/trainer/about`

---

## Technical & Data Flow Design

- **Trainee Profile Selection**: Prototype profile selection via `?trainee_id=TRN-001` query parameter or clean trainee grid selector fetched dynamically from `GET /api/trainees`.
- **Session Discovery**: Automatically resolves active training sessions for the selected trainee via `GET /api/sessions`.
- **Live Elapsed Timer**: Dynamic duration timer (`HH:MM:SS`) calculated client-side from `session.start_time`.
- **Telemetry Polling Cycle**: Automatic 3-second polling loop refreshing session, device connectivity (`last_seen`), real sensor readings, and active alerts.
- **Alert Acknowledgement Boundary**: Alerts displayed on the Trainee Portal are strictly read-only. Alert resolution and acknowledgement remain exclusive to the Trainer Console.
- **Shared API Layer**: Both portals communicate with the exact same FastAPI backend services via the shared `frontend/src/api/` client (`client.ts`, `endpoints.ts`).
- **Shared Type System**: Identical TypeScript types (`Trainee`, `Device`, `Zone`, `SessionRecord`, `SensorReading`, `Alert`) are shared across all portals.
- **Backend Integrity**: 100% untouched FastAPI + SQLite backend passing all 164 pytest tests.
