import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launchBrowser } from "./browser-runtime.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const ONLINE = path.join(ROOT, "site/index.html");
const CURRENT = path.join(ROOT, "site/downloads/loadcomposer-v1.4.0-standalone.html");
const BASELINE = path.resolve(
  ROOT,
  process.env.LOADCOMPOSER_STACKING_BASELINE ||
    "site/downloads/loadcomposer-v1.3.6-standalone.html"
);
const EVIDENCE = path.resolve(
  ROOT,
  process.env.LOADCOMPOSER_STACKING_VISUAL_EVIDENCE ||
    "stacking-preview-evidence-v1.4.0"
);
const RESULT = path.resolve(
  ROOT,
  process.env.LOADCOMPOSER_STACKING_VISUAL_RESULT ||
    "stacking-preview-visual-results-v1.4.0.json"
);

fs.rmSync(EVIDENCE, { recursive: true, force: true });
fs.mkdirSync(EVIDENCE, { recursive: true });

const browser = await launchBrowser(ROOT);
const captures = [];
const previewStates = [];
const freshDefaults = [];

function assertInitialMarkup(file, label) {
  const html = fs.readFileSync(file, "utf8");
  const toggle = html.match(/<input\s+id="printBw"[^>]*>/)?.[0] || "";
  const stage = html.match(/<div\s+id="previewStage"[^>]*>/)?.[0] || "";
  assert.ok(toggle, `${label}: printBw markup missing`);
  assert.doesNotMatch(toggle, /\schecked(?:\s|=|>)/i, `${label}: printBw is checked in initial markup`);
  assert.match(stage, /data-preview-mode="colour"/, `${label}: previewStage markup is not colour`);
}

assertInitialMarkup(ONLINE, "online source");
assertInitialMarkup(CURRENT, "generated standalone");

async function open(file = CURRENT, preference = "light", systemTheme = preference === "dark" ? "dark" : "light", search = "") {
  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    colorScheme: systemTheme
  });
  await page.addInitScript(value => {
    localStorage.setItem("loadcomposer.language", "en");
    localStorage.setItem("loadcomposer.theme", value);
  }, preference);
  const target = pathToFileURL(file);
  target.search = search;
  await page.goto(target.href, { waitUntil: "load" });
  await page.waitForFunction(() => typeof lastResults !== "undefined" && lastResults.length > 0);
  return page;
}

async function setScenario(page, { vehicleId, quantity, height, maxLayers, stackable = true }) {
  await page.evaluate(({ vehicleId, quantity, height, maxLayers, stackable }) => {
    calculateSingle({
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
      verticalGap: 0
    });
    selectedContainerId = vehicleId;
    renderDrawOptions();
    drawSelected();
  }, { vehicleId, quantity, height, maxLayers, stackable });
}

async function capture(page, name, selector) {
  await page.locator(selector).scrollIntoViewIfNeeded();
  await page.locator(selector).screenshot({ path: path.join(EVIDENCE, `${name}.png`) });
  captures.push({ name, selector });
}

async function printCanvas(page, input, bwMode = true) {
  await page.evaluate(data => {
    calculateSingle(data);
    selectedContainerId = "20dc";
    renderDrawOptions();
    drawSelected();
  }, input);
  return page.evaluate(selectedBw => {
    const result = lastResults.find(item => item.container.id === "20dc");
    const dataUrl = getPrintSchemaDataUrl(result, "side", selectedBw);
    const pixel = Array.from(document.getElementById("layoutCanvas")
      .getContext("2d").getImageData(0, 0, 1, 1).data);
    return { dataUrl, pixel };
  }, bwMode);
}

async function freshState(page) {
  return page.evaluate(() => {
    const toggle = document.getElementById("printBw");
    const stage = document.getElementById("previewStage");
    const palette = canvasPreviewPalette({ bwMode: toggle.checked, forPrint: false });
    return {
      checked: toggle.checked,
      mode: stage.dataset.previewMode,
      resolvedTheme: document.documentElement.dataset.theme,
      preference: document.documentElement.dataset.themePreference,
      palletNormal: palette.palletNormal,
      palletRotated: palette.palletRotated,
      calculationCycles: window.loadComposerDiagnostics.calculationCycles,
      exampleCalculations: window.loadComposerDiagnostics.exampleCalculations,
      storageKeys: Object.keys(localStorage).sort()
    };
  });
}

