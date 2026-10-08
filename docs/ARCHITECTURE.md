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
1. **Frontend (`/frontend`)**: React 19 single-page application built with Vite, TypeScript, Lucide React, and Recharts. Implements strict industrial design standards (light/dark modes, rectangular geometry, zero fake metrics).
2. **Backend (`/backend`)**: FastAPI service with SQLModel ORM, Pydantic validation, alert threshold evaluation, and state machine lifecycle enforcement.
3. **Database (`/data` or `/backend/data`)**: SQLite relational database with seed data for trainees, devices, and workshop bays.
