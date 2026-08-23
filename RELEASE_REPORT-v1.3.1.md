# LoadComposer v1.3.1 — Final release report

Date: 2026-08-22. Scope: print transport/compatibility patch only.

1. **SHA input v1.3.0:** `54d9b432431917042148e0d8aa9e50e77f2ee5d1d3794db08ca994eefe127e99`.
2. **ZIP admission:** PASS; `unzip -t`, single expected root, no unsafe/duplicate paths or symlinks.
3. **Manifest admission:** PASS; 1,243 payload records matched hash and byte size.
4. **SHA256SUMS admission:** PASS; 1,244/1,244 entries verified.
5. **Input inventory:** 1,245 files, manifest N−2, checksum list N−1, zero missing/extra files.
6. **Output version:** v1.3.1.
7. **Authored files:** release metadata/docs; `site/index.html`; seven language catalogs; `_headers`; release scripts/templates; iframe-aware test harnesses; new print-transport test and QA reports. Full classification is in `DELTA_AUDIT-v1.3.1.md`.
8. **Generated files:** v1.3.1 standalone HTML/ZIP and sidecars, pages/assets/glossaries, JSON results, PDF/raster/screenshots, test bundle, manifest and checksum list.
9. **Old print transport:** v1.3.0 opened a temporary `_blank` top-level page using `window.open`.
10. **New print transport:** v1.3.1 writes the same print document into an isolated off-screen same-page iframe.
11. **Zero top-level print tabs:** confirmed by source audit and Chromium harness.
12. **Zero active `window.open` for Print layout:** confirmed in authored and standalone code.
13. **Iframe lifecycle:** stale frame removed before creation; one fixed, off-screen, 1×1, borderless, `aria-hidden`, `tabindex=-1` frame appended per cycle.
14. **Readiness:** iframe load plus embedded schema-image load/decode; readiness is marked on the print body.
15. **Print invocation:** exactly `iframe.contentWindow.print()` after readiness and a 50 ms stabilization delay.
16. **`afterprint`:** one-shot listener removes the matching frame.
17. **Fallback cleanup:** synchronous construction, image/decode and print exceptions remove the frame and emit the generic localized error.
18. **Repeated-print cleanup:** five automated cycles PASS; any stale retained frame is removed before the next cycle.
19. **No arbitrary short-timeout destruction:** confirmed; the 50 ms timer schedules print but never destroys the frame.
20. **Error handling:** exception-path cleanup and one generic alert PASS.
21. **Old wording:** popup-blocker-specific `print.popupBlocked` removed from active catalogs/source.
22. **New wording:** generic inability-to-open-browser-print-dialog message, with no popup guidance.
23. **Seven-language parity:** `print.dialogUnavailable` present and catalog parity PASS in it/en/de/es/fr/pt/nl.
24. **Chromium automated test:** PASS on Chromium 149 headless.
25. **Firefox automated test:** NOT RUN; no Firefox executable/runtime was available. MANUAL EXTERNAL QA REQUIRED.
26. **WebKit:** NOT RUN; no WebKit runtime was available. MANUAL EXTERNAL QA REQUIRED where relevant.
27. **Manual-QA checklist:** supplied in `PRINT_COMPATIBILITY_QA-v1.3.1.md` for Chrome, Edge, Brave, Opera, Vivaldi, SRWare Iron and Firefox.
28. **Browsers not actually tested:** Chrome branded, Edge, Brave, Opera, Vivaldi, SRWare Iron, Firefox and WebKit/Safari.
29. **Online-shell local test:** PASS over local HTTP, all seven languages, no unexpected runtime errors.
30. **Standalone `file://` test:** PASS.
31. **No-remote standalone:** PASS; zero remote requests.
32. **Print/cancel behavior:** print invocation and `afterprint` cancel-equivalent PASS in automation; native Print/Cancel UI requires manual external QA.
33. **Input-focus regression:** 15 representative controls plus input/change events PASS after repeated print cycles.
34. **Select-focus regression:** print view, result selection and load-mode selects remain focusable/changeable; PASS.
35. **Repeated-print regression:** five cycles, stale-frame replacement and afterprint cleanup PASS.
36. **Single print scenarios:** PASS.
37. **Mixed print scenarios:** PASS.
38. **Stacking print:** PASS.
39. **Compact-loading print:** PASS.
40. **mm print:** PASS.
41. **cm print:** PASS.
42. **in print:** PASS.
43. **Side print:** PASS.
44. **Ramp print:** PASS.
45. **Colour print:** PASS.
46. **B/W print:** PASS.
47. **A4 pagination:** PASS; 1- and 2-page expected outputs verified across 33 PDF scenarios.
48. **Print raster parity:** 36/36 pages SHA/pixel identical to canonical v1.3.0; zero differences.
49. **Print-data parity:** normalized v1.3.0/v1.3.1 print DOM identical for equal inputs; 33 scenario render records and labels/dimensions invariant.
50. **Geometry parity:** 7,542/7,542 exact cases; zero coordinate/dimension/rotation/bounds/overlap/gap/span differences.
51. **Capacity parity:** PASS through the geometry matrix and 35/35 functional-parity scenarios.
52. **Units regression:** PASS for mm/cm/in online and printed output.
53. **Trailer-access regression:** 29/29 prudential cases PASS.
54. **Status regression:** 6/6 status-system scenarios PASS.
55. **Mixed regression:** mixed functional, geometry, localized, print, B/W and long-legend suites PASS.
56. **Native-theme regression:** light/dark/auto visual suites PASS.
57. **No dark-extension fixes:** explicitly confirmed; no Dark Reader/dark-extension compatibility code was added.
58. **Legal byte identity:** all seven legal source files are byte-identical to v1.3.0.
59. **Download regression:** PASS; 21 mobile and 40 visual scenarios.
60. **404/Legal regression:** PASS; Legal 7/7 identity, 21 language/theme and 10 responsive; 404 21 language/theme, 8 responsive and 4 routes.
61. **Historical v1.3.0 artifacts:** retained, including standalone HTML/ZIP and SHA sidecars.
62. **Final file count:** 1,652.
63. **Manifest entry count:** 1,650 (N−2).
64. **SHA256SUMS entry count:** 1,651 (N−1).
65. **SHA-256 delivery v1.3.1:** `__DELIVERY_SHA256__` in the external sealed report; an archive cannot embed its own final digest without changing it.
66. **SHA-256 test bundle:** `aa4f4e44661ac1663cec7de50c389489cafe93b8506d4d99a0e34ee9fd582e80`.
67. **SHA-256 standalone HTML:** `1bc68958842532a2017547cd9362d5f9aa96c62f7b7eadb3ced1adaf27ad23b5`.
68. **SHA-256 standalone ZIP:** `365e8e861f0faf984c1aaec7c11fb23df88f58812ee2df67391d89a725238884`.
69. **Warnings:** browser coverage is limited to Chromium 149 headless; native browser Print/Cancel UI and branded-browser behavior remain manual external QA. No unreported automated failure remains.
70. **Functional-scope confirmation:** the only functional change is print transport/compatibility; the print document, geometry and all v1.3.0 application functions are unchanged.
