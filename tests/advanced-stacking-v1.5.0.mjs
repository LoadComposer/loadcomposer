import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { JSDOM, VirtualConsole } from "jsdom";

const root = path.resolve(import.meta.dirname, "..");
const html = fs.readFileSync(path.join(root, "site/downloads/loadcomposer-v1.5.0-standalone.html"), "utf8");
const engineSource = fs.readFileSync(path.join(root, "site/advanced-stacking-engine.js"), "utf8");
const validatorSource = fs.readFileSync(path.join(root, "site/advanced-stacking-validator.js"), "utf8");
const context = { performance };
context.globalThis = context;
vm.runInNewContext(engineSource, context);
vm.runInNewContext(validatorSource, context);
const engine = context.loadComposerAdvancedStacking;
const validator = context.loadComposerAdvancedStackingValidator;

const baseType = (index, options = {}) => ({ typeIndex: index, length: 100, width: 100, height: 500,
  quantity: 1, rotationMode: "auto", lockedOrientation: "normal", stackingEnabled: true,
  stackRole: "base", maxLayers: 2, allowedAbove: [], ...options });
const types = [baseType(0, { allowedAbove: [2, 3] }), baseType(1, { allowedAbove: [2] }),
  baseType(2, { stackRole: "top", maxLayers: 1 }), baseType(3, { stackRole: "top", maxLayers: 1 })];
const rects = [0, 1].map(index => ({ id: `${index + 1}.1`, typeIndex: index, unitNo: 1,
  length: 100, width: 100, originalLength: 100, originalWidth: 100,
  height: 500, rotated: false, x: index * 100, y: 0 }));
const upper = [2, 3].map(index => ({ id: `${index + 1}.1`, typeIndex: index, unitNo: 1,
  length: 100, width: 100, height: 500, rotationMode: "auto", lockedOrientation: "normal" }));
const matched = engine.assign({ rects, score: { compactness: 1 } }, [...rects, ...upper], types, { innerHeight: 3000 }, 0, "neutral");
assert.equal(matched.placedCount, 4, "augmenting assignment must not strand P02's sole compatible group");
assert.deepEqual(matched.stacks.map(stack => stack.layers[1].typeIndex), [3, 2]);
const futureTypes = [baseType(0, { quantity: 2, stackRole: "any", maxLayers: 3, allowedAbove: [0, 1] }),
  baseType(1, { stackRole: "top", maxLayers: 1 })];
const futureFloor = { ...rects[0] };
const futureItems = [futureFloor,
  { ...futureFloor, id: "1.2", unitNo: 2, rotationMode: "auto", lockedOrientation: "normal" },
  { ...upper[0], id: "2.1", typeIndex: 1, unitNo: 1 }];
const futureResult = engine.assign({ rects: [futureFloor], score: { compactness: 1 } },
  futureItems, futureTypes, { innerHeight: 1800 }, 0, "future");
assert.equal(futureResult.stacks[0].layers.map(layer => layer.id).join(","), "1.1,1.2,2.1",
  "intermediate support must remain available for a third layer");
assert.equal(engine.orientation({ length: 1200, width: 800, rotationMode: "locked", lockedOrientation: "normal" }, 800, 1200), null);
const score = (placedCount, floorPlacedCount, maxLayersUsed, mixedGroupStacks, compactness = 1) => ({
  placedCount, floorPlacedCount, maxLayersUsed, mixedGroupStacks,
  layout: { score: { compactness }, usedLength: 100, usedWidth: 100 }, tieKey: "a"
});
assert.equal(engine.better(score(16, 8, 2, 4), score(10, 10, 1, 0)), true);
assert.equal(engine.better(score(99, 60, 3, 3), score(99, 50, 2, 0)), true);
assert.equal(engine.better(score(99, 60, 2, 3), score(99, 60, 3, 0)), true);
assert.equal(engine.better(score(99, 60, 2, 1), score(99, 60, 2, 2)), true);

