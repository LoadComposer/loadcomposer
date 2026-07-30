# Release checklist — LoadComposer v1.0.0-rc.2

Date: 2026-07-30

## Canonical baseline

- [x] Canonical RC.1 filename and SHA-256 matched exactly.
- [x] ZIP extracted into a new empty directory.
- [x] ZIP integrity and all `159/159` internal hashes verified.
- [x] Baseline full suite finished with exit code `0`.
- [x] RC.1 was not modified retroactively.
- [x] RC.2 test fixtures contain the direct RC.1 baseline only.

## Frozen application

- [x] Version is coherent in title, badge, `VERSION`, package, HTML, catalogs,
  documentation, tests and artifact names.
- [x] JavaScript and operational behavior match RC.1.
- [x] Functional parity is `35/35`.
- [x] Geometry parity is `7,542/7,542`, with zero differences.
- [x] Print parity is `47/47`, pixel-identical to RC.1.
- [x] The only operational-source additions are the legal comment, footer
  links, their localized labels and print-exclusion styling.

## Standalone distribution and legal access

- [x] Primary standalone ZIP and secondary standalone HTML are present.
- [x] HTML and ZIP SHA-256 sidecars are present.
- [x] Standalone package structure contains exactly the required root and files.
- [x] All five standalone payload hashes verify after clean extraction.
- [x] Canonical license/notice files in the package are byte-identical.
- [x] Standalone `file://` works without `lang/` or remote requests.
- [x] `site/legal/` contains seven byte-identical public copies.
- [x] Static legal index uses only local assets.
- [x] Three legal footer links work in all seven languages.
- [x] Legal footer links are absent from print.
- [x] Confirmed licensing, security and privacy addresses are unchanged.

## Node and workflows

- [x] Node `22.17.0` is set in `.nvmrc`, `.node-version` and both workflows.
- [x] Engine range is `^22.17.0 || >=24.0.0`.
- [x] Package manager is npm `11.9.0`.
- [x] `npm ci` completed without `EBADENGINE`.
- [x] No dependency upgrade entered the lockfile.
- [x] Two consolidated workflows use `contents: read`, timeouts, `npm ci` and
  approved actions only.
- [x] No `pull_request_target`, secrets, write permission, ignored failure,
  release, package publication, push or deployment.
- [x] Commands of both workflows were verified locally: PASS.
- [ ] Actual GitHub Actions runs: pending first push by the publisher.

## Complete regression

- [x] `36/36` Node syntax checks.
- [x] `7 × 451` catalog keys and `18/18` modular i18n scenarios.
- [x] `112/112` visual/responsive scenarios.
- [x] `37/37` functional regressions.
- [x] `9/9` XSS tests and 28 XSS scenarios.
- [x] `20/20` event actions and `7/7` state checks.
- [x] `9/9` responsive viewports.
- [x] `110/110` PDF scenarios.
- [x] Root HTTP, repository-subfolder HTTP and standalone `file://`.
- [x] Seven enabled languages and zero remote runtime requests.

## Delivery controls

- [x] Test bundle excludes dependencies, caches and temporary result trees.
- [x] Clean test-bundle `npm ci && npm test` finished with exit code `0`.
- [x] Workflow commands were repeated in a clean local repository.
- [x] Delivery contains required screenshots and representative PDFs.
- [x] Final manifest and SHA-256 controls cover the immutable delivery tree.
- [x] Final ZIP was extracted again and its internal hashes verified.
- [x] Final web, legal page, links, standalone package and `file://` runtime
  were checked from the extracted archive.
- [x] Final outer SHA-256 was calculated only after the last content change.

## Still pending outside this delivery

- [ ] First GitHub push and real Actions execution.
- [ ] Cloudflare Pages preview deployment and preview-domain checks.
- [ ] Production-domain/DNS decisions, tags and releases.

No push, tag, release, deployment, DNS mutation or domain attachment was
performed while preparing this candidate.
