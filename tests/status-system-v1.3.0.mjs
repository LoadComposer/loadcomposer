import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launchBrowser } from "./browser-runtime.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const APP = path.join(ROOT, "site", "downloads", "loadcomposer-v1.3.0-standalone.html");
const OUTPUT = path.resolve(process.env.STATUS_V130_OUTPUT || path.join(ROOT, "status-visual-evidence-v1.3.0"));
const RESULT_FILE = path.resolve(process.env.STATUS_V130_RESULT || path.join(ROOT, "status-system-results-v1.3.0.json"));
const LOCALES = { it: "it-IT", en: "en-GB", de: "de-DE" };

fs.mkdirSync(OUTPUT, { recursive: true });

function catalog(code) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "site", "lang", `${code}.json`), "utf8")).translations;
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function channel(value) {
  const normalized = value / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function rgb(value) {
  const channels = String(value).match(/[\d.]+/g)?.slice(0, 3).map(Number);
  assert.equal(channels?.length, 3, `Unsupported CSS colour: ${value}`);
  return channels;
}

function contrastRatio(foreground, background) {
  const luminance = colour => {
    const [r, g, b] = rgb(colour).map(channel);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const high = Math.max(luminance(foreground), luminance(background));
  const low = Math.min(luminance(foreground), luminance(background));
  return (high + 0.05) / (low + 0.05);
}

async function open(browser, spec) {
  const context = await browser.newContext({
    viewport: { width: spec.width, height: spec.height },
    locale: LOCALES[spec.code],
    colorScheme: spec.theme
  });
  await context.addInitScript(({ code, theme }) => {
    localStorage.setItem("loadcomposer.language", code);
    localStorage.setItem("loadcomposer.theme", theme);
  }, spec);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(pathToFileURL(APP).href, { waitUntil: "load" });
  await page.waitForFunction(() => (
    document.documentElement.dataset.i18nReady === "true" &&
    document.querySelectorAll("#resultsBody tr").length > 0
  ));
  assert.deepEqual(errors, [], `${spec.id}: browser errors.`);
  return { context, page };
}

async function configureSingle(page, quantity = 10) {
  await page.selectOption("#loadMode", "single");
  await page.evaluate(() => {
    const group = document.querySelector("#singlePalletGroup");
    group.querySelector('[data-action="selectPreset"][data-preset-id="eur"]').click();
  });
  await page.fill("#quantity", String(quantity));
  await page.fill("#palletHeight", "900");
  await page.click("#calculateBtn");
  await page.waitForTimeout(30);
}

async function configureCapacityNonOk(page) {
  await page.selectOption("#loadMode", "single");
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
}

async function configureMixedAccess(page, allFail) {
  await page.selectOption("#loadMode", "mixed");
  await page.waitForTimeout(30);
  const rows = page.locator("#mixedRows .mixed-row");
  await rows.nth(0).locator('[data-field="height"]').fill("2500");
  await rows.nth(1).locator('[data-field="height"]').fill(allFail ? "2500" : "900");
  await page.waitForTimeout(30);
}

async function rowState(page, containerId) {
  return page.evaluate(id => {
    const index = lastResults.findIndex(result => result.container.id === id);
    const result = lastResults[index];
    const rows = [...document.querySelectorAll("#resultsBody tr")]
      .filter(row => !row.classList.contains("vehicle-group-row"));
    const row = rows[index];
    const badge = cellIndex => {
      const element = row.cells[cellIndex].querySelector(".badge");
      const style = getComputedStyle(element);
      return {
        text: element.textContent.trim(),
        className: element.className,
        color: style.color,
        backgroundColor: style.backgroundColor,
        whiteSpace: style.whiteSpace,
        display: style.display,
        alignItems: style.alignItems,
        justifyContent: style.justifyContent,
        clipped: element.scrollWidth > element.clientWidth + 1 || element.scrollHeight > element.clientHeight + 1
      };
    };
    const print = document.createElement("div");
    print.innerHTML = buildPrintDetails(result);
    return {
      requested: requestedPalletCount(result),
      placed: result.placedCount,
      capacity: result.mode === "single" ? result.totalCapacity : null,
      outcome: badge(1),
      load: badge(2),
      access: badge(3),
      capacityText: row.cells[2].innerText.trim(),
      accessText: row.cells[3].innerText.trim(),
      printText: print.innerText.trim(),
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  }, containerId);
}

function assertBadge(badge, expectedText, expectedClass, label) {
  assert.equal(badge.text, expectedText, `${label}: badge text.`);
  assert.match(badge.className, new RegExp(`\\b${expectedClass}\\b`), `${label}: badge class.`);
  assert.equal(/[\d:]/.test(badge.text), false, `${label}: quantitative badge text.`);
  assert.equal(badge.whiteSpace, "nowrap", `${label}: wrapping badge.`);
  assert.equal(badge.display, "inline-flex", `${label}: badge display.`);
  assert.equal(badge.alignItems, "center", `${label}: vertical alignment.`);
  assert.equal(badge.justifyContent, "center", `${label}: horizontal alignment.`);
  assert.equal(badge.clipped, false, `${label}: clipped badge.`);
  const contrast = contrastRatio(badge.color, badge.backgroundColor);
  assert.ok(contrast >= 4.5, `${label}: contrast ${contrast.toFixed(2)} < 4.5.`);
  return Number(contrast.toFixed(2));
}

const scenarios = [
  {
    id: "it-light-desktop-all-ok", code: "it", theme: "light", width: 1920, height: 1080,
    container: "20dc", configure: page => configureSingle(page, 10),
    expected: { outcome: ["status.fits", "ok"], load: ["common.ok", "ok"], access: ["common.ok", "ok"] }
  },
  {
    id: "it-dark-desktop-capacity-partial", code: "it", theme: "dark", width: 1920, height: 1080,
    container: "20dc", configure: page => configureSingle(page, 12),
    expected: { outcome: ["status.doesNotFit", "bad"], load: ["status.partial", "warn"], access: ["common.ok", "ok"] }
  },
  {
    id: "en-dark-desktop-capacity-non-ok", code: "en", theme: "dark", width: 1920, height: 1080,
    container: "20dc", configure: configureCapacityNonOk,
    expected: { outcome: ["status.doesNotFit", "bad"], load: ["status.notOk", "warn"], access: ["common.ok", "ok"] }
  },
  {
    id: "de-dark-desktop-access-partial", code: "de", theme: "dark", width: 1920, height: 1080,
    container: "20dc", configure: page => configureMixedAccess(page, false),
    expected: { outcome: ["status.doesNotFit", "bad"], load: ["common.ok", "ok"], access: ["status.partial", "warn"] }
  },
  {
    id: "it-light-mobile-390-access-non-ok", code: "it", theme: "light", width: 390, height: 844,
    container: "20dc", configure: page => configureMixedAccess(page, true), tableScrollLeft: 260,
    expected: { outcome: ["status.doesNotFit", "bad"], load: ["common.ok", "ok"], access: ["status.notOk", "warn"] }
  },
  {
    id: "it-dark-mobile-320-access-auto-ok", code: "it", theme: "dark", width: 320, height: 568,
    container: "truck-curtain-1360", configure: page => configureSingle(page, 10), tableScrollLeft: 430,
    expected: { outcome: ["status.fits", "ok"], load: ["common.ok", "ok"], access: ["common.ok", "ok"] }
  }
];

const browser = await launchBrowser(ROOT);
const results = [];
try {
  for (const spec of scenarios) {
    const translations = catalog(spec.code);
    const app = await open(browser, spec);
    await spec.configure(app.page);
    const state = await rowState(app.page, spec.container);
    assert.equal(state.pageOverflow, false, `${spec.id}: page horizontal overflow.`);
    const contrasts = {
      outcome: assertBadge(state.outcome, translations[spec.expected.outcome[0]], spec.expected.outcome[1], `${spec.id}/outcome`),
      load: assertBadge(state.load, translations[spec.expected.load[0]], spec.expected.load[1], `${spec.id}/load`),
      access: assertBadge(state.access, translations[spec.expected.access[0]], spec.expected.access[1], `${spec.id}/access`)
    };
    assert.equal(state.capacityText.includes(translations["table.requestedQuantity"]), false, `${spec.id}: repeated requested quantity.`);
    assert.ok(state.printText.includes(state.outcome.text), `${spec.id}: print/UI final outcome mismatch.`);
    if (spec.id === "it-light-desktop-all-ok") {
      assert.ok(state.capacityText.includes("1 posto libero"), `${spec.id}: positive free-slot detail.`);
    }
    if (spec.id === "it-dark-desktop-capacity-partial") {
      assert.equal(state.capacityText.includes("posti liberi"), false, `${spec.id}: free slots on insufficient load.`);
    }
    if (spec.id === "en-dark-desktop-capacity-non-ok") {
      assert.equal(state.placed, 0, `${spec.id}: expected zero placed pallets.`);
    }
    if (spec.id.includes("access-partial") || spec.id.includes("access-non-ok")) {
      assert.ok(state.accessText.includes(translations["table.maxPalletHeight"].split("{")[0].trim()), `${spec.id}: explanatory maximum height missing.`);
    }
    if (spec.id.includes("access-auto-ok")) {
      assert.ok(state.accessText.includes(translations["table.accessPrudentialReference"].split(":")[0]), `${spec.id}: prudential access reference missing.`);
    }
    if (spec.tableScrollLeft) {
      await app.page.evaluate(scrollLeft => { document.querySelector(".tablewrap").scrollLeft = scrollLeft; }, spec.tableScrollLeft);
    }
    const screenshot = path.join(OUTPUT, `${spec.id}.png`);
    await app.page.screenshot({ path: screenshot, fullPage: true });
    results.push({
      id: spec.id,
      locale: spec.code,
      theme: spec.theme,
      viewport: `${spec.width}x${spec.height}`,
      container: spec.container,
      requested: state.requested,
      placed: state.placed,
      capacity: state.capacity,
      badges: { outcome: state.outcome.text, load: state.load.text, access: state.access.text },
      contrasts,
      screenshot: path.relative(ROOT, screenshot),
      screenshotSha256: sha256(screenshot),
      status: "PASS"
    });
    await app.context.close();
  }
} finally {
  await browser.close();
}

const report = {
  release: "1.3.0",
  generatedAt: new Date().toISOString(),
  app: path.relative(ROOT, APP),
  scenarios: results,
  summary: {
    passed: results.length,
    total: scenarios.length,
    finalVerdictColours: "positive green; negative red",
    diagnosticColours: "partial, non-OK and verify amber",
    badges: "state-only, centered, nowrap, unclipped",
    printVerdictParity: true
  }
};
fs.writeFileSync(RESULT_FILE, `${JSON.stringify(report, null, 2)}\n`);
console.log(`Status system v1.3.0 PASS: ${results.length}/${scenarios.length} semantic/visual scenarios; evidence ${path.relative(ROOT, OUTPUT)}.`);
