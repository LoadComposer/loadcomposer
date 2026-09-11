import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const VERSION = fs.readFileSync(path.join(ROOT, "VERSION"), "utf8").trim();
const BUNDLE_NAME = `loadcomposer-v${VERSION}-test-bundle`;
const OUTPUT = path.join(ROOT, `${BUNDLE_NAME}.zip`);
const FIXED_TIME = new Date("2026-09-05T00:00:00Z");

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

const staging = fs.mkdtempSync(path.join(os.tmpdir(), "loadcomposer-v140-test-bundle-"));
const bundleRoot = path.join(staging, BUNDLE_NAME);
fs.mkdirSync(bundleRoot);
try {
  for (const relative of [
    ".github", ".node-version", ".nvmrc", "VERSION", "package.json", "package-lock.json",
    `TEST_BUNDLE_README-v${VERSION}.md`, "LICENSE", "LICENSE.it.md", "NOTICE",
    "TRADEMARKS.md", "COMMERCIAL-LICENSING.md", "PRIVACY.md", "SECURITY.md",
    "site", "scripts", "tests", `QA_PRUNING_INVENTORY-v${VERSION}.json`
  ]) copy(relative, bundleRoot);

  for (const name of fs.readdirSync(ROOT).sort()) {
    if (name.endsWith(`-v${VERSION}.json`)) copy(name, bundleRoot);
    if (name.endsWith(`-v${VERSION}`) && fs.statSync(path.join(ROOT, name)).isDirectory()) copy(name, bundleRoot);
  }

  const sumsPath = path.join(bundleRoot, `SHA256SUMS-v${VERSION}.txt`);
  const sums = filesUnder(bundleRoot).map(relative => `${sha256(path.join(bundleRoot, relative))}  ${relative}`);
  fs.writeFileSync(sumsPath, `${sums.join("\n")}\n`, "utf8");
  normalizeTimes(bundleRoot);

  if (fs.existsSync(OUTPUT)) fs.unlinkSync(OUTPUT);
  const zip = spawnSync("zip", ["-X", "-q", "-r", OUTPUT, BUNDLE_NAME], { cwd: staging, encoding: "utf8" });
  if (zip.status !== 0) throw new Error(`test bundle creation failed: ${zip.stderr}`);
  const entries = spawnSync("unzip", ["-Z1", OUTPUT], { encoding: "utf8" });
  if (entries.status !== 0) throw new Error(`test bundle listing failed: ${entries.stderr}`);
  const listed = entries.stdout.trim().split(/\r?\n/).filter(Boolean);
  if (!listed.every(item => item === `${BUNDLE_NAME}/` || item.startsWith(`${BUNDLE_NAME}/`))) {
    throw new Error("invalid test bundle root");
  }
  console.log(`Test bundle PASS: ${filesUnder(bundleRoot).length} files, ${listed.length} ZIP entries, SHA-256 ${sha256(OUTPUT)}.`);
} finally {
  fs.rmSync(staging, { recursive: true, force: true });
}
