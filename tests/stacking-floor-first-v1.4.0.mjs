import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = path.resolve(import.meta.dirname, "..");
const CURRENT = path.join(ROOT, "site/downloads/loadcomposer-v1.4.0-standalone.html");
const BASELINE = path.join(ROOT, "site/downloads/loadcomposer-v1.3.6-standalone.html");
const REPORT = path.join(ROOT, "stacking-floor-first-delta-results-v1.4.0.json");

function canvasContextStub() {
  return new Proxy({
    createPattern: () => "#pattern",
    measureText: text => ({ width: String(text).length * 7 })
  }, {
    get(target, property) { return target[property] ?? (() => {}); },
    set(target, property, value) { target[property] = value; return true; }
  });
}

async function loadApp(file) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", error => errors.push(error));
  const dom = new JSDOM(fs.readFileSync(file, "utf8"), {
    runScripts: "dangerously",
    url: "https://loadcomposer.test/",
    virtualConsole,
    beforeParse(window) {
      window.localStorage.setItem("loadcomposer.language", "en");
      window.localStorage.setItem("loadcomposer.theme", "light");
      window.alert = () => {};
      window.open = () => null;
      window.HTMLCanvasElement.prototype.getContext = () => canvasContextStub();
      window.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,";
    }
  });
  await dom.window.loadComposerI18n.ready;
  await new Promise(resolve => dom.window.setTimeout(resolve, 20));
  if (errors.length) throw errors[0];
  return dom;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function euroInput({ quantity, height, maxLayers = 2, stackable = true, verticalGap = 0 }) {
  return {
    mode: "single",
    pallet: {
      presetId: "eur",
      name: "Euro pallet",
      identifier: "STACK-QA",
      length: 1200,
      width: 800,
      height,
      rotationMode: "auto",
      lockedOrientation: "normal"
    },
    quantity,
    gap: 0,
    stackable,
    maxLayers,
    verticalGap
  };
}

function resultFor(window, input, vehicleId) {
  window.calculateSingle(plain(input));
  return plain(window.eval(
    `lastResults.find(result => result.container.id === ${JSON.stringify(vehicleId)})`
  ));
}

function layoutSignature(layout) {
  return {
    count: layout.count,
    usedLength: layout.usedLength,
    usedWidth: layout.usedWidth,
    orientationCounts: layout.orientationCounts,
    rects: layout.rects.map(rect => ({
      x: rect.x,
      y: rect.y,
      length: rect.length,
      width: rect.width,
      rotated: rect.rotated,
      layoutIndex: rect.layoutIndex
    }))
  };
}

function resultSignature(result) {
  return {
    container: result.container.id,
    capacityLayout: layoutSignature(result.capacityLayout),
    loadLayout: layoutSignature(result.loadLayout),
    layers: result.layers,
    loadLayers: result.loadLayers,
    floorCapacity: result.floorCapacity,
    totalCapacity: result.totalCapacity,
    requestedFloorPositions: result.requestedFloorPositions,
    placedFloorPositions: result.placedFloorPositions,
    placedCount: result.placedCount,
    unplacedCount: result.unplacedCount,
    fitsQtyBySpace: result.fitsQtyBySpace,
    okDoor: result.okDoor,
    okHeight: result.okHeight,
    ok: result.ok,
    stackCounts: result.layout.stackCounts
  };
}

function expectedLevelMajorCounts(placed, floorPositions) {
  if (!floorPositions) return [];
  const counts = Array.from({ length: floorPositions }, () => 0);
  for (let index = 0; index < placed; index += 1) {
    counts[index % floorPositions] += 1;
  }
  return counts;
}

function assertScenario(result, expected, label) {
  for (const [key, value] of Object.entries(expected)) {
    assert.deepEqual(result[key], value, `${label}: ${key}`);
  }
  assert.equal(result.validationError, false, `${label}: internal validation error`);
  assert.equal(result.layout.rects.length, result.placedFloorPositions, `${label}: floor rectangles`);
  assert.deepEqual(
    result.layout.stackCounts,
    expectedLevelMajorCounts(result.placedCount, result.placedFloorPositions),
    `${label}: level-major stack assignment`
  );
  assert.equal(
    result.layout.stackCounts.reduce((sum, count) => sum + count, 0),
    result.placedCount,
    `${label}: stack-count sum`
  );
}

