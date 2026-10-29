# Candidate verification and future deployment — v1.5.0 C4a

This is an unpublished candidate. Independent verification of the C3j→C4a delta and manual approval are required before any publication. These instructions prepare a possible future deployment; they do not record an approval, deployment, release date or Git tag.

## Prerequisites and clean verification

Use Node.js matching `^22.17.0 || >=24.0.0`, npm 11.9.0, Python 3, and Linux for the pinned Chromium build/test launcher. Node 24.22.1 was used in C3j/C4. Poppler is needed to inspect PDF evidence. Installing development dependencies requires access to the npm registry or a complete cache; offline operation refers to the generated application.

1. Verify the external SHA-256 list and package-verification JSON against the exact C4a artifacts. Do not mix identically named files from earlier candidates.
2. Extract delivery and QA into separate clean directories. Check ZIP CRC and the internal `SHA256SUMS-v1.5.0.txt`; delivery additionally contains `DELIVERY_MANIFEST-v1.5.0.txt` with sizes and hashes.
3. From the delivery directory, run `npm ci` and `npm run build` to rebuild the static candidate.
4. From each clean QA directory, run `npm ci` and `npm test`. The targeted `npm run test:c4a` is included in the complete suite. Retain logs and exit codes; previous C4 evidence is historical, not a new C4a execution.

```bash
node --version
npm --version
npm ci
npm test
```

Serve the generated site locally with `python3 -m http.server 8000 --directory site`. Inspect `http://127.0.0.1:8000/`, seven languages, light/dark themes, mobile/desktop, vehicle selection, units, side/ramp preview, and colour/B&W print. Check single one/two/three layers, mixed floor-only and Advanced with/without actual stacks. Verify localized context and safety notes in the actual print HTML/PDF.

Current offline artifacts are `site/downloads/loadcomposer-v1.5.0-standalone.html` and `site/downloads/loadcomposer-v1.5.0-standalone.zip`, each with a `.sha256` sidecar. Verify the ZIP's internal `SHA256SUMS.txt`, then open both the HTML and extracted ZIP HTML using `file://` with the network disabled. Keep historical downloads intact.

## Future static hosting, only after approval

| Setting | Value |
|---|---|
| Framework preset | None |
| Root directory | Repository root |
| Build command | Leave blank when serving verified prebuilt output |
| Build output directory | `site` |
| Production branch | The repository default branch, selected during the approved publication |

Cloudflare Pages can serve the verified `site/` output. Other hosts must translate `_headers` and `_redirects` to their native configuration. Review the same-origin CSP, redirects, preview non-indexing, `robots.txt`, `sitemap.xml`, legal pages and downloads. Existing hostnames are verification targets after a separately authorized deployment, not evidence that this candidate is online. Do not change DNS or domain settings as part of this verification.

S02 remains ACCEPT within the C4 controlled mutation/restore sequence, not resolved. Preserve the documented limits on geometric heuristics, weight/balance, physical stability, securing, tolerances, rear loading, dense PDFs and extreme-case responsiveness. C4a does not certify other browsers, physical devices or printers.

No repository push, deployment, publication, DNS change, tag or GitHub Release is performed by this candidate. After independent delta verification, obtain manual approval before deciding whether and when to publish.
