# Release checklist — LoadComposer v1.0.0 private candidate

Date: 2026-08-08

## Admission and version

- [x] Canonical RC.4 base SHA-256
  `a9357a18384f95e09dcc3bd8c48c5fab78ea31468671c2e694021d5f2bb0a7bd`.
- [x] Base ZIP integrity, one root, traversal and symlink checks PASS.
- [x] Base `202` files, `200/200` manifest rows and `201/201` checksums.
- [x] Base test bundle: `191` files, SHA-256
  `d96006fd9665130726185cb8c9574f51cd27631ae2c3db3295fca81e0b9406e2`.
- [x] Base standalone HTML and ZIP hashes verified; internal `5/5` PASS.
- [x] RC.3, repository checkout, published downloads and rejected candidates
  excluded as software inputs.
- [x] Current version is exactly `1.0.0` / `v1.0.0` by context.
- [x] RC.4 references remain only historical, fixture, baseline or comparison references.

## Frozen scope

- [x] RC.4 fixture contains exactly ten canonically hashed files.
- [x] Modular and standalone sources are byte-identical after version-only normalization.
- [x] Seven catalogs retain exactly `456` keys and differ only in version metadata.
- [x] All twelve vehicle profiles, all pallet presets, container data, algorithms,
  coordinates, results, UI, themes, responsive behavior and printing are unchanged.
- [x] Trailer dimensions and prudential precedence remain exact.
- [x] `29/29` trailer checks and required 33/34 EUR scenarios PASS.
- [x] No new function, language, equipment profile, backend, analytics or PWA added.

## Hosting, legal and localization

- [x] Exactly seven languages; no catalog-key addition or deletion.
- [x] LICENSE/NOTICE six-copy identity `6/6` PASS.
- [x] Contributor Covenant 2.1 and `conduct@loadcomposer.com` preserved.
- [x] LICENSE and NOTICE inline behavior preserved.
- [x] Cache policy `3 × 36 = 108/108` PASS, including the clean URL.
- [x] `site/downloads/index.html` absent; exactly four stable artifacts present.
- [x] `site/404.html` byte-identical to RC.4 and `no-store` preserved.
- [x] Strict local HTTP route matrix `13/13` PASS.
- [ ] Verify real stable Cloudflare status, redirect and headers after push.

## Complete verification

- [x] Node `22.17.0` and npm `11.9.0` used.
- [x] Final source and clean-bundle `npm ci` PASS; `58` packages each.
- [x] Final source and clean-bundle complete `npm test` PASS.
- [x] Visual `112/112`, functional `35/35`, geometry `7,542/7,542`,
  regression `37/37`, XSS `9/9`, events/state `20/20 + 7/7`, responsive `9/9`.
- [x] PDF blocks `33/33 + 47/47 + 35/35 + 42/42 = 110/110` PASS.
- [x] Every test after `test:print-i18n` executed in both complete final runs.
- [x] Repository, runtime, hardening, workflow, cache and legal audits PASS.
- [x] Package integrity reproduction PASS with `NO_COMMIT_PRESENT`.

## Packaging and publication boundary

- [x] Final test bundle contains `203` files and excludes delivery-only reports,
  controls, `.git`, `node_modules`, caches, results, secrets and nested bundles.
- [x] Delivery controls use N−2 manifest and N−1 checksum coverage with no cycle.
- [x] No commit, push, merge, tag, GitHub Release, deploy, Cloudflare, DNS,
  domain, redirect or Email Routing mutation performed.
- [ ] Private independent verification and final approval remain pending.
