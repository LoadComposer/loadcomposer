# Test report — LoadComposer v1.0.0-rc.4 private candidate

Date: 2026-08-03  
Status: PASS locally; not published or finally approved

## Input admission

- Canonical RC.3 delivery SHA-256:
  `16f89233050b5d6dcfd34785b80093feb8ba7111798fee1a7e65e66c29384694`.
- RC.3: one archive root, no traversal or anomalous symlink, `183/183`
  delivery checksums and standalone `5/5` PASS.
- RC.3 standalone SHA-256: HTML `70b4ec43627eedbdcf0cfc48cbc17d193cd1cd338301a74cd7e1534b45eabe65`;
  ZIP `c7518ddda3ed7f1db992dcc5a17608d55b570d97c71b12a59a1de6105fbb3ef7`.
- Dimensional DOCX SHA-256:
  `d8a7a941473d7f64effa4564706736d129d59c6d0c34c8642205c81edfafaebd`.
- The rejected RC.4 delivery and bundle were not used as software input.

## Environment and reproducibility

- Node.js `22.17.0`; npm `11.9.0`.
- Source-tree `npm ci`: 58 packages from the lockfile, PASS.
- Source-tree complete `npm test`: `CORRECTED_RC4_NPM_TEST_EXIT=0`.
- Exact 191-file test-bundle extraction: fresh `npm ci` PASS and complete
  `npm test` PASS (`CORRECTED_RC4_CLEAN_NPM_CI_EXIT=0`,
  `CORRECTED_RC4_CLEAN_NPM_TEST_EXIT=0`).
- A prior clean attempt was discarded before installation because it exposed
  Node 24.14.0 and a non-writable npm cache; it is not counted as a valid run.

## Complete suite

| Area | Result |
|---|---:|
| Node syntax | `39/39` PASS |
| Catalogs | `7 × 456` keys PASS |
| Modular i18n | `18/18` PASS |
| Trailer, overlap and precedence checks | `29/29` PASS |
| Cache policy | `3 × 35 = 105` exact evaluations PASS |
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

The local server cannot conclusively reproduce Cloudflare Pages edge-cache,
real response-header composition or production custom-404 behavior; those
remain post-push preview checks.
