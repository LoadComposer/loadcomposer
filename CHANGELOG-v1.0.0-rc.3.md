# LoadComposer v1.0.0-rc.3

Release date: 2026-07-31

## Final candidate hosting correction

- Added `site/404.html`, a static, no-script and `noindex,follow` page for
  routes that do not exist on Cloudflare Pages.
- The page uses only approved local logo assets, supports light and dark color
  schemes, and links to `/` and `/legal/` without automatic redirects.
- No downloads page was added. Existing download files, application files,
  catalogs, hosting policy files, standalone artifacts and legal documents are
  unchanged from the privately approved RC.3 base.

## CI correction

- Added installation of `poppler-utils` to `.github/workflows/ci.yml` after
  `actions/setup-node@v7` and before `npm ci`.
- Preserved the complete CI sequence and failure propagation through `npm test`.
- Extended the workflow-policy test to require the Poppler installation and its
  order while retaining prohibitions on secrets, tokens, write permissions,
  deploys, releases, publication, ignored failures, and automatic pushes.

## Documentation corrections

- Corrected the bug-report placeholder from `v1.0.0-rc.1` to
  `v1.0.0-rc.3` without changing the issue form structure or behavior.
- Corrected `docs/ARCHITECTURE.md` to describe `v1.0.0-rc.2` as the direct
  application fixture and print-evidence baseline.
- Updated only references that describe the current candidate from RC.2 to
  RC.3; historical RC.1/RC.2 records remain historical.

## Frozen application scope

Application JavaScript, algorithms, geometry, capacity, load layouts, mixed
layouts, operational results, diagrams, palette, controls, responsive behavior,
and print output remain unchanged from `v1.0.0-rc.2`. The only application and
catalog changes are the mechanical release-version metadata updates.

`LICENSE`, `LICENSE.it.md`, and `NOTICE` are byte-identical to the canonical
RC.2 delivery. The substantive legal texts and confirmed addresses remain
unchanged.
