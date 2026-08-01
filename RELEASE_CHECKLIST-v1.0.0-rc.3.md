# Release checklist — LoadComposer v1.0.0-rc.3 final candidate

Date: 2026-08-01

## Approved RC.3 base

- [x] Approved filename and external SHA-256 `e9fd5840...9994d5` matched.
- [x] Rejected SHA `ae802829...d9e26a` was identified and excluded.
- [x] Approved ZIP was extracted into a new empty directory with its single
  `delivery-v1.0.0-rc.3/` root preserved.
- [x] ZIP integrity and all `182/182` internal hashes verified.
- [x] Standalone package `5/5` hashes and both included ZIPs verified.
- [x] Working copy was created only after admission passed.
- [x] RC.2, browser-saved files, prior outputs and local Git content were not
  used as the final-candidate base.
- [x] Approved RC.3 remained intact for byte comparison.

## Final candidate 404 correction

- [x] Release remains exactly `v1.0.0-rc.3`; no RC.4 or variant identifier.
- [x] Added only the public page `site/404.html`.
- [x] HTML5, UTF-8, responsive layout and no-JavaScript operation verified.
- [x] Visible 404, “Page not found”, neutral message and links to `/` and
  `/legal/` verified.
- [x] Approved local logo assets, light/dark color schemes and visible keyboard
  focus verified.
- [x] Exact `noindex,follow` policy; no canonical, Open Graph or automatic
  redirect.
- [x] No remote assets, remote fonts, trackers, analytics or dependencies.
- [x] `404.html` absent from sitemap; `robots.txt` unchanged.
- [x] No `site/downloads/index.html` and no redirect-based workaround.
- [x] Repository audit minimally strengthened without weakening existing checks.

## Frozen application scope

- [x] `site/index.html` is byte-identical to the approved RC.3 base.
- [x] Seven catalogs and catalog index are byte-identical.
- [x] Application JavaScript/CSS, algorithms, geometry, capacity, load layouts,
  mixed layouts, coordinates, results, UI and responsive behavior are unchanged.
- [x] Functional parity is `35/35`.
- [x] Geometry parity is `7,542/7,542`, with zero differences.
- [x] Print parity is `47/47`, pixel-identical to RC.2 evidence.
- [x] Translations, pluralization, approved labels and print source/output are
  unchanged.
- [x] Logos, favicon, Open Graph image, fixtures and print evidence are
  byte-identical to the approved RC.3 base.
- [x] `VERSION`, package files, workflows, release metadata and download names
  remain `1.0.0-rc.3`.

## Legal, hosting and standalone controls

- [x] `LICENSE`, `LICENSE.it.md`, `NOTICE` and all other legal documents are
  byte-identical to the approved RC.3 base.
- [x] Public legal copies and existing legal page are unchanged.
- [x] `robots.txt`, `sitemap.xml`, `_headers` and `_redirects` are unchanged.
- [x] Standalone HTML/ZIP and both sidecars are byte-identical to the approved
  base.
- [x] Standalone HTML SHA remains `70b4ec43...eabe65`.
- [x] Standalone ZIP SHA remains `c7518ddd...b3ef7`.
- [x] Standalone ZIP contains exactly HTML, `LICENSE`, `LICENSE.it.md`,
  `NOTICE`, `README.txt`, and `SHA256SUMS.txt` below its package root.
- [x] Standalone `5/5` payload hashes verify after clean extraction.
- [x] Standalone `file://` works in seven languages with zero remote requests.
- [x] Four real download files remain present and byte-identical.

## Complete regression

- [x] Node `22.17.0` and npm `11.9.0` used.
- [x] Clean `npm ci` installed 58 lockfile packages without dependency changes.
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
- [x] Source-tree run ended with `RC3_404_NPM_TEST_EXIT=0`.
- [x] New 176-file test-bundle run ended with `RC3_404_CLEAN_EXIT=0`.
- [x] Package-integrity reproduction ended with `RC3_404_INTEGRITY_EXIT=0`.
- [x] No `|| true`, skip, catch-based neutralization or ignored failure.

## 404 and local hosting validation

- [x] Independent HTML validation PASS.
- [x] Static metadata, links, local resources and sitemap exclusion PASS.
- [x] Local custom-404 simulation: `9/9` HTTP routes PASS.
- [x] `/`, `/legal/` and four real downloads returned 200 locally.
- [x] `/downloads/` and two other nonexistent paths returned the custom page
  with status 404 locally.
- [x] Chromium light/dark rendering, logo loading, focus visibility and zero
  remote requests PASS.
- [x] Cloudflare-specific definitive status is explicitly left for preview.

## Packaging and comparison

- [x] Exact changed-path inventory against approved RC.3 documented.
- [x] Delivery excludes `.git`, `node_modules`, caches, temporary results,
  browser-saved HTML, secrets, credentials and nested delivery copies.
- [x] Test bundle excludes dependencies, caches and generated result trees.
- [x] Final manifest covers every final file except the checksum list itself.
- [x] Final delivery ZIP extracted and verified from its exact bytes.
- [x] Final standalone `5/5`, frozen-file byte identity and external SHA sealed.

## Pending outside this delivery

- [ ] GitHub Actions runs for this revised candidate after the publisher's push.
- [ ] Cloudflare Pages preview confirms real HTTP 404 status for `/downloads/`
  and other nonexistent routes.
- [ ] Commit, push, tag, GitHub Release, production deploy, DNS or domain work.

No external publication or repository mutation was performed while preparing
this candidate.
