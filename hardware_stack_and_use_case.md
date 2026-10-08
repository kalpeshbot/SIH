# Trainee Leak Diagnostic Device: Scope, Sensors and Hardware Stack (v1.2)

**Evidence tags:** [DS] taken from the datasheets supplied by the team (ADXL345 Rev G, IIS3DWB Rev 8, Precision Acoustics PVDF film, Multicomp ABT-441-RC piezo element). [CALC] derived from [DS] numbers by arithmetic. [SIM] from `leak_localisation_sim.py` (model, not measurement). [EST] engineering estimate. [UNV] unverified, must be checked.
**Prices:** indicative estimates only, not live quotes.

## Changelog (v1.1 -> v1.2)
| Change | Reason |
|---|---|
| **Scope cut to water leakage and gas leakage only** | Team decision. Welding, gas cutting and electrical are removed (not deferred). |
| **No physical testing** | No time. Validation is by datasheet analysis, simulation and replay of a public dataset. All performance claims are labelled accordingly. |
| Four sensors analysed from datasheets and added | ADXL345, IIS3DWB, PVDF film, piezo disc |
| **IIS3DWB becomes the primary vibration sensor** | Only sensor with specified noise, bandwidth, sensitivity and timing. Predictable without a bench. |
| PVDF film and piezo disc moved to an optional, unverified channel | Neither datasheet gives a sensitivity figure, so their performance cannot be predicted without testing. |
| New firmware requirement: measure real ODR of every sensor | Simulation shows clock mismatch is the biggest localisation error source. |
| `week1-2_experiment_plan.md` is superseded | It needs a rig. Replaced by Section 9 below. |

---

## 1. Scope

**In scope:** (1) water leak detection and location in pipes, (2) gas pipework leak training (tightness testing and leak tracing without flammable gas).
**Out of scope:** welding, oxy-fuel cutting, electrical maintenance, any claim of certified gas detection.
**Product label:** "Training aid. Not a certified gas detector or safety instrument."

## 2. Use cases and modes

| Mode | Trainee action | Device action | Evidence level |
|---|---|---|---|
| **W1 Pressure-hold (water)** | Pressurise section, hold | Reads pressure, decay rate, pass/fail | Standard practice; detection limit [UNV] |
| **W2 Leak trace (water)** | Slide probe along pipe | Band-energy "hot/cold" bar | Concept from literature; performance [UNV] |
| **W3 Leak locate (water)** | Clamp two sensor nodes, one each side of suspected leak | Cross-correlation position estimate | [SIM] best-case only |
| **G1 Tightness test (gas pipework)** | Pressurise dummy line with **air**, hold, soap-bubble check | Reads pressure decay, logs steps | Standard practice; test pressures per NOS/utility procedure [UNV] |
| **G2 Hiss trace (gas pipework, experimental)** | Slide probe along air-pressurised metal dummy line | Same hot/cold bar from vibration band energy, optional ultrasonic channel | [UNV] no evidence yet; demo only |
| **G3 Real gas** | Uses a separate certified detector | Device only logs that detector's alarm output (if it exposes one) | Safety function stays outside our device |

Feedback policy: concurrent feedback in sessions 1-5, fading to post-session summaries.
Plastic pipe must never be pressurised with air. Gas dummy line is metal (GI or copper).

---

## 3. Datasheet analysis of the four sensors

