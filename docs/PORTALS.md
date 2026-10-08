# MORD Portal Architecture

This document describes the two portal experiences in MORD and their routing architecture.

## Overview

```text
MORD
├── Trainee Portal (/trainee)
└── Trainer Console (/trainer)
```

- **Trainee Portal (`/trainee`)**: A streamlined, safety-focused interface designed for trainees to observe their safety status, active sessions, and personal safety metrics. (Established as an architectural placeholder in Phase 9; full UI experience to be implemented in Phase 10).
- **Trainer Console (`/trainer`)**: Comprehensive monitoring, supervision, device/zone management, session control, analytics, and alert management dashboard for trainers and safety supervisors.

---

## Route Map

| Path | Component | Description |
|---|---|---|
| `/` | `PortalSelectionPage` | Compact industrial portal selection screen (Choose between Trainee Portal and Trainer Console). |
| `/trainee` | `TraineePortalPage` | Trainee Portal main entry and interface. |
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

## Technical Design

- **Shared API Layer**: Both portals communicate with the exact same FastAPI backend services via the shared `frontend/src/api/` client (`client.ts`, `sessions.ts`, `trainees.ts`, etc.).
- **Shared Type System**: Identical TypeScript types (`Trainee`, `Device`, `Zone`, `Session`, `SensorReading`, `Alert`) are shared across all portals.
- **Portal Context**: `PortalContext` provides route-aware portal context (`trainee` vs `trainer`) to UI components.
- **Zero Authentication Requirement**: Portals represent separated UI layout experiences for Phase 9 prototype without adding user login/auth complexity.
