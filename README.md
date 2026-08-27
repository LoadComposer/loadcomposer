<p align="center">
  <img src="site/assets/loadcomposer-desktop-day.svg" width="560" alt="LoadComposer — Compose the perfect load">
</p>

<p align="center"><strong>Compose the perfect load.</strong></p>

# LoadComposer

LoadComposer is a browser-based planning aid that estimates how pallets fit geometrically in common maritime containers and 13.60 m semi-trailers. It supports single-pallet and mixed-pallet scenarios, rotation and mandatory fork-entry orientation, layered quantities, responsive previews, localized operational printouts, and an offline standalone page.

> **Current release:** `v1.3.4` (first stable release: `v1.0.0`). Verify results before operational use.

| Day | Night |
|---|---|
| ![LoadComposer day theme](docs/screenshots/loadcomposer-day-desktop.png) | ![LoadComposer night theme](docs/screenshots/loadcomposer-night-desktop.png) |

| Mixed desktop | Mixed mobile |
|---|---|
| ![Mixed-pallet desktop workflow](docs/screenshots/loadcomposer-mixed-desktop-de.png) | ![Mixed-pallet mobile workflow](docs/screenshots/loadcomposer-mixed-mobile.png) |

## Capabilities

- Single-type and mixed-pallet composition with floor and layer quantities.
- Pallet presets plus custom dimensions and orientation constraints.
- Maritime equipment: 20' Dry, 40' Dry, 40' High Cube, 45' High Cube, 20' Reefer, 40' HC Reefer, 40' HC Pallet Wide, 45' HC Pallet Wide, and 45' Reefer Pallet Wide.
- 13.60 m curtain-side, mega, and refrigerated semi-trailers.
- Side and ramp views, colour and black-and-white modes, light and dark themes.
- Localized interface and print in Italian, English, German, Spanish, French, Portuguese, and Dutch.
- Modular web deployment with local language catalogs, plus a self-contained standalone HTML page that works through `file://`.
- Browser-local calculation with no application backend, trackers, analytics, external fonts, or runtime CDN dependencies.

## Quick start

For the hosted application:

```bash
python3 -m http.server 8000 --directory site
```

Open `http://127.0.0.1:8000/`.

Use the hosted planner when Internet access is available. The Download page
explains the two modes and provides the current offline artifacts:

```text
site/downloads/index.html
```

For offline use, the simplest download is the standalone HTML:

```text
site/downloads/loadcomposer-v1.3.4-standalone.html
```

Copy it to the offline computer and open it in a browser. A compressed ZIP for
archiving or internal distribution is also available as
`site/downloads/loadcomposer-v1.3.4-standalone.zip`.

To reproduce the application and run all checks:

```bash
node --version  # v22.17.0, or a compatible >=24.0.0 release
npm ci
npm test
```

The verified baseline is Node.js 22.17.0 with npm 11.9.0. Cloudflare Pages
requires no framework and no build command; set the output directory to `site`.
See the [first-push guide](docs/GITHUB_FIRST_PUSH.md), [deployment instructions](docs/DEPLOYMENT.md),
and [Cloudflare preview checklist](docs/CLOUDFLARE_PREVIEW_CHECKLIST.md).

## Important limitations

LoadComposer produces geometric estimates with heuristic arrangements. It is not an engineering analysis, loading instruction, safety certification, or regulatory check. It does not establish weight compliance, balance, center of gravity, axle or floor loads, stability, lashing, packaging strength, equipment access, hazardous-goods compliance, or actual vehicle tolerances. “NON OK” does not prove that no feasible arrangement exists. A positive result does not prove that loading is safe or lawful.

Confirm measurements and the actual equipment, then obtain qualified operational, engineering, safety, carrier, and legal review. Read [LIMITATIONS.md](docs/LIMITATIONS.md) and the disclaimer in [LICENSE](LICENSE).

## Project map

- `site/` — production-ready static site and Cloudflare Pages output.
- `site/downloads/` — localized Download page, current and historical standalone artifacts, and SHA-256 sidecars.
- `site/legal/` — public byte-identical legal-document copies and legal index.
- `site/lang/` — seven enabled catalogs and language index.
- `docs/` — quick start, architecture, limitations, deployment, release process, screenshots, and verification evidence.
- `scripts/` — deterministic standalone, glossary, and release-asset generation.
- `tests/` — functional, i18n, visual, geometric, security, event, print, repository, and packaging checks.
- `.github/` — issue forms, pull-request template, and CI workflows.

## License, privacy, and contributions

LoadComposer is source-available under the custom [LoadComposer Community License 1.0](LICENSE), identifier `LCCL-1.0` and package expression `LicenseRef-LoadComposer-Community-1.0`. It permits the uses described there, including ordinary internal business use, but reserves defined monetized exploitation for a separate commercial agreement. The English `LICENSE` is the controlling legal text; `LICENSE.it.md` is an informational translation.

- Public legal index: [site/legal/](site/legal/)
- Commercial licensing: [COMMERCIAL-LICENSING.md](COMMERCIAL-LICENSING.md)
- Contribution process and contributor grant: [CONTRIBUTING.md](CONTRIBUTING.md), [CLA.md](CLA.md)
- Security reporting: [SECURITY.md](SECURITY.md)
- Privacy: [PRIVACY.md](PRIVACY.md)
- Marks and logo: [TRADEMARKS.md](TRADEMARKS.md)
- Roadmap: [ROADMAP.md](ROADMAP.md)

Official site: [loadcomposer.com](https://loadcomposer.com/)  
Official repository: [github.com/LoadComposer/loadcomposer](https://github.com/LoadComposer/loadcomposer)  
Download options: [loadcomposer.com/downloads/](https://loadcomposer.com/downloads/)  
Current standalone HTML: [v1.3.4](https://loadcomposer.com/downloads/loadcomposer-v1.3.4-standalone.html)

Copyright © 2026 Marco Pernigotti.
