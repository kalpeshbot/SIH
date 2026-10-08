#include "iis3dwb_driver.h"

IIS3DWBDriver::IIS3DWBDriver()
    : _spi(&SPI),
      _spiSettings(SPI_CLOCK_SPEED_HZ, MSBFIRST, SPI_MODE0),
      _cs_pin(PIN_SPI_CS),
      _drdy_pin(PIN_IIS3DWB_DRDY),
      _sensitivity(SENSITIVITY_G_PER_LSB),
      _sample_count(0),
      _error_count(0),
      _initialized(false) {
}

bool IIS3DWBDriver::begin() {
    pinMode(_cs_pin, OUTPUT);
    digitalWrite(_cs_pin, HIGH);

    if (_drdy_pin != 255) {
        pinMode(_drdy_pin, INPUT);
    }

    _spi->begin(PIN_SPI_SCK, PIN_SPI_MISO, PIN_SPI_MOSI, PIN_SPI_CS);
    delay(20); // Power-on wait

    uint8_t who = readWhoAmI();
    if (who != IIS3DWB_WHO_AM_I_VAL) {
        _error_count++;
        _initialized = false;
        return false;
    }

    if (!configure(IIS3DWB_FS_SETTING)) {
        _error_count++;
        _initialized = false;
        return false;
    }

    _initialized = true;
    return true;
}

uint8_t IIS3DWBDriver::readRegister(uint8_t reg) {
    uint8_t value = 0;
    _spi->beginTransaction(_spiSettings);
    digitalWrite(_cs_pin, LOW);
    _spi->transfer(reg | IIS3DWB_SPI_READ_BIT);
    value = _spi->transfer(0x00);
    digitalWrite(_cs_pin, HIGH);
    _spi->endTransaction();
    return value;
}

bool IIS3DWBDriver::readRegisters(uint8_t start_reg, uint8_t *buffer, uint8_t length) {
    if (!buffer || length == 0) return false;
    _spi->beginTransaction(_spiSettings);
    digitalWrite(_cs_pin, LOW);
    _spi->transfer(start_reg | IIS3DWB_SPI_READ_BIT);
    for (uint8_t i = 0; i < length; i++) {
        buffer[i] = _spi->transfer(0x00);
    }
    digitalWrite(_cs_pin, HIGH);
    _spi->endTransaction();
    return true;
}

void IIS3DWBDriver::writeRegister(uint8_t reg, uint8_t value) {
    _spi->beginTransaction(_spiSettings);
    digitalWrite(_cs_pin, LOW);
    _spi->transfer(reg & IIS3DWB_SPI_WRITE_MASK);
    _spi->transfer(value);
    digitalWrite(_cs_pin, HIGH);
    _spi->endTransaction();
}

uint8_t IIS3DWBDriver::readWhoAmI() {
    return readRegister(IIS3DWB_REG_WHO_AM_I);
}

bool IIS3DWBDriver::isConnected() {
    return readWhoAmI() == IIS3DWB_WHO_AM_I_VAL;
}

bool IIS3DWBDriver::configure(uint8_t full_scale_setting) {
    // 1. Software reset
    writeRegister(IIS3DWB_REG_CTRL3_C, 0x01); // SW_RESET
    delay(10);

    // 2. Block Data Update (BDU = 1) + Automatic Register Increment (IF_INC = 1)
    // CTRL3_C: BDU(bit 6) = 1, IF_INC(bit 2) = 1 -> 0x44
    writeRegister(IIS3DWB_REG_CTRL3_C, 0x44);

    // 3. Configure Accelerometer: CTRL1_XL
    // Bit[7:5]: XL_EN / ODR_XL = 26.667 kHz active (0xA0 or standard active mode)
    // Bit[3:2]: FS_XL (00 = +/-2g, 02 = +/-4g, 03 = +/-8g, 01 = +/-16g)
    uint8_t ctrl1_val = 0xA0 | ((full_scale_setting & 0x03) << 2);
    writeRegister(IIS3DWB_REG_CTRL1_XL, ctrl1_val);

    // Set sensitivity according to full-scale
    switch (full_scale_setting) {
        case 0x00: _sensitivity = 0.000061f; break; // +/-2g
        case 0x02: _sensitivity = 0.000122f; break; // +/-4g
        case 0x03: _sensitivity = 0.000244f; break; // +/-8g
        case 0x01: _sensitivity = 0.000488f; break; // +/-16g
        default:   _sensitivity = SENSITIVITY_G_PER_LSB; break;
    }

    // 4. Route Data-Ready (DRDY_XL) to INT1 (INT1_CTRL bit 0 = 1)
    writeRegister(IIS3DWB_REG_INT1_CTRL, 0x01);

    // Verify configuration write
    uint8_t read_back = readRegister(IIS3DWB_REG_CTRL1_XL);
    return (read_back == ctrl1_val);
}

bool IIS3DWBDriver::isDataReady() {
    // Read STATUS_REG bit 0 (XLDA: Accelerometer new data available)
    uint8_t status = readRegister(IIS3DWB_REG_STATUS_REG);
    return (status & 0x01) != 0;
}

bool IIS3DWBDriver::readRawAcceleration(int16_t &raw_x, int16_t &raw_y, int16_t &raw_z) {
    uint8_t raw_data[6];
    if (!readRegisters(IIS3DWB_REG_OUTX_L_A, raw_data, 6)) {
        _error_count++;
        return false;
    }

    raw_x = (int16_t)(raw_data[0] | (raw_data[1] << 8));
    raw_y = (int16_t)(raw_data[2] | (raw_data[3] << 8));
    raw_z = (int16_t)(raw_data[4] | (raw_data[5] << 8));
    return true;
}

bool IIS3DWBDriver::readSample(IIS3DWBSample &sample) {
    int16_t rx, ry, rz;
    if (!readRawAcceleration(rx, ry, rz)) {
        sample.valid = false;
        return false;
    }

    sample.x = (float)rx * _sensitivity;
    sample.y = (float)ry * _sensitivity;
    sample.z = (float)rz * _sensitivity;
    sample.timestamp_us = micros();
    sample.sequence_num = ++_sample_count;
    sample.valid = true;
    return true;
}
