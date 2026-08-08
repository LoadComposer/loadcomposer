# Cache and inline-header validation — v1.0.0

Date: 2026-08-08

| Route class | Cache-Control |
|---|---|
| Home, legal, catalogs, assets, robots, sitemap | `public, max-age=0, must-revalidate` |
| `/404.html` | `no-store` |
| Standalone `.html`, clean URL, ZIP and two sidecars | `public, max-age=31536000, immutable` |
| `/downloads/` and nonexistent routes | no custom Cache-Control |

The global `/*` rule supplies security headers only. The five stable immutable
routes are exact:

- `/downloads/loadcomposer-v1.0.0-standalone.html`;
- `/downloads/loadcomposer-v1.0.0-standalone`;
- `/downloads/loadcomposer-v1.0.0-standalone.html.sha256`;
- `/downloads/loadcomposer-v1.0.0-standalone.zip`;
- `/downloads/loadcomposer-v1.0.0-standalone.zip.sha256`.

There is no broad `/downloads/*` rule. LICENSE and NOTICE add inline content
headers without adding a second cache value. No path combines
`must-revalidate` with `immutable`.

The local policy audit evaluated 36 paths on three modeled hosts for
`3 × 36 = 108/108` exact evaluations PASS. It detects duplicate or mixed cache
values, immutable on mutable pages, loss of 404 `no-store`, loss of clean-URL
immutable, and a generic download wildcard.

The strict local static-server check passed `13/13` routes. It intentionally
returned `404` for the clean URL because the local server does not reproduce
Cloudflare's `.html` redirect. It also does not reproduce Pages custom-404
status selection, `_headers` response composition, edge caching, the custom
domain, or `pages.dev`.

The RC.4 routes were previously verified online. The new stable paths and the
real `.html → 308 → clean URL 200` chain have not been verified online and
remain mandatory post-push checks.
