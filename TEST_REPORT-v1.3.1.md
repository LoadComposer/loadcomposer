# LoadComposer v1.3.1 — Test report

Date: 2026-08-22. Environment: Chromium 149 headless, Linux, local HTTP and standalone `file://`.

| Area | Result |
|---|---|
| Print transport | PASS — zero top-level tabs; online/file; readiness, afterprint, stale/error cleanup; five repeated cycles; 15 focus controls; invariant form state. |
| Print content | PASS — 33/33 PDF scenarios, 36/36 raster pages exact to v1.3.0, zero authorized text changes. |
| Localized/plural print | PASS — 35/35 localized PDFs and 42/42 plural PDFs. |
| Units in print | PASS — 8/8 mm/cm/in, Single/Mixed, compact/custom, colour/B&W. |
| Geometry/capacity | PASS — 7,542/7,542 exact geometry cases; functional parity 35/35. |
| Visual/responsive | PASS — 112/112 responsive scenarios; picker/touch/B&W/orientation/footer/print-exclusion suites pass. |
| Security | PASS — 9/9 XSS cases and 28 scenarios; printed HTML has no script or inline handler. |
| Core regressions | PASS — events 20/20 + 7/7, repository runtime 16/16, status 6/6, trailer 29/29, final consistency 92/92. |
| Download/Legal/404 | PASS — Download 21 mobile + 40 visual; Legal 7/7 byte identity + 21 language/theme + 10 responsive; 404 21 language/theme + 8 responsive + 4 routes. |
| Standalone offline | PASS — zero remote requests. |

## Coverage limitations

Firefox and WebKit executables were unavailable. Chrome, Edge, Brave, Opera, Vivaldi and SRWare Iron were not installed. Native Print/Cancel UI and browser-specific X-button behavior require the manual external checklist in `PRINT_COMPATIBILITY_QA-v1.3.1.md`.

Result: release-candidate automated QA PASS within the explicitly stated environment capabilities.
