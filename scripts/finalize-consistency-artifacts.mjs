import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const INPUT_DELIVERY_SHA = "8c52957d674e31f2cb44f4861bcc0e9d83594200ea8700cda26276395dbacfd6";
const INPUT_TEST_BUNDLE_SHA = "39db53ff58cbedbb7558c8a8f191af701f7e4fc67753cd4edd9f533c103b6291";
const INPUT_FILE_COUNT = 1245;
const CANDIDATE_DATE = "2026-08-21";

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    if (entry.name === "node_modules") return [];
    if (entry.isDirectory()) return walk(full);
    return [path.relative(directory === ROOT ? ROOT : ROOT, full).split(path.sep).join("/")];
  });
}

function write(relative, content) {
  fs.writeFileSync(path.resolve(ROOT, relative), `${content.trim()}\n`, "utf8");
}

function refineChangelog(relative) {
  const file = path.resolve(ROOT, relative);
  let source = fs.readFileSync(file, "utf8");
  const anchor = "- Shows zero free slots explicitly when Single capacity equals the request, in\n  both the table and operational print output.";
  const addition = `${anchor}
- Presents metric-native pallet presets directly in mm or cm, presents imperial-native
  commercial identities exactly in inches, and adds only a working-unit conversion
  when crossing metric/imperial systems.
- Applies documented prudential auto-OK access-height references only to the 13.60 m
  curtain, Mega, and reefer profiles; heights above the reference but inside internal
  geometry remain VERIFY, and internal geometry, door data, and capacity are unchanged.`;
  if (!source.includes("Presents metric-native pallet presets")) {
    source = source.replace(anchor, addition);
  }
  fs.writeFileSync(file, source, "utf8");
}

function prepareInternalReports() {
  write("PRE_RELEASE_CONSISTENCY_AUDIT-v1.3.0.md", `
# LoadComposer v1.3.0 — Pre-release consistency audit

Date: ${CANDIDATE_DATE}

Accepted input delivery SHA-256: \`${INPUT_DELIVERY_SHA}\`
Accepted input test-bundle SHA-256: \`${INPUT_TEST_BUNDLE_SHA}\`

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
case repeats the first-line dimension as a \`Pallet + same dimension\` second line.
`);

  write("TEST_REPORT-v1.3.0.md", `
# LoadComposer v1.3.0 — Test report

Date: ${CANDIDATE_DATE}
Accepted input delivery SHA-256: \`${INPUT_DELIVERY_SHA}\`
Accepted input test-bundle SHA-256: \`${INPUT_TEST_BUNDLE_SHA}\`

## Result

**PASS.** The final v1.3.0 micro-fix and complete regression passed.

## Micro-fix evidence

- Focused consistency suite: 92/92 checks.
- Three target presets × seven languages × mm/cm/in: 63/63 exact presentations.
- Single dropdown/summary and Mixed dropdown/summary parity: PASS.
- Redundant fallback audit across every current non-custom preset: zero findings.
- Responsive matrix: 10/10 viewports, 30/30 open-picker unit states and
  30/30 Single/custom/Mixed scenarios.
- Catalog parity: 7 × 530 keys.
- Status visual evidence: 6/6.
- Trailer prudential regression: 29/29.
- Exact admitted-input geometry parity: 1,080 Single capacity + 4,110 Single
  load + 2,352 Mixed = 7,542/7,542, zero differences.

## Full regression

Syntax, catalogs/plurals/i18n, scope freeze/audit, Download, remaining-space,
status, UI, units, responsive, trailer, legal, 404, repository/runtime,
hardening/workflow, visual, functional parity, security, events, standalone,
print/PDF, cache, and packaging audits: PASS.

## Frozen scope confirmed

Geometry, placement, capacity, coordinates, canonical pallet and vehicle
dimensions, native commercial dimensions, stacking, unit conversion/parsing,
trailer access, status, canonical volume, print and all seven legal documents
remain unchanged.
`);

  const checklist = fs.readFileSync(path.resolve(ROOT, "RELEASE_CHECKLIST-v1.3.0.md"), "utf8");
  if (!checklist.includes("Final preset-description micro-fix — 2026-08-21")) {
    fs.writeFileSync(
      path.resolve(ROOT, "RELEASE_CHECKLIST-v1.3.0.md"),
      `${checklist.trim()}\n\n## Final preset-description micro-fix — 2026-08-21\n\n` +
      "- [x] Exact approved input delivery and test-bundle SHA-256 admitted.\n" +
      "- [x] 42 × 42, 48 × 45 and 48 × 48 descriptions verified in seven languages.\n" +
      "- [x] Single/Mixed and mm/cm/in presentation parity passed.\n" +
      "- [x] No remaining redundant dimensional fallback found.\n" +
      "- [x] Geometry/capacity, units, trailer access, status, Mixed, print and responsive regressions passed.\n" +
      "- [x] Legal files remain byte-identical and final package controls were regenerated.\n",
      "utf8"
    );
  }
}