### 3.1 Verified specifications [DS]
| Parameter | ADXL345 | IIS3DWB | PVDF film (PA) | Piezo disc ABT-441-RC |
|---|---|---|---|---|
| Type | 3-axis MEMS accel | 3-axis MEMS vibration | Piezo polymer film | Brass disc + ceramic (sounder element) |
| Bandwidth | **-3 dB at ODR/2: 1.6 kHz max** (ODR 3.2 kHz) | **DC to 6.3 kHz typ (5 kHz min)** | No thickness resonance in audio band (see 3.3) | Resonance **4.2 kHz +/-0.5 kHz** |
| Noise density (X/Y, Z) | 290, 430 ug/rtHz | **75, 110 ug/rtHz** (60, 80 single-axis) | not specified | not specified |
| Resolution | 3.9 mg/LSB full-res (LSB forced to 0 at 3.2/1.6 kHz ODR) | 0.061 mg/LSB at +/-2 g (16-bit) | n/a | n/a |
| Sensitivity spec | 256 LSB/g +/-10%, +/-1% typ deviation | 0.061 mg/LSB, +/-2% | **none** (only d31 14.5 / 27 pC/N) | **none** |
| Interface | SPI (5 MHz) or I2C | **SPI only recommended** (10 MHz); I2C single-axis, not recommended | analog | analog |
| Supply current | 140 uA (ODR >= 100 Hz) | 1.1 mA typ, 1.3 max | passive | passive |
| Supply voltage | 2.0-3.6 V | 2.1-3.6 V | n/a | n/a |
| Data rate | up to 3200 Hz | **fixed 26,667 Hz (+/-1% typ, +/-2% max)** | n/a | n/a |
| FIFO | 32 samples | 3 KB (7-byte words: tag + 6 data) | n/a | n/a |
| Timestamp | none | **32-bit, 12.5 us/LSB**, can be batched in FIFO | n/a | n/a |
| Temperature range | -40 to +85 C | -40 to +105 C | **max usable 70 C** | **-20 to +60 C** |
| Other | Self-test, DEVID 0xE5 | Self-test, WHO_AM_I 0x7B, on-chip HPF/LPF | 28/40/80/200 um; Au electrodes; sheets 170x180 mm | Capacitance **20 nF +/-30%**, 27 mm, 0.52 mm thick |

### 3.2 Derived numbers [CALC]
| Item | Value | How |
|---|---|---|
| ADXL345 noise over full band | **~12-16 mg rms** | 290 ug x sqrt(1600 Hz) = 11.6 mg; datasheet says noise rises x1.41 per ODR doubling above 100 Hz |
| IIS3DWB noise over 80-600 Hz | **1.7 mg rms** | 75 ug x sqrt(520) |
| ADXL345 noise over 80-600 Hz | **6.6 mg rms** | 290 ug x sqrt(520) |
| Sensitivity gap | **IIS3DWB is 3.9x (11.7 dB) quieter** | 290 / 75 |
| ADXL345 quantisation at 3.2 kHz | **7.8 mg step** | datasheet: LSB always 0 in full-res at 3200/1600 Hz |
| IIS3DWB raw data rate | **~187 kB/s** (26,667 x 7 B) | needs on-device feature extraction, not raw logging |
| IIS3DWB FIFO depth | **~438 samples = 16.4 ms** | 3072 B / 7 B at 26.667 kHz; host must read FIFO >= ~60 times/s |
| ADXL345 over I2C | **max ODR 800 Hz (400 kHz bus)** | datasheet rule; cannot cover a 80-600 Hz band properly, so use SPI |
| Power ratio | IIS3DWB draws ~8x ADXL345 | 1.1 mA vs 0.14 mA; fine for a handheld |
| PVDF capacitance (28 um, 10x10 mm) | **~0.46 nF** | C = e0 er A / t, er = 14.5 at low frequency |
| PVDF capacitance (40 um, 10x10 mm) | **~0.25 nF** | er = 11.4 |
| PVDF amplifier input resistance | **>= 10 Mohm** | f_c = 1/(2 pi R C): 35 Hz at 10 Mohm/0.46 nF; 346 Hz at 1 Mohm (too high) |
| Disc amplifier input resistance | 1 Mohm is enough | 20 nF gives 8 Hz cutoff at 1 Mohm |
| PVDF thickness resonance | 39 MHz (28 um), 5.5 MHz (200 um) | c/2t with c = 2200 m/s; far above any audio/ultrasonic band we digitise |
| PVDF acoustic impedance | ~3.9 MRayl | 1780 kg/m3 x 2200 m/s |
| Cable loading on PVDF | ~18% signal loss with 1 m of ~100 pF/m coax [EST] | capacitive divider with 0.46 nF; keep preamp at the sensor |

