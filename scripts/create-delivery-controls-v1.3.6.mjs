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
  "Candidate date: 2026-09-02",
  `Archive root: delivery-v${VERSION}/`,
  "Accepted correction input: loadcomposer-v1.3.6-delivery.zip",
  "Accepted correction input SHA-256: 1d15e0ca2dd822d24973be8f4a3e67e38e9a85370c99dfb6b1a7147630eb6a3e",
  "Approved regression baseline: loadcomposer-v1.3.5-delivery.zip",
  "Approved regression baseline SHA-256: 658999470be397526632786c09d481938e19af0267e29ed10924c5c3b733be92",
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
