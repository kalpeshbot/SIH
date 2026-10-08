# SIH 2.0 Diagnostic Training Safety Monitor

A specialized IoT diagnostic monitoring platform designed for vocational workshop training. Provides real-time telemetry processing, hardware tracking, session lifecycle auditing, alert deduplication, and trainer analytics.

> **Safety Disclaimer**: This prototype system is intended strictly for vocational training demonstrations and educational skills evaluation. Sensor readings and alerts are intended for training support. This system is **not a certified safety device** and must not replace established workshop safety procedures.

---

## Technical Overview & Problem Solved
Workshop trainees in vocational environments may be exposed to operational hazards (gas breaches, excessive vibration, overheating). SIH 2.0 provides a resilient software pipeline that connects wearable/handheld ESP32 hardware to an authoritative trainer dashboard for real-time session tracking, hazard alert deduplication, and printable report analytics.

---

## High-Level Architecture
```text
ESP32 Hardware Probes (Handheld / Wearable)
         ↓ (HTTP / JSON over Wi-Fi)
FastAPI Backend (0.0.0.0:8000)
         ↓
  Alert Engine Service (Deduplication & Thresholds)
         ↓
  SQLite Database (sih.db)
         ↓
React + TypeScript Industrial Dashboard (localhost:5173)
```

---

## Technology Stack
- **Core Logic**: Python 3.11, TypeScript 5.7
- **Backend Framework**: FastAPI & Uvicorn
- **Database Layer**: SQLModel & SQLite
- **Frontend Framework**: React 19, Vite 6, React Router 7
- **Telemetry Charts**: Recharts 2.15
- **Hardware Platform**: ESP32 (Wi-Fi / HTTP JSON POST)
- **Testing Suites**: Pytest 9.1 (164 tests passing) & Vitest

---

## Documentation Index
- [Quick Start Guide](docs/QUICKSTART.md) — 5-minute setup instructions
- [Architecture Specifications](docs/ARCHITECTURE.md) — System pipeline & entity model
- [Database & Schema Reference](docs/DATABASE.md) — Entity schemas and relationship diagrams
- [API Documentation](docs/API.md) — Complete REST endpoint specifications
- [ESP32 Hardware Connection](docs/ESP32_CONNECTION.md) — Firmware configuration & Wi-Fi setup
- [Trainer Analytics & Export](docs/ANALYTICS.md) — Statistics calculations and CSV/JSON export
- [Reliability & Hardening](docs/RELIABILITY.md) — Validation, deduplication, and error resilience
- [Demonstration & Presentation Guide](docs/DEMO_GUIDE.md) — SIH evaluation walkthrough flow
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md) — Solutions for backend, network, and firewall issues
- [Testing & Verification](docs/TESTING.md) — Pytest suite execution and build commands

---

## Repository Structure
```text
.
├── backend/                  # FastAPI Application & Service Layer
│   ├── app/
│   │   ├── core/             # Application settings & configuration
│   │   ├── database/         # Database engine & table creation
│   │   ├── models/           # SQLModel database entities (Trainee, Device, Zone, Session, Reading, Alert)
│   │   ├── routers/          # REST route handlers
│   │   ├── schemas/          # Pydantic request/response validation schemas
│   │   └── services/         # Alert engine, analytics, and export services
│   └── tests/                # 164 automated pytest regression tests
├── frontend/                 # React + TypeScript + Vite Dashboard
│   ├── src/
│   │   ├── api/              # Centralized API client & typed endpoints
│   │   ├── components/       # Industrial UI components (charts, cards, modals)
│   │   └── pages/            # Dashboard, Sessions, SessionDetail, Trainees, Devices, Zones, Alerts
│   └── vite.config.ts        # Vite build configuration
├── firmware/                 # ESP32 Firmware
│   └── esp32_basic/          # Communication validation firmware (Wi-Fi, HTTP, heartbeat, retry)
├── docs/                     # Comprehensive technical documentation
├── .github/workflows/        # GitHub Actions CI pipeline (pytest & npm build)
└── README.md
```

---

## Quick Start Summary

### 1. Backend Startup
```bash
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1   # Or source .venv/bin/activate on Linux/macOS
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- **Backend API**: `http://localhost:8000`
- **Swagger Docs**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/health`

### 2. Frontend Startup
```bash
cd frontend
npm install
npm run dev
```
- **Trainer Dashboard**: `http://localhost:5173`

### 3. Verification
```bash
# Run 164 backend tests
cd backend && python -m pytest

# Verify frontend compilation
cd frontend && npm run build
```

---

## Future Hardware Integration Roadmap
Physical sensor modules (MQ-4 methane gas, MQ-6 LPG, ADXL345 accelerometer, pressure probe, wetness sensor) will be connected to the ESP32 GPIO pins during subsequent physical sensor integration phases.
