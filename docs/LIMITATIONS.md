# Operational and model limitations

LoadComposer estimates rectangular geometric arrangements using nominal internal vehicle dimensions and heuristic placement strategies. It is a decision aid, not an authoritative loading plan.

## What the result means

- A positive geometric result means that the modeled rectangles fit within the selected nominal dimensions under at least one tested arrangement.
- “NON OK,” or a translated equivalent, means that the implemented strategies did not find an acceptable arrangement. It does not prove mathematical impossibility.
- Capacity figures depend on entered dimensions, orientation rules, stack assumptions, and the nominal vehicle record.
- Mixed-load results are heuristic and can depend on ordering and search constraints.

## What is not checked

The application does not establish:

- gross or net weight compliance;
- center of gravity, balance, axle loads, wheel loads, or floor loading;
- dynamic stability, braking, cornering, vibration, or settlement;
- packaging strength, pallet deformation, bulging, tolerances, or overhang;
- stacking compatibility or crush resistance;
- load securing, lashing points, blocking, bracing, dunnage, or restraint standards;
- door, ramp, roof, refrigeration-unit, wheel-arch, coupling, or handling-equipment clearance beyond expressly modeled dimensions;
- forklift access, loading sequence, unloading sequence, or worker safety;
- dangerous-goods segregation, food/pharmaceutical controls, customs, carrier rules, route restrictions, homologation, or other regulatory compliance; or
- availability and exact dimensions of a specific vehicle or container series.

## Required verification

Measure the actual load and equipment; confirm payload and weight distribution; validate loading and unloading sequence; obtain the carrier’s approval; and involve qualified logistics, engineering, safety, dangerous-goods, customs, and legal professionals as applicable. Keep the application’s output together with the assumptions used, but do not treat it as a certificate.

The legal warranty and liability terms are in [LICENSE](../LICENSE). Mandatory rights remain unaffected.
