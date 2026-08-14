# v1.2.1 definitive candidate → v1.2.1 final polish

Date: 2026-08-14  
Input delivery SHA-256: `d2d3c06e50bbd867d624623dbcc846331dab79ac448c5671f6602c15a7231c66`

## Purpose

This is a same-version, pre-release replacement. It gives Download, Legal and
404 a compact form of the canonical Main brand, increases the visual presence
of the 404 status, and corrects the 404 action hierarchy. No other product
change is authorized or present.

## Canonical brand derivation

The Main already ships four outlined local SVG logo assets. The two existing
no-payoff variants are:

- `site/assets/loadcomposer-mobile-day.svg` — SHA-256
  `c5cec1be899a039c1ad90b7cef686d742b0cbb4fb4c318e918d3e3311a549c5e`;
- `site/assets/loadcomposer-mobile-night.svg` — SHA-256
  `c8634694ffe7ad13a1fcbd48be1a55aa822e4b9032a675d7adf7aafa139750ff`.

Each contains the original `lc-symbol`, `lc-wordmark-load`,
`lc-wordmark-composer` and underline geometry from
`LoadComposer-logo-pack-v1`. The build scripts inject those exact files into
the three page templates. No SVG geometry, path, color, font or logo asset was
invented or modified.

## Approved product delta

| Page | Before | After |
|---|---|---|
| Download | generic square plus bold text | exact compact Main day/night mark + wordmark |
| Legal | generic square plus bold text | exact same compact lockup |
| 404 | generic square plus bold text | exact same compact lockup |
| 404 status | 16 px eyebrow | responsive 48–64 px teal visual status |
| 404 actions | asymmetrical wrapping row | full primary row + two equal secondary actions |
| 404 mobile | incidental flex wrapping | explicit three-button full-width stack |

The compact logo is 170 px wide (about 40.1 px high) on ordinary viewports and
150 px wide (about 35.4 px high) at 320 px. It has no payoff, version badge or
application description.

## Classified delta

- **A — compact branding source:** Download, Legal and 404 templates plus the
  three deterministic page builders that inject the exact canonical SVGs.
- **B — Download generated page:** compact header only; content, hierarchy,
  controls, checksums and footer unchanged.
- **C — Legal generated page:** compact header only; card, copy, links,
  contacts, width and footer unchanged.
- **D — 404 source/generated:** compact header, status size and action grid
  only; copy, i18n, themes, fallback, cache/SEO and routing unchanged.
- **E — tests/evidence:** final-polish brand/action test, updated exact scope
  guard and comparative/responsive screenshots.
- **F — reports/package controls:** same-version changelog note, checklist,
  test/comparison/final reports, test bundle, manifest and checksum list.

## Protected areas

| Area | Result |
|---|---|
| Main | byte-identical to input (`7d802b95…0cdac`) |
| Standalone HTML | byte-identical (`ef89ada8…96fb0`) |
| Standalone ZIP | byte-identical (`04c8e665…50c`) |
| Catalogs/i18n | no key or value changes; `7 × 514` |
| Download content/function | unchanged outside compact header |
| Legal content/function | unchanged outside compact header |
| Legal documents | all seven canonical/public pairs byte-identical |
| Planner/results table | unchanged |
| Algorithms/geometry/vehicles | unchanged; `7,542/7,542` parity |
| Print/PDF | unchanged; `110/110`, raster `47/47` pixel-identical |
| Routes/cache/CSP/sitemap | unchanged |
| ROADMAP | byte-identical |

## Visual and runtime result

- Secondary brand: `21/21` required dark responsive cases plus `3/3` light
  cases, zero overlap/overflow and identical dimensions across the three pages.
- 404: `21/21` language/theme, `8/8` responsive and `4/4` nested routes PASS.
- Download: `21/21` file-mode plus `40/40` focused visual/accessibility PASS.
- Legal: `21/21` language/theme plus `10/10` responsive PASS.
- All inspected pages make zero automatic remote requests.

The final comparison communicates the intended hierarchy: the Main remains the
full brand hero; Download, Legal and 404 unmistakably belong to the same
product but use a compact secondary-page identity.
