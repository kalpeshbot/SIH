#ifndef VIBRATION_FEATURES_H
#define VIBRATION_FEATURES_H

#include <Arduino.h>
#include "config.h"
#include "iis3dwb_driver.h"

struct AxisFeatures {
    float min_val;
    float max_val;
    float peak;
    float mean;
    float rms;
    float crest_factor;
    float kurtosis;
};

struct VibrationFeatureWindow {
    AxisFeatures x;
    AxisFeatures y;
    AxisFeatures z;
    float vector_rms;
    
    // Frequency band energy features (prototype 3-band partitioning)
    float band_energy_low;   // 20 - 200 Hz
    float band_energy_mid;   // 200 - 800 Hz
    float band_energy_high;  // 800 - 2000 Hz
    float band_energy_ratio; // High / Low ratio
    
    // Rate of change metrics (g/s)
    float rms_rate_of_change;
    float peak_rate_of_change;

    // Timing & metadata
    uint32_t sample_count;
    uint32_t window_duration_us;
    float measured_odr_hz;
    uint32_t persistence_count;
    bool valid;
};

class VibrationFeatureExtractor {
public:
    VibrationFeatureExtractor(uint16_t window_size = FEATURE_WINDOW_SAMPLES);

    void reset();
    bool addSample(const IIS3DWBSample &sample);
    bool isWindowReady() const;
    bool computeFeatures(VibrationFeatureWindow &features);

    // Timing and ODR metrics
    float getMeasuredODR() const { return _measured_odr; }
    uint32_t getSampleLossCount() const { return _sample_loss_count; }

private:
    void computeAxisStatistics(const float *buffer, uint16_t count, AxisFeatures &out);

    uint16_t _window_size;
    uint16_t _sample_index;
    
    // Fixed-size sample buffers to avoid heap fragmentation
    float _buf_x[FEATURE_WINDOW_SAMPLES];
    float _buf_y[FEATURE_WINDOW_SAMPLES];
    float _buf_z[FEATURE_WINDOW_SAMPLES];
    
    uint32_t _window_start_us;
    uint32_t _window_end_us;
    uint32_t _prev_sample_seq;
    uint32_t _sample_loss_count;
    
    float _measured_odr;
    float _prev_vector_rms;
    float _prev_peak;
    uint32_t _prev_window_time_ms;
    uint32_t _persistence_counter;
};

#endif // VIBRATION_FEATURES_H