function mixedResultSignatures(window) {
  const inputs = [
    {
      mode: "mixed",
      gap: 0,
      types: [
        { presetId: "eur", name: "Euro", identifier: "A", length: 1200, width: 800, height: 1000, quantity: 5, rotationMode: "auto", lockedOrientation: "normal" },
        { presetId: "industrial", name: "Industrial", identifier: "B", length: 1200, width: 1000, height: 1200, quantity: 4, rotationMode: "locked", lockedOrientation: "normal" }
      ]
    },
    {
      mode: "mixed",
      gap: 10,
      types: [
        { presetId: "eur", name: "Euro", identifier: "A", length: 1200, width: 800, height: 900, quantity: 3, rotationMode: "auto", lockedOrientation: "normal" },
        { presetId: "custom", name: "Custom", identifier: "B", length: 1050, width: 950, height: 1100, quantity: 2, rotationMode: "locked", lockedOrientation: "rotated" },
        { presetId: "na", name: "NA", identifier: "C", length: 1219, width: 1016, height: 1250, quantity: 2, rotationMode: "auto", lockedOrientation: "normal" }
      ]
    }
  ];
  return inputs.flatMap(input => {
    window.calculateMixed(plain(input));
    return plain(window.eval(`lastResults.map(result => ({
      id: result.container.id,
      ok: result.ok,
      placedCount: result.placedCount,
      totalItems: result.totalItems,
      layout: {
        count: result.layout.count,
        usedLength: result.layout.usedLength,
        usedWidth: result.layout.usedWidth,
        rects: result.layout.rects.map(rect => ({
          id: rect.id, typeIndex: rect.typeIndex, unitNo: rect.unitNo,
          x: rect.x, y: rect.y, length: rect.length, width: rect.width,
          rotated: rect.rotated
        })),
        unplaced: result.layout.unplaced.map(item => ({ id: item.id, typeIndex: item.typeIndex, unitNo: item.unitNo }))
      }
    }))`));
  });
}

const currentDom = await loadApp(CURRENT);
const baselineDom = await loadApp(BASELINE);

