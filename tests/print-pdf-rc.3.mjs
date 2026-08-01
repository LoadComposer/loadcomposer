import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { inflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import { launchBrowser } from "./browser-runtime.mjs";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(TEST_DIR, "..");
const APP_PATH = path.resolve(
  PROJECT_DIR,
  process.env.LOADCOMPOSER_HTML || "site/index.html"
);
const APP_HTML = fs.readFileSync(APP_PATH, "utf8");
const OUTPUT_ROOT = process.env.PRINT_OUTPUT_ROOT
  ? path.resolve(process.env.PRINT_OUTPUT_ROOT)
  : PROJECT_DIR;
const PDF_DIR = path.join(OUTPUT_ROOT, "pdf");
const RENDER_DIR = path.join(OUTPUT_ROOT, "pdf-renders");
const BASELINE_ONLY = process.env.PRINT_BASELINE_ONLY === "1";
const RESULT_PATH = path.join(
  OUTPUT_ROOT,
  process.env.PRINT_RESULT_NAME ||
    (BASELINE_ONLY ? "print-baseline-rc.3.json" : "print-results-rc.3.json")
);
const FIXED_NOW = "2026-07-24T10:00:00.000Z";
const PRINT_MESSAGE =
  "Stampa operativa non disponibile: lo schema selezionato non è CI STA.";

const XSS_PAYLOADS = [
  '<img src=x onerror="window.__xss=1">',
  '<svg onload="window.__xss=2"></svg>',
  "</td></tr><script>window.__xss=3</script>",
  '"><input autofocus onfocus="window.__xss=4">',
  "javascript:alert(1)",
  'Test & <prova> "apostrofo" \'accenti àèìòù\'',
  "</script><script>window.__xss=5</script>"
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: atteso ${expected}, ottenuto ${actual}`);
  }
}

function expectedInteger(value) {
  const numericValue = Number(value);
  assert(Number.isFinite(numericValue), `dimensione attesa non numerica (${value})`);
  return String(Math.round(numericValue));
}

function expectedCompactLabel(value, maxLength = 15) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(1, maxLength - 1))}…`;
}

function expectedDimensionForRect(snapshot, rect) {
  const type = snapshot.mode === "single"
    ? snapshot.pallet
    : snapshot.types[rect.typeIndex];
  assert(type, `tipo nominale atteso assente per typeIndex ${rect.typeIndex}`);
  return (
    `${expectedInteger(type.length)}` +
    `×${expectedInteger(type.width)}`
  );
}

function buildIndependentLabelExpectation(snapshot) {
  const perRect = snapshot.rects.map((rect, index) => {
    const type = snapshot.mode === "single"
      ? snapshot.pallet
      : snapshot.types[rect.typeIndex];
    const identifier = String(
      snapshot.mode === "single"
        ? snapshot.pallet.identifier || ""
        : type.identifier || ""
    ).trim();
    const reference = snapshot.mode === "single"
      ? `P${index + 1}`
      : `${rect.typeIndex + 1}.${rect.unitNo}`;
    const dimension = expectedDimensionForRect(snapshot, rect);
    const lines = identifier
      ? [expectedCompactLabel(identifier), reference, dimension]
      : [reference, dimension];

    if (snapshot.mode === "single" && rect.stackCount > 1) {
      lines.push(`${expectedInteger(rect.stackCount)} pallet`);
    }

    return {
      index,
      typeIndex: rect.typeIndex,
      rotated: Boolean(rect.rotated),
      physicalDimension:
        `${expectedInteger(rect.length)}×${expectedInteger(rect.width)}`,
      expectedDimension: dimension,
      invertedNominalDimension:
        `${expectedInteger(type.width)}×${expectedInteger(type.length)}`,
      lines
    };
  });

  return {
    perRect,
    lines: perRect.flatMap(item => item.lines),
    dimensions: perRect.map(item => item.expectedDimension),
    rotatedRectangles: perRect.filter(item => item.rotated).length
  };
}

function auditCapturedLabels(capture) {
  const expectation = buildIndependentLabelExpectation(capture.snapshot);
  const invertedSingleOccurrences = capture.snapshot.mode === "single"
    ? expectation.perRect.reduce((count, item, index) => (
      count + (
        item.invertedNominalDimension !== item.expectedDimension &&
        capture.drawnDimensions[index] === item.invertedNominalDimension
          ? 1
          : 0
      )
    ), 0)
    : 0;

  return {
    ...capture,
    expected: expectation.lines,
    expectedDimensions: expectation.dimensions,
    perRect: expectation.perRect,
    rotatedRectangles: expectation.rotatedRectangles,
    invertedSingleOccurrences,
    expectationBuilderUsesApplicationFunction: false
  };
}

function ensureCleanOutput() {
  fs.rmSync(PDF_DIR, { recursive: true, force: true });
  fs.rmSync(RENDER_DIR, { recursive: true, force: true });
  fs.mkdirSync(PDF_DIR, { recursive: true });
  fs.mkdirSync(RENDER_DIR, { recursive: true });
}

async function createApplicationPage(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    timezoneId: "Europe/Rome",
    locale: process.env.LOADCOMPOSER_LOCALE || "it-IT"
  });
  await context.addInitScript(fixedNow => {
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
  }, FIXED_NOW);

  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.setContent(APP_HTML, { waitUntil: "load" });
  await page.waitForTimeout(30);

  return { context, page, consoleErrors, pageErrors };
}

async function configureSingle(page, options = {}) {
  const result = await page.evaluate(config => {
    document.getElementById("loadMode").value = "single";
    syncModeUI({ calculate: false });
    selectedContainerId = config.containerId || "20dc";

    const group = document.getElementById("singlePalletGroup");
    selectPresetForGroup(group, config.presetId || "eur", false);
    if ((config.presetId || "eur") === "custom") {
      group.querySelector('[data-field="length"]').value = String(config.length || 1200);
      group.querySelector('[data-field="width"]').value = String(config.width || 800);
      group.querySelector('[data-field="customName"]').value =
        config.customName || "Pallet personalizzato";
    }
    group.querySelector('[data-field="identifier"]').value = config.identifier || "";
    document.getElementById("quantity").value = String(config.quantity ?? 10);
    document.getElementById("palletHeight").value = String(config.height ?? 1000);
    document.getElementById("gap").value = String(config.gap ?? 0);
    document.getElementById("stackable").checked = Boolean(config.stackable);
    document.getElementById("maxLayers").value = String(config.maxLayers ?? 2);
    document.getElementById("verticalGap").value = String(config.verticalGap ?? 0);
    document.getElementById("stackOptions").classList.toggle(
      "hidden",
      !config.stackable
    );
    const allowRotate = config.allowRotate !== false;
    group.querySelector('[data-field="allowRotate"]').checked = allowRotate;
    const lockedOrientation = config.lockedOrientation || "normal";
    const lockedRadio = group.querySelector(
      `[data-field="lockedOrientation"][value="${lockedOrientation}"]`
    );
    if (!lockedRadio) {
      throw new Error(`Orientamento bloccato non valido: ${lockedOrientation}`);
    }
    lockedRadio.checked = true;
    updateGroupVisuals(group);
    if (!calculate()) throw new Error("Calcolo single non riuscito.");

    const index = lastResults.findIndex(
      item => item.container.id === (config.containerId || "20dc")
    );
    if (index < 0) throw new Error("Risultato single del mezzo assente.");
    document.getElementById("drawSelect").value = String(index);
    drawSelected();
    const selected = lastResults[index];
    return {
      ok: selected.ok,
      validationError: selected.validationError,
      validationValid: selected.validation && selected.validation.valid,
      requested: selected.input.quantity,
      placed: selected.placedCount,
      capacity: selected.totalCapacity,
      floorPositions: selected.placedFloorPositions,
      floorCapacity: selected.floorCapacity,
      layers: selected.loadLayers,
      rectangles: selected.layout.rects.length,
      rotatedRectangles: selected.layout.rects.filter(rect => rect.rotated).length,
      printDisabled: document.getElementById("printLayoutBtn").disabled
    };
  }, options);

  return result;
}

