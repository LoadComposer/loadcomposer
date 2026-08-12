# Deployment

## Prerequisites

Repository and distribution checks use Node.js 22.17.0 with npm 11.9.0.
Serving the already generated static site does not require a Node runtime.

```bash
node --version
npm --version
npm ci
npm test
```

The expected baseline is `v22.17.0` and `11.9.0`. Node versions matching
`^22.17.0 || >=24.0.0` are declared compatible, but the private stable
validation and GitHub workflows use exactly 22.17.0.

## Cloudflare Pages preview

Allow the existing Pages project to deploy `v1.1.0` only after the controlled
repository push and both GitHub workflows have completed successfully.

| Setting | Value |
|---|---|
| Framework preset | None |
| Root directory | Repository root |
| Build command | Leave blank |
| Build output directory | `site` |
| Production branch | The repository default branch |

Cloudflare serves the committed output in `site/`; it does not need to rebuild
the application. Verify both the existing `pages.dev` address and
`loadcomposer.com` after deployment. Do not change DNS, the domain attachment,
or the apex/`www` redirect as part of the stable promotion.

`site/_headers` applies a same-origin content-security policy and related
response headers. Inline scripts and styles are required by the canonical
single-page application. `site/_redirects` canonicalizes `/index.html` to `/`.
Preview deployments are marked non-indexable by the host-specific rules in
`_headers`.

## Preview verification

Follow [CLOUDFLARE_PREVIEW_CHECKLIST.md](CLOUDFLARE_PREVIEW_CHECKLIST.md).
At minimum, verify:

- `/` in all seven enabled languages and both themes;
- `/legal/` and all seven public legal documents;
- `/downloads/loadcomposer-v1.1.0-standalone.zip`;
- the secondary HTML-only download and both `.sha256` sidecars;
- response headers, CSP, redirect behavior, `robots.txt`, and `sitemap.xml`;
- desktop and mobile layouts;
- colour and black-and-white print;
- extraction and checksum verification of the standalone ZIP;
- offline `file://` use of the packaged HTML; and
- absence of external scripts, fonts, analytics, trackers, and other remote
  runtime resources.

## Other static hosts

Serve the contents of `site/` as the document root. Translate `_headers` and
`_redirects` to the host’s native configuration where necessary. Production
metadata intentionally points to `https://loadcomposer.com/`.

No deployment, repository push, DNS mutation, domain attachment, or Cloudflare
account change is performed by this release bundle.
