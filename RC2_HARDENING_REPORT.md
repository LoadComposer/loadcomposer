# RC.2 hardening report

Date: 2026-07-30  
Baseline: LoadComposer `v1.0.0-rc.1`

## Changes from RC.1

RC.2 consolidates distribution and pre-publication infrastructure only. It
adds a complete standalone package, public legal-document access, localized
legal footer links, Node/toolchain alignment, consolidated workflows and
first-push/Cloudflare-preview documentation.

Application JavaScript, calculations, geometry, layouts, results, approved
graphics, responsive behavior and print output are unchanged. Direct RC.1
comparison produced `35/35` functional parity, `7,542/7,542` geometric parity
and `47/47` pixel-identical print renders.

## Standalone distribution

The primary offline download is:

`site/downloads/loadcomposer-v1.0.0-rc.2-standalone.zip`

It contains the standalone HTML, governing license, informational Italian
translation, notice, usage readme and internal SHA-256 list. The single HTML
remains available as the secondary “Standalone HTML only” download. Both have
SHA-256 sidecars.

Clean-package validation confirmed the required structure, `5/5` internal
hashes, local browser processing, embedded seven-language catalogs, theme
operation, single/mixed operation, preview/print availability, `file://`
loading and zero remote requests.

## Legal accessibility

`site/legal/` contains byte-identical copies of the seven public legal
documents and a static local-assets-only index. The footer exposes License,
Privacy and Legal information in all seven languages. The links retain visible
keyboard focus and are excluded from operational print.

The protected legal texts were not rewritten. Eight documents are byte-
identical to RC.1; `NOTICE` changes only the version in its first line. The
three confirmed project addresses remain unchanged.

## Node and package manager

- Node baseline: `22.17.0`.
- Engine declaration: `^22.17.0 || >=24.0.0`.
- `.nvmrc` and `.node-version`: `22.17.0`.
- npm used: `11.9.0`.
- Clean `npm ci`: PASS, no `EBADENGINE`.
- Lockfile dependency graph: unchanged; no package upgrade.

## Workflows

Two workflows cover full regression and deterministic package integrity.
Both use Node `22.17.0`, npm lockfile caching, `npm ci`, explicit
`contents: read`, bounded timeouts and approved GitHub-maintained actions.
Automated deploy, release, package publication, push, secret use and
`pull_request_target` are absent.

All commands declared by both workflows were executed locally and passed.
This is not a claim that GitHub Actions has run.

## Local control results

- Candidate and clean test-bundle `npm test`: PASS, exit code `0`.
- Distribution hardening audit: PASS.
- Workflow policy audit: PASS.
- Deterministic generated-output `git diff --exit-code`: PASS.
- Full functional, i18n, responsive, XSS, event, geometry and print regression:
  PASS.
- Final archive extraction, internal checksums, HTTP, subfolder, legal links,
  standalone ZIP and standalone `file://`: PASS.

## Checks still required after the first push

- Confirm both real GitHub Actions workflows start and finish successfully.
- Review job logs, warnings, action versions and cache behavior.
- Confirm repository links, downloads, legal pages, screenshots, PDFs and
  checksums as served by GitHub.
- Create an RC tag only after all runs are green.

## Checks still required in the first Cloudflare preview

- Confirm output directory `site`, temporary `pages.dev` URL and selected
  production branch.
- Verify headers, redirects, CSP, seven languages, legal documents, downloads,
  mobile layouts, themes, print and standalone download from the preview.
- Inspect actual browser network requests and hosting behavior.
- Do not attach the primary domain until the preview is approved.

No GitHub push, tag, release, Cloudflare deployment, DNS change or domain
attachment was performed.