async function configureMixed(page, groups, options = {}) {
  return page.evaluate(({ fixtureGroups, fixtureOptions }) => {
    document.getElementById("loadMode").value = "mixed";
    document.getElementById("mixedRows").replaceChildren();
    mixedRowCounter = 0;
    fixtureGroups.forEach(group => {
      addMixedRow(
        {
          presetId: group.presetId || "custom",
          length: group.length,
          width: group.width,
          height: group.height || 900,
          quantity: group.quantity ?? 1,
          customName: group.name || "Pallet personalizzato",
          identifier: group.identifier || "",
          allowRotate: group.allowRotate !== false,
          lockedOrientation: group.lockedOrientation || "normal"
        },
        { calculate: false }
      );
    });
    document.getElementById("mixedGap").value = String(fixtureOptions.gap ?? 0);
    selectedContainerId = fixtureOptions.containerId || "20dc";
    syncModeUI({ calculate: false });
    if (!calculate()) throw new Error("Calcolo mixed non riuscito.");

    const index = lastResults.findIndex(
      item => item.container.id === (fixtureOptions.containerId || "20dc")
    );
    if (index < 0) throw new Error("Risultato mixed del mezzo assente.");
    document.getElementById("drawSelect").value = String(index);
    drawSelected();
    const selected = lastResults[index];
    return {
      ok: selected.ok,
      validationError: selected.validationError,
      validationValid: selected.validation && selected.validation.valid,
      requested: selected.totalItems,
      placed: selected.placedCount,
      capacity: selected.totalCapacity,
      floorPositions: selected.placedCount,
      layers: 1,
      typeCount: selected.input.types.length,
      rectangles: selected.layout.rects.length,
      rotatedRectangles: selected.layout.rects.filter(rect => rect.rotated).length,
      printDisabled: document.getElementById("printLayoutBtn").disabled
    };
  }, { fixtureGroups: groups, fixtureOptions: options });
}

async function selectPrintMode(page, view, bwMode) {
  await page.evaluate(({ selectedView, selectedBw }) => {
    document.getElementById("printView").value = selectedView;
    document.getElementById("printBw").checked = selectedBw;
    drawSelected();
  }, { selectedView: view, selectedBw: bwMode });
}

async function captureCanvasLabels(page, view, bwMode) {
  const capture = await page.evaluate(({ selectedView, selectedBw, baselineOnly }) => {
    const index = Number(document.getElementById("drawSelect").value || 0);
    const result = lastResults[index];

    const calls = [];
    const backingRects = [];
    const originalFillText = CanvasRenderingContext2D.prototype.fillText;
    const originalFillRect = CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillText = function (...args) {
      calls.push({
        text: String(args[0]),
        maxWidth: args.length >= 4 ? Number(args[3]) : null
      });
      return originalFillText.apply(this, args);
    };
    CanvasRenderingContext2D.prototype.fillRect = function (x, y, width, height) {
      const fillStyle = String(this.fillStyle).replace(/\s+/g, "").toLowerCase();
      if (
        fillStyle === "rgba(255,255,255,0.88)" &&
        this.globalAlpha > 0 &&
        this.globalAlpha <= 1
      ) {
        backingRects.push({
          x: Number(x),
          y: Number(y),
          width: Number(width),
          height: Number(height),
          fillStyle,
          globalAlpha: Number(this.globalAlpha)
        });
      }
      return originalFillRect.call(this, x, y, width, height);
    };

    try {
      document.getElementById("printView").value = selectedView;
      document.getElementById("printBw").checked = selectedBw;
      drawSelected();
    } finally {
      CanvasRenderingContext2D.prototype.fillText = originalFillText;
      CanvasRenderingContext2D.prototype.fillRect = originalFillRect;
    }

    const palletCalls = calls.filter(item => (
      baselineOnly || item.maxWidth !== null
    ));
    const drawnLabelLines = palletCalls.map(item => item.text);
    const drawnDimensions = palletCalls
      .map(item => item.text)
      .filter(text => /^\d+×\d+$/.test(text));

    return {
      drawnLabelLines,
      drawnDimensions,
      palletCalls,
      completeIdentifiers: result.mode === "mixed"
        ? result.input.types.map(type => type.identifier)
        : [result.input.pallet.identifier],
      hasRotatedAbbreviation: calls.some(call => /ruot\./i.test(call.text)),
      backingRects,
      backingRectCount: backingRects.length,
      snapshot: {
        mode: result.mode,
        pallet: result.mode === "single"
          ? {
            length: result.input.pallet.length,
            width: result.input.pallet.width,
            identifier: result.input.pallet.identifier
          }
          : null,
        types: result.mode === "mixed"
          ? result.input.types.map(type => ({
            length: type.length,
            width: type.width,
            identifier: type.identifier
          }))
          : [],
        rects: result.layout.rects.map(rect => ({
          typeIndex: rect.typeIndex ?? null,
          unitNo: rect.unitNo ?? null,
          stackCount: rect.stackCount ?? 1,
          rotated: Boolean(rect.rotated),
          length: rect.length,
          width: rect.width
        }))
      }
    };
  }, { selectedView: view, selectedBw: bwMode, baselineOnly: BASELINE_ONLY });

  return auditCapturedLabels(capture);
}

