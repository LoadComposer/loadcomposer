# Trailer dimensions and warning review — v1.2.0

Date: 2026-08-12

The v1.2.0 Download/wording scope does not change any vehicle, container,
dimension, opening, threshold, warning condition or loading direction. Direct
comparison uses the admitted canonical v1.1.0 fixture.

| Profile | Nominal L×W×H (mm) | Prudential L×W×H (mm) |
|---|---:|---:|
| Curtain | `13,620 × 2,480 × 2,650` | `13,600 × 2,450 × 2,600` |
| Mega | `13,620 × 2,480 × 3,000` | `13,600 × 2,450 × 2,900` |
| Standard single-temperature reefer | `13,310 × 2,460 × 2,650` | `13,300 × 2,460 × 2,600` |

The warning condition remains inclusive on each axis:
`used >= prudential && used <= nominal`. A nominal-limit failure remains
`NON OK`. Where a finite prudential value exists, the legacy minimum on that
axis is not also evaluated. Legacy conservative warnings remain for profiles
without a prudential value.

Required operational results are unchanged:

- 33 EUR curtain: `CI STA`;
- 34 EUR curtain: `CI STA` plus `VERIFICA MISURE`;
- 33 EUR Mega: `CI STA`;
- 34 EUR Mega: `CI STA` plus `VERIFICA MISURE`;
- 33 EUR standard single-temperature reefer: `CI STA`;
- 34 EUR standard single-temperature reefer: `NON OK`, 33 placed;
- 26 industrial 1000 × 1200 mm pallets on the reefer: `CI STA`.

Automated result: `29/29` targeted trailer, boundary, overlap and precedence
checks PASS. Direct functional parity is `35/35`; equivalent-input geometry is
`7,542/7,542` with zero differences. All twelve equipment profiles are
unchanged. Side loading appears only as a future roadmap need; no side-opening
data, access rule, geometry or control exists in v1.2.0.
