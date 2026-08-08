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

const KNOWN_DEFERRED_FAILURES = new Set();

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

  if (browserErrors.length) {
    throw browserErrors[0];
  }

  return {
    dom,
    window: dom.window,
    document: dom.window.document,
    canvasCalls,
    resetCanvasCalls() {
      canvasCalls.length = 0;
    },
    evaluate(expression) {
      return dom.window.eval(expression);
    }
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: atteso ${expected}, ottenuto ${actual}`);
  }
}

function selectSingleCustom(app, values) {
  const { window, document } = app;
  const group = document.getElementById("singlePalletGroup");
  document.getElementById("loadMode").value = "single";
  window.selectPresetForGroup(group, "custom", false);

  Object.entries(values).forEach(([field, value]) => {
    const selector = field === "gap"
      ? "#gap"
      : `[data-field="${field}"]`;
    const input = field === "gap"
      ? document.querySelector(selector)
      : group.querySelector(selector);
    input.value = String(value);
  });

  return group;
}

function selectMixedCustom(app, values) {
  const { window, document } = app;
  document.getElementById("loadMode").value = "mixed";
  const rows = Array.from(document.querySelectorAll("#mixedRows .mixed-row"));
  rows.slice(1).forEach(row => row.remove());
  const row = rows[0];
  window.selectPresetForGroup(row, "custom", false);

  Object.entries(values).forEach(([field, value]) => {
    const selector = field === "gap"
      ? "#mixedGap"
      : `[data-field="${field}"]`;
    const input = field === "gap"
      ? document.querySelector(selector)
      : row.querySelector(selector);
    input.value = String(value);
  });

  return row;
}

function container(app, id) {
  return app.evaluate(`CONTAINERS.find(item => item.id === ${JSON.stringify(id)})`);
}

function currentResult(app, id) {
  return app.evaluate(`lastResults.find(item => item.container.id === ${JSON.stringify(id)})`);
}

function rectanglesOverlap(a, b) {
  return (
    a.x < b.x + b.length &&
    a.x + a.length > b.x &&
    a.y < b.y + b.width &&
    a.y + a.width > b.y
  );
}

function validateRectangles(containerData, rects) {
  rects.forEach((rect, index) => {
    assert(Number.isFinite(rect.x), `x non finita nel rettangolo ${index}`);
    assert(Number.isFinite(rect.y), `y non finita nel rettangolo ${index}`);
    assert(Number.isFinite(rect.length), `lunghezza non finita nel rettangolo ${index}`);
    assert(Number.isFinite(rect.width), `larghezza non finita nel rettangolo ${index}`);
    assert(rect.x >= 0 && rect.y >= 0, `coordinate negative nel rettangolo ${index}`);
    assert(
      rect.x + rect.length <= containerData.innerLength,
      `rettangolo ${index} oltre la lunghezza del vano`
    );
    assert(
      rect.y + rect.width <= containerData.innerWidth,
      `rettangolo ${index} oltre la larghezza del vano`
    );
  });

  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      assert(!rectanglesOverlap(rects[i], rects[j]), `sovrapposizione ${i}/${j}`);
    }
  }
}

function validateRectangleGap(rects, gap) {
  for (let i = 0; i < rects.length; i += 1) {
    for (let j = i + 1; j < rects.length; j += 1) {
      const a = rects[i];
      const b = rects[j];
      const separatedByGap = (
        a.x + a.length + gap <= b.x + 0.0001 ||
        b.x + b.length + gap <= a.x + 0.0001 ||
        a.y + a.width + gap <= b.y + 0.0001 ||
        b.y + b.width + gap <= a.y + 0.0001
      );
      assert(separatedByGap, `gap ${gap} insufficiente tra i rettangoli ${i}/${j}`);
    }
  }
}

function mixedValidationFixture(containerData, types, layout, gap) {
  const totalItems = types.reduce((sum, type) => sum + type.quantity, 0);
  return {
    mode: "mixed",
    container: containerData,
    layout,
    layers: 1,
    floorCapacity: layout.count,
    totalCapacity: layout.count,
    totalItems,
    placedCount: layout.count,
    allPlaced: layout.count === totalItems,
    fitsQtyBySpace: layout.count === totalItems,
    okDoor: false,
    okHeight: false,
    loadedWeight: 0,
    okWeight: true,
    ok: false,
    input: {
      mode: "mixed",
      types,
      gap
    }
  };
}

function homogeneousTypes(pallet, quantity, rotationMode, lockedOrientation, multipleGroups) {
  const base = {
    length: pallet.length,
    width: pallet.width,
    height: 1000,
    rotationMode,
    lockedOrientation
  };

  if (!multipleGroups || quantity < 2) {
    return [{
      ...base,
      name: `${pallet.name} A`,
      identifier: "GR-A",
      quantity
    }];
  }

  const firstQuantity = Math.max(1, Math.floor(quantity / 2));
  return [
    {
      ...base,
      name: `${pallet.name} A`,
      identifier: "GR-A",
      quantity: firstQuantity
    },
    {
      ...base,
      name: `${pallet.name} B`,
      identifier: "GR-B",
      quantity: quantity - firstQuantity
    }
  ];
}

function geometrySignature(rects) {
  return rects.map(rect => ({
    x: rect.x,
    y: rect.y,
    length: rect.length,
    width: rect.width,
    rotated: rect.rotated
  }));
}

function assertPreviewAndPrintRectCount(app, result, expected) {
  app.resetCanvasCalls();
  app.window.drawSidePreview(result, false);
  const previewCanvas = app.document.getElementById("layoutCanvas");
  const previewStrokes = app.canvasCalls.filter(call => (
    call.canvas === previewCanvas && call.method === "strokeRect"
  )).length;
  assertEqual(
    previewStrokes - 1,
    expected,
    "numero di pallet disegnati nella preview laterale"
  );

  app.resetCanvasCalls();
  const printCanvas = app.window.createRampPrintCanvas(result, false);
  const printStrokes = app.canvasCalls.filter(call => (
    call.canvas === printCanvas && call.method === "strokeRect"
  )).length;
  assertEqual(
    printStrokes - 1,
    expected,
    "numero di pallet disegnati nello schema di stampa"
  );
}

function validatorFixture(app, options = {}) {
  const gap = options.gap ?? 0;
  const pallet = {
    length: options.length ?? 1000,
    width: options.width ?? 800,
    height: options.height ?? 1000,
    rotationMode: options.rotationMode ?? "locked",
    lockedOrientation: options.lockedOrientation ?? "normal",
    name: "Fixture validatore",
    identifier: ""
  };
  const target = JSON.parse(JSON.stringify(container(app, options.containerId || "20dc")));
  const count = options.count ?? 2;
  const rects = Array.from({ length: count }, (_, index) => ({
    x: index * (pallet.length + gap),
    y: 0,
    length: pallet.length,
    width: pallet.width,
    rotated: false,
    layoutIndex: index
  }));
  const usedLength = rects.length
    ? Math.max(...rects.map(rect => rect.x + rect.length))
    : 0;
  const usedWidth = rects.length
    ? Math.max(...rects.map(rect => rect.y + rect.width))
    : 0;

  const layout = {
    mode: "single",
    type: "fixture validatore",
    count,
    rects,
    materializedCount: rects.length,
    truncated: false,
    orientationCounts: { normal: count, rotated: 0 },
    usedLength,
    usedWidth,
    stackCounts: rects.map(() => 1),
    loadedPalletCount: count
  };
  rects.forEach(rect => {
    rect.stackCount = 1;
  });

  return {
    mode: "single",
    container: target,
    capacityLayout: layout,
    loadLayout: layout,
    layout,
    layers: 1,
    loadLayers: 1,
    floorCapacity: count,
    totalCapacity: count,
    requestedFloorPositions: count,
    placedFloorPositions: count,
    placedCount: count,
    unplacedCount: 0,
    fitsQtyBySpace: true,
    okDoor: true,
    okHeight: true,
    loadedWeight: 0,
    okWeight: true,
    ok: true,
    input: {
      mode: "single",
      pallet,
      quantity: count,
      gap,
      stackable: false,
      maxLayers: 1,
      verticalGap: 0
    }
  };
}

function issueCodes(validation) {
  return new Set(validation.errors.map(issue => issue.code));
}

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test("quantità che richiede orientamento incompatibile con la porta", async () => {
  const app = await createApp();
  try {
    selectSingleCustom(app, {
      length: 2345,
      width: 800,
      height: 1000,
      quantity: 11,
      gap: 0
    });
    app.window.calculate();
    const result = currentResult(app, "40dc");
    assertEqual(result.capacityLayout.count, 15, "capacità geometrica inattesa");
    assertEqual(result.loadLayout.count, 11, "carico richiesto non interamente materializzato");
    assert(result.layout.rects.some(rect => rect.width === 2345), "fixture ruotata non riprodotta");
    assertEqual(result.okDoor, false, "il layout largo 2345 mm non deve superare la porta da 2340 mm");
    assertEqual(result.ok, false, "il risultato non deve essere CI STA");
    assertEqual(result.validation.internalError, false, "l'incompatibilità porta non è un errore interno");
    assertEqual(result.validation.valid, false, "il validatore deve respingere l'accesso porta");
  } finally {
    app.dom.window.close();
  }
});

test("porta 2345/2340 sul loadLayout compatibile da un pallet", async () => {
  const app = await createApp();
  try {
    selectSingleCustom(app, {
      length: 2345,
      width: 800,
      height: 1000,
      quantity: 1,
      gap: 0
    });
    app.window.calculate();
    const result = currentResult(app, "40dc");
    assertEqual(result.capacityLayout.count, 15, "capacità geometrica inattesa");
    assert(
      result.capacityLayout.rects.some(rect => rect.width === 2345),
      "il capacityLayout non contiene l'orientamento incompatibile atteso"
    );
    assertEqual(result.loadLayout.count, 1, "il loadLayout non contiene un solo pallet");
    assertEqual(result.loadLayout.rects[0].width, 800, "non è stato scelto l'orientamento da 800 mm trasversali");
    assertEqual(result.okDoor, true, "il loadLayout compatibile è stato respinto dalla porta");
    assertEqual(result.validation.valid, true, "R-01 non ha convalidato il loadLayout");
    assertEqual(result.ok, true, "il singolo pallet compatibile non mostra CI STA");
  } finally {
    app.dom.window.close();
  }
});

test("input dimensionali decimali sospendono il calcolo", async () => {
  const app = await createApp();
  try {
    selectSingleCustom(app, {
      length: "1000.004",
      width: 800,
      height: 1000,
      quantity: 2,
      gap: 0
    });
    app.window.calculate();
    assertEqual(app.evaluate("lastResults.length"), 0, "un decimale non deve produrre risultati");
    const message = app.document.getElementById("formValidationMessage");
    assert(message && !message.classList.contains("hidden"), "errore di validazione non mostrato");
  } finally {
    app.dom.window.close();
  }
});

test("quantità decimali e campi vuoti non usano fallback", async () => {
  const app = await createApp();
  try {
    const quantity = app.document.getElementById("quantity");
    quantity.value = "2.9";
    app.window.calculate();
    assertEqual(app.evaluate("lastResults.length"), 0, "quantità decimale accettata");

    quantity.value = "";
    app.window.calculate();
    assertEqual(app.evaluate("lastResults.length"), 0, "campo vuoto sostituito con un fallback");
  } finally {
    app.dom.window.close();
  }
});

test("zero e negativi sospendono i campi che richiedono valori positivi", async () => {
  const app = await createApp();
  try {
    selectSingleCustom(app, {
      length: 0,
      width: 800,
      height: -5,
      quantity: 0,
      gap: -1
    });
    app.window.calculate();
    assertEqual(app.evaluate("lastResults.length"), 0, "valori non positivi hanno prodotto risultati");
    assert(
      app.document.querySelectorAll('[aria-invalid="true"]').length >= 4,
      "non tutti i campi invalidi sono stati segnalati"
    );
  } finally {
    app.dom.window.close();
  }
});

test("pallet 1x1 senza materializzazione enorme", async () => {
  assert(
    HTML.includes("MAX_LAYOUT_RECTS"),
    "protezione scalare assente: il test distruttivo 1x1 non viene eseguito"
  );

  const app = await createApp();
  try {
    const truck = container(app, "truck-curtain-1360");
    const started = performance.now();
    const layout = app.window.bestLayout(
      truck,
      { length: 1, width: 1 },
      0,
      "auto",
      "normal"
    );
    const elapsed = performance.now() - started;
    assert(layout.count > 500, "la fixture non produce una capacità patologica");
    assert(layout.rects.length <= 500, "sono stati materializzati più di 500 rettangoli");
    assert(layout.count > layout.rects.length, "conteggio scalare e materializzazione non sono separati");
    assert(elapsed < 3000, `calcolo 1x1 troppo lento: ${elapsed.toFixed(0)} ms`);
  } finally {
    app.dom.window.close();
  }
});

test("limite aggregato di 500 pallet prima dell'espansione", async () => {
  const app = await createApp();
  try {
    const row = selectMixedCustom(app, {
      length: 1200,
      width: 800,
      height: 1000,
      quantity: 500,
      gap: 0
    });
    let validation = app.window.validateAndReadInput();
    assertEqual(validation.valid, true, "500 pallet devono essere ammessi");

    const items = app.window.expandMixedItems([{
      quantity: 500,
      name: "Stress",
      identifier: "",
      length: 1,
      width: 1,
      height: 1,
      rotationMode: "locked",
      lockedOrientation: "normal"
    }]);
    const started = performance.now();
    const layout = app.window.bestMixedLayout(container(app, "20dc"), items, 0);
    const elapsed = performance.now() - started;
    assertEqual(layout.count, 500, "il limite dichiarato deve restare calcolabile");
    assert(elapsed < 3000, `packing misto da 500 pallet troppo lento: ${elapsed.toFixed(0)} ms`);

    row.querySelector('[data-field="quantity"]').value = "501";
    validation = app.window.validateAndReadInput();
    assertEqual(validation.valid, false, "501 pallet devono essere respinti");

    let threw = false;
    try {
      app.window.expandMixedItems([{ quantity: 501 }]);
    } catch (error) {
      threw = error instanceof app.window.RangeError || error.name === "RangeError";
    }
    assert(threw, "expandMixedItems deve rifiutare 501 elementi prima del ciclo");
  } finally {
    app.dom.window.close();
  }
});

test("stabile frigo con lunghezza caricabile v1.0.0 da 13.310 mm", async () => {
  const app = await createApp();
  try {
    const layout = app.window.bestLayout(
      container(app, "truck-reefer-1360"),
      { length: 800, width: 600 },
      0,
      "auto",
      "normal"
    );
    assertEqual(
      container(app, "truck-reefer-1360").innerLength,
      13310,
      "il test deve usare la lunghezza caricabile v1.0.0"
    );
    assertEqual(layout.count, 66, "bestLayout deve restituire il miglior risultato v1.0.0");
  } finally {
    app.dom.window.close();
  }
});

test("parità candidati: conteggio, area e stabilità", async () => {
  const app = await createApp();
  try {
    const target = container(app, "20dc");
    const pallet = app.evaluate('PALLET_PRESETS.find(item => item.id === "48x45")');
    const candidates = [
      app.window.buildRows(target, pallet, 0, "normal", true),
      app.window.buildColumns(target, pallet, 0, "normal", true),
      app.window.buildRows(target, pallet, 0, "rotated", true),
      app.window.buildColumns(target, pallet, 0, "rotated", true)
    ];
    const counts = candidates.map(candidate => candidate.count);
    assert(counts.every(count => count === 8), `fixture senza parità di conteggio: ${counts.join("/")}`);

    const areas = candidates.map(candidate => candidate.usedLength * candidate.usedWidth);
    const minimumArea = Math.min(...areas);
    const minimumIndices = areas
      .map((area, index) => ({ area, index }))
      .filter(item => item.area === minimumArea)
      .map(item => item.index);
    assertEqual(minimumIndices.join(","), "1,3", "fixture inattesa per il criterio secondario");

    const best = app.window.bestLayout(target, pallet, 0, "auto", "normal");
    assertEqual(best.count, 8, "la parità ha alterato il conteggio");
    assertEqual(
      best.usedLength * best.usedWidth,
      minimumArea,
      "non è stata scelta l'area occupata minore"
    );
    assertEqual(
      JSON.stringify(best.rects),
      JSON.stringify(candidates[1].rects),
      "a parità completa non è stato mantenuto il primo candidato ordinato"
    );
  } finally {
    app.dom.window.close();
  }
});

test("caso euristico 990x660 documentato senza promessa di ottimo", async () => {
  const app = await createApp();
  try {
    const fixture = [
      [0, 0, 990, 660], [990, 0, 990, 660], [1980, 0, 990, 660],
      [2970, 0, 990, 660], [3960, 0, 990, 660], [4950, 0, 660, 990],
      [0, 660, 990, 660], [990, 660, 990, 660], [1980, 660, 990, 660],
      [2970, 660, 990, 660], [3960, 660, 990, 660], [4950, 990, 660, 990],
      [0, 1320, 990, 660], [990, 1320, 660, 990], [1650, 1320, 660, 990],
      [2310, 1320, 660, 990], [2970, 1320, 660, 990], [3630, 1320, 660, 990],
      [4290, 1320, 660, 990]
    ].map(([x, y, length, width]) => ({ x, y, length, width }));

    validateRectangles(container(app, "20dc"), fixture);
    const layout = app.window.bestLayout(
      container(app, "20dc"),
      { length: 990, width: 660 },
      0,
      "auto",
      "normal"
    );
    assert(layout.count <= 19, "il motore ha prodotto un conteggio incompatibile con la fixture");
    assert(
      /Migliore disposizione trovata|Capacità trovata/.test(app.document.body.textContent),
      "l'interfaccia presenta ancora il risultato come capacità massima"
    );
  } finally {
    app.dom.window.close();
  }
});

test("divergenza single/mixed omogeneo", async () => {
  const app = await createApp();
  try {
    const target = container(app, "20dc");
    const pallet = {
      length: 1219,
      width: 1143,
      height: 1000,
      rotationMode: "auto",
      lockedOrientation: "normal",
      name: "48x45",
      identifier: ""
    };
    const single = app.window.bestLayout(target, pallet, 0, "auto", "normal");
    const items = Array.from({ length: 8 }, (_, index) => ({
      ...pallet,
      id: `1.${index + 1}`,
      typeIndex: 0,
      unitNo: index + 1
    }));
    const mixed = app.window.bestMixedLayout(target, items, 0);
    assertEqual(single.count, 8, "fixture single inattesa");
    assertEqual(mixed.count, single.count, "il mixed omogeneo deve eguagliare il single");
    assertEqual(
      JSON.stringify(geometrySignature(mixed.rects)),
      JSON.stringify(geometrySignature(single.rects)),
      "il ponte omogeneo non riproduce la disposizione single"
    );
  } finally {
    app.dom.window.close();
  }
});

test("B-08: gruppi omogenei distinti conservano identità e non piazzati", async () => {
  const app = await createApp();
  try {
    const target = container(app, "20dc");
    const types = [
      {
        name: "Gruppo verde",
        identifier: "VERDE",
        length: 1219,
        width: 1143,
        height: 1000,
        quantity: 5,
        rotationMode: "auto",
        lockedOrientation: "normal"
      },
      {
        name: "Gruppo blu",
        identifier: "BLU",
        length: 1219,
        width: 1143,
        height: 1000,
        quantity: 5,
        rotationMode: "auto",
        lockedOrientation: "normal"
      }
    ];
    const items = app.window.expandMixedItems(types);
    const layout = app.window.bestMixedLayout(target, items, 0);

    assertEqual(layout.count, 8, "conteggio omogeneo su più gruppi");
    assertEqual(layout.unplaced.length, 2, "elenco unplaced omogeneo");
    assertEqual(
      layout.rects.map(rect => rect.id).join(","),
      items.slice(0, 8).map(item => item.id).join(","),
      "id dei pallet piazzati non conservati"
    );
    assertEqual(
      layout.unplaced.map(item => item.id).join(","),
      items.slice(8).map(item => item.id).join(","),
      "id dei pallet non piazzati non conservati"
    );

    [...layout.rects, ...layout.unplaced].forEach((item, index) => {
      const source = items[index];
      assertEqual(item.typeIndex, source.typeIndex, `typeIndex pallet ${index}`);
      assertEqual(item.unitNo, source.unitNo, `unitNo pallet ${index}`);
      assertEqual(item.id, source.id, `id pallet ${index}`);
      assertEqual(item.name, source.name, `nome pallet ${index}`);
      assertEqual(item.identifier, source.identifier, `identificativo pallet ${index}`);
    });
    assert(
      new Set([...layout.rects, ...layout.unplaced].map(item => item.typeIndex)).size === 2,
      "i gruppi omogenei sono stati unificati visivamente"
    );

    const result = mixedValidationFixture(target, types, layout, 0);
    const validation = app.window.validateResultGeometry(result);
    assertEqual(validation.internalError, false, "R-01 respinge i riferimenti del ponte omogeneo");
    assertEqual(validation.valid, true, "R-01 non convalida il ponte omogeneo");
  } finally {
    app.dom.window.close();
  }
});

test("B-08: matrice equivalenza single/mixed omogeneo", async () => {
  const app = await createApp();
  try {
    const containers = app.evaluate("CONTAINERS");
    const presets = app.evaluate("PALLET_PRESETS");
    const gaps = [0, 1, 10];
    const rotations = [
      ["auto", "normal"],
      ["locked", "normal"],
      ["locked", "rotated"]
    ];
    let oneGroupCases = 0;
    let multipleGroupCases = 0;

    for (const target of containers) {
      for (const preset of presets) {
        const pallet = {
          ...preset,
          height: 1000
        };
        for (const gap of gaps) {
          for (const [rotationMode, lockedOrientation] of rotations) {
            const capacity = app.window.bestLayout(
              target,
              pallet,
              gap,
              rotationMode,
              lockedOrientation
            ).count;
            assert(capacity > 1, `capacità insufficiente per la matrice ${target.id}/${preset.id}`);
            const quantities = [capacity - 1, capacity, capacity + 1];

            for (const quantity of quantities) {
              const single = app.window.bestLoadLayout(
                target,
                pallet,
                gap,
                rotationMode,
                lockedOrientation,
                quantity
              );

              for (const multipleGroups of [false, true]) {
                const types = homogeneousTypes(
                  pallet,
                  quantity,
                  rotationMode,
                  lockedOrientation,
                  multipleGroups
                );
                const items = app.window.expandMixedItems(types);
                const mixed = app.window.bestMixedLayout(target, items, gap);

                assertEqual(
                  mixed.count,
                  single.count,
                  `parità conteggio ${target.id}/${preset.id}/gap${gap}/${rotationMode}/${lockedOrientation}/q${quantity}`
                );
                assertEqual(
                  JSON.stringify(geometrySignature(mixed.rects)),
                  JSON.stringify(geometrySignature(single.rects)),
                  `parità coordinate ${target.id}/${preset.id}/gap${gap}/${rotationMode}/${lockedOrientation}/q${quantity}`
                );
                assertEqual(
                  mixed.unplaced.length,
                  quantity - mixed.count,
                  "conteggio unplaced nella matrice"
                );
                assertEqual(
                  mixed.rects.map(rect => rect.id).join(","),
                  items.slice(0, mixed.count).map(item => item.id).join(","),
                  "identità piazzate nella matrice"
                );
                assertEqual(
                  mixed.unplaced.map(item => item.id).join(","),
                  items.slice(mixed.count).map(item => item.id).join(","),
                  "identità unplaced nella matrice"
                );

                const result = mixedValidationFixture(target, types, mixed, gap);
                const validation = app.window.validateResultGeometry(result);
                assertEqual(
                  validation.internalError,
                  false,
                  `R-01 matrice ${target.id}/${preset.id}/gap${gap}/${rotationMode}/${lockedOrientation}/q${quantity}`
                );

                if (multipleGroups) multipleGroupCases += 1;
                else oneGroupCases += 1;
              }
            }
          }
        }
      }
    }

    assertEqual(oneGroupCases, 3240, "numero casi matrice a un gruppo");
    assertEqual(multipleGroupCases, 3240, "numero casi matrice a più gruppi");
  } finally {
    app.dom.window.close();
  }
});

test("gap soltanto tra pallet", async () => {
  const app = await createApp();
  try {
    const target = container(app, "20dc");
    const item = {
      id: "1.1",
      typeIndex: 0,
      unitNo: 1,
      name: "Esatto",
      identifier: "",
      length: 5896,
      width: 2300,
      height: 1000,
      rotationMode: "locked",
      lockedOrientation: "normal"
    };
    const mixed = app.window.bestMixedLayout(target, [item], 1);
    assertEqual(mixed.count, 1, "il gap non deve essere richiesto contro la parete");
  } finally {
    app.dom.window.close();
  }
});

test("B-09: pallet esatto in lunghezza e larghezza", async () => {
  const app = await createApp();
  try {
    const target = container(app, "20dc");
    const exactLength = {
      id: "1.1",
      typeIndex: 0,
      unitNo: 1,
      name: "Lunghezza esatta",
      identifier: "L",
      length: target.innerLength,
      width: 1000,
      height: 1000,
      rotationMode: "locked",
      lockedOrientation: "normal"
    };
    const exactWidth = {
      ...exactLength,
      name: "Larghezza esatta",
      identifier: "W",
      length: 1000,
      width: target.innerWidth
    };

    for (const item of [exactLength, exactWidth]) {
      const packed = app.window.packItems(target, [item], 10);
      assertEqual(packed.placed.length, 1, `${item.name} respinto dal gap contro parete`);
      validateRectangles(target, packed.placed);
      assertEqual(packed.usedLength, item.length, `${item.name}: usedLength non reale`);
      assertEqual(packed.usedWidth, item.width, `${item.name}: usedWidth non reale`);
    }
  } finally {
    app.dom.window.close();
  }
});

test("B-09: un solo gap fra due pallet e contatto con tutti i bordi", async () => {
  const app = await createApp();
  try {
    const target = container(app, "20dc");
    const gap = 10;
    const alongLength = [
      {
        id: "1.1", typeIndex: 0, unitNo: 1, name: "Fronte", identifier: "F",
        length: 3000, width: 1000, height: 1000,
        rotationMode: "locked", lockedOrientation: "normal"
      },
      {
        id: "2.1", typeIndex: 1, unitNo: 1, name: "Porte", identifier: "P",
        length: target.innerLength - 3000 - gap, width: 1000, height: 1000,
        rotationMode: "locked", lockedOrientation: "normal"
      }
    ];
    const packedLength = app.window.packItems(target, alongLength, gap);
    assertEqual(packedLength.placed.length, 2, "due pallet con un solo gap longitudinale");
    validateRectangles(target, packedLength.placed);
    validateRectangleGap(packedLength.placed, gap);
    assertEqual(Math.min(...packedLength.placed.map(rect => rect.x)), 0, "nessun pallet al fronte");
    assertEqual(
      Math.max(...packedLength.placed.map(rect => rect.x + rect.length)),
      target.innerLength,
      "nessun pallet accostato alle porte"
    );

    const alongWidth = [
      {
        id: "1.1", typeIndex: 0, unitNo: 1, name: "Parete sinistra", identifier: "S",
        length: 1000, width: 1200, height: 1000,
        rotationMode: "locked", lockedOrientation: "normal"
      },
      {
        id: "2.1", typeIndex: 1, unitNo: 1, name: "Parete destra", identifier: "D",
        length: 1000, width: target.innerWidth - 1200 - gap, height: 1000,
        rotationMode: "locked", lockedOrientation: "normal"
      }
    ];
    const packedWidth = app.window.packItems(target, alongWidth, gap);
    assertEqual(packedWidth.placed.length, 2, "due pallet con un solo gap trasversale");
    validateRectangles(target, packedWidth.placed);
    validateRectangleGap(packedWidth.placed, gap);
    assertEqual(Math.min(...packedWidth.placed.map(rect => rect.y)), 0, "nessun pallet alla parete sinistra");
    assertEqual(
      Math.max(...packedWidth.placed.map(rect => rect.y + rect.width)),
      target.innerWidth,
      "nessun pallet alla parete destra"
    );
  } finally {
    app.dom.window.close();
  }
});

test("B-09: disposizioni miste con gap 1, 5 e 10 mm", async () => {
  const app = await createApp();
  try {
    const target = container(app, "20dc");

    for (const gap of [1, 5, 10]) {
      const types = [
        {
          name: `Tipo A gap ${gap}`,
          identifier: "A",
          length: 3000,
          width: 1000,
          height: 1000,
          quantity: 1,
          rotationMode: "locked",
          lockedOrientation: "normal"
        },
        {
          name: `Tipo B gap ${gap}`,
          identifier: "B",
          length: target.innerLength - 3000 - gap,
          width: 1000,
          height: 1000,
          quantity: 1,
          rotationMode: "locked",
          lockedOrientation: "normal"
        }
      ];
      const items = app.window.expandMixedItems(types);
      const layout = app.window.bestMixedLayout(target, items, gap);
      assertEqual(layout.count, 2, `gap ${gap}: non usa soltanto il distacco interno`);
      assertEqual(layout.unplaced.length, 0, `gap ${gap}: unplaced inattesi`);
      validateRectangles(target, layout.rects);
      validateRectangleGap(layout.rects, gap);
      assertEqual(layout.usedLength, target.innerLength, `gap ${gap}: usedLength non reale`);
      assertEqual(layout.usedWidth, 1000, `gap ${gap}: usedWidth non reale`);

      const result = mixedValidationFixture(target, types, layout, gap);
      const validation = app.window.validateResultGeometry(result);
      assertEqual(validation.internalError, false, `gap ${gap}: R-01 ha rilevato errore interno`);
      assertEqual(validation.valid, true, `gap ${gap}: R-01 non convalida il layout`);
    }
  } finally {
    app.dom.window.close();
  }
});

test("B-10: un Euro pallet richiesto nel 20 Dry", async () => {
  const app = await createApp();
  try {
    app.document.getElementById("quantity").value = "1";
    app.window.calculate();
    const result = currentResult(app, "20dc");
    assertEqual(result.input.quantity, 1, "fixture quantità non impostata");
    assertEqual(result.capacityLayout.count, 11, "capacità Euro pallet nel 20 Dry");
    assertEqual(result.floorCapacity, 11, "capacità a pavimento incoerente");
    assertEqual(result.loadLayout.count, 1, "il loadLayout non rappresenta la quantità richiesta");
    assertEqual(result.placedCount, 1, "quantità piazzata errata");
    assertEqual(result.layout, result.loadLayout, "il layout operativo non coincide con loadLayout");
    assertPreviewAndPrintRectCount(app, result, 1);
    assert(
      app.window.resultPrintTitle(result).includes("1 pallet richiesto"),
      "il titolo di stampa non riporta la quantità richiesta"
    );
  } finally {
    app.dom.window.close();
  }
});

test("B-10: dieci Euro pallet richiesti nel 20 Dry", async () => {
  const app = await createApp();
  try {
    app.document.getElementById("quantity").value = "10";
    app.window.calculate();
    const result = currentResult(app, "20dc");
    assertEqual(result.capacityLayout.count, 11, "capacità Euro pallet nel 20 Dry");
    assertEqual(result.loadLayout.count, 10, "la preview deve contenere dieci posizioni");
    assertEqual(result.placedCount, 10, "quantità piazzata errata");
    assertEqual(result.unplacedCount, 0, "pallet mancanti inattesi");
    assertPreviewAndPrintRectCount(app, result, 10);
  } finally {
    app.dom.window.close();
  }
});

test("B-10: quantità uguale alla capacità", async () => {
  const app = await createApp();
  try {
    app.document.getElementById("quantity").value = "11";
    app.window.calculate();
    const result = currentResult(app, "20dc");
    assertEqual(result.totalCapacity, 11, "capacità totale inattesa");
    assertEqual(result.requestedFloorPositions, 11, "posizioni richieste errate");
    assertEqual(result.loadLayout.count, 11, "schema incompleto a capacità piena");
    assertEqual(result.placedCount, 11, "quantità piazzata errata");
    assertEqual(result.unplacedCount, 0, "pallet mancanti inattesi");
    assertEqual(result.ok, true, "il carico a capacità piena non mostra CI STA");
    assertPreviewAndPrintRectCount(app, result, 11);
  } finally {
    app.dom.window.close();
  }
});

test("B-10: quantità superiore alla capacità", async () => {
  const app = await createApp();
  try {
    app.document.getElementById("quantity").value = "12";
    app.window.calculate();
    const result = currentResult(app, "20dc");
    assertEqual(result.totalCapacity, 11, "capacità totale inattesa");
    assertEqual(result.loadLayout.count, 11, "miglior piazzamento parziale errato");
    assertEqual(result.placedCount, 11, "quantità piazzata errata");
    assertEqual(result.unplacedCount, 1, "numero non piazzato errato");
    assertEqual(result.ok, false, "una quantità superiore alla capacità mostra CI STA");
    assertPreviewAndPrintRectCount(app, result, 11);
    assert(
      app.document.getElementById("resultsBody").textContent.includes("Non piazzato: 1 pallet"),
      "la tabella non indica chiaramente il numero non piazzato"
    );
  } finally {
    app.dom.window.close();
  }
});

test("B-10: pallet sovrapponibili e posizioni a pavimento", async () => {
  const app = await createApp();
  try {
    app.document.getElementById("quantity").value = "11";
    app.document.getElementById("palletHeight").value = "1000";
    app.document.getElementById("stackable").checked = true;
    app.document.getElementById("maxLayers").value = "2";
    app.document.getElementById("verticalGap").value = "0";
    app.window.calculate();
    const result = currentResult(app, "20dc");
    assertEqual(result.layers, 2, "numero massimo di strati errato");
    assertEqual(result.requestedFloorPositions, 6, "conversione in posizioni a pavimento errata");
    assertEqual(result.loadLayout.count, 6, "numero di posizioni materializzate errato");
    assertEqual(result.placedCount, 11, "pallet piazzati errati");
    assertEqual(result.loadLayers, 2, "altezza del carico non usa gli strati reali");
    assertEqual(result.loadLayout.stackCounts.join(","), "2,2,2,2,2,1", "distribuzione strati inattesa");
    assertEqual(result.validation.valid, true, "R-01 non ha convalidato strati e altezza");
    assertEqual(app.window.usedLoadHeight(result), 2000, "altezza usata del carico errata");
    assertPreviewAndPrintRectCount(app, result, 6);
  } finally {
    app.dom.window.close();
  }
});

test("B-10: tabella, note, titolo e riepilogo distinguono i conteggi", async () => {
  const app = await createApp();
  try {
    app.document.getElementById("quantity").value = "10";
    app.window.calculate();
    const result = currentResult(app, "20dc");
    const tableText = app.document.getElementById("resultsBody").textContent.replace(/\s+/g, " ");
    const notesText = app.document.getElementById("layoutNotes").textContent.replace(/\s+/g, " ");
    const printDetails = app.window.buildPrintDetails(result).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    const printLegend = app.window.buildPrintLegend(result, false).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

    assert(tableText.includes("Capacità trovata: 11 pallet"), "capacità assente dalla tabella");
    assert(tableText.includes("Quantità richiesta: 10"), "quantità richiesta assente dalla tabella");
    assert(tableText.includes("Quantità piazzata: 10"), "quantità piazzata assente dalla tabella");
    assert(notesText.includes("capacità trovata 11 pallet"), "capacità assente dalle note preview");
    assert(notesText.includes("Quantità richiesta: 10"), "richiesta assente dalle note preview");
    assert(notesText.includes("Quantità piazzata: 10"), "piazzamento assente dalle note preview");
    assert(
      printDetails.includes("10 pallet piazzati / 10 pallet richiesti"),
      "riepilogo stampa incoerente"
    );
    assert(printDetails.includes("capacità trovata 11 pallet"), "capacità assente dal riepilogo stampa");
    assert(printLegend.includes("Quantità richiesta 10"), "legenda stampa incoerente");
    assert(
      app.window.resultPrintTitle(result).includes("10 pallet richiesti"),
      "titolo stampa basato sulla capacità anziché sulla richiesta"
    );
  } finally {
    app.dom.window.close();
  }
});

test("persistenza del mezzo selezionato", async () => {
  const app = await createApp();
  try {
    const select = app.document.getElementById("drawSelect");
    const targetIndex = app.evaluate(
      'lastResults.findIndex(item => item.container.id === "truck-curtain-1360")'
    );
    select.value = String(targetIndex);
    select.dispatchEvent(new app.window.Event("change", { bubbles: true }));

    const selectedContainer = () => app.evaluate(
      'lastResults[Number(document.getElementById("drawSelect").value)].container.id'
    );

    app.document.getElementById("quantity").value = "9";
    app.window.calculate();
    assertEqual(selectedContainer(), "truck-curtain-1360", "mezzo perso dopo modifica quantità");

    app.document.getElementById("quantity").value = "";
    app.window.calculate();
    app.document.getElementById("quantity").value = "9";
    app.window.calculate();
    assertEqual(selectedContainer(), "truck-curtain-1360", "mezzo perso dopo sospensione per input invalido");

    app.document.getElementById("loadMode").value = "mixed";
    app.window.syncModeUI();
    assertEqual(selectedContainer(), "truck-curtain-1360", "mezzo perso al cambio modalità");

    app.window.addMixedRow({ presetId: "eur", quantity: 1, height: 1500 });
    assertEqual(selectedContainer(), "truck-curtain-1360", "mezzo perso dopo aggiunta gruppo");

    const lastRow = app.document.querySelector("#mixedRows .mixed-row:last-child");
    lastRow.remove();
    app.window.calculate();
    assertEqual(selectedContainer(), "truck-curtain-1360", "mezzo perso dopo rimozione gruppo");
  } finally {
    app.dom.window.close();
  }
});

test("bounds, sovrapposizioni e conteggi", async () => {
  const app = await createApp();
  try {
    const pallets = [
      { length: 1200, width: 800 },
      { length: 1200, width: 1000 },
      { length: 1219, width: 1016 },
      { length: 800, width: 600 }
    ];

    for (const containerData of app.evaluate("CONTAINERS")) {
      for (const pallet of pallets) {
        const layout = app.window.bestLayout(
          containerData,
          pallet,
          0,
          "auto",
          "normal"
        );
        validateRectangles(containerData, layout.rects);
        assert(layout.count >= layout.rects.length, "conteggio minore dei rettangoli");
        assertEqual(
          layout.materializedCount ?? layout.rects.length,
          layout.rects.length,
          "materializedCount incoerente"
        );
        if (!layout.truncated) {
          assertEqual(layout.count, layout.rects.length, "conteggio non troncato incoerente");
        }
      }
    }
  } finally {
    app.dom.window.close();
  }
});

test("validatore comune applicato a single e mixed", async () => {
  const app = await createApp();
  try {
    assert(
      app.evaluate("lastResults.every(result => result.validation && !result.validation.internalError)"),
      "almeno un risultato single non è passato dal validatore comune"
    );
    assert(
      app.evaluate("lastResults.every(result => result.layout === result.loadLayout)"),
      "R-01 non è applicato al loadLayout operativo"
    );

    app.document.getElementById("loadMode").value = "mixed";
    app.window.syncModeUI();
    assert(
      app.evaluate("lastResults.every(result => result.validation && !result.validation.internalError)"),
      "almeno un risultato mixed non è passato dal validatore comune"
    );
  } finally {
    app.dom.window.close();
  }
});

test("validatore: rettangolo fuori dal bordo", async () => {
  const app = await createApp();
  try {
    const fixture = validatorFixture(app);
    fixture.layout.rects[1].x = fixture.container.innerLength - 500;
    fixture.layout.usedLength = fixture.layout.rects[1].x + fixture.layout.rects[1].length;
    const validation = app.window.validateResultGeometry(fixture);
    assertEqual(validation.internalError, true, "rettangolo fuori bordo accettato");
    assert(issueCodes(validation).has("RECT_OUT_OF_BOUNDS"), "codice RECT_OUT_OF_BOUNDS assente");
  } finally {
    app.dom.window.close();
  }
});

test("validatore: coordinate negative", async () => {
  const app = await createApp();
  try {
    const fixture = validatorFixture(app);
    fixture.layout.rects[0].x = -1;
    const validation = app.window.validateResultGeometry(fixture);
    assertEqual(validation.internalError, true, "coordinata negativa accettata");
    assert(issueCodes(validation).has("NEGATIVE_COORDINATE"), "codice NEGATIVE_COORDINATE assente");
  } finally {
    app.dom.window.close();
  }
});

test("validatore: NaN e Infinity", async () => {
  const app = await createApp();
  try {
    const fixture = validatorFixture(app);
    fixture.layout.rects[0].x = Number.NaN;
    fixture.layout.rects[1].width = Number.POSITIVE_INFINITY;
    const validation = app.window.validateResultGeometry(fixture);
    assertEqual(validation.internalError, true, "NaN o Infinity accettati");
    assert(issueCodes(validation).has("NON_FINITE_RECT"), "codice NON_FINITE_RECT assente");
  } finally {
    app.dom.window.close();
  }
});

test("validatore: due rettangoli sovrapposti", async () => {
  const app = await createApp();
  try {
    const fixture = validatorFixture(app);
    fixture.layout.rects[1].x = 900;
    fixture.layout.usedLength = 1900;
    const validation = app.window.validateResultGeometry(fixture);
    assertEqual(validation.internalError, true, "sovrapposizione accettata");
    assert(issueCodes(validation).has("RECT_OVERLAP"), "codice RECT_OVERLAP assente");
  } finally {
    app.dom.window.close();
  }
});

test("validatore: gap insufficiente", async () => {
  const app = await createApp();
  try {
    const fixture = validatorFixture(app, { gap: 10 });
    fixture.layout.rects[1].x = 1005;
    fixture.layout.usedLength = 2005;
    const validation = app.window.validateResultGeometry(fixture);
    assertEqual(validation.internalError, true, "gap insufficiente accettato");
    assert(issueCodes(validation).has("INSUFFICIENT_GAP"), "codice INSUFFICIENT_GAP assente");
  } finally {
    app.dom.window.close();
  }
});

test("validatore: orientamento vietato", async () => {
  const app = await createApp();
  try {
    const fixture = validatorFixture(app, { count: 1 });
    const rect = fixture.layout.rects[0];
    rect.rotated = true;
    rect.length = fixture.input.pallet.width;
    rect.width = fixture.input.pallet.length;
    fixture.layout.orientationCounts = { normal: 0, rotated: 1 };
    fixture.layout.usedLength = rect.length;
    fixture.layout.usedWidth = rect.width;
    const validation = app.window.validateResultGeometry(fixture);
    assertEqual(validation.internalError, true, "orientamento bloccato violato senza errore");
    assert(issueCodes(validation).has("ORIENTATION_NOT_ALLOWED"), "codice ORIENTATION_NOT_ALLOWED assente");
  } finally {
    app.dom.window.close();
  }
});

test("validatore: conteggio incoerente", async () => {
  const app = await createApp();
  try {
    const fixture = validatorFixture(app);
    fixture.layout.count = 3;
    const validation = app.window.validateResultGeometry(fixture);
    assertEqual(validation.internalError, true, "conteggio incoerente accettato");
    const codes = issueCodes(validation);
    assert(
      codes.has("ORIENTATION_COUNT_INCOHERENT") || codes.has("RESULT_COUNT_INCOHERENT"),
      "nessun codice di conteggio incoerente"
    );
  } finally {
    app.dom.window.close();
  }
});

test("validatore: pallet non compatibile con la porta", async () => {
  const app = await createApp();
  try {
    const fixture = validatorFixture(app, {
      containerId: "40dc",
      length: 1000,
      width: 2345,
      count: 1
    });
    const validation = app.window.validateResultGeometry(fixture);
    assertEqual(validation.internalError, false, "l'incompatibilità porta è stata scambiata per errore interno");
    assertEqual(validation.okDoor, false, "pallet largo 2345 accettato nella porta da 2340");
    assertEqual(validation.valid, false, "validatore positivo nonostante la porta incompatibile");
  } finally {
    app.dom.window.close();
  }
});

test("validatore: capacityLayout incompatibile non invalida il loadLayout", async () => {
  const app = await createApp();
  try {
    selectSingleCustom(app, {
      length: 2345,
      width: 800,
      height: 1000,
      quantity: 1,
      gap: 0
    });
    app.window.calculate();
    const result = currentResult(app, "40dc");
    assert(
      result.capacityLayout.orientationCounts.rotated > 0,
      "fixture senza orientamento incompatibile nella capacità"
    );
    assertEqual(result.loadLayout.orientationCounts.rotated, 0, "loadLayout orientato in modo incompatibile");
    assertEqual(result.validation.internalError, false, "capacityLayout ha causato un errore interno");
    assertEqual(result.validation.okDoor, true, "R-01 ha verificato la porta sul capacityLayout");
    assertEqual(result.validation.valid, true, "loadLayout compatibile non convalidato");
  } finally {
    app.dom.window.close();
  }
});

test("errore interno fallisce chiuso e disabilita la stampa", async () => {
  const app = await createApp();
  try {
    const originalBestLoadLayout = app.window.bestLoadLayout;
    app.window.bestLoadLayout = (...args) => {
      const layout = originalBestLoadLayout(...args);
      if (layout.rects.length) layout.rects[0].x = -1;
      return layout;
    };

    app.window.calculate();
    const result = currentResult(app, "20dc");
    assertEqual(result.validationError, true, "errore geometrico interno non propagato");
    assertEqual(result.ok, false, "errore interno ha lasciato CI STA");
    assert(
      app.document.getElementById("resultsBody").textContent.includes(
        "ERRORE DI VALIDAZIONE DELLO SCHEMA"
      ),
      "messaggio distinguibile non mostrato nella tabella"
    );
    assertEqual(
      app.document.getElementById("printLayoutBtn").disabled,
      true,
      "stampa operativa non disabilitata"
    );
    assert(
      app.document.getElementById("layoutNotes").textContent.includes(
        "ERRORE DI VALIDAZIONE DELLO SCHEMA"
      ),
      "errore non mostrato nell'area schema"
    );
  } finally {
    app.dom.window.close();
  }
});

test("nome custom limitato e validato", async () => {
  const app = await createApp();
  try {
    const group = selectSingleCustom(app, {
      length: 1200,
      width: 800,
      height: 1000,
      quantity: 1,
      gap: 0
    });
    const customName = group.querySelector('[data-field="customName"]');
    assertEqual(customName.maxLength, 48, "maxlength del nome custom");
    customName.value = "X".repeat(49);
    const validation = app.window.validateAndReadInput();
    assertEqual(validation.valid, false, "nome oltre limite accettato");
  } finally {
    app.dom.window.close();
  }
});

const results = [];

for (const { name, fn } of tests) {
  try {
    await fn();
    results.push({ name, status: "PASS", deferred: false, message: "" });
    console.log(`PASS  ${name}`);
  } catch (error) {
    const deferred = KNOWN_DEFERRED_FAILURES.has(name);
    results.push({
      name,
      status: "FAIL",
      deferred,
      message: error instanceof Error ? error.message : String(error)
    });
    console.log(`${deferred ? "FAIL*" : "FAIL "} ${name}: ${results.at(-1).message}`);
  }
}

const passed = results.filter(item => item.status === "PASS").length;
const failed = results.filter(item => item.status === "FAIL").length;
const unexpected = results.filter(item => item.status === "FAIL" && !item.deferred).length;

console.log("");
console.log(`Totale: ${results.length} | superati: ${passed} | falliti: ${failed} | fallimenti inattesi: ${unexpected}`);
console.log("FAIL* = difetto noto rinviato oltre il blocco autorizzato.");

if (process.env.LOADCOMPOSER_TEST_JSON) {
  fs.writeFileSync(
    path.resolve(PROJECT_DIR, process.env.LOADCOMPOSER_TEST_JSON),
    `${JSON.stringify({ app: APP_PATH, passed, failed, unexpected, results }, null, 2)}\n`,
    "utf8"
  );
}

if (unexpected > 0) {
  process.exitCode = 1;
}