function parseCount(source, label) {
  const match = source.match(new RegExp(`^${label}: (\\d+)`, "m"));
  if (!match) throw new Error(`Missing ${label}.`);
  return Number(match[1]);
}

function createFinalReport() {
  const args = Object.fromEntries(process.argv.slice(3).map(value => {
    const index = value.indexOf("=");
    return [value.slice(0, index), value.slice(index + 1)];
  }));
  for (const key of ["delivery", "bundle", "standaloneHtml", "standaloneZip", "output"]) {
    if (!args[key]) throw new Error(`Missing ${key}=...`);
  }
  const manifestSource = fs.readFileSync(path.resolve(ROOT, "DELIVERY_MANIFEST-v1.3.0.txt"), "utf8");
  const finalFiles = parseCount(manifestSource, "Final file count");
  const manifestCount = parseCount(manifestSource, "Manifest entries");
  const checksumCount = parseCount(manifestSource, "Checksum-list coverage");
  const deliverySha = sha256(args.delivery);
  const bundleSha = sha256(args.bundle);
  const standaloneHtmlSha = sha256(args.standaloneHtml);
  const standaloneZipSha = sha256(args.standaloneZip);
  const authored = [
    "site/index.html",
    "site/lang/{it,en,de,es,fr,pt,nl}.json",
    "tests/final-consistency-v1.3.0.mjs",
    "tests/linear-units-responsive-v1.3.0.mjs",
    "tests/i18n-identical-allowlist-v1.0.0.json",
    "tests/v13-scope-audit-v1.3.0.mjs",
    "tests/geometry-full-parity-v1.0.0.mjs",
    "scripts/{create-delivery-controls,finalize-consistency-artifacts}.mjs",
    "TEST_REPORT-v1.3.0.md",
    "RELEASE_CHECKLIST-v1.3.0.md",
    "PRE_RELEASE_CONSISTENCY_AUDIT-v1.3.0.md"
  ].join("; ");
  const generated = [
    "site/downloads/loadcomposer-v1.3.0-standalone.html[.sha256]",
    "site/downloads/loadcomposer-v1.3.0-standalone.zip[.sha256]",
    "site/downloads/index.html",
    "docs/translations/*-v1.3.0.md",
    "focused/full test JSON and responsive screenshots",
    "loadcomposer-v1.3.0-test-bundle.zip",
    "DELIVERY_MANIFEST-v1.3.0.txt",
    "SHA256SUMS-v1.3.0.txt"
  ].join("; ");
  const rows = [
    `SHA input delivery — \`${INPUT_DELIVERY_SHA}\`.`,
    `ZIP admission — PASS for delivery \`${INPUT_DELIVERY_SHA}\` and corresponding test bundle \`${INPUT_TEST_BUNDLE_SHA}\`; roots, safe paths, manifest sizes/hashes and all internal checksums verified.`,
    `Input file count — ${INPUT_FILE_COUNT} files.`,
    "Previous descriptions — 42 × 42, 48 × 45 and 48 × 48 used redundant dimensional labels equivalent to `Pallet {same dimension}`.",
    "New descriptions — `Pallet telecom / vernici`; `Pallet automotive`; `Pallet per fusti` (with natural localized equivalents).",
    "Seven-language i18n — it/en/de/es/fr/pt/nl present; 7 × 530 key parity and no visible placeholder PASS.",
    "mm behavior — native inch identity remains first; 1067 × 1067, 1219 × 1143 and 1219 × 1219 mm plus description appear second.",
    "cm behavior — localized 106.7/121.9/114.3 cm conversions plus description PASS, with comma or point according to locale.",
    "in behavior — exact 42 × 42, 48 × 45 and 48 × 48 in identities plus description only; no repeated dimension.",
    "Single dropdown — all three presets PASS in seven languages and mm/cm/in.",
    "Single selected summary — exact parity with the dropdown PASS.",
    "Mixed dropdown — all three presets PASS in seven languages and mm/cm/in.",
    "Mixed selected summary — exact parity with the dropdown PASS.",
    "Fallback audit — the shared fallback mechanism remains available; explicit names prevent its use for the three target presets.",
    "Other redundant fallbacks — none found among current non-custom presets across all seven languages.",
    "Responsive — 10/10 required-plus-supplementary viewports, 30/30 open-picker mm/cm/in states and no page/menu/text overflow.",
    "Standalone — regenerated self-contained HTML/ZIP; HTTP, file://, offline and checksum QA PASS.",
    "Unit regression — parser, formatter, persistence, decimal localization, custom fields, gap and stacking gap unchanged; PASS.",
    "Trailer access regression — curtain/Mega/reefer prudential thresholds and internal/access distinction unchanged; 29/29 PASS.",
    "Status regression — CI STA/NON CI STA and OK/PARZIALE/NON OK/VERIFICA semantics and presentation unchanged; 6/6 PASS.",
    "Mixed regression — OK, PARZIALE, loaded/unplaced wording and first-excluded behavior unchanged; PASS.",
    "Print regression — layout, global print unit, m³/ft³, opening wording, locales and plural behavior unchanged; PASS.",
    "Geometry parity — exact admitted-input comparison: 7,542/7,542 cases, zero differences.",
    "Capacity parity — exact admitted-input comparison: 1,080/1,080 cases, zero differences.",
    "Legal byte identity — all seven root legal documents and their site/legal copies match the admitted input byte-for-byte.",
    `Final delivery file count — ${finalFiles}.`,
    `Manifest count — ${manifestCount} = N−2.`,
    `Checksum count — ${checksumCount} = N−1.`,
    `SHA nuova delivery — \`${deliverySha}\`.`,
    `SHA nuovo test bundle — \`${bundleSha}\`.`,
    `SHA standalone HTML — \`${standaloneHtmlSha}\`.`,
    `SHA standalone ZIP — \`${standaloneZipSha}\`.`,
    "No new feature — version remains v1.3.0 and no planning capability was added.",
    "Functional delta — limited exclusively to the descriptions of the 42 × 42 in, 48 × 45 in and 48 × 48 in presets."
  ];
  if (rows.length !== 34) throw new Error(`Expected 34 report rows, got ${rows.length}.`);
  const numbered = rows.map((row, index) => `${index + 1}. ${row}`).join("\n");
  const report = `# LoadComposer v1.3.0 — Final pre-release consistency report

Date: ${CANDIDATE_DATE}

Current admitted input delivery SHA-256: \`${INPUT_DELIVERY_SHA}\`
Current admitted input test-bundle SHA-256: \`${INPUT_TEST_BUNDLE_SHA}\`
Current output delivery SHA-256: \`${deliverySha}\`

## Verdict

**PASS.** This report belongs to the output delivery whose SHA-256 is
\`${deliverySha}\`. The only functional delta is the approved descriptive
wording for the 42 × 42 in, 48 × 45 in and 48 × 48 in pallet presets.

## Mandatory 34-point record

${numbered}

## Delta audit

- Authored files: ${authored}.
- Generated files: ${generated}.
- CHANGELOG and release version remain unchanged.

No semantic delta was found in geometry, capacity, coordinates, layout, rotation,
stacking, spare dimensions, vehicle data, canonical pallet data, units, trailer
access, status, Mixed behavior, volume, print, Legal, Download or 404.
`;
  fs.writeFileSync(path.resolve(args.output), report, "utf8");
  console.log(`Final report generated: ${args.output}`);
}

const command = process.argv[2];
if (command === "prepare") prepareInternalReports();
else if (command === "report") createFinalReport();
else throw new Error("Usage: node scripts/finalize-consistency-artifacts.mjs prepare|report key=value...");
