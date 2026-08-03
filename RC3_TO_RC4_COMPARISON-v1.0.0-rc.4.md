# Canonical RC.3 → corrected RC.4 comparison

Date: 2026-08-03  
Baseline: `loadcomposer-v1.0.0-rc.3-delivery.zip`  
Baseline SHA-256: `16f89233050b5d6dcfd34785b80093feb8ba7111798fee1a7e65e66c29384694`

The comparison uses only the admitted canonical RC.3 extraction and the final
corrected RC.4 staging. The rejected RC.4 delivery and bundle are not a
baseline.

| Result | Count |
|---|---:|
| Added paths | 66 |
| Removed paths | 48 |
| Modified on the same path | 28 |
| Byte-identical on the same path | 108 |

Classification codes: A version promotion; B three trailer profiles; C
prudential warning and per-axis precedence; D translations; E inline
LICENSE/NOTICE; F Cache-Control; G Code of Conduct; H tests; I documentation;
J packaging/manifest/checksums; K regenerated artifacts.

## Added paths

### B/C/F/I — focused review and validation reports

```text
CACHE_POLICY_VALIDATION-v1.0.0-rc.4.md
TRAILER_DIMENSIONS_REVIEW-v1.0.0-rc.4.md
```

### G — community conduct

```text
CODE_OF_CONDUCT.md
```

### I — RC.4 documentation and reports

```text
CHANGELOG-v1.0.0-rc.4.md
LEGAL_AUDIT-v1.0.0-rc.4.md
RC3_TO_RC4_COMPARISON-v1.0.0-rc.4.md
RELEASE_CHECKLIST-v1.0.0-rc.4.md
TEST_REPORT-v1.0.0-rc.4.md
WORKFLOW_VALIDATION-v1.0.0-rc.4.md
```

### D/K — regenerated translation glossaries

```text
docs/translations/TRANSLATION_GLOSSARY-it-de-v1.0.0-rc.4.md
docs/translations/TRANSLATION_GLOSSARY-it-en-v1.0.0-rc.4.md
docs/translations/TRANSLATION_GLOSSARY-it-es-v1.0.0-rc.4.md
docs/translations/TRANSLATION_GLOSSARY-it-fr-v1.0.0-rc.4.md
docs/translations/TRANSLATION_GLOSSARY-it-nl-v1.0.0-rc.4.md
docs/translations/TRANSLATION_GLOSSARY-it-pt-v1.0.0-rc.4.md
```

### J — delivery controls and test bundle

```text
DELIVERY_MANIFEST-v1.0.0-rc.4.txt
SHA256SUMS-v1.0.0-rc.4.txt
loadcomposer-v1.0.0-rc.4-test-bundle.zip
```

### K — regenerated site artifacts

```text
site/assets/loadcomposer-og-v1.0.0-rc.4.png
site/downloads/loadcomposer-v1.0.0-rc.4-standalone.html
site/downloads/loadcomposer-v1.0.0-rc.4-standalone.html.sha256
site/downloads/loadcomposer-v1.0.0-rc.4-standalone.zip
site/downloads/loadcomposer-v1.0.0-rc.4-standalone.zip.sha256
```

### H — renamed, direct-baseline and new test files

```text
tests/cache-policy-rc.4.mjs
tests/check-js-syntax-i18n-rc.4.mjs
tests/check-js-syntax-rc.4.mjs
tests/check-node-syntax-rc.4.mjs
tests/compare-print-renders-v1.0.0-rc.4.mjs
tests/delivery-packaging-rc.4.mjs
tests/event-audit-rc.4.mjs
tests/fixtures/baseline-v1.0.0-rc.3/lang/de.json
tests/fixtures/baseline-v1.0.0-rc.3/lang/en.json
tests/fixtures/baseline-v1.0.0-rc.3/lang/es.json
tests/fixtures/baseline-v1.0.0-rc.3/lang/fr.json
tests/fixtures/baseline-v1.0.0-rc.3/lang/index.json
tests/fixtures/baseline-v1.0.0-rc.3/lang/it.json
tests/fixtures/baseline-v1.0.0-rc.3/lang/nl.json
tests/fixtures/baseline-v1.0.0-rc.3/lang/pt.json
tests/fixtures/baseline-v1.0.0-rc.3/loadcomposer-v1.0.0-rc.3-standalone.html
tests/fixtures/baseline-v1.0.0-rc.3/loadcomposer-v1.0.0-rc.3.html
tests/functional-parity-v1.0.0-rc.4.mjs
tests/geometry-full-parity-v1.0.0-rc.4.mjs
tests/i18n-catalogs-rc.4.mjs
tests/i18n-identical-allowlist-rc.4.json
tests/i18n-modular-rc.4.mjs
tests/i18n-plural-engine-rc.4.mjs
tests/i18n-plural-source-audit-rc.4.mjs
tests/i18n-quantity-rendering-rc.4.mjs
tests/i18n-visual-responsive-rc.4.mjs
tests/legal-inline-rc.4.mjs
tests/loadcomposer-regression-rc.4.mjs
tests/orientation-source-audit-rc.4.mjs
tests/print-i18n-locales-rc.4.mjs
tests/print-pdf-rc.4.mjs
tests/print-plural-scenarios-rc.4.mjs
tests/rc4-hardening-audit.mjs
tests/rc4-scope-audit.mjs
tests/repository-release-audit-rc.4.mjs
tests/repository-runtime-rc.4.mjs
tests/responsive-rc.4.mjs
tests/scope-freeze-rc.4.mjs
tests/security-xss-rc.4.mjs
tests/trailer-prudential-alerts-rc.4.mjs
tests/version-consistency-rc.4.mjs
tests/visual-refinements-rc.4.mjs
tests/workflow-policy-rc.4.mjs
```

