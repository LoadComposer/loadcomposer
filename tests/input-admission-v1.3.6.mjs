import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = path.resolve(import.meta.dirname, "..");
const ZIP = path.resolve(
  process.env.LOADCOMPOSER_V135_ZIP || path.join(ROOT, "..", "input", "loadcomposer-v1.3.5-delivery.zip")
);
const BASELINE = path.resolve(
  process.env.LOADCOMPOSER_V135_ROOT || path.join(ROOT, "..", "input", "delivery-v1.3.5")
);
const EXPECTED_ZIP_SHA256 = "658999470be397526632786c09d481938e19af0267e29ed10924c5c3b733be92";
const OUTPUT = path.join(ROOT, "input-admission-results-v1.3.6.json");
const EPSILON = 0.0001;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function filesUnder(root) {
  const files = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile()) files.push(path.relative(root, absolute).split(path.sep).join("/"));
    }
  }
  walk(root);
  return files.sort();
}

function canvasContextStub() {
  return new Proxy({}, {
    get(target, property) {
      if (!(property in target)) {
        target[property] = property === "measureText"
          ? text => ({ width: String(text).length * 7 })
          : () => {};
      }
      return target[property];
    }
  });
}

function frontTargets(layout, gap) {
  const ordered = layout.rects
    .map((rect, sourceIndex) => ({ rect, sourceIndex }))
    .sort((a, b) => a.rect.x - b.rect.x || a.rect.y - b.rect.y || a.sourceIndex - b.sourceIndex);
  const compacted = [];
  return ordered.map(entry => {
    let targetX = 0;
    for (const prior of compacted) {
      const separatedTransversely =
        prior.y + prior.width + gap <= entry.rect.y + EPSILON ||
        entry.rect.y + entry.rect.width + gap <= prior.y + EPSILON;
      if (!separatedTransversely) targetX = Math.max(targetX, prior.x + prior.length + gap);
    }
    compacted.push(entry.rect);
    return { actualX: entry.rect.x, targetX };
  });
}

async function reproduce() {
  const app = path.join(BASELINE, "site", "downloads", "loadcomposer-v1.3.5-standalone.html");
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", error => errors.push(error));
  const dom = new JSDOM(fs.readFileSync(app, "utf8"), {
    runScripts: "dangerously",
    url: "https://loadcomposer.admission.test/",
    virtualConsole,
    beforeParse(window) {
      window.localStorage.setItem("loadcomposer.language", "it");
      window.HTMLCanvasElement.prototype.getContext = () => canvasContextStub();
      window.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,";
    }
  });
  await dom.window.loadComposerI18n.ready;
  await new Promise(resolve => dom.window.setTimeout(resolve, 0));
  if (errors.length) throw errors[0];
  try {
    const { window } = dom;
    const group = window.document.getElementById("singlePalletGroup");
    window.selectPresetForGroup(group, "custom", false);
    group.querySelector('[data-field="length"]').value = "1200";
    group.querySelector('[data-field="width"]').value = "1000";
    group.querySelector('[data-field="height"]').value = "1500";
    group.querySelector('[data-field="quantity"]').value = "10";
    group.querySelector('[data-field="allowRotate"]').checked = true;
    window.document.getElementById("gap").value = "0";
    window.document.getElementById("stackable").checked = false;
    window.updateGroupVisuals(group);
    assert(window.calculate(), "canonical baseline calculation refused");
    const result = window.eval('lastResults.find(item => item.container.id === "20dc")');
    const orientations = result.loadLayout.rects.reduce((counts, rect) => {
      counts[rect.rotated ? "rotated" : "normal"] += 1;
      return counts;
    }, { normal: 0, rotated: 0 });
    const targets = frontTargets(result.loadLayout, 0);
    return {
      container: { id: result.container.id, length: result.container.innerLength, width: result.container.innerWidth },
      pallet: {
        quantity: result.input.quantity,
        length: result.input.pallet.length,
        width: result.input.pallet.width,
        height: result.input.pallet.height
      },
      rotationAllowed: result.input.pallet.rotationMode === "auto",
      gap: result.input.gap,
      capacity: result.totalCapacity,
      placed: result.placedCount,
      unplaced: result.unplacedCount,
      ok: result.ok,
      orientations,
      envelope: { usedLength: result.loadLayout.usedLength, usedWidth: result.loadLayout.usedWidth },
      frontCompacted: targets.every(item => Math.abs(item.actualX - item.targetX) <= EPSILON)
    };
  } finally {
    dom.window.close();
  }
}

