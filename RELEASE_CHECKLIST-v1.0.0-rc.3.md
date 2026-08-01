# Release checklist — LoadComposer v1.0.0-rc.3

Date: 2026-07-31

## Canonical baseline

- [x] RC.2 filename and external SHA-256 matched exactly.
- [x] ZIP was extracted into a new empty directory.
- [x] ZIP integrity and all `181/181` internal hashes verified.
- [x] Standalone package `5/5` hashes verified separately.
- [x] Working copy was created only after baseline admission passed.
- [x] Rejected pre-publication RC.3 files were not used.
- [x] RC.2 remained intact for byte and structural comparison.

## Required RC.3 corrections

- [x] `ci.yml` installs `poppler-utils` after `setup-node` and before `npm ci`.
- [x] CI name, triggers, runner, timeout, actions, Node version, npm cache,
  `npm ci`, `npm test` and real failure propagation are preserved.
- [x] Bug issue-form placeholder is exactly `v1.0.0-rc.3`; no other issue-form
  structure or behavior changed.
- [x] `docs/ARCHITECTURE.md` identifies `v1.0.0-rc.2` as the direct fixture.
- [x] Workflow policy asserts the Poppler step and order without weakening
  existing security controls.

## Frozen application scope

- [x] Current version is coherent in `VERSION`, package metadata, title, badge,
  catalog metadata, standalone, tests, reports and artifact names.
- [x] Normalized modular and standalone HTML are RC.2 byte-identical.
- [x] Seven catalogs differ from RC.2 only in `meta.version` and
  `meta.documentTitle`.
- [x] Functional parity is `35/35`.
- [x] Geometry parity is `7,542/7,542`, with zero differences.
- [x] Print parity is `47/47`, pixel-identical to RC.2.
- [x] Application JavaScript, algorithms, coordinates, UI, responsive behavior,
  translations and print have no functional changes.
- [x] Approved labels are unchanged.

## Legal and standalone controls

- [x] `LICENSE`, `LICENSE.it.md`, and `NOTICE` are byte-identical to RC.2.
- [x] Public legal copies are byte-identical to canonical root documents.
- [x] Standalone HTML/ZIP and both sidecar checksums were regenerated.
- [x] Standalone ZIP contains exactly HTML, `LICENSE`, `LICENSE.it.md`,
  `NOTICE`, `README.txt`, and `SHA256SUMS.txt` below its package root.
- [x] Standalone `5/5` payload hashes verify after clean extraction.
- [x] Standalone `file://` works in seven languages with zero remote requests.

## Complete regression

- [x] Node `22.17.0` and npm `11.9.0` used.
- [x] Clean `npm ci` installed 58 lockfile packages without dependency updates.
- [x] `36/36` Node syntax checks.
- [x] `7 × 451` catalog keys and `18/18` modular i18n scenarios.
- [x] `112/112` visual/responsive scenarios.
- [x] `37/37` functional regressions.
- [x] `9/9` XSS tests and 28 scenarios.
- [x] `20/20` event actions and `7/7` state checks.
- [x] `9/9` responsive viewports.
- [x] `test:print-i18n` executed and passed `33/33` PDFs.
- [x] Every later print test executed: `47/47`, `35/35`, `42/42`.
- [x] Total PDF matrix: `110/110` PASS.
- [x] Root HTTP, repository-subfolder HTTP and standalone `file://` PASS.
- [x] Seven enabled languages, no trackers and zero remote runtime requests.
- [x] Clean test-bundle run ended with `RC3_CLEAN_EXIT=0`.
- [x] Package-integrity reproduction ended with `RC3_INTEGRITY_EXIT=0`.

## Reference and packaging audit

- [x] Every residual RC.1/RC.2 reference was reviewed and classified.
- [x] No obsolete RC.1/RC.2 reference remains.
- [x] Test bundle excludes dependencies, caches, result trees and fixtures older
  than the direct RC.2 baseline.
- [x] Delivery excludes `.git`, `node_modules`, caches, temporary files, secrets
  and credentials.
- [x] Final manifest and all internal delivery hashes verified.
- [x] Final delivery ZIP extracted and verified from its exact bytes.
- [x] Final standalone `5/5`, legal-byte identity and external SHA-256 sealed.

## Pending outside this delivery

- [ ] Actual GitHub Actions runs after the publisher's first push.
- [ ] Cloudflare Pages preview deployment and preview-domain checks.
- [ ] Commit, push, tag, GitHub Release, production deploy, DNS or domain work.

No external publication or repository mutation was performed while preparing
this candidate.
