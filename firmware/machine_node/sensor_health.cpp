#include "sensor_health.h"
#include <string.h>
#include <math.h>

SensorHealthMonitor::SensorHealthMonitor(uint32_t warmup_ms)
    : _boot_time_ms(0),
      _warmup_duration_ms(warmup_ms),
      _current_state(HEALTH_UNKNOWN),
      _stagnant_sample_count(0),
      _last_rms(0.0f) {
    strncpy(_reason, "Sensor health initialized", sizeof(_reason));
}

void SensorHealthMonitor::begin() {
    _boot_time_ms = millis();
    _current_state = HEALTH_WARMING_UP;
    snprintf(_reason, sizeof(_reason), "Sensor warming up (duration %u ms)", (unsigned int)_warmup_duration_ms);
}

SensorHealthState SensorHealthMonitor::evaluate(
    bool sensor_connected,
    const VibrationFeatureWindow &window,
    uint32_t last_sample_time_ms
) {
    uint32_t now = millis();

    // 1. Connection check
    if (!sensor_connected) {
        _current_state = HEALTH_DISCONNECTED;
        strncpy(_reason, "IIS3DWB sensor disconnected or SPI response invalid", sizeof(_reason));
        return _current_state;
    }

    // 2. Acquisition timeout / Stale check (> 3000ms without new samples)
    if (last_sample_time_ms > 0 && (now - last_sample_time_ms) > 3000) {
        _current_state = HEALTH_STALE;
        snprintf(_reason, sizeof(_reason), "Acquisition timeout: %u ms elapsed since last sample", (unsigned int)(now - last_sample_time_ms));
        return _current_state;
    }

    // 3. Warm-up duration check
    if ((now - _boot_time_ms) < _warmup_duration_ms) {
        _current_state = HEALTH_WARMING_UP;
        snprintf(_reason, sizeof(_reason), "Sensor stabilizing: %u / %u ms", 
                 (unsigned int)(now - _boot_time_ms), (unsigned int)_warmup_duration_ms);
        return _current_state;
    }

    // 4. Saturation / Clipping check
    float max_peak = fmaxf(window.x.peak, fmaxf(window.y.peak, window.z.peak));
    if (max_peak >= SATURATION_THRESHOLD_G) {
        _current_state = HEALTH_SATURATED;
        snprintf(_reason, sizeof(_reason), "Sensor saturated: peak %.3fg exceeds threshold %.3fg", 
                 max_peak, SATURATION_THRESHOLD_G);
        return _current_state;
    }

    // 5. Signal stagnation / frozen sensor detection
    if (fabsf(window.vector_rms - _last_rms) < 0.00005f) {
        _stagnant_sample_count++;
        if (_stagnant_sample_count > STAGNATION_MAX_SAMPLES) {
            _current_state = HEALTH_UNRELIABLE;
            strncpy(_reason, "Signal stagnation: constant output detected across multiple windows", sizeof(_reason));
            return _current_state;
        }
    } else {
        _stagnant_sample_count = 0;
    }
    _last_rms = window.vector_rms;

    // 6. ODR deviation check (> 20% error indicates timing disruption)
    if (window.measured_odr_hz > 0.0f) {
        float odr_error_pct = fabsf(window.measured_odr_hz - EXPECTED_ODR_HZ) / EXPECTED_ODR_HZ * 100.0f;
        if (odr_error_pct > 25.0f && window.measured_odr_hz < 100.0f) {
            // Significant sampling timing deviation
            _current_state = HEALTH_UNRELIABLE;
            snprintf(_reason, sizeof(_reason), "ODR timing deviation: measured %.1f Hz vs expected %.1f Hz",
                     window.measured_odr_hz, EXPECTED_ODR_HZ);
            return _current_state;
        }
    }

    // 7. Normal operational state
    _current_state = HEALTH_OK;
    strncpy(_reason, "Sensor operational within valid electrical and dynamic bounds", sizeof(_reason));
    return _current_state;
}

const char* SensorHealthMonitor::getHealthStateString() const {
    switch (_current_state) {
        case HEALTH_OK:           return "OK";
        case HEALTH_WARMING_UP:   return "WARMING_UP";
        case HEALTH_UNRELIABLE:   return "UNRELIABLE";
        case HEALTH_SATURATED:    return "SATURATED";
        case HEALTH_DISCONNECTED: return "DISCONNECTED";
        case HEALTH_STALE:        return "STALE";
        default:                  return "UNKNOWN";
    }
}

const char* SensorHealthMonitor::getHealthReason() const {
    return _reason;
}

bool SensorHealthMonitor::isTrustworthy() const {
    return (_current_state == HEALTH_OK);
}
