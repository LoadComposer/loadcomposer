# Release checklist — LoadComposer v1.0.0-rc.4 private candidate

Date: 2026-08-03

## Admission and version

- [x] Canonical RC.3 SHA exact; ZIP, root, traversal and symlink checks PASS.
- [x] RC.3 delivery `183/183` and standalone `5/5` PASS.
- [x] DOCX SHA exact and used only as an external dimensional source.
- [x] Rejected RC.4 artifacts excluded as inputs.
- [x] Version remains exactly `1.0.0-rc.4`.

## Profiles and warnings

- [x] Curtain: nominal `13,620 × 2,480 × 2,650`; prudential
  `13,600 × 2,450 × 2,600` mm.
- [x] Mega: nominal `13,620 × 2,480 × 3,000`; prudential
  `13,600 × 2,450 × 2,900` mm.
- [x] Standard single-temperature reefer: nominal
  `13,310 × 2,460 × 2,650`; prudential `13,300 × 2,460 × 2,600` mm.
- [x] Truck legacy min/max fields removed; Mega operational 2,845/3,200 removed.
- [x] Per-axis prudential precedence is structural and synthetic-fixture tested.
- [x] Legacy conservative warnings remain active for 20' and 40' HC reefers.
- [x] One badge/panel/message per prudential warning; print and standalone do
  not duplicate it.
- [x] `29/29` targeted checks and all required 33/34 EUR cases PASS.

## Hosting, legal and localization

- [x] Seven catalogs, each with 456 aligned keys; no eighth language.
- [x] Six LICENSE/NOTICE copies match canonical RC.3 hashes byte for byte.
- [x] LICENSE and NOTICE links have no download attribute and exact inline headers.
- [x] Cache-Control rules are non-overlapping across 105 evaluations.
- [x] Contributor Covenant 2.1 uses `conduct@loadcomposer.com`.
- [x] `site/downloads/index.html` absent; exactly four RC.4 artifacts present.
- [x] 404 page, redirects, robots, legal substance, logos and container profiles
  outside the authorized changes are unchanged.

## Complete verification

- [x] Node 22.17.0 and npm 11.9.0 used.
- [x] Source and clean-bundle `npm ci` PASS; 58 packages.
- [x] Source and clean-bundle complete `npm test` PASS.
- [x] `112/112` visual, `35/35` functional, `7,542/7,542` geometry,
  `37/37` regression, `9/9` XSS, `20/20 + 7/7` events/state.
- [x] `33/33`, `47/47`, `35/35`, `42/42`; total `110/110` PDF scenarios.
- [x] Repository, hardening, workflow, cache and legal-inline audits PASS.
- [x] Package-integrity workflow reproduction PASS with no commit.

## Packaging

- [x] Test bundle excludes `.git`, `node_modules`, DOCX, result trees,
  delivery archives, rejected artifacts, secrets and nested bundles.
- [x] Delivery has one root and excludes the same forbidden inputs.
- [x] DELIVERY_MANIFEST contains N-2 real hash rows and excludes exactly both
  control files.
- [x] SHA256SUMS contains N-1 real hash rows, excludes exactly itself and hashes
  the manifest; complete `sha256sum -c` PASS.
- [x] No circular checksum dependency.

## Not performed

- [ ] Commit, push, merge, pull request or tag.
- [ ] GitHub Release or source archive publication.
- [ ] Cloudflare deploy, DNS/domain/redirect or Email Routing change.
- [ ] Final approval or public-release declaration.
