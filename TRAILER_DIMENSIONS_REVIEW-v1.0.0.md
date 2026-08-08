# Trailer dimensions and warning review — v1.0.0

Date: 2026-08-08

| Profile | Nominal L×W×H (mm) | Prudential L×W×H (mm) |
|---|---:|---:|
| Curtain | `13,620 × 2,480 × 2,650` | `13,600 × 2,450 × 2,600` |
| Mega | `13,620 × 2,480 × 3,000` | `13,600 × 2,450 × 2,900` |
| Standard single-temperature reefer | `13,310 × 2,460 × 2,650` | `13,300 × 2,460 × 2,600` |

The warning condition is inclusive on each axis:
`used >= prudential && used <= nominal`. A nominal-limit failure remains
`NON OK`. If a finite prudential value exists, the legacy min value on that
same axis is not evaluated. Legacy conservative warnings remain unchanged for
profiles without a prudential value.

## Required boundary results

- Curtain height: 2,599 no warning; 2,600 and 2,601 exactly one prudential
  height issue; 2,651 `NON OK`.
- Mega height: 2,850 and 2,899 no warning; 2,900 exactly one prudential height
  issue; 3,001 `NON OK`. Operational 2,845/3,200 fields are absent.
- Reefer height: 2,599 no warning; 2,600 and 2,631 exactly one prudential
  height issue, with no legacy 2,630 message.
- Reefer length: 13,299 no longitudinal warning; 13,300 and 13,310 exactly one;
  13,311 `NON OK`, with no legacy minLength warning.
- Synthetic `minHeight: 2500` plus `prudentialHeight: 2600`: 2,550 produces no
  issue; 2,600 produces only the prudential issue.
- 20' Reefer at 2,168 mm and 40' HC Reefer at 2,416 mm still produce one
  conservative height issue and no prudential issue.

Pallet scenarios: 33 EUR curtain/mega fit without a longitudinal prudential
warning; 34 fit with one warning. Reefer fits 33 EUR and rejects 34 with 33
placed. Twenty-six industrial pallets fit the reefer. A locked 802 mm pallet
case rejects 34 and places 32.

Automated result: `29/29` targeted checks PASS, including UI badge count,
structured issue arrays, plain-print text and standalone execution.
