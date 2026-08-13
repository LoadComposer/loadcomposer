# Release checklist — LoadComposer v1.2.0 corrected private candidate

Date: 2026-08-13

## Admission and scope

- [x] Received candidate SHA-256 is
  `a3fef2b6898ae2aacfc9732edddcd226cda7ce82fc935d8ee232829fb0ece78f`.
- [x] Input ZIP integrity, one-root, duplicate, traversal and symlink checks PASS.
- [x] Input `281` files, `279/279` manifest rows and `280/280` checksums PASS.
- [x] Version remains exactly `1.2.0` / `v1.2.0`.
- [x] Only Download-page badge hierarchy and dark-mode ZIP contrast changed.
- [x] Desktop cards remain side by side; responsive stacking and unequal card
  heights remain intentional.
- [x] All copy, translations, Download logic, integrity hashes, routes, cache,
  sitemap and external links remain unchanged.
- [x] Home, planner, Spazio residuo, Caricamento compatto, standalone, print,
  PDF, legal, Community links and roadmap remain unchanged.

## Visual and accessibility correction

- [x] Recommended is a filled teal badge in light and dark themes.
- [x] Offline remains an outlined secondary badge in light and dark themes.
- [x] ZIP remains a secondary outline control and is clearly active/readable in
  dark mode.
- [x] ZIP normal, hover, keyboard focus and active states all pass contrast and
  visible-state checks.
- [x] HTML remains the primary offline action; hover and keyboard focus pass.
- [x] Base Download matrix `21/21`; focused matrix `24/24`; eight screenshots
  reviewed; zero overflow, overlap, console errors or automatic remote requests.
- [x] Recommended contrast is `5.47:1` light / `9.31:1` dark; ZIP dark text is
  `13.66:1` and its border is `8.73:1`.

## Frozen behavior and complete verification

- [x] Scope audit keeps algorithms byte-equivalent to the canonical v1.1.0
  fixture (`10/10` hashes).
- [x] Functional parity is `35/35`; geometry is `7,542/7,542` with zero differences.
- [x] Remaining-space fixture is `7/7`; trailer matrix is `29/29`.
- [x] Final source and immutable test-bundle clean `npm ci`: `58` packages each.
- [x] Final source and exact test-bundle complete `npm test`: exit `0` each.
- [x] Runtime `16/16`, visual/responsive `112/112`, regressions `37/37`, XSS
  `9/9`, events/state `20/20 + 7/7`, responsive runtime `9/9` PASS.
- [x] PDF scenarios `33/33 + 35/35 + 42/42 = 110/110` PASS.
- [x] Approved raster matrix `47/47` remains pixel-identical.
- [x] Cache `147/147`, legal identity, hardening, repository and workflow-policy
  audits PASS.
- [x] Package-integrity reproduction PASS with `NO_COMMIT_PRESENT` and no
  generated-file drift.

## Packaging and publication boundary

- [x] Test bundle contains `270` files under one
  `loadcomposer-v1.2.0-test-bundle/` root; SHA-256
  `e0fed0ec8b5bedaaeeb82aea02ffdb676321943aafa78fe6c25a696cf16af871`.
- [x] Standalone HTML SHA-256 remains
  `b6cb5321e003b58fa4429081b35c2fcdffa849a2e2b089f8781235692988523d`.
- [x] Standalone ZIP SHA-256 remains
  `df8199becf2190428334add7924ecc05ad24ac2a81c3e7fd7a90c7eac5ee699d`;
  internal payload verification is `5/5`.
- [x] Final delivery contains `282` files; manifest `280 = N−2`;
  checksum list `281 = N−1`, with the manifest included in the checksum list.
- [x] No commit, push, merge, tag, GitHub Release, deployment, Cloudflare, DNS,
  domain, redirect or Email Routing mutation was performed.
- [ ] Real online status, redirects, headers, caches and custom-404 behavior
  require authorized post-deployment verification.
- [ ] Independent private review and final approval remain pending.
