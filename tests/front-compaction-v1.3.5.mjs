import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = path.resolve(import.meta.dirname, "..");
const APP_PATH = path.resolve(
  ROOT,
  process.env.LOADCOMPOSER_HTML || "site/downloads/loadcomposer-v1.3.5-standalone.html"
);
const RESULT_PATH = path.resolve(
  ROOT,
  process.env.LOADCOMPOSER_RESULT || "front-compaction-focused-results-v1.3.5.json"
);
const EPSILON = 0.0001;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function equal(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: atteso ${expected}, ottenuto ${actual}`);
  }
}

function canvasContextStub() {
  const methods = {
    arc() {}, beginPath() {}, clearRect() {}, createPattern() { return "#pattern"; },
    drawImage() {}, fill() {}, fillRect() {}, fillText() {}, lineTo() {},
    measureText(text) { return { width: String(text).length * 7 }; },
    moveTo() {}, restore() {}, rotate() {}, save() {}, stroke() {}, strokeRect() {},
    translate() {}
  };
  return new Proxy(methods, {
    get(target, property) { return target[property]; },
    set(target, property, value) { target[property] = value; return true; }
  });
}

async function loadApp() {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", error => errors.push(error));
  const dom = new JSDOM(fs.readFileSync(APP_PATH, "utf8"), {
    runScripts: "dangerously",
    url: "https://loadcomposer.test/",
    virtualConsole,
    beforeParse(window) {
      window.localStorage.setItem("loadcomposer.language", "it");
      window.alert = () => {};
      window.open = () => null;
      window.HTMLCanvasElement.prototype.getContext = () => canvasContextStub();
      window.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,";
    }
  });
  await dom.window.loadComposerI18n.ready;
  await new Promise(resolve => dom.window.setTimeout(resolve, 0));
  if (errors.length) throw errors[0];
  return dom;
}

function setCanonical(window) {
  const document = window.document;
  const group = document.getElementById("singlePalletGroup");
  document.getElementById("loadMode").value = "single";
  window.selectPresetForGroup(group, "custom", false);
  group.querySelector('[data-field="length"]').value = "1200";
  group.querySelector('[data-field="width"]').value = "1000";
  group.querySelector('[data-field="height"]').value = "1500";
  group.querySelector('[data-field="quantity"]').value = "10";
  document.getElementById("gap").value = "0";
  document.getElementById("stackable").checked = false;
  group.querySelector('[data-field="allowRotate"]').checked = true;
  window.updateGroupVisuals(group);
  assert(window.calculate(), "calcolo canonico rifiutato");
  return window.eval('lastResults.find(result => result.container.id === "20dc")');
}

function frontTargets(layout, gap) {
  const ordered = layout.rects
    .map((rect, sourceIndex) => ({ rect, sourceIndex }))
    .sort((a, b) => (
      a.rect.x - b.rect.x || a.rect.y - b.rect.y || a.sourceIndex - b.sourceIndex
    ));
  const compacted = [];
  return ordered.map(entry => {
    let targetX = 0;
    for (const prior of compacted) {
      const separatedTransversely = (
        prior.y + prior.width + gap <= entry.rect.y + EPSILON ||
        entry.rect.y + entry.rect.width + gap <= prior.y + EPSILON
      );
      if (!separatedTransversely) {
        targetX = Math.max(targetX, prior.x + prior.length + gap);
      }
    }
    compacted.push(entry.rect);
    return { sourceIndex: entry.sourceIndex, actualX: entry.rect.x, targetX };
  });
}

const source = fs.readFileSync(path.join(ROOT, "site", "index.html"), "utf8");
const searchSource = source.match(
  /function buildMixedOrientationSearchLayout[\s\S]*?\n    function singleLayoutCandidates/
)?.[0] || "";
const compactionSource = source.match(
  /function frontCompactionPairSeparated[\s\S]*?\n    function bestLayout/
)?.[0] || "";
assert(searchSource, "ricerca mixed-orientation non trovata");
assert(compactionSource, "normalizzatore front-compaction non trovato");
assert(!searchSource.includes("frontCompactSelectedLayout"), "compattazione inserita nella ricerca");
for (const forbidden of ["20dc", "5896", "2350", "1200", "1000", "quantity"]) {
  assert(!compactionSource.includes(forbidden), `hard-code nel normalizzatore: ${forbidden}`);
}

const app = await loadApp();
try {
  const syntheticContainer = { innerLength: 4000, innerWidth: 2400 };
  const syntheticLayout = {
    mode: "mixed",
    type: "synthetic",
    count: 4,
    materializedCount: 4,
    truncated: false,
    unplaced: [],
    usedLength: 2700,
    usedWidth: 2100,
    orderingName: "synthetic",
    score: {
      placedCount: 4,
      placedArea: 3300000,
      compactness: 3300000 / (2700 * 2100),
      usedLength: 2700,
      usedWidth: 2100
    },
    rects: [
      { id: "A", typeIndex: 0, unitNo: 1, x: 500, y: 0, length: 1000, width: 1000, rotated: false },
      { id: "B", typeIndex: 0, unitNo: 2, x: 1700, y: 0, length: 800, width: 1000, rotated: true },
      { id: "C", typeIndex: 1, unitNo: 1, x: 900, y: 1100, length: 900, width: 1000, rotated: false },
      { id: "D", typeIndex: 1, unitNo: 2, x: 2000, y: 1100, length: 700, width: 1000, rotated: true }
    ]
  };
  app.window.syntheticContainer = syntheticContainer;
  app.window.syntheticLayout = syntheticLayout;
  const synthetic = app.window.eval(
    "frontCompactSelectedLayout(syntheticContainer, syntheticLayout, 100)"
  );
  equal(JSON.stringify(synthetic.rects.map(rect => rect.x)), JSON.stringify([0, 1100, 0, 1000]), "x sintetiche");
  equal(synthetic.usedLength, 1900, "usedLength sintetica");
  equal(synthetic.usedWidth, 2100, "usedWidth sintetica");
  equal(synthetic.score.usedLength, 1900, "score usedLength sintetico");
  equal(
    JSON.stringify(synthetic.rects.map(({ x, ...rect }) => rect)),
    JSON.stringify(syntheticLayout.rects.map(({ x, ...rect }) => rect)),
    "metadati rettangoli sintetici"
  );
  app.window.syntheticCompacted = synthetic;
  const syntheticAgain = app.window.eval(
    "frontCompactSelectedLayout(syntheticContainer, syntheticCompacted, 100)"
  );
  equal(JSON.stringify(syntheticAgain), JSON.stringify(synthetic), "idempotenza sintetica");

  const canonical = setCanonical(app.window);
  equal(canonical.floorCapacity, 10, "capacità canonica");
  equal(canonical.placedCount, 10, "piazzati canonici");
  equal(canonical.ok, true, "CI STA/OK canonico");
  equal(canonical.validation.valid, true, "validazione canonica");
  equal(canonical.loadLayout.orientationCounts.normal, 5, "orientamenti normali");
  equal(canonical.loadLayout.orientationCounts.rotated, 5, "orientamenti ruotati");
  const targets = frontTargets(canonical.loadLayout, 0);
  assert(targets.every(item => Math.abs(item.actualX - item.targetX) <= EPSILON), "layout canonico non front-compact");

  app.window.canonicalContainer = canonical.container;
  app.window.canonicalLayout = canonical.loadLayout;
  const canonicalAgain = app.window.eval(
    "frontCompactSelectedLayout(canonicalContainer, canonicalLayout, 0)"
  );
  equal(JSON.stringify(canonicalAgain), JSON.stringify(canonical.loadLayout), "idempotenza canonica");

  const result = {
    version: "1.3.5",
    status: "PASS",
    implementation: {
      phase: "post-selection normalization",
      searchContainsCompaction: false,
      genericHardCodes: [],
      deterministic: true,
      idempotent: true
    },
    synthetic: {
      gap: 100,
      beforeUsedLength: syntheticLayout.usedLength,
      afterUsedLength: synthetic.usedLength,
      beforeCoordinates: syntheticLayout.rects.map(rect => ({ id: rect.id, x: rect.x, y: rect.y })),
      afterCoordinates: synthetic.rects.map(rect => ({ id: rect.id, x: rect.x, y: rect.y }))
    },
    canonical: {
      container: canonical.container.id,
      capacity: canonical.floorCapacity,
      placed: canonical.placedCount,
      ok: canonical.ok,
      orientations: canonical.loadLayout.orientationCounts,
      usedLength: canonical.loadLayout.usedLength,
      usedWidth: canonical.loadLayout.usedWidth,
      fixedPoint: true,
      coordinates: canonical.loadLayout.rects.map(rect => ({
        x: rect.x,
        y: rect.y,
        length: rect.length,
        width: rect.width,
        rotated: rect.rotated,
        layoutIndex: rect.layoutIndex
      }))
    }
  };
  fs.writeFileSync(RESULT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(
    "Front compaction PASS: generic post-selection normalization, canonical 10/10 " +
    "with 5 normal + 5 rotated, fixed-point compacted geometry."
  );
} finally {
  app.window.close();
}
