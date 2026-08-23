import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASELINE = path.join(ROOT, "tests/fixtures/baseline-v1.2.1/loadcomposer-v1.2.1-standalone.html");
const CURRENT = path.join(ROOT, "site/downloads/loadcomposer-v1.3.1-standalone.html");
const CODES = ["it", "en", "de", "es", "fr", "pt", "nl"];
const LEGAL_HASHES = {
  "LICENSE": "07c8360fa6840b24641b2e9443c82d8001ad8c4d32bc58f43fb04f64a1d080d0",
  "LICENSE.it.md": "8b47a93a962da349910972a6125ec7ce1997b07fb951e2c316b10c187c875266",
  "NOTICE": "0b1322e4517d715f95e44d63d576b663b2b9c65e8e97caed2fc6e7cae86e266f",
  "TRADEMARKS.md": "5c69098cb03d6033200b42edb4eefb1b9a0a0542e91f05a57ec58c61f5337490",
  "COMMERCIAL-LICENSING.md": "59444c07f5f7286d1e032211b7e933aa9ab357e6d0a66e7c1022e673c3a6e3c4",
  "PRIVACY.md": "13ba9454ebab8c3bbaf195e978c3b2e7a4cf0f69bc0d732bd622e35d811f5e28",
  "SECURITY.md": "41f27656c06f55d1ad059f9ec7738bb2ee884270ccae86b0f4d6316a93efe076"
};

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

function sha(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function literal(source, constant) {
  const marker = `const ${constant} = [`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `${constant} missing.`);
  const open = source.indexOf("[", start);
  const close = source.indexOf("\n    ];", open);
  assert.notEqual(close, -1, `${constant} terminator missing.`);
  return Function(`"use strict"; return (${source.slice(open, close + 6)});`)();
}

function withoutAllowedContainerMetadata(containers) {
  return containers.map(({ accessAutoOkHeight, ...container }) => container);
}

function withoutAllowedPresetMetadata(presets) {
  return presets.map(({ nativeUnit, nativeLength, nativeWidth, ...preset }) => {
    if (["42x42", "48x45", "48x48"].includes(preset.id)) {
      const { name, ...frozen } = preset;
      return frozen;
    }
    return preset;
  });
}

assert.ok(fs.existsSync(BASELINE), "Canonical v1.2.1 fixture missing.");
assert.ok(fs.existsSync(CURRENT), "v1.3.1 standalone missing.");
const baselineSource = fs.readFileSync(BASELINE, "utf8");
const currentSource = fs.readFileSync(CURRENT, "utf8");

const currentContainers = literal(currentSource, "CONTAINERS");
const baselineContainers = literal(baselineSource, "CONTAINERS");
assert.deepEqual(withoutAllowedContainerMetadata(currentContainers), baselineContainers, "Vehicle definitions changed outside allowed access metadata.");
assert.deepEqual(
  Object.fromEntries(currentContainers.filter(container => Number.isFinite(container.accessAutoOkHeight)).map(container => [container.id, container.accessAutoOkHeight])),
  { "truck-curtain-1360": 2500, "truck-mega-1360": 2550, "truck-reefer-1360": 2500 },
  "Prudential access thresholds changed or leaked to another profile."
);
const currentPresets = literal(currentSource, "PALLET_PRESETS");
const baselinePresets = literal(baselineSource, "PALLET_PRESETS");
assert.deepEqual(
  withoutAllowedPresetMetadata(currentPresets),
  withoutAllowedPresetMetadata(baselinePresets),
  "Pallet presets or canonical labels changed outside allowed native-unit/three-name metadata."
);
assert.deepEqual(
  Object.fromEntries(currentPresets
    .filter(preset => ["42x42", "48x45", "48x48"].includes(preset.id))
    .map(preset => [preset.id, preset.name])),
  {
    "42x42": "Pallet telecom / vernici",
    "48x45": "Pallet automotive",
    "48x48": "Pallet per fusti"
  },
  "Approved Italian preset descriptions changed."
);
assert.deepEqual(
  Object.fromEntries(currentPresets.map(preset => [preset.id, preset.nativeUnit ?? null])),
  { eur: "mm", industrial: "mm", "north-american": "in", asian: "mm", australian: "mm", "half-euro": "mm", "42x42": "in", "48x45": "in", "48x48": "in", custom: null },
  "Preset native-unit census changed."
);

