# Cache and inline-header validation — v1.1.0

Date: 2026-08-11

| Route class | Cache-Control |
|---|---|
| Home, legal, catalogs, assets, robots, sitemap | `public, max-age=0, must-revalidate` |
| `/404.html` | `no-store` |
| Versioned standalone `.html`, clean URL, ZIP and two sidecars | `public, max-age=31536000, immutable` |
| `/downloads/` and nonexistent routes | no custom Cache-Control |

The v1.0.0 immutable rules are preserved and five exact v1.1.0 routes are added:

- `/downloads/loadcomposer-v1.1.0-standalone.html`;
- `/downloads/loadcomposer-v1.1.0-standalone`;
- `/downloads/loadcomposer-v1.1.0-standalone.html.sha256`;
- `/downloads/loadcomposer-v1.1.0-standalone.zip`;
- `/downloads/loadcomposer-v1.1.0-standalone.zip.sha256`.

There is no broad `/downloads/*` rule. LICENSE and NOTICE retain their inline
content headers without adding a second cache value. No path combines
`must-revalidate` with `immutable`.

The local policy audit evaluated 42 paths on three modeled hosts for
`3 × 42 = 126/126` exact evaluations PASS. It detects duplicate or mixed cache
values, immutable caching on mutable pages, loss of 404 `no-store`, loss of a
clean-URL immutable rule, and any generic download wildcard.

The strict local static-server route matrix passed `13/13`. The local server
does not reproduce Cloudflare's `.html → 308 → clean URL 200` redirect,
custom-header composition, edge caching, custom-domain routing, `pages.dev`, or
custom-404 status selection. No online or post-deployment behavior was tested;
those checks remain mandatory after an authorized push and deployment.