### 3.3 What each datasheet means for the design
**IIS3DWB (primary).**
- Factory-trimmed sensitivity, specified noise and bandwidth: performance is calculable without a test rig.
- Built-in filters: either LPF2 (ODR/4 = 5.6 kHz, ODR/10 = 2.7 kHz, ODR/20 = 1.3 kHz) or HPF (ODR/800 = 33 Hz). The composite filter is a switch, so it is one **or** the other, not both. Do the band-pass in firmware.
- Single-axis mode lowers noise to 60 ug/rtHz at the same current. Mount one axis normal to the pipe wall.
- ODR accuracy +/-1% typ means **two sensors will not share a clock**. The datasheet provides `INTERNAL_FREQ_FINE` (0.15% steps) and a DATA_READY-interrupt method to measure true ODR (Section 7.2 of the datasheet). Both are required for correlation.
- Sensor resonance is 6.9-7.0 kHz and the sensor is shock-sensitive (ST warns about handling).
- Mounting: keep it near a hard mounting point, as both ST and ADI advise.

**ADXL345 (budget fallback).**
- Needs SPI >= 2 MHz for 3.2 kHz ODR [DS]; many cheap breakout boards only break out I2C. Check the module before buying.
- Offset +/-150 mg (X/Y) is irrelevant for AC vibration; high-pass in firmware.
- ODR accuracy is not specified in the supplied datasheet [UNV]. Measure it with the DATA_READY interrupt like the IIS3DWB.
- Use +/-2 g range; leak vibration will be tiny.

**PVDF film (optional wideband channel).**
- No thickness resonance in our bands, so a flat response is expected; sensitivity is not given [UNV].
- Stretch-axis matters: d31 = 14.5 pC/N (28 um) or 27 pC/N (40/80 um) versus d32 = 2.2 / 5, a ratio of roughly 5-7:1. Align the stretch axis with the strain direction.
- Raw film with no leads. Solder will not work on PVDF; needs conductive epoxy or a crimp. A pre-leaded part (e.g. TE LDT0-028K) is easier [UNV availability in India].
- Max usable 70 C: do not clamp on hot-water lines.
- Datasheet says values are indicative and not guaranteed.

**Piezo disc ABT-441-RC (baseline only).**
- It is a buzzer element: rated for 30 Vp-p drive, no sensing specification.
- Resonance at 4.2 kHz sits inside the useful band. Low-pass at ~3 kHz so the response stays on the flat side of the resonance.
- 20 nF capacitance is easy to interface (cable loading is not an issue).
- Operating range -20 to +60 C.

### 3.4 Selection decision
| Role | Choice | Why |
|---|---|---|
| Primary water/gas vibration sensor | **IIS3DWB** | Only specified, calibrated, timestamped sensor |
| Budget / second-node option | ADXL345 over SPI | 3.9x noisier, 1.6 kHz limit, no timestamp |
| Optional ultrasonic "hiss" channel (G2, W2 extra) | PVDF film + high-impedance preamp + fast I2S ADC | Only candidate for content above 6 kHz; unverified |
| Demo baseline | Piezo disc | Cheapest; unpredictable response |

---

## 4. System architecture
```
[Probe: IIS3DWB (SPI) + pressure transducer/ADS1115 + wetness strip + optional PVDF channel
        + ESP32-S3]
   -> on-device: band-pass, band energy, pressure-decay slope, ODR measurement
   -> feedback: LED bar + buzzer + grip haptic + OLED
   -> logs locally (LittleFS)
        | ESP-NOW (BLE for pairing/config only)
[Bay gateway: ESP32-S3 receiver -> laptop / Pi / tablet -> SQLite + local web dashboard]
        | batch sync when online
[Optional institute portal]
```
Second node (W3 locate): same board with one sensor, clipped on the pipe. Timing is the hard part, see Section 6.

