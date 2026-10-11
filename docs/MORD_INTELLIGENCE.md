# MORD Intelligence Architecture Specification (Phase 13)

## 1. Why Baseline IoT is Insufficient
Standard IoT architectures operate under a simplistic paradigm:
`Raw Sensor Reading -> Threshold Comparison -> Binary Alert`

In industrial training environments, this approach fails due to:
- **High False Positive Rates**: Sensor warm-up periods (e.g. MQ electrochemical/semiconductor gas sensors) or standard machine state transitions (e.g. motor startup spikes) produce spurious threshold breaches.
- **Lack of Context Awareness**: A vibration level that is completely normal during high-speed CNC milling (`ACTIVE`) indicates severe imbalance or mechanical loose play during `IDLE` or `COOLDOWN`.
- **Inadequate Evidence for Trainer Debriefs**: Transient alerts disappear once raw levels drop below thresholds, leaving no structured historical event record or cross-sensor evidence for pedagogical intervention or near-miss analysis.
- **Unverified Diagnostic Claims**: Individual non-certified sensors must never claim to diagnose complex mechanical failure; rather, the system must identify **"abnormal conditions requiring inspection."**

---

## 2. MORD Intelligence Reasoning Chain
The MORD intelligence layer transforms raw physical signals into explainable, structured safety events:

```text
Raw Signal (mV / ADC / counts)
    ↓
Validated Signal (range check, electrical bounds)
    ↓
Sensor Health (warm-up check, saturation, frozen signal detection)
    ↓
Signal Features (RMS, peak, crest factor, band energy, baseline deviation)
    ↓
Machine & Session Context (operating state: IDLE / STARTUP / ACTIVE / COOLDOWN)
    ↓
Anomaly Interpretation (comparison against state-specific machine baselines)
    ↓
Confidence Assessment (single sensor vs corroborated multi-channel evidence)
    ↓
Hazard / Event State (structured SafetyEvent record)
    ↓
Trainee Guidance (local haptic / audio / visual cue)
    ↓
Trainer Intervention (dashboard telemetry, contextual evidence, recommended action)
    ↓
Near-Miss / Event Evidence (persistent post-session pedagogical review)
```

---

## 3. Conceptual Device Classes
The MORD physical and network architecture conceptually supports three distinct hardware classes:

| Device Class | Placement | Primary Purpose | Key Components / Features |
|---|---|---|---|
| **MORD MACHINE NODE** | Fixed to industrial machine / pipe / structure | Machine-condition sensing & vibration acquisition | IIS3DWB (SPI), acoustic sensor, temperature, current transducer |
| **MORD TAG** | Wearable / clipped on trainee | Trainee feedback & localized status | Buzzer, vibration/haptic motor, OLED / LED bar |
| **MORD PROBE** | Handheld inspection tool | Inspection, confirmation, and localized leak tracing | Handheld sensor probe, contact pad, local display |

---

## 4. Machine Operating State Model
Machine context is essential for signal interpretation. MORD represents six discrete operating states:

- `IDLE`: Machine energized but stationary / no cutting load. (Vibration threshold is low).
- `STARTUP`: Initial motor spin-up, inrush current, and transient acceleration.
- `ACTIVE`: Normal operational cutting, pumping, or machining state.
- `COOLDOWN`: Post-operation spin-down and thermal settling.
- `MAINTENANCE`: Service, tool replacement, or calibration mode.
- `UNKNOWN`: Unspecified or unclassified baseline state.

---

## 5. Sensor Health Assessment Model
Before a sensor value is evaluated, its health state is assessed:

- `OK`: Sensor operational within valid electrical and operational bounds.
- `WARMING_UP`: Sensor in initialization or thermal stabilization period (e.g. first 20s of MQ heater startup; readings suppressed from raising critical alarms).
- `UNRELIABLE`: Erratic fluctuations or stuck constant values (>100 identical consecutive samples).
- `DISCONNECTED`: No telemetry or electrical link broken.
- `SATURATED`: Signal exceeds ADC maximum or sensor dynamic range (e.g. ±9999 units).
- `STALE`: Telemetry timestamp exceeds maximum freshness tolerance.
- `UNKNOWN`: Uninitialized health state.

