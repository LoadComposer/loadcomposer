import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const VERSION = fs.readFileSync(path.join(ROOT, "VERSION"), "utf8").trim();
const BUNDLE_NAME = `loadcomposer-v${VERSION}-test-bundle`;
const OUTPUT = path.resolve(process.env.LOADCOMPOSER_TEST_BUNDLE_ZIP || path.join(ROOT, `${BUNDLE_NAME}.zip`));
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
const FIXED_TIME = new Date("2026-09-28T00:00:00Z");

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function filesUnder(root) {
  const result = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) result.push(path.relative(root, absolute).split(path.sep).join("/"));
    }
  }
  walk(root);
  return result.sort();
}

function copy(relative, bundleRoot) {
  const source = path.join(ROOT, relative);
  if (!fs.existsSync(source)) throw new Error(`test-bundle input missing: ${relative}`);
  const destination = path.join(bundleRoot, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}

function normalizeTimes(target) {
  const stats = fs.lstatSync(target);
  if (stats.isDirectory()) {
    for (const name of fs.readdirSync(target)) normalizeTimes(path.join(target, name));
  }
  fs.utimesSync(target, FIXED_TIME, FIXED_TIME);
}

// Keep zip's zi* working files outside ROOT. A killed zip process must never
// leave a partial archive where delivery packaging can pick it up.
const staging = fs.mkdtempSync(path.join(path.dirname(ROOT), "loadcomposer-v150-test-bundle-"));
const bundleRoot = path.join(staging, BUNDLE_NAME);
const stagedOutput = path.join(staging, `${BUNDLE_NAME}.zip`);
fs.mkdirSync(bundleRoot);
try {
  for (const relative of [
    ".github", ".node-version", ".nvmrc", "VERSION", "package.json", "package-lock.json",
    `TEST_BUNDLE_README-v${VERSION}.md`, "README.md", "README.it.md", "CHANGELOG.md",
    "docs", "LICENSE", "LICENSE.it.md", "NOTICE",
    "TRADEMARKS.md", "COMMERCIAL-LICENSING.md", "PRIVACY.md", "SECURITY.md",
    "site", "scripts", "tests", `QA_PRUNING_INVENTORY-v${VERSION}.json`,
    "loadcomposer-v1.4.0-test-bundle.zip"
  ]) copy(relative, bundleRoot);

  for (const name of fs.readdirSync(ROOT).sort()) {
    if (name.endsWith(`-v${VERSION}.json`)) copy(name, bundleRoot);
    if (name.endsWith(`-v${VERSION}.log`)) copy(name, bundleRoot);
    if (name.endsWith(`-v${VERSION}`) && fs.statSync(path.join(ROOT, name)).isDirectory()) copy(name, bundleRoot);
  }

  const packagedFiles = filesUnder(bundleRoot);
  if (packagedFiles.some(name => name.split("/").some(part =>
    /^zi[A-Za-z0-9]{5,}$/.test(part) || ["__pycache__", ".cache", ".pytest_cache", ".mypy_cache"].includes(part) || /\.(?:tmp|part|pyc)$/.test(part)))) {
    throw new Error("unexpected temporary file in test bundle");
  }

  const sumsPath = path.join(bundleRoot, `SHA256SUMS-v${VERSION}.txt`);
  const sums = packagedFiles.map(relative => `${sha256(path.join(bundleRoot, relative))}  ${relative}`);
  fs.writeFileSync(sumsPath, `${sums.join("\n")}\n`, "utf8");
  normalizeTimes(bundleRoot);

  // Explicit per-entry metadata avoids directory mtime races and host TZ
  // differences. Directory entries are unnecessary; parents follow file paths.
  const zip = spawnSync("python3", ["-c", `
from pathlib import Path
import sys, zipfile
root = Path(sys.argv[1])
with zipfile.ZipFile(sys.argv[2], "w", compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for source in sorted(p for p in root.rglob("*") if p.is_file()):
        info = zipfile.ZipInfo(root.name + "/" + source.relative_to(root).as_posix(), (2026, 9, 28, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, source.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=6)
`, bundleRoot, stagedOutput], { cwd: staging, encoding: "utf8" });
  if (zip.status !== 0) throw new Error(`test bundle creation failed: ${zip.stderr}`);
  const integrity = spawnSync("unzip", ["-tqq", stagedOutput], { encoding: "utf8" });
  if (integrity.status !== 0) throw new Error(`test bundle CRC failed: ${integrity.stderr}`);
  const entries = spawnSync("unzip", ["-Z1", stagedOutput], { encoding: "utf8" });
  if (entries.status !== 0) throw new Error(`test bundle listing failed: ${entries.stderr}`);
  const listed = entries.stdout.trim().split(/\r?\n/).filter(Boolean);
  if (!listed.every(item => item === `${BUNDLE_NAME}/` || item.startsWith(`${BUNDLE_NAME}/`))) {
    throw new Error("invalid test bundle root");
  }
  fs.renameSync(stagedOutput, OUTPUT);
  console.log(`Test bundle PASS: ${filesUnder(bundleRoot).length} files, ${listed.length} ZIP entries, SHA-256 ${sha256(OUTPUT)}.`);
} finally {
  fs.rmSync(staging, { recursive: true, force: true });
}
