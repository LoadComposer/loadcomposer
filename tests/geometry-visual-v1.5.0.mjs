import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launchBrowser } from "./browser-runtime.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const APP = path.join(ROOT, "site/downloads/loadcomposer-v1.5.0-standalone.html");
const EVIDENCE = path.join(ROOT, "geometry-visual-evidence-v1.5.0");
const OUTPUT = path.join(ROOT, "geometry-visual-results-v1.5.0.json");
fs.mkdirSync(EVIDENCE, { recursive: true });

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function separated(a, b) {
  return (
    a.x + a.length <= b.x || b.x + b.length <= a.x ||
    a.y + a.width <= b.y || b.y + b.width <= a.y
  );
}

function validate(rects) {
  for (const rect of rects) {
    assert.ok(rect.x >= 0 && rect.y >= 0);
    assert.ok(rect.x + rect.length <= 5896);
    assert.ok(rect.y + rect.width <= 2350);
  }
  for (let first = 0; first < rects.length; first += 1) {
    for (let second = first + 1; second < rects.length; second += 1) {
      assert.ok(separated(rects[first], rects[second]), `visual overlap ${first}/${second}`);
    }
  }
}

const browser = await launchBrowser(ROOT);
const context = await browser.newContext({
  viewport: { width: 1500, height: 1050 },
  locale: "it-IT",
  colorScheme: "light"
});
await context.addInitScript(() => {
  localStorage.setItem("loadcomposer.language", "it");
  localStorage.setItem("loadcomposer.theme", "light");
  localStorage.setItem("loadcomposer.unit", "mm");
});
const page = await context.newPage();
const browserErrors = [];
const remoteRequests = [];
page.on("pageerror", error => browserErrors.push(error.message));
page.on("console", message => { if (message.type() === "error") browserErrors.push(message.text()); });
page.on("request", request => {
  if (/^https?:/i.test(request.url())) remoteRequests.push(request.url());
});

async function focusResultSection() {
  await page.evaluate(() => {
    const resultRows = [...document.querySelectorAll("#resultsBody tr")];
    let firstDataKept = false;
    let firstGroupKept = false;
    resultRows.forEach(row => {
      if (row.classList.contains("vehicle-group-row")) {
        row.hidden = firstGroupKept;
        firstGroupKept = true;
      } else {
        row.hidden = firstDataKept;
        firstDataKept = true;
      }
    });
  });
}

async function screenshotScenario(id, configure) {
  await configure();
  await page.waitForTimeout(60);
  const state = await page.evaluate(() => {
    const result = lastResults.find(item => item.container.id === "20dc");
    const rows = [...document.querySelectorAll("#resultsBody tr")]
      .filter(row => !row.classList.contains("vehicle-group-row"));
    const row = rows[lastResults.findIndex(item => item.container.id === "20dc")];
    return {
      dimensions: [result.container.innerLength, result.container.innerWidth],
      requested: result.input.quantity,
      capacity: result.totalCapacity,
      placed: result.placedCount,
      unplaced: result.unplacedCount,
      ok: result.ok,
      rowText: row.innerText.replace(/\s+/g, " ").trim(),
      rects: result.loadLayout.rects.map(rect => ({
        x: rect.x, y: rect.y, length: rect.length, width: rect.width, rotated: rect.rotated
      })),
      envelope: [result.loadLayout.usedLength, result.loadLayout.usedWidth]
    };
  });
  await focusResultSection();
  const evidenceFile = path.join(EVIDENCE, `${id}.png`);
  const section = await page.locator("#resultsBody").evaluateHandle(node => node.closest("section"));
  await section.asElement().screenshot({ path: evidenceFile });
  return {
    ...state,
    screenshot: path.relative(ROOT, evidenceFile).split(path.sep).join("/"),
    screenshotSha256: sha256(evidenceFile)
  };
}

try {
  await page.goto(pathToFileURL(APP).href, { waitUntil: "load" });
  await page.waitForFunction(() => (
    document.documentElement.dataset.i18nReady === "true" &&
    document.querySelectorAll("#resultsBody tr").length > 0
  ));
  const canonical = await screenshotScenario("canonical-20dc-industrial-10-it-light", async () => {
    await page.evaluate(() => {
      const group = document.getElementById("singlePalletGroup");
      document.getElementById("loadMode").value = "single";
      selectPresetForGroup(group, "custom", false);
      group.querySelector('[data-field="length"]').value = "1200";
      group.querySelector('[data-field="width"]').value = "1000";
      group.querySelector('[data-field="height"]').value = "1500";
      group.querySelector('[data-field="quantity"]').value = "10";
      group.querySelector('[data-field="allowRotate"]').checked = true;
      document.getElementById("gap").value = "0";
      document.getElementById("stackable").checked = false;
      updateGroupVisuals(group);
      calculate();
    });
  });
  assert.deepEqual(canonical.dimensions, [5896, 2350]);
  assert.equal(canonical.requested, 10);
  assert.equal(canonical.capacity, 10);
  assert.equal(canonical.placed, 10);
  assert.equal(canonical.unplaced, 0);
  assert.equal(canonical.ok, true);
  assert.ok(canonical.rowText.includes("CI STA"));
  assert.ok(!canonical.rowText.includes("1 pallet non entra"));
  assert.ok(canonical.rects.some(rect => rect.rotated) && canonical.rects.some(rect => !rect.rotated));
  validate(canonical.rects);

  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.dataset.i18nReady === "true");
  const euro = await screenshotScenario("unchanged-20dc-euro-10-it-light", async () => {
    await page.evaluate(() => {
      const group = document.getElementById("singlePalletGroup");
      selectPresetForGroup(group, "eur", false);
      group.querySelector('[data-field="quantity"]').value = "10";
      group.querySelector('[data-field="height"]').value = "1500";
      group.querySelector('[data-field="allowRotate"]').checked = true;
      document.getElementById("gap").value = "0";
      updateGroupVisuals(group);
      calculate();
    });
  });
  assert.equal(euro.placed, 10);
  assert.equal(euro.ok, true);
  assert.ok(euro.rowText.includes("CI STA"));

  assert.deepEqual(browserErrors, []);
  assert.deepEqual(remoteRequests, []);
  const report = {
    version: "1.5.0",
    status: "PASS",
    runtime: "Chromium standalone file://",
    remoteRuntimeRequests: remoteRequests.length,
    canonical,
    unchangedSample: euro
  };
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Geometry visual PASS: canonical ${canonical.placed}/${canonical.requested}, envelope ${canonical.envelope.join(" x ")} mm; Euro sample ${euro.placed}/${euro.requested}.`);
} finally {
  await context.close();
  await browser.close();
}
