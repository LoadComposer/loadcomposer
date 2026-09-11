import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";
import { launchBrowser } from "./browser-runtime.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const CURRENT = path.join(ROOT, "site/downloads/loadcomposer-v1.4.0-standalone.html");
const BASELINE = path.join(ROOT, "site/downloads/loadcomposer-v1.3.6-standalone.html");
const EVIDENCE = path.join(ROOT, "planner-ux-evidence-v1.4.0");
const RESULT = path.join(ROOT, "planner-ux-results-v1.4.0.json");

function canvasContextStub() {
  return new Proxy({ measureText: text => ({ width: String(text).length * 7 }) }, {
    get(target, property) { return target[property] ?? (() => {}); },
    set(target, property, value) { target[property] = value; return true; }
  });
}

async function loadDom(file, url = "https://loadcomposer.test/") {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", error => errors.push(error));
  const dom = new JSDOM(fs.readFileSync(file, "utf8"), {
    runScripts: "dangerously",
    url,
    virtualConsole,
    beforeParse(window) {
      window.localStorage.setItem("loadcomposer.language", "en");
      window.alert = () => {};
      window.open = () => null;
      window.HTMLCanvasElement.prototype.getContext = () => canvasContextStub();
      window.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,";
    }
  });
  await dom.window.loadComposerI18n.ready;
  await new Promise(resolve => dom.window.setTimeout(resolve, 20));
  if (errors.length) throw errors[0];
  return { dom, window: dom.window, document: dom.window.document };
}

function setGroup(app, group, data) {
  const { window } = app;
  window.selectPresetForGroup(group, data.presetId || "eur", false);
  group.querySelector('[data-field="quantity"]').value = String(data.quantity ?? 1);
  window.setLengthInputMm(group.querySelector('[data-field="height"]'), data.height ?? 1500);
  if ((data.presetId || "eur") === "custom") {
    window.setLengthInputMm(group.querySelector('[data-field="length"]'), data.length ?? 1200);
    window.setLengthInputMm(group.querySelector('[data-field="width"]'), data.width ?? 800);
    group.querySelector('[data-field="customName"]').value = data.customName || "Custom QA";
  }
  group.querySelector('[data-field="identifier"]').value = data.identifier || "";
  const allow = group.querySelector('[data-field="allowRotate"]');
  allow.checked = data.rotation !== "normal" && data.rotation !== "rotated";
  group.querySelectorAll('[data-field="lockedOrientation"]').forEach(radio => {
    radio.checked = radio.value === data.rotation;
  });
  group.dataset.orientationEditing = "false";
  window.updateGroupVisuals(group);
}

function configureCurrent(app, scenario) {
  const { window, document } = app;
  document.getElementById("mixedRows").replaceChildren();
  window.mixedRowCounter = 0;
  setGroup(app, document.getElementById("singlePalletGroup"), scenario.groups[0]);
  scenario.groups.slice(1).forEach(data => {
    const row = window.addMixedRow(data, { calculate: false, open: false });
    setGroup(app, row, data);
  });
  window.syncUnifiedMode({ calculate: false });
  window.setLengthInputMm(document.getElementById("gap"), scenario.gap ?? 0);
  const stackable = document.getElementById("stackable");
  stackable.checked = scenario.groups.length === 1 && Boolean(scenario.stackable);
  document.getElementById("maxLayers").value = String(scenario.maxLayers ?? 2);
  if (scenario.unit) assert.equal(window.requestLengthUnit(scenario.unit), true);
}

