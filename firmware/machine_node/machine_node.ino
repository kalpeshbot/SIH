#include <Arduino.h>
#include "config.h"
#include "iis3dwb_driver.h"
#include "vibration_features.h"
#include "sensor_health.h"
#include "telemetry.h"

// =============================================================================
// MORD PHASE 14: MACHINE NODE MAIN FIRMWARE (ESP32-S3 + IIS3DWB)
// =============================================================================

IIS3DWBDriver sensorDriver;
VibrationFeatureExtractor featureExtractor(FEATURE_WINDOW_SAMPLES);
SensorHealthMonitor healthMonitor(SENSOR_WARMUP_MS);
TelemetryClient telemetryClient;

// --- Interrupt Handling (DRDY) ---
volatile bool drdyFlag = false;
volatile uint32_t drdyInterruptCount = 0;

void IRAM_ATTR onIIS3DWBDataReady() {
    drdyFlag = true;
    drdyInterruptCount++;
}

// --- Application State ---
unsigned long lastHeartbeatTime = 0;
unsigned long lastTelemetryTime = 0;
unsigned long lastDiagnosticTime = 0;
uint32_t lastSampleTimeMs = 0;

VibrationFeatureWindow latestWindow;
bool sensorDetected = false;
char currentSessionId[64] = DEFAULT_SESSION_ID;

// =============================================================================
// SETUP
// =============================================================================
void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n==================================================");
    Serial.println("[MORD] MACHINE NODE INITIALIZATION (PHASE 14)");
    Serial.println("==================================================");
    Serial.printf("[BOOT] Firmware Version: %s\n", FIRMWARE_VERSION);
    Serial.printf("[CONFIG] Device ID: %s | Type: %s\n", DEVICE_ID, DEVICE_TYPE);
    Serial.printf("[CONFIG] Machine ID: %s | State: %s\n", MACHINE_ID, MACHINE_STATE);
    Serial.printf("[CONFIG] Default Session: %s\n", currentSessionId);
    Serial.printf("[CONFIG] Backend Target: %s\n", BACKEND_URL);

    // 1. Initialize SPI & IIS3DWB
    Serial.printf("[SPI] Initializing FSPI (SCK:%d, MISO:%d, MOSI:%d, CS:%d)...\n",
                  PIN_SPI_SCK, PIN_SPI_MISO, PIN_SPI_MOSI, PIN_SPI_CS);
    
    sensorDetected = sensorDriver.begin();
    if (sensorDetected) {
        uint8_t who = sensorDriver.readWhoAmI();
        Serial.printf("[IIS3DWB] Sensor Detected! WHO_AM_I = 0x%02X (Expected: 0x7B)\n", who);
        Serial.printf("[IIS3DWB] Range: +/-2g | Target ODR: %.0f Hz\n", EXPECTED_ODR_HZ);
    } else {
        Serial.println("[IIS3DWB] ERROR: IIS3DWB sensor NOT detected on SPI bus!");
        Serial.println("[IIS3DWB] Check wiring: 3.3V, GND, SCK, MISO, MOSI, CS.");
    }

    // 2. Configure DRDY Interrupt
    if (sensorDetected && PIN_IIS3DWB_DRDY != 255) {
        pinMode(PIN_IIS3DWB_DRDY, INPUT);
        attachInterrupt(digitalPinToInterrupt(PIN_IIS3DWB_DRDY), onIIS3DWBDataReady, RISING);
        Serial.printf("[DRDY] Hardware interrupt attached on GPIO %d\n", PIN_IIS3DWB_DRDY);
    }

    // 3. Initialize Health Monitor
    healthMonitor.begin();
    Serial.printf("[HEALTH] State: %s (%s)\n", healthMonitor.getHealthStateString(), healthMonitor.getHealthReason());

    // 4. Initialize Network
    telemetryClient.begin();

    Serial.println("==================================================");
    Serial.println("[MORD] System ready. Serial commands available:");
    Serial.println("  't' : Print current acceleration reading");
    Serial.println("  'f' : Print latest feature extraction window");
    Serial.println("  's' : Print machine node health and telemetry status");
    Serial.println("==================================================\n");
}

