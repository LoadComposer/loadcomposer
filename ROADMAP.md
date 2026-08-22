# Roadmap

This roadmap is directional and creates no commitment, deadline, or warranty.

## Current release

`v1.3.0` adds a global linear-unit preference for millimetres, centimetres,
and inches. User input and presentation are converted at the application
boundary while the geometric engine, presets, coordinates, capacities, and
all canonical data continue to use integer millimetres only.

## Successive work not included in v1.3.0

- Rapid entry / compact editing for mixed-pallet groups.
- Additional languages: Polish, Turkish, Simplified Chinese, and Arabic with RTL support.
- Side loading: evaluate a future loading mode in which physical entry may be
  from the side rather than the rear. Pallet geometric rotation and the loading
  or access direction must remain distinct concepts; orientation constraints
  must match the loading side, and side-opening or equipment-configuration data
  may be required. This item records the need only and does not define a model,
  vehicle opening, geometry rule, or user-interface control.
- Estimated Load Balance: relative mass derived from dimensions, estimated longitudinal/lateral centre, five longitudinal zones, and optional print output.
- Optional longitudinal load distribution.
- User-defined equipment.
- Actual pallet weight and Cargo Centre of Gravity.
- Further equipment presets based on documented data.
- Vehicle Geometry / Estimated Axle Loads as an advanced phase.
- Stronger saved-project portability without introducing an application backend.
- Accessibility and print refinements supported by regression evidence.

These items are intentionally unassigned to fixed release numbers and will be
evaluated progressively as separate, small releases.

Weight, balance, axle loads, load securing, route compliance, and regulatory certification are not implied by this roadmap. They require dedicated domain models, qualified review, and separate validation before any implementation claim.

The `v1.3.0` release adds no hosted commercial service, new language, PWA,
service worker, backend, analytics, or new distribution channel.
