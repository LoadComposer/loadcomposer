import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const VERSION = "1.3.0";
const PACKAGE_DIR_NAME = `loadcomposer-v${VERSION}-standalone`;
const HTML_NAME = `${PACKAGE_DIR_NAME}.html`;
const ZIP_NAME = `${PACKAGE_DIR_NAME}.zip`;
const DOWNLOADS = path.join(ROOT, "site", "downloads");
const HTML_PATH = path.join(DOWNLOADS, HTML_NAME);
const ZIP_PATH = path.join(DOWNLOADS, ZIP_NAME);
const PACKAGE_FILES = [
  HTML_NAME,
  "LICENSE",
  "LICENSE.it.md",
  "NOTICE",
  "README.txt"
];

const README = `LoadComposer v${VERSION} — Standalone package

Open ${HTML_NAME} directly in a modern browser. It works offline through
file://, requires no installation, and processes entered data locally in the
browser.

This release is distributed under the LoadComposer Community License 1.0.
Ordinary internal business use is permitted. Monetization, SaaS, monetized hosting,
white-label distribution, and the other reserved uses described in
the license require a separate commercial license.

Official repository: https://github.com/LoadComposer/loadcomposer
Official site: https://loadcomposer.com/
Commercial licensing: licensing@loadcomposer.com

The software is provided "AS IS", without warranty. Version 1.3.0 performs
indicative geometric planning only: it does not verify weight, balance, axle
loads, floor loads, securing, stability, safety, legal compliance, or actual
equipment tolerances. Always verify the real load and equipment operationally.

Read LICENSE, LICENSE.it.md, and NOTICE before use. The English LICENSE is the
controlling legal text; LICENSE.it.md is an informational translation.
`;

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTimestamp() {
  const time = 0;
  const date = ((2026 - 1980) << 9) | (7 << 5) | 30;
  return { time, date };
}

function makeZip(entries) {
  const localParts = [];
  const centralParts = [];
  const { time, date } = dosTimestamp();
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const data = entry.directory ? Buffer.alloc(0) : entry.data;
    const checksum = entry.directory ? 0 : crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE((3 << 8) | 20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(
      ((entry.directory ? 0o40755 : 0o100644) << 16) >>> 0,
      38
    );
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + data.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

if (!fs.existsSync(HTML_PATH)) {
  throw new Error(`Standalone HTML is missing: ${HTML_NAME}`);
}

const packageContents = new Map([
  [HTML_NAME, fs.readFileSync(HTML_PATH)],
  ["LICENSE", fs.readFileSync(path.join(ROOT, "LICENSE"))],
  ["LICENSE.it.md", fs.readFileSync(path.join(ROOT, "LICENSE.it.md"))],
  ["NOTICE", fs.readFileSync(path.join(ROOT, "NOTICE"))],
  ["README.txt", Buffer.from(README, "utf8")]
]);

const sums = PACKAGE_FILES
  .map(filename => `${sha256(packageContents.get(filename))}  ${filename}`)
  .join("\n") + "\n";
packageContents.set("SHA256SUMS.txt", Buffer.from(sums, "utf8"));

const entries = [
  { name: `${PACKAGE_DIR_NAME}/`, directory: true, data: Buffer.alloc(0) },
  ...[...packageContents.entries()].map(([filename, data]) => ({
    name: `${PACKAGE_DIR_NAME}/${filename}`,
    directory: false,
    data
  }))
];

fs.mkdirSync(DOWNLOADS, { recursive: true });
fs.writeFileSync(ZIP_PATH, makeZip(entries));
fs.writeFileSync(
  `${HTML_PATH}.sha256`,
  `${sha256(fs.readFileSync(HTML_PATH))}  ${HTML_NAME}\n`,
  "utf8"
);
fs.writeFileSync(
  `${ZIP_PATH}.sha256`,
  `${sha256(fs.readFileSync(ZIP_PATH))}  ${ZIP_NAME}\n`,
  "utf8"
);

console.log(
  `Standalone package PASS: ${PACKAGE_FILES.length}/5 payload hashes, ` +
  `6 files plus package root in ${ZIP_NAME}.`
);