// =============================================================================
// MAIN LOOP (Non-blocking Acquisition & Processing)
// =============================================================================
void loop() {
    unsigned long currentMillis = millis();

    // 1. Process Data-Ready Acquisition (Triggered by ISR or Polling Fallback)
    bool sampleReady = drdyFlag;
    if (sampleReady) {
        drdyFlag = false;
    } else if (sensorDetected && sensorDriver.isDataReady()) {
        sampleReady = true;
    }

    if (sampleReady && sensorDetected) {
        IIS3DWBSample sample;
        if (sensorDriver.readSample(sample)) {
            lastSampleTimeMs = currentMillis;
            if (featureExtractor.addSample(sample)) {
                // Feature window filled, extract features
                featureExtractor.computeFeatures(latestWindow);
            }
        }
    }

    // 2. Evaluate Sensor Health
    healthMonitor.evaluate(sensorDetected, latestWindow, lastSampleTimeMs);

    // 3. Network Maintenance (Non-blocking reconnect)
    telemetryClient.updateWiFi();

    // 4. Periodic Heartbeat Transmission
    if (currentMillis - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS) {
        lastHeartbeatTime = currentMillis;
        telemetryClient.sendHeartbeat(100);
    }

    // 5. Periodic Feature Telemetry Transmission
    if (currentMillis - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
        lastTelemetryTime = currentMillis;
        if (latestWindow.valid) {
            telemetryClient.sendFeatureTelemetry(
                currentSessionId,
                latestWindow,
                healthMonitor.getHealthStateString(),
                MACHINE_STATE
            );
        }
    }

    // 6. Periodic Diagnostic Log Output (Every 5 seconds)
    if (currentMillis - lastDiagnosticTime >= 5000) {
        lastDiagnosticTime = currentMillis;
        Serial.printf("[DIAG] Samples: %u | ODR: %.1f Hz | Health: %s | RMS: %.3fg | FreeHeap: %u B\n",
                      sensorDriver.getSampleCount(),
                      latestWindow.measured_odr_hz,
                      healthMonitor.getHealthStateString(),
                      latestWindow.vector_rms,
                      ESP.getFreeHeap());
    }

    // 7. Interactive Serial Test Commands
    if (Serial.available() > 0) {
        char cmd = (char)Serial.read();
        handleSerialCommand(cmd);
    }
}

// =============================================================================
// SERIAL TEST COMMAND HANDLER
// =============================================================================
void handleSerialCommand(char cmd) {
    switch (cmd) {
        case 't': {
            IIS3DWBSample s;
            if (sensorDriver.readSample(s)) {
                Serial.printf("[SAMPLE] X: %+.4fg | Y: %+.4fg | Z: %+.4fg | Time: %u us\n",
                              s.x, s.y, s.z, s.timestamp_us);
            } else {
                Serial.println("[SAMPLE] Failed to read sensor.");
            }
            break;
        }
        case 'f': {
            if (latestWindow.valid) {
                Serial.println("\n--- LATEST FEATURE WINDOW ---");
                Serial.printf("Vector RMS:      %.4f g\n", latestWindow.vector_rms);
                Serial.printf("Axis X [RMS/Peak]: %.4f g / %.4f g (Crest: %.2f, Kurt: %.2f)\n",
                              latestWindow.x.rms, latestWindow.x.peak, latestWindow.x.crest_factor, latestWindow.x.kurtosis);
                Serial.printf("Axis Y [RMS/Peak]: %.4f g / %.4f g (Crest: %.2f, Kurt: %.2f)\n",
                              latestWindow.y.rms, latestWindow.y.peak, latestWindow.y.crest_factor, latestWindow.y.kurtosis);
                Serial.printf("Axis Z [RMS/Peak]: %.4f g / %.4f g (Crest: %.2f, Kurt: %.2f)\n",
                              latestWindow.z.rms, latestWindow.z.peak, latestWindow.z.crest_factor, latestWindow.z.kurtosis);
                Serial.printf("Band Energy Low/Mid/High: %.4fg / %.4fg / %.4fg (Ratio: %.2f)\n",
                              latestWindow.band_energy_low, latestWindow.band_energy_mid,
                              latestWindow.band_energy_high, latestWindow.band_energy_ratio);
                Serial.printf("RMS Rate of Change: %+.4f g/s | Persistence: %u\n",
                              latestWindow.rms_rate_of_change, latestWindow.persistence_count);
                Serial.printf("Measured ODR:    %.1f Hz (Samples: %u, Duration: %u us)\n",
                              latestWindow.measured_odr_hz, latestWindow.sample_count, latestWindow.window_duration_us);
                Serial.println("-----------------------------\n");
            } else {
                Serial.println("[FEATURES] No feature window completed yet.");
            }
            break;
        }
        case 's': {
            Serial.println("\n--- MACHINE NODE STATUS ---");
            Serial.printf("Device:     %s (%s)\n", DEVICE_ID, DEVICE_TYPE);
            Serial.printf("Machine:    %s (State: %s)\n", MACHINE_ID, MACHINE_STATE);
            Serial.printf("Session:    %s\n", currentSessionId);
            Serial.printf("Sensor:     %s (WHO_AM_I: 0x%02X)\n", 
                          sensorDetected ? "CONNECTED" : "DISCONNECTED", sensorDriver.readWhoAmI());
            Serial.printf("Health:     %s - %s\n", healthMonitor.getHealthStateString(), healthMonitor.getHealthReason());
            Serial.printf("Wi-Fi:      %s (IP: %s)\n", 
                          telemetryClient.isWiFiConnected() ? "CONNECTED" : "DISCONNECTED",
                          WiFi.localIP().toString().c_str());
            Serial.printf("Backend:    %s (Success: %u, Fail: %u)\n",
                          telemetryClient.isBackendReachable() ? "REACHABLE" : "UNREACHABLE",
                          telemetryClient.getHttpSuccessCount(), telemetryClient.getHttpFailureCount());
            Serial.printf("Sample Loss Count: %u | SPI Errors: %u\n",
                          featureExtractor.getSampleLossCount(), sensorDriver.getErrorCount());
            Serial.printf("Free Heap:  %u Bytes\n", ESP.getFreeHeap());
            Serial.println("---------------------------\n");
            break;
        }
        default:
            break;
    }
}
