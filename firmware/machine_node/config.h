#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// =============================================================================
// MORD PHASE 14: MACHINE NODE CONFIGURATION (ESP32-S3 + IIS3DWB)
// =============================================================================

// --- Centralized Device & Machine Identity ---
#define DEVICE_ID           "MN-LATHE-01"
#define DEVICE_TYPE         "MACHINE_NODE"
#define FIRMWARE_VERSION    "0.3.0"
#define MACHINE_ID          "LATHE-01"
#define DEFAULT_SESSION_ID  "SESS-ESP32"

// Machine Operating State: IDLE, STARTUP, ACTIVE, COOLDOWN, MAINTENANCE, UNKNOWN
#define MACHINE_STATE       "ACTIVE"

// --- Network & Backend Configuration ---
#define WIFI_SSID           "YOUR_WIFI_SSID"
#define WIFI_PASSWORD       "YOUR_WIFI_PASSWORD"
#define BACKEND_URL         "http://192.168.1.100:8000"

// --- Hardware SPI Pinout for ESP32-S3 ---
// Standard ESP32-S3 FSPI pins (can be remapped if needed)
#define PIN_SPI_SCK         12
#define PIN_SPI_MISO        13
#define PIN_SPI_MOSI        11
#define PIN_SPI_CS          10
#define PIN_IIS3DWB_DRDY    14 // Connected to IIS3DWB INT1

// SPI Bus Speed (IIS3DWB supports up to 10 MHz SPI)
#define SPI_CLOCK_SPEED_HZ  5000000 // 5 MHz for signal integrity

// --- IIS3DWB Sensor Configuration ---
// Full-Scale: +/-2g, +/-4g, +/-8g, +/-16g
// FS_XL: 0x00 = +/-2g (0.061 mg/LSB), 0x02 = +/-4g, 0x03 = +/-8g, 0x01 = +/-16g
#define IIS3DWB_FS_SETTING  0x00 // +/-2g
#define SENSITIVITY_G_PER_LSB 0.000061f // 0.061 mg/LSB

// Expected Output Data Rate (ODR)
#define EXPECTED_ODR_HZ     26667.0f
#define ODR_TOLERANCE_PCT   5.0f // Allowable ODR deviation before flagging UNRELIABLE

// --- Sampling Window & Feature Extraction Parameters ---
#define FEATURE_WINDOW_SAMPLES  256   // Number of 3-axis samples per feature window
#define TELEMETRY_INTERVAL_MS   2000  // Transmit compact feature window every 2000ms
#define HEARTBEAT_INTERVAL_MS   15000 // Device heartbeat every 15s
#define SENSOR_WARMUP_MS        3000  // 3s sensor stabilization warm-up

// --- Non-blocking Network Timers ---
#define WIFI_RETRY_INTERVAL_MS  10000 // 10s Wi-Fi reconnection retry
#define HTTP_TIMEOUT_MS         4000  // 4s timeout for HTTP requests

// --- Sensor Health Thresholds ---
#define SATURATION_MARGIN_G     0.05f // Saturation threshold: (FullScale - Margin) = 1.95g
#define SATURATION_THRESHOLD_G  (2.0f - SATURATION_MARGIN_G)
#define STAGNATION_MAX_SAMPLES  150   // Consecutive identical samples before flagging UNRELIABLE

// --- Frequency Band Energy Prototype Definitions ---
// Approximate frequency bins for 3-band energy partitioning
#define LOW_BAND_NAME           "BAND_LOW_20_200HZ"
#define MID_BAND_NAME           "BAND_MID_200_800HZ"
#define HIGH_BAND_NAME          "BAND_HIGH_800_2000HZ"

#endif // CONFIG_H
