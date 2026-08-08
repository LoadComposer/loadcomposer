# Changelog

All notable project changes are documented here.

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
