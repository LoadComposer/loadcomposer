# Changelog

All notable project changes are documented here.

## [1.3.4] — 2026-08-27

### Added

- Added Dark Reader's documented website opt-out marker,
  `<meta name="darkreader-lock">`, to every current HTML entry point that uses
  LoadComposer's native theme system, including the standalone planner.
- Added a current-version regression covering tag placement and uniqueness,
  native Auto/Light/Dark behavior, historical standalone integrity, and the
  absence of remote or extension-specific runtime workarounds.

### Unchanged from v1.3.3

- Native theme logic, palette, logos, Legal UX and sources, solver geometry,
  pallet coordinates, status semantics, print behavior, and standalone
  functionality are unchanged.
- No detection, CSS, JavaScript, or compatibility workaround was added for any
  other browser color-transforming extension.

## [1.3.3] — 2026-08-26

### Added

- Added static, LoadComposer-styled pages for all public legal documents.
- Added a governing-English/informational-Italian license selector and an
  in-page table of contents generated from the existing license headings.

### Changed

- Updated the Legal hub and application footer to keep normal legal-document
  navigation inside the styled site experience.
- Improved long-form legal readability and navigation while preserving every
  canonical legal source byte-identically.

### Unchanged from v1.3.2

- Geometry, capacity, pallet coordinates, mixed-orientation search,
  front-compaction, vehicle and pallet data, units, status semantics, themes,
  and print behavior are unchanged.
- No Dark Reader, SEO/Discovery, analytics, advertising, Quick Entry, new
  legal wording, or new legal-body translation work is included.

## [1.3.2] — 2026-08-25

### Fixed

- Fixed a placement limitation where one pallet group could miss valid floor
  layouts requiring different 90° orientations within the same load.
- Added a bounded deterministic mixed-orientation search that can discover
  local interlocking arrangements while preserving the established row and
  column heuristics as the unchanged first choice.
- Added permanent regression, geometry-delta, rotation-constraint,
  determinism, standalone, print/schema, and performance coverage for the
  corrected placement path.

### Unchanged from v1.3.1

- Vehicle and pallet dimensions, height/access validation, status wording,
  translations except release metadata, native themes, Legal UX, print
  transport, and static-hosting architecture are unchanged.
- No Legal UX or browser-extension/Dark Reader work is included.

## [1.3.1] — 2026-08-22

### Fixed

- Fixed browser print compatibility by printing the operational layout through
  an isolated in-page print frame instead of a temporary browser tab,
  preventing focus/input problems observed in Chromium-based browsers.
- Replaced obsolete popup-blocking guidance with a generic print-dialog error
  message in all seven enabled languages.

### Unchanged from v1.3.0

- Print content, geometry, placement, capacity, units, status semantics,
  vehicle and pallet data, native themes, and legal documents are unchanged.
- No browser-extension or Dark Reader compatibility changes are included.

## [1.3.0] — 2026-08-14

### Added

- Added a global `mm` / `cm` / `in` preference in the load-data panel, with
  native radio semantics, keyboard/touch support, visible focus, and
  persistence under `loadcomposer.unit`.
- Added locale-aware decimal presentation, point/comma parsing, one-time
  normalisation to integer millimetres, protected invalid-edit switching, and
  canonical round-trip behaviour.
- Applied the selected unit to every operational linear input and output,
  including custom pallets, gaps, vehicle dimensions, remaining space,
  warnings, preview labels, and print/PDF.

### Changed

- Presents Total volume as `m³` for metric `mm`/`cm` and `ft³` for imperial
  `in`, without changing the canonical volume calculation.
- Clarified Single and Mixed requested-load, found-capacity, loaded-count,
  free-slot, and does-not-fit wording in all seven languages.
- Standardised “Rear opening” terminology and limited highest-pallet detail to
  access or height warnings.
- Removed repeated load totals from operational print/PDF summaries and shows
  floor/layer detail only when stacking makes it informative.
- Finalized the result status system: the localized FITS/DOES NOT FIT pair is
  reserved for the final outcome, while load/capacity and access controls use
  state-only OK/PARTIAL/NOT OK/VERIFY badges with green/amber diagnostics and
  red reserved for a negative final verdict.
- Shows zero free slots explicitly when Single capacity equals the request, in
  both the table and operational print output.
- Presents metric-native pallet presets directly in mm or cm, presents imperial-native
  commercial identities exactly in inches, and adds only a working-unit conversion
  when crossing metric/imperial systems.
- Applies documented prudential auto-OK access-height references only to the 13.60 m
  curtain, Mega, and reefer profiles; heights above the reference but inside internal
  geometry remain VERIFY, and internal geometry, door data, and capacity are unchanged.

### Unchanged from v1.2.1

- Geometry, placement, capacity, coordinates, pallet/vehicle data, thresholds,
  canonical volume calculation, weight handling, and all canonical outcomes remain unchanged; the engine
  still receives and returns integer millimetres only.
- Industrial preset labels, vehicle names, secondary-page layouts, and the
  seven canonical legal documents remain protected.

