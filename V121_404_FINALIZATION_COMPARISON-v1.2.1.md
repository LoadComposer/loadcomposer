# v1.2.1 candidate → definitive v1.2.1 404 finalization

Date: 2026-08-14  
Input SHA-256: `c2ef52af6f8db9e5b40db20110f1623b0884e79a173aa8c2df47e07e02dc58e9`

## Page-shell audit

Exactly four public page shells exist under `site/`: Main (`index.html`),
Download (`downloads/index.html`), Legal (`legal/index.html`) and custom 404
(`404.html`). The four other HTML files are versioned standalone application
artifacts. Seven files in `site/legal/` are raw legal documents. Print and
schema views are generated inside the planner at runtime. Assets, catalogs,
robots, sitemap, headers and redirects are technical files. No additional or
hidden site shell was found.

## Classified delta

- **A — 404 authored source:** new compact secondary-page template and generated
  `site/404.html`.
- **B — necessary i18n:** five exact `404.*` keys in each of seven catalogs.
- **C — build/template:** new deterministic 404 builder and package build step.
- **D — tests:** 404 semantic/visual/responsive/nested/fallback coverage,
  pre-404 standalone fixture, exact scope guard and updated count/hardening
  assertions.
- **E — report/manifest/checksum:** changelog, checklist, test/comparison report
  and regenerated delivery controls.
- **F — generated artifacts:** `514`-row glossaries, standalone HTML/ZIP and
  sidecars, Download output with updated hashes, 404 screenshots and final test
  bundle/delivery.

The complete before/after path and SHA-256 inventory is in the external final
report and the delivery manifest/checksum list.

## Protected areas

| Area | Result |
|---|---|
| Main | byte-identical to input candidate |
| Download | template/content/behavior identical; generated output only reflects final standalone hashes |
| Legal | template, builder and generated page byte-identical |
| Planner/standalone | only five unused 404 catalog entries added; normalized HTML byte-identical |
| Print/PDF | `110/110` PASS; `47/47` raster outputs pixel-identical |
| Geometry/capacity/results | `7,542/7,542`, zero differences |
| Vehicle/container data | unchanged |
| Seven legal documents | byte-identical |
| ROADMAP | byte-identical |

No functional modification was found in Main, Download, Legal, planner,
geometry, print, PDF, vehicle data or legal-document content.
