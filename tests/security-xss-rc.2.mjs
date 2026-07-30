import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(TEST_DIR, "..");
const APP_PATH = path.resolve(
  PROJECT_DIR,
  process.env.LOADCOMPOSER_HTML || "site/index.html"
);
const HTML = fs.readFileSync(APP_PATH, "utf8");
const SCRIPT_MATCH = HTML.match(
  /<script\s+id=["']loadcomposer-application["'][^>]*>([\s\S]*?)<\/script>/i
);

if (!SCRIPT_MATCH) {
  throw new Error(`Script applicativo non trovato in ${APP_PATH}`);
}

new vm.Script(SCRIPT_MATCH[1], { filename: path.basename(APP_PATH) });

const PAYLOADS = [
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

function canvasContextStub(canvas, recorder) {
  const methods = {
    arc() {},
    beginPath() {},
    clearRect() {},
    createPattern() {
      return "#pattern";
    },
    drawImage() {},
    fill() {},
    fillRect(...args) {
      recorder.push({ canvas, method: "fillRect", args });
    },
    fillText(...args) {
      recorder.push({ canvas, method: "fillText", args });
    },
    lineTo() {},
    measureText(text) {
      return { width: String(text).length * 7 };
    },
    moveTo() {},
    restore() {},
    rotate() {},
    save() {},
    stroke() {},
    strokeRect(...args) {
      recorder.push({ canvas, method: "strokeRect", args });
    },
    translate() {}
  };

  return new Proxy(methods, {
    get(target, property) {
      if (property in target) return target[property];
      return undefined;
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    }
  });
}

async function createApp() {
  const browserErrors = [];
  const canvasCalls = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", error => browserErrors.push(error));

  const dom = new JSDOM(HTML, {
    runScripts: "dangerously",
    url: "https://loadcomposer.test/",
    virtualConsole,
    beforeParse(window) {
      window.localStorage.setItem("loadcomposer.language", "it");
      window.alert = () => {};
      window.open = () => null;
      window.HTMLCanvasElement.prototype.getContext = function getContext() {
        return canvasContextStub(this, canvasCalls);
      };
      window.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,";
    }
  });

  await dom.window.loadComposerI18n.ready;
  await new Promise(resolve => dom.window.setTimeout(resolve, 0));

  return {
    dom,
    window: dom.window,
    document: dom.window.document,
    initialScriptCount: dom.window.document.querySelectorAll("script").length,
    initialImageCount: dom.window.document.querySelectorAll("img").length,
    browserErrors,
    canvasCalls,
    resetCanvasCalls() {
      canvasCalls.length = 0;
    },
    evaluate(expression) {
      return dom.window.eval(expression);
    }
  };
}

function javascriptUrlAttributes(document) {
  const findings = [];
  document.querySelectorAll("*").forEach(element => {
    for (const attribute of element.attributes) {
      if (/^\s*javascript:/i.test(attribute.value)) {
        findings.push(`${element.tagName.toLowerCase()}[${attribute.name}]`);
      }
    }
  });
  return findings;
}

function assertNoHandlerAttributes(document, label) {
  const handlers = Array.from(document.querySelectorAll("*")).flatMap(element => (
    Array.from(element.attributes)
      .filter(attribute => /^on/i.test(attribute.name))
      .map(attribute => `${element.tagName.toLowerCase()}[${attribute.name}]`)
  ));
  assertEqual(handlers.length, 0, `${label}: attributi handler creati (${handlers.join(", ")})`);
}

function assertPayloadNotInStyle(document, payload, label) {
  const styleAttributes = Array.from(document.querySelectorAll("[style]"))
    .map(element => element.getAttribute("style") || "");
  const styleBlocks = Array.from(document.querySelectorAll("style"))
    .map(element => element.textContent || "");
  assert(
    [...styleAttributes, ...styleBlocks].every(value => !value.includes(payload)),
    `${label}: payload confluito in CSS o style`
  );
}

function assertMainDocumentSafe(app, payload, label) {
  const { document, window } = app;
  assert(
    window.__xss === undefined,
    `${label}: window.__xss impostato a ${String(window.__xss)}`
  );
  assertEqual(
    document.querySelectorAll("script").length,
    app.initialScriptCount,
    `${label}: script aggiuntivo`
  );
  assertEqual(
    document.querySelectorAll("img").length,
    app.initialImageCount,
    `${label}: img aggiuntiva`
  );
  assertEqual(document.querySelectorAll("svg[onload]").length, 0, `${label}: svg eseguibile`);
  assertEqual(document.querySelectorAll("input[autofocus]").length, 0, `${label}: input autofocus aggiuntivo`);
  assertNoHandlerAttributes(document, label);
  assertEqual(javascriptUrlAttributes(document).length, 0, `${label}: URL javascript creato`);
  assertPayloadNotInStyle(document, payload, label);
  assertEqual(app.browserErrors.length, 0, `${label}: errore JavaScript/browser`);
}

function parseHtmlFragment(html) {
  return new JSDOM(`<!doctype html><body><div id="root">${html}</div>`, {
    runScripts: "dangerously",
    url: "https://fragment.loadcomposer.test/"
  });
}

function assertFragmentSafe(html, payload, label, options = {}) {
  const requireLiteral = options.requireLiteral !== false;
  const dom = parseHtmlFragment(html);
  try {
    const { document } = dom.window;
    const root = document.getElementById("root");
    assert(dom.window.__xss === undefined, `${label}: script eseguito nel frammento`);
    assertEqual(root.querySelectorAll("img").length, 0, `${label}: img creata nel frammento`);
    assertEqual(root.querySelectorAll("svg").length, 0, `${label}: svg creata nel frammento`);
    assertEqual(root.querySelectorAll("script").length, 0, `${label}: script creato nel frammento`);
    assertEqual(root.querySelectorAll("input").length, 0, `${label}: input creato nel frammento`);
    assertNoHandlerAttributes(root, label);
    assertEqual(javascriptUrlAttributes(root).length, 0, `${label}: URL javascript nel frammento`);
    assertPayloadNotInStyle(root, payload, label);
    if (requireLiteral) {
      assert(root.textContent.includes(payload), `${label}: testo letterale non conservato`);
    }
  } finally {
    dom.window.close();
  }
}

function setResultSelection(app, containerId) {
  const index = app.evaluate(
    `lastResults.findIndex(result => result.container.id === ${JSON.stringify(containerId)})`
  );
  assert(index >= 0, `risultato ${containerId} assente`);
  const select = app.document.getElementById("drawSelect");
  select.value = String(index);
  app.window.drawSelected();
  return app.evaluate(
    `lastResults[${index}]`
  );
}

function configureSingle(app, { customName, identifier }) {
  const { document, window } = app;
  const group = document.getElementById("singlePalletGroup");
  document.getElementById("loadMode").value = "single";
  window.selectPresetForGroup(group, "custom", false);
  group.querySelector('[data-field="length"]').value = "1200";
  group.querySelector('[data-field="width"]').value = "800";
  group.querySelector('[data-field="height"]').value = "1000";
  group.querySelector('[data-field="quantity"]').value = "2";
  group.querySelector('[data-field="customName"]').value = customName;
  group.querySelector('[data-field="identifier"]').value = identifier;
  document.getElementById("gap").value = "0";
  window.updateGroupVisuals(group);
  assertEqual(window.calculate(), true, "calcolo single fallito");
  return group;
}

function configureMixed(app, { customName, identifier, quantity }) {
  const { document, window } = app;
  document.getElementById("loadMode").value = "mixed";
  const rows = Array.from(document.querySelectorAll("#mixedRows .mixed-row"));
  rows.slice(1).forEach(row => row.remove());
  const row = rows[0];
  window.selectPresetForGroup(row, "custom", false);
  row.querySelector('[data-field="length"]').value = "1200";
  row.querySelector('[data-field="width"]').value = "800";
  row.querySelector('[data-field="height"]').value = "1000";
  row.querySelector('[data-field="quantity"]').value = String(quantity);
  row.querySelector('[data-field="customName"]').value = customName;
  row.querySelector('[data-field="identifier"]').value = identifier;
  document.getElementById("mixedGap").value = "0";
  window.updateGroupVisuals(row);
  assertEqual(window.calculate(), true, "calcolo mixed fallito");
  return row;
}

function printPopup(app, result, { view, bwMode, payload, label }) {
  const { document, window } = app;
  document.getElementById("printView").value = view;
  document.getElementById("printBw").checked = bwMode;
  window.drawSelected();

  let writtenHtml = "";
  const popupDocument = {
    open() {},
    write(value) {
      writtenHtml += String(value);
    },
    close() {}
  };
  window.open = () => ({ document: popupDocument });
  window.printCurrentLayout();

  assert(writtenHtml.startsWith("\n        <!DOCTYPE html>"), `${label}: popup non scritto`);
  const popupErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", error => popupErrors.push(error));
  const popup = new JSDOM(writtenHtml, {
    runScripts: "dangerously",
    url: "https://print.loadcomposer.test/",
    virtualConsole,
    beforeParse(popupWindow) {
      popupWindow.focus = () => {};
      popupWindow.print = () => {};
      popupWindow.setTimeout = () => 0;
    }
  });

  try {
    const popupDoc = popup.window.document;
    assert(popup.window.__xss === undefined, `${label}: window.__xss impostato nel popup`);
    assertEqual(popupDoc.querySelectorAll("img").length, 1, `${label}: numero img popup`);
    assertEqual(popupDoc.querySelectorAll("script").length, 1, `${label}: numero script popup`);
    assertEqual(popupDoc.querySelectorAll("svg").length, 0, `${label}: svg aggiuntivo popup`);
    assertEqual(popupDoc.querySelectorAll("input").length, 0, `${label}: input aggiuntivo popup`);
    assertNoHandlerAttributes(popupDoc, `${label} popup`);
    assertEqual(javascriptUrlAttributes(popupDoc).length, 0, `${label}: URL javascript popup`);
    assertPayloadNotInStyle(popupDoc, payload, `${label} popup`);
    assert(popupDoc.body.textContent.includes(payload), `${label}: payload non mostrato letteralmente in stampa`);
    assertEqual(popupErrors.length, 0, `${label}: errore JavaScript nel popup`);
    assertEqual(
      popupDoc.title,
      window.resultPrintTitle(result),
      `${label}: titolo popup incoerente`
    );
  } finally {
    popup.window.close();
  }
}

function assertCanvasSafeAndDeterministic(app, result, payload, label, view) {
  app.resetCanvasCalls();
  if (view === "ramp") {
    app.window.createRampPrintCanvas(result, false);
  } else {
    app.window.drawSidePreview(result, false);
  }
  const labels = app.canvasCalls
    .filter(call => call.method === "fillText")
    .map(call => String(call.args[0]));
  const expected = app.window.compactCanvasLabel(payload, 15);
  assert(labels.includes(expected), `${label}: etichetta canvas letterale/troncata assente`);
  assertEqual(
    app.window.compactCanvasLabel(payload, 15),
    app.window.compactCanvasLabel(payload, 15),
    `${label}: troncamento canvas non deterministico`
  );
}

function assertResetAndRecalculation(app, payload, label) {
  app.window.resetDefaults();
  assert(
    app.evaluate("lastResults.length") > 0,
    `${label}: il reset non ha prodotto un ricalcolo`
  );
  assert(
    !app.document.getElementById("layoutNotes").textContent.includes(payload),
    `${label}: payload rimasto dopo reset`
  );
  assertMainDocumentSafe(app, payload, `${label} dopo reset`);
}

const results = [];

async function run(name, fn) {
  try {
    await fn();
    results.push({ name, status: "PASS", message: "" });
    console.log(`PASS  ${name}`);
  } catch (error) {
    results.push({
      name,
      status: "FAIL",
      message: error instanceof Error ? error.message : String(error)
    });
    console.log(`FAIL  ${name}: ${results.at(-1).message}`);
  }
}

await run("escapeHtml centralizzato conserva letteralmente i payload", async () => {
  const app = await createApp();
  try {
    for (const [index, payload] of PAYLOADS.entries()) {
      const escaped = app.window.escapeHtml(payload);
      assertFragmentSafe(escaped, payload, `escapeHtml payload ${index + 1}`);
    }
  } finally {
    app.dom.window.close();
  }
});

for (const [payloadIndex, payload] of PAYLOADS.entries()) {
  await run(`payload XSS ${payloadIndex + 1}: single e mixed, preview e stampa`, async () => {
    const app = await createApp();
    try {
      const singleNameGroup = configureSingle(app, {
        customName: payload,
        identifier: "ID-SICURO"
      });
      const singleNameResult = setResultSelection(app, "20dc");
      const selectedNameText = singleNameGroup
        .querySelector('[data-role="selectedSummary"]')
        .textContent;
      assert(selectedNameText.includes(payload), "single nome: selected-pallet non letterale");
      assertFragmentSafe(
        app.window.buildPrintLegend(singleNameResult, false),
        payload,
        "single nome: legenda stampa"
      );
      assertMainDocumentSafe(app, payload, "single nome");
      printPopup(app, singleNameResult, {
        view: "side",
        bwMode: false,
        payload,
        label: "single nome, laterale colore"
      });
      assertResetAndRecalculation(app, payload, "single nome");

      configureSingle(app, {
        customName: "Pallet sicuro",
        identifier: payload
      });
      const singleIdentifierResult = setResultSelection(app, "20dc");
      assertCanvasSafeAndDeterministic(
        app,
        singleIdentifierResult,
        payload,
        "single identificativo",
        "ramp"
      );
      assertFragmentSafe(
        app.window.buildPrintLegend(singleIdentifierResult, true),
        payload,
        "single identificativo: legenda stampa"
      );
      assertMainDocumentSafe(app, payload, "single identificativo");
      printPopup(app, singleIdentifierResult, {
        view: "ramp",
        bwMode: true,
        payload,
        label: "single identificativo, rampa B/N"
      });
      assertResetAndRecalculation(app, payload, "single identificativo");

      const mixedNameRow = configureMixed(app, {
        customName: payload,
        identifier: "ID-SICURO",
        quantity: 20
      });
      const mixedNameNonOkResult = setResultSelection(app, "20dc");
      const selectedMixedName = mixedNameRow
        .querySelector('[data-role="selectedSummary"]')
        .textContent;
      assert(selectedMixedName.includes(payload), "mixed nome: selected-pallet non letterale");
      assert(
        app.document.getElementById("resultsBody").textContent.includes(payload),
        "mixed nome: elenco pallet esclusi non letterale"
      );
      let blockedPopupHtml = "";
      app.window.open = () => ({
        document: {
          open() {},
          write(value) {
            blockedPopupHtml += String(value);
          },
          close() {}
        }
      });
      app.window.printCurrentLayout();
      assertEqual(blockedPopupHtml, "", "mixed nome NON OK: popup operativo creato");

      configureMixed(app, {
        customName: payload,
        identifier: "ID-SICURO",
        quantity: 2
      });
      const mixedNameResult = setResultSelection(app, "20dc");
      assert(
        app.document.getElementById("layoutNotes").textContent.includes(payload),
        "mixed nome: legenda preview non letterale"
      );
      assertFragmentSafe(
        app.window.layoutDescription(mixedNameResult),
        payload,
        "mixed nome: layoutDescription"
      );
      assertFragmentSafe(
        app.window.buildPrintLegend(mixedNameResult, true),
        payload,
        "mixed nome: legenda stampa"
      );
      assertMainDocumentSafe(app, payload, "mixed nome");
      printPopup(app, mixedNameResult, {
        view: "side",
        bwMode: true,
        payload,
        label: "mixed nome, laterale B/N"
      });
      assertResetAndRecalculation(app, payload, "mixed nome");

      configureMixed(app, {
        customName: "Pallet sicuro",
        identifier: payload,
        quantity: 2
      });
      const mixedIdentifierResult = setResultSelection(app, "20dc");
      assert(
        app.document.getElementById("layoutNotes").textContent.includes(payload),
        "mixed identificativo: legenda preview non letterale"
      );
      assertCanvasSafeAndDeterministic(
        app,
        mixedIdentifierResult,
        payload,
        "mixed identificativo",
        "side"
      );
      assertFragmentSafe(
        app.window.buildPrintLegend(mixedIdentifierResult, false),
        payload,
        "mixed identificativo: legenda stampa"
      );
      assertFragmentSafe(
        app.window.buildPrintDetails(mixedIdentifierResult),
        payload,
        "mixed identificativo: riepilogo stampa",
        { requireLiteral: false }
      );
      assertMainDocumentSafe(app, payload, "mixed identificativo");
      printPopup(app, mixedIdentifierResult, {
        view: "ramp",
        bwMode: false,
        payload,
        label: "mixed identificativo, rampa colore"
      });
      assertResetAndRecalculation(app, payload, "mixed identificativo");
    } finally {
      app.dom.window.close();
    }
  });
}

await run("canvas: payload lungo troncato senza errori e in modo deterministico", async () => {
  const app = await createApp();
  try {
    const longPayload = `${"<>&\"'àèìòù".repeat(2000)}FINE`;
    const first = app.window.compactCanvasLabel(longPayload, 15);
    const second = app.window.compactCanvasLabel(longPayload, 15);
    assertEqual(first, second, "risultato compactCanvasLabel variabile");
    assertEqual(first.length, 15, "lunghezza compactCanvasLabel inattesa");
    assert(first.endsWith("…"), "ellissi di troncamento assente");

    configureSingle(app, {
      customName: "Pallet sicuro",
      identifier: longPayload
    });
    const result = setResultSelection(app, "20dc");
    assertCanvasSafeAndDeterministic(
      app,
      result,
      longPayload,
      "payload canvas lungo",
      "side"
    );
    assertEqual(app.browserErrors.length, 0, "errore JavaScript con payload canvas lungo");
  } finally {
    app.dom.window.close();
  }
});

const passed = results.filter(item => item.status === "PASS").length;
const failed = results.filter(item => item.status === "FAIL").length;

console.log("");
console.log(
  `Sicurezza XSS: ${results.length} test, ${passed} PASS, ${failed} FAIL; ` +
  `${PAYLOADS.length * 4} scenari campo/modalità/stampa verificati.`
);

if (process.env.LOADCOMPOSER_SECURITY_JSON) {
  fs.writeFileSync(
    path.resolve(PROJECT_DIR, process.env.LOADCOMPOSER_SECURITY_JSON),
    `${JSON.stringify({
      app: APP_PATH,
      payloads: PAYLOADS,
      fieldPrintScenarios: PAYLOADS.length * 4,
      passed,
      failed,
      results
    }, null, 2)}\n`,
    "utf8"
  );
}

if (failed > 0) {
  process.exitCode = 1;
}