## 5. Revised hardware list (water and gas leakage only)
| Block | Pick | Approx. Rs | Notes |
|---|---|---|---|
| MCU | ESP32-S3 DevKitC | 700-900 | Hardware SPI/I2S, ESP-NOW |
| **Vibration sensor (primary)** | **IIS3DWB module, SPI** | 700-1,800 [UNV India price] | Two needed for W3 |
| Vibration sensor (budget) | ADXL345 module, SPI pins exposed | 150-500 | Check module exposes CS/SDO/SCLK |
| Optional ultrasonic channel | PVDF film + CMOS/JFET-input preamp (>=10 Mohm bias) + I2S ADC | 500-1,500 [EST] | Not on the critical path |
| Pressure sensor | 0-1.0 MPa, 0.5-4.5 V transducer | 450-800 | Needed for W1 and G1 |
| Pressure ADC | ADS1115 + 2:3 divider | 250-350 | 16-bit |
| Wetness strip | Capacitive or resistive | 20-500 | Confirms external water |
| Feedback | 8-LED bar, 0.96" OLED, 2.7 kHz buzzer, DRV2605L + haptic motor | 600-900 | |
| Power | Protected 18650, USB-C charger, 3.3 V regulator | 250-400 | |
| Enclosure | 3D-printed PETG grip, replaceable contact pad | 300-600 | Splash protection |
| Misc | Switch, connectors, wiring, PCB | ~200 | |

**Prototype total, one probe with IIS3DWB:** roughly Rs 3,500-6,000 [EST].
**Cost warning:** two IIS3DWB nodes plus one MCU is likely to break the Rs 3,000 target. Ship single-probe modes (W1, W2, G1, G2) as the base product and sell the second node as an add-on.

---

## 6. Signal and timing design
| Item | Setting | Basis |
|---|---|---|
| IIS3DWB mode | Single-axis (radial), +/-2 g, ODR 26,667 Hz, FIFO continuous, DRDY on INT1 | [DS] |
| Leak band for features | 80-600 Hz (plastic), 80-2,000 Hz (near-leak and metal) | Literature in earlier review |
| Band energy bins | 20-200, 200-800, 800-1,600, 1.6-6 kHz | Matches earlier recommendation |
| Window | 1 s for correlation, 0.25-0.5 s for trace display | [SIM] shows longer windows help SNR but amplify clock drift |
| ODR handling | At boot, measure true ODR from DRDY timing over >= 10 s; store as per-sensor calibration | [DS] Section 7.2 of IIS3DWB |
| Pre-processing | High-pass 20 Hz, resample B channel to A's clock before correlation | [SIM] |
| Boot self-checks | WHO_AM_I (0x7B), DEVID (0xE5), built-in self-test, measured noise floor vs datasheet density | [DS] |
| Wave speed | Per-pipe lookup with a 3-point user calibration (tap at known distances) | [SIM] shows 10% error costs ~5 cm median |
| Cable/link | Satellite node with its own MCU; sync pulse on a wire; do not run raw SPI over 3 m [EST] | Link bandwidth: single-axis 3-in-1 read mode may help, check ST AN5444 [UNV] |

PVDF/disc channel (if built): preamp with >=10 Mohm bias (PVDF), 3 kHz low-pass for the disc, anti-alias filter at about 40 kHz for ADC rates near 96 kS/s [EST; confirm PCM1808 rate, not in the supplied datasheets].

---

## 7. Simulation results [SIM]
Model: 3 m between sensors, wave speed 400 m/s, leak position random in 0.5-2.5 m, white band-limited leak signal, sensor noise from datasheets, 1 s window, plain cross-correlation with parabolic peak interpolation, 80 trials per cell. **No background noise, attenuation, dispersion or reflections are modelled, so these are best-case values.**

**Detection threshold (leak vibration level at the sensor, 80-600 Hz band)**
| Sensor | Fails at | Works from | Error when working |
|---|---|---|---|
| ADXL345 | 0.5-1 mg rms | **~2-5 mg rms** | < 1 cm (ideal) |
| IIS3DWB | 0.5 mg rms | **~1 mg rms** | < 1 cm (ideal) |
IIS3DWB detects roughly 4x weaker leaks, as predicted by the noise densities.

