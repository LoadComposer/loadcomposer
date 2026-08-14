# Workflow validation — LoadComposer v1.2.1 private candidate

Date: 2026-08-14  
Node: `22.17.0`

The two inherited workflows keep `push`, `pull_request` and
`workflow_dispatch`, read-only contents permission, bounded timeout, exact
Node 22.17.0, lockfile caching, Poppler installation before dependencies, and
failure-propagating tests. Only the approved checkout/setup actions are used.
No workflow contains secrets, token inputs, write permissions,
`pull_request_target`, ignored failures, automated push, release, publication
or deployment.

The workflow-policy, repository and hardening audits pass. A clean dependency
installation resolved the exact lockfile (`58` packages). Because the host
execution wrapper later blocked the umbrella npm command, every constituent
build and test command was executed directly with Node and passed, including
the visual, accessibility, geometry and PDF matrices. No GitHub-hosted run,
commit, push, tag, release or deployment was performed.
