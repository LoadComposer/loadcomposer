import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { launchBrowser } from "./browser-runtime.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const HTML = path.join(ROOT, "site/downloads/loadcomposer-v1.3.1-standalone.html");
const OUTPUT = path.join(ROOT, "print-linear-units-v1.3.1");
const RESULT = path.join(ROOT, "print-linear-units-results-v1.3.1.json");
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

const CASES = [
  { id: "single-cm-color", kind: "single", unit: "cm", bw: false },
  { id: "single-in-bw", kind: "single", unit: "in", bw: true },
  { id: "mixed-cm-bw", kind: "mixed", unit: "cm", bw: true },
  { id: "mixed-in-color", kind: "mixed", unit: "in", bw: false },
  { id: "compact-cm-color", kind: "compact", unit: "cm", bw: false, expected: "3.2 cm" },
  { id: "compact-in-bw", kind: "compact", unit: "in", bw: true, expected: "1.26 in" },
  { id: "custom-cm-bw", kind: "custom", unit: "cm", bw: true, expected: "160 × 100 × 150 cm" },
  { id: "custom-in-color", kind: "custom", unit: "in", bw: false, expected: "62.99 × 39.37 × 59.06 in" }
];

async function ready(page) {
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => window.loadComposerUnits && document.querySelectorAll("#resultsBody tr").length > 0);
}

async function customPreset(page) {
  await page.click('#singlePalletGroup [data-action="togglePicker"]');
  await page.click('#singlePalletGroup [data-action="selectPreset"][data-preset-id="custom"]');
}