async function capturePrintHtml(page) {
  return page.evaluate(() => {
    window.__capturedPrintHtml = "";
    window.__printOpenCount = 0;
    const calls = [];
    const originalFillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args) {
      calls.push({
        text: String(args[0]),
        maxWidth: args.length >= 4 ? Number(args[3]) : null
      });
      return originalFillText.apply(this, args);
    };
    window.open = () => {
      window.__printOpenCount += 1;
      return {
        document: {
          open() {},
          write(value) {
            window.__capturedPrintHtml += String(value);
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
    const drawnLabelLines = calls
      .filter(call => call.maxWidth !== null)
      .map(call => call.text);
    return {
      html: window.__capturedPrintHtml,
      openCount: window.__printOpenCount,
      drawnLabelLines,
      drawnDimensions: drawnLabelLines.filter(text => /^\d+×\d+$/.test(text))
    };
  });
}

async function renderPrintDocument(browser, html, pdfPath, expectedPayload = "") {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
    deviceScaleFactor: 1,
    timezoneId: "Europe/Rome"
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.evaluate(() => {
    window.focus = () => {};
    window.print = () => {
      window.__printCalled = true;
    };
  });
  await page.setContent(html, { waitUntil: "load" });
  await page.waitForFunction(
    () => {
      const image = document.querySelector(".schema img");
      return Boolean(
        document.body &&
        (
          document.body.dataset.printReady === "true" ||
          (image && image.complete && image.naturalWidth > 0)
        )
      );
    }
  );

  const domAudit = await page.evaluate(payload => {
    const image = document.querySelector(".schema img");
    const standardTextElements = Array.from(document.querySelectorAll("body *"))
      .filter(element => {
        if (element.closest(".warehouse-note")) return false;
        if (["SCRIPT", "STYLE"].includes(element.tagName)) return false;
        if (!Array.from(element.childNodes).some(node => (
          node.nodeType === Node.TEXT_NODE && node.textContent.trim()
        ))) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && rect.width > 0 && rect.height > 0;
      });
    const fontPoints = standardTextElements.map(element => (
      Number.parseFloat(getComputedStyle(element).fontSize) * 0.75
    ));
    const handlers = Array.from(document.querySelectorAll("*")).flatMap(element => (
      Array.from(element.attributes)
        .filter(attribute => /^on/i.test(attribute.name))
        .map(attribute => `${element.tagName}[${attribute.name}]`)
    ));

    return {
      imageComplete: Boolean(image && image.complete && image.naturalWidth > 0),
      imageNaturalWidth: image?.naturalWidth || 0,
      imageNaturalHeight: image?.naturalHeight || 0,
      minStandardFontPt: Math.min(...fontPoints),
      bodyText: document.body.textContent,
      scripts: document.querySelectorAll("script").length,
      images: document.querySelectorAll("img").length,
      svgs: document.querySelectorAll("svg").length,
      inputs: document.querySelectorAll("input").length,
      handlers,
      xssValue: window.__xss,
      payloadLiteral: payload ? document.body.textContent.includes(payload) : true
    };
  }, expectedPayload);

  assert(domAudit.imageComplete, `${pdfPath}: immagine schema non caricata`);
  if (!BASELINE_ONLY) {
    assert(
      domAudit.minStandardFontPt >= 8.45,
      `${pdfPath}: font minimo ${domAudit.minStandardFontPt.toFixed(2)} pt`
    );
  }
  assertEqual(domAudit.images, 1, `${pdfPath}: immagini inattese`);
  assertEqual(domAudit.scripts, 1, `${pdfPath}: script inattesi`);
  assertEqual(domAudit.svgs, 0, `${pdfPath}: SVG creati`);
  assertEqual(domAudit.inputs, 0, `${pdfPath}: input creati`);
  assertEqual(domAudit.handlers.length, 0, `${pdfPath}: handler HTML creati`);
  assert(domAudit.xssValue === undefined, `${pdfPath}: payload XSS eseguito`);
  assert(domAudit.payloadLiteral, `${pdfPath}: payload non conservato letteralmente`);
  assertEqual(consoleErrors.length, 0, `${pdfPath}: errori console`);
  assertEqual(pageErrors.length, 0, `${pdfPath}: errori pagina`);

  await page.pdf({
    path: pdfPath,
    preferCSSPageSize: true,
    printBackground: true,
    displayHeaderFooter: false,
    tagged: true
  });
  await context.close();
  return domAudit;
}

function parsePdfInfo(pdfPath) {
  const info = execFileSync("pdfinfo", ["-box", pdfPath], { encoding: "utf8" });
  const pages = Number(info.match(/^Pages:\s+(\d+)/m)?.[1] || 0);
  const sizeMatch = info.match(
    /^Page size:\s+([\d.]+) x ([\d.]+) pts(?:\s+\(A4\))?/m
  );
  assert(sizeMatch, `${pdfPath}: dimensione pagina non letta`);
  return {
    pages,
    widthPt: Number(sizeMatch[1]),
    heightPt: Number(sizeMatch[2]),
    raw: info
  };
}

function parsePageWords(pdfPath) {
  const xml = execFileSync("pdftotext", ["-bbox-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024
  });
  return Array.from(
    xml.matchAll(/<page width="([\d.]+)" height="([\d.]+)">([\s\S]*?)<\/page>/g)
  ).map((match, index) => {
    const words = Array.from(
      match[3].matchAll(
        /<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([\s\S]*?)<\/word>/g
      )
    ).map(word => ({
      xMin: Number(word[1]),
      yMin: Number(word[2]),
      xMax: Number(word[3]),
      yMax: Number(word[4]),
      text: word[5]
    }));
    return {
      index: index + 1,
      width: Number(match[1]),
      height: Number(match[2]),
      words
    };
  });
}

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
]);
const PNG_CRC_TABLE = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
  }
  return crc >>> 0;
});

function pngCrc32(buffer) {
  let crc = 0xffffffff;
  for (const value of buffer) {
    crc = PNG_CRC_TABLE[(crc ^ value) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function paethPredictor(left, above, upperLeft) {
  const prediction = left + above - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const aboveDistance = Math.abs(prediction - above);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) {
    return left;
  }
  if (aboveDistance <= upperLeftDistance) return above;
  return upperLeft;
}

function decodeAndVerifyPng(renderPath) {
  const bytes = fs.readFileSync(renderPath);
  assert(
    bytes.length >= PNG_SIGNATURE.length + 12 &&
      bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE),
    `${renderPath}: firma PNG non valida`
  );

  let offset = PNG_SIGNATURE.length;
  let ihdr = null;
  let iendPresent = false;
  const idatParts = [];
  const chunkTypes = [];

  while (offset < bytes.length) {
    assert(offset + 12 <= bytes.length, `${renderPath}: chunk PNG troncato`);
    const length = bytes.readUInt32BE(offset);
    const typeStart = offset + 4;
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const crcOffset = dataEnd;
    assert(
      crcOffset + 4 <= bytes.length,
      `${renderPath}: unexpected end-of-file nel chunk PNG`
    );

    const typeBuffer = bytes.subarray(typeStart, dataStart);
    const type = typeBuffer.toString("ascii");
    const data = bytes.subarray(dataStart, dataEnd);
    const expectedCrc = bytes.readUInt32BE(crcOffset);
    const actualCrc = pngCrc32(Buffer.concat([typeBuffer, data]));
    assertEqual(actualCrc, expectedCrc, `${renderPath}: CRC ${type}`);
    chunkTypes.push(type);

    if (type === "IHDR") {
      assert(!ihdr, `${renderPath}: IHDR duplicato`);
      assertEqual(length, 13, `${renderPath}: lunghezza IHDR`);
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12]
      };
    } else if (type === "IDAT") {
      idatParts.push(data);
    } else if (type === "IEND") {
      assertEqual(length, 0, `${renderPath}: lunghezza IEND`);
      iendPresent = true;
      offset = crcOffset + 4;
      break;
    }

    offset = crcOffset + 4;
  }

  assert(ihdr, `${renderPath}: IHDR assente`);
  assert(iendPresent, `${renderPath}: chunk IEND assente`);
  assertEqual(offset, bytes.length, `${renderPath}: dati dopo IEND`);
  assert(ihdr.width > 0 && ihdr.height > 0, `${renderPath}: dimensioni PNG non positive`);
  assertEqual(ihdr.bitDepth, 8, `${renderPath}: bit depth PNG non supportato`);
  assert(
    [0, 2, 4, 6].includes(ihdr.colorType),
    `${renderPath}: color type PNG non supportato (${ihdr.colorType})`
  );
  assertEqual(ihdr.compression, 0, `${renderPath}: compressione PNG`);
  assertEqual(ihdr.filter, 0, `${renderPath}: metodo filtro PNG`);
  assertEqual(ihdr.interlace, 0, `${renderPath}: PNG interlacciato inatteso`);
  assert(idatParts.length > 0, `${renderPath}: IDAT assente`);

  const channelsByColorType = new Map([
    [0, 1],
    [2, 3],
    [4, 2],
    [6, 4]
  ]);
  const channels = channelsByColorType.get(ihdr.colorType);
  const bytesPerPixel = channels;
  const rowBytes = ihdr.width * channels;
  let inflated;
  try {
    inflated = inflateSync(Buffer.concat(idatParts));
  } catch (error) {
    throw new Error(`${renderPath}: errore decoder PNG (${error.message})`);
  }
  const expectedInflatedLength = ihdr.height * (rowBytes + 1);
  assertEqual(
    inflated.length,
    expectedInflatedLength,
    `${renderPath}: decodifica PNG incompleta`
  );

  const pixels = Buffer.alloc(rowBytes * ihdr.height);
  for (let row = 0; row < ihdr.height; row += 1) {
    const sourceStart = row * (rowBytes + 1);
    const filterType = inflated[sourceStart];
    assert(filterType <= 4, `${renderPath}: filtro PNG non valido (${filterType})`);
    const targetStart = row * rowBytes;

    for (let column = 0; column < rowBytes; column += 1) {
      const raw = inflated[sourceStart + 1 + column];
      const left = column >= bytesPerPixel
        ? pixels[targetStart + column - bytesPerPixel]
        : 0;
      const above = row > 0
        ? pixels[targetStart - rowBytes + column]
        : 0;
      const upperLeft = row > 0 && column >= bytesPerPixel
        ? pixels[targetStart - rowBytes + column - bytesPerPixel]
        : 0;
      let value = raw;
      if (filterType === 1) value = (raw + left) & 0xff;
      if (filterType === 2) value = (raw + above) & 0xff;
      if (filterType === 3) value = (raw + Math.floor((left + above) / 2)) & 0xff;
      if (filterType === 4) {
        value = (raw + paethPredictor(left, above, upperLeft)) & 0xff;
      }
      pixels[targetStart + column] = value;
    }
  }

  let inkPixels = 0;
  let minimumX = ihdr.width;
  let minimumY = ihdr.height;
  let maximumX = -1;
  let maximumY = -1;
  let minimumChannel = 255;
  let maximumChannel = 0;

  for (let y = 0; y < ihdr.height; y += 1) {
    for (let x = 0; x < ihdr.width; x += 1) {
      const pixelOffset = y * rowBytes + x * channels;
      const red = pixels[pixelOffset];
      const green = ihdr.colorType === 0 || ihdr.colorType === 4
        ? red
        : pixels[pixelOffset + 1];
      const blue = ihdr.colorType === 0 || ihdr.colorType === 4
        ? red
        : pixels[pixelOffset + 2];
      minimumChannel = Math.min(minimumChannel, red, green, blue);
      maximumChannel = Math.max(maximumChannel, red, green, blue);
      if (red < 245 || green < 245 || blue < 245) {
        inkPixels += 1;
        minimumX = Math.min(minimumX, x);
        minimumY = Math.min(minimumY, y);
        maximumX = Math.max(maximumX, x);
        maximumY = Math.max(maximumY, y);
      }
    }
  }

  const pixelCount = ihdr.width * ihdr.height;
  assert(
    inkPixels > 0 && maximumChannel > minimumChannel,
    `${renderPath}: immagine PNG vuota o uniforme`
  );
  const contentBoundingRatio = maximumX < 0
    ? 0
    : (
      (maximumX - minimumX + 1) *
      (maximumY - minimumY + 1)
    ) / pixelCount;

  return {
    file: path.relative(OUTPUT_ROOT, renderPath),
    width: ihdr.width,
    height: ihdr.height,
    bitDepth: ihdr.bitDepth,
    colorType: ihdr.colorType,
    iendPresent,
    decodedBytes: pixels.length,
    decoderErrors: 0,
    inkPixelRatio: inkPixels / pixelCount,
    contentBoundingRatio,
    chunkTypes
  };
}

