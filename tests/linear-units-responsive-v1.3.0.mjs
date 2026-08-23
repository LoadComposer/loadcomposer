import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { launchBrowser } from "./browser-runtime.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const HTML = path.join(ROOT, "site/downloads/loadcomposer-v1.3.1-standalone.html");
const OUTPUT = path.join(ROOT, "linear-units-responsive-v1.3.1");
const RESULT = path.join(ROOT, "linear-units-responsive-results-v1.3.1.json");
const VIEWPORTS = [
  { width: 2560, height: 1440 },
  { width: 1920, height: 1080 },
  { width: 1600, height: 900 },
  { width: 1366, height: 768 },
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 375, height: 812 },
  { width: 320, height: 568 }
];
const LANGUAGES = ["it", "en", "de", "es", "fr", "pt", "nl"];

fs.mkdirSync(OUTPUT, { recursive: true });
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
const records = [];

async function readiness(page) {
  await page.waitForFunction(() =>
    window.loadComposerUnits &&
    document.documentElement.dataset.i18nReady === "true" &&
    document.querySelectorAll("#resultsBody tr").length > 0
  );
}

async function state(page) {
  return page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const unit = document.querySelector(".unit-preference");
    const segments = document.querySelector(".unit-segments");
    const visibleLengthInputs = [...document.querySelectorAll("[data-length-input]")]
      .filter(input => input.offsetParent !== null);
    const withinViewport = element => {
      const rect = element.getBoundingClientRect();
      return rect.left >= -1 && rect.right <= viewportWidth + 1;
    };
    return {
      unit: window.loadComposerUnits.unit,
      documentOverflow: document.documentElement.scrollWidth > viewportWidth + 1,
      unitOverflow: unit.scrollWidth > unit.clientWidth + 1,
      segmentsOverflow: segments.scrollWidth > segments.clientWidth + 1,
      withinViewport: withinViewport(unit) && withinViewport(segments),
      inputOverflow: visibleLengthInputs.some(input =>
        input.scrollWidth > input.clientWidth + 1 || !withinViewport(input)
      ),
      visibleLengthInputs: visibleLengthInputs.length,
      optionWidths: [...document.querySelectorAll(".unit-option")].map(option => option.getBoundingClientRect().width),
      optionHeights: [...document.querySelectorAll(".unit-option")].map(option => option.getBoundingClientRect().height),
      checked: document.querySelector('input[name="linearUnit"]:checked')?.value,
      fieldsetLegend: unit.querySelector("legend")?.textContent.trim() || ""
    };
  });
}

async function singlePresetState(page) {
  return page.evaluate(() => {
    const group = document.getElementById("singlePalletGroup");
    const summary = group.querySelector('[data-role="selectedSummary"]');
    const option = id => {
      const node = group.querySelector(`[data-action="selectPreset"][data-preset-id="${id}"]`);
      return {
        primary: node.querySelector("strong").textContent.trim(),
        secondary: node.querySelector("small").textContent.trim(),
        overflow: node.scrollWidth > node.clientWidth + 1
      };
    };
    return {
      summary: {
        primary: summary.querySelector("strong").textContent.trim(),
        secondary: summary.querySelector("small").textContent.trim(),
        overflow: summary.scrollWidth > summary.clientWidth + 1
      },
      eur: option("eur"),
      northAmerican: option("north-american")
    };
  });
}

async function microfixPresetState(page, unit) {
  await page.evaluate(value => window.loadComposerUnits.setUnit(value), unit);
  const records = [];
  for (const presetId of ["42x42", "48x45", "48x48"]) {
    const record = await page.evaluate(id => {
      const group = document.getElementById("singlePalletGroup");
      window.selectPresetForGroup(group, id, false);
      const menu = group.querySelector('[data-role="pickerMenu"]');
      if (menu.classList.contains("hidden")) {
        group.querySelector('[data-action="togglePicker"]').click();
      }
      const option = group.querySelector(`[data-action="selectPreset"][data-preset-id="${id}"]`);
      const summary = group.querySelector('[data-role="selectedSummary"]');
      const read = node => ({
        primary: node.querySelector("strong").textContent.trim(),
        secondary: node.querySelector("small").textContent.trim(),
        horizontalOverflow: node.scrollWidth > node.clientWidth + 1,
        height: node.getBoundingClientRect().height
      });
      const menuRect = menu.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const menuStyle = getComputedStyle(menu);
      return {
        presetId: id,
        option: read(option),
        summary: read(summary),
        menuOpen: !menu.classList.contains("hidden"),
        menuHorizontalOverflow: menu.scrollWidth > menu.clientWidth + 1,
        menuWithinViewport: menuRect.left >= -1 && menuRect.right <= viewportWidth + 1,
        menuInternalScroll: ["auto", "scroll"].includes(menuStyle.overflowY),
        documentOverflow: document.documentElement.scrollWidth > viewportWidth + 1
      };
    }, presetId);

    assert.deepEqual(record.option.primary, record.summary.primary, `${unit}/${presetId}: responsive primary parity.`);
    assert.deepEqual(record.option.secondary, record.summary.secondary, `${unit}/${presetId}: responsive secondary parity.`);
    assert.equal(record.option.primary, `${presetId.slice(0, 2)} × ${presetId.slice(3)} in`, `${unit}/${presetId}: native identity.`);
    assert.equal(record.option.secondary.includes(record.option.primary), false, `${unit}/${presetId}: duplicated dimension.`);
    assert.equal(record.menuOpen, true, `${unit}/${presetId}: picker closed during responsive audit.`);
    assert.equal(record.menuHorizontalOverflow, false, `${unit}/${presetId}: picker horizontal overflow.`);
    assert.equal(record.menuWithinViewport, true, `${unit}/${presetId}: picker outside viewport.`);
    assert.equal(record.menuInternalScroll, true, `${unit}/${presetId}: internal picker scrolling changed.`);
    assert.equal(record.documentOverflow, false, `${unit}/${presetId}: document overflow with picker open.`);
    assert.equal(record.option.horizontalOverflow || record.summary.horizontalOverflow, false, `${unit}/${presetId}: preset text overflow.`);
    assert.ok(record.option.height >= 40, `${unit}/${presetId}: preset row readability regressed.`);
    if (unit === "in") {
      assert.doesNotMatch(record.option.secondary, /\d+\s*×\s*\d+/, `${unit}/${presetId}: repeated dimension on second row.`);
    } else {
      assert.match(record.option.secondary, new RegExp(`\\b${unit}\\b`), `${unit}/${presetId}: working-unit conversion missing.`);
    }
    records.push(record);
  }
  return { unit, records };
}

