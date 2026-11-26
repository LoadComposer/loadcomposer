import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { harness, clone } from "./hotfix-v01-harness-v1.5.0.mjs";
import { distribute, measure } from "../experiments/load-distribution/distribute.mjs";

const app = await harness();
const { w } = app;
const validators = { validateGeometry: w.validateResultGeometry,
  validateAdvanced: w.loadComposerAdvancedStackingValidator.validate };
const closeTo = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
const vehicle = id => clone(w.eval("CONTAINERS").find(item => item.id === id));
const trailer = vehicle("truck-curtain-1360");
Object.assign(trailer, { innerLength: trailer.prudentialLength,
  innerWidth: trailer.prudentialWidth, innerHeight: trailer.prudentialHeight });
const dry = vehicle("40dc");
const euro = { length: 1200, width: 800, height: 600, rotationMode: "auto", lockedOrientation: "normal" };
const single = (quantity, fields = {}) => ({ mode: "single", pallet: euro, quantity, gap: 0,
  verticalGap: 0, stackable: false, maxLayers: 2, ...fields });
const type = (typeIndex, fields) => ({ ...euro, typeIndex, name: `Group ${typeIndex + 1}`,
  stackingEnabled: false, stackRole: "any", maxLayers: 2, allowedAbove: [], ...fields });
const mixed = (types, advancedStacking = false) => ({ mode: "mixed", types, advancedStacking,
  gap: 20, verticalGap: 25, quantity: types.reduce((n, t) => n + t.quantity, 0) });

const advancedInput = mixed([
  type(0, { quantity: 21, stackingEnabled: true, stackRole: "base", allowedAbove: [1] }),
  type(1, { quantity: 19, stackingEnabled: true, stackRole: "top", maxLayers: 1,
    rotationMode: "locked", lockedOrientation: "rotated" })
], true);

const cases = [
  ["21 Euro | semirimorchio", trailer, single(21)],
  ["25 Euro | semirimorchio", trailer, single(25)],
  ["16 Euro | 40’ Dry", dry, single(16)],
  ["Misto | due gruppi", trailer, mixed([type(0, { quantity: 9 }),
    type(1, { quantity: 7, length: 1000, width: 1000, rotationMode: "locked" })])],
  ["Advanced | due gruppi", trailer, advancedInput],
  ["25 Euro | riserva 2 m", trailer, single(25), 2000],
  ["25 Euro | riserva impossibile", trailer, single(25), 9000]
];

function checkMetrics(result, data) {
  const rects = result.layout.rects;
  closeTo(data.zones.reduce((n, z) => n + z.palletEquivalents, 0), result.placedCount);
  closeTo(data.zones.reduce((n, z) => n + z.areaMm2, 0),
    rects.reduce((n, r) => n + r.length * r.width, 0));
  closeTo(data.frontMm + data.spanMm + data.rearMm, result.container.innerLength);
}

