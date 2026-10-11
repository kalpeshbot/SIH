"""
MORD Anomaly Explanation Engine (Phase 15B)

Provides transparent, deterministic state-conditioned baseline comparison
and human-readable anomaly explanations.

Requirements:
- Transparent deviation rules (RMS deviation, Peak deviation, spread/z-score).
- State-conditioned comparison (IDLE, STARTUP, RUNNING/ACTIVE, SHUTDOWN/COOLDOWN).
- Minimum baseline sample threshold (default: 20 samples).
- Explicit disclaimer: Anomaly detection, NOT automatic fault diagnosis or certified safety shutdown.
"""

from typing import Dict, Any, Optional
import math
from app.models.safety_event import MachineBaseline

DEFAULT_MIN_BASELINE_SAMPLES = 20
DEFAULT_Z_THRESHOLD = 3.0
DEFAULT_REL_PCT_THRESHOLD = 50.0  # 50% deviation when spread is unpopulated


def normalize_machine_state(state: Optional[str]) -> str:
    """Normalizes machine state aliases across project phases."""
    if not state:
        return "UNKNOWN"
    s = state.upper().strip()
    if s in {"RUNNING", "ACTIVE"}:
        return "ACTIVE"
    if s in {"SHUTDOWN", "COOLDOWN"}:
        return "COOLDOWN"
    if s in {"IDLE", "STARTUP", "MAINTENANCE"}:
        return s
    return "UNKNOWN"


def compare_feature_to_baseline(
    current_value: float,
    baseline: Optional[MachineBaseline],
    current_machine_state: Optional[str] = None,
    min_samples: int = DEFAULT_MIN_BASELINE_SAMPLES,
    z_threshold: float = DEFAULT_Z_THRESHOLD
) -> Dict[str, Any]:
    """
    Compares an observed feature value against a state-conditioned baseline.
    Returns deterministic anomaly status and explanatory notes.
    """
    if not math.isfinite(current_value):
        return {
            "is_anomaly": False,
            "status": "INVALID_VALUE",
            "deviation": None,
            "deviation_pct": None,
            "rule_triggered": "NONE",
            "feature_name": baseline.feature_name if baseline else "UNKNOWN",
            "current_machine_state": current_machine_state or "UNKNOWN",
            "baseline_used": None,
            "explanation": "Observed measurement is non-finite or corrupted.",
            "limitations": "Invalid numerical reading cannot be evaluated.",
            "disclaimer": "This is statistical anomaly detection, not automatic machinery diagnosis."
        }

    if baseline is None:
        return {
            "is_anomaly": False,
            "status": "INSUFFICIENT_BASELINE",
            "deviation": None,
            "deviation_pct": None,
            "rule_triggered": "NONE",
            "feature_name": "UNKNOWN",
            "current_machine_state": current_machine_state or "UNKNOWN",
            "baseline_used": None,
            "explanation": "No baseline profile available for this machine and operating state.",
            "limitations": "Cannot evaluate deviation without an established baseline reference.",
            "disclaimer": "This is statistical anomaly detection, not automatic machinery diagnosis."
        }

    # Verify baseline state consistency
    normalized_current = normalize_machine_state(current_machine_state)
    normalized_baseline = normalize_machine_state(baseline.machine_state)

    state_mismatch = (
        normalized_current != "UNKNOWN"
        and normalized_baseline != "UNKNOWN"
        and normalized_current != normalized_baseline
    )

    if baseline.sample_count < min_samples:
        return {
            "is_anomaly": False,
            "status": "INSUFFICIENT_SAMPLES",
            "deviation": None,
            "deviation_pct": None,
            "rule_triggered": "NONE",
            "feature_name": baseline.feature_name,
            "current_machine_state": current_machine_state or "UNKNOWN",
            "baseline_used": baseline.baseline_id,
            "explanation": (
                f"Baseline sample count ({baseline.sample_count}) is below minimum requirement "
                f"({min_samples} samples). Threshold comparison is withheld to prevent false alarms."
            ),
            "limitations": "Baseline is unvalidated and requires further steady-state capture.",
            "disclaimer": "This is statistical anomaly detection, not automatic machinery diagnosis."
        }

    if baseline.validity_state != "VALID":
        return {
            "is_anomaly": False,
            "status": "INVALID_BASELINE",
            "deviation": None,
            "deviation_pct": None,
            "rule_triggered": "NONE",
            "feature_name": baseline.feature_name,
            "current_machine_state": current_machine_state or "UNKNOWN",
            "baseline_used": baseline.baseline_id,
            "explanation": f"Baseline {baseline.baseline_id} validity state is '{baseline.validity_state}'.",
            "limitations": "Baseline has been invalidated or marked stale.",
            "disclaimer": "This is statistical anomaly detection, not automatic machinery diagnosis."
        }

    deviation = current_value - baseline.baseline_value
    deviation_pct = (
        (deviation / baseline.baseline_value * 100.0)
        if baseline.baseline_value != 0.0
        else 0.0
    )

    is_anomaly = False
    rule_triggered = "NONE"
    rule_detail = ""

    if baseline.spread is not None and baseline.spread > 1e-6:
        z_score = deviation / baseline.spread
        if z_score >= z_threshold:
            is_anomaly = True
            rule_triggered = "SIGMA_SPREAD_EXCEEDED"
            rule_detail = f"Value deviates by {z_score:.2f} standard deviations (threshold: +{z_threshold:.1f}σ)."
    else:
        # Fallback to percentage threshold
        if deviation_pct >= DEFAULT_REL_PCT_THRESHOLD:
            is_anomaly = True
            rule_triggered = "PERCENT_DEVIATION_EXCEEDED"
            rule_detail = f"Value is +{deviation_pct:.1f}% above baseline mean (threshold: +{DEFAULT_REL_PCT_THRESHOLD:.1f}%)."

    limitations = []
    if state_mismatch:
        limitations.append(
            f"Machine state '{current_machine_state}' differs from baseline state '{baseline.machine_state}'."
        )
    if baseline.sample_count < 30:
        limitations.append(
            f"Baseline has modest sample depth ({baseline.sample_count} samples); variance estimate may be conservative."
        )

    explanation = (
        f"Feature '{baseline.feature_name}' observed at {current_value:.3f} "
        f"compared to baseline {baseline.baseline_value:.3f} "
        f"(state: {baseline.machine_state}). "
    )
    if is_anomaly:
        explanation += f"Anomaly flagged: {rule_detail}"
    else:
        explanation += "Within normal baseline operating parameters."

    return {
        "is_anomaly": is_anomaly,
        "status": "ANOMALY_DETECTED" if is_anomaly else "NOMINAL",
        "deviation": round(deviation, 4),
        "deviation_pct": round(deviation_pct, 2),
        "rule_triggered": rule_triggered,
        "feature_name": baseline.feature_name,
        "current_machine_state": current_machine_state or "UNKNOWN",
        "baseline_used": baseline.baseline_id,
        "explanation": explanation,
        "limitations": "; ".join(limitations) if limitations else "None recorded.",
        "disclaimer": "This is statistical anomaly detection, not automatic machinery diagnosis or certified safety shutdown."
    }
