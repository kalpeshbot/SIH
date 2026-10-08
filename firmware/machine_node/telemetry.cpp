#include "telemetry.h"

TelemetryClient::TelemetryClient()
    : _last_wifi_retry_ms(0),
      _http_success_count(0),
      _http_failure_count(0),
      _backend_reachable(false) {
}

void TelemetryClient::begin() {
    Serial.print("[WIFI] Connecting to SSID: ");
    Serial.println(WIFI_SSID);

    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    // Initial non-blocking attempt with brief timeout
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 15) {
        delay(300);
        Serial.print(".");
        attempts++;
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        Serial.print("[WIFI] Connected! Local IP: ");
        Serial.println(WiFi.localIP());
    } else {
        Serial.println("[WIFI] Initial connect pending, will retry in background.");
    }
}

void TelemetryClient::updateWiFi() {
    if (WiFi.status() != WL_CONNECTED) {
        unsigned long now = millis();
        if (now - _last_wifi_retry_ms >= WIFI_RETRY_INTERVAL_MS) {
            _last_wifi_retry_ms = now;
            Serial.println("[WIFI] Reconnecting in background...");
            WiFi.disconnect();
            WiFi.reconnect();
        }
    }
}

bool TelemetryClient::isWiFiConnected() const {
    return (WiFi.status() == WL_CONNECTED);
}

bool TelemetryClient::sendHeartbeat(int battery_pct) {
    if (!isWiFiConnected()) return false;

    HTTPClient http;
    char url[128];
    snprintf(url, sizeof(url), "%s/api/devices/%s/heartbeat", BACKEND_URL, DEVICE_ID);

    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(HTTP_TIMEOUT_MS);

    char payload[128];
    snprintf(payload, sizeof(payload), "{\"battery\":%d,\"status\":\"ONLINE\"}", battery_pct);

    int httpCode = http.POST(payload);
    bool success = (httpCode == 200 || httpCode == 204);

    if (success) {
        _http_success_count++;
        _backend_reachable = true;
    } else {
        _http_failure_count++;
        _backend_reachable = false;
        Serial.printf("[HEARTBEAT] HTTP error: %d\n", httpCode);
    }

    http.end();
    return success;
}

bool TelemetryClient::postReading(
    const char *session_id,
    const char *sensor_type,
    float value,
    const char *unit,
    const char *status
) {
    if (!isWiFiConnected() || !session_id) return false;

    HTTPClient http;
    char url[128];
    snprintf(url, sizeof(url), "%s/api/readings", BACKEND_URL);

    http.begin(url);
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(HTTP_TIMEOUT_MS);

    // Construct JSON payload compliant with backend SensorReadingCreate
    char payload[256];
    snprintf(
        payload, sizeof(payload),
        "{\"session_id\":\"%s\",\"device_id\":\"%s\",\"sensor_type\":\"%s\",\"value\":%.4f,\"unit\":\"%s\",\"status\":\"%s\"}",
        session_id, DEVICE_ID, sensor_type, value, unit, status
    );

    int httpCode = http.POST(payload);
    bool success = (httpCode == 201 || httpCode == 200);

    if (success) {
        _http_success_count++;
        _backend_reachable = true;
    } else {
        _http_failure_count++;
        _backend_reachable = false;
        Serial.printf("[TELEMETRY] POST %s failed (%d)\n", sensor_type, httpCode);
    }

    http.end();
    return success;
}

bool TelemetryClient::sendFeatureTelemetry(
    const char *session_id,
    const VibrationFeatureWindow &window,
    const char *sensor_health_str,
    const char *machine_state_str
) {
    if (!isWiFiConnected()) return false;
    if (!session_id || strlen(session_id) == 0) {
        Serial.println("[TELEMETRY] No active session assigned. Telemetry skipped.");
        return false;
    }

    // Determine status string from vector RMS and sensor health
    const char *reading_status = "NORMAL";
    if (strcmp(sensor_health_str, "OK") != 0) {
        reading_status = sensor_health_str;
    } else if (window.vector_rms > 1.20f) {
        reading_status = "DANGER";
    } else if (window.vector_rms > 0.60f) {
        reading_status = "WARNING";
    }

    // 1. Primary Vector RMS reading
    bool ok1 = postReading(session_id, "VIBRATION_RMS", window.vector_rms, "g", reading_status);

    // 2. Peak Amplitude reading
    float max_peak = fmaxf(window.x.peak, fmaxf(window.y.peak, window.z.peak));
    bool ok2 = postReading(session_id, "VIBRATION_PEAK", max_peak, "g", reading_status);

    // 3. Crest Factor reading
    float max_crest = fmaxf(window.x.crest_factor, fmaxf(window.y.crest_factor, window.z.crest_factor));
    bool ok3 = postReading(session_id, "VIBRATION_CREST_FACTOR", max_crest, "ratio", reading_status);

    // 4. Band Energy Low reading
    bool ok4 = postReading(session_id, "VIBRATION_BAND_LOW", window.band_energy_low, "g", reading_status);

    return (ok1 && ok2 && ok3 && ok4);
}
