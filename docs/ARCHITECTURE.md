# Architecture

LoadComposer is a static, client-side application with no application backend.

## Runtime

- `site/index.html` contains the application structure, design system, browser logic, geometric engine, canvas rendering, print layout, and local preference handling.
- `site/lang/index.json` lists enabled language catalogs.
- `site/lang/*.json` contains the seven localized catalogs.
- The modular page loads only same-origin catalog JSON.
- `site/downloads/loadcomposer-v1.0.0-rc.2-standalone.html` is deterministically generated from the same page and embeds the language index and catalogs.
- `site/downloads/loadcomposer-v1.0.0-rc.2-standalone.zip` is the primary offline distribution and adds the controlling license, informational translation, notice, readme, and internal checksums.
- `site/legal/` exposes byte-identical copies of the canonical legal documents plus a static index.
- The application stores only theme and language preferences in browser `localStorage`; planning inputs are processed in the current page.

## Build

`scripts/build-standalone.mjs` validates catalog-key parity and injects escaped JSON into the fixed embedded-i18n marker. `scripts/generate-translation-glossary.mjs` creates reproducible Italian-to-target glossaries. `scripts/prepare-release-assets.mjs` extracts exact approved logo and favicon SVG data from the application and produces the local social preview.

No framework, bundler, package registry, CDN, external font, remote script, or application server is required at runtime.

## Test boundaries

The repository contains an exact `v1.0.0-rc.1` application fixture, derived from the canonical signed delivery, for direct regression checks. It contains no earlier application version. Tests compare:

- translated text and catalog keys;
- application source regions outside permitted version/metadata changes;
- functional and event behavior;
- full single and mixed geometric outputs;
- responsive and visual states;
- security/XSS scenarios; and
- print results and approved print pixels.

Repository-level audits separately validate legal files, metadata, offline behavior, Cloudflare configuration, and absence of trackers or remote runtime resources.
