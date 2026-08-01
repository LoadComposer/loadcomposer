# RC.2 → RC.3 comparison — LoadComposer v1.0.0-rc.3

Date: 2026-07-31  
Baseline archive: `loadcomposer-v1.0.0-rc.2-delivery.zip`  
Baseline SHA-256: `1c6ed3e3da26755d0af9c46a6e838fff2482ea5f1ef80885eb75283cdc763a05`

## Result

Status: `PASS`.

- Application JavaScript changes: `0`.
- Algorithm changes: `0`.
- Geometry differences: `0/7,542`.
- Functional parity differences: `0/35`.
- UI, palette, logo, favicon, canvas and responsive changes: `0`.
- Translation-value changes: `0` outside `meta.version` and
  `meta.documentTitle`.
- Print-source changes: `0`.
- Approved print-raster differences: `0/47`.
- `LICENSE`, `LICENSE.it.md`, `NOTICE` byte differences: `0`.

The strict scope audit compares the RC.3 modular HTML and standalone to exact
RC.2 fixtures after only `1.0.0-rc.3 → 1.0.0-rc.2` normalization. It compares
all seven catalogs after only the two allowed metadata normalizations.

## Substantive corrections

| File | Classification | Exact change |
|---|---|---|
| `.github/workflows/ci.yml` | CI dependency correction | Added the named `poppler-utils` installation step after `setup-node` and before `npm ci`; all other CI policy remains intact. |
| `tests/workflow-policy-rc.3.mjs` | Minimal strengthened policy test | Requires Poppler commands and order; preserves and strengthens prohibitions on secrets, tokens, write permissions, ignored failures, deploy, release, publication and push. |
| `.github/ISSUE_TEMPLATE/bug.yml` | Required documentation correction | Changed only the version placeholder from `v1.0.0-rc.1` to `v1.0.0-rc.3`. |
| `docs/ARCHITECTURE.md` | Required architecture correction plus current artifact names | Direct fixture changed from RC.1 to RC.2; current standalone paths changed from RC.2 to RC.3. |

## Exact current-path inventory changed from RC.2

For versioned files, the listed RC.3 path replaces the corresponding RC.2
path unless a row says it is new. Path renames are counted even when payload
bytes are unchanged.

### Release metadata, scripts and distribution

```text
.gitignore
VERSION
package.json
package-lock.json
scripts/build-standalone.mjs
scripts/create-delivery-controls.mjs
scripts/generate-translation-glossary.mjs
scripts/package-standalone.mjs
scripts/prepare-release-assets.mjs
site/index.html
site/legal/index.html
site/assets/loadcomposer-og-v1.0.0-rc.3.png
site/downloads/loadcomposer-v1.0.0-rc.3-standalone.html
site/downloads/loadcomposer-v1.0.0-rc.3-standalone.html.sha256
site/downloads/loadcomposer-v1.0.0-rc.3-standalone.zip
site/downloads/loadcomposer-v1.0.0-rc.3-standalone.zip.sha256
site/lang/de.json
site/lang/en.json
site/lang/es.json
site/lang/fr.json
site/lang/it.json
site/lang/nl.json
site/lang/pt.json
loadcomposer-v1.0.0-rc.3-test-bundle.zip
DELIVERY_MANIFEST-v1.0.0-rc.3.txt
SHA256SUMS-v1.0.0-rc.3.txt
```

Catalog classification: only `meta.version` and `meta.documentTitle` changed.
The Open Graph PNG path changed mechanically; PNG bytes are unchanged.
Standalone payloads and checksum files were deterministically regenerated.

### Documentation and reports

```text
CHANGELOG.md
CHANGELOG-v1.0.0-rc.3.md
LEGAL_AUDIT-v1.0.0-rc.3.md
README.md
README.it.md
ROADMAP.md
RELEASE_CHECKLIST-v1.0.0-rc.3.md
TEST_REPORT-v1.0.0-rc.3.md
WORKFLOW_VALIDATION-v1.0.0-rc.3.md
RC2_TO_RC3_COMPARISON-v1.0.0-rc.3.md                  [new]
docs/ARCHITECTURE.md
docs/CLOUDFLARE_PREVIEW_CHECKLIST.md
docs/DEPLOYMENT.md
docs/GITHUB_FIRST_PUSH.md
docs/QUICK-START.md
docs/translations/TRANSLATION_GLOSSARY-it-de-v1.0.0-rc.3.md
docs/translations/TRANSLATION_GLOSSARY-it-en-v1.0.0-rc.3.md
docs/translations/TRANSLATION_GLOSSARY-it-es-v1.0.0-rc.3.md
docs/translations/TRANSLATION_GLOSSARY-it-fr-v1.0.0-rc.3.md
docs/translations/TRANSLATION_GLOSSARY-it-nl-v1.0.0-rc.3.md
docs/translations/TRANSLATION_GLOSSARY-it-pt-v1.0.0-rc.3.md
```

