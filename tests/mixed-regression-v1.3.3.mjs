import fs from "node:fs";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = path.resolve(import.meta.dirname, "..");
const APP = path.join(ROOT, "site/downloads/loadcomposer-v1.3.3-standalone.html");
const OUTPUT = path.join(ROOT, "mixed-regression-results-v1.3.3.json");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function canvasContextStub() {
  return new Proxy({}, {
    get(target, property) {
      if (!(property in target)) {
        target[property] = property === "measureText"
          ? text => ({ width: String(text).length * 7 })
          : () => {};
      }
      return target[property];
    }
  });
}

const errors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", error => errors.push(error));
const dom = new JSDOM(fs.readFileSync(APP, "utf8"), {
  runScripts: "dangerously",
  url: "https://loadcomposer.mixed.test/",
  virtualConsole,
  beforeParse(window) {
    window.localStorage.setItem("loadcomposer.language", "it");
    window.HTMLCanvasElement.prototype.getContext = () => canvasContextStub();
    window.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,";
  }
});
await dom.window.loadComposerI18n.ready;
await new Promise(resolve => dom.window.setTimeout(resolve, 0));
if (errors.length) throw errors[0];

const { window } = dom;
try {
  const container = window.eval('CONTAINERS.find(container => container.id === "20dc")');
  const common = [
    {
      name: "Euro A", identifier: "EU-A", color: "#2374ab",
      length: 1200, width: 800, height: 1200, quantity: 4,
      rotationMode: "auto", lockedOrientation: "normal"
    },
    {
      name: "Industrial B", identifier: "IND-B", color: "#d1495b",
      length: 1200, width: 1000, height: 1400, quantity: 4,
      rotationMode: "locked", lockedOrientation: "normal"
    }
  ];
  const completeItems = window.expandMixedItems(common);
  const complete = window.bestMixedLayout(container, completeItems, 0);
  assert(complete.count === 8 && complete.unplaced.length === 0, "carico mixed completo");
  assert(new Set(complete.rects.map(rect => rect.id)).size === 8, "ID unità non univoci");
  assert(new Set(complete.rects.map(rect => rect.typeIndex)).size === 2, "identità gruppo perse");
  assert(complete.rects.filter(rect => rect.typeIndex === 1).every(rect => !rect.rotated), "rotazione vietata nel gruppo B");
  assert(complete.rects.every(rect => rect.identifier === common[rect.typeIndex].identifier), "identificatore staccato dal gruppo");
  const palette = window.eval("TYPE_COLORS");
  assert(palette.length >= 2 && palette[0] !== palette[1], "palette mixed non distinguibile");
  assert(complete.rects.every(rect => palette[rect.typeIndex % palette.length]), "mappatura colore/gruppo invalida");

  const partialTypes = common.map(type => ({ ...type, quantity: 16 }));
  const partialItems = window.expandMixedItems(partialTypes);
  const partial = window.bestMixedLayout(container, partialItems, 0);
  assert(partial.count > 0 && partial.count < partialItems.length, "semantica partial mixed");
  assert(partial.unplaced.length === partialItems.length - partial.count, "conteggio esclusi mixed");
  const placedIds = new Set(partial.rects.map(rect => rect.id));
  assert(!placedIds.has(partial.unplaced[0].id), "first-excluded risulta anche piazzato");
  const partialRepeat = window.bestMixedLayout(container, partialItems, 0);
  assert(partialRepeat.unplaced[0].id === partial.unplaced[0].id, "first-excluded non deterministico");

  const impossibleType = [{
    name: "Oversize", identifier: "NO-FIT", color: "#333333",
    length: 6000, width: 2400, height: 1000, quantity: 2,
    rotationMode: "locked", lockedOrientation: "normal"
  }];
  const impossibleItems = window.expandMixedItems(impossibleType);
  const zero = window.bestMixedLayout(container, impossibleItems, 0);
  assert(zero.count === 0 && zero.unplaced.length === 2, "semantica zero-load mixed");
  assert(zero.unplaced[0].id === impossibleItems[0].id, "first-excluded zero-load");

  const stackable = [{
    name: "Stack", identifier: "STACK", color: "#518f4d",
    length: 1200, width: 800, height: 700, quantity: 6,
    rotationMode: "auto", lockedOrientation: "normal",
    stackable: true, maxLayers: 3, verticalGap: 20
  }];
  const stackItems = window.expandMixedItems(stackable);
  assert(stackItems.length === 6, "espansione stackable mixed");
  assert(stackItems.every(item => item.identifier === "STACK"), "identità stackable mixed");

  const report = {
    version: "1.3.3",
    status: "PASS",
    complete: {
      requested: completeItems.length,
      placed: complete.count,
      groups: new Set(complete.rects.map(rect => rect.typeIndex)).size,
      colorsPreserved: true,
      identifiersPreserved: true,
      prohibitedRotations: 0
    },
    partial: {
      requested: partialItems.length,
      placed: partial.count,
      unplaced: partial.unplaced.length,
      firstExcludedId: partial.unplaced[0].id
    },
    zeroLoad: { requested: impossibleItems.length, placed: zero.count, firstExcludedId: zero.unplaced[0].id },
    stackingIdentity: { items: stackItems.length, preserved: true }
  };
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Mixed regression PASS: complete ${complete.count}/${completeItems.length}, partial ${partial.count}/${partialItems.length}, zero ${zero.count}/${impossibleItems.length}.`);
} finally {
  dom.window.close();
}