const results = [];
try {
  for (const [name, container, input, rearReserveMm = 0] of cases) {
    const original = clone(w.loadComposerComputationCore.one(input, container));
    const snapshot = clone(original);
    assert.ok(validators.validateGeometry(original).valid, name);
    if (input.advancedStacking) {
      assert.ok(original.stacks?.some(stack => stack.layers.length > 1), "actual stacking required");
      assert.ok(validators.validateAdvanced(original).valid);
    }
    const baseline = measure(original);
    checkMetrics(original, baseline);
    const options = { ...validators, rearReserveMm };
    const found = distribute(original, options);
    assert.deepEqual(distribute(original, options), found, "deterministic replay");
    assert.deepEqual(original, snapshot, "canonical bytes/fields untouched");
    if (name.includes("impossibile")) {
      assert.equal(found.status, "no-alternative");
      assert.equal(found.reason, "rear-reserve-unmet");
    } else {
      assert.equal(found.status, "distributed", JSON.stringify({ name, found }));
      const { witness, analysis } = found;
      checkMetrics(witness, analysis);
      assert.equal(witness.placedCount, original.placedCount);
      assert.ok(analysis.rearMm >= rearReserveMm);
      assert.equal(analysis.frontMm, 0);
      assert.deepEqual(analysis.internalGaps, []);
      assert.equal(w.loadComposerComputation.printMatchesCurrentInput(witness), false);
      assert.equal(w.isOperationalPrintAvailable(clone(witness)), false);
      if (baseline.rearMm >= rearReserveMm) assert.ok(analysis.spanMm > baseline.spanMm);
      assert.deepEqual(witness.layout.rects.map(r => r.id ?? r.layoutIndex),
        original.layout.rects.map(r => r.id ?? r.layoutIndex));
      assert.notDeepEqual(witness.layout.rects.map(r => [r.x, r.y, r.rotated]),
        original.layout.rects.map(r => [r.x, r.y, r.rotated]));
      if (original.stacks) {
        const identity = r => r.stacks.map(s => [s.positionId, s.height,
          s.layers.map(l => [l.id, l.typeIndex, l.unitNo, l.layer, l.height])]);
        assert.deepEqual(identity(witness), identity(original));
        assert.ok(validators.validateAdvanced(witness).valid);
        const damaged = clone(witness);
        damaged.stacks[0].layers[0].x += 1;
        assert.equal(validators.validateAdvanced(damaged).valid, false);
      }
    }
    results.push({ name, original, baseline, ...found });
    const expected = [[8400, 13600], [10000, 13600], [9600, 12000], [7760, 13480],
      [13100, 13500], [10000, 11600], [10000, undefined]][results.length - 1];
    assert.deepEqual([baseline.spanMm, found.analysis?.spanMm], expected);
    if (found.witness) {
      const damaged = clone(found.witness);
      Object.assign(damaged.layout.rects[1], { x: damaged.layout.rects[0].x, y: damaged.layout.rects[0].y });
      assert.equal(validators.validateGeometry(damaged).valid, false, "overlap rejected");
    }
    console.log(name, original.placedCount, baseline.spanMm, found.analysis?.spanMm, found.reason, found.search);
  }

  const one = clone(w.loadComposerComputationCore.one(single(1, {
    pallet: { ...euro, rotationMode: "locked" }
  }), trailer));
  const blocked = distribute(one, validators);
  assert.equal(blocked.reason, "no-eligible-extension");
  const bad = clone(one);
  bad.layout.rects[0].x = -10;
  assert.equal(distribute(bad, validators).reason, "invalid-original");
  const incomplete = clone(w.loadComposerComputationCore.one(single(50), trailer));
  assert.equal(distribute(incomplete, validators).reason, "original-incomplete");
  assert.throws(() => distribute(one, { ...validators, rearReserveMm: -1 }), RangeError);

  // Two floor positions, three physical pallets, one crossing a zone boundary.
  const example = { mode: "single", input: { gap: 20, pallet: euro },
    container: { innerLength: 5000, innerWidth: 2450 }, layout: { rects: [
      { x: 0, y: 0, length: 1200, width: 800, stackCount: 2 },
      { x: 1220, y: 0, length: 1200, width: 800, stackCount: 1 }
    ] } };
  const equal = measure(example), weighted = measure(example, (_, layer) => layer === 1 ? 3 : 1);
  closeTo(equal.zones[0].palletEquivalents, 5 / 3);
  closeTo(equal.zones[0].areaMm2, 800_000);
  closeTo(equal.centreMm, (600 * 2 + 1820) / 3);
  closeTo(weighted.centreMm, (600 * 4 + 1820) / 5);
  assert.deepEqual(equal.internalGaps, []);
  assert.ok(equal.lateralGaps.length);
  example.layout.rects[1].x = 1900;
  assert.deepEqual(measure(example).internalGaps, [[1200, 1900]]);
  assert.deepEqual(app.errors, []);
} finally {
  app.close();
}

if (process.argv[2]) {
  await mkdir(process.argv[2], { recursive: true });
  await writeFile(join(process.argv[2], "layout-results.json"), JSON.stringify(results, null, 2) + "\n");
}
console.log("Load distribution spike PASS");
