# Architecture

## Complete System Architecture
The SIH Vocational Training Safety Monitor combines an IoT sensor ingestion backend with an industrial web dashboard for operational monitoring.

```text
Frontend (React 19 + TypeScript + Vite)
   ↓ (REST API / HTTP JSON)
FastAPI Backend (Routers → Services → Alert Engine)
   ↓ (SQLModel ORM)
SQLite Database (sih.db)
```

## Future Hardware Integration Architecture
When physical ESP32 hardware devices are deployed, telemetry flows directly into the backend:

```text
ESP32 (Handheld / Wearable Probes)
   ↓ (Wi-Fi HTTP POST /api/readings)
FastAPI Ingestion Router
   ↓ (Validation & Threshold Checks)
Alert Engine Service (Deduplication & Hazard Triggers)
   ↓ (ACID Transactions)
SQLite Database
   ↓ (Live Polling)
React Dashboard (Telemetry Visualization & Instructor Alerts)
```

## Component Overview
1. **Frontend (`/frontend`)**: React 19 single-page application built with Vite, TypeScript, Lucide React, and Recharts. Implements dual portals (Trainer Console and Trainee Portal).
2. **Backend (`/backend`)**: FastAPI service with SQLModel ORM, Pydantic validation, alert deduplication, safety event lifecycle management, and machine baseline tracking.
3. **Intelligence Layer (`/docs/MORD_INTELLIGENCE.md`)**: Context-aware machine anomaly detection, sensor health validation, explainable alert generation, and post-session debrief event reconstruction.
4. **Database (`/data` or `/backend/data`)**: SQLite relational database with full relational models for Trainees, Devices, Zones, Sessions, SensorReadings, Alerts, SafetyEvents, and MachineBaselines.

