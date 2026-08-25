# LoadComposer v1.3.2 test bundle

This bundle contains the v1.3.2 application source used by the tests, the published v1.3.1 standalone reference, focused v1.3.2 test programs, result JSON files, and visual evidence.

The main permanent regressions are `tests/geometry-hotfix-v1.3.2.mjs`, `tests/front-compaction-v1.3.2.mjs`, `tests/version-consistency-v1.3.2.mjs`, and `tests/hardening-audit-v1.3.2.mjs`. They check the canonical 20' Dry / 10 × 1200 × 1000 mm case, geometry validity, deterministic post-selection front compaction, preview and print pallet counts, rotation constraints, gaps, units, homogeneous mixed-group identity, a 500-pallet stress path, current-version agreement across the application and all seven enabled language catalogs, and the current release hardening/security invariants.

Additional test programs provide:

- independent bounded exhaustive small-N reference checks;
- the 7,542-case monotonic geometry delta and front-compaction audit;
- before/after performance measurements;
- mixed-group, trailer prudential, status, units, standalone, print-transport, functional, historical-evidence and visual checks.

Run `npm test` from the bundle root after installing the exact `devDependencies` from `package-lock.json`. The normal CI suite is self-contained and does not require a historical delivery ZIP.

Release provenance remains explicit QA. `npm run test:release-input-admission` requires the canonical v1.3.1 delivery ZIP and extracted root through the environment variables documented in `tests/input-admission-v1.3.2.mjs`; `npm run test:release-historical` requires the canonical extracted root documented in `tests/historical-evidence-audit-v1.3.2.mjs`. These commands fail clearly when their required external input is absent. `npm run test:release` combines normal CI, both external-input release audits, and delivery packaging validation.

`SHA256SUMS-v1.3.2.txt` covers every other file in this test bundle.
