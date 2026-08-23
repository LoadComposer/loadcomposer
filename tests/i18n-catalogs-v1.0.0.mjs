import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TEST_DIR, "..");
const CODES = ["it", "en", "de", "es", "fr", "pt", "nl"];
const NEW_CODES = ["de", "es", "fr", "pt", "nl"];
const EXPECTED_ENABLED = [...CODES].sort();
const EXPECTED_DISABLED = ["ar", "pl", "tr", "zh-Hans"].sort();
const EXPECTED_VERSION = "1.3.1";
const EXPECTED_COUNT = 530;
const SAFE_CODE = /^(?:[a-z]{2}|zh-Hans)$/;
const PLACEHOLDER = /\{[A-Za-z0-9_.-]+\}/g;
const PLURAL_BASES = [
  "common.pallet",
  "common.pieces",
  "preview.stackCount",
  "preview.singleCapacity",
  "preview.singleFloorCapacity",
  "preview.singleLayers",
  "preview.singleMissing",
  "preview.singleUsedFloor",
  "preview.singleUsedLayers",
  "preview.mixedNotes",
  "preview.mixedMissing",
  "preview.mixedComplete",
  "layout.floorCount",
  "layout.loadedFloor",
  "layout.upToLayers",
  "layout.orientationNormalCount",
  "layout.orientationRotatedCount",
  "validation.maxCharacters",
  "validation.totalMaximum",
  "table.floorPositions",
  "table.usedFloorPositions",
  "table.missing",
  "table.unusedCapacity",
  "table.mixedPlaced",
  "table.requestedSummary",
  "table.capacitySummary",
  "print.mixedTitle",
  "print.requested",
  "print.placedSuffix",
  "print.requestedQuantityValue",
  "print.placedQuantityValue",
  "print.mixedCapacity",
  "print.singleCapacity",
  "print.mixedPlacement",
  "print.placedValue",
  "print.requestedValue",
  "print.foundCapacityValue",
  "print.mixedFloor",
  "print.floorUsed",
  "print.floorCapacity",
  "print.layersUsed",
  "print.layersCapacity",
  "print.mixedOperationalNote",
  "print.floorPositionsUse",
  "print.layerSuffix"
];

function readCatalog(code) {
  const filePath = path.join(ROOT, "site", "lang", `${code}.json`);
  const raw = fs.readFileSync(filePath, "utf8");
  return { filePath, raw, parsed: JSON.parse(raw) };
}

function placeholders(value) {
  return [...String(value).matchAll(PLACEHOLDER)]
    .map(match => match[0])
    .sort();
}

function rawTranslationKeys(raw) {
  const marker = '"translations": {';
  const start = raw.indexOf(marker);
  assert.notEqual(start, -1, "translations object missing");
  return raw
    .slice(start + marker.length)
    .split(/\r?\n/)
    .map(line => line.match(/^\s{4}"((?:\\.|[^"])*)"\s*:/)?.[1])
    .filter(Boolean)
    .map(key => JSON.parse(`"${key}"`));
}

const index = JSON.parse(fs.readFileSync(path.join(ROOT, "site", "lang", "index.json"), "utf8"));
assert.equal(index.schemaVersion, 1);
assert.equal(index.defaultLanguage, "en");
assert.equal(index.languages.some(language => language.code === "ru"), false);
assert.deepEqual(
  index.languages.filter(language => language.enabled).map(language => language.code).sort(),
  EXPECTED_ENABLED
);
assert.deepEqual(
  index.languages.filter(language => !language.enabled).map(language => language.code).sort(),
  EXPECTED_DISABLED
);

for (const language of index.languages) {
  assert.match(language.code, SAFE_CODE);
  assert.ok(["ltr", "rtl"].includes(language.dir));
  assert.equal(typeof language.nativeName, "string");
  assert.ok(language.nativeName.length > 0);
  assert.equal(typeof language.locale, "string");
  assert.ok(language.locale.length > 0);
  assert.ok(Array.isArray(language.browserPrefixes));
  assert.ok(language.browserPrefixes.length > 0);
}
assert.equal(index.languages.find(language => language.code === "ar").dir, "rtl");

const catalogs = Object.fromEntries(CODES.map(code => [code, readCatalog(code)]));
const reference = catalogs.en.parsed.translations;
const referenceKeys = Object.keys(reference);
assert.equal(referenceKeys.length, EXPECTED_COUNT);
const italian = catalogs.it.parsed.translations;
const allowlist = JSON.parse(
  fs.readFileSync(path.join(TEST_DIR, "i18n-identical-allowlist-v1.0.0.json"), "utf8")
);

