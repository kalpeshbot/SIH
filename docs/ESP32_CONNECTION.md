# ESP32 Connection Architecture (Phase 4B)

This document describes the networking and data pipeline connecting physical ESP32 devices to the FastAPI backend. It covers Phase 4A (initial connection) and Phase 4B (hardened, resilient communication).

---

## 1. Network Architecture

This is a local LAN prototype. The ESP32 and the PC running the backend must be on the same network.

```
PC running FastAPI (e.g., 192.168.1.10)
        |
        |  Wi-Fi / LAN
        |
      Router
        |
        |  Wi-Fi (2.4 GHz only)
        |
      ESP32 (WR-ESP32)
```

### Critical Networking Rules

1. **No `localhost` on ESP32.** The ESP32 is a separate device. `localhost` from the ESP32's perspective points to itself. Always use the PC's LAN IPv4 address.
2. **Bind FastAPI to `0.0.0.0`.** Uvicorn by default only listens on loopback. Start with:
   ```
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
3. **Windows Firewall.** Allow incoming connections to TCP port 8000 on Private Networks. Python.exe must be allowed through the firewall.
4. **2.4 GHz Wi-Fi only.** The ESP32 does not support 5 GHz or 6 GHz Wi-Fi bands.

---

## 2. API Communication

The ESP32 uses standard HTTP/1.1 JSON over Wi-Fi. No WebSockets, MQTT, or cloud relay.

### 2.1 Boot Health Check
`GET /health`

Called once on boot to verify the backend is reachable before the main loop begins.

### 2.2 Heartbeat (Phase 4B)
`POST /api/devices/{device_id}/heartbeat`

Called every `HEARTBEAT_INTERVAL_MS` (default: 15 seconds). Updates `last_seen` timestamp in the database. This is how the dashboard determines whether a device is currently active.

**Response:**
```json
{"status": "ok"}
```

**Backend behavior:** Returns `404` if the `device_id` is not registered in the database. The ESP32 logs the error but does not crash.

### 2.3 Sensor Reading Ingestion
`POST /api/readings`

**Phase 4B payload (no sensors, dummy test_signal):**
```json
{
  "session_id": "SESS-ESP32",
  "device_id": "WR-ESP32",
  "sensor_type": "test_signal",
  "value": 25.5,
  "unit": "units",
  "status": "NORMAL"
}
```

**Timestamp:** Omitted intentionally. The backend falls back to server-side UTC (`datetime.now(timezone.utc)`). This removes the need for an RTC module on the ESP32 prototype.

**Side effects:** Each successful reading automatically updates the device's `last_seen` timestamp in the database.

---

## 3. Phase 4B: Resilience & Recovery Behavior

### 3.1 Wi-Fi Connection State Machine

```
BOOT
 -> connectWiFi() (blocking, max 10 attempts)
      |
      +-- Success -> Loop begins
      |
      +-- Failure -> Loop begins, will retry via WIFI_RETRY_INTERVAL_MS

LOOP (non-blocking)
 -> WiFi.status() != WL_CONNECTED ?
      -> Wait WIFI_RETRY_INTERVAL_MS, then WiFi.reconnect()
      -> return early (no HTTP while offline)
 -> WiFi connected -> proceed to heartbeat / reading
```

**Serial output on Wi-Fi loss:**
```
[WIFI] Connection lost. Reconnecting...
```

**Serial output on recovery:**
```
[WIFI] Connected
[WIFI] IP: 192.168.1.42
```

### 3.2 Backend Unavailability

```
Backend DOWN:
  sendReading() -> HTTPClient returns error / timeout
  -> handleApiResponse() logs failure
  -> isBackendReachable = false
  -> "[API] Backend unavailable"
  -> ESP32 continues loop, retries at next READING_INTERVAL_MS

Backend UP again:
  sendReading() -> 201 Created
  -> isBackendReachable = true
  -> "[API] Backend available"
  -> Reading transmission resumes automatically