async function assertFreshColour(page, label, expectedTheme) {
  const state = await freshState(page);
  assert.equal(state.checked, false, `${label}: Black & white is initially checked`);
  assert.equal(state.mode, "colour", `${label}: preview does not start in colour`);
  assert.equal(state.resolvedTheme, expectedTheme, `${label}: resolved theme`);
  assert.notEqual(state.palletNormal.toLowerCase(), "#ffffff", `${label}: initial pallet is monochrome white`);
  assert.equal(state.storageKeys.some(key => /black|white|bw/i.test(key)), false, `${label}: B/W persistence key exists`);
  return state;
}

async function previewSnapshot(page, bwMode) {
  await page.evaluate(value => {
    const toggle = document.getElementById("printBw");
    toggle.checked = value;
    toggle.dispatchEvent(new Event("change", { bubbles: true }));
  }, bwMode);
  await page.waitForTimeout(220);
  return page.evaluate(value => {
    const canvas = document.getElementById("layoutCanvas");
    const stage = document.getElementById("previewStage");
    const context = canvas.getContext("2d");
    const stageStyle = getComputedStyle(stage);
    const stageRect = stage.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const palette = canvasPreviewPalette({ bwMode: value, forPrint: false });
    const colourToRgba = colour => {
      const probe = document.createElement("canvas").getContext("2d");
      probe.fillStyle = colour;
      probe.fillRect(0, 0, 1, 1);
      return Array.from(probe.getImageData(0, 0, 1, 1).data);
    };
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const floorTarget = colourToRgba(palette.floor);
    let floorPixel = null;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index] === floorTarget[0] && pixels[index + 1] === floorTarget[1] &&
          pixels[index + 2] === floorTarget[2] && pixels[index + 3] === floorTarget[3]) {
        floorPixel = Array.from(pixels.slice(index, index + 4));
        break;
      }
    }
    return {
      resolvedTheme: document.documentElement.dataset.theme,
      mode: stage.dataset.previewMode,
      palette,
      stage: {
        backgroundColor: stageStyle.backgroundColor,
        borderColor: stageStyle.borderColor,
        padding: stageStyle.padding,
        gutterLeft: canvasRect.left - stageRect.left,
        gutterTop: canvasRect.top - stageRect.top
      },
      canvas: {
        width: canvas.width,
        height: canvas.height,
        cssWidth: canvasRect.width,
        cssHeight: canvasRect.height,
        outerPixel: Array.from(context.getImageData(0, 0, 1, 1).data),
        floorPixel,
        checksum: canvas.toDataURL()
      },
      selectedContainerId,
      viewMode: document.getElementById("printView").value,
      calculationCycles: window.loadComposerDiagnostics.calculationCycles
    };
  }, bwMode);
}

