#include "vibration_features.h"
#include <math.h>

VibrationFeatureExtractor::VibrationFeatureExtractor(uint16_t window_size)
    : _window_size(window_size),
      _sample_index(0),
      _window_start_us(0),
      _window_end_us(0),
      _prev_sample_seq(0),
      _sample_loss_count(0),
      _measured_odr(EXPECTED_ODR_HZ),
      _prev_vector_rms(0.0f),
      _prev_peak(0.0f),
      _prev_window_time_ms(0),
      _persistence_counter(0) {
    reset();
}

void VibrationFeatureExtractor::reset() {
    _sample_index = 0;
    _window_start_us = 0;
    _window_end_us = 0;
}

bool VibrationFeatureExtractor::addSample(const IIS3DWBSample &sample) {
    if (!sample.valid) return false;

    // Detect missing/dropped samples using sequence counter
    if (_prev_sample_seq > 0 && sample.sequence_num > (_prev_sample_seq + 1)) {
        _sample_loss_count += (sample.sequence_num - _prev_sample_seq - 1);
    }
    _prev_sample_seq = sample.sequence_num;

    if (_sample_index == 0) {
        _window_start_us = sample.timestamp_us;
    }

    if (_sample_index < _window_size) {
        _buf_x[_sample_index] = sample.x;
        _buf_y[_sample_index] = sample.y;
        _buf_z[_sample_index] = sample.z;
        _sample_index++;
    }

    if (_sample_index >= _window_size) {
        _window_end_us = sample.timestamp_us;
        return true;
    }

    return false;
}

bool VibrationFeatureExtractor::isWindowReady() const {
    return (_sample_index >= _window_size);
}

void VibrationFeatureExtractor::computeAxisStatistics(const float *buffer, uint16_t count, AxisFeatures &out) {
    if (count == 0 || !buffer) {
        out.min_val = out.max_val = out.peak = out.mean = out.rms = out.crest_factor = out.kurtosis = 0.0f;
        return;
    }

    float sum = 0.0f;
    float sum_sq = 0.0f;
    float min_v = buffer[0];
    float max_v = buffer[0];

    for (uint16_t i = 0; i < count; i++) {
        float val = buffer[i];
        sum += val;
        sum_sq += (val * val);
        if (val < min_v) min_v = val;
        if (val > max_v) max_v = val;
    }

    float mean = sum / (float)count;
    float rms = sqrtf(sum_sq / (float)count);
    float abs_min = fabsf(min_v);
    float abs_max = fabsf(max_v);
    float peak = (abs_max > abs_min) ? abs_max : abs_min;

    // Crest Factor: Peak / RMS (with safety guard)
    float crest_factor = (rms > 1e-6f) ? (peak / rms) : 0.0f;

    // Kurtosis: Fourth moment sum((x - mean)^4) / (N * var^2)
    float variance_sum = 0.0f;
    float fourth_moment_sum = 0.0f;
    for (uint16_t i = 0; i < count; i++) {
        float diff = buffer[i] - mean;
        float diff_sq = diff * diff;
        variance_sum += diff_sq;
        fourth_moment_sum += (diff_sq * diff_sq);
    }

    float variance = variance_sum / (float)count;
    float kurtosis = 3.0f; // Default Gaussian baseline
    if (variance > 1e-6f) {
        kurtosis = (fourth_moment_sum / (float)count) / (variance * variance);
    }

    out.min_val = min_v;
    out.max_val = max_v;
    out.peak = peak;
    out.mean = mean;
    out.rms = rms;
    out.crest_factor = crest_factor;
    out.kurtosis = kurtosis;
}

bool VibrationFeatureExtractor::computeFeatures(VibrationFeatureWindow &features) {
    if (!isWindowReady()) return false;

    // 1. Compute per-axis statistical features
    computeAxisStatistics(_buf_x, _sample_index, features.x);
    computeAxisStatistics(_buf_y, _sample_index, features.y);
    computeAxisStatistics(_buf_z, _sample_index, features.z);

    // 2. Vector RMS = sqrt((RMS_x^2 + RMS_y^2 + RMS_z^2) / 3)
    float sum_rms_sq = (features.x.rms * features.x.rms) +
                       (features.y.rms * features.y.rms) +
                       (features.z.rms * features.z.rms);
    features.vector_rms = sqrtf(sum_rms_sq / 3.0f);

    // 3. Timing and ODR calculation
    uint32_t duration_us = (_window_end_us > _window_start_us) ? (_window_end_us - _window_start_us) : 1;
    features.window_duration_us = duration_us;
    features.sample_count = _sample_index;

    float duration_sec = (float)duration_us / 1000000.0f;
    if (duration_sec > 0.0f) {
        _measured_odr = (float)(_sample_index - 1) / duration_sec;
    }
    features.measured_odr_hz = _measured_odr;

    // 4. Time-domain frequency-band energy approximations (Prototype partitioning)
    // Low band energy (20-200 Hz energy estimate from rolling mean difference)
    // Mid band energy (200-800 Hz)
    // High band energy (800-2000 Hz high frequency ripple)
    float low_energy = 0.0f;
    float high_energy = 0.0f;
    for (uint16_t i = 1; i < _sample_index; i++) {
        float diff_x = _buf_x[i] - _buf_x[i - 1];
        float diff_y = _buf_y[i] - _buf_y[i - 1];
        float diff_z = _buf_z[i] - _buf_z[i - 1];
        high_energy += (diff_x * diff_x + diff_y * diff_y + diff_z * diff_z);
    }
    high_energy = sqrtf(high_energy / (float)(_sample_index - 1));
    low_energy = features.vector_rms;
    float mid_energy = fabsf(features.vector_rms - (high_energy * 0.5f));

    features.band_energy_low = low_energy;
    features.band_energy_mid = mid_energy;
    features.band_energy_high = high_energy;
    features.band_energy_ratio = (low_energy > 1e-6f) ? (high_energy / low_energy) : 0.0f;

    // 5. Rate of Change calculations
    uint32_t now_ms = millis();
    float dt_sec = (_prev_window_time_ms > 0 && now_ms > _prev_window_time_ms) ? 
                   ((float)(now_ms - _prev_window_time_ms) / 1000.0f) : 1.0f;

    features.rms_rate_of_change = (features.vector_rms - _prev_vector_rms) / dt_sec;
    float max_peak = fmaxf(features.x.peak, fmaxf(features.y.peak, features.z.peak));
    features.peak_rate_of_change = (max_peak - _prev_peak) / dt_sec;

    _prev_vector_rms = features.vector_rms;
    _prev_peak = max_peak;
    _prev_window_time_ms = now_ms;

    // 6. Persistence metric
    // If vector RMS exceeds nominal baseline threshold (> 0.8g), increment persistence
    if (features.vector_rms > 0.80f) {
        _persistence_counter++;
    } else {
        _persistence_counter = 0;
    }
    features.persistence_count = _persistence_counter;
    features.valid = true;

    // Reset buffer for next window
    reset();
    return true;
}
