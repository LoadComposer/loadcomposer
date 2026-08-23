# LoadComposer v1.3.0 → v1.3.1 delta audit

Canonical input delivery SHA-256: `54d9b432431917042148e0d8aa9e50e77f2ee5d1d3794db08ca994eefe127e99`.

## Classified differences

| Class | Changes |
|---|---|
| A — version/release metadata | `VERSION`, package metadata, titles/badges, README, changelogs, issue template, cache entries and release builders moved to v1.3.1 while retaining v1.3.0 standalone history. |
| B — print transport | `site/index.html`: temporary top-level popup replaced by an isolated off-screen same-page iframe; readiness, `afterprint`, stale-frame and error cleanup added; print document self-print script removed. |
| C — print error/i18n | `print.popupBlocked` replaced by generic `print.dialogUnavailable` in all seven language catalogs. |
| D — tests/evidence | Print harnesses adapted to iframe capture; new print-transport regression and v1.3.1 evidence/results/reports added. |
| E — generated artifacts | v1.3.1 standalone HTML/ZIP, pages, Open Graph asset, glossaries and test evidence generated. |
| F — controls/package metadata | v1.3.1 delivery-control script, manifest/checksum controls and package artifacts. |

## Authored-file scope

- Release metadata/docs: `.github/ISSUE_TEMPLATE/bug.yml`, `VERSION`, `package.json`, `package-lock.json`, `README.md`, `README.it.md`, `CHANGELOG.md`, `CHANGELOG-v1.3.1.md`.
- Production source: `site/index.html`, seven `site/lang/*.json` catalogs, `site/_headers`.
- Build/templates: eight release scripts plus the Download, Legal and 404 templates.
- Tests: iframe-aware print capture in the affected print/security/visual harnesses, release-version assertions, exact v1.3.0 raster comparison, and `tests/print-transport-v1.3.1.mjs`.
- QA documentation: this audit, the compatibility checklist, test report and release report.

## Protected semantic areas

| Area | Result | Evidence |
|---|---|---|
| Geometry engine | NO SEMANTIC CHANGE | 7,542/7,542 exact cases, zero differences. |
| Capacity | NO SEMANTIC CHANGE | Functional parity 35/35 and geometry capacity matrix. |
| Vehicles | NO SEMANTIC CHANGE | No catalog/model edits; release and functional audits pass. |
| Pallet presets | NO SEMANTIC CHANGE | No preset edits; functional and linear-unit tests pass. |
| Units | NO SEMANTIC CHANGE | mm/cm/in regressions and eight print PDFs pass. |
| Status system | NO SEMANTIC CHANGE | 6/6 status scenarios pass. |
| Trailer prudential logic | NO SEMANTIC CHANGE | 29/29 trailer cases pass. |
| Dark-mode styling | NO SEMANTIC CHANGE | Native-theme regressions pass; no dark-extension code added. |
| Legal | BYTE-IDENTICAL CONTENT | All seven legal source files match v1.3.0 byte-for-byte. |

No opportunistic refactor, design change, geometry optimization, i18n cleanup or Dark Reader/dark-extension compatibility work is included.

