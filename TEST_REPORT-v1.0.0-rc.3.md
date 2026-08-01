# Test report — LoadComposer v1.0.0-rc.3 final candidate

Date: 2026-08-01  
Approved RC.3 base: `loadcomposer-v1.0.0-rc.3-delivery.zip`  
Approved base SHA-256: `e9fd5840a7da3417e5293febc7495301f5619ad60a5acd19a6b3fb4aeb9994d5`

## Approved-base admission

- External ZIP SHA-256: exact match.
- ZIP integrity: PASS.
- Archive root: `delivery-v1.0.0-rc.3/`, with no sibling root.
- Internal delivery checksums: `182/182` PASS across `183` files.
- Standalone package checksums: `5/5` PASS after clean extraction.
- Standalone ZIP and test-bundle ZIP integrity: PASS.
- Extraction: new empty directory with the original structure preserved.
- Working copy: created only from the verified approved RC.3 directory.
- Rejected RC.3 SHA `ae802829...d9e26a`, RC.2, browser-saved files,
  prior working outputs and local Git content: not used.

## Final-candidate correction

- Added only the public hosting page `site/404.html`.
- The page is static, autonomous, responsive, JavaScript-free, uses UTF-8,
  approved local logo assets and `prefers-color-scheme` light/dark styling.
- It exposes visible `404`, the title “Page not found”, a short neutral message,
  and keyboard-accessible links to `/` and `/legal/` with visible focus.
- Metadata: `noindex,follow`; no canonical, Open Graph or automatic redirect.
- No remote resource, tracker, analytics, remote font or external request.
- `tests/repository-release-audit-rc.3.mjs` was minimally strengthened to
  require the page, metadata, local-only resources, valid links, unchanged real
  downloads and exclusion from the sitemap.
- No npm dependency or release number changed.

## Verified environment

- Node.js: `22.17.0`.
- npm: `11.9.0`.
- Clean `npm ci`: 58 packages installed from the unchanged lockfile.
- `pdfinfo`: Poppler `26.05.0`.
- `pdftotext`: Poppler `24.02.0`.
- `pdftocairo`: Poppler `24.02.0`.
- Node syntax: `36/36` project scripts and tests PASS.
- `html-validate` `11.6.0`, invoked as a one-off validator without changing
  project dependencies: `site/404.html` PASS.
- Environment-only warning: npm reported the inherited `http-proxy` config as
  deprecated for a future npm major version; it did not affect the build or tests.

## Complete `npm test` results

| Area | Result |
|---|---:|
| Enabled language catalogs | `7 × 451` keys PASS |
| Modular i18n scenarios | `18/18` PASS |
| Frozen operational status comparisons | `84/84` PASS |
| Repository runtime: root, subfolder and `file://` | `16/16` PASS |
| Repository files and 404 policy audit | `36` required files PASS |
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
The source-tree run ended with `RC3_404_NPM_TEST_EXIT=0`. A new test bundle
containing 176 files was extracted into a second clean directory; its
`npm ci && npm test` ended with `RC3_404_CLEAN_EXIT=0` and repeated the complete
110-PDF chain.

## 404 and HTTP validation

- Static page content and policy checks: PASS.
- Local static-host simulation: `9/9` routes returned the expected status.
- `/` and `/legal/`: HTTP 200.
- Four real `/downloads/` artifacts: HTTP 200.
- `/downloads/`, `/percorso-inesistente-test/` and another nonexistent path:
  HTTP 404 with `site/404.html`, not the main application.
- Chromium light/dark rendering at 390 × 844: PASS; local logos loaded, visible
  keyboard focus, no failed subresource and zero remote requests.
- `404.html` absent from `sitemap.xml`; no `site/downloads/index.html` added.

The local server was explicitly configured to reproduce custom-404 static-host
behavior. Definitive Cloudflare Pages status and fallback behavior remain a
post-push preview check.

## Standalone and frozen-scope validation

- Standalone `SHA256SUMS.txt`: `5/5` payload hashes PASS.
- Standalone HTML SHA-256 remains
  `70b4ec43627eedbdcf0cfc48cbc17d193cd1cd338301a74cd7e1534b45eabe65`.
- Standalone ZIP SHA-256 remains
  `c7518ddda3ed7f1db992dcc5a17608d55b570d97c71b12a59a1de6105fbb3ef7`.
- HTML/ZIP and both sidecars are byte-identical to the approved RC.3 base.
- Standalone `file://`: seven languages, embedded catalogs, no remote requests.
- `site/index.html`, all seven catalogs, application JavaScript/CSS, legal
  documents, `robots.txt`, `sitemap.xml`, `_headers`, `_redirects`, assets,
  fixtures and print evidence are byte-identical to the approved base.
- Application algorithms, geometry, coordinates, results, labels, UI,
  translations, responsive behavior and print received no functional change.

## Workflow reproduction

In a third clean extraction, the local sequence corresponding to
`package-integrity.yml` completed with `RC3_404_INTEGRITY_EXIT=0`: `npm ci`,
build, hardening, workflow policy and
`git diff --exit-code -- site/downloads site/legal site/assets docs/translations`.
The temporary repository used an index only and contains zero commits.

Status: `PASS`.
