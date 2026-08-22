# LoadComposer v1.2.1 → v1.3.0 comparison

Canonical baseline ZIP SHA-256: `833da9253dd63c687fec04306d342b92a470cf86c15e5d458a42ce20447fbf47`.

## Classified delta

| Class | Authorized change |
|---|---|
| A. Unit formatting/parsing | Central mm/cm/in parser, formatter and one-time integer-mm normalization. |
| B. Input UI | Main-only native radio segmented selector; dimensional text inputs with decimal input mode and canonical `data-mm`. |
| C. Output UI | Operational dimensions, residuals, warnings, vehicle details and visual labels formatted in the selected unit. |
| D. Print | Global unit reused automatically; converted labels/details; compact non-mm table spacing; no second selector. |
| E. i18n | Seven enabled catalogs at 527 keys; unit, validation and final status wording localized; protected language inventory unchanged. |
| F. Tests | Parser, persistence, cross-unit, mixed, responsive, print and canonical v1.2.1 parity coverage added. |
| G. Generated evidence | v1.3.0 JSON, PNG and PDF evidence plus release reports. |
| H. Release metadata | Version, changelog, Download/current artifacts, OG asset, docs and immutable cache rules updated to v1.3.0. |
| I. Same-version status finalization | FITS/DOES NOT FIT final verdicts separated from OK/PARTIAL/NOT OK/VERIFY controls; badges made state-only; zero free slots shown in UI and print. |

## Explicit semantic freeze

- Algorithms: no semantic change.
- Geometry, coordinates and canonical-mm layout data: no change.
- Vehicle data and commercial vehicle names: no change.
- Pallet preset data, names and industrial dimension labels: no change.
- Capacity calculations and geometric outcome logic: no change; only the authorized presentation/status semantics changed.
- Legal documents: no byte change.

Evidence: 1,080 single-capacity + 4,110 single-load + 2,352 mixed parity cases with zero geometry differences; 47/47 default-mm print raster pages pixel-identical.
