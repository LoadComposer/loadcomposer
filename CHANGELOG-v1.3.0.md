# LoadComposer v1.3.0

Release date: 2026-08-14

## Added

- Added a global planner preference for `mm`, `cm`, and `in`, stored as
  `loadcomposer.unit` and independent from language and theme.
- Added locale-aware decimal display, point/comma input parsing, deterministic
  one-time rounding to integer millimetres, and protected unit switching when
  a visible dimensional edit is incomplete or invalid.
- Applied the selected unit to dimensional inputs, custom-pallet summaries,
  vehicle details, remaining space, operational warnings, preview labels, and
  operational print/PDF output.
- Added conversion, parser, round-trip, cross-unit geometry, mixed-group,
  persistence, responsive, seven-language, standalone, and print coverage.

## Changed

- Replaced the summary label “CBM” with localized “Total volume” wording and
  now presents the unchanged canonical volume as `m³` for `mm`/`cm` or `ft³`
  for `in`, consistently in the planner, standalone, and print/PDF output.
- Reworded Single and Mixed load summaries to distinguish requested load,
  found capacity, loaded pallets, free slots, and pallets that do not fit.
- Standardised operational access wording on “Rear opening” and shows the
  highest pallet only when it explains an access or height warning.
- Simplified print summaries so each essential load fact appears once, with
  floor/layer detail disclosed only when stacking changes the interpretation.
- Updated the load-data introduction in all seven enabled languages to explain
  that measurements are entered in the selected unit and normalised internally
  to millimetres.
- Updated the current standalone HTML/ZIP, Download page, release metadata,
  Open Graph asset, cache policy, glossary, and release evidence to v1.3.0.
- Finalized result semantics so only the final outcome uses the localized
  `FITS` / `DOES NOT FIT` verdict pair, while load/capacity and height/access
  controls use concise `OK`, `PARTIAL`, `NOT OK`, and `VERIFY` states.
- Centered state-only result badges, reserved red for a negative final verdict,
  and aligned partial, non-OK and verification diagnostics to the amber family.
- Shows Single free capacity whenever the request fits, including an explicit
  zero-free-slot line in both the result table and operational print output.
- Made height/access diagnostics independent from the placed-pallet count using
  the existing dimensions and access data, without changing placement or
  capacity calculations.

## Unchanged from v1.2.1

- The geometric engine continues to operate exclusively on canonical integer
  millimetres. Placement, capacity, coordinates, gap semantics, thresholds,
  vehicle data, pallet preset data, canonical volume calculation, weight handling, and operational
  outcomes are unchanged.
- Industrial pallet labels and commercial vehicle names retain their canonical
  identities and units.
- Download, Legal, and 404 layouts remain visually unchanged except for current
  version metadata and generated-artifact links.
- The seven canonical legal documents remain byte-identical.
