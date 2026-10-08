# SIH 2.0 Testing Documentation

## Overview
The SIH 2.0 repository includes automated test suites covering backend API validation, database operations, session lifecycle transitions, alert deduplication, device heartbeats, and report exports.

---

## 1. Backend Test Suite (Pytest)

### Baseline Status
- **Total Tests**: 164 passed (`164 passed in 2.12s`)
- **Framework**: `pytest` & `fastapi.testclient`
- **Database**: SQLite in-memory engine (`StaticPool`)

### Running Backend Tests
```bash
# Navigate to backend directory
cd backend

# Activate virtual environment
.venv\Scripts\Activate.ps1  # Windows
# source .venv/bin/activate  # Linux/macOS

# Run complete pytest suite
python -m pytest

# Run with verbose output
python -m pytest -v
```

### Test Coverage Breakdown
- `test_alerts.py`: Alert creation, severity handling, and query filtering.
- `test_analytics_and_export.py`: Session analytics, duration formatting, reading statistics, alert counts, session isolation, and CSV/JSON data export.
- `test_audit_hardening.py`: FK constraints, mass assignment protection, validation error responses.
- `test_devices.py`: Device registration, type validation, heartbeat updates, deletion guards.
- `test_health.py`: `/health` check endpoint and DB connectivity checks.
- `test_reliability_hardening.py`: Finite float validation (NaN/Inf rejection), device-session assignment consistency, closed session blocking, alert deduplication, post-acknowledgement re-triggering.
- `test_sessions.py`: Session lifecycle transitions (`ACTIVE` -> `COMPLETED`/`CANCELLED`), status validation.
- `test_trainees.py`: Trainee registration, unique ID checks, deletion guards.
- `test_trainer_workflow.py`: End-to-end trainer workflow simulation.

---

## 2. Frontend Build Verification

### Running Frontend Build
```bash
# Navigate to frontend directory
cd frontend

# Run TypeScript compilation and Vite build
npm run build
```
- **Expected Outcome**: Exit code `0` (`built in ~6s` with 0 TypeScript errors).