function renderPdfPages(pdfPath) {
  const basename = path.basename(pdfPath, ".pdf");
  const escapedBasename = basename.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const targetPattern = new RegExp(`^${escapedBasename}-(\\d+)\\.png$`);
  fs.readdirSync(RENDER_DIR)
    .filter(name => targetPattern.test(name))
    .forEach(name => fs.rmSync(path.join(RENDER_DIR, name), { force: true }));

  let lastError = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const temporaryDirectory = fs.mkdtempSync(
      path.join(os.tmpdir(), "loadcomposer-pdf-render-")
    );
    const temporaryPrefix = path.join(temporaryDirectory, basename);

    try {
      execFileSync(
        "pdftocairo",
        ["-png", "-r", "120", pdfPath, temporaryPrefix],
        { stdio: "pipe", maxBuffer: 40 * 1024 * 1024 }
      );
      const temporaryRenders = fs.readdirSync(temporaryDirectory)
        .filter(name => targetPattern.test(name))
        .sort()
        .map(name => path.join(temporaryDirectory, name));
      assert(
        temporaryRenders.length > 0,
        `${pdfPath}: renderer PNG senza output`
      );
      temporaryRenders.forEach(decodeAndVerifyPng);

      const finalRenders = temporaryRenders.map(temporaryPath => {
        const targetPath = path.join(RENDER_DIR, path.basename(temporaryPath));
        fs.copyFileSync(temporaryPath, targetPath);
        return targetPath;
      });
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
      finalRenders.forEach(decodeAndVerifyPng);
      return finalRenders;
    } catch (error) {
      lastError = error;
      fs.rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  }

  throw new Error(
    `${pdfPath}: rendering PNG non valido dopo 4 tentativi (${lastError?.message || "errore sconosciuto"})`
  );
}

function removeTemporaryRenderDirectories() {
  fs.readdirSync(RENDER_DIR, { withFileTypes: true })
    .filter(entry => (
      entry.isDirectory() &&
      entry.name.startsWith(".render-attempt-")
    ))
    .forEach(entry => {
      fs.rmSync(
        path.join(RENDER_DIR, entry.name),
        { recursive: true, force: true }
      );
    });
}

const WAREHOUSE_NOTE_TEXT =
  "Schema indicativo da verificare in fase di carico: tolleranze pallet, " +
  "rigonfiamenti, fissaggio merce ed eventuali istruzioni dello " +
  "spedizioniere/compagnia. Peso e bilanciamento non sono inclusi in questa versione.";

function decodeXmlText(value) {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#([0-9]+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function pageTextTokens(words) {
  return words
    .flatMap(word => (
      decodeXmlText(word.text)
        .toLocaleLowerCase("it-IT")
        .match(/[\p{L}\p{N}]+/gu) || []
    ));
}

const WAREHOUSE_NOTE_TOKENS = new Set(
  pageTextTokens([{ text: WAREHOUSE_NOTE_TEXT }])
);

function analyzePageQuality(page, pngAudit) {
  const tokens = pageTextTokens(page.words);
  const characters = page.words
    .map(word => decodeXmlText(word.text))
    .join("")
    .length;
  const warehouseOnly = (
    tokens.length > 0 &&
    tokens.every(token => WAREHOUSE_NOTE_TOKENS.has(token))
  );
  const fewIsolatedWords = page.index > 1 && page.words.length < 12;
  const nearlyEmptyRender = (
    pngAudit.inkPixelRatio < 0.01 ||
    pngAudit.contentBoundingRatio < 0.04
  );

  return {
    page: page.index,
    words: page.words.length,
    characters,
    warehouseOnly,
    fewIsolatedWords,
    nearlyEmptyRender,
    inkPixelRatio: pngAudit.inkPixelRatio,
    contentBoundingRatio: pngAudit.contentBoundingRatio
  };
}