```

**No manual ESP32 reset required.**

### 3.3 HTTP Timeout

The `HTTPClient.setTimeout(HTTP_TIMEOUT_MS)` is set to 5 seconds. If the backend does not respond within 5 seconds, the request times out, logs `[HTTP] Timeout`, and returns control to the main loop.

### 3.4 HTTP Status Code Handling

| Code Range | Behavior |
|---|---|
| 2xx | Success. Reading accepted. |
| 400 | Bad Request. Logged. No automatic retry (data error — retry won't fix it). |
| 404 | Not Found. Logged. No retry (device or session not registered). |
| 409 | Conflict. Logged. No retry (state/data issue). |
| 422 | Validation Error. Logged. No retry (schema mismatch). |
| 5xx | Server Error. Logged. `isBackendReachable = false`. Retries on next interval. |
| Timeout / connection refused | Logged. `isBackendReachable = false`. Retries on next interval. |

### 3.5 Retry Policy

- **Transient failures (5xx, timeout, connection error):** The ESP32 retries naturally on the next `READING_INTERVAL_MS` timer expiry. There is no exponential backoff in this prototype phase — the interval is already conservative (5s default).
- **Permanent failures (4xx):** No retry. The issue is in the request or state, not the network. Logged clearly.
- **Anti-spam:** The `isBackendReachable` flag prevents the ESP32 from flooding the serial monitor with repeated "backend unavailable" messages when it is already known to be down.

---

## 4. Device Identity & Last Seen

### 4.1 last_seen Field

The `Device` model now has a `last_seen: Optional[datetime]` field.

This field is updated:
- On every `POST /api/readings` (device sent telemetry)
- On every `POST /api/devices/{id}/heartbeat` (device explicitly checked in)
- On every `PATCH /api/devices/{id}` (manual admin update)

`last_seen = null` means the device has never communicated.

### 4.2 Connectivity Status (Frontend-Derived)

The dashboard derives connectivity from `last_seen` using this logic:

| Status | Condition |
|---|---|
| **Online** | `last_seen` within the last 30 seconds |
| **Recent** | `last_seen` within the last 5 minutes |
| **Offline** | `last_seen` more than 5 minutes ago |
| **Never seen** | `last_seen` is null |

This is computed from backend data refreshed every 10 seconds. The frontend does not manufacture or infer device status independently.

---

## 5. Offline Buffering

**Readings generated while the backend is unavailable are NOT buffered locally.**

This is intentional for Phase 4B. Key reasons:
- No RTC module: timestamps would be unreliable without NTP or hardware clock.
- RAM is limited: an unbounded buffer would destabilize the ESP32 during extended outages.
- SQLite integrity: the backend validates all FKs — stale buffered readings from a long outage could fail validation.

When the backend recovers, fresh real-time readings resume immediately. The gap during downtime is simply lost. This behavior is acceptable for this prototype stage and is clearly documented rather than hidden.

---

## 6. Memory Safety

- `http.end()` is called after every request (both heartbeat and reading) to release TCP sockets and HTTP client resources.
- Heap usage is logged alongside each reading: `[MEM] Free heap: XXXXX`
- No ArduinoJson is used: payload is a simple string built once per request.
- No global `String` objects grow over time.

---

## 7. Phase 4B Test Matrix

| Test | Procedure | Expected Result |
|---|---|---|
| T1: Normal Boot | Flash ESP32, open serial monitor | Boot message with Device ID, Type, Firmware version printed |
| T2: Wi-Fi Connection | SSID/password correct | `[WIFI] Connected` + IP address printed |
| T3: Backend Health | Backend running on 0.0.0.0 | `[HTTP] 2xx Success - Heartbeat` printed |
| T4: Reading POST | Normal operation | `[READING SENT]` + `201` response |
| T5: Repeated Readings | Let run for 5 minutes | Stable heap, no crashes, readings visible on dashboard |
| T6: Backend Stopped | Kill uvicorn while ESP32 running | `[API] Backend unavailable` logged, ESP32 stays alive |
| T7: Backend Restarted | Restart uvicorn after T6 | ESP32 automatically resumes, `[API] Backend available` logged |
| T8: Wi-Fi Lost | Disconnect from Wi-Fi or disable AP | `[WIFI] Connection lost. Reconnecting...` logged |
| T9: Wi-Fi Restored | Re-enable AP after T8 | Wi-Fi reconnects, readings resume, no reboot |
| T10: HTTP Timeout | Set artificially low timeout or block port | `[HTTP]` timeout logged, no crash |
| T11: HTTP 4xx | Send reading with wrong session_id | `[HTTP] 4xx Client Error` logged, no infinite retry |
| T12: HTTP 5xx | Backend returns 500 | `[HTTP] 5xx Server Error` logged, retry on next interval |
| T13: Long Run (30+ min) | Let run continuously | Heap stable, reading count increments, dashboard live |
| T14: Dashboard | Navigate to /devices | WR-ESP32 shows Online badge, Last Seen updates live |

---

## 8. Troubleshooting

### ESP32 prints `[WIFI] Connecting` indefinitely
- Verify SSID and password are correct.
- Confirm the router is broadcasting 2.4 GHz (not 5 GHz only).

### ESP32 connects to Wi-Fi but `[API] Connection failed`
1. Run `ipconfig` in Windows terminal. Note the IPv4 address for your Wi-Fi adapter.
2. Confirm `BACKEND_URL` in firmware matches (e.g., `http://192.168.1.10:8000`).
3. Confirm Uvicorn is running with `--host 0.0.0.0`.
4. Check Windows Defender Firewall: allow Python on private networks.

### `[HTTP] 400 Bad Request`
- The `device_id` or `session_id` does not exist in the database.
- Run `python firmware/setup_test_session.py` to seed the database.

### `[HTTP] 422 Unprocessable Entity`
- The JSON payload is malformed or a required field has a wrong type.
- Check that `DEVICE_ID` and `SESSION_ID` match exactly what was seeded.

### Dashboard shows "Never seen" for WR-ESP32
- The ESP32 has never successfully posted a reading or heartbeat.
- Check serial monitor for errors.
- Confirm the backend is binding to `0.0.0.0`.
