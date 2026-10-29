# Approved release candidate and production deployment — v1.5.0 C4c

This is the C4c release candidate, independently verified through C4d and manually approved for publication, with S02 accepted as a known MINOR. Production deployment, publication date, version tag and GitHub Release are not yet recorded. The `release/v1.5.0-c4c` branch is a pre-production verification branch; promoting it to production remains a separate explicit action.

## Prerequisites and clean verification

Use Node.js matching `^22.17.0 || >=24.0.0`, npm 11.9.0, Python 3, and Linux for the pinned Chromium build/test launcher. Node 24.22.1 was used in C3j/C4. Poppler is needed to inspect PDF evidence. Installing development dependencies requires access to the npm registry or a complete cache; offline operation refers to the generated application.

1. Verify the six final C4c archives/files against `SHA256SUMS-C4c-CLEAN.txt` and their documented hashes. The historical `PACKAGE_VERIFICATION-C4c-v1.5.0.json` mentions a temporary `.PfeItk` file that must not be treated as a publishable artifact. Do not confuse the final C4c assets with earlier candidates.
2. Extract delivery and QA into separate clean directories. Check ZIP CRC and the internal `SHA256SUMS-v1.5.0.txt`; delivery additionally contains `DELIVERY_MANIFEST-v1.5.0.txt` with sizes and hashes.
3. From the delivery directory, run `npm ci` and `npm run build` to rebuild the static candidate.
4. From each clean QA directory, run `npm ci` and `npm test`. The targeted `npm run test:c4c` is included in the complete suite. Retain logs and exit codes; C4/C4b/C4d evidence remains independently attributable. The release branch CI run also passed `npm test` after its required QA fixtures were restored.

```bash
node --version
npm --version
npm ci
npm test
```

Serve the generated site locally with `python3 -m http.server 8000 --directory site`. Inspect `http://127.0.0.1:8000/`, seven languages, light/dark themes, mobile/desktop, vehicle selection, units, side/ramp preview, and colour/B&W print. Check single one/two/three layers, mixed floor-only and Advanced with/without actual stacks. Verify localized context and safety notes in the actual print HTML/PDF.

Current offline artifacts are `site/downloads/loadcomposer-v1.5.0-standalone.html` and `site/downloads/loadcomposer-v1.5.0-standalone.zip`, each with a `.sha256` sidecar. Verify the ZIP's internal `SHA256SUMS.txt`, then open both the HTML and extracted ZIP HTML using `file://` with the network disabled. Keep historical downloads intact.

## Production static hosting (approved; deployment pending)

| Setting | Value |
|---|---|
| Framework preset | None |
| Root directory | Repository root |
| Build command | Leave blank when serving verified prebuilt output |
| Build output directory | `site` |
| Production branch | The repository default branch, selected during the approved publication |

Cloudflare Pages can serve the verified `site/` output. Other hosts must translate `_headers` and `_redirects` to their native configuration. Review the same-origin CSP, redirects, preview non-indexing, `robots.txt`, `sitemap.xml`, legal pages and downloads. Existing hostnames are verification targets after a separately authorized deployment, not evidence that this candidate is online. Do not change DNS or domain settings as part of this verification.

S02 remains ACCEPTED within the C4 controlled mutation/restore sequence, not resolved by C4c; this limit was explicitly accepted during manual approval. C4d independently verified the U02 responsive correction. Preserve the documented limits on geometric heuristics, weight/balance, physical stability, securing, tolerances, rear loading, dense PDFs and extreme-case responsiveness. The tests do not certify every browser, physical device or printer.

The release branch has been pushed and verified on GitHub Actions, but this documentation update does not perform a production merge, deploy, DNS change, tag or GitHub Release. Promote the reviewed candidate to the configured production branch only as a separate deliberate publication action, then verify Cloudflare Pages, downloads, legal pages and the live site before recording the release as published.
