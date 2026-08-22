import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(TEST_DIR, "..");
const BASELINE_DIR = path.join(PROJECT_DIR, "tests/fixtures/baseline-v1.0.0-rc.3", "lang");
const CURRENT_DIR = path.join(PROJECT_DIR, "site", "lang");
const ENABLED = ["it", "en", "de", "es", "fr", "pt", "nl"];
const DISABLED = ["pl", "tr", "zh-Hans", "ar"];
const STATUS_FINALIZATION_KEYS = new Set([
  "results.subtitle",
  "status.notOk",
  "status.partial"
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const protectedKeys = new Set();
for (const code of ENABLED) {
  const baseline = readJson(path.join(BASELINE_DIR, `${code}.json`)).translations;
  const current = readJson(path.join(CURRENT_DIR, `${code}.json`)).translations;
  const keys = Object.keys(baseline).filter(key => (
    (
      key.startsWith("status.") ||
      key === "results.subtitle" ||
      key === "preview.operationalPrintUnavailable"
    ) && !STATUS_FINALIZATION_KEYS.has(key)
  ));
  for (const key of keys) {
    protectedKeys.add(key);
    assert(
      current[key] === baseline[key],
      `Frozen status wording changed for ${code}/${key}.`
    );
  }
}

const index = readJson(path.join(CURRENT_DIR, "index.json"));
const enabledCodes = index.languages.filter(language => language.enabled).map(language => language.code);
const disabledCodes = index.languages.filter(language => !language.enabled).map(language => language.code);
assert(
  JSON.stringify(enabledCodes) === JSON.stringify(ENABLED),
  `Enabled language inventory changed: ${JSON.stringify(enabledCodes)}.`
);
assert(
  JSON.stringify(disabledCodes) === JSON.stringify(DISABLED),
  `Disabled language inventory changed: ${JSON.stringify(disabledCodes)}.`
);
for (const code of DISABLED) {
  assert(
    !fs.existsSync(path.join(CURRENT_DIR, `${code}.json`)),
    `Forbidden disabled-language catalog exists: lang/${code}.json.`
  );
}

console.log(JSON.stringify({
  status: "PASS",
  baseline: "v1.0.0-rc.3",
  enabledLanguages: ENABLED,
  disabledWithoutCatalogs: DISABLED,
  frozenStatusKeysPerLanguage: protectedKeys.size,
  frozenComparisons: protectedKeys.size * ENABLED.length
}, null, 2));
