# Changelog

All notable project changes are documented here.

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
