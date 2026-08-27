import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASELINE = process.env.LOADCOMPOSER_V132_ROOT
  ? path.resolve(process.env.LOADCOMPOSER_V132_ROOT)
  : null;
const OUTPUT = path.join(ROOT, "historical-evidence-audit-results-v1.3.3.json");
const PRUNING = path.join(ROOT, "QA_PRUNING_INVENTORY-v1.3.3.json");

if (!BASELINE || !fs.existsSync(BASELINE)) {
  throw new Error("Canonical v1.3.2 delivery root missing. Set LOADCOMPOSER_V132_ROOT for explicit release QA.");
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function walk(root, current = root) {
  const files = [];
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) files.push(...walk(root, absolute));
    else files.push(path.relative(root, absolute).split(path.sep).join("/"));
  }
  return files;
}

function isHistoricalVersioned(relative) {
  return /(?:^|[/_.-])v(?:1\.0\.0(?:-rc\.[34])?|1\.1\.0|1\.2\.[01]|1\.3\.[012])(?:[/_.-]|$)/.test(relative);
}

const pruning = JSON.parse(fs.readFileSync(PRUNING, "utf8"));
const prunedRoots = new Set(pruning.entries.map(entry => entry.path));
const retained = [];
const pruned = [];
const modified = [];

for (const relative of walk(BASELINE).filter(isHistoricalVersioned).sort()) {
  const topLevel = relative.split("/")[0];
  const expectedPruned = prunedRoots.has(topLevel);
  const candidate = path.join(ROOT, relative);
  if (!fs.existsSync(candidate)) {
    if (expectedPruned) pruned.push(relative);
    else modified.push({ path: relative, reason: "missing without pruning authorization" });
    continue;
  }
  const before = sha256(path.join(BASELINE, relative));
  const after = sha256(candidate);
  if (before !== after) modified.push({ path: relative, before, after });
  else retained.push({ path: relative, sha256: after });
}

assert.deepEqual(modified, [], "retained historical versioned files must remain byte-identical");
const baselineTopLevels = new Set(fs.readdirSync(BASELINE));
const prunedBuildResidue = pruning.entries
  .filter(entry => !baselineTopLevels.has(entry.path))
  .reduce((total, entry) => total + entry.files, 0);
assert.equal(pruned.length + prunedBuildResidue, pruning.removedFiles, "every pruned file must be admitted historical QA/control material or local build residue");

const published = retained.filter(entry => /^site\/downloads\/loadcomposer-v.+\.(?:html|zip|sha256)$/.test(entry.path));
assert.ok(published.some(entry => entry.path === "site/downloads/loadcomposer-v1.3.2-standalone.html"));
assert.ok(published.some(entry => entry.path === "site/downloads/loadcomposer-v1.3.2-standalone.zip"));

const result = {
  version: "1.3.3",
  baseline: BASELINE,
  retainedHistoricalFiles: retained.length,
  byteIdenticalRetained: retained.length,
  intentionallyPrunedFiles: pruning.removedFiles,
  prunedBaselineFiles: pruned.length,
  prunedBuildResidueFiles: prunedBuildResidue,
  modifiedHistoricalFiles: modified.length,
  publishedHistoricalArtifacts: published,
  pruning: {
    removedPaths: pruning.removedPaths,
    removedFiles: pruning.removedFiles,
    removedBytes: pruning.removedBytes,
    categories: pruning.categories
  },
  status: "PASS"
};
fs.writeFileSync(OUTPUT, `${JSON.stringify(result, null, 2)}\n`);
console.log(`Historical evidence v1.3.3 PASS: ${retained.length} retained historical files byte-identical, ${pruning.removedFiles} pruned QA/control files (${pruned.length} baseline + ${prunedBuildResidue} build residue), ${published.length} published artifacts preserved, 0 modified.`);
