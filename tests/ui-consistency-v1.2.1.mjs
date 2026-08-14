import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launchBrowser } from "./browser-runtime.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const APP = path.join(ROOT, "site", "downloads", "loadcomposer-v1.2.1-standalone.html");
const CODES = ["it", "en", "de", "es", "fr", "pt", "nl"];
const LOCALES = { it: "it-IT", en: "en-GB", de: "de-DE", es: "es-ES", fr: "fr-FR", pt: "pt-PT", nl: "nl-NL" };
const VIEWPORTS = [
  { width: 2560, height: 1440, tableScroll: false, sticky: true },
  { width: 1920, height: 1080, tableScroll: false, sticky: true },
  { width: 1600, height: 900, tableScroll: false, sticky: true },
  { width: 1366, height: 768, tableScroll: false, sticky: true },
  { width: 1280, height: 800, tableScroll: false, sticky: true },
  { width: 1024, height: 768, tableScroll: true, sticky: true },
  { width: 768, height: 1024, tableScroll: true, sticky: true },
  { width: 390, height: 844, tableScroll: true, sticky: true },
  { width: 375, height: 812, tableScroll: true, sticky: false },
  { width: 320, height: 568, tableScroll: true, sticky: false }
];
const VISUAL_OUTPUT = process.env.UI_V121_VISUAL_OUTPUT ? path.resolve(process.env.UI_V121_VISUAL_OUTPUT) : null;
if (VISUAL_OUTPUT) fs.mkdirSync(VISUAL_OUTPUT, { recursive: true });

function catalog(code) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "site", "lang", `${code}.json`), "utf8")).translations;
}

function renderPlural(translations, locale, base, count, variables = {}) {
  const category = new Intl.PluralRules(locale).select(count);
  const template = translations[`${base}.${category}`] || translations[`${base}.other`];
  return template.replace(/\{([A-Za-z0-9_.-]+)\}/g, (_, key) => String({ count, ...variables }[key]));
}

async function open(browser, code, theme, viewport) {
  const context = await browser.newContext({ viewport, locale: LOCALES[code], colorScheme: theme });
  await context.addInitScript(({ language, preference }) => {
    localStorage.setItem("loadcomposer.language", language);
    localStorage.setItem("loadcomposer.theme", preference);
  }, { language: code, preference: theme });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(pathToFileURL(APP).href, { waitUntil: "load" });
  await page.waitForFunction(() => (
    document.documentElement.dataset.i18nReady === "true" &&
    document.querySelectorAll("#resultsBody tr").length > 0
  ));
  assert.deepEqual(errors, [], `${code}/${theme}/${viewport.width}: browser errors.`);
  return { context, page };
}