**Error sources at 10 mg level (IIS3DWB, similar for ADXL345)**
| Source | Median error | P90 error |
|---|---|---|
| Ideal | ~0 cm | 0.1 cm |
| Wave speed wrong by +/-10% | **5 cm** | 9 cm |
| ODR mismatch 0.075% (best trim from FINE register) | **7.5 cm** | 8 cm |
| ODR mismatch 0.15% | **15 cm** | 16 cm |
| ODR mismatch 1% (typical spec) | **44-105 cm** | 178 cm |
| ODR mismatch 1% with 0.25 s window | 24-30 cm | 37-41 cm |

**Conclusions**
1. Clock mismatch is the biggest controllable error. With 1% uncorrected ODR error the estimate is useless. Measuring ODR (DRDY timing) is mandatory.
2. Wave speed must be calibrated per pipe, not assumed.
3. A 15-30 cm target is only credible after both corrections and in a quiet, controlled pipe. Treat this as a simulation-supported engineering target, not a measured result.
4. Real leak vibration levels at the pipe wall are unknown. The Aghashahi dataset (Section 9) gives the first hint, but it is a 152 mm PVC pipe.

---

## 8. Claims policy (what we may say without testing)
| May say | May not say |
|---|---|
| "Sensor noise floor X mg (datasheet)" | "Detects leaks of Y L/min" |
| "Simulation indicates localisation error of Z cm under assumptions A, B, C" | "Locates leaks within 15 cm" (as a measured fact) |
| "Pressure-decay test resolution is limited by the ADS1115 and transducer" | "Detects gas leaks" (any gas) |
| "Trainer-facing logging, scoring and feedback functions are implemented" | "Certified", "safe", "gas-free" |
Every number in reports carries its tag ([DS], [CALC], [SIM], [EST], [UNV]).

## 9. Validation without physical testing
| # | Activity | Output | Effort |
|---|---|---|---|
| V1 | Datasheet verification table (done, Section 3) | Specs, noise floors, interface limits | Done |
| V2 | Signal-chain simulation (done, `leak_localisation_sim.py`) | Detection threshold, error budget | Done |
| V3 | **Replay public dataset through our DSP code**: Aghashahi et al., Data in Brief 48 (2023), Mendeley DOI 10.17632/tbrnp6vrnj.1 (152 mm PVC, accelerometers + hydrophones, 280 records) | Algorithm correctness; leak vs no-leak classification; an indication of real-world vibration levels | 1-2 days |
| V4 | Extend simulation with background noise recorded in the dataset's no-leak files | Realistic false-alarm estimate | 1 day |
| V5 | Firmware boot self-check and noise-floor logging (needs only the powered board, no rig) | Confirms the sensor behaves per datasheet | Optional |
| V6 | Feedback-logic tests using replayed signals (HIL-style) | Verifies hot/cold bar, buzzer, haptic mapping | 1 day |
| V7 | Trainer review of UI mock-ups/video | Usability feedback without hardware | 1 day |
| V8 | Cross-check pressure-decay arithmetic with ADS1115 resolution | Smallest detectable pressure drop on paper | 0.5 day |

Anything requiring a pipe rig (real detection limits, real attenuation, real localisation error, sensor-ranking of PVDF vs disc vs MEMS) is listed as **future work**, not claimed.

## 10. Open items needing verification
1. Official Plumber NOS (PSC/Q0104) and the gas-fitting criteria: exact tightness-test steps and test pressures.
2. India availability and price of IIS3DWB, ADXL345-with-SPI and PVDF/TE LDT0 parts.
3. Whether IIS3DWB FIFO supports a 2-byte-per-sample single-axis readout (ST AN5444).
4. PCM1808 sample rate and input range (outside supplied datasheets).
5. Real leak vibration amplitude at the pipe wall for 15-25 mm plastic and metal pipe.
6. Whether any evidence exists for structure-borne gas-leak vibration at <= 6.3 kHz (G2 mode is unproven).
7. DPDP and CRS/WPC requirements before any deployment with trainees.
