"""
MORD Inspection Templates Service (Phase 15B)

Provides predefined, reusable inspection routes with ordered checklist steps.
Checklist positions are visual/mechanical inspection references and do NOT claim
that hardware sensors physically measure those exact coordinates.
"""

from typing import List, Optional, Dict
from app.schemas.inspection import InspectionStepItem, InspectionTemplateRead

PREDEFINED_TEMPLATES: Dict[str, Dict] = {
    "LATHE_MECHANICAL_INSPECTION": {
        "template_id": "LATHE_MECHANICAL_INSPECTION",
        "title": "Lathe Spindle & Mechanical Inspection",
        "category": "MACHINERY_SAFETY",
        "description": "Systematic route for checking lathe chuck, headstock drive, spindle bearings, coolant lines, and protective shielding.",
        "steps": [
            {
                "step_id": "LATHE-STEP-1",
                "instruction": "Inspect chuck mounting, jaw torque tightness, and confirm no loose chuck key or workholding deflection.",
                "component": "Chuck & Workholding",
                "reference_position": "Chuck Spindle Nose",
                "status": "PENDING"
            },
            {
                "step_id": "LATHE-STEP-2",
                "instruction": "Examine drive belt tension and verify that the belt guard enclosure is securely fastened.",
                "component": "Drive Belt",
                "reference_position": "Headstock Drive Enclosure",
                "status": "PENDING"
            },
            {
                "step_id": "LATHE-STEP-3",
                "instruction": "Inspect front/rear spindle bearing housings for abnormal thermal rise, audible chatter, or play.",
                "component": "Spindle Bearing",
                "reference_position": "Spindle Bearing Housing",
                "status": "PENDING"
            },
            {
                "step_id": "LATHE-STEP-4",
                "instruction": "Verify cutting fluid supply hose fittings, nozzle alignment, and check drain tray for coolant obstruction.",
                "component": "Coolant System",
                "reference_position": "Coolant Manifold & Chip Tray",
                "status": "PENDING"
            },
            {
                "step_id": "LATHE-STEP-5",
                "instruction": "Test operator emergency stop mushroom switch and verify transparent chip shield interlock integrity.",
                "component": "Safety Guard & E-Stop",
                "reference_position": "Carriage Shield & E-Stop Station",
                "status": "PENDING"
            }
        ]
    },
    "PUMP_PIPE_INSPECTION": {
        "template_id": "PUMP_PIPE_INSPECTION",
        "title": "Centrifugal Pump & Piping Route",
        "category": "FLUID_SYSTEMS",
        "description": "Standard checklist covering pump suction/discharge joints, mechanical seal, coupling alignment, and baseplate mounts.",
        "steps": [
            {
                "step_id": "PUMP-STEP-1",
                "instruction": "Check suction and discharge flange gasket seals and bolts for fluid leakage, corrosion, or weeping.",
                "component": "Piping Flanges",
                "reference_position": "Suction/Discharge Flange Joints",
                "status": "PENDING"
            },
            {
                "step_id": "PUMP-STEP-2",
                "instruction": "Examine mechanical seal gland and seal flush piping for fluid seepage or excessive friction heat.",
                "component": "Mechanical Shaft Seal",
                "reference_position": "Seal Gland Housing",
                "status": "PENDING"
            },
            {
                "step_id": "PUMP-STEP-3",
                "instruction": "Verify flexible shaft coupling alignment, check elastomer insert condition, and ensure coupling guard is bolted.",
                "component": "Coupling Guard",
                "reference_position": "Shaft Coupling Enclosure",
                "status": "PENDING"
            },
            {
                "step_id": "PUMP-STEP-4",
                "instruction": "Inspect pump baseplate and motor foundation anchor bolts for loosening, rust, or vibration fatigue.",
                "component": "Foundation Mounting",
                "reference_position": "Baseplate Anchor Bolts",
                "status": "PENDING"
            },
            {
                "step_id": "PUMP-STEP-5",
                "instruction": "Inspect discharge pressure gauge impulse line, snubber, and drain cock for blockages or leakage.",
                "component": "Pressure Instrumentation",
                "reference_position": "Discharge Pressure Tap",
                "status": "PENDING"
            }
        ]
    },
    "GENERAL_WORKSHOP_INSPECTION": {
        "template_id": "GENERAL_WORKSHOP_INSPECTION",
        "title": "General Machine Safety & Housekeeping",
        "category": "WORKSHOP_SAFETY",
        "description": "General workshop safety sweep covering perimeter zones, spill containment, cable runs, and emergency controls.",
        "steps": [
            {
                "step_id": "SHOP-STEP-1",
                "instruction": "Verify yellow boundary safety markings, non-slip floor mat condition, and ensure operator zone is unobstructed.",
                "component": "Safety Perimeter",
                "reference_position": "Machine Perimeter Boundary",
                "status": "PENDING"
            },
            {
                "step_id": "SHOP-STEP-2",
                "instruction": "Check machine sump and drip trays for oil/coolant accumulation, pooling, or drain blockages.",
                "component": "Spill Containment",
                "reference_position": "Base Drip Tray & Drain",
                "status": "PENDING"
            },
            {
                "step_id": "SHOP-STEP-3",
                "instruction": "Inspect power conduits, flexible wiring ducts, and sensor cabling for mechanical abrasion or pinch points.",
                "component": "Electrical Conduit",
                "reference_position": "Machine Power & Sensor Cable Run",
                "status": "PENDING"
            },
            {
                "step_id": "SHOP-STEP-4",
                "instruction": "Function test emergency stop push buttons, trip wire switches, and warning beacon lights.",
                "component": "Emergency Controls",
                "reference_position": "Operator Control Console",
                "status": "PENDING"
            },
            {
                "step_id": "SHOP-STEP-5",
                "instruction": "Verify all safety caution signage, PPE mandatory placards, and lock-out/tag-out points are legible.",
                "component": "Signage & Interlocks",
                "reference_position": "Machine Front Warning Placard",
                "status": "PENDING"
            }
        ]
    }
}


def get_all_templates() -> List[InspectionTemplateRead]:
    """Returns a list of all predefined inspection route templates."""
    templates = []
    for t_data in PREDEFINED_TEMPLATES.values():
        steps = [InspectionStepItem(**s) for s in t_data["steps"]]
        templates.append(
            InspectionTemplateRead(
                template_id=t_data["template_id"],
                title=t_data["title"],
                category=t_data["category"],
                description=t_data["description"],
                steps=steps
            )
        )
    return templates


def get_template_by_id(template_id: str) -> Optional[InspectionTemplateRead]:
    """Retrieves an inspection template by its ID."""
    t_data = PREDEFINED_TEMPLATES.get(template_id)
    if not t_data:
        return None
    steps = [InspectionStepItem(**s) for s in t_data["steps"]]
    return InspectionTemplateRead(
        template_id=t_data["template_id"],
        title=t_data["title"],
        category=t_data["category"],
        description=t_data["description"],
        steps=steps
    )


def instantiate_template_steps(template_id: str) -> List[InspectionStepItem]:
    """Creates a fresh, ordered checklist of steps initialized to PENDING."""
    template = get_template_by_id(template_id)
    if not template:
        return []
    return [
        InspectionStepItem(
            step_id=s.step_id,
            instruction=s.instruction,
            component=s.component,
            reference_position=s.reference_position,
            status="PENDING",
            observation=None,
            evidence_reference=None,
            completed_at=None
        )
        for s in template.steps
    ]
