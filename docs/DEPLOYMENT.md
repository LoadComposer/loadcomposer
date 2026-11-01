# Production deployment and verification — v1.5.0 (final C4e, 2026-11-01)

The final C4e candidate was merged from [PR #1](https://github.com/LoadComposer/loadcomposer/pull/1) into production branch `main` on 2026-11-01 (commit `e75e188e6c6aeddac4b910a3cac5949c27a5f087`, tree `733d6c98b689ba579f912a1485f7790a3d52afe0`). Cloudflare Pages production deployment was confirmed, and the stable [v1.5.0 GitHub Release](https://github.com/LoadComposer/loadcomposer/releases/tag/v1.5.0) and tag point to that commit. S02 remains an accepted MINOR. The older `release/v1.5.0-c4c` branch and C4c/C4d evidence are historical, not a pending production promotion.

## Prerequisites and clean verification

Use Node.js matching `^22.17.0 || >=24.0.0`, npm 11.9.0, Python 3, and Linux for the pinned Chromium build/test launcher. Node 24.22.1 was used in C3j/C4. Poppler is needed to inspect PDF evidence. Installing development dependencies requires access to the npm registry or a complete cache; offline operation refers to the generated application.

1. Use `main` at the verified merge commit above, or tag `v1.5.0`, as the canonical published source. Verify the four [official release assets](https://github.com/LoadComposer/loadcomposer/releases/tag/v1.5.0): standalone HTML/ZIP and their `.sha256` sidecars. Check the ZIP CRC and any internal manifests.
2. For historical C4c verification only, the six C4c archives/files and `SHA256SUMS-C4c-CLEAN.txt` remain pre-release evidence. The `PACKAGE_VERIFICATION-C4c-v1.5.0.json` temporary `.PfeItk` entry is not a release asset; do not substitute C4c archives for the final C4e release.
3. In a clean repository checkout or extracted source delivery with build inputs, run `npm ci` and `npm run build` to regenerate static output for local comparison. Do not overwrite published release assets.
4. Run `npm ci` and `npm test` from the complete repository or QA bundle with the required test fixtures. Retain logs and exit codes. The C4e full suite and deterministic packaging checks passed before release; GitHub Actions CI and Package integrity passed on the merge commit.

```bash
node --version
npm --version
npm ci
npm test
```

Serve the generated site locally with `python3 -m http.server 8000 --directory site`. Inspect `http://127.0.0.1:8000/`, seven languages, light/dark themes, mobile/desktop, vehicle selection, units, side/ramp preview, and colour/B&W print. Check single one/two/three layers, mixed floor-only and Advanced with/without actual stacks. Verify localized context and safety notes in the actual print HTML/PDF.

Current offline artifacts are `site/downloads/loadcomposer-v1.5.0-standalone.html` and `site/downloads/loadcomposer-v1.5.0-standalone.zip`, each with a `.sha256` sidecar. Verify the ZIP's internal `SHA256SUMS.txt`, then open both the HTML and extracted ZIP HTML using `file://` with the network disabled. Keep historical downloads intact.

## Production static hosting (deployed 2026-11-01)

| Setting | Value |
|---|---|
| Framework preset | None |
| Root directory | Repository root |
| Build command | Leave blank when serving verified prebuilt output |
| Build output directory | `site` |
| Production branch | `main` |

Cloudflare Pages serves the verified `site/` output in production. Other hosts must translate `_headers` and `_redirects` to their native configuration. For future releases, review the same-origin CSP, redirects, preview non-indexing, `robots.txt`, `sitemap.xml`, legal pages and downloads. Verify the live site and deployment commit independently; this documentation does not call for DNS or domain changes.

S02 remains ACCEPTED within the C4 controlled mutation/restore sequence and was not resolved in v1.5.0; in that artificial sequence the Ramp preview can be temporarily out of sync, while print remains correct. C4d independently verified the U02 responsive correction. C4e fixed UX01 (stacking-control layout) and FUNC01 (Max layers input/change event consistency). Preserve the documented limits on geometric heuristics, weight/balance, physical stability, securing, tolerances, rear loading, dense PDFs and extreme-case responsiveness. The tests do not certify every browser, physical device or printer.

The v1.5.0 release is already merged, deployed and published. Future application releases require a separately reviewed branch/PR and explicit publication authorization. Documentation-only post-release corrections do not retroactively change the `v1.5.0` tag, GitHub Release attachments or deployed application files.
