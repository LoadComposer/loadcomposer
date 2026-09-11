# LoadComposer v1.4.0 test bundle

This bundle contains the self-contained application, deterministic Legal/About/Guide/standalone builders, GitHub workflow definitions, test suite, current v1.4.0 QA results, and current visual evidence used to validate SEO/discovery routes and transverse presentation centering. Run `npm run test:seo` for the current About, Guide, metadata, example, image, sitemap, and offline-discovery checks.

## Normal CI

No external previous-release delivery ZIP is required:

```bash
npm ci
npm test
npm run test:hardening
npm run test:path-portability
npm run test:transverse-centering
npm run test:workflow-policy
```

The dedicated presentation regression is also available directly:

```bash
npm run test:transverse-centering
```

## Release-only QA

Input admission and historical byte-parity deliberately require the externally supplied approved v1.3.6 delivery. They fail clearly if it is absent:

```bash
LOADCOMPOSER_V136_ZIP=/path/to/loadcomposer-v1.3.6-delivery.zip \
LOADCOMPOSER_V136_ROOT=/path/to/delivery-v1.3.6 \
npm run test:release-input-admission

LOADCOMPOSER_V136_ROOT=/path/to/delivery-v1.3.6 \
npm run test:release-historical
```

Expected canonical ZIP SHA-256:

`0e1851c54b12eba60063e139e0d163111b3c2b6b04ee84d224c0763fc9cbbed0`

The test bundle's own `SHA256SUMS-v1.4.0.txt` covers every payload file except itself.

## Desktop density correction

`npm run test:planner-ux` is active in normal CI and Package Integrity. It runs exact single/mixed input/result comparisons, seven-language checks, all six one-shot examples, internal nonzero vertical-gap comparisons and the current browser density/interaction suite. `tests/planner-density-v1.4.0.mjs` checks six viewport widths, compact numeric controls, peer sections, live input, validation, stacking states, orientation focus, presentation-only filters, preview navigation and Reset. Its current evidence replaces the prototype planner screenshots.

Normal UI-created input uses vertical gap 0 mm. The internal engine remains capable of nonzero vertical gap. Calculate, vertical-gap input, trailer secondary filters and a permanent stacking paragraph are absent from the normal UI.

`planner-density-before-results-v1.4.0.json` and its two screenshots record the admitted prototype solely as before/after evidence for this correction. `density-correction-scope-results-v1.4.0.json` records the admitted candidate, protected function hashes and unchanged source/artifact counts. These correction records require no external ZIP in normal CI.

## Final alignment correction on the fea850 candidate

The active `npm run test:planner-ux` chain now also runs
`tests/planner-alignment-v1.4.0.mjs`. Its current evidence is
`planner-alignment-results-v1.4.0.json` and
`planner-alignment-evidence-v1.4.0/`: shared form tracks, resolved rotation,
24 online/file picker states, exclusive accordion and outside-pointer safety,
keyboard/touch stacking help, stable filtered metrics, four theme states and
21 localized desktop headers. Geometry remains covered by the established
7,542-case comparison against the retained approved v1.3.6 standalone.

`alignment-scope-results-v1.4.0.json` records byte identity against the admitted
fea8501906b2029ce2311d833ed5476301d9fce00a5df9b32cf9d582b0f35a54 input.
Earlier retained v1.4.0 density/provenance evidence describes that preceding
stage; it is not relabelled as new alignment evidence. Normal CI needs no
external previous delivery. Runtime measurements/screenshots are QA evidence;
application build determinism is verified separately.

## Final presentation polish on the 91a8e482 candidate

The active `npm run test:planner-ux` chain also imports
`tests/presentation-polish-v1.4.0.mjs`. It protects the theme-token pallet
picker, visually transparent stacking wrapper, compact summary ordering,
unlimited spreadsheet-style group letters, A.1/B.1 operator references while
numeric internal rectangle IDs remain unchanged, and fixed Results table
column boundaries. `tests/planner-alignment-v1.4.0.mjs` additionally compares
picker primary/secondary text contrast in Light and Dark, metric and table
positions across result filters, and the stacking wrapper's computed surface.

`presentation-polish-results-v1.4.0.json` is the deterministic source/standalone
assertion record for this pass. Existing previous-stage evidence remains named
for the stage that produced it and is not relabelled.

## Final desktop composition polish on the e2ee3080 candidate

The current `tests/planner-alignment-v1.4.0.mjs` sweep covers 18 widths from
2560 px through 320 px and generates 114 current captures. It verifies the
inline wide-desktop Load settings band, fixed-width unit selector, stable
mm/cm/in neighbor positions, composed Pallets heading/actions, the localized
“Add another pallet type” action, 44 px control family, compact pointer and
keyboard stacking focus, naturally sized metric values, and fixed
21/12/25/20/22 percent Results columns. The same online and `file://` picker,
accordion, rotation, tooltip, theme, header, filter and zero-recalculation
assertions remain active. Geometry continues to be protected independently by
the 7,542-case parity suite.
