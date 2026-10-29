import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { JSDOM, VirtualConsole } from "jsdom";

const root = path.resolve(import.meta.dirname, "..");
const output = path.join(root, "advanced-stacking-performance-results-v1.5.0.json");
const errors = [];
const consoleProxy = new VirtualConsole();
consoleProxy.on("jsdomError", error => errors.push(error));
const dom = new JSDOM(fs.readFileSync(path.join(root, "site/downloads/loadcomposer-v1.5.0-standalone.html"), "utf8"), {
  runScripts: "dangerously", url: "https://loadcomposer.benchmark.test/", virtualConsole: consoleProxy,
  beforeParse(window) {
    window.localStorage.setItem("loadcomposer.language", "en");
    window.HTMLCanvasElement.prototype.getContext = () => new Proxy({ measureText: text => ({ width: String(text).length * 7 }) },
      { get: (object, key) => object[key] ?? (() => {}) });
    window.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,";
  }
});
try {
  await dom.window.loadComposerI18n.ready;
  await new Promise(resolve => dom.window.setTimeout(resolve, 0));
  assert.deepEqual(errors, []);
  const { window } = dom;
  const vehicle = window.eval('CONTAINERS.find(container => container.id === "20dc")');
  const profiles = {
    compatible: quantity => [
      { quantity: Math.ceil(quantity / 2), length: 1200, width: 800, height: 600,
        stackingEnabled: true, stackRole: "base", maxLayers: 3, allowedAbove: [0, 1] },
      { quantity: Math.floor(quantity / 2), length: 1200, width: 800, height: 600,
        stackingEnabled: true, stackRole: "any", maxLayers: 3, allowedAbove: [0, 1] }
    ],
    incompatible: quantity => [
      { quantity: Math.ceil(quantity / 2), length: 1200, width: 800, height: 600,
        stackingEnabled: true, stackRole: "base", maxLayers: 3, allowedAbove: [] },
      { quantity: Math.floor(quantity / 2), length: 1200, width: 800, height: 600,
        stackingEnabled: true, stackRole: "top", maxLayers: 1, allowedAbove: [] }
    ],
    mixedDeep: quantity => {
      const sizes = [[1200, 800], [1200, 800], [1200, 1000], [1200, 1000], [800, 600]];
      return sizes.map(([length, width], index) => ({
        quantity: Math.floor(quantity / 5) + (index < quantity % 5 ? 1 : 0),
        length, width, height: 450 + index * 35,
        stackingEnabled: true, stackRole: index === 0 || index === 2 ? "base" : index === 4 ? "top" : "any",
        maxLayers: 4, allowedAbove: index < 2 ? [0, 1] : index < 4 ? [2, 3] : []
      }));
    }
  };
  const rows = [];
  function solve(quantity, profile, vehicle, types, verticalGap = 25) {
    const input = { mode: "mixed", advancedStacking: true, types, quantity, gap: 0, verticalGap };
    const items = window.expandMixedItems(types);
    const started = performance.now();
    const result = window.loadComposerAdvancedStacking.solve(vehicle, items, input, {
      bestMixedLayout: window.bestMixedLayout, packItems: window.packItems,
      frontCompactSelectedLayout: window.frontCompactSelectedLayout, seededShuffle: window.seededShuffle
    });
    const solverMs = performance.now() - started;
    const checkedAt = performance.now();
    const verdict = result.stacks ? window.loadComposerAdvancedStackingValidator.validate({
      input, container: vehicle, layout: result.layout, stacks: result.stacks,
      placedCount: result.placedCount, floorPlacedCount: result.floorPlacedCount,
      stackedCount: result.stackedCount, maxLayersUsed: result.maxLayersUsed,
      mixedGroupStacks: result.mixedGroupStacks
    }) : { valid: true };
    const validatorMs = performance.now() - checkedAt;
    assert.equal(verdict.valid, true, `${quantity}/${profile}: ${JSON.stringify(verdict.errors)}`);
    rows.push({ quantity, profile, vehicle: vehicle.id, placed: result.placedCount ?? result.layout.count,
      floor: result.floorPlacedCount ?? result.layout.count, attempts: result.diagnostics.floorAttempts,
      candidates: result.diagnostics.candidates, strategies: result.diagnostics.strategies,
      solverMs: Number(solverMs.toFixed(2)), validatorMs: Number(validatorMs.toFixed(2)),
      rssMiB: Number((process.memoryUsage().rss / 1048576).toFixed(1)) });
    return result;
  }
  for (const quantity of [100, 200, 300, 500]) for (const [profile, factory] of Object.entries(profiles)) {
    const types = factory(quantity).map((type, typeIndex) => ({ ...type, typeIndex,
      name: `Group ${typeIndex}`, identifier: "", rotationMode: "auto", lockedOrientation: "normal" }));
    solve(quantity, profile, vehicle, types);
  }
  const truck = window.eval('CONTAINERS.find(container => container.id === "truck-curtain-1360")');
  const denseTypes = [0, 1].map(typeIndex => ({ typeIndex, quantity: 250, length: 400, width: 400,
    height: 500, name: `Dense ${typeIndex}`, identifier: "", rotationMode: "auto", lockedOrientation: "normal",
    stackingEnabled: true, stackRole: "any", maxLayers: 3, allowedAbove: [0, 1] }));
  const dense = solve(500, "dense500", truck, denseTypes);
  assert.equal(dense.placedCount, 500, "dense 500-pallet load should fit in three layers");
  fs.writeFileSync(output, JSON.stringify({ version: "1.5.0", rows }, null, 2) + "\n");
  console.log(`PASS advanced stacking benchmark: ${rows.length} scenarios; worst solver ${Math.max(...rows.map(row => row.solverMs))} ms`);
} finally { dom.window.close(); }