## Removed paths

### I — superseded RC.3 reports

```text
LEGAL_AUDIT-v1.0.0-rc.3.md
RELEASE_CHECKLIST-v1.0.0-rc.3.md
TEST_REPORT-v1.0.0-rc.3.md
WORKFLOW_VALIDATION-v1.0.0-rc.3.md
```

### D/K — superseded RC.3 glossaries

```text
docs/translations/TRANSLATION_GLOSSARY-it-de-v1.0.0-rc.3.md
docs/translations/TRANSLATION_GLOSSARY-it-en-v1.0.0-rc.3.md
docs/translations/TRANSLATION_GLOSSARY-it-es-v1.0.0-rc.3.md
docs/translations/TRANSLATION_GLOSSARY-it-fr-v1.0.0-rc.3.md
docs/translations/TRANSLATION_GLOSSARY-it-nl-v1.0.0-rc.3.md
docs/translations/TRANSLATION_GLOSSARY-it-pt-v1.0.0-rc.3.md
```

### J — superseded controls and bundle

```text
DELIVERY_MANIFEST-v1.0.0-rc.3.txt
SHA256SUMS-v1.0.0-rc.3.txt
loadcomposer-v1.0.0-rc.3-test-bundle.zip
```

### K — superseded generated site artifacts

```text
site/assets/loadcomposer-og-v1.0.0-rc.3.png
site/downloads/loadcomposer-v1.0.0-rc.3-standalone.html
site/downloads/loadcomposer-v1.0.0-rc.3-standalone.html.sha256
site/downloads/loadcomposer-v1.0.0-rc.3-standalone.zip
site/downloads/loadcomposer-v1.0.0-rc.3-standalone.zip.sha256
```

### H — superseded RC.3 test names

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

## Modified paths

### A/I — release metadata and documentation

```text
.github/ISSUE_TEMPLATE/bug.yml
CHANGELOG.md
README.it.md
README.md
ROADMAP.md
VERSION
docs/CLOUDFLARE_PREVIEW_CHECKLIST.md
docs/DEPLOYMENT.md
docs/GITHUB_FIRST_PUSH.md
docs/QUICK-START.md
```

### H/I — direct RC.3 test-boundary documentation

```text
docs/ARCHITECTURE.md
```

### A/H — package metadata and complete test chain

```text
package-lock.json
package.json
```

### A/K — versioned build and asset scripts

```text
scripts/build-standalone.mjs
scripts/package-standalone.mjs
scripts/prepare-release-assets.mjs
```

### D/K — glossary generation

```text
scripts/generate-translation-glossary.mjs
```

### J — mathematically correct N-2/N-1 controls

```text
scripts/create-delivery-controls.mjs
```

### E/F — inline legal headers and non-overlapping cache rules

```text
site/_headers
```

### A/B/C — version, three trailer profiles and warning precedence/rendering

```text
site/index.html
```

### A/B/C/D — seven localized catalogs

```text
site/lang/de.json
site/lang/en.json
site/lang/es.json
site/lang/fr.json
site/lang/it.json
site/lang/nl.json
site/lang/pt.json
```

### A/E — legal-page versioned standalone link

```text
site/legal/index.html
```

No changed path falls outside A–K. The 108 other common paths are byte-identical
to canonical RC.3, including the nine container profiles, pallet presets,
`site/404.html`, `_redirects`, robots, substantive legal documents, logos,
screenshots and inherited print-raster evidence.