for (const code of CODES) {
  const { raw, parsed } = catalogs[code];
  const translations = parsed.translations;
  const keys = Object.keys(translations);
  const rawKeys = rawTranslationKeys(raw);

  assert.equal(parsed.meta.code, code);
  assert.equal(parsed.meta.dir, "ltr");
  assert.equal(parsed.meta.version, EXPECTED_VERSION);
  assert.equal(keys.length, EXPECTED_COUNT, `${code} key count`);
  assert.equal(rawKeys.length, EXPECTED_COUNT, `${code} raw key count`);
  assert.equal(new Set(rawKeys).size, EXPECTED_COUNT, `${code} duplicate keys`);
  assert.deepEqual([...keys].sort(), [...referenceKeys].sort(), `${code} key parity`);

  for (const key of referenceKeys) {
    const value = translations[key];
    assert.equal(typeof value, "string", `${code}:${key} must be a string`);
    assert.ok(value.trim().length > 0, `${code}:${key} must not be empty`);
    assert.notEqual(value.trim(), "undefined", `${code}:${key} equals undefined`);
    assert.equal(value.includes("[missing:"), false, `${code}:${key} exposes missing marker`);
    assert.equal(value.includes("⟦"), false, `${code}:${key} exposes technical marker`);
    assert.deepEqual(
      placeholders(value),
      placeholders(reference[key]),
      `${code}:${key} placeholder parity`
    );
    const variables = Object.fromEntries(
      placeholders(value).map(token => [token.slice(1, -1), "X"])
    );
    const rendered = value.replace(/\{([A-Za-z0-9_.-]+)\}/g, (_, name) => variables[name]);
    assert.equal(PLACEHOLDER.test(rendered), false, `${code}:${key} unresolved interpolation`);
    PLACEHOLDER.lastIndex = 0;
  }

  const metadata = index.languages.find(language => language.code === code);
  const rules = new Intl.PluralRules(metadata.locale);
  assert.equal(rules.select(0), code === "fr" ? "one" : "other", `${code} plural for 0`);
  assert.equal(rules.select(1), "one", `${code} plural for 1`);
  assert.equal(rules.select(2), "other", `${code} plural for 2`);
  assert.equal(rules.select(5), "other", `${code} plural for 5`);
  assert.doesNotThrow(() => new Intl.NumberFormat(metadata.locale).format(1234.5));
  assert.doesNotThrow(() => new Intl.DateTimeFormat(metadata.locale).format(new Date(0)));

  for (const base of PLURAL_BASES) {
    const one = translations[`${base}.one`];
    const other = translations[`${base}.other`];
    assert.equal(typeof one, "string", `${code}:${base}.one missing`);
    assert.equal(typeof other, "string", `${code}:${base}.other missing`);
    assert.deepEqual(
      placeholders(one),
      placeholders(other),
      `${code}:${base} corresponding-form placeholders`
    );
  }

  for (const obsolete of [
    "common.palletPlural",
    "common.piecesShort",
    "print.oneRequested",
    "print.manyRequested",
    "print.oneLayer",
    "print.multiLayers",
    "rotation.alongTitle",
    "rotation.acrossTitle",
    "rotation.footnote",
    "rotation.diagramAria",
    "rotation.locked"
  ]) {
    assert.equal(Object.hasOwn(translations, obsolete), false, `${code}:${obsolete} obsolete`);
  }

  for (const required of [
    "rotation.forkShort",
    "rotation.forkLong",
    "rotation.entryMeasure",
    "rotation.diagramTitle",
    "rotation.diagramDescriptionShort",
    "rotation.diagramDescriptionLong",
    "rotation.lockedShort",
    "rotation.lockedLong"
  ]) {
    assert.equal(typeof translations[required], "string", `${code}:${required} missing`);
  }
}

const protectedTechnicalKeys = [
  "preset.eur.primary",
  "preset.industrial.primary",
  "preset.north-american.primary",
  "preset.asian.primary",
  "preset.australian.primary",
  "preset.half-euro.primary",
  "preset.42x42.primary",
  "preset.42x42.secondary",
  "preset.48x45.primary",
  "preset.48x45.secondary",
  "preset.48x48.primary",
  "preset.48x48.secondary",
  "vehicle.20dc.name",
  "vehicle.40dc.name",
  "vehicle.40hc.name",
  "vehicle.45hc.name",
  "vehicle.20rf.name",
  "vehicle.40rh.name",
  "vehicle.40hwpw.name",
  "vehicle.45hwpw.name",
  "vehicle.45rhpw.name"
];

for (const code of NEW_CODES) {
  const translated = catalogs[code].parsed.translations;
  const allowed = new Set([
    ...Object.keys(allowlist.shared),
    ...Object.keys(allowlist.locales[code] || {})
  ]);
  const equalToCanonical = referenceKeys.filter(
    key => translated[key] === reference[key] || translated[key] === italian[key]
  );
  const uncovered = equalToCanonical.filter(key => !allowed.has(key));
  const stale = [...allowed].filter(
    key => translated[key] !== reference[key] && translated[key] !== italian[key]
  );
  assert.deepEqual(uncovered, [], `${code} undocumented identical strings`);
  assert.deepEqual(stale, [], `${code} stale identical-string allowlist`);

  const copiedEnglish = referenceKeys.filter(key => translated[key] === reference[key]).length;
  const copiedItalian = referenceKeys.filter(key => translated[key] === italian[key]).length;
  const copiedEnglishLimit = code === "nl" ? 55 : 51;
  assert.ok(copiedEnglish < copiedEnglishLimit, `${code} appears copied from English`);
  assert.ok(copiedItalian < 50, `${code} appears copied from Italian`);

  for (const key of protectedTechnicalKeys) {
    assert.equal(translated[key], reference[key], `${code}:${key} technical value changed`);
  }
}

console.log(
  `Catalog QA PASS: ${CODES.length} catalogs × ${EXPECTED_COUNT} keys; ` +
  "structure, placeholders, allowlist, plurals, Intl and protected terms verified."
);
