# Release process

## Candidate preparation

1. Start from the explicitly designated canonical delivery and verify its external SHA-256, ZIP integrity, internal checksums, and language inventory.
2. Extract into a new directory and run the complete baseline suite before any modification.
3. Make only the authorized changes and retain direct historical fixtures from that canonical baseline.
4. Run `npm ci` and `npm test`.
5. Review generated screenshots, PDF evidence, repository/legal audit, and release checklist.
6. Build the test bundle, manifest, payload checksums, and outer delivery ZIP.
7. Extract the final ZIP into another clean directory; verify checksums and inventory; run HTTP, subfolder, `file://`, no-remote-resource, title, version, and full test checks.
8. Compute and publish the final outer SHA-256 only after all content is immutable.

## Release controls

- The `VERSION`, package version, page title, visible badge, catalogs, standalone, filenames, reports, and manifest must agree.
- Generated files must be reproducible from repository sources.
- No `node_modules`, caches, secrets, user data, previous delivery ZIP, or unsupported application baseline may be packaged.
- Application and print comparisons must use the immediately preceding canonical version.
- Legal text changes require human review and must not be hidden inside unrelated commits.

## Publication

The repository workflows validate candidates but do not create a stable release automatically. Tagging, GitHub publication, Cloudflare deployment, domain configuration, and announcement are deliberate manual steps outside this bundle.
