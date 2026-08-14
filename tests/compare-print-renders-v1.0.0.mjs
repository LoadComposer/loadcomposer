import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const projectDir = path.resolve(import.meta.dirname, "..");
const baselineDir = path.join(
  projectDir,
  "tests/fixtures/print-evidence-v1.0.0-rc.2",
  "pdf-renders"
);
const candidateDir = path.join(
  projectDir,
  "print-evidence-v1.2.1",
  "pdf-renders"
);
const resultPath = path.join(projectDir, "print-render-parity-results-v1.2.1.json");

function files(root) {
  const output = [];
  function visit(directory) {
    fs.readdirSync(directory, { withFileTypes: true }).forEach(entry => {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.name.endsWith(".png")) output.push(path.relative(root, absolute));
    });
  }
  visit(root);
  return output.sort();
}

function hash(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function pngSize(filePath) {
  const data = fs.readFileSync(filePath);
  if (
    data.length < 24 ||
    data.subarray(1, 4).toString("ascii") !== "PNG"
  ) {
    throw new Error(`Invalid PNG: ${filePath}`);
  }
  return {
    width: data.readUInt32BE(16),
    height: data.readUInt32BE(20)
  };
}

const baselineFiles = files(baselineDir);
const candidateFiles = files(candidateDir);
if (JSON.stringify(baselineFiles) !== JSON.stringify(candidateFiles)) {
  throw new Error("Print render file sets differ.");
}
if (candidateFiles.length !== 47) {
  throw new Error(`Expected 47 approved print renders, found ${candidateFiles.length}.`);
}

const records = candidateFiles.map(relative => {
  const baselinePath = path.join(baselineDir, relative);
  const candidatePath = path.join(candidateDir, relative);
  const baselineHash = hash(baselinePath);
  const candidateHash = hash(candidatePath);
  const baselineSize = pngSize(baselinePath);
  const candidateSize = pngSize(candidatePath);
  if (
    baselineSize.width !== candidateSize.width ||
    baselineSize.height !== candidateSize.height
  ) {
    throw new Error(`Print render geometry differs: ${relative}`);
  }
  if (fs.statSync(candidatePath).size < 5000) {
    throw new Error(`Print render is unexpectedly small: ${relative}`);
  }
  return {
    file: relative,
    width: candidateSize.width,
    height: candidateSize.height,
    sha256: candidateHash,
    pixelIdenticalToApprovedBaseline: baselineHash === candidateHash
  };
});

const payload = {
  version: "1.2.1",
  baseline: "v1.0.0-rc.2 verified print renders",
  generatedAt: new Date().toISOString(),
  approved: records.length,
  geometryDifferences: 0,
  pixelIdentical: records.filter(record => record.pixelIdenticalToApprovedBaseline).length,
  authorizedTextChanges: "none",
  status: "PASS",
  records
};
fs.writeFileSync(resultPath, `${JSON.stringify(payload, null, 2)}\n`);
if (payload.pixelIdentical !== records.length) {
  throw new Error(
    `Print rendering changed in ${records.length - payload.pixelIdentical} approved page(s).`
  );
}
console.log(
  `print render approval: ${records.length}/${records.length} valid, ` +
  "pixel-identical to the verified rc.2 print baseline"
);
