# LoadComposer v1.2.0 candidate visual-fix comparison

Date: 2026-08-13  
Input candidate: `loadcomposer-v1.2.0-delivery.zip`  
Input SHA-256: `a3fef2b6898ae2aacfc9732edddcd226cda7ce82fc935d8ee232829fb0ece78f`

This is a path- and SHA-256-based comparison between the admitted v1.2.0
candidate and the corrected private candidate of the same version.

## Application/source delta

Exactly two authored source/test files changed:

| Path | Input SHA-256 | Corrected SHA-256 | Reason |
|---|---|---|---|
| `scripts/templates/downloads-index.html` | `a37a83d52138dcc313399ffe70d15b75b6ef0c2ce6f32f896faee7fdcb7cea6a` | `543cd75f43d0fd98baa69245b35a2c7411ef45c6206fe28d012f9c458d844ea1` | Narrowly scoped CSS declarations make Recommended filled, Offline outline and ZIP readable/active in dark mode. |
| `tests/downloads-page-v1.2.0.mjs` | `4b1721b923d825d30c6eaa9620e419c74afbdba1b6dc68c106196b631a8c7e1d` | `a03d9ea227fc3a1e78cda8f811c63c1a5eacb1ad337d32e9b122678737e0edc2` | Adds contrast, state, focus, responsive and hierarchy checks for the two authorized visual corrections. |

Exactly one deterministic application output changed:

| Path | Input SHA-256 | Corrected SHA-256 | Reason |
|---|---|---|---|
| `site/downloads/index.html` | `54a0facb738f61a4c962fc543b6be022799eb4d4ff5e5e1be42e23dbdfbea493` | `63e4e6a298744be97ded7062d5b8b709f53728ff4227111ab54e7c7c03b97a3e` | Deterministic build output from the corrected Download template. |

No application/source file was added or deleted.

## Reports and packaging delta

The following non-application files change as required consequences of the
new validation and packaging:

- `TEST_REPORT-v1.2.0.md` — records the corrected candidate and visual matrix;
- `RELEASE_CHECKLIST-v1.2.0.md` — records the two fixes and final gates;
- `WORKFLOW_VALIDATION-v1.2.0.md` — records the new immutable bundle and
  package-integrity reproduction;
- `V12_CANDIDATE_VISUAL_FIX_COMPARISON-v1.2.0.md` — this new required delta report;
- `loadcomposer-v1.2.0-test-bundle.zip` — rebuilt from the corrected source;
- `DELIVERY_MANIFEST-v1.2.0.txt` — regenerated from the final tree;
- `SHA256SUMS-v1.2.0.txt` — regenerated from the final tree.

The outer delivery ZIP is necessarily new. No report unrelated to the visual
correction was changed. `CHANGELOG.md`, `CHANGELOG-v1.2.0.md` and `ROADMAP.md`
remain byte-identical.

## Explicit invariants

Byte-identical to the received candidate:

- `site/index.html` (SHA-256
  `b56be4f08b82dd4a46950043681b22f47d58b94abda615805e466ff6f7974fa1`);
- all seven language catalogs and every Download/operational string;
- standalone HTML (SHA-256
  `b6cb5321e003b58fa4429081b35c2fcdffa849a2e2b089f8781235692988523d`);
- standalone ZIP (SHA-256
  `df8199becf2190428334add7924ecc05ad24ac2a81c3e7fd7a90c7eac5ee699d`);
- all planner algorithms, geometry, coordinates, pallets, equipment,
  thresholds, warnings, results and cache rules;
- Spazio residuo and Caricamento compatto text and logic;
- print/PDF source and all legal files.

Regression evidence confirms `35/35` functional parity, `7,542/7,542`
geometry comparisons with zero differences, `110/110` PDF scenarios and
`47/47` pixel-identical approved raster comparisons.

There were no out-of-scope product decisions and no source deletions.
