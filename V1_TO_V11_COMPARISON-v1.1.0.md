# Canonical v1.0.0 to v1.1.0 comparison

Date: 2026-08-11  
Baseline: `loadcomposer-v1.0.0-delivery(3).zip`  
Baseline SHA-256: `7d0798a2dcb228eb93a26d77e4e24dd3ef0f1d40df38df8c33155d3c7872f4f2`

The comparison is path- and SHA-256-based between the verified canonical
`delivery-v1.0.0/` tree and the final `delivery-v1.1.0/` tree. Counts are:

- unchanged: `157`;
- modified in place: `54`;
- new: `34`;
- removed/replaced delivery-only v1.0.0 controls: `3`;
- final files: `245`.

## Modified files — 54

1. `.github/ISSUE_TEMPLATE/bug.yml`
2. `.gitignore`
3. `CHANGELOG.md`
4. `CONTRIBUTING.md`
5. `README.it.md`
6. `README.md`
7. `ROADMAP.md`
8. `VERSION`
9. `docs/ARCHITECTURE.md`
10. `docs/CLOUDFLARE_PREVIEW_CHECKLIST.md`
11. `docs/DEPLOYMENT.md`
12. `docs/GITHUB_FIRST_PUSH.md`
13. `docs/QUICK-START.md`
14. `package-lock.json`
15. `package.json`
16. `scripts/build-standalone.mjs`
17. `scripts/create-delivery-controls.mjs`
18. `scripts/generate-translation-glossary.mjs`
19. `scripts/package-standalone.mjs`
20. `scripts/prepare-release-assets.mjs`
21. `site/_headers`
22. `site/index.html`
23. `site/lang/de.json`
24. `site/lang/en.json`
25. `site/lang/es.json`
26. `site/lang/fr.json`
27. `site/lang/it.json`
28. `site/lang/nl.json`
29. `site/lang/pt.json`
30. `site/legal/index.html`
31. `tests/cache-policy-v1.0.0.mjs`
32. `tests/check-js-syntax-i18n-v1.0.0.mjs`
33. `tests/compare-print-renders-v1.0.0.mjs`
34. `tests/delivery-packaging-v1.0.0.mjs`
35. `tests/event-audit-v1.0.0.mjs`
36. `tests/functional-parity-v1.0.0.mjs`
37. `tests/geometry-full-parity-v1.0.0.mjs`
38. `tests/hardening-audit-v1.0.0.mjs`
39. `tests/i18n-catalogs-v1.0.0.mjs`
40. `tests/i18n-identical-allowlist-v1.0.0.json`
41. `tests/i18n-modular-v1.0.0.mjs`
42. `tests/i18n-plural-engine-v1.0.0.mjs`
43. `tests/i18n-quantity-rendering-v1.0.0.mjs`
44. `tests/i18n-visual-responsive-v1.0.0.mjs`
45. `tests/orientation-source-audit-v1.0.0.mjs`
46. `tests/print-i18n-locales-v1.0.0.mjs`
47. `tests/print-pdf-v1.0.0.mjs`
48. `tests/print-plural-scenarios-v1.0.0.mjs`
49. `tests/repository-release-audit-v1.0.0.mjs`
50. `tests/repository-runtime-v1.0.0.mjs`
51. `tests/responsive-v1.0.0.mjs`
52. `tests/trailer-prudential-alerts-v1.0.0.mjs`
53. `tests/version-consistency-v1.0.0.mjs`
54. `tests/visual-refinements-v1.0.0.mjs`

These changes are limited to current-version metadata/artifact paths, the two
footer links and three localized keys, their generated standalone/glossary
outputs, documentation, and tests adapted to compare against the stable v1.0.0
fixture. Historical test filenames were intentionally retained.

## New files — 34

1. `CACHE_POLICY_VALIDATION-v1.1.0.md`
2. `CHANGELOG-v1.1.0.md`
3. `DELIVERY_MANIFEST-v1.1.0.txt`
4. `LEGAL_AUDIT-v1.1.0.md`
5. `RELEASE_CHECKLIST-v1.1.0.md`
6. `SHA256SUMS-v1.1.0.txt`
7. `TEST_REPORT-v1.1.0.md`
8. `TRAILER_DIMENSIONS_REVIEW-v1.1.0.md`
9. `V1_TO_V11_COMPARISON-v1.1.0.md`
10. `WORKFLOW_VALIDATION-v1.1.0.md`
11. `docs/translations/TRANSLATION_GLOSSARY-it-de-v1.1.0.md`
12. `docs/translations/TRANSLATION_GLOSSARY-it-en-v1.1.0.md`
13. `docs/translations/TRANSLATION_GLOSSARY-it-es-v1.1.0.md`
14. `docs/translations/TRANSLATION_GLOSSARY-it-fr-v1.1.0.md`
15. `docs/translations/TRANSLATION_GLOSSARY-it-nl-v1.1.0.md`
16. `docs/translations/TRANSLATION_GLOSSARY-it-pt-v1.1.0.md`
17. `loadcomposer-v1.1.0-test-bundle.zip`
18. `site/assets/loadcomposer-og-v1.1.0.png`
19. `site/downloads/loadcomposer-v1.1.0-standalone.html`
20. `site/downloads/loadcomposer-v1.1.0-standalone.html.sha256`
21. `site/downloads/loadcomposer-v1.1.0-standalone.zip`
22. `site/downloads/loadcomposer-v1.1.0-standalone.zip.sha256`
23. `tests/community-feedback-v1.1.0.mjs`
24. `tests/community-scope-audit-v1.1.0.mjs`
25. `tests/fixtures/baseline-v1.0.0/lang/de.json`
26. `tests/fixtures/baseline-v1.0.0/lang/en.json`
27. `tests/fixtures/baseline-v1.0.0/lang/es.json`
28. `tests/fixtures/baseline-v1.0.0/lang/fr.json`
29. `tests/fixtures/baseline-v1.0.0/lang/index.json`
30. `tests/fixtures/baseline-v1.0.0/lang/it.json`
31. `tests/fixtures/baseline-v1.0.0/lang/nl.json`
32. `tests/fixtures/baseline-v1.0.0/lang/pt.json`
33. `tests/fixtures/baseline-v1.0.0/loadcomposer-v1.0.0-standalone.html`
34. `tests/fixtures/baseline-v1.0.0/loadcomposer-v1.0.0.html`

## Removed/replaced files — 3

1. `DELIVERY_MANIFEST-v1.0.0.txt`
2. `SHA256SUMS-v1.0.0.txt`
3. `loadcomposer-v1.0.0-test-bundle.zip`

These are delivery-only controls and a nested test bundle for the prior
release. They are replaced by their v1.1.0 counterparts; no application source,
legal document, historical report, v1.0.0 public standalone artifact, or
regression fixture was deleted.

## Functional conclusion

The exact scope audit, `35/35` functional parity, `7,542/7,542`
equivalent-input geometry comparisons, `29/29` trailer scenarios, `47/47`
pixel-identical approved print renders and all other tests confirm that
geometry, equipment, pallets, algorithms, thresholds and baseline operational
results were not modified. No ambiguity required an out-of-scope product
decision.