## [1.2.1] — 2026-08-14

### Changed

- Aligned the Download and Legal page palettes, typography, controls, and
  secondary-page footer treatment with the main application.
- Replaced the standalone Legal presentation with a localized secondary-page
  shell supporting the seven enabled languages and the shared automatic,
  light, and dark theme preference.
- Increased the controlled desktop application shell from 1280 px to 1520 px
  while retaining the approximately 430 px load-data panel.
- Simplified the result table to five columns, removed only the repeated
  per-vehicle Weight column, and retained the upper Weight — N/A summary.
- Reworded Load / capacity and access details with concise localized ratios,
  free-slot or missing-pallet messages, and stacking-only floor-position data.
- Added a sticky Vehicle column when internal table scrolling is needed.
- Aligned the custom 404 with the approved secondary-page shell, seven-language
  preference and automatic/light/dark theme behavior while retaining a compact
  no-script fallback, root-relative recovery links, `noindex` and `no-store`.
- Replaced the generic Download, Legal and 404 header mark with the compact
  no-payoff lockup derived from the canonical Main LC symbol and outlined
  LoadComposer wordmark.
- Increased the visual prominence of the 404 status and arranged recovery
  actions as one primary row above two equal secondary actions, with an
  explicit full-width mobile stack.

### Unchanged from v1.2.0

- Single and mixed algorithms, geometry, capacities, placement, stacking,
  pallet and vehicle data, prudential thresholds, residual-space semantics,
  preview, print and PDF output.
- The seven canonical legal documents, which remain byte-identical.
- Routes, cache philosophy, CSP, offline behavior, and all v1.0.0, v1.1.0 and
  v1.2.0 versioned download artifacts.

## [1.2.0] — 2026-08-12

### Added

- Added a localized, responsive `/downloads/` page that clearly recommends the
  online planner when Internet is available and presents the offline HTML as
  the simplest option for computers that must remain offline.
- Added exact v1.2.0 standalone HTML/ZIP downloads, deterministic SHA-256
  display, a GitHub Releases link, theme controls, seven-language support, and
  a localized Download link in the application footer.

### Changed

- Renamed the user-facing layout-clearance wording to the natural equivalent
  of “Remaining space” in all seven enabled languages, in both the application
  and operational print output.
- Simplified the compact-loading message to state the remaining free length
  directly and removed the visible per-row allowance calculation.
- Recorded side loading as a future roadmap item without implementing geometry,
  vehicle openings, access rules, or controls.

### Unchanged from v1.1.0

- Single/mixed algorithms, capacities, thresholds, compact-loading activation,
  spare-space calculations, coordinates, pallet/equipment data, themes,
  security boundaries, legal terms, and offline planner behaviour.

## [1.1.0] — 2026-08-11

### Added

- Added localized **Suggestions** and **Report a problem** links to the application footer in all seven enabled languages.
- Routed preliminary ideas and questions to GitHub Discussions and reproducible defects to the existing GitHub bug-report form.

### Unchanged from v1.0.0

- Loading algorithms, geometry, coordinates, pallet and equipment data, prudential thresholds, operational results, themes, responsive application layout, printing, PDF output, security boundaries, legal terms, and cache semantics.
- Offline and `file://` planner operation; the two optional GitHub links require connectivity only when opened.

## [1.0.0] — 2026-08-08

### Changed

- Promoted the verified `v1.0.0-rc.4` candidate to the first stable release.
- Renamed current standalone, test-bundle, report, manifest, checksum, glossary,
  and Open Graph artifacts from RC.4 to `v1.0.0`.
- Promoted the five exact versioned Cache-Control paths, including the clean
  standalone URL, from RC.4 to `v1.0.0`.

### Unchanged from v1.0.0-rc.4

- Application behavior, algorithms, geometry, coordinates, results, pallet and
  equipment data, trailer prudential thresholds, UI, themes, responsive
  behavior, print output, security behavior, and operational translations.
- License and legal-document content, the custom 404 page, inline LICENSE and
  NOTICE handling, and the absence of a `/downloads/` index page.

### Verification

- Direct RC.4 functional parity: `35/35`; equivalent-input geometry:
  `7,542/7,542`, zero differences.
- Trailer/warning scenarios: `29/29`, including all required 33/34 EUR cases.
- Full source and clean-bundle `npm test`: PASS under Node 22.17.0 and npm
  11.9.0, including all `110/110` PDF scenarios.

## [1.0.0-rc.4] — 2026-08-03

### Changed

- Promoted release metadata and generated artifacts from RC.3 to RC.4.
- Updated the three 13.60 m trailer profiles with separate nominal and
  prudential dimensions; the standard single-temperature reefer uses a
  loadable length of 13,310 mm.
- Added one inclusive `VERIFICA MISURE` warning when a used dimension reaches
  its prudential reference without exceeding the nominal limit.
- Preserved the legacy conservative warning only for profiles without a
  prudential value on the same axis, preventing duplicate warnings.