async function trailerAccessState(page) {
  return page.evaluate(() => {
    const index = lastResults.findIndex(result => result.container.id === "truck-curtain-1360");
    const result = lastResults[index];
    const rows = [...document.querySelectorAll("#resultsBody tr")]
      .filter(row => !row.classList.contains("vehicle-group-row"));
    const cell = rows[index].cells[3];
    return {
      state: accessControlState(result).state,
      text: cell.innerText.trim(),
      expectedPrudential: t("table.accessPrudentialReference").split(":")[0],
      expectedVerify: t("table.accessVerify"),
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
}

async function mixedPresetState(page) {
  return page.evaluate(() => [...document.querySelectorAll("#mixedRows .mixed-row")]
    .slice(0, 2)
    .map(group => {
      const presetId = group.querySelector('[data-field="presetId"]').value;
      const summary = group.querySelector('[data-role="selectedSummary"]');
      const option = group.querySelector(`[data-action="selectPreset"][data-preset-id="${presetId}"]`);
      const read = node => ({
        primary: node.querySelector("strong").textContent.trim(),
        secondary: node.querySelector("small").textContent.trim(),
        overflow: node.scrollWidth > node.clientWidth + 1
      });
      return { presetId, summary: read(summary), menu: read(option) };
    }));
}

function validate(snapshot, label) {
  assert.equal(snapshot.documentOverflow, false, `${label}: horizontal document overflow.`);
  assert.equal(snapshot.unitOverflow, false, `${label}: unit fieldset overflow.`);
  assert.equal(snapshot.segmentsOverflow, false, `${label}: segmented control overflow.`);
  assert.equal(snapshot.withinViewport, true, `${label}: segmented control outside viewport.`);
  assert.equal(snapshot.inputOverflow, false, `${label}: dimensional input overflow.`);
  assert.equal(snapshot.checked, snapshot.unit, `${label}: checked radio/unit mismatch.`);
  assert.ok(snapshot.fieldsetLegend.length > 2, `${label}: fieldset legend missing.`);
  assert.ok(snapshot.optionWidths.every(width => width >= 50), `${label}: unit option too narrow.`);
  assert.ok(snapshot.optionHeights.every(height => height >= 36), `${label}: unit option too short.`);
}

try {
  for (let index = 0; index < VIEWPORTS.length; index += 1) {
    const viewport = VIEWPORTS[index];
    const language = LANGUAGES[index % LANGUAGES.length];
    const context = await browser.newContext({
      viewport,
      locale: language === "en" ? "en-GB" : `${language}-${language.toUpperCase()}`
    });
    await context.addInitScript(code => {
      localStorage.setItem("loadcomposer.language", code);
      localStorage.setItem("loadcomposer.unit", "cm");
    }, language);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(url, { waitUntil: "load" });
    await readiness(page);

    const single = await state(page);
    validate(single, `${viewport.width}x${viewport.height}/single/${language}`);

    const euroCm = await singlePresetState(page);
    assert.equal(euroCm.summary.primary, "120 × 80 cm", `${viewport.width}: metric-native cm summary.`);
    assert.deepEqual(euroCm.summary, euroCm.eur, `${viewport.width}: EUR menu/summary parity.`);
    assert.equal(euroCm.northAmerican.primary, "48 × 40 in", `${viewport.width}: imperial native identity.`);
    assert.match(euroCm.northAmerican.secondary, /cm\b/, `${viewport.width}: North American metric conversion.`);
    assert.equal(euroCm.summary.overflow || euroCm.northAmerican.overflow, false, `${viewport.width}: preset overflow.`);

    const microfixPresets = [];
    for (const unit of ["mm", "cm", "in"]) {
      microfixPresets.push(await microfixPresetState(page, unit));
    }
    await page.evaluate(() => {
      window.loadComposerUnits.setUnit("cm");
      const group = document.getElementById("singlePalletGroup");
      const menu = group.querySelector('[data-role="pickerMenu"]');
      if (!menu.classList.contains("hidden")) {
        group.querySelector('[data-action="togglePicker"]').click();
      }
    });

    await page.fill("#palletHeight", "240");
    await page.waitForTimeout(20);
    const autoOkAccess = await trailerAccessState(page);
    assert.equal(autoOkAccess.state, "ok", `${viewport.width}: 2400 mm trailer auto-OK.`);
    assert.ok(autoOkAccess.text.includes(autoOkAccess.expectedPrudential), `${viewport.width}: auto-OK explanation.`);
    assert.equal(autoOkAccess.overflow, false, `${viewport.width}: auto-OK detail page overflow.`);

    await page.fill("#palletHeight", "250.1");
    await page.waitForTimeout(20);
    const verifyAccess = await trailerAccessState(page);
    assert.equal(verifyAccess.state, "verify", `${viewport.width}: 2501 mm trailer verification.`);
    assert.ok(verifyAccess.text.includes(verifyAccess.expectedVerify), `${viewport.width}: verification explanation.`);
    assert.equal(verifyAccess.overflow, false, `${viewport.width}: verify detail page overflow.`);

    await page.click('#singlePalletGroup [data-action="togglePicker"]');
    await page.click('#singlePalletGroup [data-action="selectPreset"][data-preset-id="north-american"]');
    const northAmericanCm = await singlePresetState(page);
    assert.deepEqual(northAmericanCm.summary, northAmericanCm.northAmerican, `${viewport.width}: North American menu/summary parity.`);

    await page.click('#singlePalletGroup [data-action="togglePicker"]');
    await page.click('#singlePalletGroup [data-action="selectPreset"][data-preset-id="custom"]');
    await page.locator('.unit-option:has(input[value="in"]) span').click();
    const custom = await state(page);
    validate(custom, `${viewport.width}x${viewport.height}/custom/${language}`);
    assert.equal(custom.visibleLengthInputs, 4, `${viewport.width}: custom must show H/L/W and gap.`);

    await page.selectOption("#loadMode", "mixed");
    const mixedCommercial = await mixedPresetState(page);
    for (const item of mixedCommercial) {
      assert.deepEqual(item.summary, item.menu, `${viewport.width}/${item.presetId}: mixed menu/summary parity.`);
      assert.match(item.summary.primary, /mm$/, `${viewport.width}/${item.presetId}: metric native identity in imperial mode.`);
      assert.match(item.summary.secondary, /in\b/, `${viewport.width}/${item.presetId}: imperial working conversion.`);
      assert.equal(item.summary.overflow || item.menu.overflow, false, `${viewport.width}/${item.presetId}: mixed preset overflow.`);
    }
    while (await page.locator("#mixedRows .mixed-row").count() < 5) {
      await page.click("#addMixedRowBtn");
    }
    for (let row = 0; row < 5; row += 1) {
      await page.evaluate(rowIndex => {
        document.querySelectorAll("#mixedRows .mixed-row")[rowIndex]
          .querySelector('[data-action="selectPreset"][data-preset-id="custom"]')
          .click();
      }, row);
    }
    const mixed = await state(page);
    validate(mixed, `${viewport.width}x${viewport.height}/mixed-5/${language}`);
    assert.equal(mixed.visibleLengthInputs, 16, `${viewport.width}: mixed custom dimension count.`);
    assert.deepEqual(errors, [], `${viewport.width}x${viewport.height}: runtime errors:\n${errors.join("\n")}`);

    if ([2560, 390, 320].includes(viewport.width)) {
      await page.screenshot({
        path: path.join(OUTPUT, `linear-units-mixed-${language}-${viewport.width}x${viewport.height}.png`),
        fullPage: true
      });
    }
    records.push({
      viewport,
      language,
      single,
      preset: { euroCm, northAmericanCm, mixedCommercial },
      microfixPresets,
      access: { autoOk: autoOkAccess, verify: verifyAccess },
      custom,
      mixed,
      status: "PASS"
    });
    await context.close();
  }

  fs.writeFileSync(RESULT, `${JSON.stringify({
    version: "1.3.1",
    generatedAt: new Date().toISOString(),
    viewports: VIEWPORTS.length,
    scenarios: records.length * 3,
    microfixPresetUnitStates: records.length * 3,
    status: "PASS",
    records
  }, null, 2)}\n`);
  console.log(
    `Linear units responsive v1.3.1 PASS: ${VIEWPORTS.length}/10 viewports, ` +
    `${records.length * 3} open-picker mm/cm/in micro-fix states, preset dual-display plus ` +
    `trailer access details and ${records.length * 3} single/custom/mixed scenarios.`
  );
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
