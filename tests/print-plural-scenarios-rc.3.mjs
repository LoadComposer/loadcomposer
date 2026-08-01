import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launchBrowser } from "./browser-runtime.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const APP_URL = pathToFileURL(
  path.join(ROOT, "site/downloads/loadcomposer-v1.0.0-rc.3-standalone.html")
).href;
const OUTPUT = path.join(ROOT, "print-plurals-v1.0.0-rc.3");
const RESULT_PATH = path.join(
  ROOT,
  "print-plural-results-v1.0.0-rc.3.json"
);
const LANGUAGES = ["it", "en", "de", "es", "fr", "pt", "nl"];
const INDEX = JSON.parse(fs.readFileSync(path.join(ROOT, "site", "lang", "index.json")));
const CATALOGS = Object.fromEntries(LANGUAGES.map(code => [
  code,
  JSON.parse(fs.readFileSync(path.join(ROOT, "site", "lang", `${code}.json`)))
]));
const SCENARIOS = [
  {
    name: "one-pallet",
    kind: "single",
    quantity: 1,
    length: 5800,
    width: 2300,
    layers: 1,
    view: "side",
    bw: false
  },
  {
    name: "one-floor-position",
    kind: "single",
    quantity: 1,
    length: 5800,
    width: 2300,
    layers: 1,
    view: "side",
    bw: true
  },
  {
    name: "one-unplaced-diagnostic",
    kind: "diagnostic",
    quantity: 2,
    length: 5800,
    width: 2300,
    layers: 1,
    view: "side",
    bw: false
  },
  {
    name: "two-pallets",
    kind: "single",
    quantity: 2,
    length: 1200,
    width: 800,
    layers: 1,
    view: "ramp",
    bw: true
  },
  {
    name: "mixed-one-item",
    kind: "mixed",
    quantity: 1,
    view: "side",
    bw: false
  },
  {
    name: "multiple-layers",
    kind: "single",
    quantity: 2,
    length: 1200,
    width: 800,
    layers: 2,
    view: "ramp",
    bw: true
  }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clean(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function command(name, args) {
  return execFileSync(name, args, { encoding: "utf8" });
}

function interpolate(template, variables) {
  return String(template).replace(/\{([A-Za-z0-9_]+)\}/g, (match, name) => (
    Object.hasOwn(variables, name) ? String(variables[name]) : match
  ));
}

function plural(code, base, count, variables = {}) {
  const metadata = INDEX.languages.find(language => language.code === code);
  const category = new Intl.PluralRules(metadata.locale).select(count);
  const translations = CATALOGS[code].translations;
  const template =
    translations[`${base}.${category}`] ??
    translations[`${base}.other`];
  assert(typeof template === "string", `${code}:${base} missing plural form`);
  return interpolate(template, { count, ...variables });
}

async function openApp(browser, language) {
  const metadata = INDEX.languages.find(item => item.code === language);
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: metadata.locale,
    timezoneId: "Europe/Rome",
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
  await page.goto(APP_URL, { waitUntil: "load" });
  await page.waitForFunction(code => (
    document.documentElement.dataset.i18nReady === "true" &&
    document.documentElement.lang === code &&
    document.querySelectorAll("#resultsBody tr").length > 0
  ), language);
  return { context, page, errors };
}

async function configureSingle(page, scenario, identifier) {
  return page.evaluate(({ config, userText }) => {
    document.getElementById("loadMode").value = "single";
    syncModeUI({ calculate: false });
    const group = document.getElementById("singlePalletGroup");
    selectPresetForGroup(group, "custom", false);
    group.querySelector("[data-field='length']").value = String(config.length);
    group.querySelector("[data-field='width']").value = String(config.width);
    group.querySelector("[data-field='height']").value = "1000";
    group.querySelector("[data-field='quantity']").value = String(config.quantity);
    group.querySelector("[data-field='customName']").value = "Plural test pallet";
    group.querySelector("[data-field='identifier']").value = userText;
    group.querySelector("[data-field='allowRotate']").checked = false;
    document.getElementById("quantity").value = String(config.quantity);
    document.getElementById("palletHeight").value = "1000";
    document.getElementById("gap").value = "0";
    document.getElementById("stackable").checked = config.layers > 1;
    document.getElementById("maxLayers").value = String(config.layers);
    document.getElementById("verticalGap").value = "0";
    document.getElementById("stackOptions").classList.toggle(
      "hidden",
      !(config.layers > 1)
    );
    updateGroupVisuals(group);
    if (!calculate()) throw new Error("single calculation failed");
    const index = lastResults.findIndex(result => result.container.id === "20dc");
    if (index < 0) throw new Error("20dc missing");
    document.getElementById("drawSelect").value = String(index);
    document.getElementById("printView").value = config.view;
    document.getElementById("printBw").checked = config.bw;
    drawSelected();
    const result = lastResults[index];
    return {
      ok: result.ok,
      capacity: result.totalCapacity,
      requested: result.input.quantity,
      placed: result.placedCount,
      unplaced: result.unplacedCount,
      floorCapacity: result.floorCapacity,
      placedFloor: result.placedFloorPositions,
      layers: result.layers,
      loadLayers: result.loadLayers,
      canvas: `${document.getElementById("layoutCanvas").width}x${document.getElementById("layoutCanvas").height}`,
      preview: document.getElementById("layoutNotes").innerText,
      table: document.getElementById("resultsBody").innerText,
      printDisabled: document.getElementById("printLayoutBtn").disabled
    };
  }, { config: scenario, userText: identifier });
}

async function configureMixed(page, scenario, identifier) {
  return page.evaluate(({ config, userText }) => {
    document.getElementById("loadMode").value = "mixed";
    document.getElementById("mixedRows").replaceChildren();
    mixedRowCounter = 0;
    addMixedRow({
      presetId: "custom",
      length: 5800,
      width: 2300,
      height: 1000,
      quantity: config.quantity,
      customName: "Plural mixed pallet",
      identifier: userText,
      allowRotate: false
    }, { calculate: false });
    syncModeUI({ calculate: false });
    if (!calculate()) throw new Error("mixed calculation failed");
    const index = lastResults.findIndex(result => result.container.id === "20dc");
    if (index < 0) throw new Error("20dc missing");
    document.getElementById("drawSelect").value = String(index);
    document.getElementById("printView").value = config.view;
    document.getElementById("printBw").checked = config.bw;
    drawSelected();
    const result = lastResults[index];
    return {
      ok: result.ok,
      capacity: result.totalCapacity,
      requested: result.totalItems,
      placed: result.placedCount,
      unplaced: result.totalItems - result.placedCount,
      floorCapacity: result.floorCapacity,
      placedFloor: result.placedCount,
      layers: 1,
      loadLayers: 1,
      canvas: `${document.getElementById("layoutCanvas").width}x${document.getElementById("layoutCanvas").height}`,
      preview: document.getElementById("layoutNotes").innerText,
      table: document.getElementById("resultsBody").innerText,
      printDisabled: document.getElementById("printLayoutBtn").disabled
    };
  }, { config: scenario, userText: identifier });
}

async function captureOperationalPrint(page) {
  return page.evaluate(() => {
    let html = "";
    let openCount = 0;
    window.open = () => {
      openCount += 1;
      return {
        document: {
          open() {},
          write(value) {
            html += String(value);
          },
          close() {}
        }
      };
    };
    printCurrentLayout();
    return { html, openCount };
  });
}

async function renderOperationalPdf(browser, capture, outputPath) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
  const page = await context.newPage();
  await page.evaluate(() => {
    window.focus = () => {};
    window.print = () => {};
  });
  await page.setContent(capture.html, { waitUntil: "load" });
  await page.waitForFunction(() => {
    const image = document.querySelector(".schema img");
    return Boolean(image && image.complete && image.naturalWidth > 0);
  });
  const audit = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll("body *")).filter(element => {
      if (["SCRIPT", "STYLE"].includes(element.tagName)) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    return {
      technical: document.body.innerText.includes("⟦"),
      undefinedText: /\bundefined\b/.test(document.body.innerText),
      overflow: elements.some(element => (
        element.scrollWidth > element.clientWidth + 2 ||
        element.scrollHeight > element.clientHeight + 2
      )),
      images: document.querySelectorAll("img").length
    };
  });
  await page.pdf({
    path: outputPath,
    preferCSSPageSize: true,
    printBackground: true,
    displayHeaderFooter: false,
    tagged: true
  });
  await context.close();
  return audit;
}

