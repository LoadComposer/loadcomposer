# Cloudflare Pages preview checklist

Do not create the stable tag or GitHub Release until this checklist is complete
on the deployed `v1.1.0` commit.

## Project setup

- Confirm the existing official GitHub repository connection.
- Confirm the approved default branch remains the production branch.
- Confirm there is no framework preset or build command.
- Confirm the build output directory remains `site`.
- Confirm the root directory remains the repository root.
- Do not change the existing `pages.dev`, custom-domain, DNS, or redirect setup.

## Application

- Open `/` without a redirect loop or console error.
- Verify Italian, English, German, Spanish, French, Portuguese, and Dutch.
- Verify automatic, light, and dark theme behavior.
- Verify pallet single and mixed modes.
- Verify desktop and mobile layouts, including 320 px width.
- Verify preview side/ramp views and colour/black-and-white modes.
- Verify browser print and saved PDF output.
- Confirm title and visible badge show `v1.1.0`.

## Legal pages and downloads

- Open `/legal/`.
- Open LICENSE, LICENSE.it.md, NOTICE, trademarks, commercial licensing,
  privacy, and security from the legal index.
- Confirm the three footer links resolve and do not appear in print.
- Download `loadcomposer-v1.1.0-standalone.zip`.
- Download the secondary HTML-only file and both `.sha256` sidecars.
- Verify the downloaded ZIP sidecar.
- Extract the ZIP and verify its five internal hashes.
- Open the extracted HTML through `file://`.
- Verify Italian, English, one additional language, both themes, single/mixed
  pallets, preview, and print without requesting `lang/`.

## Not-found handling

- Open `/downloads/` and confirm Cloudflare returns HTTP `404` with the custom
  “Page not found” page, not the main application.
- Repeat with `/percorso-inesistente-test/` and another nonexistent path.
- Confirm the 404 page displays the local LoadComposer logo in both light and
  dark color schemes, works without JavaScript, and requests no remote assets.
- Confirm its robots directive is exactly `noindex,follow` and that it has no
  automatic redirect, canonical URL, or Open Graph metadata.
- Confirm its links to `/` and `/legal/` work with the keyboard and show visible
  focus.
- Confirm the four real files below `/downloads/` still return normally and
  that no `site/downloads/index.html` has been introduced.
- Confirm `404.html` is absent from `sitemap.xml`.

## Headers and network

- Confirm CSP, `X-Content-Type-Options`, `X-Frame-Options`, referrer policy, and
  permissions policy on representative responses.
- Confirm `/index.html` redirects to `/`.
- Confirm preview responses carry the intended no-index policy.
- Confirm `/robots.txt` and `/sitemap.xml` are reachable.
- Inspect the browser network panel for external scripts, fonts, trackers,
  analytics, pixels, advertisements, and other remote runtime resources.
- Confirm there is no cookie banner and no newly introduced profiling cookie.

## Approval boundary

Record the preview URL and results. If any issue requires a code or packaging
change, prepare a separately numbered release candidate. Only after the preview is approved should the
primary domain, DNS, and apex/`www` redirect be configured.