- Added the five necessary warning translations to all seven catalogs.
- Made LICENSE and NOTICE open inline and separated mutable, 404 and immutable
  download cache rules.
- Added Contributor Covenant 2.1 with `conduct@loadcomposer.com` enforcement.

### Verification

- Direct RC.3 functional parity: `35/35`; equivalent-input geometry:
  `7,542/7,542`, zero differences.
- Trailer/warning scenarios: `29/29`, including the 19 overlap and precedence
  checks and the required 33/34 EUR cases.
- Full source and clean-bundle `npm test`: PASS under Node 22.17.0 and npm
  11.9.0, including all `110/110` PDF scenarios.
- Delivery controls use unambiguous N-2 manifest and N-1 checksum-list
  coverage with no circular checksum dependency.

## [1.0.0-rc.3] — 2026-07-31

### Fixed

- Added a static `site/404.html` so nonexistent Cloudflare Pages routes no
  longer fall back to the main application. The page is `noindex,follow`, uses
  only approved local assets, and does not redirect.
- GitHub Actions CI now installs `poppler-utils` after Node setup and before
  `npm ci`, making `pdfinfo`, `pdftotext`, and `pdftocairo` available to the
  complete PDF test chain on `ubuntu-latest`.
- The bug-report version placeholder now identifies `v1.0.0-rc.3`.
- The architecture document now identifies `v1.0.0-rc.2` as the direct
  application and print-evidence baseline.

### Changed

- Current release identifiers, catalog version metadata, generated glossaries,
  documentation, reports, tests, fixtures, and artifact names now use
  `v1.0.0-rc.3` where they describe the candidate itself.
- Regression fixtures and print parity now compare directly from canonical
  `v1.0.0-rc.2` to `v1.0.0-rc.3`.

### Unchanged from v1.0.0-rc.2

- Application JavaScript, algorithms, geometry, capacity, load layouts, mixed
  layouts, coordinates, results, labels, UI, translations other than version
  metadata, responsive behavior, and print output.
- `LICENSE`, `LICENSE.it.md`, `NOTICE`, legal terms, permissions, distribution
  model, and confirmed project email addresses.
- Workflow triggers, read-only permissions, runner, timeout, pinned actions,
  Node.js version, npm cache, `npm ci`, and failure-propagating `npm test`.
- The four standalone download artifacts, `robots.txt`, `sitemap.xml`,
  `_headers`, `_redirects`, and the existing legal page.

## [1.0.0-rc.2] — 2026-07-30

### Added

- Primary standalone ZIP containing the offline HTML, controlling license,
  informational Italian translation, notice, concise readme, and five internal
  SHA-256 checksums.
- Public `site/legal/` index and seven byte-identical legal-document copies.
- Three localized legal links in the application footer.
- `.nvmrc`, `.node-version`, Node engine constraint, and npm package-manager
  metadata for the verified Node.js 22.17.0 baseline.
- Local workflow-policy, distribution-hardening, standalone-package, legal-copy,
  link, and checksum audits.
- First GitHub push and Cloudflare Pages preview checklists.

### Changed

- Primary offline download now points to
  `loadcomposer-v1.0.0-rc.2-standalone.zip`; the HTML-only file remains a
  secondary download.
- GitHub Actions are consolidated into complete CI and deterministic
  distribution checks, with read-only permissions and Node 22.17.0.
- Version identifiers, catalog metadata, generated glossaries, documentation,
  reports, tests, and artifact names now use `v1.0.0-rc.2`.

### Unchanged from v1.0.0-rc.1

- Algorithms, geometry, capacity, load layouts, mixed layouts, operational
  results, status labels, diagrams, application JavaScript, palette, controls,
  responsive behavior, and print output.
- Substantive legal terms, rights, restrictions, owner, applicable law, forum,
  license identifier, commercial conditions, and confirmed project email
  addresses.

## [1.0.0-rc.1] — 2026-07-29

### Added

- Repository-ready legal and community documentation under `LCCL-1.0`.
- Production static-site structure in `site/`, including local metadata assets,
  Cloudflare Pages headers and redirects, robots policy, and sitemap.
- GitHub issue forms, pull-request template, and CI/package-integrity workflows.
- Repository, legal, Cloudflare, privacy, no-tracker, no-remote-resource,
  root/subfolder HTTP, and standalone `file://` audits.
- Reproducible release documentation, screenshots, print evidence, checksums,
  manifest, and test bundle.

### Changed

- Version identifiers, document metadata, package metadata, and artifact names
  use `v1.0.0-rc.1`.
- Official project links use `https://loadcomposer.com/` and
  `https://github.com/LoadComposer/loadcomposer`.

### Unchanged from v0.9.0-alpha.7

- Application behavior, calculations, geometric layouts, capacity and
  mixed-load logic.
- User-facing operational text other than the version identifier.
- Seven translations, responsive interface, palette, diagrams, status labels,
  print layout, and standalone behavior.

## [0.9.0-alpha.7]

Canonical historical baseline for the first release candidate.
