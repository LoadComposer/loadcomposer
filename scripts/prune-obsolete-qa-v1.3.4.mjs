import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUTPUT = path.join(ROOT, "QA_PRUNING_INVENTORY-v1.3.4.json");
const APPLY = process.argv.includes("--apply");
const QUARANTINE = process.env.LOADCOMPOSER_QA_QUARANTINE
  ? path.resolve(process.env.LOADCOMPOSER_QA_QUARANTINE)
  : null;

const evidenceDirectory = /^(?:geometry-visual-evidence|legal-visual-evidence|status-visual-evidence)-v1\.3\.3$/;
const oldTestBundle = /^loadcomposer-v1\.3\.3-test-bundle\.zip$/;
const oldResult = /(?:^|-)results-v1\.3\.3\.json$/;
const supersededControls = new Set([
  "DELIVERY_MANIFEST-v1.3.3.txt",
  "SHA256SUMS-v1.3.3.txt",
  "TEST_BUNDLE_README-v1.3.3.md",
  "QA_PRUNING_INVENTORY-v1.3.3.json"
]);

function category(name, stats) {
  if (stats.isDirectory() && evidenceDirectory.test(name)) return "prior-release screenshots/PDF/raster evidence";
  if (stats.isFile() && oldTestBundle.test(name)) return "old test bundles";
  if (stats.isFile() && oldResult.test(name)) return "superseded QA results";
  if (stats.isFile() && supersededControls.has(name)) return "superseded current root release controls";
  return null;
}

function inventoryTree(target) {
  const stats = fs.lstatSync(target);
  if (!stats.isDirectory()) return { bytes: stats.size, files: 1 };
  let bytes = 0;
  let files = 0;
  for (const name of fs.readdirSync(target)) {
    const nested = inventoryTree(path.join(target, name));
    bytes += nested.bytes;
    files += nested.files;
  }
  return { bytes, files };
}

const entries = [];
for (const name of fs.readdirSync(ROOT).sort()) {
  const target = path.join(ROOT, name);
  const stats = fs.lstatSync(target);
  const selectedCategory = category(name, stats);
  if (!selectedCategory) continue;
  const measured = inventoryTree(target);
  entries.push({ path: name, category: selectedCategory, ...measured });
}

const categories = Object.values(entries.reduce((summary, entry) => {
  summary[entry.category] ??= { category: entry.category, paths: 0, files: 0, bytes: 0 };
  summary[entry.category].paths += 1;
  summary[entry.category].files += entry.files;
  summary[entry.category].bytes += entry.bytes;
  return summary;
}, {})).sort((a, b) => a.category.localeCompare(b.category));

const result = {
  version: "1.3.4",
  policy: "Historical QA evidence is not cumulative.",
  safeguards: {
    topLevelOnly: true,
    protectedTreesNeverSelected: ["site", "tests", "scripts", "docs", "legal"],
    canonicalLegalSourcesNeverSelected: true,
    publishedHistoricalDownloadsNeverSelected: true
  },
  removedPaths: entries.length,
  removedFiles: entries.reduce((total, entry) => total + entry.files, 0),
  removedBytes: entries.reduce((total, entry) => total + entry.bytes, 0),
  categories,
  entries
};

if (APPLY) {
  if (!QUARANTINE) throw new Error("LOADCOMPOSER_QA_QUARANTINE is required with --apply");
  if (QUARANTINE.startsWith(`${ROOT}${path.sep}`) || QUARANTINE === ROOT) {
    throw new Error("Quarantine must be outside the delivery root");
  }
  fs.mkdirSync(QUARANTINE, { recursive: true });
  for (const entry of entries) fs.renameSync(path.join(ROOT, entry.path), path.join(QUARANTINE, entry.path));
  fs.writeFileSync(OUTPUT, `${JSON.stringify(result, null, 2)}\n`);
}

console.log(`QA pruning ${APPLY ? "PASS" : "preview"}: ${result.removedPaths} top-level paths, ${result.removedFiles} files, ${result.removedBytes} bytes.`);
for (const item of categories) console.log(`- ${item.category}: ${item.paths} paths, ${item.files} files, ${item.bytes} bytes`);
