# Test report — LoadComposer v1.1.0 private candidate

Date: 2026-08-11  
Status: PASS locally; not published or finally approved

## Input admission

- Canonical v1.0.0 delivery SHA-256:
  `7d0798a2dcb228eb93a26d77e4e24dd3ef0f1d40df38df8c33155d3c7872f4f2`.
- Base admission: one `delivery-v1.0.0/` root, no unsafe path, duplicate path or
  symlink, ZIP integrity PASS, `214` files, `212/212` manifest entries with
  exact hashes/byte sizes, and `213/213` checksum entries PASS.
- The stable fixture contains exactly the v1.0.0 modular app, standalone,
  language index and seven catalogs: `10/10` expected hashes PASS.

## Environment and reproducibility

- Node.js `22.17.0`; npm `11.9.0`.
- Final source-tree clean `npm ci`: `58` packages, exit `0`.
- Final source-tree complete `npm test`: exit `0`.
- Frozen `234`-file test bundle SHA-256:
  `78d32b76d5a0bc63e8b45cdc53f4055369f1b7be774d1898b9011f33eda07e1b`.
- Clean extraction of that exact bundle: `npm ci` and complete `npm test` exit `0`.
- Separate package-integrity extraction: build, hardening, workflow policy and
  generated-file diff exit `0`; `NO_COMMIT_PRESENT`.

## Complete suite

| Area | Result |
|---|---:|
| Node and embedded-JavaScript syntax | `41/41` PASS |
| Catalogs | `7 × 459` equal key sets PASS |
| Modular i18n | `18/18` PASS |
| Stable v1.0.0 fixture | `10/10` hashes PASS |
| Community scope audit | only version metadata plus 3 footer keys/2 links differ |
| Community links / mobile `file://` | `7/7` locales at 320 px, zero overflow/overlap/remote requests |
| Trailer, overlap and precedence | `29/29` PASS |
| Cache policy | `3 × 42 = 126/126` PASS |
| LICENSE/NOTICE inline and identity | `6/6` PASS |
| Repository runtime | `16/16` HTTP/subfolder/`file://` PASS |
| Visual/responsive matrix | `112/112` PASS |
| Functional parity v1.0.0→v1.1.0 | `35/35` PASS |
| Equivalent-input geometry | `7,542/7,542`, zero differences |
| Functional regressions | `37/37` PASS |
| XSS | `9/9`, 28 scenarios PASS |
| Events/state | `20/20` and `7/7` PASS |
| Responsive runtime | `9/9` PASS, 7 screenshots, zero console errors |
| Main print PDFs | `33/33` PASS |
| Approved raster parity | `47/47` PASS, pixel-identical |
| Localized PDFs | `35/35` PASS |
| Plural PDFs | `42/42` PASS |
| Total PDF scenarios | `110/110` PASS |
| Repository / hardening / workflow policy | PASS |
| Strict local route matrix | `13/13` PASS |

Both complete final executions reached and passed every command after
`test:print-i18n`, including print parity, localized PDFs and plural PDFs.

## Scope conclusion and warnings

The scope audit proves that application source and all operational translations
are equivalent to v1.0.0 except for current-version metadata, the three new
localized footer keys, and the two requested links. Geometry, equipment data,
capacity/load algorithms, coordinates, warnings, statuses, themes, responsive
application layout, print and PDF output are unchanged.

npm emitted a host-environment deprecation warning for the inherited
`http-proxy` configuration; it did not alter dependency resolution or results.
No production URL, Cloudflare redirect/header behavior, edge cache, custom
domain, `pages.dev`, or online custom-404 response was tested. The two optional
GitHub destinations require connectivity only when a user opens them; planner
operation remains offline and introduced zero remote runtime requests.
