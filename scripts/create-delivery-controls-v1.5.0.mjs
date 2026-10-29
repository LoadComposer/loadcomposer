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
  "Candidate date: 2026-09-28",
  `Archive root: delivery-v${VERSION}/`,
  "Admitted implementation baseline: loadcomposer-v1.4.0-delivery.zip",
  "Accepted correction input SHA-256: 73c2d6eb94f4e61a81028d23afd37d57f340f6ac34be489a3a5b0d71e46d4ff3",
  "Protected regression baseline: LoadComposer v1.4.0 standalone",
  "Approved regression baseline SHA-256: fd0ccd86e2fed4e5cb9b37851870dfccdef82c811eec1a490c02160302d76647",
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
