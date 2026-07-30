import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const LEGAL_DIR = path.join(ROOT, "site", "legal");
const LEGAL_FILES = [
  "LICENSE",
  "LICENSE.it.md",
  "NOTICE",
  "TRADEMARKS.md",
  "COMMERCIAL-LICENSING.md",
  "PRIVACY.md",
  "SECURITY.md"
];

fs.mkdirSync(LEGAL_DIR, { recursive: true });

for (const filename of LEGAL_FILES) {
  const source = path.join(ROOT, filename);
  const destination = path.join(LEGAL_DIR, filename);
  if (!fs.existsSync(source)) {
    throw new Error(`Canonical legal document is missing: ${filename}`);
  }
  fs.copyFileSync(source, destination);
  if (!fs.readFileSync(source).equals(fs.readFileSync(destination))) {
    throw new Error(`Public legal copy differs from canonical ${filename}.`);
  }
}

console.log(
  `Public legal documents PASS: ${LEGAL_FILES.length}/${LEGAL_FILES.length} byte-identical copies.`
);
