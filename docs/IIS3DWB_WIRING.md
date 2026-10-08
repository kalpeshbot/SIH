# IIS3DWB Physical Wiring & Interfacing Guide (Phase 14)

## 1. Overview
The STMicroelectronics **IIS3DWB** is a high-bandwidth, ultra-low-noise 3-axis digital vibration sensor designed for industrial condition monitoring. It interfaces with the **ESP32-S3** microcontroller over a dedicated 4-wire hardware Serial Peripheral Interface (SPI) bus with an active-high Data-Ready (DRDY) interrupt.

---

## 2. Pin Connections Table

| Signal | ESP32-S3 Pin | IIS3DWB Breakout Pin | Direction | Description |
|---|---|---|---|---|
| **VDD** | `3.3V` | `VDD` / `VIN` | Power In | 3.3V DC Power Supply (2.1V–3.6V operating range) |
| **VDD_IO** | `3.3V` | `VDD_IO` | Power In | 3.3V Logic Reference Voltage |
| **GND** | `GND` | `GND` | Power | Common Ground Reference |
| **SPI_CS** | `GPIO 10` | `CS` | Out (ESP32 → Sensor) | Chip Select (Active Low) |
| **SPI_SCK** | `GPIO 12` | `SCL` / `SPC` | Out (ESP32 → Sensor) | Serial Clock (Up to 10 MHz) |
| **SPI_MOSI** | `GPIO 11` | `SDA` / `SDI` | Out (ESP32 → Sensor) | Master Out Slave In (Data to sensor) |
| **SPI_MISO** | `GPIO 13` | `SDO` / `SA0` | In (Sensor → ESP32) | Master In Slave Out (Data from sensor) |
| **DRDY_INT1** | `GPIO 14` | `INT1` | In (Sensor → ESP32) | Hardware Data-Ready Interrupt (Active High) |

> **CAUTION**: The IIS3DWB is a **3.3V maximum** device. Do NOT connect 5.0V power or 5.0V logic signals to the sensor pins as it will cause permanent damage.

---

## 3. Electrical & Signal Considerations

1. **SPI Mode**:
   - **Mode 0**: $\text{CPOL}=0, \text{CPHA}=0$ (Clock idle low, sample on rising edge) or Mode 3 ($\text{CPOL}=1, \text{CPHA}=1$).
   - **Bit Order**: Most Significant Bit (MSB) First.
   - **Clock Speed**: Configured for 5.0 MHz in default firmware for optimal signal integrity across standard jumper wires.

2. **Cable Length & Signal Degradation**:
   - For breadboard and prototyping setups, keep SPI wiring **under 15–20 cm**.
   - Running high-speed SPI over long distances (> 1 m) causes reflections, capacitive loading, and clock jitter. For remote sensing fixtures, mount the ESP32-S3 adjacent to the sensor and transmit processed feature telemetry wirelessly over Wi-Fi or ESP-NOW.

3. **Decoupling Capacitors**:
   - Ensure a $0.1\,\mu\text{F}$ ceramic capacitor is placed as close as possible between `VDD` and `GND`, alongside a $10\,\mu\text{F}$ tantalum or ceramic reservoir capacitor.

---

## 4. Mechanical Mounting Guidelines

1. **Orientation**:
   - Mount the sensor flat against the machine surface. The primary measurement axis (often $Z$ or $X$ depending on mounting block) must align with the primary direction of dynamic mechanical vibration.
2. **Coupling**:
   - Avoid loose double-sided foam tape, which acts as a low-pass mechanical filter and dampens high-frequency vibration signals.
   - Use a rigid mechanical bracket, threaded mounting stud, or strong rare-earth industrial magnetic base for rigid mechanical coupling.
3. **Environmental Protection**:
   - Enclose the ESP32-S3 and sensor breakout in a 3D-printed PETG enclosure with splash protection when operating near machine coolant or oil spray.
