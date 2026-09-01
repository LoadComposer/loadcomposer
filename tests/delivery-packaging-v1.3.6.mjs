import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(process.env.LOADCOMPOSER_DELIVERY_ROOT || path.join(import.meta.dirname, ".."));
const VERSION = fs.readFileSync(path.join(ROOT, "VERSION"), "utf8").trim();
const DELIVERY_ZIP = path.resolve(process.env.LOADCOMPOSER_DELIVERY_ZIP || `loadcomposer-v${VERSION}-delivery.zip`);
const OUTPUT = process.env.LOADCOMPOSER_PACKAGING_RESULT ? path.resolve(process.env.LOADCOMPOSER_PACKAGING_RESULT) : null;
const MANIFEST = `DELIVERY_MANIFEST-v${VERSION}.txt`;
const SUMS = `SHA256SUMS-v${VERSION}.txt`;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

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

function checksumRows(file, withSize) {
  return fs.readFileSync(file, "utf8").split(/\r?\n/).map(line => (
    line.match(withSize ? /^([0-9a-f]{64})  (\d+)  (.+)$/ : /^([0-9a-f]{64})  (.+)$/)
  )).filter(Boolean).map(match => withSize
    ? { sha256: match[1], bytes: Number(match[2]), path: match[3] }
    : { sha256: match[1], path: match[2] }
  );
}

function verifyZipRoot(zip, rootName) {
  const tested = spawnSync("unzip", ["-tqq", zip], { encoding: "utf8" });
  assert(tested.status === 0, `${path.basename(zip)}: ZIP integrity failed`);
  const listed = spawnSync("unzip", ["-Z1", zip], { encoding: "utf8" });
  assert(listed.status === 0, `${path.basename(zip)}: ZIP listing failed`);
  const entries = listed.stdout.trim().split(/\r?\n/).filter(Boolean);
  assert(entries.every(item => item === `${rootName}/` || item.startsWith(`${rootName}/`)), `${path.basename(zip)}: invalid root`);
  assert(!entries.some(item => item.includes("../") || item.startsWith("/")), `${path.basename(zip)}: unsafe path`);
  return entries;
}

assert(fs.existsSync(path.join(ROOT, MANIFEST)), "delivery manifest missing");
assert(fs.existsSync(path.join(ROOT, SUMS)), "delivery checksum list missing");
assert(fs.existsSync(DELIVERY_ZIP), "delivery ZIP missing");
const files = filesUnder(ROOT);
const manifestRows = checksumRows(path.join(ROOT, MANIFEST), true);
const sumRows = checksumRows(path.join(ROOT, SUMS), false);
assert(manifestRows.length === files.length - 2, "manifest is not N-2");
assert(sumRows.length === files.length - 1, "checksums are not N-1");
assert(!manifestRows.some(row => row.path === MANIFEST || row.path === SUMS), "manifest exclusions invalid");
assert(!sumRows.some(row => row.path === SUMS), "checksum list includes itself");
for (const row of manifestRows) {
  const file = path.join(ROOT, row.path);
  assert(fs.existsSync(file), `${row.path}: missing`);
  assert(fs.statSync(file).size === row.bytes, `${row.path}: wrong size`);
  assert(sha256(file) === row.sha256, `${row.path}: wrong manifest hash`);
}
for (const row of sumRows) {
  const file = path.join(ROOT, row.path);
  assert(fs.existsSync(file), `${row.path}: missing from checksum coverage`);
  assert(sha256(file) === row.sha256, `${row.path}: wrong checksum`);
}

const archiveEntries = verifyZipRoot(DELIVERY_ZIP, `delivery-v${VERSION}`);
const archivedFiles = archiveEntries.filter(item => !item.endsWith("/"))
  .map(item => item.slice(`delivery-v${VERSION}/`.length)).sort();
assert(JSON.stringify(archivedFiles) === JSON.stringify(files), "delivery ZIP and root file sets differ");
assert(!archivedFiles.some(item => item === "node_modules" || item.startsWith("node_modules/")), "node_modules packaged");
assert(!archivedFiles.some(item => /loadcomposer-v1\.3\.[012345]-test-bundle\.zip$/.test(item)), "old test bundle packaged");
for (const route of ["license", "notices", "trademarks", "commercial", "privacy", "security"]) {
  assert(archivedFiles.includes(`site/legal/${route}/index.html`), `${route}: styled legal route missing`);
}

const testBundle = path.join(ROOT, `loadcomposer-v${VERSION}-test-bundle.zip`);
const testEntries = verifyZipRoot(testBundle, `loadcomposer-v${VERSION}-test-bundle`);
const standaloneZip = path.join(ROOT, `site/downloads/loadcomposer-v${VERSION}-standalone.zip`);
const standaloneEntries = verifyZipRoot(standaloneZip, `loadcomposer-v${VERSION}-standalone`);

const report = {
  version: VERSION,
  status: "PASS",
  root: path.basename(ROOT),
  delivery: { file: path.basename(DELIVERY_ZIP), sha256: sha256(DELIVERY_ZIP), archiveEntries: archiveEntries.length, archivedFiles: archivedFiles.length },
  controls: { totalFiles: files.length, manifestEntries: manifestRows.length, checksumEntries: sumRows.length, manifestConvention: "N-2", checksumConvention: "N-1" },
  testBundle: { sha256: sha256(testBundle), entries: testEntries.length },
  standalone: { sha256: sha256(standaloneZip), entries: standaloneEntries.length }
};
if (OUTPUT) {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}
console.log(`Delivery packaging PASS: ${files.length} files, manifest ${manifestRows.length}, checksums ${sumRows.length}, ZIP ${archiveEntries.length} entries.`);
