import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const BUNDLE_NAME = "loadcomposer-v1.3.2-test-bundle";
const OUTPUT = path.join(ROOT, `${BUNDLE_NAME}.zip`);

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
  if (!fs.existsSync(source)) throw new Error(`test-bundle input assente: ${relative}`);
  const destination = path.join(bundleRoot, relative);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true });
}

const staging = fs.mkdtempSync(path.join(os.tmpdir(), "loadcomposer-v132-test-bundle-"));
const bundleRoot = path.join(staging, BUNDLE_NAME);
fs.mkdirSync(bundleRoot);
try {
  for (const relative of [
    "VERSION",
    "package.json",
    "package-lock.json",
    "TEST_BUNDLE_README-v1.3.2.md",
    "site",
    "tests/browser-runtime.mjs",
    "tests/fixtures/baseline-v1.2.1"
  ]) copy(relative, bundleRoot);

  for (const name of fs.readdirSync(path.join(ROOT, "tests"))) {
    if (name.endsWith("-v1.3.2.mjs")) copy(path.join("tests", name), bundleRoot);
  }
  for (const name of fs.readdirSync(ROOT)) {
    if (name.endsWith("-v1.3.2.json")) copy(name, bundleRoot);
  }
  for (const directory of ["geometry-visual-evidence-v1.3.2", "status-visual-evidence-v1.3.2"]) {
    copy(directory, bundleRoot);
  }
  copy("scripts/create-test-bundle-v1.3.2.mjs", bundleRoot);

  const sums = filesUnder(bundleRoot).map(relative => (
    `${sha256(path.join(bundleRoot, relative))}  ${relative}`
  ));
  fs.writeFileSync(path.join(bundleRoot, "SHA256SUMS-v1.3.2.txt"), `${sums.join("\n")}\n`, "utf8");

  if (fs.existsSync(OUTPUT)) fs.unlinkSync(OUTPUT);
  const zip = spawnSync("zip", ["-X", "-q", "-r", OUTPUT, BUNDLE_NAME], {
    cwd: staging,
    encoding: "utf8"
  });
  if (zip.status !== 0) throw new Error(`creazione test bundle fallita: ${zip.stderr}`);
  const entries = spawnSync("unzip", ["-Z1", OUTPUT], { encoding: "utf8" });
  if (entries.status !== 0) throw new Error(`lettura test bundle fallita: ${entries.stderr}`);
  const listed = entries.stdout.trim().split(/\r?\n/).filter(Boolean);
  if (!listed.every(item => item === `${BUNDLE_NAME}/` || item.startsWith(`${BUNDLE_NAME}/`))) {
    throw new Error("radice test bundle non valida");
  }
  console.log(`Test bundle PASS: ${filesUnder(bundleRoot).length} files, ${listed.length} ZIP entries, SHA-256 ${sha256(OUTPUT)}.`);
} finally {
  fs.rmSync(staging, { recursive: true, force: true });
}
