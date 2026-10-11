"""
MORD Trainer Intervention and Effect Comparison Service (Phase 15B)

Records trainer corrective interventions and computes deterministic before-and-after
telemetry window comparisons.

Permitted outcomes:
- IMPROVED
- UNCHANGED
- WORSENED
- INCONCLUSIVE

CRITICAL SAFETY & SCIENTIFIC INTEGRITY RULES:
- Never compare incompatible units, differing features, or mismatched machine operating states.
- If evidence is insufficient or missing, return INCONCLUSIVE.
- Label outcomes strictly as "observed before-and-after comparison", not certified causal proof.
"""

from typing import Dict, Any, Optional
import math
from app.schemas.inspection import VALID_INTERVENTION_OUTCOMES
from app.services.anomaly_explanation_engine import normalize_machine_state

DEFAULT_EFFECT_THRESHOLD_PCT = 10.0


def compare_intervention_effect(
    before_window: Optional[Dict[str, Any]],
    after_window: Optional[Dict[str, Any]],
    threshold_pct: float = DEFAULT_EFFECT_THRESHOLD_PCT
) -> Dict[str, Any]:
    """
    Compares telemetry feature summaries between pre- and post-intervention windows.
    Returns comparison_outcome and comparison_notes.
    """
    if not before_window or not after_window:
        return {
            "comparison_outcome": "INCONCLUSIVE",
            "comparison_notes": "Inconclusive: Missing pre-intervention or post-intervention telemetry window.",
            "delta": None,
            "pct_change": None
        }

    before_feature = before_window.get("feature") or before_window.get("feature_name")
    after_feature = after_window.get("feature") or after_window.get("feature_name")

    if not before_feature or not after_feature or before_feature != after_feature:
        return {
            "comparison_outcome": "INCONCLUSIVE",
            "comparison_notes": f"Inconclusive: Incompatible feature definitions ({before_feature} vs {after_feature}).",
            "delta": None,
            "pct_change": None
        }

    before_unit = before_window.get("unit")
    after_unit = after_window.get("unit")

    if before_unit and after_unit and before_unit != after_unit:
        return {
            "comparison_outcome": "INCONCLUSIVE",
            "comparison_notes": f"Inconclusive: Incompatible measurement units ({before_unit} vs {after_unit}).",
            "delta": None,
            "pct_change": None
        }

    before_state = normalize_machine_state(before_window.get("machine_state"))
    after_state = normalize_machine_state(after_window.get("machine_state"))

    if before_state != "UNKNOWN" and after_state != "UNKNOWN" and before_state != after_state:
        return {
            "comparison_outcome": "INCONCLUSIVE",
            "comparison_notes": (
                f"Inconclusive: Machine operating state shifted between observation windows "
                f"({before_state} to {after_state}). State change invalidates direct feature comparison."
            ),
            "delta": None,
            "pct_change": None
        }

    before_val = before_window.get("mean_value", before_window.get("value"))
    after_val = after_window.get("mean_value", after_window.get("value"))

    if before_val is None or after_val is None:
        return {
            "comparison_outcome": "INCONCLUSIVE",
            "comparison_notes": "Inconclusive: Numerical feature values are missing in observation windows.",
            "delta": None,
            "pct_change": None
        }

    try:
        b_float = float(before_val)
        a_float = float(after_val)
    except (TypeError, ValueError):
        return {
            "comparison_outcome": "INCONCLUSIVE",
            "comparison_notes": "Inconclusive: Non-numeric feature values detected.",
            "delta": None,
            "pct_change": None
        }

    if not math.isfinite(b_float) or not math.isfinite(a_float):
        return {
            "comparison_outcome": "INCONCLUSIVE",
            "comparison_notes": "Inconclusive: Non-finite numerical feature values detected.",
            "delta": None,
            "pct_change": None
        }

    delta = a_float - b_float
    pct_change = (delta / b_float * 100.0) if b_float != 0.0 else 0.0
    unit_str = f" {before_unit}" if before_unit else ""

    if pct_change <= -threshold_pct:
        outcome = "IMPROVED"
        notes = (
            f"Observed {before_feature} decreased by {abs(pct_change):.1f}% "
            f"(from {b_float:.2f} to {a_float:.2f}{unit_str}). "
            "Note: This is an observed before-and-after comparison, not proven physical causation."
        )
    elif pct_change >= threshold_pct:
        outcome = "WORSENED"
        notes = (
            f"Observed {before_feature} increased by +{pct_change:.1f}% "
            f"(from {b_float:.2f} to {a_float:.2f}{unit_str}). "
            "Note: This is an observed before-and-after comparison."
        )
    else:
        outcome = "UNCHANGED"
        notes = (
            f"Observed {before_feature} changed by {pct_change:+.1f}% "
            f"(from {b_float:.2f} to {a_float:.2f}{unit_str}), remaining within ±{threshold_pct}% boundary."
        )

    return {
        "comparison_outcome": outcome,
        "comparison_notes": notes,
        "delta": round(delta, 4),
        "pct_change": round(pct_change, 2)
    }
