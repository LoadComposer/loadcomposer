import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launchBrowser } from "./browser-runtime.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASELINE = path.join(ROOT, "tests", "fixtures", "baseline-v1.1.0", "loadcomposer-v1.1.0-standalone.html");
const CURRENT = path.join(ROOT, "site", "downloads", "loadcomposer-v1.3.0-standalone.html");
const CODES = ["it", "en", "de", "es", "fr", "pt", "nl"];
const CHANGED_KEYS = [
  "results.table.margin",
  "table.lengthMargin",
  "table.widthMargin",
  "table.heightMargin",
  "table.heightIndividual",
  "space.issue.longitudinal",
  "space.compactHtml",
  "space.compactPlain",
  "print.margins"
];

function readCatalog(code, baseline = false) {
  const root = baseline
    ? path.join(ROOT, "tests", "fixtures", "baseline-v1.1.0", "lang")
    : path.join(ROOT, "site", "lang");
  return JSON.parse(fs.readFileSync(path.join(root, `${code}.json`), "utf8")).translations;
}

async function open(browser, filePath, language) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: language === "en" ? "en-GB" : `${language}-${language.toUpperCase()}`,
    colorScheme: "light"
  });
  await context.addInitScript(code => {
    localStorage.setItem("loadcomposer.language", code);
    localStorage.setItem("loadcomposer.theme", "light");
  }, language);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(pathToFileURL(filePath).href, { waitUntil: "load" });
  await page.waitForFunction(() => (
    document.documentElement.dataset.i18nReady === "true" &&
    document.querySelectorAll("#resultsBody tr").length > 0
  ));
  assert.deepEqual(errors, [], `${path.basename(filePath)}/${language}: browser errors.`);
  return { context, page };
}

async function configureKnown32(page) {
  await page.selectOption("#loadMode", "single");
  await page.fill("#quantity", "24");
  await page.fill("#palletHeight", "1000");
  await page.fill("#gap", "0");
  await page.evaluate(() => {
    const group = document.querySelector("#singlePalletGroup");
    const preset = group.querySelector('[data-field="presetId"]');
    preset.value = "custom";
    preset.dispatchEvent(new Event("change", { bubbles: true }));
    const rotate = group.querySelector('[data-field="allowRotate"]');
    rotate.checked = false;
    rotate.dispatchEvent(new Event("change", { bubbles: true }));
    group.querySelector('[data-field="lockedOrientation"][value="normal"]').checked = true;
  });
  await page.fill("#palletLength", "1127");
  await page.fill("#palletWidth", "800");
  await page.click("#calculateBtn");
  await page.waitForFunction(() => {
    const result = lastResults.find(item => item.container.id === "45hc");
    return result && result.input.pallet.length === 1127 && result.input.quantity === 24;
  });
}

async function snapshot(page) {
  return page.evaluate(() => {
    const resultIndex = lastResults.findIndex(item => item.container.id === "45hc");
    const result = lastResults[resultIndex];
    const rows = [...document.querySelectorAll("#resultsBody tr")]
      .filter(row => !row.classList.contains("vehicle-group-row"));
    const marginCell = rows[resultIndex].cells[4];
    const alert = result.spaceAlert;
    const printHtml = buildPrintDetails(result, { viewLabel: "TEST", colorLabel: "TEST" });
    return {
      ok: result.ok,
      usedLength: result.layout.usedLength,
      usedWidth: result.layout.usedWidth,
      spareLength: alert.spareLength,
      spareWidth: alert.spareWidth,
      spareHeight: alert.spareHeight,
      level: alert.level,
      hasWarning: alert.hasWarning,
      operational: Boolean(alert.operationalNote),
      longitudinalRows: alert.longitudinalRows,
      allowancePerRow: alert.operationalNote?.allowancePerRow ?? null,
      plain: spaceAlertPlainText(result),
      html: spaceAlertDetails(result),
      marginCell: marginCell.innerText,
      columnHeading: document.querySelector('th[data-i18n="results.table.margin"]').textContent.trim(),
      printHtml
    };
  });
}

