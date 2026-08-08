# Workflow validation — LoadComposer v1.0.0

Date: 2026-08-08  
Node: `22.17.0`  
npm: `11.9.0`

## CI policy

`.github/workflows/ci.yml` retains `push`, `pull_request` and
`workflow_dispatch`, read-only contents permission, bounded timeout, Node
22.17.0, npm cache, Poppler installation before `npm ci`, and
failure-propagating `npm test`. Only `actions/checkout@v6` and
`actions/setup-node@v7` are used.

The final source tree and clean test-bundle extraction both completed the exact
`npm test` chain, including every command after `test:print-i18n`.

## Package integrity reproduction

The exact `203`-file test bundle, SHA-256
`47b99f34318cf8dd78d37c2135f020638c9088272da6cba06bfdaa3286648fbb`,
was extracted separately. A temporary Git index outside the source tree was
created without a commit, then the workflow commands were reproduced:

1. `npm ci`;
2. `npm run build`;
3. `npm run test:hardening`;
4. `npm run test:workflow-policy`;
5. `git diff --exit-code -- site/downloads site/legal site/assets docs/translations`.

Result: `PACKAGE_INTEGRITY_EXIT=0`; `NO_COMMIT_PRESENT`.

No workflow contains secrets, token inputs, write permissions,
`pull_request_target`, ignored failures, automated push, release, publication or
deployment. Actual GitHub-hosted runs were not performed because this private
candidate was not pushed.