---

## 6. Confidence Representation
Rather than fabricating arbitrary floating-point probabilities (e.g. `87.4%`), MORD utilizes qualitative confidence levels grounded in explainable evidence:

- **`LOW`**: Anomaly observed during sensor warm-up, borderline deviation, or uncorroborated single-channel reading.
- **`MEDIUM`**: Anomaly clearly exceeds state-specific baseline on a healthy single sensor channel.
- **`HIGH`**: Anomaly exceeds baseline with cross-sensor corroboration (e.g. vibration elevation verified by acoustic energy spike).

---

## 7. Sensor Feature Extraction Contract
Edge firmware (ESP32-S3) and intelligence services compute standard time and frequency domain features:

| Feature Name | Description |
|---|---|
| `RMS` | Root Mean Square energy across sampling window |
| `PEAK` | Maximum absolute amplitude |
| `CREST_FACTOR` | Peak-to-RMS ratio (detects impulsive shocks) |
| `KURTOSIS` | Statistical fourth moment (sensitive to early bearing faults) |
| `BAND_ENERGY` | Energy integrated over specific frequency bands (e.g. 80–600 Hz) |
| `BAND_RATIO` | Ratio of high-frequency to low-frequency band energy |
| `RATE_OF_CHANGE` | First derivative / slope of sensor parameter over time |
| `PERSISTENCE` | Duration that anomalous value has consistently exceeded threshold |
| `BASELINE_DEVIATION` | Distance from machine-state baseline (in units of MAD or standard deviations) |

---

## 8. Machine Operating Baselines
A machine's normal signature varies dramatically between operating states. MORD supports structured `MachineBaseline` records:
- `machine_id`: Unique identifier for the industrial tool (e.g. `LATHE-01`).
- `sensor_type`: Sensor channel (e.g. `VIBRATION`, `ACOUSTIC`, `PRESSURE`).
- `machine_state`: Operating state (`IDLE`, `STARTUP`, `ACTIVE`, `COOLDOWN`).
- `feature_name`: Computed feature (`RMS`, `BAND_ENERGY`, etc.).
- `baseline_value`: Empirically recorded reference value.
- `spread`: Distribution spread metric (Median Absolute Deviation or standard deviation).
- `sample_count`: Number of training/calibration samples collected.

---

## 9. Safety Events & Event Lifecycle
A `SafetyEvent` represents a structured, persistent safety-relevant occurrence:

```text
       [Anomaly Triggered]
                ↓
           +----------+
           | DETECTED |
           +----------+
           /          \
  (Trainer Acknowledges) (False Alarm)
         /              \
        v                v
+--------------+   +-----------+
| ACKNOWLEDGED |   | DISMISSED |
+--------------+   +-----------+
        |
 (Condition Cleared)
        |
        v
  +----------+
  | RESOLVED |
  +----------+
```

### Event Vocabularies
- `VIBRATION_ANOMALY`
- `ACOUSTIC_ANOMALY`
- `GAS_ANOMALY`
- `PRESSURE_ANOMALY`
- `WETNESS_EVENT`
- `SENSOR_FAULT`
- `MULTI_SENSOR_HAZARD`
- `UNKNOWN_ANOMALY`

---

## 10. Alerts vs. Safety Events vs. Near-Misses

| Construct | Definition | Persistence | Scope |
|---|---|---|---|
| **Sensor Reading** | Single instantaneous measurement | High volume, ephemeral in UI | Telemetry stream |
| **Alert** | Immediate real-time notification | Active during hazard threshold breach | Real-time cockpit warning |
| **Safety Event** | Persistent structured event record with duration & lifecycle | Persists in database after session | Post-session audit & tracking |
| **Near-Miss Evidence** | Safety-relevant abnormal event requiring review | Persists with trainer debrief notes | Pedagogical feedback & root cause |

