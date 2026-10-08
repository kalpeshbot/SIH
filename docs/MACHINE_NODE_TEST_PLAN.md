# MORD Machine Node Physical Hardware Test Plan (Phase 14)

## Test Objectives
This document defines the 12 concrete hardware verification test procedures for the **MORD Machine Node** (ESP32-S3 + IIS3DWB over hardware SPI).

> **Verification Status**: Physical hardware validation is **PENDING** until the real physical sensor and ESP32-S3 board are wired and verified against these test procedures.

---

## Hardware Test Matrix

### TEST 1 — IIS3DWB Identification & Communication
- **Objective**: Verify SPI initialization and hardware device identification.
- **Procedure**: Power on ESP32-S3 with IIS3DWB connected. Monitor serial at 115200 baud.
- **Pass Criteria**: Serial displays `[IIS3DWB] Sensor Detected! WHO_AM_I = 0x7B (Expected: 0x7B)`.
- **Failure Condition**: `WHO_AM_I = 0x00` or `0xFF` indicates loose SPI wiring or incorrect power.

---

### TEST 2 — Stationary Noise Floor & Zero-G Baseline
- **Objective**: Verify quiescent noise floor and gravity vector on a stable surface.
- **Procedure**: Place sensor flat on stationary desk. Type `t` in serial terminal.
- **Pass Criteria**: Stationary axis vector RMS $\approx 1.00g \pm 0.05g$ (earth gravity); noise standard deviation $< 0.005g$.

---

### TEST 3 — Transient Physical Vibration Response
- **Objective**: Verify dynamic response to physical impulse/tap.
- **Procedure**: Tap surface adjacent to sensor. Type `f` in serial terminal.
- **Pass Criteria**: Peak amplitude spikes ($> 1.5g$), Crest Factor increases ($> 2.5$), and $\Delta \text{RMS}/\Delta t$ reflects rapid transient acceleration.

---

### TEST 4 — Multi-Axis Orthogonal Orientation Response
- **Objective**: Verify independent 3-axis channel measurements.
- **Procedure**: Rotate sensor $90^\circ$ onto X, then Y, then Z axis.
- **Pass Criteria**: Gravity $1.0g$ component shifts correctly between `s.x`, `s.y`, and `s.z` channels.

---

### TEST 5 — Sustained Vibration Window Processing
- **Objective**: Verify rolling window feature extraction under continuous vibration.
- **Procedure**: Place sensor on operating motor or vibrating test bench for 60 seconds.
- **Pass Criteria**: Continuous feature windows logged every 256 samples without buffer stalls.

---

### TEST 6 — Output Data Rate (ODR) Verification
- **Objective**: Measure real acquisition timing and detect clock drift.
- **Procedure**: Observe measured ODR in periodic diagnostic logs `[DIAG] ... ODR: XX.X Hz`.
- **Pass Criteria**: Measured acquisition rate is within $\pm 10\%$ of configured sampling target.

---

### TEST 7 — Sensor Disconnect & Fault Recovery
- **Objective**: Verify sensor health transition upon physical connection failure.
- **Procedure**: Disconnect `MISO` or `CS` jumper wire during live execution.
- **Pass Criteria**: Health state immediately updates to `DISCONNECTED` or `UNRELIABLE`; no firmware crash or infinite loop occurs.

---

### TEST 8 — Backend Offline Resilience
- **Objective**: Verify sensor sampling continues uninterrupted when backend is unreachable.
- **Procedure**: Stop FastAPI backend server.
- **Pass Criteria**: Sensor sampling and feature calculations continue locally; serial reports `Backend: UNREACHABLE`; zero blocking delays in acquisition loop.

---

### TEST 9 — Non-Blocking Wi-Fi Reconnection
- **Objective**: Verify automatic recovery when Wi-Fi connection drops.
- **Procedure**: Disable Wi-Fi access point for 30 seconds, then restore.
- **Pass Criteria**: Machine node logs `[WIFI] Connection lost. Reconnecting...` and resumes telemetry automatically without rebooting.

---

### TEST 10 — Long-Running Heap Memory Stability
- **Objective**: Verify absence of memory leaks during continuous feature computation.
- **Procedure**: Run firmware continuously for $\ge 30$ minutes. Observe `FreeHeap` in `[DIAG]` logs.
- **Pass Criteria**: Free heap memory remains stable within $\pm 200$ bytes after initial startup.

---

### TEST 11 — Active Session Association
- **Objective**: Verify feature telemetry is associated with active training sessions.
- **Procedure**: Start active session `SESS-ESP32` for device `MN-LATHE-01` in Trainer Console.
- **Pass Criteria**: Backend `/api/readings` receives `VIBRATION_RMS` and `VIBRATION_PEAK` entries matched to `SESS-ESP32`.

---

### TEST 12 — Baseline Deviation & Integrity Verification
- **Objective**: Verify the machine node does not fabricate arbitrary baseline deviations.
- **Procedure**: Query `/api/baselines/LATHE-01` when no baseline record exists.
- **Pass Criteria**: System reports baseline unavailable rather than generating synthetic reference values.