function configureBaseline(app, scenario) {
  const { window, document } = app;
  window.setLengthInputMm(document.getElementById("gap"), scenario.gap ?? 0);
  window.setLengthInputMm(document.getElementById("mixedGap"), scenario.gap ?? 0);
  if (scenario.groups.length === 1) {
    document.getElementById("loadMode").value = "single";
    setGroup(app, document.getElementById("singlePalletGroup"), scenario.groups[0]);
  } else {
    document.getElementById("loadMode").value = "mixed";
    document.getElementById("mixedRows").replaceChildren();
    scenario.groups.forEach(data => {
      window.addMixedRow(data, { calculate: false });
      setGroup(app, document.querySelector("#mixedRows .mixed-row:last-child"), data);
    });
  }
  const stackable = document.getElementById("stackable");
  stackable.checked = scenario.groups.length === 1 && Boolean(scenario.stackable);
  document.getElementById("maxLayers").value = String(scenario.maxLayers ?? 2);
  window.setLengthInputMm(document.getElementById("verticalGap"), scenario.verticalGap ?? 0);
  window.syncModeUI({ calculate: false });
  if (scenario.unit) assert.equal(window.requestLengthUnit(scenario.unit), true);
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function engineSignature(app, verticalGap) {
  const input = plain(app.window.eval("readInput()"));
  assert.ok(input, "scenario input must be valid");
  if (verticalGap !== undefined) {
    input.verticalGap = verticalGap;
    app.window.calculateSingle(input);
  } else assert.equal(app.window.calculate(), true);
  const results = plain(app.window.eval(`lastResults.map(result => ({
    id: result.container.id,
    ok: result.ok,
    totalCapacity: result.totalCapacity,
    placedCount: result.placedCount,
    unplacedCount: result.unplacedCount ?? Math.max(0, result.totalItems - result.placedCount),
    usedLength: result.layout.usedLength,
    usedWidth: result.layout.usedWidth,
    rects: result.layout.rects.map(rect => ({
      x: rect.x, y: rect.y, length: rect.length, width: rect.width,
      rotated: rect.rotated, typeIndex: rect.typeIndex ?? null,
      identifier: rect.identifier ?? ""
    }))
  }))`));
  return { input, results };
}

const scenarios = [
  { id: "single-euro-mm", unit: "mm", groups: [{ presetId: "eur", quantity: 11, rotation: "auto" }] },
  { id: "single-industrial-cm", unit: "cm", groups: [{ presetId: "industrial", quantity: 10, rotation: "auto" }] },
  { id: "single-custom-in", unit: "in", gap: 10, groups: [{ presetId: "custom", length: 1050, width: 950, height: 1320, quantity: 4, rotation: "auto", customName: "Custom QA" }] },
  { id: "single-locked-short", groups: [{ presetId: "eur", quantity: 8, rotation: "normal" }] },
  { id: "single-locked-long", groups: [{ presetId: "eur", quantity: 8, rotation: "rotated" }] },
  { id: "mixed-two", groups: [{ presetId: "eur", quantity: 4, rotation: "auto" }, { presetId: "industrial", quantity: 3, rotation: "normal" }] },
  { id: "mixed-three-cm", unit: "cm", groups: [{ presetId: "eur", quantity: 3, rotation: "auto" }, { presetId: "industrial", quantity: 2, rotation: "rotated" }, { presetId: "custom", length: 1000, width: 900, quantity: 2, rotation: "auto" }] },
  { id: "mixed-several-in", unit: "in", groups: [{ presetId: "eur", quantity: 2, rotation: "auto" }, { presetId: "industrial", quantity: 2, rotation: "normal" }, { presetId: "north-american", quantity: 2, rotation: "rotated" }, { presetId: "half-euro", quantity: 2, rotation: "auto" }, { presetId: "custom", length: 980, width: 760, quantity: 2, rotation: "auto" }] },
  { id: "mixed-identifiers", groups: [{ presetId: "eur", quantity: 2, rotation: "auto", identifier: "ITEM-A" }, { presetId: "eur", quantity: 2, rotation: "auto", identifier: "ITEM-B" }] }
];

const current = await loadDom(CURRENT);
try {
  const { document, window } = current;
  assert.equal(document.querySelectorAll("main > section").length, 4, "Load settings, Pallets to load, Results and Load layout must be peers");
  assert.equal(window.getComputedStyle(document.getElementById("loadMode")).display, "none", "explicit mode selector must be hidden");
  assert.equal(document.querySelectorAll(".pallet-group").length, 1);
  assert.equal(document.getElementById("loadMode").value, "single");
  assert.equal(document.getElementById("stackable").disabled, false);

  const first = document.getElementById("singlePalletGroup");
  const disclosure = first.querySelector('[data-action="toggleGroup"]');
  disclosure.click();
  assert.equal(disclosure.getAttribute("aria-expanded"), "false");
  assert.equal(first.querySelector('[data-role="groupBody"]').hidden, true);
  disclosure.click();
  assert.equal(disclosure.getAttribute("aria-expanded"), "true");

  const rotate = first.querySelector('[data-field="allowRotate"]');
  assert.equal(first.querySelector('[data-role="orientationPanel"]').classList.contains("hidden"), true);
  rotate.checked = false;
  rotate.dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.equal(first.querySelector('[data-role="orientationPanel"]').classList.contains("hidden"), false);
  assert.equal(first.querySelector('[data-field="lockedOrientation"]:checked'), null);
  const normal = first.querySelector('[data-field="lockedOrientation"][value="normal"]');
  normal.checked = true;
  normal.dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.equal(first.querySelector('[data-role="orientationPanel"]').classList.contains("hidden"), true);
  assert.equal(first.querySelector('[data-role="orientationSummary"]').classList.contains("hidden"), false);
  assert.equal(document.activeElement.dataset.action, "changeOrientation");
  first.querySelector('[data-action="changeOrientation"]').click();
  assert.equal(first.querySelector('[data-role="orientationPanel"]').classList.contains("hidden"), false);

  window.selectPresetForGroup(first, "asian", false);
  window.updateGroupVisuals(first);
  assert.equal(first.querySelector('[data-role="squareNote"]').classList.contains("hidden"), false);
  assert.equal(first.querySelector('[data-role="orientationPanel"]').classList.contains("hidden"), true);

  window.selectPresetForGroup(first, "custom", false);
  const length = first.querySelector('[data-field="length"]');
  length.value = "";
  length.dataset.mm = "";
  window.updateGroupVisuals(first);
  assert.equal(first.querySelector('[data-role="rotationTitle"]').textContent, window.loadComposerI18n.t("rotation.pendingTitle"));

  window.resetDefaults();
  document.getElementById("stackable").checked = true;
  window.syncStackingControls();
  assert.equal(document.getElementById("maxLayers").disabled, false);
  document.getElementById("addMixedRowBtn").click();
  assert.equal(document.getElementById("loadMode").value, "mixed");
  assert.deepEqual(
    [...document.querySelectorAll('[data-role="groupTitle"]')].map(node => node.textContent),
    ["Pallet group A", "Pallet group B"],
    "operator group headings must use letter references"
  );
  assert.equal(window.groupDisplayCode(0), "A");
  assert.equal(window.groupDisplayCode(25), "Z");
  assert.equal(window.groupDisplayCode(26), "AA");
  assert.equal(window.groupDisplayCode(27), "AB");
  const secondGroup = document.querySelector("#mixedRows .pallet-group");
  const longIdentifier = "OPERATOR-REFERENCE-1234567890123456";
  first.querySelector('[data-field="identifier"]').value = longIdentifier;
  window.updateGroupVisuals(first);
  const summaryText = first.querySelector('[data-role="groupSummary"]').textContent;
  assert.match(summaryText, /^\d+ PLT · \S.+ × \S.+ × H \S.+ mm · /);
  assert.equal(summaryText.endsWith(longIdentifier), true, "identifier must remain at the end of the summary");
  assert.match(first.querySelector('[data-role="groupSummary"]').getAttribute("aria-label"), /pallet/);
  const mixedItems = window.expandMixedItems([
    { presetId: "eur", name: "Euro pallet", identifier: "", length: 1200, width: 800, height: 1500, quantity: 2, rotationMode: "auto", lockedOrientation: "normal" },
    { presetId: "industrial", name: "Industrial pallet", identifier: "", length: 1200, width: 1000, height: 1500, quantity: 1, rotationMode: "auto", lockedOrientation: "normal" }
  ]);
  assert.deepEqual(Array.from(mixedItems, item => item.id), ["1.1", "1.2", "2.1"], "internal rectangle IDs must remain numeric");
  assert.deepEqual(Array.from(mixedItems, window.palletDisplayReference), ["A.1", "A.2", "B.1"], "operator references must use group letters");
  const presentationResult = {
    mode: "mixed",
    input: { types: [mixedItems[0], mixedItems[2]] }
  };
  assert.equal(window.rectReferenceCode(presentationResult, mixedItems[0], 0), "A.1");
  assert.match(window.buildPrintLegend(presentationResult, false), /> A</);
  assert.match(window.buildPrintLegend(presentationResult, false), /> B</);
  assert.equal(secondGroup.querySelector('[data-role="groupTitle"]').textContent, "Pallet group B");
  assert.equal(document.getElementById("stackable").checked, false);
  assert.equal(document.getElementById("stackable").disabled, true);
  assert.equal(document.getElementById("mixedStackNote").classList.contains("hidden"), true);
  assert.equal(document.getElementById("maxLayers").disabled, true);
  document.getElementById("stackingUnavailable").click();
  assert.equal(document.getElementById("mixedStackNote").classList.contains("hidden"), false);
  const stackSurface = window.getComputedStyle(document.getElementById("stackingUnavailable"));
  assert.equal(stackSurface.backgroundColor, "rgba(0, 0, 0, 0)");
  assert.equal(stackSurface.borderTopWidth, "0px");
  assert.equal(stackSurface.boxShadow, "none");
  document.querySelector("#mixedRows [data-action=removeGroup]").click();
  assert.equal(document.getElementById("loadMode").value, "single");
  assert.equal(document.getElementById("stackable").disabled, false);
  assert.equal(document.getElementById("stackable").checked, false);

  const initialMm = Number(document.getElementById("palletHeight").dataset.mm);
  assert.equal(document.querySelectorAll("[data-unit-suffix]").length >= 4, true);
  assert.equal(window.requestLengthUnit("cm"), true);
  assert.equal([...document.querySelectorAll("[data-unit-suffix]")].every(node => node.textContent === "cm"), true);
  assert.equal(window.requestLengthUnit("in"), true);
  assert.equal(window.requestLengthUnit("mm"), true);
  assert.equal(Number(document.getElementById("palletHeight").dataset.mm), initialMm, "unit round trip must preserve integer millimetres");

  const calculationsBeforeFilters = window.loadComposerDiagnostics.calculationCycles;
  document.querySelector('[data-filter-primary="containers"]').click();
  document.querySelector('[data-filter-container="20"]').click();
  assert.equal(document.querySelectorAll("#resultsBody tr:not(.vehicle-group-row)").length, 2);
  assert.equal(document.querySelectorAll("#drawSelect option").length, 2);
  document.querySelector('[data-filter-primary="trailers"]').click();
  assert.equal(document.querySelector("[data-filter-trailer]"), null);
  assert.equal(window.eval("resultFilterSecondary"), "all");
  assert.equal(document.querySelectorAll("#resultsBody tr:not(.vehicle-group-row)").length, 3);
  assert.equal(window.loadComposerDiagnostics.calculationCycles, calculationsBeforeFilters, "filters must not invoke geometry");
  const calculationsBeforePreview = window.loadComposerDiagnostics.calculationCycles;
  document.getElementById("drawSelect").selectedIndex = 1;
  document.getElementById("drawSelect").dispatchEvent(new window.Event("change", { bubbles: true }));
  assert.equal(window.loadComposerDiagnostics.calculationCycles, calculationsBeforePreview, "preview navigation must not invoke geometry");

  window.resetDefaults();
  assert.equal(document.querySelectorAll(".pallet-group").length, 1);
  assert.equal(document.querySelector('[data-filter-primary="all"]').getAttribute("aria-pressed"), "true");
  assert.equal(document.getElementById("stackable").disabled, false);
  assert.equal(document.getElementById("stackable").checked, false);
} finally {
  current.dom.window.close();
}

const parity = [];
for (const scenario of scenarios) {
  const candidate = await loadDom(CURRENT);
  const baseline = await loadDom(BASELINE);
  try {
    configureCurrent(candidate, scenario);
    configureBaseline(baseline, scenario);
    const after = engineSignature(candidate);
    const before = engineSignature(baseline);
    assert.deepEqual(after.input, before.input, `${scenario.id}: engine input changed`);
    assert.deepEqual(after.results, before.results, `${scenario.id}: engine result changed`);
    parity.push({ id: scenario.id, status: "PASS", mode: after.input.mode, unit: scenario.unit || "mm" });
  } finally {
    candidate.dom.window.close();
    baseline.dom.window.close();
  }
}

const requiredKeys = [
  "planner.generalSettings", "planner.palletGroups", "planner.stackingUnavailable",
  "rotation.change", "filters.title", "filters.all", "filters.containers",
  "filters.trailers", "filters.empty", "preview.sectionTitle", "units.inputUnit"
];
const languageIndex = JSON.parse(fs.readFileSync(path.join(ROOT, "site/lang/index.json"), "utf8"));
const languages = languageIndex.languages.filter(item => item.enabled).map(item => item.code);
assert.deepEqual(languages, ["it", "en", "de", "es", "fr", "pt", "nl"]);
for (const code of languages) {
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, `site/lang/${code}.json`), "utf8"));
  for (const key of requiredKeys) assert.ok(catalog.translations[key], `${code}: missing ${key}`);
}