function verifyPdf(
  pdfPath,
  expectedOrientation,
  requiredText = [],
  options = {}
) {
  const info = parsePdfInfo(pdfPath);
  const landscape = info.widthPt > info.heightPt;
  assertEqual(
    landscape ? "landscape" : "portrait",
    expectedOrientation,
    `${pdfPath}: orientamento`
  );
  const shortSide = Math.min(info.widthPt, info.heightPt);
  const longSide = Math.max(info.widthPt, info.heightPt);
  assert(Math.abs(shortSide - 595.28) < 1, `${pdfPath}: lato corto non A4`);
  assert(Math.abs(longSide - 841.89) < 1, `${pdfPath}: lato lungo non A4`);
  assert(info.pages >= 1 && info.pages <= 5, `${pdfPath}: numero pagine ${info.pages}`);
  if (options.expectedPages !== undefined) {
    assertEqual(
      info.pages,
      options.expectedPages,
      `${pdfPath}: pagina aggiuntiva non necessaria`
    );
  }

  const text = execFileSync("pdftotext", ["-layout", pdfPath, "-"], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024
  });
  const mandatoryText = BASELINE_ONLY
    ? ["CI STA", "Generato"]
    : [
      "CI STA",
      "Quantità richiesta",
      "Quantità piazzata",
      "Peso e bilanciamento",
      "Generato"
    ];
  mandatoryText.forEach(fragment => {
    assert(text.includes(fragment), `${pdfPath}: testo obbligatorio assente (${fragment})`);
  });
  requiredText.forEach(fragment => {
    assert(text.includes(fragment), `${pdfPath}: testo scenario assente (${fragment})`);
  });
  assert(!/ruot\./i.test(text), `${pdfPath}: dicitura “ruot.” presente`);

  const pageWords = parsePageWords(pdfPath);
  assertEqual(pageWords.length, info.pages, `${pdfPath}: pagine bbox`);
  if (options.singleLineQuantityHeader) {
    assert(
      pageWords.some(page => (
        page.words.some(word => decodeXmlText(word.text) === "Q.tà")
      )),
      `${pdfPath}: intestazione Q.tà non conservata su una riga`
    );
  }
  const marginTolerancePt = 20;
  const outOfBoundsWords = [];
  const renders = renderPdfPages(pdfPath);
  assertEqual(renders.length, info.pages, `${pdfPath}: render PNG incompleti`);
  const pngAudits = renders.map(decodeAndVerifyPng);
  const pageQuality = pageWords.map((page, index) => (
    analyzePageQuality(page, pngAudits[index])
  ));

  pageWords.forEach((page, index) => {
    const quality = pageQuality[index];
    assert(page.words.length > 0, `${pdfPath}: pagina ${page.index} bianca`);
    if (!BASELINE_ONLY) {
      assert(
        !quality.warehouseOnly,
        `${pdfPath}: pagina ${page.index} contiene soltanto la warehouse-note`
      );
      assert(
        !quality.fewIsolatedWords,
        `${pdfPath}: pagina ${page.index} contiene soltanto poche parole isolate`
      );
      assert(
        !quality.nearlyEmptyRender,
        `${pdfPath}: pagina ${page.index} ha copertura di contenuto quasi nulla`
      );
    }
    page.words.forEach(word => {
      const inside = (
        word.xMin >= marginTolerancePt - 1 &&
          word.xMax <= page.width - marginTolerancePt + 1 &&
          word.yMin >= marginTolerancePt - 1 &&
          word.yMax <= page.height - marginTolerancePt + 1
      );
      if (!inside) {
        outOfBoundsWords.push({ page: page.index, text: word.text, ...word });
      }
    });
  });
  if (!BASELINE_ONLY) {
    assertEqual(
      outOfBoundsWords.length,
      0,
      `${pdfPath}: parole fuori margine ${JSON.stringify(outOfBoundsWords.slice(0, 5))}`
    );
  }

  return {
    pages: info.pages,
    widthPt: info.widthPt,
    heightPt: info.heightPt,
    orientation: landscape ? "landscape" : "portrait",
    outOfBoundsWords: outOfBoundsWords.length,
    renders: renders.map(file => path.relative(OUTPUT_ROOT, file)),
    pageQuality,
    pngAudits
  };
}

function measurePageQualityGuards() {
  const isolatedWordFixture = analyzePageQuality(
    {
      index: 2,
      words: [
        { text: "Nota" },
        { text: "isolata" },
        { text: "senza" },
        { text: "contenuto" }
      ]
    },
    {
      inkPixelRatio: 0.2,
      contentBoundingRatio: 0.2
    }
  );
  assert(
    isolatedWordFixture.fewIsolatedWords,
    "guardia poche parole isolate non attiva"
  );

  return {
    isolatedWordGuard: {
      fixtureWords: isolatedWordFixture.words,
      detected: isolatedWordFixture.fewIsolatedWords,
      status: "PASS"
    }
  };
}

async function verifyOperationalGuards(page) {
  const nonOk = await configureSingle(page, { quantity: 12, height: 1000 });
  assertEqual(nonOk.ok, false, "fixture NON OK inattesa");
  assertEqual(nonOk.printDisabled, true, "stampa NON OK non disabilitata");
  const nonOkStatus = await page.evaluate(message => ({
    notes: document.getElementById("layoutNotes").textContent,
    title: document.getElementById("printLayoutBtn").title,
    message
  }), PRINT_MESSAGE);
  assert(nonOkStatus.notes.includes(PRINT_MESSAGE), "messaggio NON OK assente");
  assertEqual(nonOkStatus.title, PRINT_MESSAGE, "tooltip NON OK");
  const nonOkPopup = await capturePrintHtml(page);
  assertEqual(nonOkPopup.openCount, 0, "popup aperto per risultato NON OK");
  assertEqual(nonOkPopup.html, "", "documento operativo creato per NON OK");

  await configureSingle(page, { quantity: 10, height: 1000 });
  const validation = await page.evaluate(() => {
    const index = Number(document.getElementById("drawSelect").value || 0);
    lastResults[index].validationError = true;
    lastResults[index].validation.valid = false;
    drawSelected();
    return {
      disabled: document.getElementById("printLayoutBtn").disabled,
      notes: document.getElementById("layoutNotes").textContent
    };
  });
  assertEqual(validation.disabled, true, "stampa errore validazione non disabilitata");
  const validationPopup = await capturePrintHtml(page);
  assertEqual(validationPopup.openCount, 0, "popup aperto con errore validazione");
  assertEqual(validationPopup.html, "", "documento creato con errore validazione");

  return {
    nonOk: "PASS",
    validationError: "PASS",
    message: PRINT_MESSAGE
  };
}

async function measureBaselineOperationalGuard(page) {
  const nonOk = await configureSingle(page, { quantity: 12, height: 1000 });
  const status = await page.evaluate(() => ({
    notes: document.getElementById("layoutNotes").textContent,
    title: document.getElementById("printLayoutBtn").title
  }));
  const popup = await capturePrintHtml(page);
  return {
    resultOk: nonOk.ok,
    printDisabled: nonOk.printDisabled,
    popupOpenCount: popup.openCount,
    operationalDocumentCreated: popup.html.length > 0,
    requiredMessagePresent: status.notes.includes(PRINT_MESSAGE),
    status: "BASELINE_DEFECT_REPRODUCED"
  };
}

function twoMixedGroups() {
  return [
    {
      length: 1200,
      width: 800,
      height: 900,
      quantity: 4,
      name: "Euro pallet vino",
      identifier: "ART-123"
    },
    {
      length: 1200,
      width: 1000,
      height: 900,
      quantity: 3,
      name: "Industriale cliente B",
      identifier: "ART-987"
    }
  ];
}

function longMixedGroups(count) {
  return Array.from({ length: count }, (_, index) => ({
    length: 900 + (index % 3) * 50,
    width: 700 + (index % 2) * 100,
    height: 800 + index * 10,
    quantity: 1,
    name: `Pallet personalizzato gruppo ${index + 1} con nome lungo`,
    identifier: `IDENTIFICATIVO-COMPLETO-GRUPPO-${String(index + 1).padStart(2, "0")}`
  }));
}

