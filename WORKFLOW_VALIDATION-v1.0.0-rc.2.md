# Local workflow validation — LoadComposer v1.0.0-rc.2

Date: 2026-07-30  
Node: `22.17.0`  
npm: `11.9.0`

GitHub Actions has not run because the repository has not been pushed. The
commands of each workflow were instead executed locally from clean extracted
content.

## `.github/workflows/ci.yml`

- Name: `CI`.
- Triggers: `push`, `pull_request`, `workflow_dispatch`.
- Permission: `contents: read`.
- Timeout: 75 minutes.
- Actions: `actions/checkout@v6`, `actions/setup-node@v7`.
- Node/cache: exact Node `22.17.0`, npm lockfile cache.
- Commands: `npm ci`; `npm test`.
- Generated local evidence: standalone outputs, legal copies, translation
  glossaries, screenshots, visual result JSON, PDF evidence and print
  comparison results. These remain transient and are not uploaded by the
  workflow.
- Local result: **Comandi del workflow verificati localmente: PASS**.
- Counts: `112/112` visual, `35/35` functional parity, `7,542/7,542`
  geometric parity, `37/37` regression, `9/9` XSS, `20/20` events,
  `110/110` PDFs and `47/47` print renders.
- Post-push-only check: real runner execution, cache restoration, job log and
  warning review.

## `.github/workflows/package-integrity.yml`

- Name: `Package integrity`.
- Triggers: path-filtered `push`, path-filtered `pull_request`,
  `workflow_dispatch`.
- Permission: `contents: read`.
- Timeout: 25 minutes.
- Actions: `actions/checkout@v6`, `actions/setup-node@v7`.
- Node/cache: exact Node `22.17.0`, npm lockfile cache.
- Commands:
  1. `npm ci`
  2. `npm run build`
  3. `npm run test:hardening`
  4. `npm run test:workflow-policy`
  5. `git diff --exit-code -- site/downloads site/legal site/assets docs/translations`
- Generated artifacts: deterministic standalone HTML/ZIP and sidecars, public
  legal copies, local release assets and translation glossaries. No release or
  package is published.
- Local execution used a second clean extraction initialized as a temporary
  local Git repository so the exact `git diff` command could run.
- Local result: **Comandi del workflow verificati localmente: PASS**.
- Post-push-only check: real path-filter behavior, hosted runner environment,
  cache behavior and job log review.

## Security validation

- Explicit read-only permission: PASS.
- `pull_request_target`: absent.
- Secrets: absent.
- Write permissions: absent.
- Downloaded shell scripts (`curl`/`wget`): absent.
- Ignored failures (`|| true`): absent.
- Automated push, release, package publication and Cloudflare deployment:
  absent.

Actual GitHub Actions status remains pending until the publisher performs the
first push and reviews both runs.
