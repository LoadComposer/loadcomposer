# Cache and inline-header validation — v1.2.1

Date: 2026-08-14

| Route class | Cache-Control |
|---|---|
| Home, `/downloads/`, `/legal/`, index files, catalogs, assets, robots and sitemap | `public, max-age=0, must-revalidate` |
| `/404.html` | `no-store` |
| Exact v1.0.0, v1.1.0, v1.2.0 and v1.2.1 standalone HTML, clean URL, ZIP and two sidecars | `public, max-age=31536000, immutable` |
| Nonexistent routes | no custom Cache-Control |

All `15` exact immutable routes for v1.0.0 through v1.2.0 are preserved. Five
v1.2.1 routes are added for versioned standalone HTML, clean HTML URL, HTML
sidecar, ZIP and ZIP sidecar. There is no broad `/downloads/*` rule. Mutable
index pages always revalidate; 404 remains `no-store`; LICENSE and NOTICE keep
their inline content headers; no route combines `must-revalidate` with
`immutable`.

The local audit evaluated `55` paths on three modeled hosts for
`3 × 55 = 165/165` exact results PASS. Sitemap and canonical metadata contain
only public page URLs and no versioned binary artifacts. The local model does
not reproduce a live Cloudflare edge, production clean-URL redirects or custom
domain routing; those checks remain post-deployment work.

The finalized custom 404 changes presentation only. `/404.html` remains
`no-store`, missing routes remain outside immutable rules, and the 404 remains
absent from the sitemap.
