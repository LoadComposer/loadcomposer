# Workflow validation — LoadComposer v1.2.0 corrected private candidate

Date: 2026-08-13  
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
completed the full `npm test` chain, including every Download visual state,
print and plural command.

## Package-integrity reproduction

The exact `270`-file test bundle, SHA-256
`e0fed0ec8b5bedaaeeb82aea02ffdb676321943aafa78fe6c25a696cf16af871`,
was extracted separately. A temporary Git repository and index were created
without a commit, then these package-integrity commands were reproduced:

1. `npm ci`;
2. `npm run build`;
3. `node tests/hardening-audit-v1.0.0.mjs`;
4. `node tests/workflow-policy-v1.0.0.mjs`;
5. whole-tree working-copy comparison against the temporary index.

Result: exit `0`, `NO_COMMIT_PRESENT`,
`PACKAGE_INTEGRITY_REPRODUCTION_PASS`, and no generated-file drift.

No commit, push, tag, GitHub-hosted workflow run, release or deployment was
performed for this private candidate.
