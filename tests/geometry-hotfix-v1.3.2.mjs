import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = path.resolve(import.meta.dirname, "..");
const APP_PATH = path.resolve(
  ROOT,
  process.env.LOADCOMPOSER_HTML ||
    "site/downloads/loadcomposer-v1.3.2-standalone.html"
);
const RESULT_PATH = path.resolve(
  ROOT,
  process.env.LOADCOMPOSER_RESULT ||
    "geometry-hotfix-results-v1.3.2.json"
);
const EPSILON = 0.0001;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: atteso ${expected}, ottenuto ${actual}`);
  }
}

function canvasContextStub(canvas, recorder) {
  const methods = {
    arc() {},
    beginPath() {},
    clearRect() {},
    createPattern() { return "#pattern"; },
    drawImage() {},
    fill() {},
    fillRect() {},
    fillText() {},
    lineTo() {},
    measureText(text) { return { width: String(text).length * 7 }; },
    moveTo() {},
    restore() {},
    rotate() {},
    save() {},
    stroke() {},
    strokeRect(...args) { recorder.push({ canvas, method: "strokeRect", args }); },
    translate() {}
  };
  return new Proxy(methods, {
    get(target, property) { return target[property]; },
    set(target, property, value) { target[property] = value; return true; }
  });
}

async function loadApp() {
  const html = fs.readFileSync(APP_PATH, "utf8");
  const errors = [];
  const canvasCalls = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", error => errors.push(error));
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    url: "https://loadcomposer.test/",
    virtualConsole,
    beforeParse(window) {
      window.localStorage.setItem("loadcomposer.language", "it");
      window.alert = () => {};
      window.open = () => null;
      window.HTMLCanvasElement.prototype.getContext = function getContext() {
        return canvasContextStub(this, canvasCalls);
      };
      window.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,";
    }
  });
  await dom.window.loadComposerI18n.ready;
  await new Promise(resolve => dom.window.setTimeout(resolve, 0));
  if (errors.length) throw errors[0];
  return { dom, window: dom.window, document: dom.window.document, canvasCalls };
}

function currentResult(app, id = "20dc") {
  return app.window.eval(
    `lastResults.find(result => result.container.id === ${JSON.stringify(id)})`
  );
}

function setLengthField(input, value) {
  input.value = String(value);
}

function setCanonical(app, options = {}) {
  const group = app.document.getElementById("singlePalletGroup");
  app.document.getElementById("loadMode").value = "single";
  app.window.selectPresetForGroup(group, "custom", false);
  setLengthField(group.querySelector('[data-field="length"]'), 1200);
  setLengthField(group.querySelector('[data-field="width"]'), 1000);
  setLengthField(group.querySelector('[data-field="height"]'), 1500);
  group.querySelector('[data-field="quantity"]').value = String(options.quantity ?? 10);
  setLengthField(app.document.getElementById("gap"), options.gap ?? 0);
  app.document.getElementById("stackable").checked = false;

  const allowRotate = group.querySelector('[data-field="allowRotate"]');
  const normal = group.querySelector('[data-field="lockedOrientation"][value="normal"]');
  const rotated = group.querySelector('[data-field="lockedOrientation"][value="rotated"]');
  allowRotate.checked = options.rotationMode !== "locked";
  normal.checked = options.lockedOrientation !== "rotated";
  rotated.checked = options.lockedOrientation === "rotated";
  app.window.updateGroupVisuals(group);
  assert(app.window.calculate(), "calcolo canonico rifiutato");
  return currentResult(app);
}

function rectanglesSeparated(a, b, gap) {
  return (
    a.x + a.length + gap <= b.x + EPSILON ||
    b.x + b.length + gap <= a.x + EPSILON ||
    a.y + a.width + gap <= b.y + EPSILON ||
    b.y + b.width + gap <= a.y + EPSILON
  );
}

function validateLayout(container, pallet, layout, gap, rotationMode, lockedOrientation) {
  assertEqual(layout.count, layout.rects.length, "conteggio/materializzazione");
  assertEqual(layout.materializedCount, layout.rects.length, "materializedCount");
  assertEqual(layout.truncated, false, "layout troncato");
  const counts = { normal: 0, rotated: 0 };

  layout.rects.forEach((rect, index) => {
    for (const value of [rect.x, rect.y, rect.length, rect.width]) {
      assert(Number.isInteger(value), `geometria non intera nel pallet ${index}`);
    }
    assert(rect.x >= 0 && rect.y >= 0, `coordinate negative nel pallet ${index}`);
    assert(rect.x + rect.length <= container.innerLength, `pallet ${index} oltre la lunghezza`);
    assert(rect.y + rect.width <= container.innerWidth, `pallet ${index} oltre la larghezza`);
    assertEqual(rect.length, rect.rotated ? pallet.width : pallet.length, `lunghezza orientata ${index}`);
    assertEqual(rect.width, rect.rotated ? pallet.length : pallet.width, `larghezza orientata ${index}`);
    if (rotationMode === "locked") {
      assertEqual(rect.rotated, lockedOrientation === "rotated", `rotazione vietata ${index}`);
    }
    counts[rect.rotated ? "rotated" : "normal"] += 1;
  });

  for (let i = 0; i < layout.rects.length; i += 1) {
    for (let j = i + 1; j < layout.rects.length; j += 1) {
      assert(rectanglesSeparated(layout.rects[i], layout.rects[j], 0), `overlap ${i}/${j}`);
      assert(rectanglesSeparated(layout.rects[i], layout.rects[j], gap), `gap ${gap} violato ${i}/${j}`);
    }
  }

  assertEqual(layout.orientationCounts.normal, counts.normal, "conteggio orientamento normale");
  assertEqual(layout.orientationCounts.rotated, counts.rotated, "conteggio orientamento ruotato");
  assertEqual(
    layout.usedLength,
    Math.max(0, ...layout.rects.map(rect => rect.x + rect.length)),
    "usedLength"
  );
  assertEqual(
    layout.usedWidth,
    Math.max(0, ...layout.rects.map(rect => rect.y + rect.width)),
    "usedWidth"
  );
}

function signature(layout) {
  return JSON.stringify({
    count: layout.count,
    orientations: layout.orientationCounts,
    usedLength: layout.usedLength,
    usedWidth: layout.usedWidth,
    rects: layout.rects.map(rect => ({
      x: rect.x,
      y: rect.y,
      length: rect.length,
      width: rect.width,
      rotated: rect.rotated,
      layoutIndex: rect.layoutIndex
    }))
  });
}

function validateWitness() {
  const container = { innerLength: 5896, innerWidth: 2350 };
  const pallet = { length: 1200, width: 1000 };
  const witness = [
    { x: 0, y: 0, length: 1000, width: 1200, rotated: true },
    { x: 1000, y: 0, length: 1200, width: 1000, rotated: false },
    { x: 2200, y: 0, length: 1200, width: 1000, rotated: false },
    { x: 3400, y: 0, length: 1200, width: 1000, rotated: false },
    { x: 4600, y: 0, length: 1200, width: 1000, rotated: false },
    { x: 0, y: 1200, length: 1200, width: 1000, rotated: false },
    { x: 1200, y: 1000, length: 1000, width: 1200, rotated: true },
    { x: 2200, y: 1000, length: 1000, width: 1200, rotated: true },
    { x: 3200, y: 1000, length: 1000, width: 1200, rotated: true },
    { x: 4200, y: 1000, length: 1000, width: 1200, rotated: true }
  ];
  const layout = {
    count: witness.length,
    rects: witness,
    materializedCount: witness.length,
    truncated: false,
    orientationCounts: { normal: 5, rotated: 5 },
    usedLength: 5800,
    usedWidth: 2200
  };
  validateLayout(container, pallet, layout, 0, "auto", "normal");
  return { count: 10, usedLength: 5800, usedWidth: 2200, valid: true };
}

function proveCanonicalUpperBound() {
  const containerLength = 5896;
  const containerWidth = 2350;
  const normal = { length: 1200, width: 1000 };
  const rotated = { length: 1000, width: 1200 };
  const requested = 11;
  const maxSimultaneousIntervals = Math.floor(containerWidth / Math.min(normal.width, rotated.width));
  const maxRotated = Math.floor(containerLength / rotated.length);
  const minNormal = requested - maxRotated;
  const minimumIntervalMeasure = minNormal * normal.length + maxRotated * rotated.length;
  const availableIntervalMeasure = maxSimultaneousIntervals * containerLength;
  assertEqual(maxSimultaneousIntervals, 2, "massima concorrenza longitudinale");
  assertEqual(maxRotated, 5, "massimo numero di pallet ruotati non sovrapposti in x");
  assert(minimumIntervalMeasure > availableIntervalMeasure, "la prova superiore non esclude 11 pallet");
  return {
    exactCapacityUpperBound: 10,
    proofForEleven: {
      maxSimultaneousIntervals,
      maxRotated,
      minNormal,
      minimumIntervalMeasure,
      availableIntervalMeasure,
      contradiction: minimumIntervalMeasure > availableIntervalMeasure
    }
  };
}

const appSource = fs.readFileSync(path.join(ROOT, "site", "index.html"), "utf8");
const searchSource = appSource.match(
  /function buildMixedOrientationSearchLayout[\s\S]*?\n    function singleLayoutCandidates/
)?.[0] || "";
assert(searchSource, "sorgente della ricerca mixed-orientation non trovato");
assert(!searchSource.includes("20dc"), "hard-code del veicolo nella ricerca");
assert(!searchSource.includes("5896"), "hard-code della lunghezza canonica nella ricerca");
assert(!searchSource.includes("2350"), "hard-code della larghezza canonica nella ricerca");
assert(!searchSource.includes("1200"), "hard-code del pallet canonico nella ricerca");
assert(!searchSource.includes("quantity"), "hard-code della quantità nella ricerca");

const witness = validateWitness();
const upperBound = proveCanonicalUpperBound();
const app = await loadApp();

try {
  const target = app.window.eval('CONTAINERS.find(container => container.id === "20dc")');
  assertEqual(target.innerLength, 5896, "lunghezza interna 20 Dry");
  assertEqual(target.innerWidth, 2350, "larghezza interna 20 Dry");

  const canonical = setCanonical(app);
  validateLayout(target, canonical.input.pallet, canonical.capacityLayout, 0, "auto", "normal");
  validateLayout(target, canonical.input.pallet, canonical.loadLayout, 0, "auto", "normal");
  assertEqual(canonical.input.quantity, 10, "quantità richiesta");
  assertEqual(canonical.capacityLayout.count, 10, "capacità canonica esatta");
  assertEqual(canonical.loadLayout.count, 10, "pallet nel loadLayout");
  assertEqual(canonical.placedCount, 10, "pallet piazzati");
  assertEqual(canonical.unplacedCount, 0, "pallet non piazzati");
  assertEqual(canonical.fitsQtyBySpace, true, "fitsQtyBySpace");
  assertEqual(canonical.ok, true, "esito CI STA");
  assertEqual(canonical.validation.internalError, false, "errore interno geometrico");
  assertEqual(canonical.validation.valid, true, "validazione R-01");
  assert(canonical.capacityLayout.orientationCounts.normal > 0, "orientamento normale assente");
  assert(canonical.capacityLayout.orientationCounts.rotated > 0, "orientamento ruotato assente");
  assertEqual(canonical.capacityLayout.searchStats.searchBoundReached, false, "budget ricerca esaurito");
  assert(canonical.capacityLayout.searchStats.generatedStates <= 24000, "limite stati superato");

  const rowText = app.window.eval(
    'renderSingleRow(lastResults.find(result => result.container.id === "20dc")).textContent'
  ).replace(/\s+/g, " ").trim();
  assert(rowText.includes("CI STA"), "status CI STA assente");
  assert(rowText.includes("Capacità trovata"), "capacità trovata assente");
  assert(!rowText.includes("1 pallet non entra"), "diagnostica pallet mancante ancora presente");

  app.canvasCalls.length = 0;
  app.window.drawSidePreview(canonical, false);
  const previewStrokes = app.canvasCalls.filter(call => (
    call.canvas === app.document.getElementById("layoutCanvas") &&
    call.method === "strokeRect"
  )).length - 1;
  assertEqual(previewStrokes, 10, "pallet nella preview");

  app.canvasCalls.length = 0;
  const printCanvas = app.window.createRampPrintCanvas(canonical, false);
  const printStrokes = app.canvasCalls.filter(call => (
    call.canvas === printCanvas && call.method === "strokeRect"
  )).length - 1;
  assertEqual(printStrokes, 10, "pallet nello schema di stampa");

  const fixedNormal = setCanonical(app, {
    rotationMode: "locked",
    lockedOrientation: "normal"
  });
  validateLayout(target, fixedNormal.input.pallet, fixedNormal.capacityLayout, 0, "locked", "normal");
  assertEqual(fixedNormal.capacityLayout.count, 8, "capacità con rotazione vietata normale");
  assertEqual(fixedNormal.capacityLayout.orientationCounts.rotated, 0, "rotazione normale violata");
  assertEqual(fixedNormal.placedCount, 8, "piazzati con rotazione vietata normale");

  const fixedRotated = setCanonical(app, {
    rotationMode: "locked",
    lockedOrientation: "rotated"
  });
  validateLayout(target, fixedRotated.input.pallet, fixedRotated.capacityLayout, 0, "locked", "rotated");
  assertEqual(fixedRotated.capacityLayout.count, 5, "capacità con orientamento ruotato bloccato");
  assertEqual(fixedRotated.capacityLayout.orientationCounts.normal, 0, "orientamento ruotato violato");

  const withGap = setCanonical(app, { gap: 10 });
  validateLayout(target, withGap.input.pallet, withGap.capacityLayout, 10, "auto", "normal");
  assertEqual(withGap.capacityLayout.count, 10, "capacità con gap 10 mm");

  const canonicalAgain = setCanonical(app);
  const normalizedSignature = signature(canonicalAgain.loadLayout);
  for (const unit of ["cm", "in", "mm"]) {
    assert(app.window.requestLengthUnit(unit), `cambio unità ${unit} rifiutato`);
    assert(app.window.calculate(), `calcolo ${unit} rifiutato`);
    assertEqual(signature(currentResult(app).loadLayout), normalizedSignature, `geometria normalizzata ${unit}`);
  }

  const deterministicSignatures = [];
  for (let iteration = 0; iteration < 25; iteration += 1) {
    deterministicSignatures.push(signature(app.window.bestLayout(
      target,
      canonicalAgain.input.pallet,
      0,
      "auto",
      "normal"
    )));
  }
  assertEqual(new Set(deterministicSignatures).size, 1, "ricerca non deterministica");

  const types = [
    {
      name: "Industriale A",
      identifier: "A",
      length: 1200,
      width: 1000,
      height: 1500,
      quantity: 5,
      rotationMode: "auto",
      lockedOrientation: "normal"
    },
    {
      name: "Industriale B",
      identifier: "B",
      length: 1200,
      width: 1000,
      height: 1500,
      quantity: 5,
      rotationMode: "auto",
      lockedOrientation: "normal"
    }
  ];
  const items = app.window.expandMixedItems(types);
  const mixed = app.window.bestMixedLayout(target, items, 0);
  assertEqual(mixed.count, 10, "ponte mixed omogeneo");
  assertEqual(mixed.unplaced.length, 0, "unplaced mixed omogeneo");
  assertEqual(new Set(mixed.rects.map(rect => rect.id)).size, 10, "identità mixed duplicate");
  assertEqual(new Set(mixed.rects.map(rect => rect.typeIndex)).size, 2, "identità gruppi mixed perse");

  const tinyPallet = {
    length: 100,
    width: 80,
    height: 100,
    rotationMode: "auto",
    lockedOrientation: "normal"
  };
  const stressStarted = performance.now();
  const stress = app.window.bestLoadLayout(target, tinyPallet, 0, "auto", "normal", 500);
  const stressMs = performance.now() - stressStarted;
  assertEqual(stress.count, 500, "stress 500 pallet");
  assert(stressMs < 1000, `stress non interattivo: ${stressMs.toFixed(3)} ms`);

  const result = {
    version: "1.3.2",
    source: path.relative(ROOT, APP_PATH).split(path.sep).join("/"),
    status: "PASS",
    canonical: {
      container: { id: target.id, innerLength: target.innerLength, innerWidth: target.innerWidth },
      requested: 10,
      capacity: canonical.capacityLayout.count,
      placed: canonical.placedCount,
      unplaced: canonical.unplacedCount,
      ok: canonical.ok,
      orientations: canonical.capacityLayout.orientationCounts,
      usedLength: canonical.capacityLayout.usedLength,
      usedWidth: canonical.capacityLayout.usedWidth,
      geometryValid: canonical.validation.valid,
      searchStats: canonical.capacityLayout.searchStats,
      previewPallets: previewStrokes,
      printPallets: printStrokes
    },
    independentReference: { witness, upperBound },
    rotation: {
      allowedCapacity: canonical.capacityLayout.count,
      lockedNormalCapacity: fixedNormal.capacityLayout.count,
      lockedRotatedCapacity: fixedRotated.capacityLayout.count
    },
    gap10Capacity: withGap.capacityLayout.count,
    units: ["mm", "cm", "in"],
    deterministicRuns: deterministicSignatures.length,
    mixedGroups: { requested: 10, placed: mixed.count, groupsPreserved: 2 },
    stress: { quantity: 500, placed: stress.count, milliseconds: stressMs }
  };
  fs.writeFileSync(RESULT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(
    `Geometry hotfix PASS: canonical 10/10, exact capacity 10, ` +
    `fixed normal ${fixedNormal.capacityLayout.count}, fixed rotated ${fixedRotated.capacityLayout.count}, ` +
    `25 deterministic runs, stress 500 in ${stressMs.toFixed(3)} ms.`
  );
} finally {
  app.dom.window.close();
}
