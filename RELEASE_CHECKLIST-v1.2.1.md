# Release checklist — LoadComposer v1.2.1 definitive private candidate

Date: 2026-08-14

## Admission and scope

- [x] Received v1.2.1 candidate SHA-256 exactly matches `c2ef52af6f8db9e5b40db20110f1623b0884e79a173aa8c2df47e07e02dc58e9`.
- [x] Input ZIP integrity, one root, path safety, `771` files, manifest `769/769` and checksum list `770/770` PASS.
- [x] Version remains exactly `1.2.1` / `v1.2.1`; no new release entry was created.
- [x] Final authored scope is limited to the 404 shell, its build support, five i18n keys, tests and release reports.
- [x] ROADMAP is byte-identical; no future or functional feature changed.

## Public pages and 404

- [x] Exactly four public page shells exist: Main, Download, Legal and custom 404.
- [x] Versioned standalone HTML files are classified as artifacts, not site shells.
- [x] Legal files remain raw documents; print/schema views remain runtime-only.
- [x] 404 uses the approved secondary-page header, palette, typography, controls, focus and responsive philosophy.
- [x] 404 supports the same seven languages and shared `loadcomposer.language` preference.
- [x] 404 supports Auto/Light/Dark through shared `loadcomposer.theme` and updates `theme-color`.
- [x] English fallback stays visible without JavaScript; the body is never permanently hidden.
- [x] Home, Download, Legal and favicon paths are root-relative and correct on nested missing routes.
- [x] `noindex,follow`, `/404.html` `no-store`, HTTP 404 status and sitemap exclusion are preserved.
- [x] Language/theme matrix `21/21`, responsive `8/8`, nested routes `4/4`, no-script and 200% zoom PASS.
- [x] Targeted Italian, English and German screenshots in light/dark/auto were reviewed.

## Frozen candidate behavior

- [x] Main and Legal outputs are byte-identical to the received candidate.
- [x] Download template/content/logic are unchanged; generated output differs only by current standalone checksums.
- [x] Standalone differs only by five embedded, unused 404 catalog keys.
- [x] Seven catalogs contain an identical `514`-key set.
- [x] All seven canonical/public legal pairs remain byte-identical.
- [x] Main semantics `28/28`, Main responsive `10/10`, Download `21/21 + 40/40`, Legal `21/21 + 10/10` PASS.
- [x] Functional parity `35/35`; geometry `7,542/7,542`, zero differences.
- [x] Remaining-space `7/7`; trailer `29/29`; regression `37/37`; XSS `9/9`; events/state `20/20 + 7/7` PASS.
- [x] PDF `33 + 35 + 42 = 110/110`; raster parity `47/47` pixel-identical.
- [x] Cache `165/165`, repository runtime `16/16`, hardening and workflow-policy audits PASS.

## Packaging and publication boundary

- [x] v1.0.0, v1.1.0 and v1.2.0 public Download artifacts remain preserved.
- [x] Final v1.2.1 standalone HTML/ZIP and both sidecars are internally consistent.
- [x] Final test bundle has one `loadcomposer-v1.2.1-test-bundle/` root and includes frozen historical fixtures plus the pre-404 standalone fixture.
- [x] Final delivery has one `delivery-v1.2.1/` root; manifest is `N−2`; checksum list is `N−1` and includes the manifest.
- [x] No commit, push, merge, tag, GitHub Release, deployment, Cloudflare, DNS or domain mutation was performed.
- [ ] Real online redirects, edge headers/cache and custom-404 serving require authorized post-deployment verification.
- [ ] Independent private review and final approval remain pending.
