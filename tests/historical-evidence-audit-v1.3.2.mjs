import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASELINE = path.resolve(
  process.env.LOADCOMPOSER_V131_ROOT || path.join(ROOT, "..", "..", "input", "delivery-v1.3.1")
);
const OUTPUT = path.join(ROOT, "historical-evidence-audit-results-v1.3.2.json");
const SUPERSEDED = new Set([
  "DELIVERY_MANIFEST-v1.3.1.txt",
  "SHA256SUMS-v1.3.1.txt"
]);
const HISTORICAL_VERSION = /v1\.(?:[0-2](?:\.\d+)?|3\.[01])(?:\b|[-_.])/i;

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function filesUnder(root) {
  const files = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) files.push(path.relative(root, absolute).split(path.sep).join("/"));
    }
  }
  walk(root);
  return files.sort();
}

if (!fs.existsSync(BASELINE)) throw new Error(`baseline v1.3.1 non trovato: ${BASELINE}`);
const historical = filesUnder(BASELINE).filter(relative => HISTORICAL_VERSION.test(relative));
const retained = [];
const superseded = [];
const failures = [];
for (const relative of historical) {
  if (SUPERSEDED.has(relative)) {
    superseded.push(relative);
    if (fs.existsSync(path.join(ROOT, relative))) failures.push(`${relative}: controllo obsoleto ancora presente`);
    continue;
  }
  const baselineFile = path.join(BASELINE, relative);
  const currentFile = path.join(ROOT, relative);
  if (!fs.existsSync(currentFile)) {
    failures.push(`${relative}: file storico rimosso`);
    continue;
  }
  const expected = sha256(baselineFile);
  const actual = sha256(currentFile);
  if (expected !== actual) failures.push(`${relative}: hash modificato`);
  retained.push({ path: relative, sha256: actual, identical: expected === actual });
}
if (failures.length) throw new Error(`audit storico fallito:\n${failures.join("\n")}`);
const report = {
  version: "1.3.2",
  status: "PASS",
  canonicalBaseline: path.basename(BASELINE),
  historicalVersionedFiles: historical.length,
  retainedByteIdentical: retained.length,
  supersededCurrentReleaseControls: superseded,
  modifiedHistoricalFiles: 0,
  removedHistoricalEvidence: 0,
  failures,
  retained
};
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Historical evidence PASS: ${retained.length} retained files byte-identical; ${superseded.length} root controls superseded; zero historical rewrites.`);
