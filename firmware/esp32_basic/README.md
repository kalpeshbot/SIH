# ESP32 Hardened Connection (Phase 4B)

This folder contains the Phase 4B hardened firmware for verifying and stress-testing the end-to-end pipeline *before* any real sensors are connected.

## Firmware Version: 0.2.0

## What Changed from Phase 4A (v0.1.0)

| Area | Phase 4A (v0.1.0) | Phase 4B (v0.2.0) |
|---|---|---|
| Wi-Fi Recovery | Blocking retry | Non-blocking `millis()` loop |
| HTTP Timeout | None | 5-second configurable timeout |
| HTTP Status Handling | None | 2xx / 4xx / 5xx explicit handling |
| HTTP Resource Cleanup | Partial | `http.end()` always called |
| Heartbeat | None | Periodic POST to `/api/devices/{id}/heartbeat` |
| Device Identity | Inline values | Centralized `#define`-style constants at top |
| Firmware Version | None | `FIRMWARE_VERSION = "0.2.0"` printed on boot |
| Memory Logging | None | `[MEM] Free heap: XXXXX` logged per reading |
| Backend State Tracking | None | `isBackendReachable` flag avoids log spam |

## Configuration Block

Open `esp32_basic.ino` and set these values at the top before flashing:

```cpp
const char* DEVICE_ID = "WR-ESP32";
const char* DEVICE_TYPE = "wearable";
const char* FIRMWARE_VERSION = "0.2.0";
const char* SESSION_ID = "SESS-ESP32"; // Must exist in backend DB

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Use your PC's LAN IP (NOT localhost/127.0.0.1)
const char* BACKEND_URL = "http://192.168.X.X:8000";

// Timing
const unsigned long WIFI_RETRY_INTERVAL_MS = 10000;   // 10s between reconnect attempts
const unsigned long HEARTBEAT_INTERVAL_MS  = 15000;   // 15s heartbeat
const unsigned long READING_INTERVAL_MS    = 5000;    // 5s between readings
const int           HTTP_TIMEOUT_MS        = 5000;    // 5s HTTP timeout
```

## Setup

### Step 1: Find your computer's IP address

Open a terminal and run:
```
ipconfig
```
Look for the **IPv4 Address** under your Wi-Fi adapter (e.g., `192.168.1.10`).

### Step 2: Seed the database

The backend must have the `DEVICE_ID`, `TRAINEE_ID`, and `SESSION_ID` before the ESP32 can post readings:

```bash
# From the project root — backend must be running first!
python firmware/setup_test_session.py
```

### Step 3: Start FastAPI bound to all interfaces

```powershell
cd backend
..\.venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Step 4: Flash the ESP32

- Select your board in the Arduino IDE (e.g., "DOIT ESP32 DEVKIT V1")
- Compile & upload
- Open Serial Monitor at **115200 baud**

### Step 5: Verify on Dashboard

Open the frontend at `http://localhost:5173/devices`. You should see `WR-ESP32` with an **Online** connectivity badge that updates in real time.

---

## Expected Serial Monitor Output

### Normal Boot
```
================================
SIH ESP32 HARDENED DEVICE
================================
Device: WR-ESP32
Type: wearable
Firmware: 0.2.0
================================

[WIFI] Connecting to MyWifi
..
[WIFI] Connected
[WIFI] IP: 192.168.1.42
[WIFI] RSSI: -52 dBm
```

### Reading Loop
```
[READING SENT]
Value: 20.50
[HTTP] 2xx Success - Telemetry Reading
[MEM] Free heap: 234512
```

### Backend Down
```
[API] Connection failed or timeout - Telemetry Reading
[API] Backend unavailable
[API] Retrying...
```

### Backend Recovers
```
[HTTP] 2xx Success - Telemetry Reading
[API] Backend available
```

### Wi-Fi Lost
```
[WIFI] Connection lost. Reconnecting...
```

### Wi-Fi Recovers
```
[WIFI] Connected
[WIFI] IP: 192.168.1.42
```

---

## HTTP Status Code Handling

| Code | Meaning | ESP32 Behavior |
|---|---|---|
| 2xx | Success | Reading accepted, counter increments |
| 400 | Bad Request | Logged, no retry (data error) |
| 404 | Not Found | Logged, no retry |
| 409 | Conflict | Logged, no retry |
| 422 | Validation Error | Logged, no retry |
| 5xx | Server Error | Logged, `isBackendReachable = false`, retries on next interval |
| Timeout | No response | Logged, `isBackendReachable = false`, retries on next interval |

## Offline Buffering

**Readings generated while the backend is unavailable are NOT buffered locally.**

This is a deliberate decision for Phase 4B. The RAM on the ESP32 is limited and introducing a flash-based queue adds complexity before any real sensors exist. During any backend downtime, readings are simply dropped. When the backend becomes available again, fresh readings resume immediately.

This behavior is clearly documented and not hidden.

## Memory Stability

- `http.end()` is always called after every request to free resources.
- No `String` concatenation in loops other than the single payload build.
- Heap usage is logged with every reading (`[MEM] Free heap: XXXXX`).
