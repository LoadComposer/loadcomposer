import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launchBrowser } from "./browser-runtime.mjs";

const projectDir = path.resolve(import.meta.dirname, "..");
const baselineUrl = pathToFileURL(
  path.join(
    projectDir,
    "tests/fixtures/baseline-v1.2.1",
    "loadcomposer-v1.2.1-standalone.html"
  )
).href;
const candidateUrl = pathToFileURL(
  path.join(projectDir, "site/downloads/loadcomposer-v1.3.1-standalone.html")
).href;
const resultPath = path.join(projectDir, "functional-parity-results-v1.3.1.json");
const browser = await launchBrowser(projectDir);
const languages = ["it", "en", "de", "es", "fr", "pt", "nl"];
const localeByLanguage = {
  it: "it-IT",
  en: "en-GB",
  de: "de-DE",
  es: "es-ES",
  fr: "fr-FR",
  pt: "pt-PT",
  nl: "nl-NL"
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function metricTokens(value) {
  return String(value).match(/-?\d+(?:[.,]\d+)?/g) || [];
}

async function open(url, candidate, language = "it") {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: localeByLanguage[language],
    colorScheme: "light"
  });
  if (candidate) {
    await context.addInitScript(selectedLanguage => {
      localStorage.setItem("loadcomposer.language", selectedLanguage);
      localStorage.setItem("loadcomposer.theme", "light");
    }, language);
  }
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelectorAll("#resultsBody tr").length > 0);
  return { context, page };
}

async function applyScenario(page, scenario) {
  await page.selectOption("#loadMode", scenario.mode);
  if (scenario.mode === "single") {
    await page.fill("#quantity", String(scenario.quantity));
    await page.fill("#palletHeight", String(scenario.height));
    await page.fill("#gap", String(scenario.gap));
    await page.evaluate(({ preset, rotate }) => {
      const group = document.querySelector("#singlePalletGroup");
      const hidden = group.querySelector("[data-field='presetId']");
      hidden.value = preset;
      hidden.dispatchEvent(new Event("change", { bubbles: true }));
      const rotation = group.querySelector("[data-field='allowRotate']");
      rotation.checked = rotate;
      rotation.dispatchEvent(new Event("change", { bubbles: true }));
    }, { preset: scenario.preset, rotate: scenario.rotate });
    if (scenario.preset === "custom") {
      await page.fill("#palletLength", String(scenario.length));
      await page.fill("#palletWidth", String(scenario.width));
    }
    if (scenario.stackable) {
      await page.check("#stackable");
      await page.fill("#maxLayers", String(scenario.layers));
      await page.fill("#verticalGap", String(scenario.verticalGap));
    } else {
      await page.uncheck("#stackable");
    }
  } else {
    await page.waitForFunction(() => document.querySelectorAll("#mixedRows .mixed-row").length >= 2);
    await page.evaluate(({ items, gap }) => {
      const rows = [...document.querySelectorAll("#mixedRows .mixed-row")];
      rows.forEach((row, index) => {
        const group = items[index];
        row.querySelector("[data-field='presetId']").value = group.preset;
        row.querySelector("[data-field='quantity']").value = group.quantity;
        row.querySelector("[data-field='height']").value = group.height;
        row.querySelector("[data-field='allowRotate']").checked = group.rotate;
        row.querySelector("[data-field='presetId']").dispatchEvent(new Event("change", { bubbles: true }));
      });
      const gapInput = document.querySelector("#mixedGap");
      gapInput.value = gap;
      gapInput.dispatchEvent(new Event("input", { bubbles: true }));
    }, scenario.groups);
  }
  await page.click("#calculateBtn");
  await page.waitForTimeout(50);
}

