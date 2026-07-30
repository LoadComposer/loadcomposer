# Contributing to LoadComposer

Thank you for considering a contribution. LoadComposer accepts focused changes that preserve deterministic, offline operation and the project’s safety boundaries.

## Before you begin

1. Read [LICENSE](LICENSE), [CLA.md](CLA.md), [SECURITY.md](SECURITY.md), and the current [ROADMAP.md](ROADMAP.md).
2. Search existing issues and open a focused issue before a substantial change.
3. Do not disclose security vulnerabilities in a public issue.
4. Do not submit material you do not have the right to license.

## Contribution terms

By submitting a contribution, You certify that:

- You authored it or are authorized to submit it;
- it does not knowingly infringe third-party rights;
- Your employer or other rights holder has given any necessary permission; and
- You accept the grant in [CLA.md](CLA.md).

Commits may include a Developer Certificate of Origin sign-off:

```text
Signed-off-by: Name <email>
```

## Development

Requirements: Node.js 22 or later and npm.

```bash
npm ci
npm test
```

The full test command rebuilds the standalone page and translation glossaries, validates all seven catalogs, checks syntax and security scenarios, compares historical application behavior and geometry against `v0.9.0-alpha.7`, exercises responsive views, and regenerates print evidence.

Pull requests should:

- have one clear purpose;
- include tests and documentation where applicable;
- preserve offline and `file://` standalone operation;
- avoid external scripts, fonts, trackers, or runtime dependencies;
- list user-visible and compatibility effects;
- identify generated files; and
- pass every workflow.

Acceptance, timing, maintenance, and release remain at the project owner’s discretion. A contribution may be declined without obligation to explain or support it.
