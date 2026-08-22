# LoadComposer v1.3.0 — Pre-release consistency audit

Date: 2026-08-21

Accepted input delivery SHA-256: `8c52957d674e31f2cb44f4861bcc0e9d83594200ea8700cda26276395dbacfd6`
Accepted input test-bundle SHA-256: `39db53ff58cbedbb7558c8a8f191af701f7e4fc67753cd4edd9f533c103b6291`

## Verdict

PASS. The final micro-fix is confined to the explicit commercial descriptions
of the 42 × 42 in, 48 × 45 in, and 48 × 48 in pallet presets, their seven
localized catalog values, focused tests/evidence, and regenerated package controls.

## Delta classification

- A — preset metadata: three redundant dimensional fallback names replaced by
  descriptive commercial-use labels.
- B — i18n: three existing name keys updated in each of seven enabled catalogs.
- C — tests/evidence: exhaustive Single/Mixed, mm/cm/in, seven-language and
  responsive open-picker coverage.
- D — generated metadata: current standalone/package checksums, glossaries,
  reports, test bundle, manifest, and checksum list.

## Frozen categories

No semantic modification: geometry; placement; capacity; canonical vehicle and
pallet dimensions; native commercial dimensions; stacking; unit parsing,
conversion and formatting; trailer-access semantics; status; volume; print;
Legal, Download and 404 design/content.

## Fallback audit

All current non-custom presets were audited in all seven languages. No remaining
case repeats the first-line dimension as a `Pallet + same dimension` second line.
