import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const baseline = process.env.LOADCOMPOSER_V140_ROOT;
assert.ok(baseline && fs.existsSync(baseline), "Set LOADCOMPOSER_V140_ROOT to the explicitly supplied approved v1.4.0 delivery root.");
const before = path.resolve(baseline);
const hash = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
function walk(dir, prefix = "") {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === "node_modules") return [];
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? walk(path.join(dir, entry.name), relative) : [relative];
  });
}
const history = walk(before).filter(relative => /(?:^|[/_.-])v1\.(?:[0-3]\.\d+|4\.0)(?:[/_.-]|$)/.test(relative));
const missing = [], changed = [];
for (const relative of history) {
  const afterPath = path.join(root, relative);
  if (!fs.existsSync(afterPath)) missing.push(relative);
  else if (hash(path.join(before, relative)) !== hash(afterPath)) changed.push(relative);
}
assert.deepEqual(changed, [], "retained historical files were modified");
const published = history.filter(relative => /^site\/downloads\/loadcomposer-v.+\.(html|zip|sha256)$/.test(relative));
assert.ok(published.includes("site/downloads/loadcomposer-v1.4.0-standalone.html"));
assert.ok(published.includes("site/downloads/loadcomposer-v1.4.0-standalone.zip"));
assert.ok(published.every(relative => !missing.includes(relative)), "published standalone history missing");
const result = { version: "1.5.0", baseline: before, retained: history.length - missing.length,
  removedQa: missing.length, missing, changed: changed.length, published: published.length, status: "PASS" };
fs.writeFileSync(path.join(root, "historical-evidence-audit-results-v1.5.0.json"), JSON.stringify(result, null, 2) + "\n");
console.log(`Historical v1.5.0 PASS: ${result.retained} retained files byte-identical, ${published.length} published artifacts, ${changed.length} modified.`);