async function captureDiagnostic(page, identifier) {
  return page.evaluate(userText => {
    const index = Number(document.getElementById("drawSelect").value);
    const rows = Array.from(document.querySelectorAll("#resultsBody tr"))
      .filter(row => !row.classList.contains("vehicle-group-row"));
    return {
      title: document.title,
      heading: document.querySelector("#previewSection h2")?.textContent || "",
      row: rows[index]?.innerText || "",
      notes: document.getElementById("layoutNotes").innerText,
      identifier: userText,
      canvas: document.getElementById("layoutCanvas").toDataURL("image/png")
    };
  }, identifier);
}

async function renderDiagnosticPdf(browser, diagnostic, outputPath) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.setContent(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { font: 10pt system-ui, sans-serif; color: #111; margin: 0; }
          h1 { font-size: 16pt; margin: 0 0 2mm; }
          h2 { font-size: 12pt; margin: 0 0 2mm; }
          .identifier { font-weight: 700; margin-bottom: 2mm; }
          img { display: block; width: 100%; max-height: 92mm; object-fit: contain; border: 1px solid #777; }
          .box { border: 1px solid #555; padding: 2.5mm; margin-top: 3mm; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(diagnostic.title)}</h1>
        <h2>${escapeHtml(diagnostic.heading)}</h2>
        <div class="identifier">${escapeHtml(diagnostic.identifier)}</div>
        <img src="${diagnostic.canvas}" alt="">
        <div class="box">${escapeHtml(diagnostic.notes)}</div>
        <div class="box">${escapeHtml(diagnostic.row)}</div>
      </body>
    </html>
  `, { waitUntil: "load" });
  await page.waitForFunction(() => {
    const image = document.querySelector("img");
    return image && image.complete && image.naturalWidth > 0;
  });
  await page.pdf({
    path: outputPath,
    preferCSSPageSize: true,
    printBackground: true,
    displayHeaderFooter: false,
    tagged: true
  });
  await context.close();
  return {
    technical: diagnostic.notes.includes("⟦") || diagnostic.row.includes("⟦"),
    undefinedText: /\bundefined\b/.test(`${diagnostic.notes} ${diagnostic.row}`),
    overflow: false,
    images: 1,
    diagnostic: true
  };
}

function verifyPdf(language, scenario, pdfPath, identifier, expectedText) {
  const info = command("pdfinfo", [pdfPath]);
  const pages = Number(info.match(/^Pages:\s+(\d+)/m)?.[1] || 0);
  assert(pages >= 1 && pages <= 4, `${language}/${scenario.name}: pages ${pages}`);
  const text = clean(command("pdftotext", ["-layout", pdfPath, "-"]));
  assert(text.includes(clean(expectedText)), `${language}/${scenario.name}: expected grammar`);
  const identifierFragments = identifier.split("-").filter(Boolean);
  assert(
    identifierFragments.every(fragment => text.includes(fragment)),
    `${language}/${scenario.name}: user text changed`
  );
  assert(!text.includes("⟦"), `${language}/${scenario.name}: technical key`);
  assert(!/\bundefined\b/.test(text), `${language}/${scenario.name}: undefined`);
  const renderPrefix = path.join(path.dirname(pdfPath), `render-${scenario.name}`);
  command("pdftocairo", ["-png", "-r", "120", pdfPath, renderPrefix]);
  const renders = fs.readdirSync(path.dirname(pdfPath))
    .filter(name => (
      name.startsWith(`render-${scenario.name}-`) &&
      name.endsWith(".png")
    ));
  assert(renders.length === pages, `${language}/${scenario.name}: render count`);
  renders.forEach(name => {
    assert(
      fs.statSync(path.join(path.dirname(pdfPath), name)).size > 5000,
      `${language}/${scenario.name}: empty render`
    );
  });
  return { pages, textLength: text.length, renders: renders.length };
}

fs.rmSync(OUTPUT, { recursive: true, force: true });
fs.mkdirSync(OUTPUT, { recursive: true });
const browser = await launchBrowser(ROOT);
const records = [];

try {
  for (const language of LANGUAGES) {
    const app = await openApp(browser, language);
    const languageDir = path.join(OUTPUT, language);
    fs.mkdirSync(languageDir, { recursive: true });
    try {
      for (const scenario of SCENARIOS) {
        const identifier = `USER-${language}-${scenario.name}`;
        const state = scenario.kind === "mixed"
          ? await configureMixed(app.page, scenario, identifier)
          : await configureSingle(app.page, scenario, identifier);
        assert(state.canvas === (scenario.view === "ramp" ? "720x1200" : "1100x470"), `${language}/${scenario.name}: canvas`);

        let expectedText;
        if (scenario.name === "one-pallet") {
          assert(state.capacity === 1 && state.placed === 1, `${language}: capacity one`);
          expectedText = plural(language, "print.requested", 1);
        } else if (scenario.name === "one-floor-position") {
          assert(state.placedFloor === 1, `${language}: one floor position`);
          expectedText = plural(language, "print.floorUsed", 1);
        } else if (scenario.name === "one-unplaced-diagnostic") {
          assert(state.unplaced === 1 && !state.ok, `${language}: one unplaced`);
          assert(state.printDisabled, `${language}: operational print must stay disabled`);
          expectedText = plural(language, "preview.singleMissing", 1);
        } else if (scenario.name === "two-pallets") {
          assert(state.requested === 2 && state.placed === 2, `${language}: two pallets`);
          expectedText = plural(language, "print.requested", 2);
        } else if (scenario.name === "mixed-one-item") {
          assert(state.requested === 1 && state.placed === 1, `${language}: mixed one`);
          expectedText = plural(language, "print.mixedOperationalNote", 1);
        } else {
          assert(state.layers === 2 && state.loadLayers === 2, `${language}: multiple layers`);
          expectedText = plural(language, "print.layersCapacity", 2);
        }

        const pdfPath = path.join(languageDir, `${scenario.name}.pdf`);
        let audit;
        if (scenario.kind === "diagnostic") {
          assert(
            clean(state.preview).includes(clean(expectedText)),
            `${language}: diagnostic grammar not visible`
          );
          const diagnostic = await captureDiagnostic(app.page, identifier);
          audit = await renderDiagnosticPdf(browser, diagnostic, pdfPath);
        } else {
          assert(state.ok && !state.printDisabled, `${language}/${scenario.name}: printable`);
          const capture = await captureOperationalPrint(app.page);
          assert(capture.openCount === 1, `${language}/${scenario.name}: print popup`);
          assert(capture.html.includes(identifier), `${language}/${scenario.name}: HTML user text`);
          audit = await renderOperationalPdf(browser, capture, pdfPath);
          assert(audit.images === 1, `${language}/${scenario.name}: schema image`);
          assert(!audit.overflow, `${language}/${scenario.name}: clipped text`);
        }
        assert(!audit.technical && !audit.undefinedText, `${language}/${scenario.name}: markers`);
        const verified = verifyPdf(
          language,
          scenario,
          pdfPath,
          identifier,
          expectedText
        );
        records.push({
          language,
          scenario: scenario.name,
          bw: scenario.bw,
          view: scenario.view,
          diagnostic: scenario.kind === "diagnostic",
          ...verified,
          status: "PASS"
        });
        console.log(`PASS ${language}/${scenario.name}: ${verified.pages} page(s)`);
      }
      assert(app.errors.length === 0, `${language}: ${app.errors.join(" | ")}`);
    } finally {
      await app.context.close();
    }
  }
} finally {
  await browser.close();
}

fs.writeFileSync(RESULT_PATH, `${JSON.stringify({
  version: "1.0.0-rc.3",
  languages: LANGUAGES,
  scenariosPerLanguage: SCENARIOS.length,
  pdfs: records.length,
  operationalPdfs: records.filter(record => !record.diagnostic).length,
  diagnosticPdfs: records.filter(record => record.diagnostic).length,
  records,
  status: "PASS"
}, null, 2)}\n`);
console.log(`Targeted plural print suite PASS: ${records.length}/${records.length} PDFs.`);
