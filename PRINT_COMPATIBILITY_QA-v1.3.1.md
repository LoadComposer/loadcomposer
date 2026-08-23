# LoadComposer v1.3.1 — Print compatibility QA

## Scope

Release note: **Print compatibility fix: LoadComposer now opens the browser print dialog from an isolated in-page print frame instead of a temporary tab, avoiding a Chromium focus/input issue.**

No geometry, capacity, vehicle, pallet, unit, status, trailer-prudential, native-theme, legal or dark-extension behavior is changed.

## Reproduction and expected result

### v1.3.0

1. Calculate a valid load.
2. Select **Print layout**.
3. A temporary top-level tab is opened with `window.open("", "_blank")`.
4. In some Chromium-family browsers, closing that underlying tab with its X while Print Preview is open can leave the main page without reliable input/select focus.

### v1.3.1

1. Calculate a valid load.
2. Select **Print layout**.
3. No top-level tab is created; a 1×1 off-screen same-page iframe hosts the unchanged print document.
4. Use native **Print** or **Cancel**.
5. Return to the same LoadComposer page and verify that text inputs, number inputs, checkboxes, radio buttons and selects still accept focus and changes.
6. Repeat the cycle at least five times.

Expected: one print dialog per click, zero new top-level tabs, unchanged printed content, and fully usable controls after every return.

## Automated evidence

- Chromium 149, local HTTP shell and standalone `file://`: PASS.
- Zero active `window.open` calls on the Print layout path: PASS.
- Iframe attributes, readiness, image decode, print invocation, `afterprint`, stale-frame cleanup, error cleanup and five repeated cycles: PASS.
- Fifteen representative focusable controls plus input/change/select behavior and form-state invariance: PASS.
- 33 print scenarios / 36 raster pages exactly identical to the frozen v1.3.0 baseline: PASS.
- 7,542 geometry cases unchanged: PASS.

The native browser print UI itself is not driven by headless automation. The automated cancel-equivalent dispatches `afterprint`; an exception path verifies fallback cleanup. Closing the historical v1.3.0 temporary tab with X is intentionally not reproduced in v1.3.1 because that tab no longer exists.

## Manual browser checklist

For each browser: test online and standalone modes; Single and Mixed; Side and Ramp; colour and B/W; Print and Cancel; five repeated cycles; then focus/edit a text input, number input, select, checkbox and unit radio.

| Browser | Automated in this environment | Required status before broad deployment |
|---|---:|---|
| Google Chrome | No | MANUAL EXTERNAL QA REQUIRED |
| Microsoft Edge | No | MANUAL EXTERNAL QA REQUIRED |
| Brave | No | MANUAL EXTERNAL QA REQUIRED |
| Opera | No | MANUAL EXTERNAL QA REQUIRED |
| Vivaldi | No | MANUAL EXTERNAL QA REQUIRED |
| SRWare Iron | No | MANUAL EXTERNAL QA REQUIRED |
| Firefox | No; executable unavailable | MANUAL EXTERNAL QA REQUIRED |

Chromium 149 headless is the only browser engine actually exercised in this build environment. WebKit was unavailable and not tested.

