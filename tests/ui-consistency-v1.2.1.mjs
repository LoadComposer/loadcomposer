import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launchBrowser } from "./browser-runtime.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const APP = path.join(ROOT, "site", "downloads", "loadcomposer-v1.3.0-standalone.html");
const CODES = ["it", "en", "de", "es", "fr", "pt", "nl"];
const LOCALES = { it: "it-IT", en: "en-GB", de: "de-DE", es: "es-ES", fr: "fr-FR", pt: "pt-PT", nl: "nl-NL" };
const VIEWPORTS = [
  { width: 2560, height: 1440, tableScroll: false, sticky: true },
  { width: 1920, height: 1080, tableScroll: false, sticky: true },
  { width: 1600, height: 900, tableScroll: false, sticky: true },
  { width: 1366, height: 768, tableScroll: true, sticky: true },
  { width: 1280, height: 800, tableScroll: true, sticky: true },
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
    group.querySelector(`[data-action="selectPreset"][data-preset-id="${selected}"]`).click();
  }, preset);
  await page.fill("#quantity", String(quantity));
  await page.fill("#palletHeight", String(height));
  if (stackable) {
    await page.evaluate(() => {
      const input = document.querySelector("#stackable");
      input.checked = true;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await page.fill("#maxLayers", String(layers));
    await page.fill("#verticalGap", "0");
  } else {
    await page.evaluate(() => {
      const input = document.querySelector("#stackable");
      input.checked = false;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
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
    const print = document.createElement("div");
    print.innerHTML = buildPrintDetails(result);
    return {
      capacity: result.totalCapacity,
      placed: result.placedCount,
      requested: result.input.quantity,
      floorCapacity: result.floorCapacity,
      placedFloorPositions: result.placedFloorPositions,
      layers: result.layers,
      cells: [...row.cells].map(cell => cell.innerText.trim()),
      outcomeBadge: { text: row.cells[1].querySelector(".badge")?.textContent.trim(), className: row.cells[1].querySelector(".badge")?.className },
      capacityBadge: { text: row.cells[2].querySelector(".badge")?.textContent.trim(), className: row.cells[2].querySelector(".badge")?.className },
      accessBadge: { text: row.cells[3].querySelector(".badge")?.textContent.trim(), className: row.cells[3].querySelector(".badge")?.className },
      printText: print.innerText.trim()
    };
  }, containerId);
}

async function mixedState(page, containerId) {
  return page.evaluate(id => {
    const index = lastResults.findIndex(result => result.container.id === id);
    const rows = [...document.querySelectorAll("#resultsBody tr")]
      .filter(row => !row.classList.contains("vehicle-group-row"));
    const result = lastResults[index];
    const print = document.createElement("div");
    print.innerHTML = buildPrintDetails(result);
    return {
      placed: result.placedCount,
      requested: result.totalItems,
      cells: [...rows[index].cells].map(cell => cell.innerText.trim()),
      outcomeBadge: { text: rows[index].cells[1].querySelector(".badge")?.textContent.trim(), className: rows[index].cells[1].querySelector(".badge")?.className },
      capacityBadge: { text: rows[index].cells[2].querySelector(".badge")?.textContent.trim(), className: rows[index].cells[2].querySelector(".badge")?.className },
      accessBadge: { text: rows[index].cells[3].querySelector(".badge")?.textContent.trim(), className: rows[index].cells[3].querySelector(".badge")?.className },
      summaryLabel: document.querySelector("#bestCapacityLabel").textContent.trim(),
      summaryValue: document.querySelector("#bestCapacity").textContent.trim(),
      printText: print.innerText.trim()
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
    assert.equal(greater.outcomeBadge.text, translations["status.fits"], `${code}: positive final outcome.`);
    assert.match(greater.outcomeBadge.className, /\bok\b/, `${code}: positive final outcome colour.`);
    assert.equal(greater.capacityBadge.text, translations["common.ok"], `${code}: full capacity control.`);
    assert.match(greater.capacityBadge.className, /\bok\b/, `${code}: full capacity control colour.`);
    assert.equal(greater.accessBadge.text, translations["common.ok"], `${code}: access control.`);
    assert.equal(greater.cells[2].includes(translations["table.requestedQuantity"]), false, `${code}: requested quantity repeated in capacity cell.`);
    assert.equal(greater.cells[2].includes("10/10"), false, `${code}: unlabeled 10/10 ratio.`);
    assert.ok(greater.cells[2].includes(`${translations["table.capacityFound"]} 11 ${renderPlural(translations, LOCALES[code], "common.pallet", 11)}`), `${code}: capacity 11.`);
    assert.ok(greater.cells[2].includes(renderPlural(translations, LOCALES[code], "table.unusedCapacity", 1)), `${code}: one free slot.`);
    assert.equal(greater.cells[2].includes(renderPlural(translations, LOCALES[code], "table.floorPositions", 11)), false, `${code}: redundant floor capacity visible.`);
    assert.ok(greater.printText.includes(renderPlural(translations, LOCALES[code], "table.unusedCapacity", 1)), `${code}: print free slot.`);
    assert.equal(greater.printText.includes(translations["print.floorLayers"]), false, `${code}: normal print floor/layers.`);

    await configureSingle(page, { preset: "eur", quantity: 11 });
    const equal = await resultState(page, "20dc");
    assert.deepEqual([equal.placed, equal.requested, equal.capacity], [11, 11, 11], `${code}: capacity = requested fixture.`);
    assert.equal(equal.capacityBadge.text, translations["common.ok"], `${code}: exact capacity control.`);
    assert.equal(equal.cells[2].includes(translations["table.requestedQuantity"]), false, `${code}: exact requested quantity repeated.`);
    assert.equal(equal.cells[2].includes("11/11"), false, `${code}: exact unlabeled ratio.`);
    assert.ok(equal.cells[2].includes(`${translations["table.capacityFound"]} 11 ${renderPlural(translations, LOCALES[code], "common.pallet", 11)}`), `${code}: exact capacity.`);
    assert.equal(
      equal.cells[2].includes(renderPlural(translations, LOCALES[code], "table.unusedCapacity", 0)),
      true,
      `${code}: zero free-slot row missing.`
    );
    assert.equal(equal.printText.includes(renderPlural(translations, LOCALES[code], "table.unusedCapacity", 0)), true, `${code}: print zero free slots missing.`);

    await configureSingle(page, { preset: "eur", quantity: 12 });
    const insufficient = await resultState(page, "20dc");
    assert.deepEqual([insufficient.placed, insufficient.requested, insufficient.capacity], [11, 12, 11], `${code}: insufficient fixture.`);
    assert.equal(insufficient.outcomeBadge.text, translations["status.doesNotFit"], `${code}: insufficient final outcome.`);
    assert.match(insufficient.outcomeBadge.className, /\bbad\b/, `${code}: insufficient final outcome colour.`);
    assert.equal(insufficient.capacityBadge.text, translations["status.partial"], `${code}: partial capacity control.`);
    assert.match(insufficient.capacityBadge.className, /\bwarn\b/, `${code}: partial capacity control colour.`);
    assert.equal(insufficient.accessBadge.text, translations["common.ok"], `${code}: capacity must not redefine access.`);
    assert.equal(insufficient.cells[2].includes(translations["table.requestedQuantity"]), false, `${code}: insufficient requested quantity repeated.`);
    assert.equal(insufficient.cells[2].includes("11/12"), false, `${code}: insufficient unlabeled ratio.`);
    assert.ok(insufficient.cells[2].includes(`${translations["table.capacityFound"]} 11 ${renderPlural(translations, LOCALES[code], "common.pallet", 11)}`), `${code}: capacity 11.`);
    assert.ok(insufficient.cells[2].includes(renderPlural(translations, LOCALES[code], "table.missing", 1)), `${code}: one pallet does not fit.`);
    assert.equal(insufficient.cells[2].includes(renderPlural(translations, LOCALES[code], "table.unusedCapacity", 1)), false, `${code}: free slot shown for insufficient load.`);
    assert.ok(insufficient.printText.includes(renderPlural(translations, LOCALES[code], "table.missing", 1)), `${code}: print one pallet does not fit.`);

    await configureSingle(page, { preset: "eur", quantity: 13 });
    const insufficientPlural = await resultState(page, "20dc");
    assert.deepEqual([insufficientPlural.placed, insufficientPlural.requested, insufficientPlural.capacity], [11, 13, 11], `${code}: plural insufficient fixture.`);
    assert.ok(insufficientPlural.cells[2].includes(renderPlural(translations, LOCALES[code], "table.missing", 2)), `${code}: two pallets do not fit.`);
    assert.ok(insufficientPlural.printText.includes(renderPlural(translations, LOCALES[code], "table.missing", 2)), `${code}: print two pallets do not fit.`);

    await configureSingle(page, { preset: "eur", quantity: 20, stackable: true, layers: 2, height: 900 });
    const stacked = await resultState(page, "20dc");
    assert.ok(stacked.layers > 1, `${code}: stacking fixture has one layer.`);
    assert.notEqual(stacked.capacity, stacked.floorCapacity, `${code}: stacking capacity must differ from floor capacity.`);
    assert.ok(stacked.cells[2].includes(renderPlural(translations, LOCALES[code], "table.floorPositions", stacked.floorCapacity)), `${code}: floor positions hidden for stacking.`);
    assert.ok(stacked.cells[2].includes(renderPlural(translations, LOCALES[code], "table.usedFloorPositions", stacked.placedFloorPositions)), `${code}: used floor positions hidden for stacking.`);
    assert.ok(stacked.printText.includes(translations["print.floorLayers"]), `${code}: stacked print floor/layers hidden.`);

    await page.selectOption("#loadMode", "mixed");
    await page.waitForTimeout(30);
    const mixedComplete = await mixedState(page, "20dc");
    assert.deepEqual([mixedComplete.placed, mixedComplete.requested], [11, 11], `${code}: complete mixed fixture.`);
    assert.equal(mixedComplete.capacityBadge.text, translations["common.ok"], `${code}: mixed full capacity control.`);
    assert.equal(mixedComplete.cells[2].includes(translations["table.requestedQuantity"]), false, `${code}: mixed requested quantity repeated.`);
    assert.ok(mixedComplete.cells[2].includes(`${translations["table.placedQuantity"]} 11 ${renderPlural(translations, LOCALES[code], "common.pallet", 11)}`), `${code}: mixed loaded count.`);
    assert.equal(mixedComplete.cells[2].includes(translations["table.capacityFound"]), false, `${code}: artificial mixed capacity.`);
    assert.equal(mixedComplete.cells[3].includes(translations["table.maxPalletHeight"].split("{")[0].trim()), false, `${code}: redundant mixed maximum height.`);
    assert.ok(mixedComplete.cells[3].includes(translations["table.door"].split("{")[0].trim()), `${code}: rear-opening terminology.`);
    assert.equal(mixedComplete.summaryLabel, translations["results.metric.placedLoad"], `${code}: mixed summary label.`);
    assert.equal(mixedComplete.summaryValue, "11 / 11 plt", `${code}: mixed summary value.`);
    assert.equal(mixedComplete.printText.includes(translations["table.capacityFound"]), false, `${code}: print mixed artificial capacity.`);
    assert.equal(mixedComplete.printText.includes(translations["print.floorLayers"]), false, `${code}: mixed print floor/layers.`);

    await page.locator("#mixedRows .mixed-row").nth(1).locator('[data-field="quantity"]').fill("2");
    await page.waitForTimeout(30);
    const mixedPartial = await mixedState(page, "20dc");
    assert.deepEqual([mixedPartial.placed, mixedPartial.requested], [11, 12], `${code}: partial mixed fixture.`);
    assert.equal(mixedPartial.capacityBadge.text, translations["status.partial"], `${code}: mixed partial capacity control.`);
    assert.match(mixedPartial.capacityBadge.className, /\bwarn\b/, `${code}: mixed partial capacity colour.`);
    assert.ok(mixedPartial.cells[2].includes(renderPlural(translations, LOCALES[code], "table.missing", 1)), `${code}: mixed pallet does not fit.`);
    assert.equal(mixedPartial.cells[2].includes(translations["table.capacityFound"]), false, `${code}: partial mixed artificial capacity.`);
    assert.ok(mixedPartial.printText.includes(renderPlural(translations, LOCALES[code], "table.missing", 1)), `${code}: print mixed pallet does not fit.`);

    await page.locator("#mixedRows .mixed-row").first().locator('[data-field="height"]').fill("2500");
    await page.waitForTimeout(30);
    const mixedHeightWarning = await mixedState(page, "20dc");
    assert.equal(mixedHeightWarning.accessBadge.text, translations["status.partial"], `${code}: mixed access partial state.`);
    assert.match(mixedHeightWarning.accessBadge.className, /\bwarn\b/, `${code}: mixed access partial colour.`);
    assert.ok(mixedHeightWarning.cells[3].includes(translations["table.maxPalletHeight"].split("{")[0].trim()), `${code}: highest pallet hidden in warning.`);

    await page.locator("#mixedRows .mixed-row").nth(1).locator('[data-field="height"]').fill("2500");
    await page.waitForTimeout(30);
    const mixedAccessNonOk = await mixedState(page, "20dc");
    assert.equal(mixedAccessNonOk.accessBadge.text, translations["status.notOk"], `${code}: mixed access non-OK state.`);
    assert.match(mixedAccessNonOk.accessBadge.className, /\bwarn\b/, `${code}: mixed access non-OK colour.`);

    await page.selectOption("#loadMode", "single");
    await page.waitForTimeout(30);

    await page.evaluate(() => {
      const group = document.querySelector("#singlePalletGroup");
      group.querySelector('[data-action="selectPreset"][data-preset-id="custom"]').click();
      group.querySelector('[data-field="length"]').value = "6000";
      group.querySelector('[data-field="width"]').value = "2300";
      group.querySelector('[data-field="height"]').value = "1000";
      group.querySelector('[data-field="quantity"]').value = "1";
      updateGroupVisuals(group);
      calculate();
    });
    await page.waitForTimeout(30);
    const capacityNonOk = await resultState(page, "20dc");
    assert.equal(capacityNonOk.placed, 0, `${code}: zero-placement fixture.`);
    assert.equal(capacityNonOk.capacityBadge.text, translations["status.notOk"], `${code}: zero-placement capacity control.`);
    assert.match(capacityNonOk.capacityBadge.className, /\bwarn\b/, `${code}: zero-placement capacity colour.`);
    assert.equal(capacityNonOk.accessBadge.text, translations["common.ok"], `${code}: zero-placement access independence.`);

    await configureSingle(page, { preset: "eur", quantity: 10 });
    const accessAutoOk = await resultState(page, "truck-curtain-1360");
    assert.equal(accessAutoOk.accessBadge.text, translations["common.ok"], `${code}: prudential rear access state.`);
    assert.match(accessAutoOk.accessBadge.className, /\bok\b/, `${code}: prudential rear access class.`);
    assert.ok(accessAutoOk.cells[3].includes(translations["table.accessPrudentialReference"].split(":")[0]), `${code}: prudential rear access explanation.`);

    const table = await page.evaluate(() => ({
      headings: [...document.querySelectorAll(".results-table thead th")].map(th => th.textContent.trim()),
      scopes: [...document.querySelectorAll(".results-table thead th")].map(th => th.getAttribute("scope")),
      groupColspans: [...document.querySelectorAll(".vehicle-group-row td")].map(td => td.colSpan),
      summaryWeight: document.querySelector("#weightTotal").textContent.trim(),
      weightHeader: Boolean(document.querySelector('th[data-i18n="results.table.weight"]')),
      volumeLabel: document.querySelector('[data-i18n="results.metric.volume"]')?.textContent.trim(),
      bestLabel: document.querySelector("#bestCapacityLabel")?.textContent.trim(),
      bestValue: document.querySelector("#bestCapacity")?.textContent.trim()
    }));
    assert.equal(table.headings.length, 5, `${code}: table header count.`);
    assert.deepEqual(table.scopes, ["col", "col", "col", "col", "col"], `${code}: table heading scope.`);
    assert.ok(table.groupColspans.every(value => value === 5), `${code}: group colspan.`);
    assert.equal(table.weightHeader, false, `${code}: repeated Weight column remains.`);
    assert.equal(table.summaryWeight, translations["common.notAvailable"], `${code}: Weight N/A summary removed.`);
    assert.equal(table.volumeLabel, translations["results.metric.volume"], `${code}: total-volume label.`);
    assert.equal(table.bestLabel, translations["results.metric.bestCapacity"], `${code}: single summary label.`);
    assert.match(table.bestValue, /^\d+ plt$/, `${code}: single capacity summary value.`);
    await app.context.close();
    semanticScenarios += 11;
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
        clippedCells: [...document.querySelectorAll(".results-table th, .results-table td")].some(cell => getComputedStyle(cell).textOverflow === "ellipsis"),
        badges: [...document.querySelectorAll(".results-table .badge")].map(badge => {
          const style = getComputedStyle(badge);
          return {
            whiteSpace: style.whiteSpace,
            display: style.display,
            alignItems: style.alignItems,
            justifyContent: style.justifyContent,
            clipped: badge.scrollWidth > badge.clientWidth + 1 || badge.scrollHeight > badge.clientHeight + 1
          };
        })
      };
    });
    assert.equal(state.pageOverflow, false, `${spec.width}x${spec.height}: page horizontal overflow.`);
    assert.equal(state.tableScroll, spec.tableScroll, `${spec.width}x${spec.height}: internal table scroll.`);
    assert.equal(state.sticky, spec.sticky, `${spec.width}x${spec.height}: first-column sticky state.`);
    assert.equal(state.firstVisible, true, `${spec.width}x${spec.height}: first column not visible.`);
    assert.equal(state.clippedCells, false, `${spec.width}x${spec.height}: ellipsis found.`);
    assert.ok(state.badges.every(badge => badge.whiteSpace === "nowrap"), `${spec.width}x${spec.height}: wrapping badge.`);
    assert.ok(state.badges.every(badge => badge.display === "inline-flex"), `${spec.width}x${spec.height}: badge display.`);
    assert.ok(state.badges.every(badge => badge.alignItems === "center" && badge.justifyContent === "center"), `${spec.width}x${spec.height}: badge alignment.`);
    assert.ok(state.badges.every(badge => !badge.clipped), `${spec.width}x${spec.height}: clipped badge.`);
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
  `UI consistency v1.3.0 PASS: ${semanticScenarios} localized capacity cases and ` +
  `${responsiveScenarios}/${responsiveScenarios} responsive viewports; five-column table, sticky vehicle column, ` +
  "Weight N/A summary retained and no page overflow."
);
