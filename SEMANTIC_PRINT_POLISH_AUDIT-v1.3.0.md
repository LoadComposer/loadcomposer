# LoadComposer v1.3.0 — Semantic and print polish audit

Date: 2026-08-20  
Accepted input SHA-256: `26ba4c4fa5cda1e5536384f71e17ee1e1d8ffa0f60367bf5ef5e90fd018f2b36`

## Delta classification

| Class | Authorized delta | Implementation |
|---|---|---|
| A | Volume presentation | `CBM totale` became localized `Volume totale`; canonical m³ is displayed as m³ for mm/cm and ft³ for in. |
| B | Result semantics | FITS/DOES NOT FIT is reserved for the final verdict; capacity/access controls use state-only OK/PARTIAL/NOT OK/VERIFY badges. Single shows found capacity without repeating the request and displays free slots, including zero; Mixed shows loaded/missing counts without artificial capacity. |
| C | Height/access terminology | Operational wording uses rear opening; normal Mixed omits highest-pallet height, while warning cases disclose it. |
| D | Print simplification | Duplicate counts were removed; volume was added; ordinary floor/layer diagnostics were removed; stacked information remains. |
| E | i18n | Seven catalogs remain enabled with the same 527-key set; glossaries were regenerated. |
| F | Tests/evidence | UI, unit, print, plural, responsive, raster and exact-geometry evidence were updated/regenerated. |
| G | Reports/package metadata | Existing v1.3.0 changelog entry, this audit, test report, standalone checksums, test bundle and delivery controls were updated. |

## Authored files changed

- `CHANGELOG.md`, `CHANGELOG-v1.3.0.md`, `TEST_REPORT-v1.3.0.md`, `SEMANTIC_PRINT_POLISH_AUDIT-v1.3.0.md`, `STATUS_SYSTEM_FINALIZATION_REPORT-v1.3.0.md`, `package.json`.
- `site/index.html`.
- `site/lang/{it,en,de,es,fr,pt,nl}.json`.
- `scripts/create-delivery-controls.mjs`, `scripts/generate-translation-glossary.mjs`.
- `tests/community-feedback-v1.2.0.mjs`, `tests/compare-print-renders-v1.0.0.mjs`, `tests/functional-parity-v1.0.0.mjs`.
- `tests/i18n-catalogs-v1.0.0.mjs`, `tests/i18n-identical-allowlist-v1.0.0.json`, `tests/i18n-modular-v1.0.0.mjs`, `tests/i18n-plural-source-audit-v1.0.0.mjs`, `tests/i18n-quantity-rendering-v1.0.0.mjs`.
- `tests/linear-units-v1.3.0.mjs`, `tests/loadcomposer-regression-v1.0.0.mjs`, `tests/print-linear-units-v1.3.0.mjs`, `tests/print-pdf-v1.0.0.mjs`, `tests/print-plural-scenarios-v1.0.0.mjs`, `tests/ui-consistency-v1.2.1.mjs`, `tests/status-system-v1.3.0.mjs`, `tests/v13-scope-audit-v1.3.0.mjs`, `tests/scope-freeze-v1.0.0.mjs`, `tests/responsive-v1.0.0.mjs`, `tests/trailer-prudential-alerts-v1.0.0.mjs`, `tests/delivery-packaging-v1.3.0.mjs`.

## Generated files changed

- Current standalone HTML/ZIP and their SHA-256 sidecars; localized Download page.
- Six v1.3.0 translation glossaries.
- Current JSON results for functional parity, geometry parity, status-system, UI/i18n, responsive, unit, print/raster, plural and visual suites.
- Six focused status screenshots covering the required IT/EN/DE desktop and IT 390/320 mobile states.
- Current print/PDF/PNG, localized print, plural print, unit print, responsive and visual evidence trees. Redundant spill-page PNGs from the input evidence were removed by the simplified print layout.
- `loadcomposer-v1.3.0-test-bundle.zip`, `DELIVERY_MANIFEST-v1.3.0.txt` and `SHA256SUMS-v1.3.0.txt`.

## Access terminology census

Operational rendering points are deliberately distinct:

- Results table: `table.door` / `table.rearNotChecked`.
- Print: `print.accessDoor` / `print.accessInternalOnly`.
- Side/ramp schema: `preview.doors` / `preview.doorsRamp`.
- Diagnostics: `space.issue.doorWidth`, `space.issue.doorHeight`, `geometry.invalidDoorWidth`, `geometry.invalidDoorHeight`, `geometry.doorArticle`.

All seven catalogs localize those user-facing concepts as the useful rear opening. Internal identifiers such as `doorWidth`, `doorHeight`, `okDoor` and frozen vehicle fields retain their historical names because they are model/API identifiers, not displayed terminology. Access not verified remains distinct from a known rear-opening dimension. Side loading was not added.

## Frozen categories

No semantic change was made to algorithms, candidate generation, placement, scoring, final validation, Single/Mixed geometry, rotation, stacking, gaps, capacity calculations, `capacityLayout`, `loadLayout`, coordinates, vehicle data, pallet data, canonical integer-mm parsing/conversion, localStorage unit behavior or compact-loading thresholds/text.

The seven root legal documents and their seven public copies remain byte-identical to the accepted input.
