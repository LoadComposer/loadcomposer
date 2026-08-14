# Canonical v1.2.0 → v1.2.1 comparison

Date: 2026-08-14  
Baseline SHA-256: `ac4041e9ef6f06ba7e6dee156c2f9bff7a3420964bfb6cacff7066975ffdfc42`

## Initial visual audit

Main already defined the product system: system font, light background
`#F4F5F2`, white/card surface `#FFFFFF`, secondary surface `#F1F5F3`, text
`#13272F`, muted text `#52656C`, border `#D2DCD8`, accent `#0D7C75`, hover
`#096C66`, accent-soft `#DDF3F0`; dark background `#050D16`, card
`#0D1B27`, secondary `#122330`, text `#E2E9EC`, muted `#AAB7BE`, border
`#263B4A`, accent `#3BC0B5`, hover `#4ACBC0`, accent-soft `#102F33`, focus
`#60D5CB` and primary text `#03181D`. Main used a `1280 px` shell, a
`430 px` input column and a `790 px` table minimum.

Download had the approved two-card hierarchy and responsive behavior but local
color values differed slightly. Legal used a separate, oversized centered-logo
presentation with no product language/theme controls. Download and Legal kept
local CSS by design; a new shared architecture would have exceeded this patch.

## Intentional delta classification

- **A — authored source intentional:** controlled Main width/table/result-copy
  changes; local Download token alignment; new Legal shell/template and Legal
  build adaptation.
- **B — translated/generated:** seven `514`-key catalogs, generated Legal and
  404 shells, glossaries, Download, standalone and release assets.
- **C — tests:** canonical v1.2.0 fixture, exact scope guard, Main/Download/Legal
  visual and semantic coverage, and authorized updates to inherited UI tests.
- **D — version/release metadata:** VERSION, package metadata, changelogs,
  README/docs, release reports, headers, sitemap, issue template and delivery
  controls.
- **E — generated artifacts:** v1.2.1 standalone HTML/ZIP/sidecars, OG asset,
  screenshots, result JSON, PDFs, test bundle and final delivery.

The complete path/SHA inventory is carried by `DELIVERY_MANIFEST-v1.2.1.txt`
and `SHA256SUMS-v1.2.1.txt`; the external final report lists every modified,
new and deleted path against the canonical baseline.

## Protected categories

| Category | Result |
|---|---|
| Algorithms | no unauthorized function change; PASS |
| Geometry and placements | `7,542/7,542`, zero differences |
| Vehicle/container data | canonical source slice byte-identical |
| Seven public legal documents | byte-identical |
| Print engine | function source byte-identical; `47/47` raster parity |

No protected-category modification was found.

The definitive pre-publication candidate also aligns the custom 404 with the
same secondary-page system. This adds only five 404-specific keys and does not
alter the v1.2.1 application scope described above.
