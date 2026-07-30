import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIRECTORIES = ["scripts", "tests"];

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith(".mjs") ? [full] : [];
  });
}

const files = DIRECTORIES.flatMap(name => walk(path.join(ROOT, name))).sort();
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${path.relative(ROOT, file)} failed node --check:\n${result.stderr}`);
  }
}

console.log(`Node syntax PASS: ${files.length}/${files.length} scripts and tests.`);