for (const code of CODES) {
  const before = readCatalog(code, true);
  const after = readCatalog(code, false);
  for (const key of CHANGED_KEYS) {
    assert.notEqual(after[key], before[key], `${code}:${key} was not updated.`);
  }
  assert.equal(after["space.compactHtml"].includes("{perRow}"), false, `${code}: per-row value remains visible.`);
  assert.equal(after["space.compactPlain"].includes("{perRow}"), false, `${code}: per-row value remains in plain text.`);
  for (const key of ["table.lengthMargin", "table.widthMargin", "table.heightMargin", "space.compactHtml", "space.compactPlain"]) {
    assert.ok(after[key].includes(key.startsWith("table.") ? "{value}" : "{margin}"), `${code}:${key} lost numeric placeholder.`);
  }
}

const browser = await launchBrowser(ROOT);
try {
  const baselineApp = await open(browser, BASELINE, "it");
  await configureKnown32(baselineApp.page);
  const baseline = await snapshot(baselineApp.page);
  await baselineApp.context.close();

  assert.equal(baseline.spareLength, 32, "Known baseline fixture does not reproduce spareLength = 32 mm.");
  assert.equal(baseline.operational, true, "Known baseline fixture does not trigger compact loading.");
  assert.equal(baseline.level, "operational");
  assert.ok(baseline.plain.includes("Margine longitudinale totale 32 mm"));
  assert.ok(/circa [0-9,.]+ mm per fila/.test(baseline.plain));

  for (const code of CODES) {
    const currentApp = await open(browser, CURRENT, code);
    await configureKnown32(currentApp.page);
    const current = await snapshot(currentApp.page);
    await currentApp.context.close();

    for (const key of [
      "ok",
      "usedLength",
      "usedWidth",
      "spareLength",
      "spareWidth",
      "spareHeight",
      "level",
      "hasWarning",
      "operational",
      "longitudinalRows",
      "allowancePerRow"
    ]) {
      assert.equal(current[key], baseline[key], `${code}: baseline/current ${key} differs.`);
    }
    const catalog = readCatalog(code);
    const renderedCompact = catalog["space.compactPlain"].replace("{margin}", "32 mm");
    assert.equal(current.plain, renderedCompact, `${code}: compact plain text.`);
    assert.ok(current.html.includes(renderedCompact), `${code}: compact HTML text.`);
    assert.equal(current.plain.includes("perRow"), false, `${code}: perRow leaked.`);
    assert.equal(/(?:approximately|circa|etwa|aproximadamente|environ|ongeveer).*per/i.test(current.plain), false, `${code}: old per-row explanation remains.`);
    assert.equal(current.columnHeading, catalog["results.table.margin"], `${code}: remaining-space heading.`);
    assert.ok(current.marginCell.includes(catalog["table.lengthMargin"].replace("{value}", "32 mm")), `${code}: remaining length row.`);
    assert.ok(current.printHtml.includes(catalog["print.margins"]), `${code}: print remaining-space heading.`);
    assert.ok(current.printHtml.includes(catalog["table.lengthMargin"].replace("{value}", "32 mm")), `${code}: print remaining length.`);
    assert.ok(current.printHtml.includes(renderedCompact), `${code}: print compact instruction.`);
  }
} finally {
  await browser.close();
}

const italian = readCatalog("it");
assert.equal(italian["results.table.margin"], "Spazio residuo");
assert.equal(italian["table.lengthMargin"], "Lunghezza residua: {value}");
assert.equal(italian["table.widthMargin"], "Larghezza residua: {value}");
assert.equal(italian["table.heightMargin"], "Altezza residua: {value}");
assert.equal(italian["table.heightIndividual"], "Altezza residua: valutata per singolo pallet");
assert.equal(italian["print.margins"], "Spazio residuo");
assert.equal(
  italian["space.compactPlain"],
  "Caricamento compatto: mantenere i pallet ben accostati fin dalle prime file. Restano solo {margin} liberi in lunghezza."
);

console.log(
  "Remaining-space PASS: canonical v1.1.0 fixture reproduces spareLength 32 mm; " +
  "7/7 languages preserve activation, spare values, rows and internal allowancePerRow while formatting the selected linear unit in UI/plain/PDF wording."
);
