# Local workflow validation — LoadComposer v1.0.0-rc.3

Date: 2026-07-31  
Node: `22.17.0`  
npm: `11.9.0`

GitHub Actions has not run because no push was performed. The repository
commands and policy were verified locally from clean extracted content.

## `.github/workflows/ci.yml`

- Workflow name: `CI`.
- Triggers: `push`, `pull_request`, `workflow_dispatch`.
- Permission: `contents: read`.
- Runner: `ubuntu-latest`.
- Timeout: 75 minutes.
- Actions: `actions/checkout@v6`, `actions/setup-node@v7`.
- Node/cache: exact Node `22.17.0`, npm cache.
- PDF dependency step, after Node setup and before `npm ci`:

  ```yaml
  - name: Install PDF test dependencies
    run: |
      sudo apt-get update
      sudo apt-get install --yes --no-install-recommends poppler-utils
  ```

- Remaining commands: `npm ci`; `npm test`.
- Failure propagation: no `|| true`, ignored error, continue-on-error, wrapper,
  or equivalent neutralization.
- Clean local `npm ci && npm test`: `RC3_CLEAN_EXIT=0`.
- Counts: `112/112` visual, `35/35` functional parity, `7,542/7,542`
  geometric parity, `37/37` regressions, `9/9` XSS, `20/20` events,
  `110/110` PDFs and `47/47` print renders.

The local environment already exposed all three Poppler binaries, so the
hosted-runner `apt-get` step itself was not executed locally. The complete PDF
chain was executed against the locally installed Poppler tools.

## `.github/workflows/package-integrity.yml`

- Workflow name: `Package integrity`.
- Triggers: path-filtered `push`, path-filtered `pull_request`,
  `workflow_dispatch`.
- Permission: `contents: read`.
- Runner: `ubuntu-latest`.
- Timeout: 25 minutes.
- Actions: `actions/checkout@v6`, `actions/setup-node@v7`.
- Node/cache: exact Node `22.17.0`, npm cache.
- Commands reproduced locally:
  1. `npm ci`
  2. `npm run build`
  3. `npm run test:hardening`
  4. `npm run test:workflow-policy`
  5. `git diff --exit-code -- site/downloads site/legal site/assets docs/translations`
- Local result: `RC3_INTEGRITY_EXIT=0`.
- No commit was created in the temporary repository.

## Security and policy result

- `pull_request_target`: absent.
- Secrets and token inputs: absent.
- Write permissions: absent.
- Downloaded shell scripts (`curl`/`wget`): absent.
- Ignored failures (`|| true`): absent.
- Automated push, release, package publication and deploy: absent.
- Unapproved actions: absent.
- `poppler-utils` installation and required order: asserted by
  `tests/workflow-policy-rc.3.mjs`.

## Environment limit

Actual GitHub-hosted execution, `apt-get`, cache restoration, path-filter
behavior and hosted-runner logs remain pending until the publisher performs the
first push. No push, tag, release or deployment was performed here.

Status: `PASS` for local reproducibility and workflow policy.
