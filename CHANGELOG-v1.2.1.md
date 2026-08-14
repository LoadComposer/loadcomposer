# LoadComposer v1.2.1

Release date: 2026-08-14

LoadComposer v1.2.1 is a presentation-only patch focused on UI consistency and
result readability.

## Changes

- Main: controlled 1520 px desktop shell, unchanged approximately 430 px load
  panel, and more space for Result.
- Result table: five columns, simplified localized Load / capacity wording,
  sticky Vehicle column during internal horizontal scrolling, and stacking-only
  floor-position details.
- Weight: the repeated table column is removed; the upper Weight — N/A summary
  remains visible.
- Download: approved layout and behavior retained; local colour tokens aligned
  with the main application.
- Legal: new secondary-page shell with the shared language and theme
  preferences, a comfortable 860 px reading column, and the same seven enabled
  languages as the application.
- 404: compact secondary-page shell with the same seven languages and shared
  automatic, light and dark theme preference, robust root-relative recovery
  links, English no-script fallback, `noindex` and `no-store` preserved.

## Compatibility and scope

This patch adds no geometric capability. Algorithms, placements, capacity,
vehicle data, stacking, print and PDF output remain equivalent to canonical
v1.2.0. LICENSE, LICENSE.it.md, NOTICE, TRADEMARKS.md,
COMMERCIAL-LICENSING.md, PRIVACY.md and SECURITY.md remain byte-identical.
