import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { launchBrowser } from "./browser-runtime.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const HTML = path.join(ROOT, "site/downloads/loadcomposer-v1.3.5-standalone.html");
const CODES = ["it", "en", "de", "es", "fr", "pt", "nl"];
assert.ok(fs.existsSync(HTML), "Standalone v1.3.5 missing; run the build first.");

const source = fs.readFileSync(HTML);
const server = http.createServer((request, response) => {
  if (new URL(request.url, "http://127.0.0.1").pathname !== "/") {
    response.writeHead(404).end();
    return;
  }
  response.setHeader("content-type", "text/html; charset=utf-8");
  response.end(source);
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await launchBrowser(ROOT);

async function ready(page) {
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() =>
    document.documentElement.dataset.i18nReady === "true" &&
    window.loadComposerUnits &&
    document.querySelectorAll("#resultsBody tr").length > 0
  );
}

async function chooseUnit(page, unit) {
  await page.locator(`.unit-option:has(input[value="${unit}"]) span`).click();
  await page.waitForFunction(value => window.loadComposerUnits.unit === value, unit);
}

async function chooseCustom(page, groupSelector) {
  await page.locator(`${groupSelector} [data-action="togglePicker"]`).click();
  await page.locator(`${groupSelector} [data-action="selectPreset"][data-preset-id="custom"]`).click();
}

try {
  const context = await browser.newContext({ locale: "en-GB" });
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on("pageerror", error => runtimeErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  await ready(page);

  assert.equal(await page.evaluate(() => window.loadComposerUnits.unit), "mm", "Fresh default must be mm.");
  const parser = await page.evaluate(() => {
    const api = window.loadComposerUnits;
    const values = [
      ["mm-int", "47", "mm"],
      ["mm-decimal", "47.0", "mm"],
      ["cm-point", "47.2", "cm"],
      ["cm-comma", "47,2", "cm"],
      ["cm-too-many", "47.25", "cm"],
      ["in-point", "47.24", "in"],
      ["in-comma", "47,24", "in"],
      ["in-incomplete-dot", "47.", "in"],
      ["in-incomplete-comma", "47,", "in"],
      ["empty", "", "in"],
      ["negative", "-1", "cm"],
      ["double-separator", "1,2.3", "in"],
      ["letters", "12cm", "cm"],
      ["outer-space", " 12,5 ", "cm"],
      ["huge", "999999999999999999999999", "mm"]
    ];
    return {
      parsed: Object.fromEntries(values.map(([id, raw, unit]) => [id, api.parseLengthInput(raw, unit)])),
      oneInch: api.normalizeLengthToMm(1, "in"),
      twoInches: api.normalizeLengthToMm(2, "in"),
      cmRound: api.normalizeLengthToMm(47.25, "cm")
    };
  });
  assert.equal(parser.parsed["mm-int"].mm, 47);
  assert.equal(parser.parsed["mm-decimal"].status, "invalid");
  assert.equal(parser.parsed["cm-point"].mm, 472);
  assert.equal(parser.parsed["cm-comma"].mm, 472);
  assert.equal(parser.parsed["cm-too-many"].status, "invalid");
  assert.equal(parser.parsed["in-point"].mm, 1200);
  assert.equal(parser.parsed["in-comma"].mm, 1200);
  assert.equal(parser.parsed["in-incomplete-dot"].status, "incomplete");
  assert.equal(parser.parsed["in-incomplete-comma"].status, "incomplete");
  assert.equal(parser.parsed.empty.status, "empty");
  for (const id of ["negative", "double-separator", "letters", "huge"]) {
    assert.equal(parser.parsed[id].status, "invalid", `${id} must be invalid.`);
  }
  assert.equal(parser.parsed["outer-space"].mm, 125);
  assert.equal(parser.oneInch, 25);
  assert.equal(parser.twoInches, 51);
  assert.equal(parser.cmRound, 473, "Canonicalization must round once to integer mm.");

  await chooseCustom(page, "#singlePalletGroup");
  await page.fill("#palletLength", "1600");
  await page.fill("#palletWidth", "1000");
  await page.fill("#palletHeight", "1500");
  await page.fill("#gap", "5");
  await page.check("#stackable");
  await page.fill("#verticalGap", "20");
  const canonicalMm = await page.evaluate(() => window.loadComposerUnits.canonicalInput());
  const layoutMm = await page.evaluate(() => window.loadComposerUnits.layoutSnapshot());
  assert.deepEqual(
    [canonicalMm.pallet.length, canonicalMm.pallet.width, canonicalMm.pallet.height, canonicalMm.gap, canonicalMm.verticalGap],
    [1600, 1000, 1500, 5, 20]
  );

  await chooseUnit(page, "cm");
  assert.deepEqual(
    await page.locator("#palletLength, #palletWidth, #palletHeight, #gap, #verticalGap").evaluateAll(nodes => nodes.map(node => node.value)),
    ["150", "160", "100", "0.5", "2"]
  );
  await chooseUnit(page, "in");
  assert.deepEqual(
    await page.locator("#palletLength, #palletWidth, #palletHeight, #gap, #verticalGap").evaluateAll(nodes => nodes.map(node => node.value)),
    ["59.06", "62.99", "39.37", "0.2", "0.79"]
  );
  await chooseUnit(page, "mm");
  assert.deepEqual(await page.evaluate(() => window.loadComposerUnits.canonicalInput()), canonicalMm);
  assert.deepEqual(await page.evaluate(() => window.loadComposerUnits.layoutSnapshot()), layoutMm);

  await chooseUnit(page, "in");
  await page.fill("#palletLength", "47,");
  await page.locator('.unit-option:has(input[value="cm"]) span').click();
  assert.equal(await page.evaluate(() => window.loadComposerUnits.unit), "in", "Invalid edit must block unit switch.");
  assert.equal(await page.inputValue("#palletLength"), "47,");
  assert.equal(await page.evaluate(() => document.activeElement.id), "palletLength");
  assert.equal(await page.getAttribute("#palletLength", "aria-invalid"), "true");
  await page.fill("#palletLength", "62.99");
  await page.locator("#quantity").focus();

  await page.selectOption("#loadMode", "mixed");
  while (await page.locator("#mixedRows .mixed-row").count() < 5) {
    await page.click("#addMixedRowBtn");
  }
  for (let index = 0; index < 5; index += 1) {
    await page.evaluate(rowIndex => {
      document.querySelectorAll("#mixedRows .mixed-row")[rowIndex]
        .querySelector('[data-action="selectPreset"][data-preset-id="custom"]')
        .click();
    }, index);
  }
  const mixedBefore = await page.evaluate(() => ({
    canonical: window.loadComposerUnits.canonicalInput(),
    layout: window.loadComposerUnits.layoutSnapshot(),
    active: [...document.querySelectorAll("#mixedModeForm [data-length-input]")]
      .filter(node => node.offsetParent !== null)
      .map(node => Number(node.dataset.mm))
  }));
  assert.equal(mixedBefore.canonical.types.length, 5);
  assert.equal(mixedBefore.active.length, 16, "Five custom groups must expose 15 dimensions plus mixed gap.");
  await chooseUnit(page, "cm");
  await chooseUnit(page, "in");
  await chooseUnit(page, "mm");
  assert.deepEqual(await page.evaluate(() => window.loadComposerUnits.canonicalInput()), mixedBefore.canonical);
  assert.deepEqual(await page.evaluate(() => window.loadComposerUnits.layoutSnapshot()), mixedBefore.layout);

  await chooseUnit(page, "cm");
  await page.click("#resetBtn");
  assert.equal(await page.evaluate(() => window.loadComposerUnits.unit), "cm", "Reset must retain unit preference.");
  assert.equal(await page.inputValue("#palletHeight"), "150");

  await page.evaluate(() => window.loadComposerI18n.setLanguage("it"));
  await page.waitForFunction(() => document.documentElement.lang === "it");
  await chooseCustom(page, "#singlePalletGroup");
  await page.fill("#palletLength", "120,5");
  await page.locator("#quantity").focus();
  assert.equal(await page.inputValue("#palletLength"), "120,5");
  await page.evaluate(() => window.loadComposerI18n.setLanguage("en"));
  await page.waitForFunction(() => document.documentElement.lang === "en");
  assert.equal(await page.inputValue("#palletLength"), "120.5");
  assert.equal(await page.evaluate(() => window.loadComposerUnits.unit), "cm", "Language must not alter the unit.");

  await chooseUnit(page, "mm");
  await page.fill("#palletLength", "1127");
  await page.fill("#palletWidth", "800");
  await page.fill("#palletHeight", "1000");
  await page.fill("#quantity", "24");
  await page.fill("#gap", "0");
  await page.evaluate(() => {
    const group = document.querySelector("#singlePalletGroup");
    const rotate = group.querySelector('[data-field="allowRotate"]');
    rotate.checked = false;
    rotate.dispatchEvent(new Event("change", { bubbles: true }));
    const index = lastResults.findIndex(result => result.container.id === "45hc");
    const select = document.querySelector("#drawSelect");
    select.value = String(index);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });

  for (const code of CODES) {
    await page.evaluate(language => window.loadComposerI18n.setLanguage(language), code);
    await page.waitForFunction(language => document.documentElement.lang === language, code);
    for (const unit of ["mm", "cm", "in"]) {
      await chooseUnit(page, unit);
      const presentation = await page.evaluate(() => {
        const index = lastResults.findIndex(result => result.container.id === "45hc");
        const result = lastResults[index];
        const rows = [...document.querySelectorAll("#resultsBody tr")]
          .filter(row => !row.classList.contains("vehicle-group-row"));
        return {
          unit: window.loadComposerUnits.unit,
          legend: document.querySelector(".unit-preference legend").textContent.trim(),
          input: document.querySelector("#palletLength").value,
          expectedInput: window.loadComposerUnits.formatLengthValue(1127),
          expectedMargin: window.loadComposerUnits.formatLength(32),
          spareLength: result.spaceAlert.spareLength,
          compact: spaceAlertPlainText(result),
          row: rows[index].innerText,
          volume: document.querySelector("#cbmTotal").textContent.trim(),
          print: buildPrintDetails(result, { viewLabel: "TEST", colorLabel: "TEST" })
        };
      });
      assert.ok(presentation.legend.length > 2, `${code}/${unit}: localized unit legend missing.`);
      assert.equal(presentation.spareLength, 32, `${code}/${unit}: compact threshold changed.`);
      assert.equal(presentation.input, presentation.expectedInput, `${code}/${unit}: localized input formatter.`);
      assert.ok(presentation.compact.includes(presentation.expectedMargin), `${code}/${unit}: compact value.`);
      assert.ok(presentation.row.includes(presentation.expectedMargin), `${code}/${unit}: residual value.`);
      assert.match(presentation.row, new RegExp(`\\s${unit}\\b`), `${code}/${unit}: vehicle dimensions.`);
      assert.ok(presentation.print.includes(presentation.expectedMargin), `${code}/${unit}: print residual/compact value.`);
      assert.match(presentation.print, new RegExp(`\\s${unit}\\b`), `${code}/${unit}: print dimensions.`);
      const volumeUnit = unit === "in" ? "ft³" : "m³";
      assert.ok(presentation.volume.endsWith(` ${volumeUnit}`), `${code}/${unit}: summary volume unit.`);
      assert.ok(presentation.print.includes(presentation.volume), `${code}/${unit}: print/summary volume mismatch.`);
    }
  }

  await chooseUnit(page, "in");
  await page.selectOption("#loadMode", "single");
  await page.evaluate(() => {
    const appendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function appendWithPrintStub(child) {
      const appended = appendChild.call(this, child);
      if (child instanceof HTMLIFrameElement && child.dataset.loadcomposerPrintFrame === "true") {
        child.contentWindow.print = () => {};
      }
      return appended;
    };
  });
  await page.click("#printLayoutBtn");
  await page.waitForFunction(() => {
    const frame = document.querySelector("iframe[data-loadcomposer-print-frame='true']");
    return Boolean(frame?.contentDocument?.body?.innerText?.length > 100);
  });
  const printText = await page.evaluate(() => {
    const frame = document.querySelector("iframe[data-loadcomposer-print-frame='true']");
    const text = frame.contentDocument.body.innerText;
    frame.remove();
    return text;
  });
  assert.ok(printText.includes("ft³"), "Print/PDF volume must use cubic feet when inches are selected.");
  assert.equal(printText.includes("m³"), false, "Print/PDF leaked cubic metres while inches were selected.");
  assert.match(printText, /\bin\b/, "Print/PDF representation must use the selected unit.");
  assert.doesNotMatch(printText, /\d\smm\b/, "Print body leaked operational mm values while inches were selected.");
  assert.deepEqual(runtimeErrors, [], `Browser errors:\n${runtimeErrors.join("\n")}`);
  await context.close();

  const persisted = await browser.newContext({ locale: "en-GB" });
  const persistedPage = await persisted.newPage();
  await ready(persistedPage);
  await chooseUnit(persistedPage, "in");
  await persistedPage.reload({ waitUntil: "load" });
  await persistedPage.waitForFunction(() => window.loadComposerUnits?.unit === "in");
  assert.equal(await persistedPage.evaluate(() => localStorage.getItem("loadcomposer.unit")), "in");
  await persisted.close();

  const malformed = await browser.newContext();
  await malformed.addInitScript(() => localStorage.setItem("loadcomposer.unit", "yards"));
  const malformedPage = await malformed.newPage();
  await ready(malformedPage);
  assert.equal(await malformedPage.evaluate(() => window.loadComposerUnits.unit), "mm");
  await malformed.close();

  const unavailable = await browser.newContext();
  await unavailable.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() { throw new Error("storage unavailable"); }
    });
  });
  const unavailablePage = await unavailable.newPage();
  await ready(unavailablePage);
  assert.equal(await unavailablePage.evaluate(() => window.loadComposerUnits.unit), "mm");
  assert.equal(await unavailablePage.evaluate(() => window.loadComposerUnits.setUnit("cm")), true);
  assert.equal(await unavailablePage.evaluate(() => window.loadComposerUnits.unit), "cm");
  await unavailable.close();

  console.log("Linear units v1.3.5 PASS: parser/rounding, 7 locales × 3 units with metric/imperial volume, compact/residual/vehicle/print, 5 mixed groups, persistence, invalid edits and round-trip geometry.");
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
