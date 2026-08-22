import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.argv[2] || ".");
const MANIFEST_NAME = "DELIVERY_MANIFEST-v1.3.0.txt";
const SUMS_NAME = "SHA256SUMS-v1.3.0.txt";
const MANIFEST = path.join(ROOT, MANIFEST_NAME);
const SUMS = path.join(ROOT, SUMS_NAME);

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return [path.relative(ROOT, full).split(path.sep).join("/")];
  }).sort();
}

for (const control of [MANIFEST, SUMS]) {
  if (fs.existsSync(control)) fs.unlinkSync(control);
}

const payloads = walk(ROOT);
const manifestLines = [
  "LoadComposer v1.3.0 delivery manifest",
  "Candidate date: 2026-08-21",
  "Archive root: delivery-v1.3.0/",
  "Accepted input candidate: loadcomposer-v1.3.0-delivery.zip",
  "Accepted input SHA-256: 8c52957d674e31f2cb44f4861bcc0e9d83594200ea8700cda26276395dbacfd6",
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
fs.writeFileSync(
  SUMS,
  `${covered.map(relative => `${sha256(path.join(ROOT, relative))}  ${relative}`).join("\n")}\n`,
  "utf8"
);

console.log(
  `Delivery controls generated: ${payloads.length + 2} final files, ` +
  `${covered.length}/${covered.length} checksum-covered.`
);
