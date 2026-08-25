# LoadComposer v1.3.2 test bundle

This bundle contains the v1.3.2 application source used by the tests, the published v1.3.1 standalone reference, focused v1.3.2 test programs, result JSON files, and visual evidence.

The main permanent regressions are `tests/geometry-hotfix-v1.3.2.mjs`, `tests/front-compaction-v1.3.2.mjs`, and `tests/version-consistency-v1.3.2.mjs`. They check the canonical 20' Dry / 10 × 1200 × 1000 mm case, geometry validity, deterministic post-selection front compaction, preview and print pallet counts, rotation constraints, gaps, units, homogeneous mixed-group identity, a 500-pallet stress path, and current-version agreement across the application and all seven enabled language catalogs.

Additional test programs provide:

- independent bounded exhaustive small-N reference checks;
- the 7,542-case monotonic geometry delta and front-compaction audit;
- before/after performance measurements;
- mixed-group, trailer prudential, status, units, standalone, print-transport, functional, historical-evidence and visual checks.

Run from the bundle root after installing the exact `devDependencies` from `package-lock.json`. Tests that admit the original delivery also require the canonical v1.3.1 delivery ZIP/root through the environment variables documented in those test files.

`SHA256SUMS-v1.3.2.txt` covers every other file in this test bundle.