try {
  const freshMatrix = [
    [ONLINE, "light", "light", "fresh-online-light-colour"],
    [ONLINE, "dark", "dark", "fresh-online-dark-colour"],
    [ONLINE, "auto", "dark", "fresh-online-auto-dark-colour"],
    [CURRENT, "light", "light", "fresh-standalone-light-colour"],
    [CURRENT, "dark", "dark", "fresh-standalone-dark-colour"]
  ];
  for (const [file, preference, systemTheme, name] of freshMatrix) {
    const freshPage = await open(file, preference, systemTheme);
    const state = await assertFreshColour(freshPage, name, systemTheme);
    freshDefaults.push({ name, file: path.basename(file), ...state });
    await capture(freshPage, name, "#layoutSection");
    await freshPage.close();
  }

  const examples = new Map([
    ["20ft-euro", ["20dc", 11]],
    ["20ft-reefer-euro", ["20rf", 10]],
    ["40ft-euro", ["40dc", 25]],
    ["40ft-hc-euro", ["40hc", 25]],
    ["40ft-reefer-euro", ["40rh", 23]],
    ["40ft-pallet-wide-euro", ["40hwpw", 30]]
  ]);
  for (const [example, [containerId, expectedCapacity]] of examples) {
    const examplePage = await open(ONLINE, "dark", "dark", `?example=${example}`);
    const state = await assertFreshColour(examplePage, `example ${example}`, "dark");
    const result = await examplePage.evaluate(id => {
      const match = lastResults.find(item => item.container.id === id);
      return { capacity: match.totalCapacity, exampleCalculations: window.loadComposerDiagnostics.exampleCalculations };
    }, containerId);
    assert.equal(result.capacity, expectedCapacity, `${example}: capacity`);
    assert.equal(result.exampleCalculations, 1, `${example}: automatic calculation count`);
    freshDefaults.push({ name: `example-${example}`, ...state, capacity: result.capacity });
    await examplePage.close();
  }

  const persistencePage = await open(ONLINE, "dark", "dark");
  await assertFreshColour(persistencePage, "persistence source tab", "dark");
  const bwSession = await previewSnapshot(persistencePage, true);
  await setScenario(persistencePage, { vehicleId: "20dc", quantity: 2, height: 1000, maxLayers: 2 });
  const retainedAfterEdit = await freshState(persistencePage);
  assert.equal(retainedAfterEdit.checked, true, "manual B/W choice was lost after an input/calculation update");
  assert.equal(retainedAfterEdit.mode, "bw", "manual B/W preview mode was lost after an input/calculation update");
  await persistencePage.evaluate(() => document.querySelector('[data-theme-value="light"]').click());
  const retainedAfterTheme = await freshState(persistencePage);
  assert.equal(retainedAfterTheme.checked, true, "manual B/W choice was lost after theme change");
  assert.equal(retainedAfterTheme.mode, "bw", "manual B/W mode was lost after theme change");
  assert.equal(retainedAfterTheme.resolvedTheme, "light", "theme did not change while B/W was active");

  const newTab = await open(ONLINE, "dark", "dark");
  const newTabState = await assertFreshColour(newTab, "new tab after manual B/W", "dark");
  assert.equal(newTabState.calculationCycles, 1, "new tab initialization cycle count");
  assert.equal(bwSession.calculationCycles, retainedAfterEdit.calculationCycles, "B/W state changed calculation cycles before input edit");
  await newTab.close();
  await persistencePage.close();

  const themePage = await open(ONLINE, "light", "light");
  await assertFreshColour(themePage, "theme transition start", "light");
  for (const theme of ["dark", "light", "auto"]) {
    await themePage.evaluate(value => document.querySelector(`[data-theme-value="${value}"]`).click(), theme);
    const state = await freshState(themePage);
    assert.equal(state.checked, false, `${theme}: theme change enabled B/W`);
    assert.equal(state.mode, "colour", `${theme}: theme change left colour mode`);
  }
  await themePage.close();

  const page = await open();
  const resultCases = [
    ["results-fridge-h1500-q33", "truck-reefer-1360", 33, 1500, 2],
    ["results-fridge-h1500-q34", "truck-reefer-1360", 34, 1500, 2],
    ["results-fridge-h500-q66", "truck-reefer-1360", 66, 500, 2],
    ["results-fridge-h500-q67", "truck-reefer-1360", 67, 500, 2],
    ["results-mega-h1000-q100-max20", "truck-mega-1360", 100, 1000, 20],
    ["results-fridge-h1000-q100-max20", "truck-reefer-1360", 100, 1000, 20],
    ["results-mega-h1000-q100-max2", "truck-mega-1360", 100, 1000, 2]
  ];
  for (const [name, vehicleId, quantity, height, maxLayers] of resultCases) {
    await setScenario(page, { vehicleId, quantity, height, maxLayers });
    await capture(page, name, "#resultsSection");
  }
  await setScenario(page, { vehicleId: "20dc", quantity: 1, height: 1000, maxLayers: 7 });
  await capture(page, "results-stacking-capacity-22-q1", "#resultsSection");
  await setScenario(page, { vehicleId: "20dc", quantity: 16, height: 1000, maxLayers: 2, stackable: false });
  await capture(page, "results-non-stacking-capacity-11-q16", "#resultsSection");
  await setScenario(page, { vehicleId: "40dc", quantity: 16, height: 1000, maxLayers: 2, stackable: false });
  await capture(page, "results-non-stacking-capacity-25-q16", "#resultsSection");
  for (const quantity of [34, 35, 68]) {
    await setScenario(page, { vehicleId: "truck-mega-1360", quantity, height: 1500, maxLayers: 2 });
    const snapshot = await page.evaluate(() => {
      const result = lastResults.find(item => item.container.id === "truck-mega-1360");
      return {
        floorPositions: result.layout.rects.length,
        stackCounts: result.layout.stackCounts,
        usedLayers: result.loadLayers
      };
    });
    assert.equal(snapshot.floorPositions, 34, `Mega Q${quantity}: preview floor positions`);
    const expected = quantity === 34
      ? Array(34).fill(1)
      : quantity === 35
        ? [2, ...Array(33).fill(1)]
        : Array(34).fill(2);
    assert.deepEqual(snapshot.stackCounts, expected, `Mega Q${quantity}: preview stack counts`);
    await capture(page, `preview-mega-h1500-q${quantity}`, "#layoutSection");
  }
  await page.close();

  for (const [preference, systemTheme, bw, name] of [
    ["light", "light", false, "screen-light-colour"],
    ["light", "light", true, "screen-light-bw"],
    ["dark", "dark", false, "screen-dark-colour"],
    ["dark", "dark", true, "screen-dark-bw"],
    ["auto", "dark", true, "screen-auto-dark-bw"]
  ]) {
    const previewPage = await open(CURRENT, preference, systemTheme);
    await setScenario(previewPage, { vehicleId: "20dc", quantity: 1, height: 1000, maxLayers: 2 });
    const state = await previewSnapshot(previewPage, bw);
    assert.equal(state.resolvedTheme, systemTheme, `${name}: resolved theme`);
    assert.equal(state.mode, bw ? "bw" : "colour", `${name}: preview-stage mode`);
    assert.equal(state.stage.backgroundColor, "rgba(0, 0, 0, 0)", `${name}: preview-stage background`);
    assert.equal(state.stage.padding, "0px", `${name}: preview-stage padding`);
    assert.ok(state.stage.gutterLeft <= 1 && state.stage.gutterTop <= 1, `${name}: preview-stage gutter`);
    assert.ok(state.canvas.floorPixel, `${name}: representative empty floor pixel missing`);
    if (preference === "light" && bw) assert.equal(state.palette.background, "#ffffff");
    previewStates.push({ preference, systemTheme, bw, name, ...state });
    await capture(previewPage, name, "#previewStage");
    if (preference === "dark" && bw) {
      await capture(previewPage, "screen-dark-bw-layout-section", "#layoutSection");
    }
    await previewPage.close();
  }

  const byName = Object.fromEntries(previewStates.map(state => [state.name, state]));
  const darkColour = byName["screen-dark-colour"];
  const darkBw = byName["screen-dark-bw"];
  const autoDarkBw = byName["screen-auto-dark-bw"];
  for (const key of ["background", "floor", "ink", "grid"]) {
    assert.equal(darkBw.palette[key], darkColour.palette[key], `Dark+B/W ${key} changed`);
    assert.equal(autoDarkBw.palette[key], darkColour.palette[key], `Auto→Dark+B/W ${key} changed`);
  }
  assert.deepEqual(darkBw.stage, darkColour.stage, "Dark+B/W preview wrapper changed");
  assert.deepEqual(darkBw.canvas.outerPixel, darkColour.canvas.outerPixel, "Dark+B/W outer pixel changed");
  assert.deepEqual(darkBw.canvas.floorPixel, darkColour.canvas.floorPixel, "Dark+B/W empty-floor pixel changed");
  assert.notEqual(darkBw.canvas.checksum, darkColour.canvas.checksum, "Dark+B/W pallet rendering did not change");

  for (const [file, label] of [[CURRENT, "standalone"], [path.join(ROOT, "site/index.html"), "online"]]) {
    const togglePage = await open(file, "dark", "dark");
    await setScenario(togglePage, { vehicleId: "20dc", quantity: 1, height: 1000, maxLayers: 2 });
    const before = await previewSnapshot(togglePage, false);
    const monochrome = await previewSnapshot(togglePage, true);
    const restored = await previewSnapshot(togglePage, false);
    for (const key of ["background", "floor", "ink", "grid"]) {
      assert.equal(monochrome.palette[key], before.palette[key], `${label}: B/W ${key}`);
    }
    assert.deepEqual(monochrome.canvas.outerPixel, before.canvas.outerPixel, `${label}: outer background pixel`);
    assert.deepEqual(monochrome.canvas.floorPixel, before.canvas.floorPixel, `${label}: empty-floor pixel`);
    assert.notEqual(monochrome.canvas.checksum, before.canvas.checksum, `${label}: pallet appearance unchanged`);
    assert.deepEqual(restored, before, `${label}: OFF→ON→OFF did not restore exact screen state`);
    assert.equal(monochrome.calculationCycles, before.calculationCycles, `${label}: B/W caused calculation`);
    await togglePage.close();
  }

  const printInput = {
    mode: "single",
    pallet: { presetId: "eur", name: "Euro pallet", identifier: "", length: 1200, width: 800, height: 1500, rotationMode: "auto", lockedOrientation: "normal" },
    quantity: 10,
    gap: 0,
    stackable: false,
    maxLayers: 2,
    verticalGap: 0
  };
  const printLightPage = await open(CURRENT, "light");
  const printDarkPage = await open(CURRENT, "dark");
  const printBaselinePage = await open(BASELINE, "dark");
  await assertFreshColour(printDarkPage, "fresh default print page", "dark");
  const printColour = await printCanvas(printDarkPage, printInput, false);
  const printLight = await printCanvas(printLightPage, printInput);
  const printDark = await printCanvas(printDarkPage, printInput);
  const printBefore = await printCanvas(printBaselinePage, printInput);
  assert.notEqual(printColour.dataUrl, printDark.dataUrl, "default Colour print is indistinguishable from B/W print");
  assert.equal(printLight.dataUrl, printDark.dataUrl, "actual B/W print changed with theme");
  assert.equal(printDark.dataUrl, printBefore.dataUrl, "actual B/W print canvas changed from baseline");
  assert.deepEqual(printLight.pixel, [255, 255, 255, 255], "actual B/W print background is not white");
  assert.deepEqual(printDark.pixel, [255, 255, 255, 255], "Dark actual B/W print background is not white");
  const printBytes = Buffer.from(printDark.dataUrl.split(",")[1], "base64");
  fs.writeFileSync(path.join(EVIDENCE, "actual-print-bw-white.png"), printBytes);
  captures.push({ name: "actual-print-bw-white", selector: "print canvas data URL" });
  await printLightPage.close();
  await printDarkPage.close();
  await printBaselinePage.close();

  const report = {
    version: "1.4.0",
    status: "PASS",
    initialState: {
      default: "colour",
      blackAndWhiteChecked: false,
      persisted: false,
      matrix: freshDefaults
    },
    captures,
    previewStates,
    print: {
      defaultMode: "colour",
      defaultColourSha256: crypto.createHash("sha256").update(Buffer.from(printColour.dataUrl.split(",")[1], "base64")).digest("hex"),
      baseline: path.basename(BASELINE),
      themeInvariant: true,
      baselineEquivalent: true,
      backgroundRgba: printDark.pixel,
      sha256: crypto.createHash("sha256").update(printBytes).digest("hex")
    }
  };
  fs.writeFileSync(RESULT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Stacking/preview visual PASS: ${captures.length} inspected states; fresh online/example/standalone defaults are Colour with no B/W persistence, Dark+B/W remains accepted, actual B/W print white and baseline-equivalent.`);
} finally {
  await browser.close();
}
