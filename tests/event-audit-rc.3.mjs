import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(TEST_DIR, "..");
const BASELINE_PATH = path.resolve(
  PROJECT_DIR,
  process.env.LOADCOMPOSER_EVENT_BASELINE || "tests/fixtures/baseline-v1.0.0-rc.2/loadcomposer-v1.0.0-rc.2-standalone.html"
);
const CURRENT_PATH = path.resolve(
  PROJECT_DIR,
  process.env.LOADCOMPOSER_HTML || "site/index.html"
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: atteso ${expected}, ottenuto ${actual}`);
  }
}

function instrumentHtml(filePath) {
  const html = fs.readFileSync(filePath, "utf8");
  const calculateNeedle = "function calculate(options = {}) {";
  const drawNeedle = "function drawSelected() {";
  assert(html.includes(calculateNeedle), `calculate() non trovato in ${filePath}`);
  assert(html.includes(drawNeedle), `drawSelected() non trovato in ${filePath}`);

  return html
    .replace(
      calculateNeedle,
      `${calculateNeedle}\n      window.__eventMetrics.calculate += 1;`
    )
    .replace(
      drawNeedle,
      `${drawNeedle}\n      window.__eventMetrics.drawSelected += 1;`
    );
}

function canvasContextStub() {
  const methods = {
    arc() {},
    beginPath() {},
    clearRect() {},
    createPattern() {
      return "#pattern";
    },
    drawImage() {},
    fill() {},
    fillRect() {},
    fillText() {},
    lineTo() {},
    measureText(text) {
      return { width: String(text).length * 7 };
    },
    moveTo() {},
    restore() {},
    rotate() {},
    save() {},
    stroke() {},
    strokeRect() {},
    translate() {}
  };

  return new Proxy(methods, {
    get(target, property) {
      return target[property];
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    }
  });
}

async function createApp(filePath) {
  const browserErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", error => browserErrors.push(error));

  const dom = new JSDOM(instrumentHtml(filePath), {
    runScripts: "dangerously",
    url: "https://loadcomposer.test/",
    virtualConsole,
    beforeParse(window) {
      window.localStorage.setItem("loadcomposer.language", "it");
      window.__eventMetrics = {
        calculate: 0,
        drawSelected: 0,
        reportValidity: 0
      };
      window.alert = () => {};
      window.open = () => null;
      window.HTMLCanvasElement.prototype.getContext = () => canvasContextStub();
      window.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,";
      window.HTMLInputElement.prototype.reportValidity = function reportValidity() {
        window.__eventMetrics.reportValidity += 1;
        return this.checkValidity();
      };
    }
  });

  await dom.window.loadComposerI18n.ready;
  await new Promise(resolve => dom.window.setTimeout(resolve, 0));

  if (browserErrors.length) {
    dom.window.close();
    throw browserErrors[0];
  }

  return {
    dom,
    window: dom.window,
    document: dom.window.document,
    resetMetrics() {
      dom.window.__eventMetrics.calculate = 0;
      dom.window.__eventMetrics.drawSelected = 0;
      dom.window.__eventMetrics.reportValidity = 0;
    },
    metrics() {
      return { ...dom.window.__eventMetrics };
    },
    evaluate(expression) {
      return dom.window.eval(expression);
    }
  };
}

function dispatchChange(app, element) {
  element.dispatchEvent(new app.window.Event("change", { bubbles: true }));
}

function editField(app, element, value) {
  element.value = String(value);
  element.dispatchEvent(new app.window.Event("input", { bubbles: true }));
  element.dispatchEvent(new app.window.Event("change", { bubbles: true }));
}

function singleGroup(app) {
  return app.document.getElementById("singlePalletGroup");
}

function firstMixedRow(app) {
  return app.document.querySelector("#mixedRows .mixed-row");
}

function selectContainer(app, containerId) {
  const index = app.evaluate(
    `lastResults.findIndex(item => item.container.id === ${JSON.stringify(containerId)})`
  );
  assert(index >= 0, `mezzo ${containerId} non trovato`);
  const select = app.document.getElementById("drawSelect");
  select.value = String(index);
  dispatchChange(app, select);
}

function openPicker(app, group) {
  const button = group.querySelector('[data-action="togglePicker"]');
  button.click();
  assert(
    !group.querySelector('[data-role="pickerMenu"]').classList.contains("hidden"),
    "picker non aperto nella fixture"
  );
}

function assertAllPickersClosed(app, label) {
  app.document.querySelectorAll('[data-role="palletPicker"]').forEach((picker, index) => {
    assert(
      picker.querySelector('[data-role="pickerMenu"]').classList.contains("hidden"),
      `${label}: menu ${index} rimasto aperto`
    );
    assertEqual(
      picker.querySelector('[data-action="togglePicker"]').getAttribute("aria-expanded"),
      "false",
      `${label}: aria-expanded del picker ${index}`
    );
  });
}

const ACTIONS = [
  {
    id: "startup",
    label: "Avvio applicazione",
    expected: { calculate: 1, drawSelected: 1 },
    run(app) {
      return app.metrics();
    }
  },
  {
    id: "reset",
    label: "Reset",
    expected: { calculate: 1, drawSelected: 1 },
    run(app) {
      app.resetMetrics();
      app.document.getElementById("resetBtn").click();
      return app.metrics();
    }
  },
  {
    id: "single-quantity",
    label: "Modifica quantità single",
    expected: { calculate: 1, drawSelected: 1 },
    run(app) {
      app.resetMetrics();
      editField(app, app.document.getElementById("quantity"), 11);
      return app.metrics();
    }
  },
  {
    id: "single-height",
    label: "Modifica altezza single",
    expected: { calculate: 1, drawSelected: 1 },
    run(app) {
      app.resetMetrics();
      editField(app, app.document.getElementById("palletHeight"), 1510);
      return app.metrics();
    }
  },
  {
    id: "single-gap",
    label: "Modifica gap single",
    expected: { calculate: 1, drawSelected: 1 },
    run(app) {
      app.resetMetrics();
      editField(app, app.document.getElementById("gap"), 1);
      return app.metrics();
    }
  },
  {
    id: "rotation",
    label: "Attivazione/disattivazione rotazione",
    expected: { calculate: 1, drawSelected: 1 },
    run(app) {
      app.resetMetrics();
      singleGroup(app).querySelector('[data-field="allowRotate"]').click();
      return app.metrics();
    }
  },
  {
    id: "locked-orientation",
    label: "Scelta orientamento bloccato",
    expected: { calculate: 1, drawSelected: 1 },
    run(app) {
      const group = singleGroup(app);
      group.querySelector('[data-field="allowRotate"]').checked = false;
      app.window.updateGroupVisuals(group);
      app.resetMetrics();
      group.querySelector('[data-field="lockedOrientation"][value="rotated"]').click();
      return app.metrics();
    }
  },
  {
    id: "pallet-preset",
    label: "Scelta preset pallet",
    expected: { calculate: 1, drawSelected: 1 },
    run(app) {
      app.resetMetrics();
      singleGroup(app)
        .querySelector('[data-action="selectPreset"][data-preset-id="industrial"]')
        .click();
      return app.metrics();
    }
  },
  {
    id: "custom-dimension",
    label: "Modifica dimensione custom",
    expected: { calculate: 1, drawSelected: 1 },
    run(app) {
      const group = singleGroup(app);
      app.window.selectPresetForGroup(group, "custom", false);
      app.resetMetrics();
      editField(app, group.querySelector('[data-field="length"]'), 1210);
      return app.metrics();
    }
  },
  {
    id: "custom-name",
    label: "Modifica nome custom",
    expected: { calculate: 1, drawSelected: 1 },
    run(app) {
      const group = singleGroup(app);
      app.window.selectPresetForGroup(group, "custom", false);
      app.resetMetrics();
      editField(app, group.querySelector('[data-field="customName"]'), "Pallet prova");
      return app.metrics();
    }
  },
  {
    id: "identifier",
    label: "Modifica identificativo",
    expected: { calculate: 1, drawSelected: 1 },
    run(app) {
      app.resetMetrics();
      editField(
        app,
        singleGroup(app).querySelector('[data-field="identifier"]'),
        "ART-009"
      );
      return app.metrics();
    }
  },
  {
    id: "load-mode",
    label: "Cambio single/mixed",
    expected: { calculate: 1, drawSelected: 1 },
    run(app) {
      const mode = app.document.getElementById("loadMode");
      app.resetMetrics();
      mode.value = "mixed";
      dispatchChange(app, mode);
      return app.metrics();
    }
  },
  {
    id: "mixed-gap",
    label: "Modifica mixedGap",
    expected: { calculate: 1, drawSelected: 1 },
    run(app) {
      const mode = app.document.getElementById("loadMode");
      mode.value = "mixed";
      app.window.syncModeUI();
      app.resetMetrics();
      editField(app, app.document.getElementById("mixedGap"), 1);
      return app.metrics();
    }
  },
  {
    id: "mixed-quantity",
    label: "Modifica quantità gruppo mixed",
    expected: { calculate: 1, drawSelected: 1 },
    run(app) {
      const mode = app.document.getElementById("loadMode");
      mode.value = "mixed";
      app.window.syncModeUI();
      app.resetMetrics();
      editField(app, firstMixedRow(app).querySelector('[data-field="quantity"]'), 9);
      return app.metrics();
    }
  },
  {
    id: "add-group",
    label: "Aggiunta gruppo",
    expected: { calculate: 1, drawSelected: 1 },
    run(app) {
      const mode = app.document.getElementById("loadMode");
      mode.value = "mixed";
      app.window.syncModeUI();
      app.resetMetrics();
      app.document.getElementById("addMixedRowBtn").click();
      return app.metrics();
    }
  },
  {
    id: "remove-group",
    label: "Rimozione gruppo",
    expected: { calculate: 1, drawSelected: 1 },
    run(app) {
      const mode = app.document.getElementById("loadMode");
      mode.value = "mixed";
      app.window.syncModeUI();
      const rows = app.document.querySelectorAll("#mixedRows .mixed-row");
      assert(rows.length >= 2, "fixture senza secondo gruppo mixed");
      app.resetMetrics();
      rows[rows.length - 1].querySelector('[data-action="removeMixedRow"]').click();
      return app.metrics();
    }
  },
  {
    id: "preview-vehicle",
    label: "Cambio mezzo nella preview",
    expected: { calculate: 0, drawSelected: 1 },
    run(app) {
      app.resetMetrics();
      const select = app.document.getElementById("drawSelect");
      assert(select.options.length > 1, "preview senza secondo mezzo");
      select.value = select.options[1].value;
      dispatchChange(app, select);
      return app.metrics();
    }
  },
  {
    id: "preview-view",
    label: "Cambio vista laterale/rampa",
    expected: { calculate: 0, drawSelected: 1 },
    run(app) {
      app.resetMetrics();
      const view = app.document.getElementById("printView");
      view.value = "ramp";
      dispatchChange(app, view);
      return app.metrics();
    }
  },
  {
    id: "preview-color",
    label: "Cambio colore/B/N",
    expected: { calculate: 0, drawSelected: 1 },
    run(app) {
      app.resetMetrics();
      app.document.getElementById("printBw").click();
      return app.metrics();
    }
  },
  {
    id: "calculate-button",
    label: "Pulsante Calcola",
    expected: { calculate: 1, drawSelected: 1 },
    run(app) {
      app.resetMetrics();
      app.document.getElementById("calculateBtn").click();
      return app.metrics();
    }
  }
];

async function measureAction(filePath, action) {
  const app = await createApp(filePath);
  try {
    const measured = action.run(app);
    assertEqual(app.window.__eventMetrics.reportValidity, 0, `${action.label}: reportValidity inatteso`);
    return {
      calculate: measured.calculate,
      drawSelected: measured.drawSelected
    };
  } finally {
    app.dom.window.close();
  }
}

const measurements = [];
for (const action of ACTIONS) {
  const baseline = await measureAction(BASELINE_PATH, action);
  const current = await measureAction(CURRENT_PATH, action);
  assertEqual(baseline.calculate, action.expected.calculate, `${action.label}, rc.2 calculate`);
  assertEqual(
    baseline.drawSelected,
    action.expected.drawSelected,
    `${action.label}, rc.2 drawSelected`
  );
  assertEqual(current.calculate, action.expected.calculate, `${action.label}, rc.3 calculate`);
  assertEqual(
    current.drawSelected,
    action.expected.drawSelected,
    `${action.label}, rc.3 drawSelected`
  );
  measurements.push({
    id: action.id,
    label: action.label,
    baseline,
    current,
    expected: action.expected,
    status: "PASS"
  });
}

const stateChecks = [];

async function stateCheck(name, fn) {
  await fn();
  stateChecks.push({ name, status: "PASS" });
  console.log(`PASS  ${name}`);
}

await stateCheck("selectedContainerId conservato nei ricalcoli validi", async () => {
  const app = await createApp(CURRENT_PATH);
  try {
    selectContainer(app, "40dc");
    app.resetMetrics();
    editField(app, app.document.getElementById("quantity"), 9);
    assertEqual(app.metrics().calculate, 1, "ricalcolo quantità");
    assertEqual(app.metrics().drawSelected, 1, "ridisegno quantità");
    assertEqual(app.evaluate("selectedContainerId"), "40dc", "selectedContainerId");
    const selectedResult = app.evaluate(
      "lastResults[Number(els.drawSelect.value)].container.id"
    );
    assertEqual(selectedResult, "40dc", "mezzo selezionato dopo il ricalcolo");
  } finally {
    app.dom.window.close();
  }
});

await stateCheck("Reset ripristina stato, 20dc, vista laterale e due gruppi con un solo calcolo", async () => {
  const app = await createApp(CURRENT_PATH);
  try {
    const group = singleGroup(app);
    app.window.selectPresetForGroup(group, "custom", false);
    group.querySelector('[data-field="customName"]').value = "Nome temporaneo";
    selectContainer(app, "40dc");
    app.document.getElementById("printView").value = "ramp";
    app.document.getElementById("loadMode").value = "mixed";
    app.window.syncModeUI();
    app.resetMetrics();
    app.document.getElementById("resetBtn").click();

    assertEqual(app.metrics().calculate, 1, "Reset calculate");
    assertEqual(app.metrics().drawSelected, 1, "Reset drawSelected");
    assertEqual(app.document.getElementById("loadMode").value, "single", "modalità Reset");
    assertEqual(app.document.getElementById("printView").value, "side", "vista Reset");
    assertEqual(app.evaluate("selectedContainerId"), "20dc", "mezzo Reset");
    assertEqual(
      app.document.querySelectorAll("#mixedRows .mixed-row").length,
      2,
      "gruppi mixed Reset"
    );
    assertEqual(
      group.querySelector('[data-field="customName"]').value,
      "Pallet personalizzato",
      "nome custom Reset"
    );
    assertAllPickersClosed(app, "Reset");
  } finally {
    app.dom.window.close();
  }
});

await stateCheck("aggiunta e rimozione gruppi conservano il mezzo selezionato", async () => {
  const app = await createApp(CURRENT_PATH);
  try {
    const mode = app.document.getElementById("loadMode");
    mode.value = "mixed";
    dispatchChange(app, mode);
    selectContainer(app, "40dc");
    app.document.getElementById("addMixedRowBtn").click();
    assertEqual(app.evaluate("selectedContainerId"), "40dc", "mezzo dopo aggiunta");
    const rows = app.document.querySelectorAll("#mixedRows .mixed-row");
    rows[rows.length - 1].querySelector('[data-action="removeMixedRow"]').click();
    assertEqual(app.evaluate("selectedContainerId"), "40dc", "mezzo dopo rimozione");
  } finally {
    app.dom.window.close();
  }
});

await stateCheck("input invalido sospende una volta e il successivo valido ricrea una volta", async () => {
  const app = await createApp(CURRENT_PATH);
  try {
    selectContainer(app, "40dc");
    const quantity = app.document.getElementById("quantity");
    app.resetMetrics();
    editField(app, quantity, "");
    assertEqual(app.metrics().calculate, 1, "input invalido calculate");
    assertEqual(app.metrics().drawSelected, 0, "input invalido drawSelected");
    assertEqual(app.evaluate("lastResults.length"), 0, "risultati precedenti non rimossi");
    assertEqual(app.document.getElementById("resultsBody").children.length, 0, "tabella non svuotata");
    assertEqual(app.document.getElementById("drawSelect").options.length, 0, "picker mezzi non svuotato");
    assertEqual(app.document.getElementById("drawSelect").disabled, true, "picker mezzi attivo");
    assertEqual(app.document.getElementById("printLayoutBtn").disabled, true, "stampa attiva");

    app.resetMetrics();
    editField(app, quantity, 10);
    assertEqual(app.metrics().calculate, 1, "ritorno valido calculate");
    assertEqual(app.metrics().drawSelected, 1, "ritorno valido drawSelected");
    assert(app.evaluate("lastResults.length") > 0, "risultato valido non ricreato");
    assertEqual(app.evaluate("selectedContainerId"), "40dc", "mezzo perso dopo input invalido");
    assertEqual(app.document.getElementById("printLayoutBtn").disabled, false, "stampa non riattivata");
  } finally {
    app.dom.window.close();
  }
});

await stateCheck("Calcola richiede reportValidity una sola volta su input invalido", async () => {
  const app = await createApp(CURRENT_PATH);
  try {
    app.document.getElementById("quantity").value = "";
    app.resetMetrics();
    app.document.getElementById("calculateBtn").click();
    assertEqual(app.metrics().calculate, 1, "Calcola invalido calculate");
    assertEqual(app.metrics().drawSelected, 0, "Calcola invalido drawSelected");
    assertEqual(app.metrics().reportValidity, 1, "reportValidity");
    assertEqual(app.document.getElementById("printLayoutBtn").disabled, true, "stampa invalida");
  } finally {
    app.dom.window.close();
  }
});

await stateCheck("nessun picker resta aperto dopo cambio modalità o Reset", async () => {
  const app = await createApp(CURRENT_PATH);
  try {
    openPicker(app, singleGroup(app));
    const mode = app.document.getElementById("loadMode");
    mode.value = "mixed";
    dispatchChange(app, mode);
    assertAllPickersClosed(app, "cambio modalità");

    openPicker(app, firstMixedRow(app));
    app.document.getElementById("resetBtn").click();
    assertAllPickersClosed(app, "Reset");
  } finally {
    app.dom.window.close();
  }
});

await stateCheck("costruzioni interne possono evitare calcoli intermedi", async () => {
  const app = await createApp(CURRENT_PATH);
  try {
    app.resetMetrics();
    app.window.addMixedRow(
      { presetId: "eur", quantity: 1, height: 1500 },
      { calculate: false }
    );
    assertEqual(app.metrics().calculate, 0, "addMixedRow calculate:false");
    assertEqual(app.metrics().drawSelected, 0, "addMixedRow calculate:false draw");

    app.window.syncModeUI({ calculate: false });
    assertEqual(app.metrics().calculate, 0, "syncModeUI calculate:false");
    assertEqual(app.metrics().drawSelected, 0, "syncModeUI calculate:false draw");
  } finally {
    app.dom.window.close();
  }
});

measurements.forEach(item => {
  console.log(
    `PASS  ${item.label}: rc.2 ${item.baseline.calculate}/${item.baseline.drawSelected}, ` +
    `rc.3 ${item.current.calculate}/${item.current.drawSelected}`
  );
});

console.log("");
console.log(
  `Audit eventi: ${measurements.length}/${ACTIONS.length} azioni PASS; ` +
  `${stateChecks.length}/${stateChecks.length} verifiche stato PASS.`
);

const output = {
  baseline: path.basename(BASELINE_PATH),
  current: path.basename(CURRENT_PATH),
  protocol: {
    numericAndText:
      "Una modifica logica è misurata con input seguito dal commit change; rc.3 conserva la singola reazione a input di rc.2.",
    selectsCheckboxesRadios:
      "Select usa change; checkbox e radio usano click nativo, che emette input e change, ma rc.3 conserva la singola reazione a change di rc.2.",
    counters:
      "calculate() e drawSelected() sono strumentate direttamente all'ingresso della funzione."
  },
  measurements,
  stateChecks,
  status: "PASS"
};

if (process.env.LOADCOMPOSER_EVENT_JSON) {
  fs.writeFileSync(
    path.resolve(PROJECT_DIR, process.env.LOADCOMPOSER_EVENT_JSON),
    `${JSON.stringify(output, null, 2)}\n`,
    "utf8"
  );
}
