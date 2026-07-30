# Cloudflare Pages preview checklist

Do not connect the primary domain until this checklist is complete.

## Project setup

- Connect the official GitHub repository.
- Select the approved default branch as the production branch.
- Use no framework preset.
- Leave the build command empty.
- Set the build output directory to `site`.
- Leave the root directory at the repository root.
- Create the first deployment on the temporary `pages.dev` address.

## Application

- Open `/` without a redirect loop or console error.
- Verify Italian, English, German, Spanish, French, Portuguese, and Dutch.
- Verify automatic, light, and dark theme behavior.
- Verify pallet single and mixed modes.
- Verify desktop and mobile layouts, including 320 px width.
- Verify preview side/ramp views and colour/black-and-white modes.
- Verify browser print and saved PDF output.
- Confirm title and visible badge show `v1.0.0-rc.2`.

## Legal pages and downloads

- Open `/legal/`.
- Open LICENSE, LICENSE.it.md, NOTICE, trademarks, commercial licensing,
  privacy, and security from the legal index.
- Confirm the three footer links resolve and do not appear in print.
- Download `loadcomposer-v1.0.0-rc.2-standalone.zip`.
- Download the secondary HTML-only file and both `.sha256` sidecars.
- Verify the downloaded ZIP sidecar.
- Extract the ZIP and verify its five internal hashes.
- Open the extracted HTML through `file://`.
- Verify Italian, English, one additional language, both themes, single/mixed
  pallets, preview, and print without requesting `lang/`.

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
change, prepare `v1.0.0-rc.3`. Only after the preview is approved should the
primary domain, DNS, and apex/`www` redirect be configured.
