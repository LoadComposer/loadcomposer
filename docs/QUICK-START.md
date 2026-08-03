# Quick start

## Use the web build locally

LoadComposer’s modular page fetches local language JSON, so serve `site/` over HTTP:

```bash
python3 -m http.server 8000 --directory site
```

Open `http://127.0.0.1:8000/`. A Node static server or any ordinary static host is equally suitable.

## Use the standalone build

Use `site/downloads/loadcomposer-v1.0.0-rc.4-standalone.zip` as the primary
offline download. Extract it, verify `SHA256SUMS.txt`, and open the included
HTML directly. It embeds the seven catalogs and is tested through `file://`;
it does not need installation or a network connection. The single HTML remains
available as the secondary **Standalone HTML only** download.

## Basic workflow

1. Select one pallet type or mixed-pallet mode.
2. Enter quantities and, when applicable, dimensions and stack levels.
3. Choose rotation or mandatory fork-entry orientation.
4. Compare the geometric estimates for the listed equipment.
5. Select a vehicle to inspect the preview in side or ramp view.
6. Use colour or black-and-white printing as required.
7. Verify dimensions, actual equipment, weight, balance, handling, securing, and legal constraints before loading.

The interface includes Italian, English, German, Spanish, French, Portuguese, and Dutch. Theme and language preferences may be retained locally by the browser.

## Develop and test

Use Node.js 22 or later:

```bash
npm ci
npm test
```

The test suite is intentionally comprehensive and includes browser screenshots and 110 PDF scenarios, so it takes longer than a unit-only suite.