try {
  const current = currentDom.window;
  const baseline = baselineDom.window;
  const cases = [
    ["mega-h1500-q34-max2", "truck-mega-1360", 34, 1500, 2, { floorCapacity: 34, physicalLayers: 2, availableLayers: 2, requiredLayers: 1, loadLayers: 1, totalCapacity: 68, requestedFloorPositions: 34, placedFloorPositions: 34, placedCount: 34, unplacedCount: 0, requiredStackHeight: 1500, stackingLimitReason: null, fitsQtyBySpace: true, okHeight: true, ok: true }],
    ["mega-h1500-q35-max2", "truck-mega-1360", 35, 1500, 2, { floorCapacity: 34, physicalLayers: 2, availableLayers: 2, requiredLayers: 2, loadLayers: 2, totalCapacity: 68, requestedFloorPositions: 34, placedFloorPositions: 34, placedCount: 35, unplacedCount: 0, requiredStackHeight: 3000, stackingLimitReason: null, fitsQtyBySpace: true, okHeight: true, ok: true }],
    ["mega-h1500-q68-max2", "truck-mega-1360", 68, 1500, 2, { floorCapacity: 34, physicalLayers: 2, availableLayers: 2, requiredLayers: 2, loadLayers: 2, totalCapacity: 68, requestedFloorPositions: 34, placedFloorPositions: 34, placedCount: 68, unplacedCount: 0, requiredStackHeight: 3000, stackingLimitReason: null, fitsQtyBySpace: true, okHeight: true, ok: true }],
    ["fridge-h1500-q33-max2", "truck-reefer-1360", 33, 1500, 2, { floorCapacity: 33, physicalLayers: 1, availableLayers: 1, requiredLayers: 1, loadLayers: 1, totalCapacity: 33, requestedFloorPositions: 33, placedFloorPositions: 33, placedCount: 33, unplacedCount: 0, requiredStackHeight: 1500, stackingLimitReason: null, fitsQtyBySpace: true, okHeight: true, ok: true }],
    ["fridge-h1500-q34-max2", "truck-reefer-1360", 34, 1500, 2, { floorCapacity: 33, physicalLayers: 1, availableLayers: 1, requiredLayers: 2, loadLayers: 1, totalCapacity: 33, requestedFloorPositions: 33, placedFloorPositions: 33, placedCount: 33, unplacedCount: 1, requiredStackHeight: 3000, stackingLimitReason: "height", fitsQtyBySpace: false, okHeight: false, ok: false }],
    ["fridge-h500-q33-max2", "truck-reefer-1360", 33, 500, 2, { floorCapacity: 33, physicalLayers: 5, availableLayers: 2, requiredLayers: 1, loadLayers: 1, totalCapacity: 66, requestedFloorPositions: 33, placedFloorPositions: 33, placedCount: 33, unplacedCount: 0, requiredStackHeight: 500, stackingLimitReason: null, fitsQtyBySpace: true, okHeight: true, ok: true }],
    ["fridge-h500-q34-max2", "truck-reefer-1360", 34, 500, 2, { floorCapacity: 33, physicalLayers: 5, availableLayers: 2, requiredLayers: 2, loadLayers: 2, totalCapacity: 66, requestedFloorPositions: 33, placedFloorPositions: 33, placedCount: 34, unplacedCount: 0, requiredStackHeight: 1000, stackingLimitReason: null, fitsQtyBySpace: true, okHeight: true, ok: true }],
    ["fridge-h500-q66-max2", "truck-reefer-1360", 66, 500, 2, { floorCapacity: 33, physicalLayers: 5, availableLayers: 2, requiredLayers: 2, loadLayers: 2, totalCapacity: 66, requestedFloorPositions: 33, placedFloorPositions: 33, placedCount: 66, unplacedCount: 0, requiredStackHeight: 1000, stackingLimitReason: null, fitsQtyBySpace: true, okHeight: true, ok: true }],
    ["fridge-h500-q67-max2", "truck-reefer-1360", 67, 500, 2, { floorCapacity: 33, physicalLayers: 5, availableLayers: 2, requiredLayers: 3, loadLayers: 2, totalCapacity: 66, requestedFloorPositions: 33, placedFloorPositions: 33, placedCount: 66, unplacedCount: 1, requiredStackHeight: 1500, stackingLimitReason: "max-layers", fitsQtyBySpace: false, okHeight: true, ok: false }],
    ["mega-h1000-q100-max20", "truck-mega-1360", 100, 1000, 20, { floorCapacity: 34, physicalLayers: 3, availableLayers: 3, requiredLayers: 3, loadLayers: 3, totalCapacity: 102, requestedFloorPositions: 34, placedFloorPositions: 34, placedCount: 100, unplacedCount: 0, requiredStackHeight: 3000, stackingLimitReason: null, fitsQtyBySpace: true, okHeight: true, ok: true }],
    ["fridge-h1000-q100-max20", "truck-reefer-1360", 100, 1000, 20, { floorCapacity: 33, physicalLayers: 2, availableLayers: 2, requiredLayers: 4, loadLayers: 2, totalCapacity: 66, requestedFloorPositions: 33, placedFloorPositions: 33, placedCount: 66, unplacedCount: 34, requiredStackHeight: 4000, stackingLimitReason: "height", fitsQtyBySpace: false, okHeight: false, ok: false }],
    ["mega-h1000-q100-max2", "truck-mega-1360", 100, 1000, 2, { floorCapacity: 34, physicalLayers: 3, availableLayers: 2, requiredLayers: 3, loadLayers: 2, totalCapacity: 68, requestedFloorPositions: 34, placedFloorPositions: 34, placedCount: 68, unplacedCount: 32, requiredStackHeight: 3000, stackingLimitReason: "max-layers", fitsQtyBySpace: false, okHeight: true, ok: false }],
    ["fridge-h1000-q100-max2", "truck-reefer-1360", 100, 1000, 2, { floorCapacity: 33, physicalLayers: 2, availableLayers: 2, requiredLayers: 4, loadLayers: 2, totalCapacity: 66, requestedFloorPositions: 33, placedFloorPositions: 33, placedCount: 66, unplacedCount: 34, requiredStackHeight: 4000, stackingLimitReason: "height-and-max-layers", fitsQtyBySpace: false, okHeight: false, ok: false }],
    ["mega-h1000-q35-max1", "truck-mega-1360", 35, 1000, 1, { floorCapacity: 34, physicalLayers: 3, availableLayers: 1, requiredLayers: 2, loadLayers: 1, totalCapacity: 34, requestedFloorPositions: 34, placedFloorPositions: 34, placedCount: 34, unplacedCount: 1, requiredStackHeight: 2000, stackingLimitReason: "max-layers", fitsQtyBySpace: false, okHeight: true, ok: false }],
    ["20dc-h1000-q12-max1", "20dc", 12, 1000, 1, { floorCapacity: 11, physicalLayers: 2, availableLayers: 1, requiredLayers: 2, loadLayers: 1, totalCapacity: 11, requestedFloorPositions: 11, placedFloorPositions: 11, placedCount: 11, unplacedCount: 1, requiredStackHeight: 2000, stackingLimitReason: "max-layers", fitsQtyBySpace: false, okHeight: true, ok: false }]
  ];

  const stackingDeltas = [];
  for (const [id, vehicleId, quantity, height, maxLayers, expected] of cases) {
    const input = euroInput({ quantity, height, maxLayers });
    const after = resultFor(current, input, vehicleId);
    const before = resultFor(baseline, input, vehicleId);
    assertScenario(after, expected, id);
    assert.deepEqual(
      layoutSignature(after.capacityLayout),
      layoutSignature(before.capacityLayout),
      `${id}: 2D floor-capacity layout changed`
    );
    const beforeSignature = resultSignature(before);
    const afterSignature = resultSignature(after);
    const changedFields = Object.keys(afterSignature).filter(key => (
      JSON.stringify(afterSignature[key]) !== JSON.stringify(beforeSignature[key])
    ));
    const allowed = new Set([
      "loadLayout", "loadLayers", "totalCapacity", "requestedFloorPositions",
      "placedFloorPositions", "placedCount", "unplacedCount", "fitsQtyBySpace",
      "okHeight", "ok", "stackCounts"
    ]);
    assert.equal(
      changedFields.every(field => allowed.has(field)),
      true,
      `${id}: unexplained stacking delta ${changedFields.join(", ")}`
    );
    stackingDeltas.push({ id, vehicleId, changedFields, before: beforeSignature, after: afterSignature });
  }

  const gapInput = euroInput({ quantity: 35, height: 1000, maxLayers: 20, verticalGap: 50 });
  const gapResult = resultFor(current, gapInput, "truck-mega-1360");
  assert.equal(gapResult.physicalLayers, 2, "non-zero vertical gap physical layer support");
  assert.equal(gapResult.requiredStackHeight, 2050, "non-zero vertical gap stack height");

  for (const vehicleId of ["20dc", "40dc", "40hc", "20rf", "40rh"]) {
    const container = plain(current.eval(`CONTAINERS.find(item => item.id === ${JSON.stringify(vehicleId)})`));
    const height = 500;
    const maxLayers = 2;
    const result = resultFor(current, euroInput({ quantity: 500, height, maxLayers }), vehicleId);
    const expectedPhysical = Math.floor(container.innerHeight / height);
    assert.equal(result.physicalLayers, expectedPhysical, `${vehicleId}: physical layers from authoritative height`);
    assert.equal(result.availableLayers, Math.min(maxLayers, expectedPhysical), `${vehicleId}: available layers`);
    assert.equal(result.totalCapacity, result.floorCapacity * result.availableLayers, `${vehicleId}: stacking capacity`);
  }

  const nonStackingInputs = [
    euroInput({ quantity: 10, height: 1500, maxLayers: 2, stackable: false }),
    euroInput({ quantity: 1, height: 2400, maxLayers: 20, stackable: false }),
    euroInput({ quantity: 35, height: 500, maxLayers: 1, stackable: false })
  ];
  const nonStackingChanges = [];
  for (const input of nonStackingInputs) {
    current.calculateSingle(plain(input));
    baseline.calculateSingle(plain(input));
    const after = plain(current.eval("lastResults.map(resultSignature => ({ id: resultSignature.container.id, value: null }))"));
    const currentResults = plain(current.eval("lastResults"));
    const baselineResults = plain(baseline.eval("lastResults"));
    currentResults.forEach((result, index) => {
      const beforeSignature = resultSignature(baselineResults[index]);
      const afterSignature = resultSignature(result);
      if (JSON.stringify(beforeSignature) !== JSON.stringify(afterSignature)) {
        nonStackingChanges.push({ vehicleId: after[index].id, before: beforeSignature, after: afterSignature });
      }
    });
  }
  assert.deepEqual(nonStackingChanges, [], "non-stacking behavior changed");

  const beforeMixed = mixedResultSignatures(baseline);
  const afterMixed = mixedResultSignatures(current);
  assert.deepEqual(afterMixed, beforeMixed, "mixed floor-only behavior changed");

  current.document.documentElement.dataset.theme = "light";
  const lightBw = plain(current.eval("canvasPreviewPalette({ bwMode: true, forPrint: false })"));
  const lightColour = plain(current.eval("canvasPreviewPalette({ bwMode: false, forPrint: false })"));
  current.document.documentElement.dataset.theme = "dark";
  const darkBw = plain(current.eval("canvasPreviewPalette({ bwMode: true, forPrint: false })"));
  const darkColour = plain(current.eval("canvasPreviewPalette({ bwMode: false, forPrint: false })"));
  const printBw = plain(current.eval("canvasPreviewPalette({ bwMode: true, forPrint: true })"));
  assert.equal(lightBw.background, "#ffffff", "Light+B/W screen background changed");
  assert.equal(lightBw.floor, "#ffffff", "Light+B/W screen floor changed");
  for (const key of ["background", "floor", "ink", "grid"]) {
    assert.equal(darkBw[key], darkColour[key], `Dark+B/W ${key} must reuse Dark+Colour`);
  }
  assert.notEqual(darkBw.palletStroke, darkColour.palletStroke, "Dark+B/W pallet treatment is missing");
  assert.equal(printBw.background, "#ffffff", "B/W print background must remain white");
  assert.equal(printBw.floor, "#ffffff", "B/W print floor must remain white");
  assert.notDeepEqual(darkColour, darkBw, "Dark colour palette replaced by B/W palette");
  assert.notDeepEqual(lightColour, lightBw, "Light colour palette replaced by B/W palette");

  const maxLayers = current.document.getElementById("maxLayers");
  assert.equal(maxLayers.getAttribute("aria-describedby"), "maxLayersHelp");
  assert.ok(current.document.getElementById("maxLayersHelp").textContent.trim().length > 40);
  for (const language of ["it", "en", "de", "es", "fr", "pt", "nl"]) {
    const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "site/lang", `${language}.json`), "utf8"));
    for (const key of [
      "pallet.maxLayersHelp", "table.capacityComposition.oneOne",
      "table.capacityComposition.oneOther", "table.capacityComposition.otherOne",
      "table.capacityComposition.otherOther", "table.stackHeightUsed", "table.requiredStackHeight",
      "table.stackingLimitedByHeight", "table.stackingLimitedByMaxLayers",
      "table.stackingLimitedByBoth"
    ]) assert.ok(catalog.translations[key], `${language}: missing ${key}`);
  }

  const fridgeFailure = resultFor(current, euroInput({ quantity: 34, height: 1500, maxLayers: 2 }), "truck-reefer-1360");
  const fridgeRow = current.renderSingleRow(fridgeFailure);
  assert.match(fridgeRow.cells[2].textContent, /Found capacity: 33 pallets/);
  assert.match(fridgeRow.cells[2].textContent, /33 floor positions × 1 layer/);
  assert.match(fridgeRow.cells[2].textContent, /1 pallet does not fit/);
  assert.doesNotMatch(fridgeRow.cells[2].textContent, /Floor position:|Used:|Usable layers:|Used layers:|Max layers set:|Limited by/);
  assert.match(fridgeRow.cells[3].textContent, /Required stack height: 3000 mm/);
  assert.match(fridgeRow.cells[3].textContent, /Limited by vehicle usable height/);
  assert.match(fridgeRow.cells[3].textContent, /NOT OK/);

  const maxFailure = resultFor(current, euroInput({ quantity: 67, height: 500, maxLayers: 2 }), "truck-reefer-1360");
  const maxRow = current.renderSingleRow(maxFailure);
  assert.match(maxRow.cells[2].textContent, /Found capacity: 66 pallets/);
  assert.match(maxRow.cells[2].textContent, /33 floor positions × 2 layers/);
  assert.match(maxRow.cells[2].textContent, /1 pallet does not fit/);
  assert.doesNotMatch(maxRow.cells[2].textContent, /Floor position:|Used:|Usable layers:|Used layers:|Max layers set:|Limited by/);
  assert.doesNotMatch(maxRow.cells[3].textContent, /Required stack height/);

  const sparseStacking = resultFor(current, euroInput({ quantity: 1, height: 1000, maxLayers: 7 }), "20dc");
  const sparseRow = current.renderSingleRow(sparseStacking);
  assert.match(sparseRow.cells[2].textContent, /Found capacity: 22 pallets/);
  assert.match(sparseRow.cells[2].textContent, /11 floor positions × 2 layers/);
  assert.match(sparseRow.cells[2].textContent, /21 free slots/);
  assert.doesNotMatch(sparseRow.cells[2].textContent, /Used:|Usable layers:|Used layers:|Max layers set:/);

  const nonStackingMissing = resultFor(current, euroInput({ quantity: 16, height: 1000, stackable: false }), "20dc");
  const nonStackingMissingText = current.renderSingleRow(nonStackingMissing).cells[2].textContent;
  assert.match(nonStackingMissingText, /Found capacity: 11 pallets/);
  assert.match(nonStackingMissingText, /5 pallets do not fit/);
  assert.doesNotMatch(nonStackingMissingText, /floor positions ×|layers/);

  const nonStackingFree = resultFor(current, euroInput({ quantity: 16, height: 1000, stackable: false }), "40dc");
  const nonStackingFreeText = current.renderSingleRow(nonStackingFree).cells[2].textContent;
  assert.match(nonStackingFreeText, /Found capacity: 25 pallets/);
  assert.match(nonStackingFreeText, /9 free slots/);
  assert.doesNotMatch(nonStackingFreeText, /floor positions ×|layers/);

  const exactCapacity = resultFor(current, euroInput({ quantity: 11, height: 1000, stackable: false }), "20dc");
  assert.doesNotMatch(current.renderSingleRow(exactCapacity).cells[2].textContent, /0 free slots/);

  const localizedCompositions = {
    it: "11 posti a pavimento × 2 strati",
    en: "11 floor positions × 2 layers",
    de: "11 Bodenstellplätze × 2 Lagen",
    es: "11 puestos en el suelo × 2 niveles",
    fr: "11 places au sol × 2 niveaux",
    pt: "11 lugares no piso × 2 níveis",
    nl: "11 vloerplaatsen × 2 lagen"
  };
  for (const [language, expectedText] of Object.entries(localizedCompositions)) {
    await current.loadComposerI18n.setLanguage(language, { persist: false });
    const localizedResult = resultFor(current, euroInput({ quantity: 1, height: 1000, maxLayers: 7 }), "20dc");
    assert.ok(current.renderSingleRow(localizedResult).cells[2].textContent.includes(expectedText), `${language}: compact capacity composition`);
  }
  await current.loadComposerI18n.setLanguage("en", { persist: false });

  const report = {
    release: "1.4.0",
    policy: "floor-first / level-major",
    baseline: "retained published v1.3.6 standalone",
    categories: {
      nonStacking: { compared: nonStackingInputs.length * 12, changes: 0 },
      mixed: { compared: beforeMixed.length, changes: 0 },
      stackableSingleGroup: {
        compared: stackingDeltas.length,
        intentionalCorrections: stackingDeltas.filter(item => item.changedFields.length > 0).length,
        unexplainedChanges: 0,
        deltas: stackingDeltas
      }
    },
    previewPalette: { lightBw, lightColour, darkBw, darkColour, printBw },
    requiredMatrix: cases.map(([id, vehicleId, quantity, height, maxLayers, expected]) => ({
      id, vehicleId, quantity, height, maxLayers, expected
    }))
  };
  fs.writeFileSync(REPORT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Stacking floor-first PASS: ${cases.length} focused cases, ${nonStackingInputs.length * 12} non-stacking comparisons, ${beforeMixed.length} mixed comparisons, Dark+B/W reuses the Dark+Colour environment palette.`);
} finally {
  currentDom.window.close();
  baselineDom.window.close();
}