> **Legal Disclaimer**: MORD records "safety-relevant abnormal events requiring review" for educational and training purposes. MORD does not provide certified compliance determinations or legal near-miss definitions.

---

## 11. Explainable Alert Contract
Every alert presents clear, deterministic reasoning:
- **Condition**: High-level identification (e.g. `HIGH VIBRATION DURING IDLE`).
- **Evidence**: Quantitative basis (e.g. `Vibration 3.8g exceeded idle baseline 0.5g`).
- **Confidence**: `LOW`, `MEDIUM`, or `HIGH`.
- **Sensor Status**: `OK`, `WARMING_UP`, `UNRELIABLE`, etc.
- **Recommended Action**: Actionable step (e.g. `Stop spindle and check workholding clamp`).

---

## 12. Cross-Sensor Validation & Corroboration
Multiple physical channels provide mutual confirmation:
- *Single-channel anomaly* (e.g. high vibration alone) -> `MEDIUM` confidence alert.
- *Dual-channel anomaly* (e.g. vibration elevation + acoustic hiss elevation) -> `HIGH` confidence alert.
- *Sensor disagreement* (e.g. gas sensor high but temperature/status indicates heater warm-up) -> Alert suppressed or marked `LOW` confidence.

---

## 13. Offline-First Architectural Principle
In industrial workshop environments, external WAN/Internet connections are unreliable or absent:
- Local edge hardware (ESP32-S3) communicates with local gateway / server via local Wi-Fi or ESP-NOW.
- All sensor validation, threshold evaluation, event recording, and trainer dashboards operate **100% locally** on the local network without cloud dependencies.
- Internet connectivity loss does NOT interrupt active monitoring, safety event logging, or debrief workflows.

---

## 14. Phase 14 Hardware Integration Plan Prerequisites
With the intelligence software architecture verified, Phase 14 proceeded with physical sensor integration:
1. **SPI Bus Wiring**: IIS3DWB 3-axis vibration sensor connected via high-speed SPI to ESP32-S3.
2. **True ODR Calibration**: Hardware timer DRDY interrupt calibration to eliminate clock skew between nodes.
3. **Acoustic / Analog Input**: ADC setup for wideband acoustic and pressure transducers.
4. **Local Feature Pipeline**: Implementation of local rolling RMS and band-pass calculations in firmware.

---

## 15. Phase 15B: Evidence-Guided Inspection Workflow
MORD Phase 15B establishes a structured, trainer-led inspection workflow operable without hardware probe dependencies:

### 15.1 Reusable Inspection Routes
Standardized, ordered checklists guide trainers through mechanical walk-arounds:
- `LATHE_MECHANICAL_INSPECTION`: Chuck & workholding, belt drive enclosure, spindle bearing housing, coolant return pan, safety guards.
- `PUMP_PIPE_INSPECTION`: Flange gasket seals, mechanical seal gland, coupling alignment, baseplate foundation bolts, pressure taps.
- `GENERAL_WORKSHOP_INSPECTION`: Boundary markings, fluid catch basins, cable conduits, emergency stops, warning placards.

*Important Note on Landmark Positions*: Checklist reference positions describe physical machinery landmarks for checklist execution; they do not imply direct hardware sensor instrument readings at those coordinates.

### 15.2 Conclusive Decision Vocabulary
Trainer conclusions use explicit, distinct statuses that do NOT overload `SafetyEvent` lifecycle values:
- `CONFIRMED_BY_TRAINER`: Physical inspection corroborated hazard presence.
- `REFUTED_BY_TRAINER`: Physical inspection confirmed nominal machine condition / false alarm.
- `INCONCLUSIVE`: Ambiguous physical evidence or conflicting indicators.
- `INSUFFICIENT_EVIDENCE`: Critical sensor telemetry or checklist steps were omitted or unavailable.

---

