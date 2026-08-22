# LoadComposer v1.3.0 — Linear-unit implementation audit

## Dimensional inputs censused

1. Single pallet loaded height.
2. Single custom pallet length.
3. Single custom pallet width.
4. Single pallet gap.
5. Mixed-load gap.
6. Loaded height for every mixed group.
7. Custom length and width for every mixed group.
8. Single stacking vertical gap.

Quantities, maximum layers, identifiers, names, CBM and weight remain outside the linear-unit layer.

## Canonical architecture

`user text → parse chosen unit → multiply by unit factor → Math.round once → integer canonical mm → historic validation/layout engine`

`integer canonical mm → locale-aware unit formatter → input/UI/canvas/print`

Factors: mm = 1; cm = 10; in = 25.4. Precision: mm 0 decimals, cm at most 1, in at most 2. Both decimal point and comma are accepted; localized output uses the active locale. Incomplete trailing separators remain invalid/incomplete until corrected.

Created/reused unit functions: `normalizeLengthToMm`, `parseLengthInput`, `mmToDisplay`, `formatLengthValue`, `formatLengthInputValue`, `formatLength`, `formatLengthDimensions`, `setLengthInputMm`, `parseLengthField`, `requestLengthUnit` and the read-only `window.loadComposerUnits` verification API.

Unit switching first consolidates active edits to canonical mm. An invalid/incomplete edit blocks the switch, retains raw text and focus, and does not overwrite the last canonical value. Valid switches reformat from `data-mm` without rerunning the geometric search.

Preference key: `loadcomposer.unit`; accepted values `mm`, `cm`, `in`; malformed/unavailable storage falls back safely to mm. Reset preserves the unit preference; language changes do not alter it.

Preset industrial labels and vehicle names remain canonical. Operational dimensions follow the selected unit. Examples for 1200 mm: `1200 mm`, `120 cm`, `47.24 in`. Compact-loading 32 mm: `32 mm`, `3.2 cm`, `1.26 in` in English and locale-comma equivalents where applicable.

