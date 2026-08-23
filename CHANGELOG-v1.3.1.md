# LoadComposer v1.3.1

Release date: 2026-08-22

## Fixed

- Fixed browser print compatibility by printing the operational layout through
  an isolated in-page print frame instead of a temporary browser tab,
  preventing focus/input problems observed in Chromium-based browsers.
- A stale print frame is removed before a repeated print; `afterprint` performs
  normal cleanup without a short arbitrary destruction timeout.
- Replaced obsolete popup-blocking instructions with a generic localized
  print-dialog error in Italian, English, German, Spanish, French, Portuguese,
  and Dutch.

## Unchanged from v1.3.0

- The operational print document, geometry engine, placement, capacity,
  coordinates, units, status semantics, vehicle and pallet data, themes, and
  legal documents are unchanged.
- This is a LoadComposer compatibility workaround; it does not claim a browser
  engine fix.
- No Dark Reader or other dark-mode browser-extension compatibility changes
  are included.