`CHANGELOG.md` retains its RC.1 and RC.2 history. `LEGAL_AUDIT` records no
legal delta. The six glossaries were regenerated from the seven catalogs.

### Tests

```text
tests/check-js-syntax-i18n-rc.3.mjs
tests/check-js-syntax-rc.3.mjs
tests/check-node-syntax-rc.3.mjs
tests/compare-print-renders-v1.0.0-rc.3.mjs
tests/delivery-packaging-rc.3.mjs
tests/event-audit-rc.3.mjs
tests/functional-parity-v1.0.0-rc.3.mjs
tests/geometry-full-parity-v1.0.0-rc.3.mjs
tests/i18n-catalogs-rc.3.mjs
tests/i18n-identical-allowlist-rc.3.json
tests/i18n-modular-rc.3.mjs
tests/i18n-plural-engine-rc.3.mjs
tests/i18n-plural-source-audit-rc.3.mjs
tests/i18n-quantity-rendering-rc.3.mjs
tests/i18n-visual-responsive-rc.3.mjs
tests/loadcomposer-regression-rc.3.mjs
tests/orientation-source-audit-rc.3.mjs
tests/print-i18n-locales-rc.3.mjs
tests/print-pdf-rc.3.mjs
tests/print-plural-scenarios-rc.3.mjs
tests/rc3-hardening-audit.mjs
tests/rc3-scope-audit.mjs
tests/repository-release-audit-rc.3.mjs
tests/repository-runtime-rc.3.mjs
tests/responsive-rc.3.mjs
tests/scope-freeze-rc.3.mjs
tests/security-xss-rc.3.mjs
tests/version-consistency-rc.3.mjs
tests/visual-refinements-rc.3.mjs
tests/workflow-policy-rc.3.mjs
```

Classification: mechanical current-release migration to RC.3; direct baseline
migration to RC.2; expected hashes and output names updated; scope and workflow
tests strengthened as described above. `tests/browser-runtime.mjs` is unchanged.

### Direct RC.2 application fixtures

```text
tests/fixtures/baseline-v1.0.0-rc.2/loadcomposer-v1.0.0-rc.2.html
tests/fixtures/baseline-v1.0.0-rc.2/loadcomposer-v1.0.0-rc.2-standalone.html
tests/fixtures/baseline-v1.0.0-rc.2/lang/index.json
tests/fixtures/baseline-v1.0.0-rc.2/lang/de.json
tests/fixtures/baseline-v1.0.0-rc.2/lang/en.json
tests/fixtures/baseline-v1.0.0-rc.2/lang/es.json
tests/fixtures/baseline-v1.0.0-rc.2/lang/fr.json
tests/fixtures/baseline-v1.0.0-rc.2/lang/it.json
tests/fixtures/baseline-v1.0.0-rc.2/lang/nl.json
tests/fixtures/baseline-v1.0.0-rc.2/lang/pt.json
```

Classification: exact fixture copies from the canonical RC.2 delivery. The
earlier RC.1 application fixture paths are replaced, not retained as active
baselines.

### RC.2 print-evidence fixture paths

All files below are under
`tests/fixtures/print-evidence-v1.0.0-rc.2/pdf-renders/`. Their 47 payloads are
byte-identical to the approved renders carried by RC.2; only the baseline
directory identity changed from RC.1 to RC.2, consistent with RC.2's own
`47/47` pixel-parity proof.

