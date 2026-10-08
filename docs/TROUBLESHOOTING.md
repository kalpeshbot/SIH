# SIH 2.0 Troubleshooting Guide

This guide covers common issues, root cause checks, and solutions for local deployment, hardware connectivity, and dashboard interaction.

---

## 1. Backend Issues

### Issue: Backend won't start (`Port 8000 already in use`)
- **Cause**: Another process or background instance of uvicorn is using port 8000.
- **Check**: Run `netstat -ano | findstr :8000` (Windows) or `lsof -i :8000` (Linux/macOS).
- **Fix**: Kill the process or specify another port:
  ```bash
  python -m uvicorn app.main:app --host 0.0.0.0 --port 8001
  ```

### Issue: Database initialization error
- **Cause**: SQLite database permissions issue or locked file.
- **Check**: Verify `data/` directory exists and has write permissions.
- **Fix**: Remove stale `.db` file or recreate SQLite tables automatically by restarting backend.

---

## 2. Frontend & Network Connection Issues

### Issue: "Unable to connect to the backend server" on Dashboard
- **Cause**: Backend server is offline or frontend API base URL is misconfigured.
- **Check**: Open `http://localhost:8000/health` in browser.
- **Fix**: Ensure FastAPI backend is running and `VITE_API_BASE_URL` in `frontend/.env` points to `http://localhost:8000`.

### Issue: ESP32 cannot reach backend over Wi-Fi
- **Cause 1**: ESP32 is configured with `http://localhost:8000` instead of host computer's LAN IP.
- **Cause 2**: FastAPI backend bound to `127.0.0.1` instead of `0.0.0.0`.
- **Cause 3**: Windows Firewall blocking port 8000.
- **Check**:
  1. Find host computer LAN IP: `ipconfig` (Windows) or `ifconfig` (Linux/macOS). Example: `192.168.1.50`.
  2. Verify ESP32 firmware uses `http://192.168.1.50:8000`.
  3. Ensure backend is started with `--host 0.0.0.0`.
- **Fix (Windows Firewall)**:
  - Run PowerShell as Administrator:
    ```powershell
    New-NetFirewallRule -DisplayName "FastAPI SIH 8000" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
    ```

---

## 3. Data & Session Workflow Issues

### Issue: "Device is already assigned to active session" (HTTP 409)
- **Cause**: A device cannot participate in multiple simultaneous active sessions.
- **Fix**: Complete or cancel the existing active session assigned to that device before initiating a new run.

### Issue: "Session is closed; cannot add readings" (HTTP 400)
- **Cause**: Attempting to post readings to a session with status `COMPLETED` or `CANCELLED`.
- **Fix**: Initiate a new active training session for new telemetry data.

### Issue: Export CSV or JSON download doesn't open
- **Cause**: Popup blocker in web browser.
- **Fix**: Allow popups for `localhost:5173` or right-click export link and select "Save Link As".