function scenarioList() {
  const single = [
    {
      file: "side-single-color.pdf",
      kind: "single",
      view: "side",
      bw: false,
      options: { quantity: 10, height: 1000 },
      requiredText: ["10 pallet richiesti"],
      expectedDimension: "1200×800",
      forbiddenDimension: "800×1200"
    },
    {
      file: "side-single-bw.pdf",
      kind: "single",
      view: "side",
      bw: true,
      options: { quantity: 10, height: 1000 },
      expectedDimension: "1200×800",
      forbiddenDimension: "800×1200"
    },
    {
      file: "ramp-single-color.pdf",
      kind: "single",
      view: "ramp",
      bw: false,
      options: { quantity: 10, height: 1000 },
      expectedDimension: "1200×800",
      forbiddenDimension: "800×1200"
    },
    {
      file: "ramp-single-bw.pdf",
      kind: "single",
      view: "ramp",
      bw: true,
      options: { quantity: 10, height: 1000 },
      expectedDimension: "1200×800",
      forbiddenDimension: "800×1200"
    }
  ];

  if (BASELINE_ONLY) return single;

  const nominalRotatedCases = [
    {
      slug: "euro-locked-rotated",
      options: {
        presetId: "eur",
        quantity: 6,
        height: 1000,
        allowRotate: false,
        lockedOrientation: "rotated"
      },
      expectedDimension: "1200×800",
      forbiddenDimension: "800×1200"
    },
    {
      slug: "industrial-locked-rotated",
      options: {
        presetId: "industrial",
        quantity: 5,
        height: 1000,
        allowRotate: false,
        lockedOrientation: "rotated"
      },
      expectedDimension: "1200×1000",
      forbiddenDimension: "1000×1200"
    },
    {
      slug: "custom-1450x900-locked-rotated",
      options: {
        presetId: "custom",
        length: 1450,
        width: 900,
        height: 1000,
        quantity: 4,
        customName: "Custom nominale 1450×900",
        allowRotate: false,
        lockedOrientation: "rotated"
      },
      expectedDimension: "1450×900",
      forbiddenDimension: "900×1450"
    }
  ].flatMap(fixture => ([
    {
      file: `side-single-${fixture.slug}-color.pdf`,
      kind: "single",
      view: "side",
      bw: false,
      ...fixture
    },
    {
      file: `side-single-${fixture.slug}-bw.pdf`,
      kind: "single",
      view: "side",
      bw: true,
      ...fixture
    },
    {
      file: `ramp-single-${fixture.slug}-color.pdf`,
      kind: "single",
      view: "ramp",
      bw: false,
      ...fixture
    },
    {
      file: `ramp-single-${fixture.slug}-bw.pdf`,
      kind: "single",
      view: "ramp",
      bw: true,
      ...fixture
    }
  ]));

  const mixed = [
    {
      file: "side-mixed-color.pdf",
      kind: "mixed",
      view: "side",
      bw: false,
      groups: twoMixedGroups(),
      requiredText: ["ART-123", "ART-987"]
    },
    {
      file: "side-mixed-bw.pdf",
      kind: "mixed",
      view: "side",
      bw: true,
      groups: twoMixedGroups()
    },
    {
      file: "ramp-mixed-color.pdf",
      kind: "mixed",
      view: "ramp",
      bw: false,
      groups: twoMixedGroups(),
      expectedPages: 1,
      singleLineQuantityHeader: true
    },
    {
      file: "ramp-mixed-bw.pdf",
      kind: "mixed",
      view: "ramp",
      bw: true,
      groups: twoMixedGroups(),
      expectedPages: 1,
      singleLineQuantityHeader: true
    },
    {
      file: "ramp-mixed-long-legend.pdf",
      kind: "mixed",
      view: "ramp",
      bw: false,
      groups: longMixedGroups(6),
      requiredText: ["GRUPPO-06"],
      singleLineQuantityHeader: true
    },
    {
      file: "ramp-mixed-eight-types-bw.pdf",
      kind: "mixed",
      view: "ramp",
      bw: true,
      groups: longMixedGroups(8),
      requiredText: ["GRUPPO-08"],
      verifyEightPatterns: true,
      singleLineQuantityHeader: true
    },
    {
      file: "side-mixed-eight-types-bw.pdf",
      kind: "mixed",
      view: "side",
      bw: true,
      groups: longMixedGroups(8),
      requiredText: ["GRUPPO-08"],
      verifyEightPatterns: true
    },
    {
      file: "side-single-long-id-color.pdf",
      kind: "single",
      view: "side",
      bw: false,
      options: {
        presetId: "custom",
        length: 1200,
        width: 800,
        height: 1000,
        quantity: 4,
        customName: "Pallet identificativo lungo",
        identifier: "IDENTIFICATIVO-COMPLETO-1234567890"
      },
      requiredText: ["1234567890"],
      verifyTruncation: true,
      expectedDimension: "1200×800",
      forbiddenDimension: "800×1200"
    },
    {
      file: "side-single-stacked-color.pdf",
      kind: "single",
      view: "side",
      bw: false,
      options: {
        quantity: 10,
        height: 700,
        identifier: "STACK-TEST",
        stackable: true,
        maxLayers: 2,
        verticalGap: 0
      },
      requiredText: ["2 strati", "STACK-TEST"],
      expectedDimension: "1200×800",
      forbiddenDimension: "800×1200",
      verifyStackFourthLine: true
    },
    {
      file: "ramp-single-stacked-bw.pdf",
      kind: "single",
      view: "ramp",
      bw: true,
      options: {
        quantity: 10,
        height: 700,
        identifier: "STACK-TEST",
        stackable: true,
        maxLayers: 2,
        verticalGap: 0
      },
      requiredText: ["2 strati", "STACK-TEST"],
      expectedDimension: "1200×800",
      forbiddenDimension: "800×1200",
      verifyStackFourthLine: true
    }
  ];

  return [...single, ...nominalRotatedCases, ...mixed];
}

