import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = path.resolve(import.meta.dirname, "..");
const APP = path.join(
  ROOT,
  "site",
  "downloads",
  "loadcomposer-v1.2.1-standalone.html"
);
const OUTPUT = path.join(ROOT, "trailer-prudential-results-v1.2.1.json");

function canvasContextStub() {
  return new Proxy({}, {
    get(target, property) {
      if (!(property in target)) {
        target[property] = property === "measureText"
          ? text => ({ width: String(text).length * 7 })
          : () => {};
      }
      return target[property];
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    }
  });
}

async function loadApp() {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", error => errors.push(error));
  const dom = new JSDOM(fs.readFileSync(APP, "utf8"), {
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

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function countOccurrences(source, needle) {
  if (!needle) return 0;
  return source.split(needle).length - 1;
}

function setSingleCustom(window, {
  length,
  width,
  height,
  quantity = 1,
  rotate = false,
  lockedOrientation = "normal"
}) {
  const document = window.document;
  const group = document.getElementById("singlePalletGroup");
  document.getElementById("loadMode").value = "single";
  document.getElementById("stackable").checked = false;
  window.selectPresetForGroup(group, "custom", false);
  group.querySelector('[data-field="length"]').value = String(length);
  group.querySelector('[data-field="width"]').value = String(width);
  group.querySelector('[data-field="height"]').value = String(height);
  group.querySelector('[data-field="quantity"]').value = String(quantity);
  group.querySelector('[data-field="allowRotate"]').checked = rotate;
  group.querySelector(
    `[data-field="lockedOrientation"][value="${lockedOrientation}"]`
  ).checked = true;
  document.getElementById("gap").value = "0";
  window.calculate();
}

function resultFor(window, vehicle) {
  return window.eval(
    `lastResults.find(result => result.container.id === ${JSON.stringify(vehicle)})`
  );
}

function rowFor(window, vehicle) {
  const results = window.eval("lastResults");
  const index = results.findIndex(result => result.container.id === vehicle);
  assert.notEqual(index, -1, `Missing result for ${vehicle}.`);
  const rows = [...window.document.querySelectorAll("#resultsBody tr")]
    .filter(row => !row.classList.contains("vehicle-group-row"));
  return rows[index];
}

function axisIssues(result, axis) {
  return result.spaceAlert.prudentialIssues.filter(issue => issue.axis === axis);
}

function verifyRenderedAlert(window, result, vehicle, expectedBadgeCount) {
  const row = rowFor(window, vehicle);
  assert.equal(
    row.querySelectorAll(".badge.verify").length,
    expectedBadgeCount,
    `${vehicle}: unexpected VERIFICA MISURE badge count.`
  );
  const html = row.textContent;
  const plainText = window.spaceAlertPlainText(result);
  for (const issue of result.spaceAlert.prudentialIssues) {
    assert.equal(countOccurrences(html, issue.message), 1, `${vehicle}: duplicated UI issue.`);
    assert.equal(countOccurrences(plainText, issue.message), 1, `${vehicle}: duplicated print issue.`);
  }
}

function snapshot(result) {
  return {
    ok: result.ok,
    placedCount: result.placedCount,
    totalCapacity: result.totalCapacity,
    usedLength: result.layout.usedLength,
    usedWidth: result.layout.usedWidth,
    usedHeight: result.input.pallet.height,
    verificationIssues: plain(result.spaceAlert.verificationIssues),
    conservativeIssues: plain(result.spaceAlert.conservativeIssues),
    prudentialIssues: plain(result.spaceAlert.prudentialIssues)
  };
}

const dom = await loadApp();
const { window } = dom;
const checks = [];

function runScenario({
  id,
  vehicle,
  input,
  ok,
  axis = null,
  prudentialCount = 0,
  conservativeCount = 0,
  placedCount = null
}) {
  setSingleCustom(window, input);
  const result = resultFor(window, vehicle);
  assert.equal(result.ok, ok, `${id}: geometric status.`);
  assert.equal(
    result.spaceAlert.conservativeIssues.length,
    conservativeCount,
    `${id}: conservativeIssues.`
  );
  if (axis) {
    assert.equal(axisIssues(result, axis).length, prudentialCount, `${id}: ${axis} issue count.`);
  } else {
    assert.equal(result.spaceAlert.prudentialIssues.length, prudentialCount, `${id}: prudentialIssues.`);
  }
  if (placedCount !== null) {
    assert.equal(result.placedCount, placedCount, `${id}: placed count.`);
  }
  verifyRenderedAlert(
    window,
    result,
    vehicle,
    result.spaceAlert.level === "verification" ? 1 : 0
  );
  checks.push({ id, vehicle, ...snapshot(result), status: "PASS" });
  return result;
}

const profiles = plain(window.eval("CONTAINERS"));
const curtain = profiles.find(item => item.id === "truck-curtain-1360");
const mega = profiles.find(item => item.id === "truck-mega-1360");
const reefer = profiles.find(item => item.id === "truck-reefer-1360");

assert.deepEqual(
  {
    innerLength: curtain.innerLength,
    innerWidth: curtain.innerWidth,
    innerHeight: curtain.innerHeight,
    prudentialLength: curtain.prudentialLength,
    prudentialWidth: curtain.prudentialWidth,
    prudentialHeight: curtain.prudentialHeight
  },
  {
    innerLength: 13620,
    innerWidth: 2480,
    innerHeight: 2650,
    prudentialLength: 13600,
    prudentialWidth: 2450,
    prudentialHeight: 2600
  }
);
assert.equal("minHeight" in curtain, false);
assert.equal("maxHeight" in curtain, false);

assert.deepEqual(
  {
    innerLength: mega.innerLength,
    innerWidth: mega.innerWidth,
    innerHeight: mega.innerHeight,
    prudentialLength: mega.prudentialLength,
    prudentialWidth: mega.prudentialWidth,
    prudentialHeight: mega.prudentialHeight
  },
  {
    innerLength: 13620,
    innerWidth: 2480,
    innerHeight: 3000,
    prudentialLength: 13600,
    prudentialWidth: 2450,
    prudentialHeight: 2900
  }
);
assert.equal("minHeight" in mega, false);
assert.equal("maxHeight" in mega, false);
assert.equal(Object.values(mega).includes(2845), false);
assert.equal(Object.values(mega).includes(3200), false);

assert.deepEqual(
  {
    innerLength: reefer.innerLength,
    innerWidth: reefer.innerWidth,
    innerHeight: reefer.innerHeight,
    prudentialLength: reefer.prudentialLength,
    prudentialWidth: reefer.prudentialWidth,
    prudentialHeight: reefer.prudentialHeight
  },
  {
    innerLength: 13310,
    innerWidth: 2460,
    innerHeight: 2650,
    prudentialLength: 13300,
    prudentialWidth: 2460,
    prudentialHeight: 2600
  }
);
assert.equal("minLength" in reefer, false);
assert.equal("minHeight" in reefer, false);
checks.push({ id: "profile-validation", status: "PASS" });

for (const [height, ok, count] of [
  [2599, true, 0],
  [2600, true, 1],
  [2601, true, 1],
  [2651, false, 0]
]) {
  runScenario({
    id: `curtain-height-${height}`,
    vehicle: "truck-curtain-1360",
    input: { length: 1000, width: 1000, height },
    ok,
    axis: "height",
    prudentialCount: count
  });
}

for (const [height, ok, count] of [
  [2850, true, 0],
  [2899, true, 0],
  [2900, true, 1],
  [3001, false, 0]
]) {
  runScenario({
    id: `mega-height-${height}`,
    vehicle: "truck-mega-1360",
    input: { length: 1000, width: 1000, height },
    ok,
    axis: "height",
    prudentialCount: count
  });
}

for (const [height, count] of [
  [2599, 0],
  [2600, 1],
  [2631, 1]
]) {
  runScenario({
    id: `reefer-height-${height}`,
    vehicle: "truck-reefer-1360",
    input: { length: 1000, width: 1000, height },
    ok: true,
    axis: "height",
    prudentialCount: count
  });
}

for (const [length, ok, count] of [
  [13299, true, 0],
  [13300, true, 1],
  [13310, true, 1],
  [13311, false, 0]
]) {
  runScenario({
    id: `reefer-length-${length}`,
    vehicle: "truck-reefer-1360",
    input: { length, width: 1231, height: 1000 },
    ok,
    axis: "length",
    prudentialCount: count
  });
}

for (const [vehicle, height] of [["20rf", 2168], ["40rh", 2416]]) {
  const result = runScenario({
    id: `${vehicle}-conservative-height`,
    vehicle,
    input: { length: 1000, width: 1000, height },
    ok: true,
    prudentialCount: 0,
    conservativeCount: 1
  });
  assert.match(result.spaceAlert.conservativeIssues[0], /minim|minimum|Mindest/i);
}

function synthetic(height) {
  const container = {
    id: "synthetic-precedence",
    innerLength: 5000,
    innerWidth: 2500,
    innerHeight: 2700,
    minHeight: 2500,
    prudentialHeight: 2600,
    accessKnown: false
  };
  return window.evaluateSpaceAlert({
    mode: "single",
    container,
    layout: {
      usedLength: 1000,
      usedWidth: 1000,
      rects: [{ x: 0, y: 0, length: 1000, width: 1000 }]
    },
    input: { pallet: { height }, quantity: 1, verticalGap: 0 },
    layers: 1,
    loadLayers: 1,
    floorCapacity: 1,
    fitsQtyBySpace: true,
    okDoor: true,
    okHeight: true,
    ok: true
  });
}

const precedence2550 = synthetic(2550);
assert.equal(precedence2550.conservativeIssues.length, 0);
assert.equal(precedence2550.prudentialIssues.length, 0);
const precedence2600 = synthetic(2600);
assert.equal(precedence2600.conservativeIssues.length, 0);
assert.equal(precedence2600.prudentialIssues.length, 1);
assert.equal(precedence2600.prudentialIssues[0].axis, "height");
checks.push({
  id: "synthetic-precedence",
  at2550: plain(precedence2550),
  at2600: plain(precedence2600),
  status: "PASS"
});

for (const [id, vehicle, quantity, expectedOk, expectedPlaced, expectedLengthIssue] of [
  ["curtain-33-eur", "truck-curtain-1360", 33, true, 33, 0],
  ["curtain-34-eur", "truck-curtain-1360", 34, true, 34, 1],
  ["mega-33-eur", "truck-mega-1360", 33, true, 33, 0],
  ["mega-34-eur", "truck-mega-1360", 34, true, 34, 1],
  ["reefer-33-eur", "truck-reefer-1360", 33, true, 33, 0],
  ["reefer-34-eur", "truck-reefer-1360", 34, false, 33, 0]
]) {
  runScenario({
    id,
    vehicle,
    input: { length: 1200, width: 800, height: 1500, quantity, rotate: true },
    ok: expectedOk,
    axis: "length",
    prudentialCount: expectedLengthIssue,
    placedCount: expectedPlaced
  });
}

runScenario({
  id: "reefer-26-industrial",
  vehicle: "truck-reefer-1360",
  input: { length: 1200, width: 1000, height: 1500, quantity: 26, rotate: true },
  ok: true,
  axis: "length",
  prudentialCount: 0,
  placedCount: 26
});

for (const [length, count] of [[13599, 0], [13600, 1]]) {
  runScenario({
    id: `curtain-length-${length}`,
    vehicle: "truck-curtain-1360",
    input: { length, width: 1241, height: 1000 },
    ok: true,
    axis: "length",
    prudentialCount: count
  });
}

runScenario({
  id: "curtain-34-custom-802",
  vehicle: "truck-curtain-1360",
  input: {
    length: 1200,
    width: 802,
    height: 1500,
    quantity: 34,
    rotate: false,
    lockedOrientation: "rotated"
  },
  ok: false,
  prudentialCount: 0,
  placedCount: 32
});

fs.writeFileSync(OUTPUT, `${JSON.stringify({
  version: "1.2.1",
  source: path.relative(ROOT, APP),
  checks,
  status: "PASS"
}, null, 2)}\n`, "utf8");

console.log(`Trailer prudential alerts: ${checks.length}/${checks.length} PASS`);
dom.window.close();