```text
ramp-mixed-bw-1.png
ramp-mixed-color-1.png
ramp-mixed-eight-types-bw-1.png
ramp-mixed-eight-types-bw-2.png
ramp-mixed-long-legend-1.png
ramp-mixed-long-legend-2.png
ramp-single-bw-1.png
ramp-single-bw-2.png
ramp-single-color-1.png
ramp-single-color-2.png
ramp-single-custom-1450x900-locked-rotated-bw-1.png
ramp-single-custom-1450x900-locked-rotated-bw-2.png
ramp-single-custom-1450x900-locked-rotated-color-1.png
ramp-single-custom-1450x900-locked-rotated-color-2.png
ramp-single-euro-locked-rotated-bw-1.png
ramp-single-euro-locked-rotated-bw-2.png
ramp-single-euro-locked-rotated-color-1.png
ramp-single-euro-locked-rotated-color-2.png
ramp-single-industrial-locked-rotated-bw-1.png
ramp-single-industrial-locked-rotated-bw-2.png
ramp-single-industrial-locked-rotated-color-1.png
ramp-single-industrial-locked-rotated-color-2.png
ramp-single-stacked-bw-1.png
ramp-single-stacked-bw-2.png
side-mixed-bw-1.png
side-mixed-color-1.png
side-mixed-eight-types-bw-1.png
side-mixed-eight-types-bw-2.png
side-single-bw-1.png
side-single-color-1.png
side-single-custom-1450x900-locked-rotated-bw-1.png
side-single-custom-1450x900-locked-rotated-color-1.png
side-single-euro-locked-rotated-bw-1.png
side-single-euro-locked-rotated-color-1.png
side-single-industrial-locked-rotated-bw-1.png
side-single-industrial-locked-rotated-color-1.png
side-single-long-id-color-1.png
side-single-stacked-color-1.png
xss-01-single-ramp-bw-1.png
xss-01-single-ramp-bw-2.png
xss-02-mixed-side-color-1.png
xss-03-single-side-bw-1.png
xss-04-mixed-ramp-color-1.png
xss-05-single-side-bw-1.png
xss-06-mixed-side-color-1.png
xss-07-single-ramp-bw-1.png
xss-07-single-ramp-bw-2.png
```

## Critical files proven unchanged

```text
LICENSE
LICENSE.it.md
NOTICE
.github/workflows/package-integrity.yml
.node-version
.nvmrc
CLA.md
COMMERCIAL-LICENSING.md
CONTRIBUTING.md
PRIVACY.md
SECURITY.md
TRADEMARKS.md
RC2_HARDENING_REPORT.md
site/lang/index.json
site/_headers
site/_redirects
site/robots.txt
site/sitemap.xml
scripts/prepare-site-legal.mjs
tests/browser-runtime.mjs
```

All other unlisted unversioned assets, screenshots, representative PDFs and
legal public copies are byte-identical to RC.2.

## Residual RC.1 and RC.2 reference classification

### RC.1 — historical correct

- `CHANGELOG.md`: RC.1 release history and RC.2 comparison history.
- `CHANGELOG-v1.0.0-rc.3.md`: records the corrected old bug placeholder.
- `RC2_HARDENING_REPORT.md`: immutable historical RC.2 report whose baseline
  was RC.1.

No active RC.1 fixture, current version, download, test target or current
architecture reference remains.

### RC.2 — historical correct

- `CHANGELOG.md` and `RC2_HARDENING_REPORT.md`: historical release record.
- `NOTICE` and `site/legal/NOTICE`: intentionally byte-identical legal notice
  required by the RC.3 specification; its RC.2 line must not be edited.
- RC.3 changelog, legal audit, checklist, test report, workflow report and this
  comparison: statements about the canonical predecessor or frozen delta.

### RC.2 — baseline correct

- `docs/ARCHITECTURE.md`: direct application fixture description.
- `scripts/create-delivery-controls.mjs`: canonical baseline name and SHA.
- `package.json`: event-test baseline path.
- RC.3 tests that reference `baseline-v1.0.0-rc.2`, RC.2 print evidence,
  normalized RC.2 values, or RC.2 comparison labels.

### RC.2 — fixture correct

- `tests/fixtures/baseline-v1.0.0-rc.2/`: exact modular, standalone and eight
  catalog/index fixture files.
- `tests/fixtures/print-evidence-v1.0.0-rc.2/pdf-renders/`: 47 approved PNGs.

### Obsolete references

None. Every residual reference is historical, legal-frozen, baseline or
fixture evidence. No unjustified RC.1 or RC.2 reference remains.
