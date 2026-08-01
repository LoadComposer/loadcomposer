# Test report — LoadComposer v1.0.0-rc.3

Date: 2026-07-31  
Canonical baseline: `loadcomposer-v1.0.0-rc.2-delivery.zip`  
Canonical SHA-256: `1c6ed3e3da26755d0af9c46a6e838fff2482ea5f1ef80885eb75283cdc763a05`

## Baseline admission

- External ZIP SHA-256: exact match.
- ZIP integrity: PASS.
- Internal delivery checksums: `181/181` PASS across `182` files.
- Standalone package checksums: `5/5` PASS after clean extraction.
- Extraction: new empty directory with the original structure preserved.
- RC.3 working copy: created only from the verified RC.2 directory.
- Rejected pre-publication RC.3 candidate: not used.

## Verified environment

- Node.js: `22.17.0`.
- npm: `11.9.0`.
- Clean `npm ci`: 58 packages installed from the unchanged lockfile; no
  dependency upgrade and no `EBADENGINE`.
- `pdfinfo`: available, Poppler `26.05.0`.
- `pdftotext`: available, Poppler `24.02.0`.
- `pdftocairo`: available, Poppler `24.02.0`.
- Node syntax: `36/36` project scripts and tests PASS.
- Environment-only warning: npm reported the inherited `http-proxy` config as
  deprecated for a future npm major version; it did not affect installation or
  tests.

## Complete RC.3 results

| Area | Result |
|---|---:|
| Enabled language catalogs | `7 × 451` keys PASS |
| Modular i18n scenarios | `18/18` PASS |
| Frozen operational status comparisons | `84/84` PASS |
| Repository runtime: root, subfolder and `file://` | `16/16` PASS |
| Picker, touch and B/W scenarios | `49/49`, `7/7`, `7/7` PASS |
| Orientation/footer matrix | `98/98` PASS |
| Footer exclusion from print | `7/7` PASS |
| Visual/responsive scenarios | `112/112` PASS |
| Functional parity with RC.2 | `35/35` PASS |
| Single capacity geometry | `1,080` comparisons, zero differences |
| Single load geometry | `4,110` comparisons, zero differences |
| Mixed geometry | `2,352` comparisons, zero differences |
| Total geometry parity | `7,542/7,542`, zero differences |
| Functional regressions | `37/37` PASS |
| XSS | `9/9` tests and `28` scenarios PASS |
| Events and state | `20/20` actions; `7/7` checks PASS |
| Responsive viewports | `9/9` PASS |
| `test:print-i18n` | `33/33` PDFs PASS |
| Approved print raster parity | `47/47` pixel-identical to RC.2 |
| Localized PDFs | `35/35` PASS |
| Targeted plural PDFs | `42/42` PASS |
| Total PDF scenarios | `110/110` PASS |
| Distribution hardening | PASS |
| Workflow policy | PASS |

`test:print-i18n` and every later command in the `npm test` chain executed.
The source-tree run reached the final `42/42` plural-PDF result. A second clean
extraction of the test bundle ran `npm ci && npm test` and ended with the
explicit marker `RC3_CLEAN_EXIT=0`.

## Standalone and repository validation

- Standalone ZIP root and six contained files: PASS.
- Standalone `SHA256SUMS.txt`: `5/5` payload hashes PASS.
- HTML and ZIP sidecar checksums: PASS.
- Standalone `file://`: seven languages, embedded catalogs, no remote requests.
- Root and subfolder HTTP: PASS.
- Public legal copies: `7/7` byte-identical to their canonical root files.
- Internal links, CSP, headers, redirect, robots and sitemap: PASS.
- Trackers, analytics, remote runtime resources, secrets and credentials:
  absent.

## RC.2 → RC.3 scope proof

After normalizing only `1.0.0-rc.3` to `1.0.0-rc.2`, the modular application
and generated standalone are byte-identical to the canonical RC.2 fixture.
Each current catalog is structure-identical to RC.2 after normalizing only
`meta.version` and `meta.documentTitle`.

Application JavaScript, algorithms, `capacityLayout`, `loadLayout`, mixed
layouts, geometry, coordinates, results, labels, UI, responsive behavior,
translations other than version metadata, and print source/output are
unchanged.

`LICENSE`, `LICENSE.it.md`, and `NOTICE` are byte-identical to canonical RC.2.

## Workflow reproduction

The package-integrity command sequence was repeated in a second clean
extraction initialized as a temporary local Git repository, without a commit.
Build, hardening, workflow policy and
`git diff --exit-code -- site/downloads site/legal site/assets docs/translations`
all passed, ending with `RC3_INTEGRITY_EXIT=0`.

Status: `PASS`.
