import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const scripts = packageJson.scripts;
const normal = scripts.test;
const release = scripts["test:release"];

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

assert.equal(
  scripts["test:hardening"],
  "node tests/hardening-audit-v1.3.4.mjs",
  "test:hardening must execute the current v1.3.4 audit"
);
assert.equal(
  scripts["test:release-input-admission"],
  "node tests/input-admission-v1.3.4.mjs",
  "release input admission command is missing"
);
assert.equal(
  scripts["test:release-historical"],
  "node tests/historical-evidence-audit-v1.3.4.mjs",
  "release historical audit command is missing"
);

for (const command of [
  "test:input-admission",
  "test:release-input-admission",
  "test:historical",
  "test:release-historical"
]) {
  assert.equal(normal.includes(`npm run ${command}`), false, `normal CI invokes external QA: ${command}`);
}

for (const command of [
  "build",
  "check:glossary",
  "check:i18n-js",
  "check:node",
  "test:version",
  "test:ci-wiring",
  "test:dark-reader",
  "test:legal-ux",
  "test:path-portability",
  "test:geometry-hotfix",
  "test:front-compaction",
  "test:geometry-oracle",
  "test:geometry",
  "test:geometry-performance",
  "test:mixed",
  "test:trailer-prudential",
  "test:status-system",
  "test:units",
  "test:final-consistency",
  "test:print-transport",
  "test:parity",
  "test:geometry-visual"
]) {
  assert.ok(normal.includes(`npm run ${command}`), `normal CI coverage missing: ${command}`);
}

for (const command of [
  "test:release-input-admission",
  "test:release-historical",
  "test:delivery"
]) {
  assert.ok(release.includes(`npm run ${command}`), `release QA coverage missing: ${command}`);
}

const currentHardening = fs.readFileSync(
  path.join(ROOT, "tests", "hardening-audit-v1.3.4.mjs"),
  "utf8"
);
assert.ok(currentHardening.includes('path.join(ROOT, "VERSION")'));
assert.equal(/const VERSION\s*=\s*["']1\.3\.3["']/.test(currentHardening), false);
assert.equal(
  sha256(path.join(ROOT, "tests", "hardening-audit-v1.0.0.mjs")),
  "61577f33480bff16b45ace6de3adc8284f51b2a71e02456eba3590e514fae3ec",
  "historical hardening audit changed"
);

const ci = fs.readFileSync(path.join(ROOT, ".github", "workflows", "ci.yml"), "utf8");
const integrity = fs.readFileSync(
  path.join(ROOT, ".github", "workflows", "package-integrity.yml"),
  "utf8"
);
assert.ok(ci.includes("npm ci"));
assert.ok(ci.includes("npm test"));
assert.equal(ci.includes("test:release-input-admission"), false);
assert.ok(integrity.includes("npm run build"));
assert.ok(integrity.includes("npm run test:dark-reader"));
assert.ok(integrity.includes("npm run test:hardening"));
assert.ok(integrity.includes("npm run test:path-portability"));
assert.ok(integrity.includes("npm run test:workflow-policy"));
assert.equal(integrity.includes("test:release-input-admission"), false);

console.log(
  "CI wiring v1.3.4 PASS: normal CI is self-contained; current hardening and explicit release-only admission/history commands are active."
);
