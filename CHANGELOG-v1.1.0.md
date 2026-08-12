# LoadComposer v1.1.0 change summary

Date: 2026-08-11

`v1.1.0` is a deliberately small community-feedback release based exclusively
on the canonical `v1.0.0` delivery.

It adds two localized text links to the existing footer:

- **Suggestions** opens the project’s GitHub Discussions area for ideas,
  questions, and preliminary feature discussion.
- **Report a problem** opens the existing GitHub bug-report form for
  reproducible software defects.

Both links open in a new tab with `noopener noreferrer`, remain keyboard
accessible, reuse the existing footer-link styling, and are included in the
offline standalone HTML. The planner itself remains fully offline; only opening
one of the optional GitHub destinations requires a network connection.

This release does not modify loading algorithms, geometry, coordinates, pallet
or equipment data, prudential thresholds, operational results, printing, PDF
output, legal terms, security policy, supported languages, or cache semantics.
