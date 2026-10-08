#ifndef SENSOR_HEALTH_H
#define SENSOR_HEALTH_H

#include <Arduino.h>
#include "config.h"
#include "vibration_features.h"

enum SensorHealthState {
    HEALTH_UNKNOWN,
    HEALTH_WARMING_UP,
    HEALTH_OK,
    HEALTH_UNRELIABLE,
    HEALTH_SATURATED,
    HEALTH_DISCONNECTED,
    HEALTH_STALE
};

class SensorHealthMonitor {
public:
    SensorHealthMonitor(uint32_t warmup_ms = SENSOR_WARMUP_MS);

    void begin();
    SensorHealthState evaluate(
        bool sensor_connected,
        const VibrationFeatureWindow &window,
        uint32_t last_sample_time_ms
    );

    const char* getHealthStateString() const;
    const char* getHealthReason() const;
    bool isTrustworthy() const;

private:
    uint32_t _boot_time_ms;
    uint32_t _warmup_duration_ms;
    SensorHealthState _current_state;
    char _reason[128];
    uint16_t _stagnant_sample_count;
    float _last_rms;
};

#endif // SENSOR_HEALTH_H