const exampleExpected = new Map([
  ["20ft-euro", ["20dc", 11]], ["20ft-reefer-euro", ["20rf", 10]],
  ["40ft-euro", ["40dc", 25]], ["40ft-hc-euro", ["40hc", 25]],
  ["40ft-reefer-euro", ["40rh", 23]], ["40ft-pallet-wide-euro", ["40hwpw", 30]]
]);
const examples = [];
for (const [id, [containerId, capacity]] of exampleExpected) {
  const app = await loadDom(CURRENT, `https://loadcomposer.test/?example=${id}`);
  try {
    const result = plain(app.window.eval(`lastResults.find(item => item.container.id === ${JSON.stringify(containerId)})`));
    assert.equal(result.totalCapacity, capacity, `${id}: capacity`);
    assert.equal(app.window.loadComposerDiagnostics.exampleCalculations, 1, `${id}: one-shot calculation`);
    app.window.resetDefaults();
    assert.equal(app.document.documentElement.dataset.example, undefined, `${id}: reset must consume example`);
    examples.push({ id, capacity, calculations: 1, status: "PASS" });
  } finally {
    app.dom.window.close();
  }
}


const internalVerticalGap = [];
for (const gap of [0, 20, 40, 100]) {
  const a = await loadDom(CURRENT), b = await loadDom(BASELINE);
  try {
    const scenario = { groups: [{ presetId: "eur", height: 1180, quantity: 20 }], stackable: true, maxLayers: 2 };
    configureCurrent(a, scenario); configureBaseline(b, scenario);
    const after = engineSignature(a, gap), before = engineSignature(b, gap);
    assert.deepEqual(after.input, before.input, `internal vertical gap ${gap}: engine input changed`);
    assert.deepEqual(
      after.results.map(result => ({ id: result.id, totalCapacity: result.totalCapacity })),
      before.results.map(result => ({ id: result.id, totalCapacity: result.totalCapacity })),
      `internal vertical gap ${gap}: stacking capacity changed outside floor-first allocation`
    );
    internalVerticalGap.push({ gap, status: "PASS", capacity20dc: after.results.find(r => r.id === "20dc").totalCapacity });
  } finally { a.window.close(); b.window.close(); }
}
assert.ok(internalVerticalGap[0].capacity20dc > internalVerticalGap[2].capacity20dc, "nonzero gap must still affect stacking at the height boundary");
fs.writeFileSync(RESULT, JSON.stringify({version:"1.4.0", status:"PASS", architecture:{sections:["Load settings","Pallets to load","Results","Load layout"]},parity,languages,examples,internalVerticalGap},null,2)+"\n");
console.log(`Planner UX PASS: ${parity.length} non-stacking/mixed input-result parity scenarios, ${languages.length} locales, ${examples.length} examples, internal vertical gap retained; stacking allocation covered by test:stacking-floor-first.`);
await import("./planner-density-v1.4.0.mjs");

await import("./planner-alignment-v1.4.0.mjs");
await import("./presentation-polish-v1.4.0.mjs");