async function configureSingle(page, { preset = "eur", quantity = 10, stackable = false, layers = 2, height = 900 }) {
  await page.selectOption("#loadMode", "single");
  await page.evaluate(selected => {
    const group = document.querySelector("#singlePalletGroup");
    const input = group.querySelector('[data-field="presetId"]');
    input.value = selected;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, preset);
  await page.fill("#quantity", String(quantity));
  await page.fill("#palletHeight", String(height));
  if (stackable) {
    await page.check("#stackable");
    await page.fill("#maxLayers", String(layers));
    await page.fill("#verticalGap", "0");
  } else {
    await page.uncheck("#stackable");
  }
  await page.click("#calculateBtn");
  await page.waitForTimeout(30);
}

async function resultState(page, containerId) {
  return page.evaluate(id => {
    const index = lastResults.findIndex(result => result.container.id === id);
    const rows = [...document.querySelectorAll("#resultsBody tr")]
      .filter(row => !row.classList.contains("vehicle-group-row"));
    const result = lastResults[index];
    const row = rows[index];
    return {
      capacity: result.totalCapacity,
      placed: result.placedCount,
      requested: result.input.quantity,
      floorCapacity: result.floorCapacity,
      placedFloorPositions: result.placedFloorPositions,
      layers: result.layers,
      cells: [...row.cells].map(cell => cell.innerText.trim())
    };
  }, containerId);
}

const browser = await launchBrowser(ROOT);
let semanticScenarios = 0;
let responsiveScenarios = 0;
try {
  for (const code of CODES) {
    const translations = catalog(code);
    const app = await open(browser, code, "light", { width: 1440, height: 1000 });
    const { page } = app;

    await configureSingle(page, { preset: "eur", quantity: 10 });
    const greater = await resultState(page, "20dc");
    assert.deepEqual([greater.placed, greater.requested, greater.capacity], [10, 10, 11], `${code}: capacity > requested fixture.`);
    assert.equal(greater.cells.length, 5, `${code}: result table must have five body cells.`);
    assert.ok(greater.cells[2].includes(renderPlural(translations, LOCALES[code], "table.mixedPlaced", 10, { placed: 10, total: 10 })), `${code}: 10/10 ratio.`);
    assert.ok(greater.cells[2].includes(`${translations["table.capacityFound"]} 11 ${renderPlural(translations, LOCALES[code], "common.pallet", 11)}`), `${code}: capacity 11.`);
    assert.ok(greater.cells[2].includes(renderPlural(translations, LOCALES[code], "table.unusedCapacity", 1)), `${code}: one free slot.`);
    assert.equal(greater.cells[2].includes(renderPlural(translations, LOCALES[code], "table.floorPositions", 11)), false, `${code}: redundant floor capacity visible.`);

    const equal = await resultState(page, "20rf");
    assert.deepEqual([equal.placed, equal.requested, equal.capacity], [10, 10, 10], `${code}: capacity = requested fixture.`);
    assert.ok(equal.cells[2].includes(renderPlural(translations, LOCALES[code], "table.mixedPlaced", 10, { placed: 10, total: 10 })), `${code}: exact ratio.`);
    assert.ok(equal.cells[2].includes(`${translations["table.capacityFound"]} 10 ${renderPlural(translations, LOCALES[code], "common.pallet", 10)}`), `${code}: exact capacity.`);
    assert.equal(
      equal.cells[2].includes(renderPlural(translations, LOCALES[code], "table.unusedCapacity", 0)),
      false,
      `${code}: zero free-slot row rendered.`
    );

    await configureSingle(page, { preset: "asian", quantity: 10 });
    const insufficient = await resultState(page, "20rf");
    assert.deepEqual([insufficient.placed, insufficient.requested, insufficient.capacity], [8, 10, 8], `${code}: insufficient fixture.`);
    assert.ok(insufficient.cells[2].includes(renderPlural(translations, LOCALES[code], "table.mixedPlaced", 10, { placed: 8, total: 10 })), `${code}: 8/10 ratio.`);
    assert.ok(insufficient.cells[2].includes(`${translations["table.capacityFound"]} 8 ${renderPlural(translations, LOCALES[code], "common.pallet", 8)}`), `${code}: capacity 8.`);
    assert.ok(insufficient.cells[2].includes(renderPlural(translations, LOCALES[code], "table.missing", 2)), `${code}: two missing pallets.`);
    assert.equal(insufficient.cells[2].includes(renderPlural(translations, LOCALES[code], "table.unusedCapacity", 2)), false, `${code}: free slots shown for insufficient load.`);

    await configureSingle(page, { preset: "eur", quantity: 20, stackable: true, layers: 2, height: 900 });
    const stacked = await resultState(page, "20dc");
    assert.ok(stacked.layers > 1, `${code}: stacking fixture has one layer.`);
    assert.notEqual(stacked.capacity, stacked.floorCapacity, `${code}: stacking capacity must differ from floor capacity.`);
    assert.ok(stacked.cells[2].includes(renderPlural(translations, LOCALES[code], "table.floorPositions", stacked.floorCapacity)), `${code}: floor positions hidden for stacking.`);
    assert.ok(stacked.cells[2].includes(renderPlural(translations, LOCALES[code], "table.usedFloorPositions", stacked.placedFloorPositions)), `${code}: used floor positions hidden for stacking.`);

    const table = await page.evaluate(() => ({
      headings: [...document.querySelectorAll(".results-table thead th")].map(th => th.textContent.trim()),
      scopes: [...document.querySelectorAll(".results-table thead th")].map(th => th.getAttribute("scope")),
      groupColspans: [...document.querySelectorAll(".vehicle-group-row td")].map(td => td.colSpan),
      summaryWeight: document.querySelector("#weightTotal").textContent.trim(),
      weightHeader: Boolean(document.querySelector('th[data-i18n="results.table.weight"]'))
    }));
    assert.equal(table.headings.length, 5, `${code}: table header count.`);
    assert.deepEqual(table.scopes, ["col", "col", "col", "col", "col"], `${code}: table heading scope.`);
    assert.ok(table.groupColspans.every(value => value === 5), `${code}: group colspan.`);
    assert.equal(table.weightHeader, false, `${code}: repeated Weight column remains.`);
    assert.equal(table.summaryWeight, translations["common.notAvailable"], `${code}: Weight N/A summary removed.`);
    await app.context.close();
    semanticScenarios += 4;
  }

  for (const spec of VIEWPORTS) {
    const app = await open(browser, "de", "light", { width: spec.width, height: spec.height });
    const state = await app.page.evaluate(() => {
      const main = document.querySelector("main").getBoundingClientRect();
      const form = document.querySelector("main > .card:first-child").getBoundingClientRect();
      const result = document.querySelector("main > .card:last-child").getBoundingClientRect();
      const wrap = document.querySelector(".tablewrap");
      const firstHead = document.querySelector(".results-table thead th:first-child");
      const lastHead = document.querySelector(".results-table thead th:last-child");
      return {
        mainWidth: main.width,
        mainLeft: main.left,
        mainRight: innerWidth - main.right,
        formWidth: form.width,
        resultWidth: result.width,
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        tableScroll: wrap.scrollWidth > wrap.clientWidth + 1,
        sticky: getComputedStyle(firstHead).position === "sticky" && getComputedStyle(firstHead).left !== "auto",
        firstVisible: firstHead.getBoundingClientRect().left >= wrap.getBoundingClientRect().left - 1,
        lastVisibleWithoutScroll: lastHead.getBoundingClientRect().right <= wrap.getBoundingClientRect().right + 1,
        clippedCells: [...document.querySelectorAll(".results-table th, .results-table td")].some(cell => getComputedStyle(cell).textOverflow === "ellipsis")
      };
    });
    assert.equal(state.pageOverflow, false, `${spec.width}x${spec.height}: page horizontal overflow.`);
    assert.equal(state.tableScroll, spec.tableScroll, `${spec.width}x${spec.height}: internal table scroll.`);
    assert.equal(state.sticky, spec.sticky, `${spec.width}x${spec.height}: first-column sticky state.`);
    assert.equal(state.firstVisible, true, `${spec.width}x${spec.height}: first column not visible.`);
    assert.equal(state.clippedCells, false, `${spec.width}x${spec.height}: ellipsis found.`);
    assert.ok(Math.abs(state.mainLeft - state.mainRight) <= 2, `${spec.width}x${spec.height}: main not centered.`);
    if (spec.width === 2560) {
      assert.ok(state.mainWidth > 1450 && state.mainWidth <= 1520.5, "QHD shell does not use controlled 1520px width.");
      assert.ok(state.formWidth >= 429 && state.formWidth <= 431, "QHD Data panel is not approximately 430px.");
      assert.ok(state.resultWidth > 1000, "QHD Result panel did not receive added width.");
      assert.equal(state.lastVisibleWithoutScroll, true, "QHD last column is not simultaneously visible.");
    }
    if (VISUAL_OUTPUT) {
      await app.page.screenshot({ path: path.join(VISUAL_OUTPUT, `main-light-${spec.width}x${spec.height}.png`), fullPage: true });
    }
    await app.context.close();
    responsiveScenarios += 1;
  }

  if (VISUAL_OUTPUT) {
    for (const sample of [
      { code: "it", theme: "dark", width: 1920, height: 1080 },
      { code: "de", theme: "dark", width: 390, height: 844 }
    ]) {
      const app = await open(browser, sample.code, sample.theme, { width: sample.width, height: sample.height });
      await app.page.screenshot({ path: path.join(VISUAL_OUTPUT, `main-${sample.theme}-${sample.code}-${sample.width}x${sample.height}.png`), fullPage: true });
      await app.context.close();
    }
  }
} finally {
  await browser.close();
}

console.log(
  `UI consistency v1.2.1 PASS: ${semanticScenarios} localized capacity cases and ` +
  `${responsiveScenarios}/${responsiveScenarios} responsive viewports; five-column table, sticky vehicle column, ` +
  "Weight N/A summary retained and no page overflow."
);
