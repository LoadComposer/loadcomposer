import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launchBrowser } from "./browser-runtime.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const APP_URL = pathToFileURL(
  path.join(ROOT, "site/downloads/loadcomposer-v1.0.0-rc.3-standalone.html")
).href;
const OUTPUT = path.join(ROOT, "print-i18n-v1.0.0-rc.3");
const RESULT_PATH = path.join(ROOT, "print-i18n-results-v1.0.0-rc.3.json");
const LANGUAGES = ["de", "es", "fr", "pt", "nl"];
const LOCALES = {
  de: "de-DE",
  es: "es-ES",
  fr: "fr-FR",
  pt: "pt-PT",
  nl: "nl-NL"
};
const FIXED_NOW = "2026-07-25T10:00:00.000Z";
const FORBIDDEN_RESIDUALS = [
  "Dati pallet",
  "Riepilogo",
  "Quantità richiesta",
  "Schema carico",
  "Generato:",
  "Pallet data",
  "Summary",
  "Required quantity",
  "Load layout",
  "Operational note:",
  "Generated:"
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function command(name, args) {
  return execFileSync(name, args, { encoding: "utf8" });
}

function cleanOutput() {
  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT, { recursive: true });
}

async function openApplication(browser, language) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: LOCALES[language],
    timezoneId: "Europe/Rome",
    colorScheme: "light"
  });
  await context.addInitScript(({ language, fixedNow }) => {
    localStorage.setItem("loadcomposer.language", language);
    localStorage.setItem("loadcomposer.theme", "light");
    const NativeDate = Date;
    class FixedDate extends NativeDate {
      constructor(...args) {
        super(...(args.length ? args : [fixedNow]));
      }
      static now() {
        return new NativeDate(fixedNow).getTime();
      }
    }
    FixedDate.parse = NativeDate.parse;
    FixedDate.UTC = NativeDate.UTC;
    window.Date = FixedDate;
  }, { language, fixedNow: FIXED_NOW });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(APP_URL, { waitUntil: "load" });
  await page.waitForFunction(languageCode => (
    document.documentElement.dataset.i18nReady === "true" &&
    document.documentElement.lang === languageCode &&
    document.querySelectorAll("#resultsBody tr").length > 0
  ), language);
  return { context, page, errors };
}

async function configureSingle(page, options = {}) {
  return page.evaluate(config => {
    document.getElementById("loadMode").value = "single";
    syncModeUI({ calculate: false });
    const group = document.getElementById("singlePalletGroup");
    selectPresetForGroup(group, config.presetId || "eur", false);
    if ((config.presetId || "eur") === "custom") {
      group.querySelector("[data-field='length']").value = String(config.length || 1200);
      group.querySelector("[data-field='width']").value = String(config.width || 800);
      group.querySelector("[data-field='customName']").value =
        config.customName || "Custom pallet";
    }
    group.querySelector("[data-field='identifier']").value = config.identifier || "";
    group.querySelector("[data-field='allowRotate']").checked = config.allowRotate !== false;
    document.getElementById("quantity").value = String(config.quantity || 10);
    document.getElementById("palletHeight").value = String(config.height || 1000);
    document.getElementById("gap").value = String(config.gap || 0);
    document.getElementById("stackable").checked = Boolean(config.stackable);
    document.getElementById("maxLayers").value = String(config.layers || 2);
    document.getElementById("verticalGap").value = String(config.verticalGap || 0);
    document.getElementById("stackOptions").classList.toggle("hidden", !config.stackable);
    updateGroupVisuals(group);
    if (!calculate()) throw new Error("Single calculation failed.");
    const preferred = lastResults.findIndex(result => (
      result.container.id === (config.vehicle || "truck-curtain-1360") && result.ok
    ));
    const selected = preferred >= 0 ? preferred : lastResults.findIndex(result => result.ok);
    if (selected < 0) throw new Error("No printable single result.");
    document.getElementById("drawSelect").value = String(selected);
    drawSelected();
    return {
      placed: lastResults[selected].placedCount,
      requested: lastResults[selected].input.quantity,
      rects: lastResults[selected].layout.rects.length
    };
  }, options);
}

