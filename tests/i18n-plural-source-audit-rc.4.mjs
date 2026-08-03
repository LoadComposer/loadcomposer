import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const APP_PATH = path.join(ROOT, "site/index.html");
const CODES = ["it", "en", "de", "es", "fr", "pt", "nl"];
const APP_SOURCE = fs.readFileSync(APP_PATH, "utf8");
const PLACEHOLDER = /\{([A-Za-z0-9_.-]+)\}/g;
const QUANTITY_NAMES = new Set([
  "count",
  "placed",
  "requested",
  "capacity",
  "floor",
  "layers",
  "used",
  "total",
  "maximum",
  "normal",
  "rotated",
  "positions"
]);
const COMPOSED_KEYS = new Set([
  "preview.singleNotes",
  "layout.orientationMixed",
  "table.drawSingle",
  "print.singleTitle",
  "print.requestedPlacedCapacity",
  "print.floorLayerSummary",
  "print.singlePlacement",
  "print.singleFloor",
  "print.layerSummary",
  "print.singleOperationalNote"
]);
const NON_COUNT_KEYS = new Set([
  "pallet.groupTitle",
  "pallet.customFallbackType",
  "layout.order.attempt",
  "validation.maximum",
  "validation.groupPrefix",
  "validation.totalRange",
  "geometry.rectangle",
  "geometry.unplacedPallet",
  "space.issue.prudentialLength",
  "space.issue.prudentialWidth",
  "space.issue.prudentialHeight"
]);

function placeholders(value) {
  return [...String(value).matchAll(PLACEHOLDER)]
    .map(match => match[1])
    .sort();
}

assert.match(APP_SOURCE, /new Intl\.PluralRules\(locale\(\)\)\.select\(Number\(count\)\)/);
assert.match(APP_SOURCE, /function plural\(baseKey, count, variables = \{\}\)/);
assert.match(APP_SOURCE, /\[category, "other"\]/);
assert.doesNotMatch(APP_SOURCE, /category\s*===\s*["']one["']/);
assert.doesNotMatch(APP_SOURCE, /count\s*===\s*1\s*\?/);
assert.doesNotMatch(APP_SOURCE, /locale\(\)\s*===\s*["'](?:pl|ar)["']/);
assert.doesNotMatch(APP_SOURCE, /activeCode\s*===\s*["'](?:pl|ar)["']/);
assert.doesNotMatch(APP_SOURCE, /common\.palletPlural|common\.piecesShort/);

const catalogs = Object.fromEntries(CODES.map(code => [
  code,
  JSON.parse(fs.readFileSync(path.join(ROOT, "site", "lang", `${code}.json`))).translations
]));
const reference = catalogs.en;
const referenceKeys = Object.keys(reference);
const pluralBases = new Set(
  referenceKeys
    .filter(key => key.endsWith(".one"))
    .map(key => key.slice(0, -4))
);

assert.equal(pluralBases.size, 45, "counted translation families");
for (const base of pluralBases) {
  assert.equal(typeof reference[`${base}.other`], "string", `${base}.other`);
  const directPattern = new RegExp(
    `\\bt\\(\\s*["']${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`
  );
  assert.doesNotMatch(APP_SOURCE, directPattern, `${base} bypasses plural engine`);
  const pluralPattern = new RegExp(
    `pluralText\\(\\s*["']${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`
  );
  assert.match(APP_SOURCE, pluralPattern, `${base} is not routed through pluralText`);
}

for (const code of CODES) {
  const translations = catalogs[code];
  assert.deepEqual(
    Object.keys(translations).sort(),
    referenceKeys.slice().sort(),
    `${code} key alignment`
  );
  for (const base of pluralBases) {
    const one = translations[`${base}.one`];
    const other = translations[`${base}.other`];
    assert.equal(typeof one, "string", `${code}:${base}.one`);
    assert.equal(typeof other, "string", `${code}:${base}.other`);
    assert.deepEqual(
      placeholders(one),
      placeholders(other),
      `${code}:${base} corresponding placeholders`
    );
  }
}

for (const [key, value] of Object.entries(reference)) {
  const quantityPlaceholders = placeholders(value)
    .filter(name => QUANTITY_NAMES.has(name));
  if (!quantityPlaceholders.length) continue;
  const isPluralForm = /\.(?:zero|one|two|few|many|other)$/.test(key);
  assert(
    isPluralForm || COMPOSED_KEYS.has(key) || NON_COUNT_KEYS.has(key),
    `${key} has quantity placeholders but is not classified`
  );
}

for (const key of COMPOSED_KEYS) {
  assert.equal(typeof reference[key], "string", `${key} composed key missing`);
}
for (const key of NON_COUNT_KEYS) {
  assert.equal(typeof reference[key], "string", `${key} non-count key missing`);
}

console.log(
  `Plural source audit PASS: ${pluralBases.size} counted families, ` +
  `${COMPOSED_KEYS.size} composed templates, ${NON_COUNT_KEYS.size} classified non-count labels.`
);
