import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launchBrowser } from "./browser-runtime.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const APP_URL = pathToFileURL(
  path.join(ROOT, "site/downloads/loadcomposer-v1.0.0-rc.2-standalone.html")
).href;
const LANGUAGES = ["it", "en", "de", "es", "fr", "pt", "nl"];
const LOCALES = {
  it: "it-IT",
  en: "en-GB",
  de: "de-DE",
  es: "es-ES",
  fr: "fr-FR",
  pt: "pt-PT",
  nl: "nl-NL"
};
const EXPECTED = {
  it: {
    pallet: ["pallet", "pallet", "pallet", "pallet"],
    floor: ["0 posizioni a pavimento", "1 posizione a pavimento", "2 posizioni a pavimento", "5 posizioni a pavimento"],
    layer: ["capacità geometrica 0 strati", "capacità geometrica 1 strato", "capacità geometrica 2 strati", "capacità geometrica 5 strati"],
    missing: ["Non piazzato: 1 pallet.", "Non piazzati: 2 pallet."],
    mixed: ["1 pallet misto è piazzato a pavimento.", "2 pallet misti sono piazzati a pavimento."]
  },
  en: {
    pallet: ["pallets", "pallet", "pallets", "pallets"],
    floor: ["0 floor positions", "1 floor position", "2 floor positions", "5 floor positions"],
    layer: ["geometric capacity 0 layers", "geometric capacity 1 layer", "geometric capacity 2 layers", "geometric capacity 5 layers"],
    missing: ["Not placed: 1 pallet.", "Not placed: 2 pallets."],
    mixed: ["1 mixed pallet is placed on the floor.", "2 mixed pallets are placed on the floor."]
  },
  de: {
    pallet: ["Paletten", "Palette", "Paletten", "Paletten"],
    floor: ["0 Bodenstellplätze", "1 Bodenstellplatz", "2 Bodenstellplätze", "5 Bodenstellplätze"],
    layer: ["geometrische Kapazität 0 Lagen", "geometrische Kapazität 1 Lage", "geometrische Kapazität 2 Lagen", "geometrische Kapazität 5 Lagen"],
    missing: ["Nicht platziert: 1 Palette.", "Nicht platziert: 2 Paletten."],
    mixed: ["1 gemischte Palette ist am Boden platziert.", "2 gemischte Paletten sind am Boden platziert."]
  },
  es: {
    pallet: ["palés", "palé", "palés", "palés"],
    floor: ["0 posiciones en suelo", "1 posición en suelo", "2 posiciones en suelo", "5 posiciones en suelo"],
    layer: ["capacidad geométrica de 0 niveles", "capacidad geométrica de 1 nivel", "capacidad geométrica de 2 niveles", "capacidad geométrica de 5 niveles"],
    missing: ["Sin colocar: 1 palé.", "Sin colocar: 2 palés."],
    mixed: ["1 palé mixto está colocado en el suelo.", "2 palés mixtos están colocados en el suelo."]
  },
  fr: {
    pallet: ["palette", "palette", "palettes", "palettes"],
    floor: ["0 position au sol", "1 position au sol", "2 positions au sol", "5 positions au sol"],
    layer: ["capacité géométrique de 0 niveau", "capacité géométrique de 1 niveau", "capacité géométrique de 2 niveaux", "capacité géométrique de 5 niveaux"],
    missing: ["Non placée : 1 palette.", "Non placées : 2 palettes."],
    mixed: ["1 palette mixte est placée au sol.", "2 palettes mixtes sont placées au sol."]
  },
  pt: {
    pallet: ["paletes", "palete", "paletes", "paletes"],
    floor: ["0 posições no piso", "1 posição no piso", "2 posições no piso", "5 posições no piso"],
    layer: ["capacidade geométrica de 0 níveis", "capacidade geométrica de 1 nível", "capacidade geométrica de 2 níveis", "capacidade geométrica de 5 níveis"],
    missing: ["Não colocada: 1 palete.", "Não colocadas: 2 paletes."],
    mixed: ["1 palete mista está colocada no piso.", "2 paletes mistas estão colocadas no piso."]
  },
  nl: {
    pallet: ["pallets", "pallet", "pallets", "pallets"],
    floor: ["0 vloerplaatsen", "1 vloerplaats", "2 vloerplaatsen", "5 vloerplaatsen"],
    layer: ["geometrische capaciteit 0 lagen", "geometrische capaciteit 1 laag", "geometrische capaciteit 2 lagen", "geometrische capaciteit 5 lagen"],
    missing: ["Niet geplaatst: 1 pallet.", "Niet geplaatst: 2 pallets."],
    mixed: ["1 gemengde pallet is op de vloer geplaatst.", "2 gemengde pallets zijn op de vloer geplaatst."]
  }
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clean(text) {
  return String(text).replace(/\s+/g, " ").trim();
}

async function openApp(browser, language) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: LOCALES[language],
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

async function configureSingle(page, options) {
  return page.evaluate(config => {
    document.getElementById("loadMode").value = "single";
    syncModeUI({ calculate: false });
    const group = document.getElementById("singlePalletGroup");
    selectPresetForGroup(group, "custom", false);
    group.querySelector("[data-field='length']").value = String(config.length);
    group.querySelector("[data-field='width']").value = String(config.width);
    group.querySelector("[data-field='height']").value = String(config.height || 1000);
    group.querySelector("[data-field='quantity']").value = String(config.quantity);
    group.querySelector("[data-field='allowRotate']").checked = false;
    document.getElementById("quantity").value = String(config.quantity);
    document.getElementById("palletHeight").value = String(config.height || 1000);
    document.getElementById("gap").value = "0";
    document.getElementById("stackable").checked = Boolean(config.layers > 1);
    document.getElementById("maxLayers").value = String(config.layers || 1);
    document.getElementById("verticalGap").value = "0";
    document.getElementById("stackOptions").classList.toggle(
      "hidden",
      !(config.layers > 1)
    );
    updateGroupVisuals(group);
    if (!calculate()) throw new Error("single calculation failed");
    const index = lastResults.findIndex(result => result.container.id === config.vehicle);
    if (index < 0) throw new Error(`vehicle ${config.vehicle} missing`);
    document.getElementById("drawSelect").value = String(index);

    const canvasText = [];
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (...args) {
      canvasText.push(String(args[0]));
      return original.apply(this, args);
    };
    try {
      drawSelected();
    } finally {
      CanvasRenderingContext2D.prototype.fillText = original;
    }

    const rows = Array.from(document.querySelectorAll("#resultsBody tr"))
      .filter(row => !row.classList.contains("vehicle-group-row"));
    const result = lastResults[index];
    return {
      index,
      capacity: result.totalCapacity,
      placed: result.placedCount,
      requested: result.input.quantity,
      floorCapacity: result.floorCapacity,
      placedFloor: result.placedFloorPositions,
      layers: result.layers,
      loadLayers: result.loadLayers,
      unplaced: result.unplacedCount,
      table: rows[index].innerText,
      preview: document.getElementById("layoutNotes").innerText,
      canvasText
    };
  }, options);
}

async function configureMixed(page, quantity) {
  return page.evaluate(count => {
    document.getElementById("loadMode").value = "mixed";
    document.getElementById("mixedRows").replaceChildren();
    mixedRowCounter = 0;
    addMixedRow({
      presetId: "custom",
      length: 5800,
      width: 2300,
      height: 1000,
      quantity: count,
      customName: "Synthetic mixed",
      identifier: "MIX-ONE",
      allowRotate: false
    }, { calculate: false });
    syncModeUI({ calculate: false });
    if (!calculate()) throw new Error("mixed calculation failed");
    const index = lastResults.findIndex(result => result.container.id === "20dc");
    if (index < 0) throw new Error("20dc missing");
    document.getElementById("drawSelect").value = String(index);
    drawSelected();
    const rows = Array.from(document.querySelectorAll("#resultsBody tr"))
      .filter(row => !row.classList.contains("vehicle-group-row"));
    const result = lastResults[index];
    return {
      index,
      placed: result.placedCount,
      total: result.totalItems,
      table: rows[index].innerText,
      preview: document.getElementById("layoutNotes").innerText
    };
  }, quantity);
}

async function capturePrint(page) {
  return page.evaluate(() => {
    let html = "";
    window.open = () => ({
      document: {
        open() {},
        write(value) {
          html += String(value);
        },
        close() {}
      }
    });
    printCurrentLayout();
    const documentCopy = new DOMParser().parseFromString(html, "text/html");
    return {
      html,
      text: documentCopy.body.textContent,
      technical: html.includes("⟦"),
      undefinedText: /\bundefined\b/.test(html)
    };
  });
}

const browser = await launchBrowser(ROOT);
const records = [];
try {
  for (const language of LANGUAGES) {
    const app = await openApp(browser, language);
    try {
      const probes = await app.page.evaluate(counts => counts.map(count => ({
        count,
        pallet: window.loadComposerI18n.plural("common.pallet", count),
        floor: window.loadComposerI18n.plural(
          "table.floorPositions",
          count,
          { count: String(count) }
        ),
        layer: window.loadComposerI18n.plural(
          "print.layersCapacity",
          count,
          { count: String(count) }
        )
      })), [0, 1, 2, 5]);
      assert(
        JSON.stringify(probes.map(item => item.pallet)) ===
          JSON.stringify(EXPECTED[language].pallet),
        `${language}: pallet 0/1/2/5`
      );
      assert(
        JSON.stringify(probes.map(item => item.floor)) ===
          JSON.stringify(EXPECTED[language].floor),
        `${language}: floor positions 0/1/2/5`
      );
      assert(
        JSON.stringify(probes.map(item => item.layer)) ===
          JSON.stringify(EXPECTED[language].layer),
        `${language}: layers 0/1/2/5`
      );

      const zeroDom = await app.page.evaluate(() => {
        const probe = document.createElement("output");
        probe.id = "plural-zero-test-output";
        probe.textContent = window.loadComposerI18n.plural(
          "table.floorPositions",
          0,
          { count: "0" }
        );
        document.body.append(probe);
        return probe.textContent;
      });
      assert(zeroDom === EXPECTED[language].floor[0], `${language}: zero DOM`);

      const one = await configureSingle(app.page, {
        length: 5800,
        width: 2300,
        quantity: 1,
        layers: 1,
        vehicle: "20dc"
      });
      assert(one.capacity === 1, `${language}: capacity 1`);
      assert(one.requested === 1 && one.placed === 1, `${language}: requested/placed 1`);
      assert(one.floorCapacity === 1 && one.placedFloor === 1, `${language}: floor 1`);
      assert(one.layers === 1 && one.loadLayers === 1, `${language}: layer 1`);
      assert(clean(one.table).includes(EXPECTED[language].floor[1]), `${language}: table singular floor`);
      assert(clean(one.preview).includes(EXPECTED[language].floor[1]), `${language}: preview singular floor`);
      assert(!clean(one.table).includes("⟦") && !clean(one.preview).includes("⟦"), `${language}: technical marker`);
      const onePrint = await capturePrint(app.page);
      assert(!onePrint.technical && !onePrint.undefinedText, `${language}: print markers`);
      assert(
        clean(onePrint.text).includes(`1 ${EXPECTED[language].pallet[1]}`),
        `${language}: print singular pallet`
      );

      const missing = await configureSingle(app.page, {
        length: 5800,
        width: 2300,
        quantity: 2,
        layers: 1,
        vehicle: "20dc"
      });
      assert(missing.placed === 1 && missing.unplaced === 1, `${language}: one unplaced`);
      assert(
        clean(missing.preview).includes(clean(EXPECTED[language].missing[0])),
        `${language}: preview one unplaced`
      );
      assert(
        clean(missing.table).includes(clean(EXPECTED[language].missing[0].replace(/\.$/, ""))),
        `${language}: table one unplaced`
      );

      for (const quantity of [2, 5]) {
        const state = await configureSingle(app.page, {
          length: 1200,
          width: 800,
          quantity,
          layers: quantity === 5 ? 2 : 1,
          vehicle: "20dc"
        });
        const print = await capturePrint(app.page);
        assert(state.requested === quantity && state.placed === quantity, `${language}: ${quantity} placed`);
        assert(!print.technical && !print.undefinedText, `${language}: ${quantity} print`);
        assert(
          clean(print.text).includes(`${quantity} ${EXPECTED[language].pallet[quantity === 2 ? 2 : 3]}`),
          `${language}: ${quantity} plural pallet in print`
        );
        if (quantity === 5) {
          const stackLabel = await app.page.evaluate(() => {
            const result = lastResults[Number(document.getElementById("drawSelect").value)];
            const rect = result.layout.rects.find(item => item.stackCount > 1);
            return rect
              ? rectTextLines(result, rect, 0, true).at(-1)
              : "";
          });
          assert(stackLabel && !stackLabel.includes("⟦"), `${language}: canvas stack plural`);
        }
      }

      const mixedOne = await configureMixed(app.page, 1);
      assert(mixedOne.total === 1 && mixedOne.placed === 1, `${language}: mixed one`);
      const mixedPrint = await capturePrint(app.page);
      assert(
        clean(mixedPrint.text).includes(clean(EXPECTED[language].mixed[0])),
        `${language}: mixed singular operational note`
      );
      assert(!mixedPrint.technical && !mixedPrint.undefinedText, `${language}: mixed print`);

      const explicit = await app.page.evaluate(() => ({
        missingOne: window.loadComposerI18n.plural(
          "preview.singleMissing",
          1,
          { count: "1" }
        ),
        missingTwo: window.loadComposerI18n.plural(
          "preview.singleMissing",
          2,
          { count: "2" }
        ),
        mixedOne: window.loadComposerI18n.plural(
          "print.mixedOperationalNote",
          1,
          { count: "1" }
        ),
        mixedTwo: window.loadComposerI18n.plural(
          "print.mixedOperationalNote",
          2,
          { count: "2" }
        )
      }));
      assert(explicit.missingOne === EXPECTED[language].missing[0], `${language}: missing one`);
      assert(explicit.missingTwo === EXPECTED[language].missing[1], `${language}: missing two`);
      assert(explicit.mixedOne === EXPECTED[language].mixed[0], `${language}: mixed one agreement`);
      assert(explicit.mixedTwo === EXPECTED[language].mixed[1], `${language}: mixed two agreement`);
      assert(app.errors.length === 0, `${language}: ${app.errors.join(" | ")}`);
      records.push({ language, probes: probes.length, status: "PASS" });
      console.log(`PASS ${language}: DOM, preview, table, canvas and print quantities`);
    } finally {
      await app.context.close();
    }
  }
} finally {
  await browser.close();
}

fs.writeFileSync(
  path.join(ROOT, "quantity-rendering-results-v1.0.0-rc.2.json"),
  `${JSON.stringify({
    version: "1.0.0-rc.2",
    languages: LANGUAGES,
    quantities: [0, 1, 2, 5],
    records,
    status: "PASS"
  }, null, 2)}\n`
);
console.log(`Quantity rendering suite PASS: ${records.length}/${records.length} languages.`);