async function configureMixed(page, groups) {
  return page.evaluate(items => {
    document.getElementById("loadMode").value = "mixed";
    document.getElementById("mixedRows").replaceChildren();
    mixedRowCounter = 0;
    items.forEach(item => addMixedRow({
      presetId: "custom",
      length: item.length,
      width: item.width,
      height: item.height,
      quantity: item.quantity,
      customName: item.name,
      identifier: item.identifier,
      allowRotate: true
    }, { calculate: false }));
    syncModeUI({ calculate: false });
    if (!calculate()) throw new Error("Mixed calculation failed.");
    const preferred = lastResults.findIndex(result => (
      result.container.id === "truck-curtain-1360" && result.ok
    ));
    const selected = preferred >= 0 ? preferred : lastResults.findIndex(result => result.ok);
    if (selected < 0) throw new Error("No printable mixed result.");
    document.getElementById("drawSelect").value = String(selected);
    drawSelected();
    return {
      placed: lastResults[selected].placedCount,
      requested: lastResults[selected].totalItems,
      rects: lastResults[selected].layout.rects.length
    };
  }, groups);
}

async function capturePrint(page, view, bw) {
  return page.evaluate(({ selectedView, selectedBw }) => {
    document.getElementById("printView").value = selectedView;
    document.getElementById("printBw").checked = selectedBw;
    drawSelected();
    const expected = {
      summary: window.loadComposerI18n.t("print.summary"),
      vehicle: window.loadComposerI18n.t("print.vehicle"),
      generatedLabel: window.loadComposerI18n.t("print.generated", { date: "" }),
      fits: window.loadComposerI18n.t("status.fits"),
      bw: window.loadComposerI18n.t("preview.bw"),
      date: window.loadComposerI18n.dateTime(new Date(), {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      })
    };
    let html = "";
    let openCount = 0;
    const canvasText = [];
    const originalFillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args) {
      canvasText.push(String(args[0]));
      return originalFillText.apply(this, args);
    };
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
    try {
      printCurrentLayout();
    } finally {
      CanvasRenderingContext2D.prototype.fillText = originalFillText;
    }
    return { html, openCount, expected, canvasText };
  }, { selectedView: view, selectedBw: bw });
}

