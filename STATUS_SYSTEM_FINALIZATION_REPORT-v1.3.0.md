# LoadComposer v1.3.0 — Status-system finalization report

Date: 2026-08-20  
Result: **PASS**  
Release identity: **v1.3.0** (same-version pre-release polish)

## Admitted baseline

- Delivery archive SHA-256: `26ba4c4fa5cda1e5536384f71e17ee1e1d8ffa0f60367bf5ef5e90fd018f2b36`.
- Corresponding admitted test-bundle SHA-256: `8833273d17a38749335bcfc67ffbbbff6042b374fbc72a4e8de1a8133435d7dd`.
- Archive admission: ZIP integrity PASS; one `delivery-v1.3.0/` root; 1,327 entries; no unsafe paths, duplicate paths or symlinks.
- Baseline controls: 1,229 manifest rows and 1,230 checksum rows verified with exact hashes and byte sizes.

## Frozen scope

The mm/cm/in conversion engine, m³/ft³ presentation rules, placement algorithms, scoring, Single/Mixed geometry, coordinates, capacity calculations, gaps, rotation, Single stacking, vehicle profiles, pallet profiles, legal documents and previously accepted responsive/print architecture were frozen. No model or data change was made.

Mixed mode remains an explicitly floor-only model and exposes no stacking information. This finalization documents that existing limit; it does not infer layers or invent a Mixed stacking status.

## Status vocabulary

| Surface | Positive | Partial | Negative diagnostic | Unknown | Negative final verdict |
|---|---|---|---|---|---|
| Load/capacity control | OK | PARZIALE | NON OK | — | — |
| Height/access control | OK | PARZIALE | NON OK | VERIFICA | — |
| Final outcome | CI STA | — | — | technical errors remain verification/diagnostic | NON CI STA |

English uses `FITS` / `DOES NOT FIT`; German `PASST` / `PASST NICHT`; Spanish `CABE` / `NO CABE`; French `ÇA RENTRE` / `NE RENTRE PAS`; Portuguese `CABE` / `NÃO CABE`; Dutch `PAST` / `PAST NIET`. Diagnostic `NON OK` wording remains separate from the final verdict.

## Authored files touched

- Runtime/UI: `site/index.html`; `site/lang/{it,en,de,es,fr,pt,nl}.json`.
- Build/release: `package.json`, `scripts/generate-translation-glossary.mjs`, `scripts/create-delivery-controls.mjs`.
- Tests: catalog/modular/scope/community/UI/regression/responsive/prudential/delivery tests plus new `tests/status-system-v1.3.0.mjs`.
- Reports: `CHANGELOG.md`, `CHANGELOG-v1.3.0.md`, `TEST_REPORT-v1.3.0.md`, and this report.
- Generated deliverables: current standalone HTML/ZIP and sidecars, Download page, six glossaries, status JSON/screenshots, refreshed current-version QA evidence, test bundle and delivery controls.

## Verification summary

- Status-focused browser evidence: 6/6 scenarios PASS; every tested badge is centered, `inline-flex`, `nowrap`, unclipped and free of quantities.
- Measured badge contrast: minimum 5.57:1 in light theme and 8.00:1 in dark theme for the focused desktop states; the mobile light access diagnostic measured 6.89:1.
- Localized capacity/status matrix: 77 scenarios across seven languages PASS.
- Exact required width matrix: 2560, 1920, 1600, 1366, 1280, 1024, 768, 390, 375 and 320 px = 10/10 PASS, with no page-level horizontal overflow.
- Exact geometry parity: 1,080 Single capacity + 4,110 Single load + 2,352 Mixed = 7,542/7,542 unchanged.
- Regression: 37/37; functional parity: 35/35; prudential alerts: 29/29; event actions/state: 20/20 + 7/7.
- Print: 33 core + 35 localized + 42 plural + 8 unit PDFs PASS. Final verdict wording matches UI, and zero free slots are retained in print without adding diagnostic badge graphics.
- Standalone: embedded catalogs match modular catalogs; file:// and HTTP runtime checks pass with zero remote requests.

## Mandatory 50-point checklist

1. [x] Exact delivery baseline SHA-256 admitted.
2. [x] Corresponding test-bundle SHA-256 recorded.
3. [x] ZIP integrity verified before extraction.
4. [x] Unique `delivery-v1.3.0/` archive root verified.
5. [x] Unsafe paths, duplicate paths and symlinks excluded.
6. [x] Baseline manifest hashes and sizes verified.
7. [x] Baseline checksum coverage verified.
8. [x] Version remains exactly v1.3.0.
9. [x] No new release entry or version was created.
10. [x] Geometry, placement and scoring code remained frozen.
11. [x] Capacity calculations and coordinates remained frozen.
12. [x] Vehicle and pallet profile data remained frozen.
13. [x] mm/cm/in and m³/ft³ behavior remained frozen.
14. [x] Canonical legal documents remained unchanged.
15. [x] Final positive verdict is CI STA/FITS-equivalent.
16. [x] Final negative verdict is NON CI STA/DOES NOT FIT-equivalent.
17. [x] NON OK remains a diagnostic control state.
18. [x] Technical/internal errors are not labeled NON CI STA.
19. [x] Complete load/capacity control renders OK in green.
20. [x] Partial load/capacity control renders PARZIALE in amber.
21. [x] Zero-placement load/capacity control renders NON OK in amber.
22. [x] Access state is computed independently of placed-count status.
23. [x] Fully passing known access renders OK in green.
24. [x] Mixed passing/failing access renders PARZIALE in amber.
25. [x] Fully failing known access renders NON OK in amber.
26. [x] Unknown rear access renders VERIFICA in amber.
27. [x] Final negative outcome alone uses the red status family.
28. [x] All result badges contain state text only.
29. [x] Result badges contain no quantities or ratios.
30. [x] Result badges are centered with inline-flex alignment.
31. [x] Result badges use nowrap and have no ellipsis.
32. [x] Table-level internal horizontal scrolling prevents badge collisions.
33. [x] Requested quantity is not repeated in every Single row.
34. [x] Single sufficient rows show found capacity outside the badge.
35. [x] Single sufficient rows show free slots, including exactly zero.
36. [x] Single insufficient rows show capacity and missing pallets without free slots.
37. [x] Mixed rows show loaded and missing counts without artificial capacity.
38. [x] Access detail retains internal height and rear-opening information.
39. [x] Maximum pallet height appears only when explanatory.
40. [x] UI and print use the same final verdict vocabulary.
41. [x] Print includes zero free slots.
42. [x] Print adds no diagnostic badge graphics.
43. [x] Results introduction was updated in all seven enabled languages.
44. [x] Catalog parity is 7 × 527 keys.
45. [x] Required ten-width responsive matrix passed without page overflow.
46. [x] Light and dark badge contrast passed WCAG text contrast guards.
47. [x] Six required IT/EN/DE desktop/mobile screenshots were generated and inspected.
48. [x] Single stacking regression passed; floor/layer disclosure remains informative.
49. [x] Mixed stacking limitation is documented without invented logic.
50. [x] Modular, standalone, geometry parity, test bundle and release controls passed.

## Conclusion

The status-system, badge-consistency and zero-free-slot finalization is release-ready within the authorized v1.3.0 scope. No blocker remains.
