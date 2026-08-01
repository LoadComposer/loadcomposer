import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASELINE = path.join(ROOT, "tests", "fixtures", "baseline-v1.0.0-rc.2");
const CURRENT_APP = path.join(ROOT, "site", "index.html");
const CURRENT_STANDALONE = path.join(
  ROOT,
  "site",
  "downloads",
  "loadcomposer-v1.0.0-rc.3-standalone.html"
);
const CODES = ["it", "en", "de", "es", "fr", "pt", "nl"];

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function json(filePath) {
  return JSON.parse(read(filePath));
}

function normalizeCurrentVersion(source) {
  return source.replaceAll("1.0.0-rc.3", "1.0.0-rc.2");
}

const baselineModular = read(
  path.join(BASELINE, "loadcomposer-v1.0.0-rc.2.html")
);
const baselineStandalone = read(
  path.join(BASELINE, "loadcomposer-v1.0.0-rc.2-standalone.html")
);
const currentModular = read(CURRENT_APP);
const currentStandalone = read(CURRENT_STANDALONE);

assert.deepEqual(
  json(path.join(ROOT, "site", "lang", "index.json")),
  json(path.join(BASELINE, "lang", "index.json")),
  "Enabled-language index changed."
);

for (const code of CODES) {
  const oldCatalog = json(path.join(BASELINE, "lang", `${code}.json`));
  const catalog = json(path.join(ROOT, "site", "lang", `${code}.json`));
  assert.equal(catalog.meta.version, "1.0.0-rc.3", `${code}: wrong version.`);
  assert.equal(
    catalog.translations["meta.documentTitle"],
    "LoadComposer v1.0.0-rc.3",
    `${code}: wrong document title.`
  );
  const normalizedCatalog = structuredClone(catalog);
  normalizedCatalog.meta.version = "1.0.0-rc.2";
  normalizedCatalog.translations["meta.documentTitle"] = "LoadComposer v1.0.0-rc.2";
  assert.deepEqual(normalizedCatalog, oldCatalog, `${code}: changed outside version metadata.`);
}

assert.equal(
  normalizeCurrentVersion(currentModular),
  baselineModular,
  "Modular application changed outside release-version metadata."
);
assert.equal(
  normalizeCurrentVersion(currentStandalone),
  baselineStandalone,
  "Standalone application changed outside release-version metadata."
);

for (const requiredMetadata of [
  'rel="canonical" href="https://loadcomposer.com/"',
  'property="og:url" content="https://loadcomposer.com/"',
  'name="description"',
  'name="robots"',
  'name="theme-color"'
]) {
  assert(currentModular.includes(requiredMetadata), `Missing metadata: ${requiredMetadata}`);
}

console.log(
  "RC.3 scope audit PASS: after rc.3 -> rc.2 version normalization, modular HTML, " +
  "standalone HTML and all seven catalogs are byte/structure-identical to the canonical rc.2 fixture."
);