async function configure(page, kind) {
  if (kind === "mixed") {
    await page.selectOption("#loadMode", "mixed");
    await page.waitForFunction(() => document.querySelectorAll("#mixedRows .mixed-row").length === 2);
    return;
  }
  await page.selectOption("#loadMode", "single");
  if (kind === "single") return;
  await customPreset(page);
  if (kind === "custom") {
    await page.fill("#palletLength", "1600");
    await page.fill("#palletWidth", "1000");
    await page.fill("#palletHeight", "1500");
    await page.fill("#quantity", "10");
    await page.evaluate(() => {
      const index = lastResults.findIndex(result => result.ok);
      const select = document.querySelector("#drawSelect");
      select.value = String(index);
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    return;
  }
  await page.fill("#quantity", "24");
  await page.fill("#palletLength", "1127");
  await page.fill("#palletWidth", "800");
  await page.fill("#palletHeight", "1000");
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
}

function command(name, args) {
  const result = spawnSync(name, args, { encoding: "utf8" });
  assert.equal(result.status, 0, `${name} failed: ${result.stderr || result.stdout}`);
  return result.stdout;
}

const records = [];
try {
  for (const spec of CASES) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: "en-GB" });
    await context.addInitScript(() => {
      localStorage.setItem("loadcomposer.language", "en");
      localStorage.setItem("loadcomposer.unit", "mm");
      localStorage.setItem("loadcomposer.theme", "light");
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error") errors.push(message.text());
    });
    await ready(page);
    await configure(page, spec.kind);
    const geometryBefore = await page.evaluate(() => window.loadComposerUnits.layoutSnapshot());
    await page.locator(`.unit-option:has(input[value="${spec.unit}"]) span`).click();
    await page.waitForFunction(unit => window.loadComposerUnits.unit === unit, spec.unit);
    assert.deepEqual(await page.evaluate(() => window.loadComposerUnits.layoutSnapshot()), geometryBefore, `${spec.id}: geometry changed.`);
    await page.locator("#printBw").setChecked(spec.bw);
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
      const image = frame?.contentDocument?.querySelector(".schema img");
      return Boolean(frame?.contentDocument?.body?.innerText?.length > 100 && image?.complete);
    });
    const printHtml = await page.evaluate(() => {
      const frame = document.querySelector("iframe[data-loadcomposer-print-frame='true']");
      const html = `<!DOCTYPE html>\n${frame.contentDocument.documentElement.outerHTML}`;
      frame.remove();
      return html;
    });
    const popup = await context.newPage();
    await popup.setContent(printHtml, { waitUntil: "load" });
    const presentation = await popup.evaluate(() => ({
      text: document.body.innerText,
      documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      tableOverflow: [...document.querySelectorAll("table")].some(table => table.scrollWidth > table.clientWidth + 1),
      images: [...document.images].map(image => ({ complete: image.complete, width: image.naturalWidth, height: image.naturalHeight }))
    }));
    assert.equal(presentation.documentOverflow, false, `${spec.id}: print document overflow.`);
    assert.equal(presentation.tableOverflow, false, `${spec.id}: print table overflow.`);
    assert.ok(presentation.images.every(image => image.complete && image.width > 0 && image.height > 0), `${spec.id}: schema image missing.`);
    assert.match(presentation.text, new RegExp(`\\d(?:[.,]\\d+)? ${spec.unit}\\b`), `${spec.id}: selected unit absent.`);
    const volumeUnit = spec.unit === "in" ? "ft³" : "m³";
    assert.ok(presentation.text.includes(volumeUnit), `${spec.id}: ${volumeUnit} volume missing.`);
    assert.equal((presentation.text.match(/Requested load:/g) || []).length, 1, `${spec.id}: requested load duplicated.`);
    assert.equal(presentation.text.includes("Floor / layers"), false, `${spec.id}: redundant floor/layers row.`);
    if (spec.kind === "mixed") {
      assert.ok(presentation.text.includes("Loaded:"), `${spec.id}: mixed loaded count missing.`);
      assert.equal(presentation.text.includes("Found capacity:"), false, `${spec.id}: artificial mixed capacity.`);
    } else {
      assert.ok(presentation.text.includes("Found capacity:"), `${spec.id}: single found capacity missing.`);
      assert.equal(presentation.text.includes("Placed quantity:"), false, `${spec.id}: redundant placed quantity.`);
    }
    if (spec.expected) assert.ok(presentation.text.includes(spec.expected), `${spec.id}: expected converted value ${spec.expected}.`);
    const otherUnits = ["mm", "cm", "in"].filter(unit => unit !== spec.unit);
    for (const unit of otherUnits) {
      assert.doesNotMatch(presentation.text, new RegExp(`\\d(?:[.,]\\d+)? ${unit}\\b`), `${spec.id}: operational ${unit} leaked.`);
    }

    const pdf = path.join(OUTPUT, `${spec.id}.pdf`);
    await popup.pdf({ path: pdf, format: "A4", landscape: true, printBackground: true, preferCSSPageSize: true });
    const info = command("pdfinfo", [pdf]);
    const pages = Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
    assert.ok(pages >= 1 && pages <= 2, `${spec.id}: unexpected side-view page count ${pages}.`);
    assert.ok(fs.statSync(pdf).size > 10000, `${spec.id}: PDF unexpectedly small.`);
    const pdfText = command("pdftotext", ["-layout", pdf, "-"]);
    const textPages = pdfText.split("\f").filter(value => value.trim());
    assert.equal(textPages.length, pages, `${spec.id}: extracted/PDF page count mismatch.`);
    assert.ok(textPages.every(value => value.trim().length > 100), `${spec.id}: blank or nearly blank overflow page.`);
    assert.ok(pdfText.includes(spec.unit), `${spec.id}: selected unit missing after PDF raster pipeline.`);
    assert.ok(pdfText.includes(volumeUnit), `${spec.id}: ${volumeUnit} missing from PDF text.`);
    assert.deepEqual(errors, [], `${spec.id}: runtime errors:\n${errors.join("\n")}`);
    records.push({ ...spec, pages, bytes: fs.statSync(pdf).size, status: "PASS" });
    await popup.close();
    await context.close();
  }

  fs.writeFileSync(RESULT, `${JSON.stringify({
    version: "1.3.1",
    generatedAt: new Date().toISOString(),
    scenarios: records.length,
    status: "PASS",
    records
  }, null, 2)}\n`);
  console.log("Print linear units v1.3.1 PASS: 8/8 single, mixed, compact and custom cm/in PDFs; color/B&W, 1–2 populated pages, no overflow, canonical geometry unchanged.");
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
