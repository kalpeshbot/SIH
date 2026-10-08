# MORD Machine Node Firmware (Phase 14)

**Hardware Platform:** ESP32-S3 DevKitC + STMicroelectronics IIS3DWB 3-Axis Digital Vibration Sensor (Hardware SPI)  
**Firmware Version:** `0.3.0`  
**Device Class:** `MACHINE_NODE`  

> **Safety Disclaimer**: Prototype only. Sensor readings and alerts are intended for demonstration and training support. This system is **not a certified safety device or certified condition-monitoring instrument** and must not replace established workshop safety procedures.

---

## 1. Overview
The **MORD Machine Node** is a fixed edge acquisition node designed to be mounted on industrial machinery (lathes, CNC mills, pumps, or pipe fixtures). It samples high-bandwidth 3-axis vibration data over hardware SPI, validates sensor health and sample timing, extracts time- and frequency-domain signal features, and transmits compact feature telemetry to the local MORD backend via HTTP.

---

## 2. Hardware Architecture & Pinout

```text
+-------------------+                      +-----------------------+
|    ESP32-S3       |                      |   ST IIS3DWB Sensor   |
|                   |                      |                       |
|              3.3V |--------------------->| VDD / VDD_IO          |
|               GND |--------------------->| GND                   |
|     GPIO 10 (CS)  |--------------------->| CS                    |
|     GPIO 12 (SCK) |--------------------->| SCL / SPC (SPI SCK)   |
|     GPIO 11 (MOSI)|--------------------->| SDA / SDI (SPI MOSI)  |
|     GPIO 13 (MISO)|<---------------------| SDO / SA0 (SPI MISO)  |
|     GPIO 14 (INT1)|<---------------------| INT1 (DRDY)           |
+-------------------+                      +-----------------------+
```

---

## 3. Signal Processing & Feature Extraction Chain

1. **Hardware SPI Acquisition**: Reads 16-bit raw X, Y, Z acceleration data from IIS3DWB registers `0x28`–`0x2D`.
2. **Timing & ODR Measurement**: Computes real-time Output Data Rate (`ODR = (samples - 1) / duration_sec`) using microsecond hardware timestamps.
3. **Statistical Features**:
   - **Peak Absolute Amplitude** ($g$)
   - **Root Mean Square (RMS)** ($g$)
   - **Crest Factor** ($\text{Peak} / \text{RMS}$)
   - **Kurtosis** (4th statistical moment)
   - **Vector RMS** ($\sqrt{(RMS_x^2 + RMS_y^2 + RMS_z^2) / 3}$)
4. **Frequency Band Energy Approximations**:
   - `BAND_LOW` (20–200 Hz)
   - `BAND_MID` (200–800 Hz)
   - `BAND_HIGH` (800–2000 Hz)
   - `BAND_RATIO` (High / Low energy ratio)
5. **Rate of Change & Persistence**:
   - Computes $\Delta \text{RMS} / \Delta t$ ($g/\text{s}$).
   - Tracks consecutive window persistence when thresholds are exceeded.
6. **Sensor Health Assessment**:
   - Detects `WARMING_UP` (initial 3s stabilization), `SATURATED` ($>1.95g$), `UNRELIABLE` (stuck/frozen signal or large ODR drift), `DISCONNECTED`, and `OK`.

---

## 4. Configuration (`config.h`)

Key parameters in `config.h`:
- `DEVICE_ID`: Device identifier in MORD database (`"MN-LATHE-01"`).
- `DEVICE_TYPE`: `"MACHINE_NODE"`.
- `MACHINE_ID`: Associated tool (`"LATHE-01"`).
- `MACHINE_STATE`: `"ACTIVE"`, `"IDLE"`, `"STARTUP"`, `"COOLDOWN"`, `"MAINTENANCE"`.
- `WIFI_SSID` / `WIFI_PASSWORD`: Local network credentials.
- `BACKEND_URL`: URL of the FastAPI server (e.g. `http://192.168.1.100:8000`).
- `FEATURE_WINDOW_SAMPLES`: 256 samples per feature calculation window.
- `TELEMETRY_INTERVAL_MS`: 2000 ms.

---

## 5. Serial Diagnostics & Interactive Commands

Baud rate: `115200`

### Boot Log Example:
```text
[MORD] MACHINE NODE INITIALIZATION (PHASE 14)
[BOOT] Firmware Version: 0.3.0
[CONFIG] Device ID: MN-LATHE-01 | Type: MACHINE_NODE
[CONFIG] Machine ID: LATHE-01 | State: ACTIVE
[SPI] Initializing FSPI (SCK:12, MISO:13, MOSI:11, CS:10)...
[IIS3DWB] Sensor Detected! WHO_AM_I = 0x7B (Expected: 0x7B)
[IIS3DWB] Range: +/-2g | Target ODR: 26667 Hz
[DRDY] Hardware interrupt attached on GPIO 14
[HEALTH] State: WARMING_UP (Sensor warming up)
[WIFI] Connecting to SSID: ...
[WIFI] Connected! Local IP: 192.168.1.125
```

### Serial Commands:
- Type **`t`**: Print single raw acceleration sample ($X, Y, Z, t$).
- Type **`f`**: Print complete feature extraction metrics for the latest window.
- Type **`s`**: Print comprehensive device health, ODR, and Wi-Fi/HTTP statistics.

---

## 6. Known Limitations
- Firmware computes time-domain statistical approximations and rate-of-change metrics; full frequency-domain spectral analysis is performed during detailed laboratory calibration.
- Vibration anomaly detection depends on machine-specific baselines (`MachineBaseline`); the node reports signal features and does not declare mechanical failure diagnoses.
