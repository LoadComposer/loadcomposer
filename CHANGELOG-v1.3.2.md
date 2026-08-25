# LoadComposer v1.3.2

Release date: 2026-08-25

## Fixed

- Fixed a placement limitation where one pallet group could miss valid floor
  layouts requiring different 90° orientations within the same load.
- Improved mixed-orientation candidate search without changing vehicle or
  pallet dimensions.
- Added regression coverage for valid interlocking pallet layouts and the
  associated capacity/load-layout agreement.

## Scope

This is a geometry/capacity hotfix only. It does not include Legal UX,
Dark Reader compatibility, new languages, new vehicles, new pallet presets,
weight/balance features, or print-transport changes.
