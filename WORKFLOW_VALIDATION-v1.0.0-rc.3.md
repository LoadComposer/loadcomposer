# Workflow validation — LoadComposer v1.0.0-rc.3 final candidate

Date: 2026-08-01  
Node: `22.17.0`  
npm: `11.9.0`

The approved RC.3 base with SHA-256
`e9fd5840a7da3417e5293febc7495301f5619ad60a5acd19a6b3fb4aeb9994d5`
had already passed private GitHub Actions CI, Package integrity and Cloudflare
Pages preview according to the publisher. This final-candidate revision has not
been pushed; its hosted workflows remain pending. Neither workflow file changed
from the approved base.

## `.github/workflows/ci.yml`

- Workflow name: `CI`.
- Triggers: `push`, `pull_request`, `workflow_dispatch`.
- Permission: `contents: read`.
- Runner: `ubuntu-latest`.
- Timeout: 75 minutes.
- Actions: `actions/checkout@v6`, `actions/setup-node@v7`.
- Node/cache: exact Node `22.17.0`, npm cache.
- PDF dependency step remains after Node setup and before `npm ci`.
- Remaining commands: `npm ci`; `npm test`.
- Failure propagation: no `|| true`, ignored error, `continue-on-error`, skip,
  wrapper or equivalent neutralization.
- Source-tree result: `RC3_404_NPM_TEST_EXIT=0`.
- Clean test-bundle result: `RC3_404_CLEAN_EXIT=0`.
- Counts: `112/112` visual, `35/35` functional parity, `7,542/7,542`
  geometric parity, `37/37` regressions, `9/9` XSS, `20/20` events,
  `110/110` PDFs and `47/47` print renders.

The local environment already exposed all three Poppler binaries, so the
hosted-runner `apt-get` step was not repeated. The complete PDF chain was
executed twice against locally installed Poppler tools.

## `.github/workflows/package-integrity.yml`

- Workflow name: `Package integrity`.
- Triggers: path-filtered `push`, path-filtered `pull_request`,
  `workflow_dispatch`.
- Permission: `contents: read`.
- Runner: `ubuntu-latest`.
- Timeout: 25 minutes.
- Actions: `actions/checkout@v6`, `actions/setup-node@v7`.
- Node/cache: exact Node `22.17.0`, npm cache.
- Commands reproduced locally in a clean extraction:
  1. `npm ci`
  2. `npm run build`
  3. `npm run test:hardening`
  4. `npm run test:workflow-policy`
  5. `git diff --exit-code -- site/downloads site/legal site/assets docs/translations`
- Local result: `RC3_404_INTEGRITY_EXIT=0`.
- The temporary repository contains zero commits.

## Policy result

- `pull_request_target`: absent.
- Secrets and token inputs: absent.
- Write permissions: absent.
- Downloaded shell scripts (`curl`/`wget`): absent.
- Ignored failures and test neutralization: absent.
- Automated push, release, package publication and deploy: absent.
- Unapproved actions: absent.
- `poppler-utils` installation and required order: still asserted by
  `tests/workflow-policy-rc.3.mjs`.
- The only test changed for the 404 correction is
  `tests/repository-release-audit-rc.3.mjs`; workflow policy was not altered.

## Environment limit

The actual hosted runs, cache restoration and Cloudflare custom-404 status for
this revised candidate require the publisher's push to the private repository.
No commit, push, tag, GitHub Release or deployment was performed here.

Status: `PASS` for local reproducibility and unchanged workflow policy.