assert(fs.existsSync(ZIP), `canonical v1.3.5 delivery ZIP missing: ${ZIP}`);
assert(fs.existsSync(BASELINE), `extracted v1.3.5 root missing: ${BASELINE}`);
const zipSha256 = sha256(ZIP);
assert(zipSha256 === EXPECTED_ZIP_SHA256, "v1.3.5 delivery ZIP SHA-256 mismatch");
const list = spawnSync("unzip", ["-Z1", ZIP], { encoding: "utf8" });
assert(list.status === 0, `ZIP listing failed: ${list.stderr}`);
const archiveEntries = list.stdout.trim().split(/\r?\n/).filter(Boolean);
assert(
  archiveEntries.every(entry => entry === "delivery-v1.3.5/" || entry.startsWith("delivery-v1.3.5/")),
  "unexpected ZIP root"
);
assert(!archiveEntries.some(entry => entry.includes("../") || entry.startsWith("/")), "unsafe ZIP path");

const files = filesUnder(BASELINE);
const manifestName = "DELIVERY_MANIFEST-v1.3.5.txt";
const sumsName = "SHA256SUMS-v1.3.5.txt";
const manifestRows = fs.readFileSync(path.join(BASELINE, manifestName), "utf8").split(/\r?\n/)
  .map(line => line.match(/^([0-9a-f]{64})  (\d+)  (.+)$/)).filter(Boolean)
  .map(match => ({ sha256: match[1], bytes: Number(match[2]), path: match[3] }));
const sumRows = fs.readFileSync(path.join(BASELINE, sumsName), "utf8").trim().split(/\r?\n/).map(line => {
  const match = line.match(/^([0-9a-f]{64})  (.+)$/);
  assert(match, `invalid checksum row: ${line}`);
  return { sha256: match[1], path: match[2] };
});
assert(manifestRows.length === files.length - 2, "manifest N-2 convention failed");
assert(sumRows.length === files.length - 1, "checksum N-1 convention failed");
assert(!manifestRows.some(row => row.path === manifestName || row.path === sumsName), "manifest exclusions failed");
assert(!sumRows.some(row => row.path === sumsName), "checksum self-exclusion failed");
for (const row of manifestRows) {
  const file = path.join(BASELINE, row.path);
  assert(fs.existsSync(file), `${row.path}: missing manifest payload`);
  assert(fs.statSync(file).size === row.bytes, `${row.path}: manifest byte-size mismatch`);
  assert(sha256(file) === row.sha256, `${row.path}: manifest hash mismatch`);
}
for (const row of sumRows) {
  const file = path.join(BASELINE, row.path);
  assert(fs.existsSync(file), `${row.path}: missing checksum payload`);
  assert(sha256(file) === row.sha256, `${row.path}: checksum mismatch`);
}

const canonical = await reproduce();
assert(canonical.container.id === "20dc" && canonical.container.length === 5896 && canonical.container.width === 2350);
assert(canonical.pallet.quantity === 10 && canonical.pallet.length === 1200 && canonical.pallet.width === 1000);
assert(canonical.rotationAllowed && canonical.gap === 0);
assert(canonical.capacity === 10 && canonical.placed === 10 && canonical.unplaced === 0 && canonical.ok === true);
assert(canonical.orientations.normal === 5 && canonical.orientations.rotated === 5);
assert(canonical.frontCompacted === true);

const report = {
  version: "1.3.6",
  status: "PASS",
  input: {
    file: path.basename(ZIP),
    expectedSha256: EXPECTED_ZIP_SHA256,
    actualSha256: zipSha256,
    archiveRoot: "delivery-v1.3.5/",
    archiveEntries: archiveEntries.length,
    extractedFiles: files.length
  },
  integrity: {
    manifest: { status: "PASS", entries: manifestRows.length },
    checksums: { status: "PASS", entries: sumRows.length },
    convention: { totalFiles: files.length, manifestEntries: files.length - 2, checksumEntries: files.length - 1 }
  },
  canonicalGeometry: canonical
};
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(
  `Release input admission PASS: v1.3.5 ZIP ${zipSha256}; ${manifestRows.length} manifest and ` +
  `${sumRows.length} checksum entries; canonical geometry ${canonical.placed}/10, 5 normal + 5 rotated, front-compacted.`
);
