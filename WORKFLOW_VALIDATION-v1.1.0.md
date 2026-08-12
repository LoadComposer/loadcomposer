# Workflow validation — LoadComposer v1.1.0

Date: 2026-08-11  
Node: `22.17.0`  
npm: `11.9.0`

## CI policy

`.github/workflows/ci.yml` retains `push`, `pull_request` and
`workflow_dispatch`, read-only contents permission, bounded timeout, exact Node
22.17.0, npm lockfile cache, Poppler installation before `npm ci`, and a
failure-propagating `npm test`. The repository retains two consolidated
workflows and only the approved checkout/setup actions. No workflow contains
secrets, token inputs, write permissions, `pull_request_target`, ignored
failures, automated push, release, publication or deployment.

The final source tree and clean extraction of the exact test bundle both
completed the full `npm test` chain, including every command after
`test:print-i18n`.

## Package-integrity reproduction

The exact `234`-file test bundle, SHA-256
`78d32b76d5a0bc63e8b45cdc53f4055369f1b7be774d1898b9011f33eda07e1b`,
was extracted a second time. A temporary Git repository and index were created
without any commit, then the package-integrity commands were reproduced:

1. `npm ci`;
2. `npm run build`;
3. `npm run test:hardening`;
4. `npm run test:workflow-policy`;
5. `git diff --exit-code -- site/downloads site/legal site/assets docs/translations`.

Result: exit `0`, `NO_COMMIT_PRESENT`,
`PACKAGE_INTEGRITY_REPRODUCTION_PASS`, and no generated-file drift.

No commit, push or GitHub-hosted workflow run was performed for this private
candidate.
