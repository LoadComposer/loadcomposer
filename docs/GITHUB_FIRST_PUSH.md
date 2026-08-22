# Repository update for v1.3.0

This checklist starts after the `v1.3.0` delivery has been extracted and
its internal checksums have been verified.

## Publish the private candidate commit

1. Open `https://github.com/LoadComposer/loadcomposer`.
2. Confirm the intended repository visibility before uploading.
3. Confirm the default branch name and branch-protection settings.
4. Upload the contents of `delivery-v1.3.0/` as the repository root.
5. Do not upload the outer delivery ZIP, `node_modules`, caches, temporary test
   results, or credentials.
6. Do not create the `v1.3.0` tag until the candidate is accepted.
7. Do not create the stable tag until the workflow runs and deployed-site checks are green.

## Validate the first run

1. Open the repository’s **Actions** tab.
2. Confirm that `CI` and `Package integrity` are enabled.
3. Wait for the first push run to finish.
4. Open every job and confirm Node 22.17.0 and `npm ci`.
5. Check the complete log for failures, skipped steps, `EBADENGINE`, deprecation
   warnings, Chromium errors, PDF differences, and unexpected network access.
6. Download any generated artifacts if a later workflow revision adds them,
   then verify their checksums before use.
7. Confirm that no workflow attempted a deploy, release, package publication,
   or automatic push.
8. If a real GitHub-only problem appears, stop publication and prepare a
   separately authorized correction; do not modify the published RC.4 history.
9. Create the stable tag only after every required workflow and HTTP check is green.

## Repository checks after push

- Open `README.md`, `README.it.md`, LICENSE, privacy, security, commercial
  licensing, trademarks, contribution instructions, and CLA.
- Confirm all README images and internal links render correctly.
- Confirm the seven `site/lang/*.json` catalogs are present.
- Confirm the screenshots and verification PDFs open.
- Confirm `site/legal/` contains its index and seven public documents.
- Confirm the standalone ZIP, HTML-only download, and both SHA-256 sidecars are
  present under `site/downloads/`.
- Download the standalone ZIP, extract it, and run
  `sha256sum -c SHA256SUMS.txt` from inside the extracted directory.
- Open the packaged HTML through `file://` and verify Italian, English, one
  additional language, light/dark themes, single/mixed pallets, preview, and
  print.
- Inspect the browser network panel and confirm that startup uses no remote
  runtime resources.

After these checks, proceed to the Cloudflare Pages preview described in
[DEPLOYMENT.md](DEPLOYMENT.md) and
[CLOUDFLARE_PREVIEW_CHECKLIST.md](CLOUDFLARE_PREVIEW_CHECKLIST.md).
