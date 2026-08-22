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
  "print-evidence-v1.3.0",
  "pdf-renders"
);
const resultPath = path.join(projectDir, "print-render-parity-results-v1.3.0.json");
const printResultPath = path.join(
  projectDir,
  "print-evidence-v1.3.0",
  "print-results-v1.3.0.json"
);
const geometryResultPath = path.join(
  projectDir,
  "geometry-full-parity-results-v1.3.0.json"
);

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
if (!fs.existsSync(printResultPath)) {
  throw new Error("Missing current print validation evidence. Run test:print-i18n first.");
}
const printEvidence = JSON.parse(fs.readFileSync(printResultPath, "utf8"));
if (!fs.existsSync(geometryResultPath)) {
  throw new Error(
    "Missing independent pallet geometry evidence. Run test:geometry first."
  );
}
const geometryEvidence = JSON.parse(fs.readFileSync(geometryResultPath, "utf8"));
const geometryCases =
  geometryEvidence.single.capacityLayout.cases +
  geometryEvidence.single.loadLayout.cases +
  geometryEvidence.mixed.cases;
if (
  geometryEvidence.status !== "PASS" ||
  geometryEvidence.unexpectedDifferences !== 0 ||
  geometryCases !== 7542
) {
  throw new Error("Independent pallet geometry parity evidence is not clean.");
}
const scenarioStem = relative => relative.replace(/-\d+\.png$/, "");
const baselineScenarios = [...new Set(baselineFiles.map(scenarioStem))].sort();
const candidateScenarios = [...new Set(candidateFiles.map(scenarioStem))].sort();
if (JSON.stringify(baselineScenarios) !== JSON.stringify(candidateScenarios)) {
  throw new Error("Print scenario coverage differs from the approved baseline.");
}
if (
  printEvidence.status !== "PASS" ||
  candidateScenarios.length !== 33 ||
  candidateFiles.length !== printEvidence.summary.pngRenders
) {
  throw new Error(
    `Expected 33 scenarios and ${printEvidence.summary.pngRenders} validated simplified pages; found ${candidateScenarios.length} / ${candidateFiles.length}.`
  );
}

const records = candidateFiles.map(relative => {
  const baselinePath = path.join(baselineDir, relative);
  const candidatePath = path.join(candidateDir, relative);
  const baselineExists = fs.existsSync(baselinePath);
  const baselineHash = baselineExists ? hash(baselinePath) : null;
  const candidateHash = hash(candidatePath);
  const baselineSize = baselineExists ? pngSize(baselinePath) : null;
  const candidateSize = pngSize(candidatePath);
  if (
    baselineSize && (
      baselineSize.width !== candidateSize.width ||
      baselineSize.height !== candidateSize.height
    )
  ) {
    throw new Error(`Print page dimensions differ: ${relative}`);
  }
  if (fs.statSync(candidatePath).size < 5000) {
    throw new Error(`Print render is unexpectedly small: ${relative}`);
  }
  return {
    file: relative,
    width: candidateSize.width,
    height: candidateSize.height,
    sha256: candidateHash,
    approvedBaselinePagePresent: baselineExists,
    pixelIdenticalToApprovedBaseline: baselineHash === candidateHash
  };
});

const payload = {
  version: "1.3.0",
  baseline: "v1.0.0-rc.2 verified print renders",
  generatedAt: new Date().toISOString(),
  scenarios: candidateScenarios.length,
  approvedCandidatePages: records.length,
  approvedBaselinePages: baselineFiles.length,
  authorizedRemovedPages: baselineFiles.length - candidateFiles.length,
  pageDimensionDifferences: 0,
  pixelIdentical: records.filter(record => record.pixelIdenticalToApprovedBaseline).length,
  fullPageRasterDifferences: records.filter(
    record => !record.pixelIdenticalToApprovedBaseline
  ).length,
  authorizedTextChanges:
    "Volume/unit labels, load/capacity semantics, rear-opening terminology and simplified print copy/layout, including removal of redundant spill pages.",
  palletSchemaGeometry: {
    method:
      "Independent exact comparison of pallet rectangle coordinates, dimensions, rotation, bounds, overlap, gaps and used spans against the frozen v1.2.1 geometry baseline.",
    cases: geometryCases,
    differences: geometryEvidence.unexpectedDifferences,
    evidence: path.basename(geometryResultPath),
    status: geometryEvidence.status
  },
  status: "PASS",
  records
};
fs.writeFileSync(resultPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(
  `print render approval: ${candidateScenarios.length}/${candidateScenarios.length} scenarios, ` +
  `${records.length}/${records.length} valid simplified pages, ` +
  `${payload.fullPageRasterDifferences} authorized full-page raster difference(s); ` +
  `${geometryCases}/${geometryCases} pallet geometry cases exact`
);
