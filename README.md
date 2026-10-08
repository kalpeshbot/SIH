# SIH Vocational Training Safety Monitor

A specialized IoT diagnostic monitoring platform designed for vocational workshop training. Provides real-time sensor telemetry visualization, hardware tracking, session lifecycle auditing, and hazard threshold alerting.

---

## System Architecture

```text
ESP32 Hardware Probes (Handheld / Wearable)
         ↓ (HTTP POST)
FastAPI Backend (/api/readings)
         ↓
  Alert Engine Service (Thresholds & Deduplication)
         ↓
  SQLite Database (sih.db)
         ↓
React + TypeScript Industrial Dashboard
```

---

## Project Structure

```text
.
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── core/             # Settings & Configurations
│   │   ├── database/         # Database engine & seed data
│   │   ├── models/           # SQLModel database entities
│   │   ├── routers/          # API route handlers (trainees, devices, sessions, readings, alerts)
│   │   ├── schemas/          # Pydantic request/response validation schemas
│   │   └── services/         # Alert evaluation engine
│   └── tests/                # 105 automated backend & hardening tests
├── frontend/                 # React 19 + TypeScript + Vite Dashboard
│   ├── src/
│   │   ├── api/              # Centralized API client & typed endpoints
│   │   ├── components/       # Industrial UI components (charts, timeline, modals, badges)
│   │   ├── context/          # System & Theme context providers
│   │   ├── pages/            # Dashboard, Sessions, Trainees, Devices, Zones, Alerts, Settings
│   │   ├── styles/           # Design tokens (Light/Dark mode) & Global CSS
│   │   └── tests/            # Vitest unit & component test suite
├── docs/                     # Technical specifications (API, Architecture, Frontend)
└── README.md
```

---

## Quickstart

### 1. Backend Setup

```bash
# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate  # Or .venv\Scripts\Activate.ps1 on Windows

# Install dependencies
pip install -r backend/requirements.txt

# Run backend test suite
python -m pytest backend/tests/ -v

# Start FastAPI server
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend Setup

```bash
# Navigate to frontend
cd frontend

# Install Node dependencies
npm install

# Run frontend test suite
npm test

# Build for production
npm run build

# Start Vite development server
npm run dev
```

Visit the dashboard at `http://localhost:5173/`.

---

## Safety Disclaimer

**THIS PROTOTYPE IS NOT A CERTIFIED LIFE-SAFETY DEVICE.** All sensor readings, alert triggers, and threshold evaluations are intended strictly for vocational training demonstrations and educational skills evaluation. This system must not replace certified safety equipment or established workshop safety protocols.
