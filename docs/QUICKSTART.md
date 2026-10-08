# SIH 2.0 Quick Start Guide

This guide provides step-by-step instructions to set up, initialize, and run the SIH 2.0 Diagnostic Training System prototype on a local machine.

---

## 1. System Requirements
- **Python**: 3.10+ (Python 3.11 recommended)
- **Node.js**: 18+ (Node 20+ recommended) & `npm`
- **OS**: Windows, macOS, or Linux
- **Hardware (Optional)**: ESP32 development board (for hardware Wi-Fi/HTTP telemetry testing)

---

## 2. Clone Repository
```bash
git clone https://github.com/kalpeshbot/SIH.git
cd SIH
```

---

## 3. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create Python virtual environment
python -m venv .venv

# Activate virtual environment (Windows PowerShell)
.venv\Scripts\Activate.ps1
# Or (Linux / macOS)
# source .venv/bin/activate

# Install backend dependencies
pip install -r requirements.txt
```

---

## 4. Database Initialization & Backend Startup
The SQLite database initializes automatically upon backend launch.

```bash
# Start FastAPI backend server (listening on 127.0.0.1:8000 and 0.0.0.0:8000)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- **Backend API**: `http://localhost:8000`
- **Swagger Documentation**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/health`

---

## 5. Frontend Setup & Startup
Open a new terminal window:

```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
- **Trainer Dashboard**: `http://localhost:5173`

---

## 6. Optional ESP32 Hardware Setup
To test ESP32 communication without sensors:
1. Open `firmware/esp32_basic/esp32_basic.ino` in Arduino IDE.
2. Update `WIFI_SSID` and `WIFI_PASSWORD` with your local Wi-Fi credentials.
3. Update `serverHost` to your host computer's local LAN IP (e.g. `192.168.1.50`).
4. Flash to ESP32 board and open Serial Monitor (115200 baud).

---

## 7. Troubleshooting
- **Frontend cannot connect to backend**: Verify backend is running on `http://localhost:8000`.
- **ESP32 cannot connect**: Ensure FastAPI is listening on `0.0.0.0` and Windows Firewall allows inbound connections on port 8000.