## 16. Phase 15B: Evidence Quality Engine
The Evidence Quality Engine evaluates whether available observations support safety decisions:
- **`SUFFICIENT`**: Telemetry is fresh, sensor health is `OK`, machine operating state is verified, and baseline sample count meets policy requirements (>= 20 samples).
- **`DEGRADED`**: Telemetry is available but compromised by stale readings (> 60s), sensor warm-up, unknown operating state, or baseline sample count below policy.
- **`INSUFFICIENT`**: Telemetry missing, non-finite values detected, sensor disconnected/saturated, or required baseline absent.

*Orthogonality Rule*: Evidence quality and hazard severity are orthogonal concepts. A high-severity event with poor evidence does NOT automatically become a low-severity event.

---

## 17. Phase 15B: State-Conditioned Baselines & Anomaly Explanations
- Baselines are tied to specific machines and operating states (`IDLE`, `STARTUP`, `ACTIVE`, `COOLDOWN`).
- Policy requires at least 20 steady-state samples before activating baseline anomaly comparisons.
- Deviations report standard deviations (`SIGMA_SPREAD_EXCEEDED`) or percentage delta (`PERCENT_DEVIATION_EXCEEDED`).
- Every anomaly report includes an explicit disclaimer: "Statistical anomaly detection, not certified automatic machinery diagnosis or safety shutdown."

---

## 18. Phase 15B: Hazard Persistence, Escalation & Recovery
Event trend classification based on chronological measurements:
- `TRANSIENT`: Isolated spike with rapid return to nominal range.
- `PERSISTENT`: Ongoing deviation sustained across multiple observation windows.
- `ESCALATING`: Deviation with increasing magnitude (+15% or higher) across window.
- `RECOVERING`: Readings returning below threshold over consecutive samples under verified healthy sensor connectivity.
- `UNKNOWN`: Insufficient readings or communication dropout.

*Critical Scientific Rules*:
- Missing sensor telemetry is NEVER interpreted as recovery.
- Sensor disconnection is NEVER interpreted as recovery.

---

## 19. Phase 15B: Trainer Corrective Interventions
Trainers record physical adjustments (e.g., `WORKHOLDING_ADJUSTMENT`, `SPEED_FEED_ADJUSTMENT`) and compare pre- and post-intervention telemetry windows:
- `IMPROVED`: Observed feature decreased by >= 10%.
- `UNCHANGED`: Feature varied within ±10%.
- `WORSENED`: Feature increased by >= 10%.
- `INCONCLUSIVE`: Incompatible units, differing features, shifting machine states, or missing data.

*Attribution Disclaimer*: Outcomes are explicitly labelled as "observed before-and-after comparisons," not certified causal proofs.

---

## 20. Phase 15B: Session Replay & Trainer Intelligence
- Unified chronological replay timeline collation across session lifecycles, safety events, alerts, inspections, and interventions.
- Aggregated trainer intelligence metrics: unresolved inspection tallies, timing metrics (mean time to acknowledge, mean time to resolve), and skipped checklist steps.
- Strictly prohibits punitive individual trainee safety scores or fabricated statistics.

---

## 21. Phase 15B: Maintenance Export & Spreadsheet Security
- Comprehensive JSON and CSV export packages for inspections and session debriefs.
- **CSV Formula Injection Defense**: Neutralizes dangerous spreadsheet formula injection characters (`=`, `+`, `-`, `@`, `\t`, `\r`, `\n`, `%`) by prefixing `'` dynamically at export time.
- Underlying database records are preserved untouched.
- PDF extension point documented for future headless PDF renderer integration.

---

## 22. Verification Status & Integrity Standards
1. **Implemented Software**: Full FastAPI backend endpoints, models, migrations, SQLModel schema, React UI.
2. **Unit-Tested Software**: 195 automated pytest unit tests covering all edge conditions, algorithms, and models.
3. **Integration-Tested Software**: End-to-end API client integration, SQLite migrations, and Vite production bundle.
4. **Hardware-Tested Behavior**: Physical IIS3DWB machine node streaming verified in Phase 14 firmware.
5. **Unverified Hypotheses**: Ultrasonic acoustic probe driver is NOT implemented in Phase 15B and requires future hardware validation.
