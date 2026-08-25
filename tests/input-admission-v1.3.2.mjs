import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = path.resolve(import.meta.dirname, "..");
const ZIP = path.resolve(process.env.LOADCOMPOSER_V131_ZIP || path.join(ROOT, "..", "..", "..", "upload", "loadcomposer-v1.3.1-delivery(1).zip"));
const BASELINE = path.resolve(process.env.LOADCOMPOSER_V131_ROOT || path.join(ROOT, "..", "..", "input", "delivery-v1.3.1"));
const EXPECTED_ZIP_SHA256 = "095bedc1c39b8a10969aad594f11cdb07a34cb8294822ef303b16ed91da52709";
const OUTPUT = path.join(ROOT, "input-admission-results-v1.3.2.json");

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

async function reproduce() {
  const app = path.join(BASELINE, "site/downloads/loadcomposer-v1.3.1-standalone.html");
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
    assert(window.calculate(), "calcolo baseline rifiutato");
    const result = window.eval('lastResults.find(item => item.container.id === "20dc")');
    const orientations = result.loadLayout.rects.reduce((counts, rect) => {
      counts[rect.rotated ? "rotated" : "normal"] += 1;
      return counts;
    }, { normal: 0, rotated: 0 });
    return {
      container: { id: result.container.id, length: result.container.innerLength, width: result.container.innerWidth },
      pallet: { quantity: result.input.quantity, length: result.input.pallet.length, width: result.input.pallet.width, height: result.input.pallet.height },
      rotationAllowed: result.input.pallet.rotationMode === "auto",
      gap: result.input.gap,
      capacity: result.totalCapacity,
      placed: result.placedCount,
      unplaced: result.unplacedCount,
      ok: result.ok,
      orientations
    };
  } finally {
    dom.window.close();
  }
}

assert(fs.existsSync(ZIP), "ZIP canonico v1.3.1 assente");
assert(fs.existsSync(BASELINE), "radice estratta v1.3.1 assente");
const zipSha256 = sha256(ZIP);
assert(zipSha256 === EXPECTED_ZIP_SHA256, "SHA-256 ZIP v1.3.1 non corrispondente");
const list = spawnSync("unzip", ["-Z1", ZIP], { encoding: "utf8" });
assert(list.status === 0, `elenco ZIP fallito: ${list.stderr}`);
const archiveEntries = list.stdout.trim().split(/\r?\n/).filter(Boolean);
assert(archiveEntries.every(entry => entry === "delivery-v1.3.1/" || entry.startsWith("delivery-v1.3.1/")), "radice ZIP inattesa");
assert(!archiveEntries.some(entry => entry.includes("../") || entry.startsWith("/")), "percorso ZIP non sicuro");

const files = filesUnder(BASELINE);
const manifestFile = path.join(BASELINE, "DELIVERY_MANIFEST-v1.3.1.txt");
const sumsFile = path.join(BASELINE, "SHA256SUMS-v1.3.1.txt");
const manifestRows = fs.readFileSync(manifestFile, "utf8").split(/\r?\n/)
  .map(line => line.match(/^([0-9a-f]{64})  (\d+)  (.+)$/)).filter(Boolean)
  .map(match => ({ sha256: match[1], bytes: Number(match[2]), path: match[3] }));
const sumRows = fs.readFileSync(sumsFile, "utf8").trim().split(/\r?\n/).map(line => {
  const match = line.match(/^([0-9a-f]{64})  (.+)$/);
  assert(match, `riga checksum invalida: ${line}`);
  return { sha256: match[1], path: match[2] };
});
assert(manifestRows.length === files.length - 2, "convenzione N-2 manifest non rispettata");
assert(sumRows.length === files.length - 1, "convenzione N-1 checksum non rispettata");
assert(!manifestRows.some(row => row.path === "DELIVERY_MANIFEST-v1.3.1.txt" || row.path === "SHA256SUMS-v1.3.1.txt"), "manifest include controlli");
assert(!sumRows.some(row => row.path === "SHA256SUMS-v1.3.1.txt"), "checksum include se stesso");
for (const row of manifestRows) {
  const file = path.join(BASELINE, row.path);
  assert(fs.existsSync(file), `${row.path}: assente dal manifest`);
  assert(fs.statSync(file).size === row.bytes, `${row.path}: dimensione manifest errata`);
  assert(sha256(file) === row.sha256, `${row.path}: hash manifest errato`);
}
for (const row of sumRows) {
  const file = path.join(BASELINE, row.path);
  assert(fs.existsSync(file), `${row.path}: assente dai checksum`);
  assert(sha256(file) === row.sha256, `${row.path}: checksum errato`);
}
const bug = await reproduce();
assert(bug.capacity === 9 && bug.placed === 9 && bug.unplaced === 1 && bug.ok === false, "bug canonico v1.3.1 non riprodotto");

const report = {
  version: "1.3.2",
  status: "PASS",
  input: {
    file: path.basename(ZIP),
    expectedSha256: EXPECTED_ZIP_SHA256,
    actualSha256: zipSha256,
    archiveRoot: "delivery-v1.3.1/",
    archiveEntries: archiveEntries.length,
    extractedFiles: files.length
  },
  integrity: {
    manifest: { status: "PASS", entries: manifestRows.length },
    checksums: { status: "PASS", entries: sumRows.length },
    convention: { totalFiles: files.length, manifestEntries: files.length - 2, checksumEntries: files.length - 1 }
  },
  reproducedBug: bug
};
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Input admission PASS: ZIP ${zipSha256}; ${manifestRows.length} manifest and ${sumRows.length} checksum entries; v1.3.1 bug reproduced at ${bug.placed}/${bug.pallet.quantity}.`);
