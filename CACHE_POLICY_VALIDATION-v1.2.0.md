# Cache and inline-header validation — v1.2.0

Date: 2026-08-12

| Route class | Cache-Control |
|---|---|
| Home, `/downloads/`, both index files, legal, catalogs, assets, robots and sitemap | `public, max-age=0, must-revalidate` |
| `/404.html` | `no-store` |
| Exact v1.0.0, v1.1.0 and v1.2.0 standalone HTML, clean URL, ZIP and two sidecars | `public, max-age=31536000, immutable` |
| Nonexistent routes | no custom Cache-Control |

The ten exact immutable routes for v1.0.0 and v1.1.0 are preserved. Five exact
v1.2.0 routes are added:

- `/downloads/loadcomposer-v1.2.0-standalone.html`;
- `/downloads/loadcomposer-v1.2.0-standalone`;
- `/downloads/loadcomposer-v1.2.0-standalone.html.sha256`;
- `/downloads/loadcomposer-v1.2.0-standalone.zip`;
- `/downloads/loadcomposer-v1.2.0-standalone.zip.sha256`.

There is no broad `/downloads/*` rule. The new mutable Download page and its
index path always revalidate. LICENSE and NOTICE retain their inline content
headers without adding a second cache value. No path combines
`must-revalidate` with `immutable`.

The local policy audit evaluated 49 paths on three modeled hosts for
`3 × 49 = 147/147` exact evaluations PASS. It detects duplicate or mixed cache
values, immutable caching on either mutable index, loss of 404 `no-store`, loss
of a clean-URL immutable rule, and any generic download wildcard.

The local tests do not reproduce Cloudflare's edge cache, `.html` clean-URL
redirect, custom-domain routing, `pages.dev`, or custom-404 status selection.
No online or post-deployment behavior was tested; those checks remain pending
until an authorized deployment exists.
