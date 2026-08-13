# Test report — LoadComposer v1.2.0 corrected private candidate

Date: 2026-08-13  
Status: PASS locally; not published or finally approved

## Input admission

- Received v1.2.0 candidate SHA-256:
  `a3fef2b6898ae2aacfc9732edddcd226cda7ce82fc935d8ee232829fb0ece78f`.
- Admission: one `delivery-v1.2.0/` root, no unsafe path, duplicate or symlink,
  ZIP integrity PASS, `281` files, `279/279` exact manifest entries and
  `280/280` checksum entries PASS.
- The inherited canonical v1.1.0 application fixture remains `10/10` expected
  hashes PASS. No v1.0.0, v1.1.0 or historical fixture was changed.

## Authorized correction

Only the Download-page visual presentation changed:

1. the secondary standalone ZIP control now has readable active text and a
   visible border in dark mode while remaining visually secondary;
2. the Recommended badge is filled and visually primary, while the Offline
   badge remains an outline.

No text, translation, layout breakpoint, card order, card width, page logic,
planner source, operational UI, PDF source, cache rule, roadmap or version was
changed.

## Environment and reproducibility

- Node.js `22.17.0`; npm `11.9.0`.
- Final source-tree clean `npm ci`: `58` packages, exit `0`.
- Final source-tree complete `npm test`: exit `0`.
- Frozen `270`-file test bundle SHA-256:
  `e0fed0ec8b5bedaaeeb82aea02ffdb676321943aafa78fe6c25a696cf16af871`.
- Clean extraction of that exact bundle: `npm ci` and complete `npm test`
  exit `0`.
- Separate package-integrity extraction: build, hardening, workflow policy and
  whole-tree generated-file diff exit `0`; `NO_COMMIT_PRESENT`.

## Download-page visual and accessibility matrix

The existing matrix remains `21/21` file scenarios: seven languages by
light/dark/auto at 320 px. A focused matrix adds `24/24` scenarios:

- languages: Italian and English;
- themes: light and dark;
- viewports: `1920×1080`, `1366×768`, `900×900`, `390×844`, `375×812` and
  `320×780`;
- eight retained review screenshots: laptop `1366×768` and mobile `390×844`
  for both languages and both themes.

The focused matrix verifies the filled Recommended badge, outlined Offline
badge, HTML-primary/ZIP-secondary hierarchy, ZIP normal/hover/focus/active
states, HTML hover/focus states, keyboard-visible focus, closed-by-default
integrity details, side-by-side desktop cards, stacked mobile cards, zero
overflow, zero overlap, zero console errors and zero automatic remote requests.

Measured contrast ratios include:

| Element/state | Light | Dark |
|---|---:|---:|
| Recommended badge text | `5.47:1` | `9.31:1` |
| Offline badge text | `5.47:1` | `8.73:1` |
| ZIP normal text | unchanged and PASS | `13.66:1` |
| ZIP border | unchanged and PASS | `8.73:1` |
| ZIP hover text | unchanged and PASS | `10.49:1` |
| ZIP active text | unchanged and PASS | `11.67:1` |

All tested text ratios are at least `4.5:1`; required control/border ratios are
at least `3:1`. The ZIP control is visibly active in dark mode and cannot be
mistaken for a disabled control.

## Complete suite

| Area | Result |
|---|---:|
| Node and embedded-JavaScript syntax | `46/46` Node files; app `5`, standalone `5`, Download page `2` scripts PASS |
| Catalogs | `7 × 492` equal key sets PASS |
| Modular i18n | `18/18` PASS |
| Direct v1.1.0 fixture | `10/10` hashes PASS |
| Exact v1.2.0 application scope audit | algorithms byte-equivalent after authorized normalization PASS |
| Download base matrix | `21/21` language/theme/`file://` scenarios PASS |
| Download focused visual/accessibility | `24/24`, eight screenshots, all states PASS |
| Footer/mobile standalone | `7/7` locales at 320 px PASS |
| Remaining-space semantic parity | `7/7`, known `32 mm` case and internal values unchanged |
| Trailer, overlap and precedence | `29/29` PASS |
| Cache policy | `3 × 49 = 147/147` PASS |
| LICENSE/NOTICE inline and identity | `6/6` PASS |
| Repository runtime | `16/16` HTTP/subfolder/`file://` PASS |
| Visual/responsive matrix | `112/112` PASS |
| Functional parity | `35/35` PASS |
| Equivalent-input geometry | `7,542/7,542`, zero differences |
| Functional regressions | `37/37` PASS |
| XSS | `9/9`, 28 scenarios PASS |
| Events/state | `20/20` and `7/7` PASS |
| Responsive runtime | `9/9` PASS, seven screenshots, zero console errors |
| Main print PDFs | `33/33` PASS |
| Unaffected approved raster matrix | `47/47` PASS, pixel-identical |
| Localized PDFs | `35/35` PASS |
| Plural PDFs | `42/42` PASS |
| Total PDF scenarios | `110/110` PASS |
| Repository / hardening / workflow policy | PASS |

The geometry comparison consists of `1,080` single-capacity cases, `4,110`
single-load cases and `2,352` mixed cases. All remained identical. Print and
PDF sources are byte-identical to the received candidate, and the entire
approved raster matrix remains pixel-identical.

## Artifact conclusions

- Standalone HTML: `615,988` bytes, SHA-256
  `b6cb5321e003b58fa4429081b35c2fcdffa849a2e2b089f8781235692988523d`.
- Standalone ZIP: `648,120` bytes, SHA-256
  `df8199becf2190428334add7924ecc05ad24ac2a81c3e7fd7a90c7eac5ee699d`.
- Corrected Download page SHA-256:
  `63e4e6a298744be97ded7062d5b8b709f53728ff4227111ab54e7c7c03b97a3e`.

The standalone hashes intentionally remain unchanged: the build regenerated
the artifacts deterministically and proved them byte-identical because this
correction does not belong in the planner. The Download page continues to
display those exact hashes.

The source/path delta is limited to the Download template, its deterministic
`site/downloads/index.html` output and the strengthened Download test. Home,
planner, catalogs, operational strings, remaining-space formulas, compact-load
activation, equipment, geometry, coordinates, results, print/PDF, legal files,
cache policy, roadmap and standalone are unchanged.

npm emitted a host-environment deprecation warning for inherited `http-proxy`
configuration and a notice that a newer npm minor exists; neither altered
dependency resolution or results. No production URL, Cloudflare behavior,
commit, push, release or deployment was tested or performed.
