# Test report — LoadComposer v1.0.0-rc.4 private candidate

Date: 2026-08-03  
Status: PASS locally; not published or finally approved

## Input admission

- Canonical incremental RC.4 base delivery SHA-256:
  `a87ccc732b660f6cafe29dedbe21d2a390d407ac0b964d7142f64a49de5637ca`.
- Base admission PASS: one `delivery-v1.0.0-rc.4/` root, no traversal or
  anomalous symlink, 202 files, 200 manifest entries and `201/201` checksums.
- Base test bundle: 191 files, SHA-256
  `d7b04a0036cfa652ec3acca81a6b2fac54f37be724fdcc4935e140af68386128`.
- Base standalone SHA-256: HTML
  `afd84b741059c47dcfc95bec9ccbfefadb6c33405e75fdbeb9b3684824163a96`;
  ZIP `d024a4c57a879c406ef68c389c66442c5327cbeaa9b71b1cce302059a894dbd8`.
- The rejected `c2358ab6...` delivery, RC.3, repository checkout and previous
  work outputs were not used as the software base.

## Environment and reproducibility

- Node.js `22.17.0`; npm `11.9.0`.
- Source-tree `npm ci`: 58 packages from the lockfile, PASS
  (`RC4_CLEANURL_SOURCE_NPM_CI_EXIT=0`).
- Source-tree complete `npm test`: `RC4_CLEANURL_SOURCE_NPM_TEST_EXIT=0`.
- Exact final 191-file test bundle SHA-256
  `d96006fd9665130726185cb8c9574f51cd27631ae2c3db3295fca81e0b9406e2`:
  fresh `npm ci` and complete `npm test` PASS
  (`RC4_CLEANURL_BUNDLE_NPM_CI_EXIT=0`,
  `RC4_CLEANURL_BUNDLE_NPM_TEST_EXIT=0`).
- Two launcher attempts stopped before a valid run because of, respectively,
  an unwritable npm cache target and an incorrect working directory. Neither
  altered the admitted source files or the final test bundle.

## Complete suite

| Area | Result |
|---|---:|
| Node syntax | `39/39` PASS |
| Catalogs | `7 × 456` keys PASS |
| Modular i18n | `18/18` PASS |
| Trailer, overlap and precedence checks | `29/29` PASS |
| Cache policy | `3 × 36 = 108` exact evaluations PASS |
| LICENSE/NOTICE inline and identity | `6/6` byte identities PASS |
| Repository runtime | `16/16` HTTP/subfolder/`file://` PASS |
| Visual/responsive matrix | `112/112` PASS |
| Functional parity RC.3→RC.4 | `35/35` PASS |
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
| Repository audit | 37 required paths PASS |
| Workflow policy | PASS |
| Distribution hardening | PASS |

`test:print-parity`, `test:print-locales` and `test:print-plurals` all ran after
`test:print-i18n` in both valid complete executions.

## Scope conclusion

The 12 vehicle IDs and all nine non-truck profiles match RC.3. At equivalent
inputs the placement functions, heuristics, coordinates and layouts are
unchanged. The authorized result change for the reefer profile follows from its
13,310 mm loadable length: the 800 × 600 mm candidate capacity is 66 rather
than the RC.3 profile's 67. No weight, axle, payload, backend or tracking feature
was added.

Before the patch, the physical `.html` URL was observed online redirecting with
`308` to the clean URL; the redirect was immutable, but the final clean-URL
`200` response was `must-revalidate`. The new exact clean-URL rule is locally
validated as immutable. Cloudflare Pages edge-cache, the complete
`.html` → `308` → clean-URL `200` chain, real response-header composition and
production custom-404 behavior remain post-push checks.
