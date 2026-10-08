#ifndef IIS3DWB_DRIVER_H
#define IIS3DWB_DRIVER_H

#include <Arduino.h>
#include <SPI.h>
#include "config.h"

// =============================================================================
// IIS3DWB 3-AXIS DIGITAL VIBRATION SENSOR REGISTER DEFINITIONS (ST DS13309)
// =============================================================================
#define IIS3DWB_REG_PIN_CTRL       0x02
#define IIS3DWB_REG_FIFO_CTRL1     0x07
#define IIS3DWB_REG_FIFO_CTRL2     0x08
#define IIS3DWB_REG_FIFO_CTRL3     0x09
#define IIS3DWB_REG_FIFO_CTRL4     0x0A
#define IIS3DWB_REG_INT1_CTRL      0x0D
#define IIS3DWB_REG_INT2_CTRL      0x0E
#define IIS3DWB_REG_WHO_AM_I       0x0F
#define IIS3DWB_REG_CTRL1_XL       0x10
#define IIS3DWB_REG_CTRL2_G        0x11
#define IIS3DWB_REG_CTRL3_C        0x12
#define IIS3DWB_REG_CTRL4_C        0x13
#define IIS3DWB_REG_CTRL5_C        0x14
#define IIS3DWB_REG_CTRL6_C        0x15
#define IIS3DWB_REG_CTRL7_G        0x16
#define IIS3DWB_REG_CTRL8_XL       0x17
#define IIS3DWB_REG_STATUS_REG     0x1E
#define IIS3DWB_REG_OUT_TEMP_L     0x20
#define IIS3DWB_REG_OUT_TEMP_H     0x21
#define IIS3DWB_REG_OUTX_L_A       0x28
#define IIS3DWB_REG_OUTX_H_A       0x29
#define IIS3DWB_REG_OUTY_L_A       0x2A
#define IIS3DWB_REG_OUTY_H_A       0x2B
#define IIS3DWB_REG_OUTZ_L_A       0x2C
#define IIS3DWB_REG_OUTZ_H_A       0x2D

// Expected WHO_AM_I device identifier
#define IIS3DWB_WHO_AM_I_VAL       0x7B

// SPI Read/Write Bit Flags (Bit 7: 1 for Read, 0 for Write)
#define IIS3DWB_SPI_READ_BIT       0x80
#define IIS3DWB_SPI_WRITE_MASK     0x7F

struct IIS3DWBSample {
    float x; // Acceleration in g
    float y; // Acceleration in g
    float z; // Acceleration in g
    uint32_t timestamp_us;
    uint32_t sequence_num;
    bool valid;
};

class IIS3DWBDriver {
public:
    IIS3DWBDriver();

    bool begin();
    uint8_t readWhoAmI();
    bool isConnected();
    bool configure(uint8_t full_scale_setting = IIS3DWB_FS_SETTING);
    bool readRawAcceleration(int16_t &raw_x, int16_t &raw_y, int16_t &raw_z);
    bool readSample(IIS3DWBSample &sample);
    
    // Status & DRDY helper
    bool isDataReady();
    void enableDrdyInterrupt();

    // Diagnostics
    uint32_t getSampleCount() const { return _sample_count; }
    uint32_t getErrorCount() const { return _error_count; }

private:
    uint8_t readRegister(uint8_t reg);
    bool readRegisters(uint8_t start_reg, uint8_t *buffer, uint8_t length);
    void writeRegister(uint8_t reg, uint8_t value);

    SPIClass *_spi;
    SPISettings _spiSettings;
    uint8_t _cs_pin;
    uint8_t _drdy_pin;
    float _sensitivity;
    uint32_t _sample_count;
    uint32_t _error_count;
    bool _initialized;
};

#endif // IIS3DWB_DRIVER_H