async function fingerprint(page) {
  return page.evaluate(() => {
    const metric = id => document.querySelector(id).textContent.trim();
    const numericTokens = text => (
      text.match(/-?\d+(?:[.,]\d+)?/g) || []
    );
    const dataRows = [...document.querySelectorAll("#resultsBody tr")]
      .filter(row => !row.classList.contains("vehicle-group-row"))
      .map((row, index) => ({
        vehicle: lastResults[index].container.id,
        tokens: [...row.cells].map(cell => numericTokens(cell.innerText))
      }));
    const canvas = document.querySelector("#layoutCanvas");
    const geometry = lastResults.map(result => ({
      vehicle: result.container.id,
      mode: result.mode,
      ok: result.ok,
      capacity: result.totalCapacity,
      requested: result.mode === "mixed" ? result.totalItems : result.input.quantity,
      placed: result.placedCount,
      floorCapacity: result.floorCapacity ?? null,
      layers: result.layers ?? null,
      loadLayers: result.loadLayers ?? null,
      margins: [
        result.lengthMargin ?? null,
        result.widthMargin ?? null,
        result.heightMargin ?? null
      ],
      rects: (result.layout?.rects || []).map(rect => [
        rect.x,
        rect.y,
        rect.length,
        rect.width,
        Boolean(rect.rotated),
        rect.typeIndex ?? null,
        rect.unitNo ?? null,
        rect.stackCount ?? 1
      ]),
      unplaced: result.unplacedRefs || result.unplaced || []
    }));
    return {
      metrics: [
        metric("#cbmTotal"),
        metric("#weightTotal"),
        metric("#bestCapacity"),
        metric("#smallestOk")
      ],
      dataRows,
      rowCount: dataRows.length,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      canvasHash: canvas.toDataURL().slice(0, 64),
      geometry
    };
  });
}

const scenarios = [
  { name: "default-euro", mode: "single", preset: "eur", quantity: 10, height: 1500, gap: 0, rotate: true, stackable: false },
  { name: "north-american-gap", mode: "single", preset: "na", quantity: 27, height: 1180, gap: 20, rotate: false, stackable: false },
  { name: "custom", mode: "single", preset: "custom", quantity: 17, height: 1320, gap: 12, rotate: true, stackable: false, length: 1050, width: 760 },
  { name: "stackable", mode: "single", preset: "eur2", quantity: 36, height: 780, gap: 5, rotate: true, stackable: true, layers: 3, verticalGap: 20 },
  {
    name: "mixed-two-groups",
    mode: "mixed",
    groups: {
      items: [
        { preset: "eur", quantity: 12, height: 1200, rotate: true },
        { preset: "na", quantity: 8, height: 1400, rotate: false }
      ],
      gap: 15
    }
  }
];

try {
  const comparisons = [];
  for (const scenario of scenarios) {
    const baseline = await open(baselineUrl, false, "it");
    await applyScenario(baseline.page, scenario);
    const before = await fingerprint(baseline.page);
    assert(before.rowCount === 12, `${scenario.name}: baseline vehicle rows`);

    for (const language of languages) {
      const candidate = await open(candidateUrl, true, language);
      await applyScenario(candidate.page, scenario);
      const after = await fingerprint(candidate.page);
      console.log(`${scenario.name}/${language}: rows ${before.rowCount}/${after.rowCount}`);
      assert(after.rowCount === 12, `${scenario.name}/${language}: candidate vehicle rows`);
      assert(
        JSON.stringify(before.geometry) === JSON.stringify(after.geometry),
        `${scenario.name}/${language}: v1.2.1/v1.3.1 geometry mismatch`
      );
      if (language === "it") {
        assert(
          JSON.stringify([before.metrics[0], before.metrics[1], before.metrics[3]]) ===
            JSON.stringify([after.metrics[0], after.metrics[1], after.metrics[3]]),
          `${scenario.name}/${language}: stable summary metric mismatch`
        );
        assert(
          JSON.stringify(metricTokens(before.metrics[2])) === JSON.stringify(metricTokens(after.metrics[2])),
          `${scenario.name}/${language}: best-summary numeric value mismatch`
        );
      }
      comparisons.push({
        scenario: scenario.name,
        language,
        geometryHash: crypto.createHash("sha256").update(JSON.stringify(after.geometry)).digest("hex"),
        metrics: after.metrics,
        canvas: `${after.canvasWidth}x${after.canvasHeight}`
      });
      await candidate.context.close();
    }
    await baseline.context.close();
  }
  fs.writeFileSync(resultPath, `${JSON.stringify({
    version: "1.3.1",
    baseline: "1.2.1",
    generatedAt: new Date().toISOString(),
    scenarios: comparisons,
    status: "PASS"
  }, null, 2)}\n`);
  console.log(`functional parity: ${comparisons.length}/${comparisons.length} PASS`);
  console.log(JSON.stringify(comparisons, null, 2));
} finally {
  await browser.close();
}