let seed = 41;
const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
for (let trial = 0; trial < 250; trial++) {
  const baseCount = 2 + Math.floor(random() * 4);
  const upperCount = 2 + Math.floor(random() * 3);
  const sources = [], floor = [], units = [];
  for (let i = 0; i < baseCount; i++) {
    sources.push(baseType(i, { allowedAbove: [] }));
    const item = { id: `${i + 1}.1`, typeIndex: i, unitNo: 1, length: 100,
      width: 100, height: 500, x: i * 100, y: 0, rotated: false };
    floor.push(item); units.push(item);
  }
  const capacities = [];
  for (let j = 0; j < upperCount; j++) {
    const group = baseCount + j;
    const quantity = 1 + Math.floor(random() * 2);
    capacities.push(quantity);
    sources.push(baseType(group, { quantity, stackRole: "top", maxLayers: 1 }));
    for (let unit = 1; unit <= quantity; unit++) units.push({ id: `${group + 1}.${unit}`, typeIndex: group,
      unitNo: unit, length: 100, width: 100, height: 500, rotationMode: "auto", lockedOrientation: "normal" });
  }
  for (let i = 0; i < baseCount; i++) for (let j = 0; j < upperCount; j++) {
    if (random() < .55) sources[i].allowedAbove.push(baseCount + j);
  }
  const candidate = engine.assign({ rects: floor, score: { compactness: 1 } },
    units, sources, { innerHeight: 3000 }, 0, "constrained");
  const used = candidate.stacks.flatMap(stack => stack.layers.map(item => item.id));
  assert.equal(new Set(used).size, used.length, `trial ${trial}: duplicate allocation`);
  assert.equal(candidate.placedCount + candidate.unplaced.length, units.length, `trial ${trial}: reconciliation`);
  const optimal = (position, stock) => {
    if (position === baseCount) return 0;
    let best = optimal(position + 1, stock);
    for (let j = 0; j < upperCount; j++) {
      if (!stock[j] || !sources[position].allowedAbove.includes(baseCount + j)) continue;
      stock[j]--;
      best = Math.max(best, 1 + optimal(position + 1, stock));
      stock[j]++;
    }
    return best;
  };
  assert.equal(candidate.stackedCount, optimal(0, capacities), `trial ${trial}: maximum matching`);
}

