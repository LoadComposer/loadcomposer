import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const VERSION = fs.readFileSync(path.join(ROOT, "VERSION"), "utf8").trim();
const LEGAL_FILES = [
  "LICENSE",
  "LICENSE.it.md",
  "NOTICE",
  "TRADEMARKS.md",
  "COMMERCIAL-LICENSING.md",
  "PRIVACY.md",
  "SECURITY.md"
];

function portablePath(value) {
  return String(value)
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/\/+$/, "")
    .normalize("NFC");
}

function foldedPath(value) {
  return portablePath(value).toLowerCase();
}

function addEntry(entries, pathname, type) {
  const normalized = portablePath(pathname);
  if (!normalized) return;
  entries.push({ path: normalized, type });
  let parent = path.posix.dirname(normalized);
  while (parent !== "." && parent !== "/") {
    entries.push({ path: parent, type: "directory" });
    parent = path.posix.dirname(parent);
  }
}

function collisions(entries) {
  const groups = new Map();
  for (const entry of entries) {
    const key = foldedPath(entry.path);
    const group = groups.get(key) || new Map();
    group.set(`${portablePath(entry.path)}\0${entry.type}`, {
      path: portablePath(entry.path),
      type: entry.type
    });
    groups.set(key, group);
  }
  return [...groups.entries()].flatMap(([key, group]) => {
    const values = [...group.values()].sort((a, b) =>
      a.path.localeCompare(b.path) || a.type.localeCompare(b.type)
    );
    const distinctPaths = new Set(values.map(value => value.path));
    const distinctTypes = new Set(values.map(value => value.type));
    return distinctPaths.size > 1 || distinctTypes.size > 1 ? [{ key, entries: values }] : [];
  });
}

function filesystemEntries(root) {
  const entries = [];
  function walk(directory, relative = "") {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      if (!relative && [".git", "node_modules"].includes(item.name)) continue;
      const childRelative = relative ? `${relative}/${item.name}` : item.name;
      const child = path.join(directory, item.name);
      if (item.isDirectory()) {
        addEntry(entries, childRelative, "directory");
        walk(child, childRelative);
      } else {
        addEntry(entries, childRelative, "file");
      }
    }
  }
  walk(root);
  return entries;
}

function archiveEntries(zipPath) {
  assert.ok(fs.existsSync(zipPath), `${zipPath}: archive missing`);
  const integrity = spawnSync("unzip", ["-tqq", zipPath], { encoding: "utf8" });
  assert.equal(integrity.status, 0, `${path.basename(zipPath)}: ZIP integrity failed`);
  const listing = spawnSync("unzip", ["-Z1", zipPath], { encoding: "utf8" });
  assert.equal(listing.status, 0, `${path.basename(zipPath)}: ZIP listing failed`);
  const entries = [];
  for (const raw of listing.stdout.split(/\r?\n/).filter(Boolean)) {
    addEntry(entries, raw, raw.endsWith("/") ? "directory" : "file");
  }
  return entries;
}

function audit(label, entries) {
  const found = collisions(entries);
  assert.equal(
    found.length,
    0,
    `${label}: case-insensitive path collisions:\n${found.map(group =>
      `${group.key}\n${group.entries.map(entry => `  ${entry.type}: ${entry.path}`).join("\n")}`
    ).join("\n")}`
  );
  return { label, collisions: found.length };
}

const detectorProof = collisions([
  { path: "site/legal/LICENSE", type: "file" },
  { path: "site/legal/license", type: "directory" }
]);
assert.equal(detectorProof.length, 1, "collision detector does not catch the admitted Windows defect");

for (const filename of LEGAL_FILES) {
  assert.equal(
    fs.existsSync(path.join(ROOT, "site", "legal", filename)),
    false,
    `site/legal/${filename}: legacy physical raw path must be absent`
  );
  assert.ok(
    fs.statSync(path.join(ROOT, "site", "legal", "raw", filename)).isFile(),
    `site/legal/raw/${filename}: relocated raw source missing`
  );
}
assert.ok(fs.statSync(path.join(ROOT, "site", "legal", "license")).isDirectory());

const audits = [
  audit("delivery root", filesystemEntries(ROOT)),
  audit(
    `loadcomposer-v${VERSION}-standalone.zip`,
    archiveEntries(path.join(ROOT, "site", "downloads", `loadcomposer-v${VERSION}-standalone.zip`))
  )
];

const testBundlePath = path.join(ROOT, `loadcomposer-v${VERSION}-test-bundle.zip`);
if (fs.existsSync(testBundlePath)) {
  audits.push(audit(
    `loadcomposer-v${VERSION}-test-bundle.zip`,
    archiveEntries(testBundlePath)
  ));
} else {
  assert.notEqual(
    process.env.LOADCOMPOSER_REQUIRE_RELEASE_ARCHIVES,
    "1",
    `${path.basename(testBundlePath)}: required release archive missing`
  );
}

if (process.env.LOADCOMPOSER_DELIVERY_ZIP) {
  audits.push(audit(
    path.basename(process.env.LOADCOMPOSER_DELIVERY_ZIP),
    archiveEntries(path.resolve(process.env.LOADCOMPOSER_DELIVERY_ZIP))
  ));
}

console.log(
  `Case-insensitive path audit v${VERSION} PASS: ` +
  `${audits.map(result => `${result.label}=0`).join(", ")}; case-insensitive path collisions: 0.`
);
