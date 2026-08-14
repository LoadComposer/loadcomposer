import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASELINE = path.join(ROOT, "tests", "fixtures", "baseline-v1.2.0");
const CODES = ["it", "en", "de", "es", "fr", "pt", "nl"];
const EXPECTED_BASELINE_HASHES = {
  "loadcomposer-v1.2.0.html": "b56be4f08b82dd4a46950043681b22f47d58b94abda615805e466ff6f7974fa1",
  "loadcomposer-v1.2.0-standalone.html": "b6cb5321e003b58fa4429081b35c2fcdffa849a2e2b089f8781235692988523d",
  "lang/index.json": "bbb457595ba12d38cb7853a3f5b67fff679a79655b3959cb24ee9443ce76198f",
  "lang/it.json": "10d498eb343d5d49a1ac7011d177db7166cb47c8f87abf671cc9fe3a28c8ce6e",
  "lang/en.json": "28cbf591e8fd5101b49c95e6e268e35370ed60b5915eaf28c72ce4881c90079e",
  "lang/de.json": "dfac8fe26828b949d6374d9e9effcfa511bff57c1518667075437bc72fe94bca",
  "lang/es.json": "bceb69b9b95b4daa20f3fa9d1316454acc092f78a381906aff4cf179c4114182",
  "lang/fr.json": "62ad3b84e24ad2a19571bda82b8f06b2d5b3851123a1af37f165f8986ccfafac",
  "lang/pt.json": "2f48ac9da463b6b12e3f1193a5f120a792cd3c7b6f911fb8c7c340261e2556f3",
  "lang/nl.json": "86ab4bcbc3b3723cd272e9be16d1a8ca2d763fa4328c8517343865024c91786c"
};
const ADDED_KEYS = [
  "legal.meta.title",
  "legal.meta.description",
  "legal.title",
  "legal.notice.controlling",
  "legal.notice.translation",
  "legal.notice.sourceAvailable",
  "legal.documents.title",
  "legal.documents.licenseEnglish",
  "legal.documents.licenseItalian",
  "legal.documents.notice",
  "legal.documents.trademarks",
  "legal.documents.commercial",
  "legal.documents.privacy",
  "legal.documents.security",
  "legal.contact.title",
  "legal.contact.prefix",
  "legal.footer.repository",
  "404.meta.title",
  "404.meta.description",
  "404.title",
  "404.description",
  "404.navigationAria"
];
const CHANGED_KEYS = [
  "meta.documentTitle",
  "results.table.capacity",
  "table.usefulHeight",
  "table.rearNotChecked",
  "table.internalHeight",
  "table.door",
  "table.maxPalletHeight",
  "table.floorPositions.one",
  "table.floorPositions.other",
  "table.usedFloorPositions.one",
  "table.usedFloorPositions.other",
  "table.missing.one",
  "table.missing.other",
  "table.unusedCapacity.one",
  "table.unusedCapacity.other",
  "table.mixedPlaced.one",
  "table.mixedPlaced.other",
  "downloads.currentVersion"
];
const AUTHORIZED_FUNCTION_CHANGES = ["renderMixedRow", "renderSingleRow", "renderTable"];
const LEGAL_FILES = [
  "LICENSE", "LICENSE.it.md", "NOTICE", "TRADEMARKS.md",
  "COMMERCIAL-LICENSING.md", "PRIVACY.md", "SECURITY.md"
];

const read = file => fs.readFileSync(file, "utf8");
const sha256 = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");

for (const [relative, expected] of Object.entries(EXPECTED_BASELINE_HASHES)) {
  assert.equal(sha256(path.join(BASELINE, relative)), expected, `Canonical v1.2.0 fixture changed: ${relative}`);
}
assert.equal(
  read(path.join(ROOT, "site", "lang", "index.json")),
  read(path.join(BASELINE, "lang", "index.json")),
  "Enabled/disabled language inventory changed."
);

for (const code of CODES) {
  const baseline = JSON.parse(read(path.join(BASELINE, "lang", `${code}.json`)));
  const current = JSON.parse(read(path.join(ROOT, "site", "lang", `${code}.json`)));
  assert.equal(current.meta.version, "1.2.1", `${code}: candidate metadata version.`);
  const baselineKeys = new Set(Object.keys(baseline.translations));
  const currentKeys = new Set(Object.keys(current.translations));
  const added = [...currentKeys].filter(key => !baselineKeys.has(key)).sort();
  const removed = [...baselineKeys].filter(key => !currentKeys.has(key)).sort();
  const changed = [...baselineKeys]
    .filter(key => current.translations[key] !== baseline.translations[key])
    .sort();
  assert.deepEqual(added, [...ADDED_KEYS].sort(), `${code}: exact added-key allowlist.`);
  assert.deepEqual(removed, [], `${code}: catalog keys removed.`);
  assert.deepEqual(changed, [...CHANGED_KEYS].sort(), `${code}: exact changed-key allowlist.`);
}

function functionBlocks(source) {
  const starts = [...source.matchAll(/^    function ([A-Za-z0-9_$]+)\s*\(/gm)]
    .map(match => ({ name: match[1], index: match.index }));
  return new Map(starts.map((item, index) => [
    item.name,
    source.slice(item.index, starts[index + 1]?.index ?? source.length)
  ]));
}

const baselineSource = read(path.join(BASELINE, "loadcomposer-v1.2.0.html"));
const currentSource = read(path.join(ROOT, "site", "index.html"));
const beforeFunctions = functionBlocks(baselineSource);
const afterFunctions = functionBlocks(currentSource);
assert.deepEqual([...afterFunctions.keys()], [...beforeFunctions.keys()], "Top-level function inventory changed.");
const changedFunctions = [];
for (const [name, before] of beforeFunctions) {
  const after = afterFunctions.get(name);
  if (before !== after) changedFunctions.push(name);
}
assert.deepEqual(changedFunctions.sort(), [...AUTHORIZED_FUNCTION_CHANGES].sort(), "Function changes exceed the result-table renderer allowlist.");

function sourceSlice(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0 && end > start, `Source slice not found: ${startMarker}`);
  return source.slice(start, end);
}

assert.equal(
  sourceSlice(currentSource, "    const CONTAINERS = [", "    const TYPE_COLORS = ["),
  sourceSlice(baselineSource, "    const CONTAINERS = [", "    const TYPE_COLORS = ["),
  "Vehicle/container data changed."
);

for (const name of LEGAL_FILES) {
  const canonical = path.join(ROOT, name);
  const published = path.join(ROOT, "site", "legal", name);
  assert.ok(fs.readFileSync(canonical).equals(fs.readFileSync(published)), `${name}: published copy differs.`);
}

console.log(
  "v1.2.1 scope audit PASS: canonical v1.2.0 fixture 10/10 hashes; 22 exact Legal/404 UI keys; " +
  "18 exact wording/version keys; only renderTable/renderSingleRow/renderMixedRow changed; " +
  "vehicle data, algorithms, geometry, print functions and 7 legal documents are unchanged."
);