async function run() {
  ensureCleanOutput();
  const pageQualityGuards = BASELINE_ONLY
    ? null
    : measurePageQualityGuards();
  const browser = await launchBrowser(PROJECT_DIR);
  const application = await createApplicationPage(browser);
  const records = [];

  try {
    const guardResults = BASELINE_ONLY
      ? await measureBaselineOperationalGuard(application.page)
      : await verifyOperationalGuards(application.page);

    for (const scenario of scenarioList()) {
      const fixture = scenario.kind === "single"
        ? await configureSingle(application.page, scenario.options)
        : await configureMixed(application.page, scenario.groups, scenario.options);
      assertEqual(fixture.ok, true, `${scenario.file}: risultato non CI STA`);
      assertEqual(fixture.validationError, false, `${scenario.file}: validationError`);
      assertEqual(fixture.validationValid, true, `${scenario.file}: R-01`);
      assertEqual(fixture.printDisabled, false, `${scenario.file}: stampa disabilitata`);

      await selectPrintMode(application.page, scenario.view, scenario.bw);
      const colorLabels = await captureCanvasLabels(
        application.page,
        scenario.view,
        false
      );
      const bwLabels = await captureCanvasLabels(
        application.page,
        scenario.view,
        true
      );
      assertEqual(
        JSON.stringify(colorLabels.expected),
        JSON.stringify(bwLabels.expected),
        `${scenario.file}: testo colore/B-N differente`
      );
      assertEqual(
        JSON.stringify(colorLabels.drawnLabelLines),
        JSON.stringify(colorLabels.expected),
        `${scenario.file}: etichette preview colore diverse dall'atteso indipendente`
      );
      assertEqual(
        JSON.stringify(bwLabels.drawnLabelLines),
        JSON.stringify(bwLabels.expected),
        `${scenario.file}: etichette preview B/N diverse dall'atteso indipendente`
      );
      assertEqual(
        JSON.stringify(colorLabels.drawnDimensions),
        JSON.stringify(colorLabels.expectedDimensions),
        `${scenario.file}: dimensioni preview colore`
      );
      assertEqual(
        JSON.stringify(bwLabels.drawnDimensions),
        JSON.stringify(bwLabels.expectedDimensions),
        `${scenario.file}: dimensioni preview B/N`
      );
      colorLabels.palletCalls.forEach(call => {
        if (!BASELINE_ONLY) {
          assert(call.maxWidth > 0, `${scenario.file}: etichetta senza limite`);
        }
      });
      assert(!colorLabels.hasRotatedAbbreviation, `${scenario.file}: “ruot.” nel canvas`);
      assert(
        colorLabels.expectedDimensions.length === fixture.rectangles,
        `${scenario.file}: numero dimensioni nominali`
      );
      assertEqual(
        colorLabels.invertedSingleOccurrences,
        0,
        `${scenario.file}: single ruotato con coppia nominale invertita`
      );
      if (scenario.expectedDimension) {
        assert(
          colorLabels.expectedDimensions.every(
            value => value === scenario.expectedDimension
          ),
          `${scenario.file}: atteso nominale ${scenario.expectedDimension}`
        );
        assert(
          colorLabels.drawnDimensions.every(
            value => value === scenario.expectedDimension
          ),
          `${scenario.file}: disegnato nominale ${scenario.expectedDimension}`
        );
      }
      if (scenario.forbiddenDimension) {
        assertEqual(
          colorLabels.drawnDimensions.filter(
            value => value === scenario.forbiddenDimension
          ).length,
          0,
          `${scenario.file}: coppia invertita ${scenario.forbiddenDimension}`
        );
      }
      if (scenario.slug?.includes("locked-rotated")) {
        assertEqual(
          colorLabels.rotatedRectangles,
          fixture.rectangles,
          `${scenario.file}: forma fisica non interamente ruotata`
        );
      }
      if (scenario.verifyStackFourthLine) {
        assert(
          colorLabels.perRect.every(item => (
            item.lines.length === 4 &&
            item.lines[2] === "1200×800" &&
            item.lines[3] === "2 pallet"
          )),
          `${scenario.file}: quarta riga sovrapposizione`
        );
      }
      if (scenario.view === "ramp") {
        assertEqual(
          colorLabels.backingRectCount,
          0,
          `${scenario.file}: fondo etichette inatteso nella rampa colore`
        );
        assertEqual(
          bwLabels.backingRectCount,
          bwLabels.expectedDimensions.length,
          `${scenario.file}: fondo semitrasparente B/N non disegnato per ogni pallet rampa`
        );
        assert(
          bwLabels.backingRects.every(rect => (
            rect.width > 0 &&
            rect.height > 0 &&
            rect.fillStyle === "rgba(255,255,255,0.88)" &&
            rect.globalAlpha > 0
          )),
          `${scenario.file}: fondo semitrasparente B/N non valido`
        );
      }

      if (scenario.verifyTruncation) {
        const identifier = scenario.options.identifier;
        const compact = await application.page.evaluate(
          value => compactCanvasLabel(value, 15),
          identifier
        );
        assert(compact.endsWith("…"), `${scenario.file}: identificativo non troncato`);
        assert(
          colorLabels.expected.includes(compact),
          `${scenario.file}: identificativo troncato assente dal canvas`
        );
      }

      if (scenario.verifyEightPatterns) {
        const patterns = await application.page.evaluate(() => (
          Array.from({ length: 8 }, (_, index) => bwLegendCss(index))
        ));
        assertEqual(new Set(patterns).size, 8, `${scenario.file}: trame legenda non uniche`);
      }

      await selectPrintMode(application.page, scenario.view, scenario.bw);
      const capture = await capturePrintHtml(application.page);
      assertEqual(capture.openCount, 1, `${scenario.file}: popup non aperto una volta`);
      assert(
        capture.html.startsWith("\n        <!DOCTYPE html>"),
        `${scenario.file}: documento stampa non creato`
      );
      assertEqual(
        JSON.stringify(capture.drawnLabelLines),
        JSON.stringify(colorLabels.expected),
        `${scenario.file}: etichette canvas PDF diverse dall'atteso indipendente`
      );
      assertEqual(
        JSON.stringify(capture.drawnDimensions),
        JSON.stringify(colorLabels.expectedDimensions),
        `${scenario.file}: dimensioni canvas PDF`
      );
      const pdfPath = path.join(PDF_DIR, scenario.file);
      const domAudit = await renderPrintDocument(browser, capture.html, pdfPath);
      const pdfAudit = verifyPdf(
        pdfPath,
        scenario.view === "ramp" ? "portrait" : "landscape",
        scenario.requiredText || [],
        {
          expectedPages: scenario.expectedPages,
          singleLineQuantityHeader: scenario.singleLineQuantityHeader
        }
      );
      records.push({
        scenario: scenario.file,
        mode: scenario.kind,
        view: scenario.view,
        colorMode: scenario.bw ? "B/N magazzino" : "colore",
        fixture,
        labels: {
          lines: colorLabels.expected.length,
          colorBwParity: true,
          nominalDimensions: true,
          expectedDimensions: colorLabels.expectedDimensions,
          previewColorDimensions: colorLabels.drawnDimensions,
          previewBwDimensions: bwLabels.drawnDimensions,
          pdfCanvasDimensions: capture.drawnDimensions,
          physicalDimensions: colorLabels.perRect.map(
            item => item.physicalDimension
          ),
          rotatedRectangles: colorLabels.rotatedRectangles,
          totalRectangles: colorLabels.perRect.length,
          invertedSingleOccurrences: colorLabels.invertedSingleOccurrences,
          expectationBuilderUsesApplicationFunction:
            colorLabels.expectationBuilderUsesApplicationFunction,
          noRotatedAbbreviation: true,
          rampBwTextBackingRects: scenario.view === "ramp"
            ? bwLabels.backingRectCount
            : null,
          rampColorTextBackingRects: scenario.view === "ramp"
            ? colorLabels.backingRectCount
            : null
        },
        dom: {
          minStandardFontPt: Number(domAudit.minStandardFontPt.toFixed(2)),
          imageNaturalWidth: domAudit.imageNaturalWidth,
          imageNaturalHeight: domAudit.imageNaturalHeight
        },
        pdf: pdfAudit
      });
      console.log(
        `PASS  ${scenario.file}: ${pdfAudit.orientation}, ${pdfAudit.pages} pagina/e, ` +
        `font minimo ${domAudit.minStandardFontPt.toFixed(2)} pt`
      );
    }

    const xssRecords = [];
    if (!BASELINE_ONLY) {
      fs.mkdirSync(path.join(PDF_DIR, "xss"), { recursive: true });
      for (const [index, payload] of XSS_PAYLOADS.entries()) {
        const mixed = index % 2 === 1;
        const view = index % 3 === 0 ? "ramp" : "side";
        const bw = index % 2 === 0;
        const safePayload = payload.slice(0, 36).trim();
        const fixture = mixed
          ? await configureMixed(application.page, [
            {
              length: 800,
              width: 600,
              height: 800,
              quantity: 2,
              name: safePayload,
              identifier: safePayload
            }
          ])
          : await configureSingle(application.page, {
            presetId: "custom",
            length: 800,
            width: 600,
            height: 800,
            quantity: 2,
            customName: safePayload,
            identifier: safePayload
          });
        assertEqual(fixture.ok, true, `XSS ${index + 1}: risultato non CI STA`);
        await selectPrintMode(application.page, view, bw);
        const capture = await capturePrintHtml(application.page);
        assertEqual(capture.openCount, 1, `XSS ${index + 1}: popup`);
        const filename =
          `xss-${String(index + 1).padStart(2, "0")}-${mixed ? "mixed" : "single"}-${view}-${bw ? "bw" : "color"}.pdf`;
        const pdfPath = path.join(PDF_DIR, "xss", filename);
        const domAudit = await renderPrintDocument(
          browser,
          capture.html,
          pdfPath,
          safePayload
        );
        const pdfAudit = verifyPdf(
          pdfPath,
          view === "ramp" ? "portrait" : "landscape"
        );
        xssRecords.push({
          payload,
          renderedPayload: safePayload,
          fieldCoverage: ["nome", "identificativo"],
          mode: mixed ? "mixed" : "single",
          view,
          colorMode: bw ? "B/N magazzino" : "colore",
          file: path.relative(OUTPUT_ROOT, pdfPath),
          minStandardFontPt: Number(domAudit.minStandardFontPt.toFixed(2)),
          pages: pdfAudit.pages,
          status: "PASS"
        });
        console.log(`PASS  ${filename}: XSS letterale, PDF valido`);
      }
    }

    assertEqual(application.consoleErrors.length, 0, "errori console applicazione");
    assertEqual(application.pageErrors.length, 0, "errori pagina applicazione");

    const finalPdfPaths = [
      ...records.map(item => path.join(PDF_DIR, item.scenario)),
      ...xssRecords.map(item => path.join(OUTPUT_ROOT, item.file))
    ];
    fs.rmSync(RENDER_DIR, { recursive: true, force: true });
    fs.mkdirSync(RENDER_DIR, { recursive: true });
    finalPdfPaths.forEach(pdfPath => {
      renderPdfPages(pdfPath);
    });

    const allRenderPaths = fs.readdirSync(RENDER_DIR)
      .filter(filename => filename.endsWith(".png"))
      .sort()
      .map(filename => path.join(RENDER_DIR, filename));
    const expectedRenderCount = (
      records.reduce((sum, item) => sum + item.pdf.pages, 0) +
      xssRecords.reduce((sum, item) => sum + item.pages, 0)
    );
    assertEqual(
      allRenderPaths.length,
      expectedRenderCount,
      "numero complessivo render PNG"
    );
    const finalPngAudits = allRenderPaths.map(decodeAndVerifyPng);
    const stackedRender = finalPngAudits.find(item => (
      item.file.endsWith("pdf-renders/side-single-stacked-color-1.png")
    ));
    assert(stackedRender, "render side-single-stacked-color-1.png assente");
    assert(
      stackedRender.iendPresent &&
      stackedRender.decoderErrors === 0 &&
      stackedRender.width > 0 &&
      stackedRender.height > 0 &&
      stackedRender.inkPixelRatio > 0,
      "side-single-stacked-color-1.png non valido"
    );
    for (let cleanupPass = 0; cleanupPass < 4; cleanupPass += 1) {
      removeTemporaryRenderDirectories();
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    removeTemporaryRenderDirectories();
    assert(
      !fs.readdirSync(RENDER_DIR).some(name => name.startsWith(".render-attempt-")),
      "directory temporanee render non ripulite"
    );

    const mixedRampAfter = Object.fromEntries(
      records
        .filter(item => (
          ["ramp-mixed-color.pdf", "ramp-mixed-bw.pdf"].includes(item.scenario)
        ))
        .map(item => [item.scenario, item.pdf.pages])
    );
    const singleRecords = records.filter(item => item.mode === "single");
    const mixedRecords = records.filter(item => item.mode === "mixed");
    const singleInvertedOccurrences = singleRecords.reduce(
      (sum, item) => sum + item.labels.invertedSingleOccurrences,
      0
    );
    assertEqual(
      singleInvertedOccurrences,
      0,
      "occorrenze complessive di coppie nominali single invertite"
    );
    assert(
      records.every(
        item => item.labels.expectationBuilderUsesApplicationFunction === false
      ),
      "un test costruisce l'atteso con una funzione applicativa"
    );
    const euroAutomaticRecords = records.filter(item => (
      [
        "side-single-color.pdf",
        "side-single-bw.pdf",
        "ramp-single-color.pdf",
        "ramp-single-bw.pdf"
      ].includes(item.scenario)
    ));
    assertEqual(euroAutomaticRecords.length, 4, "combinazioni Euro automatiche");
    assert(
      euroAutomaticRecords.every(item => (
        item.labels.rotatedRectangles > 0 &&
        item.labels.expectedDimensions.every(value => value === "1200×800") &&
        item.labels.previewColorDimensions.every(value => value === "1200×800") &&
        item.labels.previewBwDimensions.every(value => value === "1200×800") &&
        item.labels.pdfCanvasDimensions.every(value => value === "1200×800")
      )),
      "Euro automatico non nominale in tutte le combinazioni"
    );

    const nominalLabelAudit = {
      expectationSource: {
        single: "result.input.pallet.length × result.input.pallet.width",
        mixed: "result.input.types[rect.typeIndex].length × width",
        applicationRectDimensionTextUsed: false
      },
      expectedDimensions: records.map(item => ({
        scenario: item.scenario,
        values: item.labels.expectedDimensions
      })),
      drawnDimensions: records.map(item => ({
        scenario: item.scenario,
        previewColor: item.labels.previewColorDimensions,
        previewBw: item.labels.previewBwDimensions,
        pdfCanvas: item.labels.pdfCanvasDimensions
      })),
      rotatedRectangles: records.map(item => ({
        scenario: item.scenario,
        rotated: item.labels.rotatedRectangles,
        total: item.labels.totalRectangles
      })),
      singleInvertedOccurrences,
      singleRotatedInversionStatus: "PASS",
      mixedTypeIndexExpectationStatus:
        mixedRecords.every(item => item.labels.nominalDimensions) ? "PASS" : "FAIL",
      status: "PASS"
    };

    const output = {
      app: path.basename(APP_PATH),
      generatedAt: FIXED_NOW,
      browser: "Chromium 149 via Playwright 1.61.1",
      baselineOnly: BASELINE_ONLY,
      guardResults,
      pageQualityRegression: BASELINE_ONLY
        ? null
        : {
          mixedRampPages: {
            rc3: mixedRampAfter
          },
          isolatedWordGuard: pageQualityGuards.isolatedWordGuard,
          nearEmptyPageChecks: "PASS",
          warehouseOnlyPageChecks: "PASS",
          isolatedWordPageChecks: "PASS",
          unnecessaryPageChecks: "PASS",
          pngDecodeChecks: {
            files: finalPngAudits.length,
            failures: 0,
            signature: "PASS",
            iend: "PASS",
            completeDecode: "PASS",
            positiveDimensions: "PASS",
            nonEmptyImages: "PASS",
            sideSingleStackedColorPage1: "PASS"
          },
          nominalLabelsAlpha13: nominalLabelAudit
        },
      summary: {
        pdfs: records.length + xssRecords.length,
        requiredEvidencePdfs: records.length,
        xssPdfs: xssRecords.length,
        pngRenders: finalPngAudits.length,
        failures: 0
      },
      records,
      xssRecords,
      pngValidation: finalPngAudits,
      status: "PASS"
    };
    fs.writeFileSync(RESULT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
    console.log(
      `\nStampa PDF: ${output.summary.pdfs} documenti PASS; ` +
      `${records.reduce((sum, item) => sum + item.pdf.pages, 0)} pagine di evidenza.`
    );
  } finally {
    await application.context.close();
    await browser.close();
  }
}

await run();