async function renderPdf(browser, language, capture, pdfPath, xssPayload = "") {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
    locale: LOCALES[language],
    timezoneId: "Europe/Rome"
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.evaluate(() => {
    window.focus = () => {};
    window.print = () => {};
  });
  await page.setContent(capture.html, { waitUntil: "load" });
  await page.waitForFunction(() => {
    const image = document.querySelector(".schema img");
    return Boolean(image && image.complete && image.naturalWidth > 0);
  });
  const audit = await page.evaluate(payload => {
    const textElements = Array.from(document.querySelectorAll("body *")).filter(element => {
      if (element.closest(".warehouse-note")) return false;
      if (["SCRIPT", "STYLE"].includes(element.tagName)) return false;
      if (!Array.from(element.childNodes).some(node => (
        node.nodeType === Node.TEXT_NODE && node.textContent.trim()
      ))) return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    const fontPt = textElements.map(element => (
      Number.parseFloat(getComputedStyle(element).fontSize) * 0.75
    ));
    return {
      text: document.body.innerText,
      images: document.querySelectorAll("img").length,
      scripts: document.querySelectorAll("script").length,
      injectedImages: payload
        ? Array.from(document.querySelectorAll("img")).filter(image => !image.closest(".schema")).length
        : 0,
      handlers: Array.from(document.querySelectorAll("*")).flatMap(element => (
        Array.from(element.attributes).filter(attribute => /^on/i.test(attribute.name))
      )).length,
      minFontPt: Math.min(...fontPt)
    };
  }, xssPayload);
  assert(audit.images === 1, `${language}/${path.basename(pdfPath)}: unexpected images`);
  assert(audit.scripts === 1, `${language}/${path.basename(pdfPath)}: unexpected scripts`);
  assert(audit.injectedImages === 0, `${language}/${path.basename(pdfPath)}: XSS image`);
  assert(audit.handlers === 0, `${language}/${path.basename(pdfPath)}: handler attributes`);
  assert(audit.minFontPt >= 8.4, `${language}/${path.basename(pdfPath)}: font ${audit.minFontPt}`);
  assert(errors.length === 0, `${language}/${path.basename(pdfPath)}: ${errors.join(" | ")}`);
  await page.pdf({
    path: pdfPath,
    preferCSSPageSize: true,
    printBackground: true,
    displayHeaderFooter: false,
    tagged: true
  });
  await context.close();
  return audit;
}

function verifyPdf(language, scenario, pdfPath, capture, audit, xssPayload = "") {
  const info = command("pdfinfo", [pdfPath]);
  const pages = Number(info.match(/^Pages:\s+(\d+)/m)?.[1] || 0);
  const size = info.match(/^Page size:\s+([\d.]+) x ([\d.]+) pts/m);
  assert(size, `${language}/${scenario.name}: page size`);
  const width = Number(size[1]);
  const height = Number(size[2]);
  assert(pages >= 1 && pages <= 3, `${language}/${scenario.name}: pages ${pages}`);
  assert(
    scenario.view === "ramp" ? height > width : width > height,
    `${language}/${scenario.name}: orientation`
  );

  const text = command("pdftotext", ["-layout", pdfPath, "-"]);
  assert(text.includes(capture.expected.summary), `${language}/${scenario.name}: summary`);
  assert(text.includes(capture.expected.vehicle), `${language}/${scenario.name}: vehicle`);
  assert(text.includes(capture.expected.fits), `${language}/${scenario.name}: status`);
  assert(text.includes(capture.expected.date), `${language}/${scenario.name}: localized date`);
  assert(!text.includes("⟦"), `${language}/${scenario.name}: technical key`);
  assert(!/\bundefined\b/.test(text), `${language}/${scenario.name}: undefined`);
  FORBIDDEN_RESIDUALS.forEach(residual => {
    assert(!text.includes(residual), `${language}/${scenario.name}: residual ${residual}`);
  });
  if (scenario.bw) {
    assert(text.includes(capture.expected.bw), `${language}/${scenario.name}: B/W mode`);
  }
  if (xssPayload) {
    assert(audit.text.includes(xssPayload), `${language}/${scenario.name}: user text changed`);
  }
  const pageTexts = text.split("\f").map(page => page.trim()).filter(Boolean);
  assert(pageTexts.length === pages, `${language}/${scenario.name}: extracted page count`);
  pageTexts.forEach((pageText, index) => {
    const words = pageText.split(/\s+/).filter(Boolean);
    assert(words.length >= 20, `${language}/${scenario.name}: nearly empty page ${index + 1}`);
  });

  const renderPrefix = path.join(path.dirname(pdfPath), `render-${scenario.name}`);
  command("pdftocairo", ["-png", "-r", "120", pdfPath, renderPrefix]);
  const renders = fs.readdirSync(path.dirname(pdfPath))
    .filter(name => name.startsWith(`render-${scenario.name}-`) && name.endsWith(".png"))
    .sort();
  assert(renders.length === pages, `${language}/${scenario.name}: render count`);
  renders.forEach(name => {
    assert(fs.statSync(path.join(path.dirname(pdfPath), name)).size > 5000, `${language}/${scenario.name}: empty render`);
  });
  return { pages, orientation: scenario.view === "ramp" ? "portrait" : "landscape", renders };
}

function standardMixed() {
  return [
    {
      length: 1200,
      width: 800,
      height: 1000,
      quantity: 4,
      name: "Euro pallet",
      identifier: "ITEM-A"
    },
    {
      length: 1200,
      width: 1000,
      height: 1100,
      quantity: 3,
      name: "Industrial pallet",
      identifier: "ITEM-B"
    }
  ];
}

function longLegend() {
  return Array.from({ length: 6 }, (_, index) => ({
    length: 800 + index * 30,
    width: 600 + (index % 2) * 80,
    height: 900 + index * 20,
    quantity: 1,
    name: `PALLET-NAME-${index + 1}-LONG`,
    identifier: `ITEM-${index + 1}-LONG-IDENTIFIER`
  }));
}

const XSS_PAYLOAD = "<img src=x onerror=alert(1)>ID";
const SCENARIOS = [
  { name: "single-side-color", kind: "single", view: "side", bw: false },
  { name: "single-side-bw", kind: "single", view: "side", bw: true },
  { name: "single-ramp-color", kind: "single", view: "ramp", bw: false },
  { name: "mixed-side-color", kind: "mixed", view: "side", bw: false },
  { name: "mixed-ramp-color", kind: "mixed", view: "ramp", bw: false },
  { name: "mixed-long-legend", kind: "long", view: "ramp", bw: false },
  { name: "single-long-hostile-id", kind: "hostile", view: "side", bw: false }
];

cleanOutput();
const browser = await launchBrowser(ROOT);
const records = [];

try {
  for (const language of LANGUAGES) {
    const app = await openApplication(browser, language);
    const localeDir = path.join(OUTPUT, language, "pdf");
    fs.mkdirSync(localeDir, { recursive: true });
    try {
      for (const scenario of SCENARIOS) {
        let fixture;
        if (scenario.kind === "mixed") {
          fixture = await configureMixed(app.page, standardMixed());
        } else if (scenario.kind === "long") {
          fixture = await configureMixed(app.page, longLegend());
        } else {
          fixture = await configureSingle(app.page, {
            presetId: scenario.kind === "hostile" ? "custom" : "eur",
            length: 1200,
            width: 800,
            customName: scenario.kind === "hostile" ? "Hostile custom pallet" : undefined,
            identifier: scenario.kind === "hostile" ? XSS_PAYLOAD : `ITEM-${language}`,
            quantity: 10,
            height: 1000
          });
        }
        assert(fixture.placed === fixture.requested, `${language}/${scenario.name}: incomplete load`);
        assert(fixture.rects > 0, `${language}/${scenario.name}: no geometry`);
        const capture = await capturePrint(app.page, scenario.view, scenario.bw);
        assert(capture.openCount === 1, `${language}/${scenario.name}: print popup`);
        assert(capture.html.startsWith("\n        <!DOCTYPE html>"), `${language}/${scenario.name}: print HTML`);
        assert(!capture.html.includes("⟦"), `${language}/${scenario.name}: technical key in HTML`);
        const pdfPath = path.join(localeDir, `${scenario.name}.pdf`);
        const hostile = scenario.kind === "hostile" ? XSS_PAYLOAD : "";
        if (hostile) {
          const hostileState = await app.page.evaluate(payload => ({
            inputLiteral: document.querySelector(
              "#singlePalletGroup [data-field='identifier']"
            )?.value === payload,
            images: document.querySelectorAll("img").length,
            injectedScripts: Array.from(document.querySelectorAll("script"))
              .filter(script => !script.id).length,
            handlers: Array.from(document.querySelectorAll("*")).flatMap(element => (
              Array.from(element.attributes).filter(attribute => /^on/i.test(attribute.name))
            )).length,
            compact: compactCanvasLabel(payload, 15)
          }), hostile);
          assert(hostileState.inputLiteral, `${language}/${scenario.name}: hostile input changed`);
          assert(hostileState.images === 4, `${language}/${scenario.name}: injected main image`);
          assert(hostileState.injectedScripts === 0, `${language}/${scenario.name}: injected main script`);
          assert(hostileState.handlers === 0, `${language}/${scenario.name}: injected handler`);
          assert(
            capture.canvasText.includes(hostileState.compact),
            `${language}/${scenario.name}: canvas text not preserved`
          );
        }
        const audit = await renderPdf(browser, language, capture, pdfPath, hostile);
        const pdf = verifyPdf(language, scenario, pdfPath, capture, audit, hostile);
        records.push({ language, scenario: scenario.name, ...pdf, status: "PASS" });
        console.log(`PASS ${language}/${scenario.name}: ${pdf.pages} page(s)`);
      }
      assert(app.errors.length === 0, `${language}: application errors ${app.errors.join(" | ")}`);
    } finally {
      await app.context.close();
    }
  }
} finally {
  await browser.close();
}

fs.writeFileSync(RESULT_PATH, `${JSON.stringify({
  version: "1.0.0-rc.3",
  generatedAt: FIXED_NOW,
  languages: LANGUAGES,
  scenariosPerLanguage: SCENARIOS.length,
  pdfs: records.length,
  records,
  status: "PASS"
}, null, 2)}\n`);
console.log(`Localized print suite PASS: ${records.length}/${records.length} PDFs.`);