for (const [file, expected] of Object.entries(LEGAL_HASHES)) {
  assert.equal(sha(path.join(ROOT, file)), expected, `${file} changed from v1.2.1.`);
  assert.equal(sha(path.join(ROOT, "site/legal", file)), expected, `site/legal/${file} is not byte-identical.`);
}

for (const page of ["site/downloads/index.html", "site/legal/index.html", "site/404.html"]) {
  const source = read(page);
  assert.doesNotMatch(source, /name=["']linearUnit["']/, `${page}: unit selector must remain Main-only.`);
  assert.equal(source.includes("loadcomposer.unit"), false, `${page}: unit runtime leaked into secondary page.`);
}

const main = read("site/index.html");
assert.equal((main.match(/<input type="radio" name="linearUnit"/g) || []).length, 3, "Main must expose exactly mm/cm/in radios.");
for (const unit of ["mm", "cm", "in"]) {
  assert.ok(main.includes(`name="linearUnit" value="${unit}"`), `${unit} radio missing.`);
}
assert.ok(main.includes('const UNIT_STORAGE_KEY = "loadcomposer.unit";'));
assert.ok(main.includes("Math.round(millimetres)"), "Single canonical mm rounding point missing.");
assert.ok(main.includes("data-mm="), "Canonical mm input state missing.");

for (const code of CODES) {
  const catalog = JSON.parse(read(`site/lang/${code}.json`));
  assert.equal(catalog.meta.version, "1.3.1", `${code}: metadata version.`);
  assert.equal(Object.keys(catalog.translations).length, 530, `${code}: translation count.`);
  for (const key of [
    "units.label", "units.mmAria", "units.cmAria", "units.inAria",
    "validation.lengthIncomplete", "validation.lengthInteger",
    "validation.lengthFormat", "units.lengthValue"
  ]) {
    assert.equal(typeof catalog.translations[key], "string", `${code}: ${key} missing.`);
  }
}

const headers = read("site/_headers");
for (const version of ["1.0.0", "1.1.0", "1.2.0", "1.2.1", "1.3.0", "1.3.1"]) {
  for (const suffix of ["", ".html", ".html.sha256", ".zip", ".zip.sha256"]) {
    const artifact = `/downloads/loadcomposer-v${version}-standalone${suffix}`;
    const block = `${artifact}\n  Cache-Control: public, max-age=31536000, immutable`;
    assert.ok(headers.includes(block), `Immutable cache rule missing: ${artifact}`);
  }
}
assert.match(headers, /\/downloads\/\n\s+Cache-Control: public, max-age=0, must-revalidate/);
assert.match(headers, /\/downloads\/index\.html\n\s+Cache-Control: public, max-age=0, must-revalidate/);

for (const file of [
  "site/downloads/loadcomposer-v1.3.1-standalone.html",
  "site/downloads/loadcomposer-v1.3.1-standalone.html.sha256",
  "site/downloads/loadcomposer-v1.3.1-standalone.zip",
  "site/downloads/loadcomposer-v1.3.1-standalone.zip.sha256",
  "site/assets/loadcomposer-og-v1.3.1.png",
  "CHANGELOG-v1.3.1.md"
]) {
  assert.ok(fs.existsSync(path.join(ROOT, file)), `${file} missing.`);
}

console.log("v1.3.1 scope audit PASS: frozen semantics plus allowed presentation/access metadata, 14 legal copies exact, Main-only unit control, 7 × 530 catalogs.");
