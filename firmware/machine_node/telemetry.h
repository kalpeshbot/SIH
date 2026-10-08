#ifndef TELEMETRY_H
#define TELEMETRY_H

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include "config.h"
#include "vibration_features.h"
#include "sensor_health.h"

class TelemetryClient {
public:
    TelemetryClient();

    void begin();
    void updateWiFi();
    bool isWiFiConnected() const;

    bool sendHeartbeat(int battery_pct = 100);
    bool sendFeatureTelemetry(
        const char *session_id,
        const VibrationFeatureWindow &window,
        const char *sensor_health_str,
        const char *machine_state_str
    );

    // Diagnostics
    uint32_t getHttpSuccessCount() const { return _http_success_count; }
    uint32_t getHttpFailureCount() const { return _http_failure_count; }
    bool isBackendReachable() const { return _backend_reachable; }

private:
    bool postReading(
        const char *session_id,
        const char *sensor_type,
        float value,
        const char *unit,
        const char *status
    );

    unsigned long _last_wifi_retry_ms;
    uint32_t _http_success_count;
    uint32_t _http_failure_count;
    bool _backend_reachable;
};

#endif // TELEMETRY_H