const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", error => errors.push(error));
const dom = new JSDOM(html, {
  runScripts: "dangerously", url: "https://loadcomposer.test/", virtualConsole,
  beforeParse(window) {
    window.localStorage.setItem("loadcomposer.language", "en");
    window.alert = () => {};
    window.HTMLCanvasElement.prototype.getContext = () => new Proxy({
      measureText: text => ({ width: String(text).length * 7 }), createPattern: () => "#pattern"
    }, { get: (object, key) => object[key] ?? (() => {}) });
    window.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,";
  }
});
try {
  await dom.window.loadComposerI18n.ready;
  await new Promise(resolve => dom.window.setTimeout(resolve, 0));
  assert.deepEqual(errors, []);
  const { window } = dom;
  const document = window.document;
  const first = document.getElementById("singlePalletGroup");
  const simple = window.readInput();
  assert.equal(simple.mode, "single");
  assert.equal(simple.stackable, false);
  assert.equal(Object.hasOwn(simple.pallet, "stackingEnabled"), false);
  assert.equal(first.querySelectorAll('.group-options .switch-control .switch-track').length, 2);
  assert.equal(first.querySelector('[data-role="stackPanel"]').classList.contains('hidden'), true);
  assert.equal(document.querySelector('[data-action="editStack"]'), null);
  window.setLengthInputMm(document.getElementById('gap'), 12);
  assert.equal(window.readInput().gap, 12);
  assert.equal(window.readInput().verticalGap, 0);
  window.setLengthInputMm(document.getElementById('gap'), 0);
  assert.equal(window.eval('lastResults.find(result => result.container.id === "20dc").placedCount'), 10);
  window.addMixedRow({ presetId: "eur", quantity: 1, height: 1500 }, { calculate: false });
  assert.equal(window.readInput().advancedStacking, undefined);
  assert.equal(Object.hasOwn(window.readInput().types[0], "stackRole"), false);
  const second = document.querySelector(".mixed-row");
  const secondStacking = second.querySelector('[data-field="stackingEnabled"]');
  secondStacking.checked = true;
  secondStacking.dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.equal(window.readInput().advancedStacking, true);
  assert.deepEqual(Array.from(window.readInput().types[1].allowedAbove), [1]);
  assert.equal(document.getElementById("verticalGapSetting").classList.contains("hidden"), false);
  assert.equal(second.querySelector('[data-role="stackPanel"]').classList.contains('hidden'), false);
  window.setLengthInputMm(document.getElementById('gap'), 12);
  window.setLengthInputMm(document.getElementById('verticalGap'), 7);
  assert.equal(window.readInput().gap, 12);
  assert.equal(window.readInput().verticalGap, 7);
  window.setLengthInputMm(document.getElementById('gap'), 0);
  window.setLengthInputMm(document.getElementById('verticalGap'), 0);
  let role = second.querySelector('[data-field="stackRole"]');
  assert.deepEqual([...role.options].map(option => option.value), ['any', 'base', 'top']);
  role.value = 'top';
  role.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.equal(second.querySelector('.layers-setting').classList.contains('hidden'), true);
  assert.equal(window.readInput().types[1].stackRole, 'top');
  role = second.querySelector('[data-field="stackRole"]');
  role.value = "base";
  role.dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.equal(second.querySelector('.layers-setting').classList.contains('hidden'), false);
  assert.equal(second.querySelectorAll('[data-field="allowAbove"]').length, 2);
  assert.equal(window.readInput().types[1].stackRole, "base");
  secondStacking.checked = false;
  secondStacking.dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.equal(window.readInput().advancedStacking, undefined);
  assert.equal(second.querySelector('[data-role="stackPanel"]').classList.contains('hidden'), true);
  secondStacking.checked = true;
  secondStacking.dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.equal(window.readInput().types[1].stackRole, "base", "OFF/ON retains group configuration");

  window.setLengthInputMm(first.querySelector('[data-field="height"]'), 700);
  first.querySelector('[data-field="quantity"]').value = "20";
  first.querySelector('[data-field="stackingEnabled"]').checked = true;
  first.querySelector('[data-field="stackMaxLayers"]').value = "2";
  window.setLengthInputMm(second.querySelector('[data-field="height"]'), 700);
  second.querySelector('[data-field="quantity"]').value = "20";
  second.dataset.stackRole = "any";
  second.querySelector('[data-field="stackMaxLayers"]').value = "2";
  window.syncAdvancedStackingUI();
  assert.equal(window.calculate(), true);
  await window.loadComposerComputation?.whenIdle();
  const result = window.eval('lastResults.find(result => result.container.id === "20dc")');
  assert.equal(result.advancedStacking, true);
  assert.equal(result.validation.valid, true);
  assert.equal(result.advancedValidation.valid, true);
  assert.equal(result.placedCount, result.floorPlacedCount + result.stackedCount);
  assert.ok(result.stackedCount > 0);
  assert.ok(result.stacks.every(stack => /^P\d\d/.test(stack.positionId)));

  const clone = value => JSON.parse(JSON.stringify(value));
  const original = clone(result);
  const fault = (code, expectedCategory, mutate) => {
    const candidate = clone(original);
    mutate(candidate);
    const verdict = validator.validate(candidate);
    assert.equal(verdict.valid, false, `${code} was not rejected`);
    assert.ok(verdict.errors.some(error => error.code === expectedCategory),
      `${code}: expected ${expectedCategory}, got ${verdict.errors.map(error => error.code).join(', ')}`);
  };
  fault("duplicate", "INVALID_OR_DUPLICATE_REFERENCE", candidate => { candidate.stacks[0].layers[1].id = candidate.stacks[0].layers[0].id; });
  fault("footprint", "STACK_GEOMETRY_MISMATCH", candidate => { candidate.stacks[0].layers[1].width++; });
  fault("height", "STACK_HEIGHT_MISMATCH", candidate => { candidate.stacks[0].height++; });
  fault("counts", "RESULT_COUNT_MISMATCH", candidate => { candidate.placedCount++; });
  fault("roles", "INCOMPATIBLE_ADJACENT_LAYERS", candidate => { candidate.input.types[candidate.stacks[0].layers[1].typeIndex].stackRole = "base"; });
  fault("access", "INDIVIDUAL_ACCESS_FAILURE", candidate => { candidate.container.doorHeight = 1; });
  fault("lost", "LOST_PALLET_REFERENCE", candidate => { candidate.layout.unplaced.pop(); });
  fault("placed-and-unplaced", "UNPLACED_REFERENCE_MISMATCH", candidate => { candidate.layout.unplaced.push(candidate.stacks[0].layers[0]); });
  fault("missing-layer", "STACK_GEOMETRY_MISMATCH", candidate => { candidate.stacks[0].layers[1].layer = 3; });
  fault("top-with-upper", "INVALID_BASE_ROLE", candidate => { candidate.input.types[candidate.stacks[0].rect.typeIndex].stackRole = "top"; });
  fault("stacking-off-upper", "INCOMPATIBLE_ADJACENT_LAYERS", candidate => { candidate.input.types[candidate.stacks[0].layers[1].typeIndex].stackingEnabled = false; });
  fault("adjacency", "INCOMPATIBLE_ADJACENT_LAYERS", candidate => { candidate.input.types[candidate.stacks[0].rect.typeIndex].allowedAbove = []; });
  fault("orientation", "ORIENTATION_OR_FOOTPRINT_MISMATCH", candidate => { const layer = candidate.stacks[0].layers[1]; candidate.input.types[layer.typeIndex].rotationMode = "locked"; candidate.input.types[layer.typeIndex].lockedOrientation = layer.rotated ? "normal" : "rotated"; });
  fault("max-layers", "MAX_LAYERS_EXCEEDED", candidate => { candidate.input.types[candidate.stacks[0].rect.typeIndex].maxLayers = 1; });
  fault("height-plus-one", "STACK_HEIGHT_MISMATCH", candidate => { candidate.container.innerHeight = candidate.stacks[0].height - 1; });
  fault("floor-position", "FLOOR_REFERENCE_MISMATCH", candidate => { candidate.stacks[0].rect.x++; });

  const beforePreview = window.loadComposerDiagnostics.calculationCycles;
  document.getElementById("stackView").value = "2";
  document.getElementById("stackView").dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.equal(window.loadComposerDiagnostics.calculationCycles, beforePreview);
  assert.equal(document.getElementById("stackViewControl").classList.contains("hidden"), false);
  document.getElementById("drawSelect").value = String(window.eval('lastResults.findIndex(item => item.container.id === "40dc")'));
  window.drawSelected();
  window.eval('printDocumentInFrame = html => { window.__printedHtml = html; }');
  for (const view of ["side", "ramp"]) for (const bw of [false, true]) {
    document.getElementById("printView").value = view;
    document.getElementById("printBw").checked = bw;
    for (const [detail, expectedLayers, expectedManifest] of [
      ["standard", false, false], ["layers", true, false], ["complete", true, true]
    ]) {
      document.getElementById("printDetail").value = detail;
      window.printCurrentLayout();
      const content = window.__printedHtml;
      assert.equal(content.includes('class="advanced-layer"'), expectedLayers, `${view}/${bw}/${detail}: plans`);
      assert.equal(content.includes('class="advanced-manifest"'), expectedManifest, `${view}/${bw}/${detail}: manifest`);
    }
  }
  const third = window.addMixedRow({ presetId: "eur", quantity: 33, height: 650 }, { calculate: false });
  first.querySelector('[data-field="quantity"]').value = "33";
  second.querySelector('[data-field="quantity"]').value = "33";
  window.setLengthInputMm(first.querySelector('[data-field="height"]'), 500);
  window.setLengthInputMm(second.querySelector('[data-field="height"]'), 600);
  first.dataset.stackRole = "base";
  first.dataset.allowedAbove = JSON.stringify([second.dataset.rowId]);
  second.dataset.stackRole = "any";
  second.dataset.allowedAbove = JSON.stringify([third.dataset.rowId]);
  third.querySelector('[data-field="stackingEnabled"]').checked = true;
  third.dataset.stackRole = "top";
  first.querySelector('[data-field="stackMaxLayers"]').value = "3";
  window.syncAdvancedStackingUI();
  assert.equal(window.calculate(), true);
  await window.loadComposerComputation?.whenIdle();
  const warehouse = window.eval('lastResults.find(item => item.container.id === "truck-curtain-1360")');
  assert.equal(warehouse.advancedValidation.valid, true);
  assert.equal(warehouse.placedCount, 99);
  assert.ok(warehouse.stackedCount > 0 && warehouse.maxLayersUsed >= 2);
  assert.equal(warehouse.stacks.length, warehouse.floorPlacedCount);
  const winningSignature = JSON.stringify(warehouse.stacks.map(stack => [stack.positionId,
    stack.rect.x, stack.rect.y, stack.layers.map(layer => layer.id)]));
  for (let repeat = 0; repeat < 3; repeat++) {
    assert.equal(window.calculate(), true);
  await window.loadComposerComputation?.whenIdle();
    const repeated = window.eval('lastResults.find(item => item.container.id === "truck-curtain-1360")');
    assert.equal(JSON.stringify(repeated.stacks.map(stack => [stack.positionId,
      stack.rect.x, stack.rect.y, stack.layers.map(layer => layer.id)])), winningSignature,
    `99-pallet result changed on repeat ${repeat}`);
  }
  const warehouseIndex = window.eval('lastResults.findIndex(item => item.container.id === "truck-curtain-1360")');
  document.getElementById("drawSelect").value = String(warehouseIndex);
  window.drawSelected();
  assert.equal(document.getElementById("stackViewControl").classList.contains("hidden"), false);
  const beforeThirdLayer = window.loadComposerDiagnostics.calculationCycles;
  document.getElementById("stackView").value = "3";
  document.getElementById("stackView").dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.equal(window.loadComposerDiagnostics.calculationCycles, beforeThirdLayer);
  for (const detail of ["standard", "layers", "complete"]) {
    document.getElementById("printDetail").value = detail;
    window.printCurrentLayout();
    assert.equal(window.__printedHtml.includes('class="advanced-manifest"'), detail === "complete");
  }
  fs.writeFileSync(path.join(root, "advanced-stacking-operational-results-v1.5.0.json"),
    JSON.stringify({ version: "1.5.0", requested: 99, placed: warehouse.placedCount,
      floor: warehouse.floorPlacedCount, upper: warehouse.stackedCount,
      maxLayers: warehouse.maxLayersUsed, groups: 3,
      printDetails: ["standard", "layers", "complete"] }, null, 2) + "\n");
  document.getElementById("resetBtn").click();
  assert.equal(document.querySelectorAll(".pallet-group").length, 1);
  assert.equal(document.getElementById("stackable").checked, false);
  assert.equal(document.getElementById("verticalGapSetting").classList.contains("hidden"), true);
  assert.equal(document.getElementById('gap').dataset.mm, '0');
  assert.equal(document.getElementById('verticalGap').dataset.mm, '0');
  assert.equal(document.querySelector('[data-role="stackPanel"]').classList.contains('hidden'), true);
  assert.deepEqual(errors, []);
  for (const code of ["it", "en", "de", "es", "fr", "pt", "nl"]) {
    const catalog = JSON.parse(fs.readFileSync(path.join(root, `site/lang/${code}.json`), "utf8"));
    for (const key of ["advanced.role", "advanced.allowedAbove", "advanced.metrics", "advanced.viewLayer", "advanced.printDetail"]) {
      assert.ok(catalog.translations[key], `${code}:${key}`);
    }
  }
  console.log("PASS v1.5 advanced stacking: compatibility, future layers, ranking, 250 matching cases, preservation, 16 validator faults, 99-pallet three-group result/preview/print, 12 print variants and seven locales");
} finally { dom.window.close(); }
