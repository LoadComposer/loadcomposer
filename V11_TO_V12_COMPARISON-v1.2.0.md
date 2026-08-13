# Canonical v1.1.0 to v1.2.0 comparison

Date: 2026-08-12  
Baseline: `loadcomposer-v1.1.0-delivery.zip`  
Baseline SHA-256: `79c3b609e5bc08e7ed0fcf70b4d52d8e1bb468353f0024db60269751202de016`

The comparison is path- and SHA-256-based between the verified canonical
`delivery-v1.1.0/` tree and the final `delivery-v1.2.0/` tree. Counts are:

- unchanged: `189`;
- modified in place: `53`;
- new: `39`;
- removed/replaced delivery-only v1.1.0 controls: `3`;
- final files: `281`.

## Modified files — 53

1. `.github/ISSUE_TEMPLATE/bug.yml`
2. `CHANGELOG.md`
3. `README.it.md`
4. `README.md`
5. `ROADMAP.md`
6. `VERSION`
7. `docs/ARCHITECTURE.md`
8. `docs/CLOUDFLARE_PREVIEW_CHECKLIST.md`
9. `docs/DEPLOYMENT.md`
10. `docs/GITHUB_FIRST_PUSH.md`
11. `docs/QUICK-START.md`
12. `package-lock.json`
13. `package.json`
14. `scripts/build-standalone.mjs`
15. `scripts/create-delivery-controls.mjs`
16. `scripts/generate-translation-glossary.mjs`
17. `scripts/package-standalone.mjs`
18. `scripts/prepare-release-assets.mjs`
19. `site/_headers`
20. `site/index.html`
21. `site/lang/de.json`
22. `site/lang/en.json`
23. `site/lang/es.json`
24. `site/lang/fr.json`
25. `site/lang/it.json`
26. `site/lang/nl.json`
27. `site/lang/pt.json`
28. `site/legal/index.html`
29. `site/sitemap.xml`
30. `tests/cache-policy-v1.0.0.mjs`
31. `tests/check-js-syntax-i18n-v1.0.0.mjs`
32. `tests/compare-print-renders-v1.0.0.mjs`
33. `tests/delivery-packaging-v1.0.0.mjs`
34. `tests/event-audit-v1.0.0.mjs`
35. `tests/functional-parity-v1.0.0.mjs`
36. `tests/geometry-full-parity-v1.0.0.mjs`
37. `tests/hardening-audit-v1.0.0.mjs`
38. `tests/i18n-catalogs-v1.0.0.mjs`
39. `tests/i18n-identical-allowlist-v1.0.0.json`
40. `tests/i18n-modular-v1.0.0.mjs`
41. `tests/i18n-plural-engine-v1.0.0.mjs`
42. `tests/i18n-quantity-rendering-v1.0.0.mjs`
43. `tests/i18n-visual-responsive-v1.0.0.mjs`
44. `tests/orientation-source-audit-v1.0.0.mjs`
45. `tests/print-i18n-locales-v1.0.0.mjs`
46. `tests/print-pdf-v1.0.0.mjs`
47. `tests/print-plural-scenarios-v1.0.0.mjs`
48. `tests/repository-release-audit-v1.0.0.mjs`
49. `tests/repository-runtime-v1.0.0.mjs`
50. `tests/responsive-v1.0.0.mjs`
51. `tests/trailer-prudential-alerts-v1.0.0.mjs`
52. `tests/version-consistency-v1.0.0.mjs`
53. `tests/visual-refinements-v1.0.0.mjs`

These changes are limited to version metadata, the localized Download page and
footer link, generated current artifacts/glossaries, remaining-space and
compact-message presentation, print display of the same existing values,
cache/sitemap/documentation, and tests adapted to the direct v1.1.0 fixture.
Historical test filenames are intentionally retained.

## New files — 39

1. `CACHE_POLICY_VALIDATION-v1.2.0.md`
2. `CHANGELOG-v1.2.0.md`
3. `DELIVERY_MANIFEST-v1.2.0.txt`
4. `LEGAL_AUDIT-v1.2.0.md`
5. `RELEASE_CHECKLIST-v1.2.0.md`
6. `SHA256SUMS-v1.2.0.txt`
7. `TEST_REPORT-v1.2.0.md`
8. `TRAILER_DIMENSIONS_REVIEW-v1.2.0.md`
9. `V11_TO_V12_COMPARISON-v1.2.0.md`
10. `WORKFLOW_VALIDATION-v1.2.0.md`
11. `docs/translations/TRANSLATION_GLOSSARY-it-de-v1.2.0.md`
12. `docs/translations/TRANSLATION_GLOSSARY-it-en-v1.2.0.md`
13. `docs/translations/TRANSLATION_GLOSSARY-it-es-v1.2.0.md`
14. `docs/translations/TRANSLATION_GLOSSARY-it-fr-v1.2.0.md`
15. `docs/translations/TRANSLATION_GLOSSARY-it-nl-v1.2.0.md`
16. `docs/translations/TRANSLATION_GLOSSARY-it-pt-v1.2.0.md`
17. `loadcomposer-v1.2.0-test-bundle.zip`
18. `scripts/build-downloads-page.mjs`
19. `scripts/templates/downloads-index.html`
20. `site/assets/loadcomposer-og-v1.2.0.png`
21. `site/downloads/index.html`
22. `site/downloads/loadcomposer-v1.2.0-standalone.html`
23. `site/downloads/loadcomposer-v1.2.0-standalone.html.sha256`
24. `site/downloads/loadcomposer-v1.2.0-standalone.zip`
25. `site/downloads/loadcomposer-v1.2.0-standalone.zip.sha256`
26. `tests/community-feedback-v1.2.0.mjs`
27. `tests/downloads-page-v1.2.0.mjs`
28. `tests/fixtures/baseline-v1.1.0/lang/de.json`
29. `tests/fixtures/baseline-v1.1.0/lang/en.json`
30. `tests/fixtures/baseline-v1.1.0/lang/es.json`
31. `tests/fixtures/baseline-v1.1.0/lang/fr.json`
32. `tests/fixtures/baseline-v1.1.0/lang/index.json`
33. `tests/fixtures/baseline-v1.1.0/lang/it.json`
34. `tests/fixtures/baseline-v1.1.0/lang/nl.json`
35. `tests/fixtures/baseline-v1.1.0/lang/pt.json`
36. `tests/fixtures/baseline-v1.1.0/loadcomposer-v1.1.0-standalone.html`
37. `tests/fixtures/baseline-v1.1.0/loadcomposer-v1.1.0.html`
38. `tests/remaining-space-v1.2.0.mjs`
39. `tests/v12-scope-audit-v1.2.0.mjs`

## Removed/replaced files — 3

1. `DELIVERY_MANIFEST-v1.1.0.txt`
2. `SHA256SUMS-v1.1.0.txt`
3. `loadcomposer-v1.1.0-test-bundle.zip`

These are delivery-only controls and the nested test bundle for the prior
release. They are replaced by v1.2.0 counterparts. No application source,
legal document, historical report, historical public standalone artifact or
regression fixture was deleted.

## Functional conclusion

The normalized exact-source audit, `35/35` functional parity, `7,542/7,542`
equivalent-input geometry comparisons, `29/29` trailer scenarios, semantic
remaining-space checks in all seven languages, and all other tests confirm
that no geometry, equipment, pallet, algorithm, threshold, capacity, result or
alert activation changed. No ambiguity required an out-of-scope product
decision.
