# Test report — LoadComposer v1.2.1 final-polish candidate

Date: 2026-08-14  
Status: PASS locally; definitive pre-release candidate, not yet tagged or published

## Input admission

- Required input candidate SHA-256:
  `d2d3c06e50bbd867d624623dbcc846331dab79ac448c5671f6602c15a7231c66`.
- Actual ZIP SHA-256: exact match.
- ZIP integrity and single root `delivery-v1.2.1/`: PASS.
- Input inventory: `791` files.
- Input manifest: `789/789` hashes and byte sizes PASS.
- Input checksum list: `790/790` hashes PASS, including the manifest.

## Authorized final polish

The version remains exactly `v1.2.1`. The only product-facing changes are:

1. the generic secondary-page square mark was replaced on Download, Legal and
   404 by one identical compact LoadComposer lockup;
2. the compact lockup is generated from the exact existing
   `loadcomposer-mobile-day.svg` and `loadcomposer-mobile-night.svg` assets used
   by the Main branding, preserving the LC pixel symbol and outlined
   Load/Composer wordmark;
3. the 404 status number changed from a 16 px eyebrow to a responsive
   `48–64 px` visual status while the localized “Page not found” text remains
   the only H1;
4. the 404 actions now use one full primary row followed by two equal
   secondary actions on desktop, and three full-width stacked actions on small
   viewports.

No payoff, version badge, new logo, new color, remote asset, new translation,
functional behavior or route was introduced. The SVGs are inlined at build
time from the two canonical local assets, preserving direct `file://` use and
nested 404 robustness without runtime requests.

## Branding verification

| Area | Result |
|---|---:|
| Canonical logo assets | day/night hashes exact and unchanged |
| Secondary-page lockup identity | exact day/night SVG injected once on each of 3 pages |
| Compact size | `170 × 40.1 px` desktop; `150 × 35.4 px` at 320 px |
| Responsive matrix | `21/21` dark scenarios across 3 pages × 7 widths PASS |
| Light-mode matrix | `3/3` PASS |
| Header overlap/overflow | zero at 2560, 1920, 1366, 1024, 768, 390 and 320 px |
| Runtime dependencies | zero remote requests; self-contained SVG markup |
| Visual comparison | Main + Download + Legal + 404 dark, and 3 secondary pages light reviewed |

The Main retains the full hero brand, payoff and version badge. Download,
Legal and 404 use the same restrained compact mark/wordmark without payoff or
header badge.

## 404 verification

| Area | Result |
|---|---:|
| Language/theme semantics | `7 × 3 = 21/21` PASS |
| Responsive viewports | `8/8` PASS |
| Nested missing routes | `4/4` PASS with real HTTP `404` |
| Status prominence | computed `48–64 px`, teal, bold; H1 unchanged |
| Desktop actions | full-width primary above 2 equal secondary actions PASS |
| Mobile actions | 3 ordered full-width stacked targets PASS |
| No-script fallback | English title, description and Home action visible PASS |
| Accessibility | landmarks, one H1, aria-hidden visual status, localized labels, focus and ≥44 px targets PASS |
| SEO/cache | `noindex,follow`, `no-store`, no sitemap entry, no redirect PASS |
| Runtime | zero significant console errors and zero remote requests |

Visual evidence covers the required Italian, English and German desktop cases,
all required 404 responsive sizes from `2560×1440` to `320×568`, and the
compact-brand comparisons in both approved themes.

## Protected-area invariance

- `site/index.html` remains byte-identical:
  `7d802b95af70433b75a4267538c40fcb03705d54689e7b67fb75ce98fef0cdac`.
- Standalone HTML remains byte-identical:
  `ef89ada8d55a6273c5ae363216a959f7d4f4a369ef2fef8d0a3a9196a5396fb0`.
- Standalone ZIP remains byte-identical:
  `04c8e665de693f31726342bca0b7fea84585bff3a51baf45688e4431b35f150c`.
- All seven canonical logo assets and legal documents are unchanged; each
  public Legal copy remains byte-identical to its canonical source.
- Catalogs remain `7 × 514` with no key or translation delta.
- Planner, inputs, results table, algorithms, geometry, vehicle data, print and
  PDF code are unchanged.
- ROADMAP, routes, cache policy, CSP, sitemap and headers are unchanged.

## Complete regression

| Area | Result |
|---|---:|
| Build | standalone, Legal, package, Download, 404, glossary and assets PASS |
| Syntax | five HTML targets; Node `55/55` PASS |
| Catalogs and glossary | `7 × 514`; every glossary `514/514` PASS |
| Plural source and engine | `45` counted families and synthetic scenarios PASS |
| Quantity rendering / modular i18n | `7/7`; `18/18` PASS |
| Scope guards | v1.2.0, v1.2.1, prior 404 and final-polish guards PASS |
| Main result semantics | `28/28` localized cases and `10/10` viewports PASS |
| Download | `21/21` file scenarios plus `40/40` visual/accessibility PASS |
| Legal | `21/21` language/theme plus `10/10` responsive PASS |
| Remaining space / trailer | `7/7`; `29/29` PASS |
| Cache policy | `3 × 55 = 165/165` PASS |
| Repository runtime | `16/16` HTTP/subfolder/`file://` PASS |
| Visual/responsive | `112/112` PASS |
| Functional parity | `35/35` PASS |
| Equivalent-input geometry | `7,542/7,542`, zero differences |
| Functional regressions | `37/37` PASS |
| XSS | `9/9`, `28` scenarios PASS |
| Events/state | `20/20 + 7/7` PASS |
| Responsive standalone | `9/9` PASS |
| Main PDFs | `33/33` documents, `38` evidence pages PASS |
| Print raster parity | `47/47` pixel-identical PASS |
| Localized PDFs | `35/35` PASS |
| Plural PDFs | `42/42` PASS |
| Total PDF scenarios | `110/110` PASS |
| Repository, hardening and workflow policy | PASS |

The geometry matrix contains `1,080` single-capacity, `4,110` single-load and
`2,352` mixed-load cases. It found zero capacity, coordinate, orientation,
placement or baseline-result differences.

## Environment note

The exact lockfile installed `58` packages offline. npm emitted only the
inherited `http-proxy` configuration deprecation warning. All build and test
commands were executed directly. PDF/print regeneration ran on an isolated
copy of the exact final build to avoid introducing irrelevant binary timestamp
deltas into the delivery. No production URL, Git operation, tag, release,
deployment, Cloudflare, DNS or domain mutation was performed.
