# LoadComposer v1.0.0-rc.2

Release date: 2026-07-30

## Distribution hardening

- Added the complete standalone ZIP as the primary offline distribution.
- Preserved the single standalone HTML as a secondary download.
- Added SHA-256 sidecars for both downloadable artifacts.
- Added the license notice comment to the web and standalone HTML sources.
- Published byte-identical legal documents under `site/legal/` with a static
  legal index.
- Added three localized legal links to the footer; the links are excluded from
  print.

## Infrastructure hardening

- Set Node.js 22.17.0 in `.nvmrc`, `.node-version`, and both GitHub workflows.
- Declared `^22.17.0 || >=24.0.0` in `package.json`.
- Recorded npm 11.9.0 as the package manager used for this candidate.
- Consolidated GitHub validation into complete CI and deterministic
  distribution workflows with read-only permissions.
- Added local workflow-policy and distribution-hardening tests.
- Added exact first-push and Cloudflare Pages preview checklists.

## Frozen application scope

Application JavaScript, algorithms, geometry, capacity, load layouts, mixed
layouts, operational results, diagrams, palette, controls, responsive behavior,
and print output remain unchanged from `v1.0.0-rc.1`. The only authorized
application-source differences are version metadata, the non-visible legal
comment, the three legal-footer links, their seven translations, and the CSS
needed for those links.

The substantive legal texts and confirmed addresses
`licensing@loadcomposer.com`, `security@loadcomposer.com`, and
`privacy@loadcomposer.com` remain unchanged.
