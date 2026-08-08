# Test report — LoadComposer v1.0.0 private candidate

Date: 2026-08-08  
Status: PASS locally; not published or finally approved

## Input admission

- Canonical RC.4 delivery SHA-256:
  `a9357a18384f95e09dcc3bd8c48c5fab78ea31468671c2e694021d5f2bb0a7bd`.
- Base admission: one `delivery-v1.0.0-rc.4/` root, no traversal or anomalous
  symlink, `202` files, `200/200` manifest entries and `201/201` checksums.
- Base test bundle: `191` files, SHA-256
  `d96006fd9665130726185cb8c9574f51cd27631ae2c3db3295fca81e0b9406e2`.
- Base standalone SHA-256: HTML
  `afd84b741059c47dcfc95bec9ccbfefadb6c33405e75fdbeb9b3684824163a96`;
  ZIP `d024a4c57a879c406ef68c389c66442c5327cbeaa9b71b1cce302059a894dbd8`.
- The stable fixture contains exactly the RC.4 modular app, standalone, language
  index and seven catalogs: `10/10` expected hashes PASS.

## Environment and reproducibility

- Node.js `22.17.0`; npm `11.9.0`.
- Final source-tree clean `npm ci`: `58` packages, exit `0`.
- Final source-tree complete `npm test`: exit `0`.
- Final `203`-file test bundle SHA-256:
  `47b99f34318cf8dd78d37c2135f020638c9088272da6cba06bfdaa3286648fbb`.
- Clean extraction of that exact bundle: `npm ci` and complete `npm test` exit `0`.
- Package integrity reproduction on a separate extraction: exit `0`,
  `NO_COMMIT_PRESENT`.

## Complete suite

| Area | Result |
|---|---:|
| Node syntax | `39/39` PASS |
| Catalogs | `7 × 456` keys PASS |
| Modular i18n | `18/18` PASS |
| Stable scope / RC.4 fixture | `10/10` hashes and exact normalized parity PASS |
| Trailer, overlap and precedence | `29/29` PASS |
| Cache policy | `3 × 36 = 108/108` PASS |
| LICENSE/NOTICE inline and identity | `6/6` PASS |
| Repository runtime | `16/16` HTTP/subfolder/`file://` PASS |
| Visual/responsive matrix | `112/112` PASS |
| Functional parity RC.4→v1.0.0 | `35/35` PASS |
| Equivalent-input geometry | `7,542/7,542`, zero differences |
| Functional regressions | `37/37` PASS |
| XSS | `9/9`, 28 scenarios PASS |
| Events/state | `20/20` and `7/7` PASS |
| Responsive runtime | `9/9` PASS |
| Main print PDFs | `33/33` PASS |
| Approved raster parity | `47/47` PASS |
| Localized PDFs | `35/35` PASS |
| Plural PDFs | `42/42` PASS |
| Total PDF scenarios | `110/110` PASS |
| Repository / hardening / workflow policy | PASS |
| Strict local route matrix | `13/13` PASS |

`test:print-parity`, `test:print-locales` and `test:print-plurals` all ran after
`test:print-i18n` in both complete final executions.

## Scope conclusion

The stable modular app and standalone are byte-identical to RC.4 after replacing
only the stable version token with `1.0.0-rc.4`. All 12 vehicles, geometry,
coordinates, results, operational catalog strings, printing and runtime behavior
are unchanged. Catalogs differ only in `meta.version` and
`meta.documentTitle`. Legal files and `site/404.html` are byte-identical.

The local server does not reproduce Cloudflare's `.html → 308 → clean URL 200`
behavior, custom headers, edge cache, custom-domain routing, `pages.dev`, or the
custom 404 response status. No stable online behavior is claimed before push.
