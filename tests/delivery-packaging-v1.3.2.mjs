import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(process.env.LOADCOMPOSER_DELIVERY_ROOT || path.join(import.meta.dirname, ".."));
const DELIVERY_ZIP = path.resolve(process.env.LOADCOMPOSER_DELIVERY_ZIP || "loadcomposer-v1.3.2-delivery.zip");
const OUTPUT = process.env.LOADCOMPOSER_PACKAGING_RESULT
  ? path.resolve(process.env.LOADCOMPOSER_PACKAGING_RESULT)
  : null;
const MANIFEST = "DELIVERY_MANIFEST-v1.3.2.txt";
const SUMS = "SHA256SUMS-v1.3.2.txt";

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
  const listed = spawnSync("unzip", ["-Z1", zip], { encoding: "utf8" });
  assert(listed.status === 0, `${path.basename(zip)}: elenco ZIP fallito`);
  const entries = listed.stdout.trim().split(/\r?\n/).filter(Boolean);
  assert(entries.every(item => item === `${rootName}/` || item.startsWith(`${rootName}/`)), `${path.basename(zip)}: radice non valida`);
  assert(!entries.some(item => item.includes("../") || item.startsWith("/")), `${path.basename(zip)}: percorso non sicuro`);
  return entries;
}

assert(fs.existsSync(path.join(ROOT, MANIFEST)), "manifest v1.3.2 assente");
assert(fs.existsSync(path.join(ROOT, SUMS)), "checksum v1.3.2 assente");
assert(fs.existsSync(DELIVERY_ZIP), "delivery ZIP v1.3.2 assente");
const files = filesUnder(ROOT);
const manifestRows = checksumRows(path.join(ROOT, MANIFEST), true);
const sumRows = checksumRows(path.join(ROOT, SUMS), false);
assert(manifestRows.length === files.length - 2, "manifest non N-2");
assert(sumRows.length === files.length - 1, "checksum non N-1");
assert(!manifestRows.some(row => row.path === MANIFEST || row.path === SUMS), "esclusioni manifest errate");
assert(!sumRows.some(row => row.path === SUMS), "checksum include se stesso");
for (const row of manifestRows) {
  const file = path.join(ROOT, row.path);
  assert(fs.existsSync(file), `${row.path}: assente`);
  assert(fs.statSync(file).size === row.bytes, `${row.path}: dimensione errata`);
  assert(sha256(file) === row.sha256, `${row.path}: hash manifest errato`);
}
for (const row of sumRows) {
  const file = path.join(ROOT, row.path);
  assert(fs.existsSync(file), `${row.path}: assente dai checksum`);
  assert(sha256(file) === row.sha256, `${row.path}: checksum errato`);
}

const archiveEntries = verifyZipRoot(DELIVERY_ZIP, "delivery-v1.3.2");
const archivedFiles = archiveEntries.filter(item => !item.endsWith("/"))
  .map(item => item.slice("delivery-v1.3.2/".length)).sort();
assert(JSON.stringify(archivedFiles) === JSON.stringify(files), "file set delivery ZIP/root differente");

const testBundle = path.join(ROOT, "loadcomposer-v1.3.2-test-bundle.zip");
const testEntries = verifyZipRoot(testBundle, "loadcomposer-v1.3.2-test-bundle");
const standaloneZip = path.join(ROOT, "site/downloads/loadcomposer-v1.3.2-standalone.zip");
const standaloneEntries = verifyZipRoot(standaloneZip, "loadcomposer-v1.3.2-standalone");

const report = {
  version: "1.3.2",
  status: "PASS",
  root: path.basename(ROOT),
  delivery: {
    file: path.basename(DELIVERY_ZIP),
    sha256: sha256(DELIVERY_ZIP),
    archiveEntries: archiveEntries.length,
    archivedFiles: archivedFiles.length
  },
  controls: {
    totalFiles: files.length,
    manifestEntries: manifestRows.length,
    checksumEntries: sumRows.length,
    manifestConvention: "N-2",
    checksumConvention: "N-1"
  },
  testBundle: { sha256: sha256(testBundle), entries: testEntries.length },
  standalone: { sha256: sha256(standaloneZip), entries: standaloneEntries.length }
};
if (OUTPUT) {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}
console.log(`Delivery packaging PASS: ${files.length} files, manifest ${manifestRows.length}, checksums ${sumRows.length}, ZIP ${archiveEntries.length} entries.`);
