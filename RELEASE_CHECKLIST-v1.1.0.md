# Release checklist — LoadComposer v1.1.0 private candidate

Date: 2026-08-11

## Admission and version

- [x] Canonical v1.0.0 delivery SHA-256 is
  `7d0798a2dcb228eb93a26d77e4e24dd3ef0f1d40df38df8c33155d3c7872f4f2`.
- [x] Base ZIP integrity, one-root, duplicate, traversal and symlink checks PASS.
- [x] Base `214` files, `212/212` manifest rows and `213/213` checksums PASS.
- [x] Only the verified `delivery-v1.0.0/` tree was used as software input.
- [x] Current version is exactly `1.1.0` / `v1.1.0` by context.
- [x] Historical v1.0.0 and RC fixture identifiers remain historical.

## Community-feedback scope

- [x] Existing GitHub repository icon and destination are preserved.
- [x] Two localized text links point exactly to GitHub Discussions and the
  existing `bug.yml` issue form.
- [x] Both links use `target="_blank"` and `rel="noopener noreferrer"`.
- [x] Keyboard focus, contrast, 320 px containment and GitHub-icon separation PASS.
- [x] Exactly three keys were added to all and only the seven enabled catalogs:
  `footer.linksAria`, `footer.suggestions`, `footer.reportIssue`.
- [x] Catalog parity is `7 × 459` keys; Polish, Turkish, Simplified Chinese and
  Arabic remain disabled.
- [x] No local form, backend, personal-data collection, analytics, tracking, or
  required remote runtime dependency was added.
- [x] The standalone contains the same links and works through `file://`.

## Frozen behavior

- [x] Stable fixture contains exactly ten canonically hashed v1.0.0 files.
- [x] Scope audit permits only version metadata and the three footer keys/links.
- [x] All twelve equipment profiles, pallet presets, dimensions, algorithms,
  geometry, coordinates, thresholds, status results, canvas and printing are unchanged.
- [x] Functional parity `35/35` and equivalent-input geometry
  `7,542/7,542`, zero differences.
- [x] Trailer and warning matrix `29/29`, including all required 33/34 EUR cases.
- [x] No future roadmap item was implemented or assigned to a fixed release.

## Complete verification

- [x] Exact Node `22.17.0` and npm `11.9.0` used.
- [x] Final source and immutable test-bundle clean `npm ci`: `58` packages each.
- [x] Final source and clean test-bundle complete `npm test`: exit `0` each.
- [x] Visual `112/112`, regression `37/37`, XSS `9/9`, events/state
  `20/20 + 7/7`, responsive `9/9`.
- [x] PDF scenarios `33/33 + 35/35 + 42/42 = 110/110` PASS, plus
  `47/47` pixel-identical approved raster comparisons.
- [x] Cache `126/126`, legal identity `6/6`, runtime `16/16`, hardening,
  repository and workflow-policy audits PASS.
- [x] Package-integrity reproduction PASS with `NO_COMMIT_PRESENT` and no drift.

## Packaging and publication boundary

- [x] Test bundle contains `234` files under one
  `loadcomposer-v1.1.0-test-bundle/` root; SHA-256
  `78d32b76d5a0bc63e8b45cdc53f4055369f1b7be774d1898b9011f33eda07e1b`.
- [x] Final delivery contains `245` files; manifest `243 = N−2`; checksum list
  `244 = N−1`, with the manifest included in the checksum list.
- [x] Standalone ZIP internal payload verification is `5/5`.
- [x] No commit, push, merge, tag, GitHub Release, deployment, Cloudflare, DNS,
  domain, redirect or Email Routing mutation was performed.
- [ ] Real online status, redirects, headers, caches and custom-404 behavior
  require authorized post-deployment verification.
- [ ] Independent private review and final approval remain pending.
