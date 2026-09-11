import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.argv[2] || ".");
const VERSION = fs.readFileSync(path.join(ROOT, "VERSION"), "utf8").trim();
const MANIFEST_NAME = `DELIVERY_MANIFEST-v${VERSION}.txt`;
const SUMS_NAME = `SHA256SUMS-v${VERSION}.txt`;
const MANIFEST = path.join(ROOT, MANIFEST_NAME);
const SUMS = path.join(ROOT, SUMS_NAME);

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name === "node_modules") return [];
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return [path.relative(ROOT, full).split(path.sep).join("/")];
  }).sort();
}

for (const control of [MANIFEST, SUMS]) if (fs.existsSync(control)) fs.unlinkSync(control);

const payloads = walk(ROOT);
const manifestLines = [
  `LoadComposer v${VERSION} delivery manifest`,
  "Candidate date: 2026-09-09",
  `Archive root: delivery-v${VERSION}/`,
  "Accepted correction input: loadcomposer-v1.4.0-delivery.zip",
  "Accepted correction input SHA-256: 95c7b267089856551ad6426ed1c600eb499f4e943c38af2d55196665b08f43f9",
  "Approved regression baseline: LoadComposer v1.3.6 standalone",
  "Approved regression baseline SHA-256: 0a6d16890a9043c251e37f574e31167da3a0ce64a3af9d328ce44856653288e7",
  "License: LCCL-1.0 (LicenseRef-LoadComposer-Community-1.0)",
  "Copyright: Copyright © 2026 Marco Pernigotti",
  `Payload files before controls: ${payloads.length}`,
  `Final file count: ${payloads.length + 2}`,
  `Manifest entries: ${payloads.length} files`,
  `Manifest exclusions: ${MANIFEST_NAME}, ${SUMS_NAME}`,
  `Checksum-list coverage: ${payloads.length + 1} files`,
  `Checksum-list exclusion: ${SUMS_NAME}`,
  "",
  "SHA-256  BYTES  PATH",
  ...payloads.map(relative => {
    const full = path.join(ROOT, relative);
    return `${sha256(full)}  ${fs.statSync(full).size}  ${relative}`;
  }),
  ""
];
fs.writeFileSync(MANIFEST, manifestLines.join("\n"), "utf8");

const covered = walk(ROOT).filter(relative => relative !== SUMS_NAME);
fs.writeFileSync(SUMS, `${covered.map(relative => `${sha256(path.join(ROOT, relative))}  ${relative}`).join("\n")}\n`, "utf8");

console.log(`Delivery controls generated: ${payloads.length + 2} final files, ${payloads.length} manifest entries, ${covered.length} checksum entries.`);
