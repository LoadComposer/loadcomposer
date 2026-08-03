# Cache and inline-header validation — v1.0.0-rc.4

Date: 2026-08-03

| Route class | Cache-Control |
|---|---|
| Home, legal, catalogs, assets, robots, sitemap | `public, max-age=0, must-revalidate` |
| `/404.html` | `no-store` |
| Four exact versioned RC.4 downloads | `public, max-age=31536000, immutable` |
| `/downloads/` and nonexistent routes | no custom Cache-Control |

The global `/*` rule supplies only security headers. The four immutable routes
are exact; there is no broad `/downloads/*` rule. LICENSE and NOTICE exact rules
add only inline content headers, so they inherit one mutable cache value from
`/legal/*`. No path combines `must-revalidate` with `immutable`.

The audit evaluated all 31 deployable site files except `_headers` and
`_redirects`, plus `/`, `/legal/`, `/downloads/` and a nonexistent path: 35
paths on `loadcomposer.com`, the project `pages.dev` host and a versioned
`pages.dev` host, for `105/105` exact evaluations PASS.

This models the declared `_headers` rules locally. Actual Cloudflare response
headers, edge-cache behavior and custom-404 status remain post-push checks.
