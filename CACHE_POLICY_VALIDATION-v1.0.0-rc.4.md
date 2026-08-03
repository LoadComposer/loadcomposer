# Cache and inline-header validation — v1.0.0-rc.4

Date: 2026-08-03

| Route class | Cache-Control |
|---|---|
| Home, legal, catalogs, assets, robots, sitemap | `public, max-age=0, must-revalidate` |
| `/404.html` | `no-store` |
| Standalone `.html`, clean URL, ZIP and two sidecars | `public, max-age=31536000, immutable` |
| `/downloads/` and nonexistent routes | no custom Cache-Control |

The global `/*` rule supplies only security headers. The five immutable routes
are exact; there is no broad `/downloads/*` rule. LICENSE and NOTICE exact rules
add only inline content headers, so they inherit one mutable cache value from
`/legal/*`. No path combines `must-revalidate` with `immutable`.

The audit evaluated all 31 deployable site files except `_headers` and
`_redirects`, plus `/`, `/legal/`, the clean standalone URL, `/downloads/` and
a nonexistent path: 36
paths on `loadcomposer.com`, the project `pages.dev` host and a versioned
`pages.dev` host, for `108/108` exact evaluations PASS.

Before this patch, requesting the physical
`/downloads/loadcomposer-v1.0.0-rc.4-standalone.html` produced Cloudflare's
`308` redirect to `/downloads/loadcomposer-v1.0.0-rc.4-standalone`. The redirect
response was already immutable, while the final clean-URL `200` response was
served with `public, max-age=0, must-revalidate`. The new exact clean-URL rule
models the final `200` response as `public, max-age=31536000, immutable` without
changing the existing exact `.html`, ZIP or sidecar rules.

This models the declared `_headers` rules locally. Actual Cloudflare response
headers, the `.html` → `308` → clean-URL `200` chain, edge-cache behavior and
custom-404 status remain post-push checks.
