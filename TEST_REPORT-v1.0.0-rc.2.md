# Test report — LoadComposer v1.0.0-rc.2

Date: 2026-07-30  
Canonical baseline: `loadcomposer-v1.0.0-rc.1-delivery.zip`  
Canonical SHA-256: `b49b862917028d4aef6fbdb2a852309ec17262ddddcc3bd35ea15e0361730a10`

## Baseline admission

- External ZIP SHA-256: exact match.
- ZIP integrity: PASS.
- Internal delivery checksums: `159/159` PASS across `160` files.
- Extraction: new empty directory with the original structure preserved.
- Baseline `npm ci && npm test`: PASS before RC.2 work.
- RC.2 test fixtures: direct RC.1 application and RC.1 print evidence only.

## Verified environment

- Node.js: `22.17.0`.
- npm: `11.9.0`.
- `npm ci`: 58 packages installed from the lockfile; no `EBADENGINE`.
- Lockfile dependency graph: unchanged from RC.1. Only package/version and
  engine metadata were aligned; no dependency was upgraded.
- Node syntax: `36/36` project scripts and tests PASS.

## RC.2 results

| Area | Result |
|---|---:|
| Enabled language catalogs | `7 × 451` keys PASS |
| Modular i18n scenarios | `18/18` PASS |
| Frozen operational status comparisons | `84/84` PASS |
| Repository runtime: root, subfolder and `file://` | `16/16` PASS |
| Visual/responsive scenarios | `112/112` PASS |
| Orientation/footer matrix | `98/98` PASS |
| Picker, touch and B/W scenarios | `49/49`, `7/7`, `7/7` PASS |
| Footer exclusion from print | `7/7` PASS |
| Functional parity with RC.1 | `35/35` PASS |
| Single capacity geometry | `1,080` comparisons, zero differences |
| Single load geometry | `4,110` comparisons, zero differences |
| Mixed geometry | `2,352` comparisons, zero differences |
| Total geometry parity | `7,542/7,542`, zero differences |
| Functional regressions | `37/37` PASS |
| XSS | `9/9` tests and `28` scenarios PASS |
| Events and state | `20/20` actions; `7/7` checks PASS |
| Responsive viewports | `9/9` PASS |
| Italian, localized and plural PDFs | `33/33`, `35/35`, `42/42` PASS |
| Total PDF scenarios | `110/110` PASS |
| Approved print raster parity | `47/47` pixel-identical to RC.1 |
| RC.2 distribution hardening audit | PASS |
| GitHub workflow policy audit | PASS |

The complete suite finished with exit code `0` both in the candidate source
tree and after extracting the test bundle into a new empty directory and
running `npm ci && npm test`.

## Standalone and legal distribution

- The standalone ZIP has the required package root and six files.
- Its `SHA256SUMS.txt` verifies all five preceding payload files.
- Canonical `LICENSE`, `LICENSE.it.md` and `NOTICE` copies are byte-identical.
- The standalone works through `file://` in all seven languages, with embedded
  catalogs and no remote request.
- The web and standalone HTML contain the required non-visible legal comment.
- Seven public legal files under `site/legal/` are byte-identical to the root
  originals.
- Three legal footer links are localized in all seven catalogs, keyboard
  focusable, and absent from operational print.
- Only the three confirmed addresses appear:
  `licensing@loadcomposer.com`, `security@loadcomposer.com` and
  `privacy@loadcomposer.com`.

## RC.1 → RC.2 scope proof

Application JavaScript, algorithms, capacity, `capacityLayout`, `loadLayout`,
mixed layouts, geometry, results, diagrams, responsive behavior and print
source are unchanged. Authorized application-source differences are limited
to:

- version identifiers;
- the non-visible legal source comment;
- three legal footer links and their seven localized labels;
- CSS needed to render those links and suppress them in print.

Eight protected legal documents are byte-identical to RC.1. `NOTICE` differs
only in its first-line version reference (`rc.1` → `rc.2`).

## Workflow validation statement

The commands declared by both workflows were executed locally and passed,
including the deterministic `git diff --exit-code` check in a temporary local
repository. GitHub Actions itself has not yet run because no push was
performed. See `WORKFLOW_VALIDATION-v1.0.0-rc.2.md`.

Status: `PASS`.
