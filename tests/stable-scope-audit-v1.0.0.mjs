import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASELINE = path.join(ROOT, "tests", "fixtures", "baseline-v1.0.0-rc.4");
const CURRENT_APP = path.join(ROOT, "site", "index.html");
const CURRENT_STANDALONE = path.join(
  ROOT,
  "site",
  "downloads",
  "loadcomposer-v1.0.0-standalone.html"
);
const CODES = ["it", "en", "de", "es", "fr", "pt", "nl"];
const EXPECTED_FIXTURE_HASHES = {
  "loadcomposer-v1.0.0-rc.4.html":
    "71a30676e2dd858f1ba3b5e78e24112068394397f39a5898b5b2c52b3776d599",
  "loadcomposer-v1.0.0-rc.4-standalone.html":
    "afd84b741059c47dcfc95bec9ccbfefadb6c33405e75fdbeb9b3684824163a96",
  "lang/de.json":
    "d3fd9dc0206c3641347853f94fa9813daf0ba8c93d87b3d004e6cdff0826038e",
  "lang/en.json":
    "a7c4aee87fa11a966c7e86c4ae4305008338f22f1afe7e1d6a1d345bce7ac6b0",
  "lang/es.json":
    "1a46ea4c829ba57196af9bbbc25fe7c0384497ecbf391cd7d5d8a0ed71d79e78",
  "lang/fr.json":
    "c59c7e8c59ce2a98130b08ce737281003181b744f57cf8818a8e9d0778792e16",
  "lang/index.json":
    "bbb457595ba12d38cb7853a3f5b67fff679a79655b3959cb24ee9443ce76198f",
  "lang/it.json":
    "0b03d83161e8d6392944850a057efe54ba4c237210d92d872a6bbfe32b5b514a",
  "lang/nl.json":
    "791ebfc80b6753e151fd539c25e16c67e996b6c93d66e9c02ee245880e3e860f",
  "lang/pt.json":
    "997427b7589bab5e0598638209ce9483efc2d43a6ba36c3777f4d20c17f5dc53"
};

const read = file => fs.readFileSync(file, "utf8");
const json = file => JSON.parse(read(file));
const sha256 = file => crypto.createHash("sha256")
  .update(fs.readFileSync(file))
  .digest("hex");

const fixtureFiles = Object.keys(EXPECTED_FIXTURE_HASHES).sort();
const actualFixtureFiles = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else actualFixtureFiles.push(path.relative(BASELINE, full).split(path.sep).join("/"));
  }
}
walk(BASELINE);
actualFixtureFiles.sort();
assert.deepEqual(actualFixtureFiles, fixtureFiles, "RC.4 fixture inventory changed.");
for (const [relative, expected] of Object.entries(EXPECTED_FIXTURE_HASHES)) {
  assert.equal(sha256(path.join(BASELINE, relative)), expected, `${relative}: RC.4 fixture hash.`);
}

assert.deepEqual(
  json(path.join(ROOT, "site", "lang", "index.json")),
  json(path.join(BASELINE, "lang", "index.json")),
  "Enabled-language index changed from canonical RC.4."
);

for (const code of CODES) {
  const baseline = json(path.join(BASELINE, "lang", `${code}.json`));
  const current = json(path.join(ROOT, "site", "lang", `${code}.json`));
  assert.equal(Object.keys(current.translations).length, 456, `${code}: stable key count.`);
  assert.deepEqual(
    Object.keys(current.translations),
    Object.keys(baseline.translations),
    `${code}: translation key order or inventory changed.`
  );
  assert.equal(current.meta.version, "1.0.0", `${code}: stable metadata version.`);
  assert.equal(
    current.translations["meta.documentTitle"],
    "LoadComposer v1.0.0",
    `${code}: stable document title.`
  );
  const normalized = structuredClone(current);
  normalized.meta.version = baseline.meta.version;
  normalized.translations["meta.documentTitle"] =
    baseline.translations["meta.documentTitle"];
  assert.deepEqual(
    normalized,
    baseline,
    `${code}: catalog changed outside version metadata.`
  );
}

const baselineModular = read(path.join(BASELINE, "loadcomposer-v1.0.0-rc.4.html"));
const currentModular = read(CURRENT_APP);
assert.equal(
  baselineModular.split("1.0.0-rc.4").length - 1,
  4,
  "Unexpected RC.4 version-marker count in modular fixture."
);
assert.equal(
  currentModular.split("1.0.0").length - 1,
  4,
  "Unexpected stable version-marker count in modular application."
);
assert.equal(
  currentModular.replaceAll("1.0.0", "1.0.0-rc.4"),
  baselineModular,
  "Modular application changed outside the release version and versioned OG path."
);

const baselineStandalone = read(
  path.join(BASELINE, "loadcomposer-v1.0.0-rc.4-standalone.html")
);
const currentStandalone = read(CURRENT_STANDALONE);
assert.equal(
  baselineStandalone.split("1.0.0-rc.4").length - 1,
  18,
  "Unexpected RC.4 version-marker count in standalone fixture."
);
assert.equal(
  currentStandalone.split("1.0.0").length - 1,
  18,
  "Unexpected stable version-marker count in standalone."
);
assert.equal(
  currentStandalone.replaceAll("1.0.0", "1.0.0-rc.4"),
  baselineStandalone,
  "Standalone changed outside version metadata and versioned artifact paths."
);

console.log(
  "Stable scope audit PASS: canonical RC.4 fixture 10/10 hashes, exact modular and " +
  "standalone equivalence after version-only normalization, seven unchanged 456-key " +
  "catalogs outside metadata, and no functional scope change."
);
