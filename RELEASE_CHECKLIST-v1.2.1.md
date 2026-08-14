# Release checklist — LoadComposer v1.2.1 final-polish candidate

Date: 2026-08-14

## Admission and scope

- [x] Input SHA-256 exactly matches `d2d3c06e50bbd867d624623dbcc846331dab79ac448c5671f6602c15a7231c66`.
- [x] ZIP integrity, root `delivery-v1.2.1/`, `791` files, manifest `789/789` and checksum list `790/790` PASS.
- [x] Version remains exactly `1.2.1` / `v1.2.1`; no new release entry exists.
- [x] Product-facing scope is limited to compact secondary branding and the approved 404 prominence/action hierarchy.
- [x] No Main, Download-content, Legal-content, planner, algorithm, geometry, vehicle, print or PDF redesign/refactor was performed.

## Compact branding

- [x] Compact lockup is derived from the exact existing Main mobile day/night SVG assets.
- [x] LC pixel symbol and outlined Load/Composer wordmark are preserved.
- [x] No new logo, generic square, emoji, font, remote resource, payoff or version badge was added.
- [x] Download, Legal and 404 contain the same day/night compact lockup markup and dimensions.
- [x] Brand link is root-safe `/` and remains correct for nested 404 routes.
- [x] Desktop size is `170 × 40.1 px`; 320 px viewport size is `150 × 35.4 px`.
- [x] Responsive brand matrix `21/21` dark plus `3/3` light PASS with zero overlap or overflow.
- [x] Dark comparison screenshots for Main, Download, Legal and 404 reviewed.
- [x] Light comparison screenshots for Download, Legal and 404 reviewed.

## 404 hierarchy

- [x] Localized “Page not found” remains the only H1.
- [x] Decorative status `404` remains `aria-hidden="true"` and computes between 48 and 64 px.
- [x] Primary Home action occupies the first full row on desktop.
- [x] Download and Legal actions share an equal secondary row on desktop.
- [x] All three actions stack full-width below 420 px.
- [x] Italian/English/German desktop and 2560/1920/1366/1024/768/390/375/320 visual cases PASS.
- [x] Nested missing routes `4/4`, HTTP 404, favicon, Home, Download and Legal paths PASS.
- [x] Seven languages, Auto/Light/Dark, no-script fallback, noindex, no-store and no redirect remain intact.

## Frozen behavior and data

- [x] Main output is byte-identical (`7d802b95…0cdac`).
- [x] Standalone HTML and ZIP are byte-identical (`ef89ada8…96fb0`; `04c8e665…50c`).
- [x] Catalogs remain `7 × 514`; no translation key/value changed.
- [x] Seven canonical/public Legal document pairs remain byte-identical.
- [x] ROADMAP, routes, cache policy, CSP, sitemap and headers are unchanged.
- [x] Functional parity `35/35`; geometry `7,542/7,542`, zero differences.
- [x] Remaining-space `7/7`; trailer `29/29`; regression `37/37`; XSS `9/9`; events/state `20/20 + 7/7` PASS.
- [x] PDF `33 + 35 + 42 = 110/110`; raster parity `47/47` pixel-identical.
- [x] Download `21/21 + 40/40`; Legal `21/21 + 10/10`; 404 `21/21 + 8/8 + 4/4` PASS.
- [x] Cache `165/165`, repository runtime `16/16`, hardening and workflow-policy audits PASS.

## Packaging and publication boundary

- [x] v1.0.0, v1.1.0 and v1.2.0 public Download artifacts remain preserved.
- [x] Final v1.2.1 standalone HTML/ZIP and both sidecars remain internally consistent.
- [x] Test bundle includes frozen historical fixtures and the final-polish branding test.
- [x] Delivery has one `delivery-v1.2.1/` root; manifest is `N−2`; checksum list is `N−1` and hashes the manifest.
- [x] No commit, push, merge, tag, GitHub Release, deployment, Cloudflare, DNS or domain mutation was performed.
- [ ] Real online redirects, edge headers/cache and custom-404 serving require authorized post-deployment verification.
- [ ] Independent final review and publication approval remain pending.
