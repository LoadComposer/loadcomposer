import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(TEST_DIR, "..");
const BASELINE_PATH = path.resolve(
  PROJECT_DIR,
  process.env.LOADCOMPOSER_BASELINE ||
    "site/downloads/loadcomposer-v1.4.0-standalone.html"
);
const CURRENT_PATH = path.resolve(
  PROJECT_DIR,
  process.env.LOADCOMPOSER_HTML || "site/downloads/loadcomposer-v1.5.0-standalone.html"
);
const EXPECTED_BASELINE_SHA256 =
  process.env.LOADCOMPOSER_BASELINE_SHA256 ||
  "fd0ccd86e2fed4e5cb9b37851870dfccdef82c811eec1a490c02160302d76647";
const BASELINE_LABEL = process.env.LOADCOMPOSER_BASELINE_LABEL || "v1.4.0";
const REQUIRE_COUNT_IDENTITY = process.env.LOADCOMPOSER_REQUIRE_COUNT_IDENTITY !== "0";
const REPORT_PATH = path.resolve(
  PROJECT_DIR,
  process.env.LOADCOMPOSER_BASELINE_JSON || "geometry-parity-results-v1.5.0.json"
);
const EPSILON = 0.0001;

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
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

async function loadApp(filePath) {
  const html = fs.readFileSync(filePath, "utf8");
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", error => errors.push(error));
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    url: "https://loadcomposer.test/",
    virtualConsole,
    beforeParse(window) {
      window.localStorage.setItem("loadcomposer.language", "it");
      window.alert = () => {};
      window.open = () => null;
      window.HTMLCanvasElement.prototype.getContext = () => canvasContextStub();
      window.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,";
    }
  });
  await dom.window.loadComposerI18n.ready;
  await new Promise(resolve => dom.window.setTimeout(resolve, 0));
  if (errors.length) throw errors[0];
  return dom;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: atteso ${expected}, ottenuto ${actual}`);
  }
}

function rectCoordinates(rects) {
  return rects.map(rect => ({
    id: rect.id ?? null,
    typeIndex: rect.typeIndex ?? null,
    unitNo: rect.unitNo ?? null,
    x: rect.x,
    y: rect.y,
    length: rect.length,
    width: rect.width,
    rotated: rect.rotated
  }));
}

function comparableSingleLayout(layout) {
  return {
    mode: layout.mode,
    type: layout.type,
    count: layout.count,
    materializedCount: layout.materializedCount,
    truncated: layout.truncated,
    orientationCounts: layout.orientationCounts,
    usedLength: layout.usedLength,
    usedWidth: layout.usedWidth,
    stackCounts: layout.stackCounts ?? null,
    loadedPalletCount: layout.loadedPalletCount ?? null,
    rects: layout.rects.map(rect => ({
      x: rect.x,
      y: rect.y,
      length: rect.length,
      width: rect.width,
      rotated: rect.rotated,
      layoutIndex: rect.layoutIndex,
      stackCount: rect.stackCount ?? null
    }))
  };
}

function comparableMixedLayout(layout) {
  return {
    mode: layout.mode,
    type: layout.type,
    count: layout.count,
    materializedCount: layout.materializedCount,
    truncated: layout.truncated,
    orderingName: layout.orderingName,
    usedLength: layout.usedLength,
    usedWidth: layout.usedWidth,
    rects: rectCoordinates(layout.rects),
    unplaced: layout.unplaced.map(item => ({
      id: item.id,
      typeIndex: item.typeIndex,
      unitNo: item.unitNo,
      identifier: item.identifier
    }))
  };
}

function frontOnlyRectChange(before, after) {
  if (before.length !== after.length) return false;
  return before.every((rect, index) => {
    const next = after[index];
    const beforeWithoutX = { ...rect };
    const afterWithoutX = { ...next };
    delete beforeWithoutX.x;
    delete afterWithoutX.x;
    return (
      JSON.stringify(beforeWithoutX) === JSON.stringify(afterWithoutX) &&
      next.x <= rect.x + EPSILON
    );
  });
}

function expectedSingleFrontCompaction(before, after) {
  const beforeComparable = comparableSingleLayout(before);
  const afterComparable = comparableSingleLayout(after);
  const beforeRects = beforeComparable.rects;
  const afterRects = afterComparable.rects;
  delete beforeComparable.rects;
  delete afterComparable.rects;
  delete beforeComparable.usedLength;
  delete afterComparable.usedLength;
  delete beforeComparable.usedWidth;
  delete afterComparable.usedWidth;
  return (
    JSON.stringify(beforeComparable) === JSON.stringify(afterComparable) &&
    frontOnlyRectChange(beforeRects, afterRects) &&
    after.usedLength <= before.usedLength + EPSILON &&
    Math.abs(after.usedWidth - before.usedWidth) <= EPSILON
  );
}

function expectedMixedFrontCompaction(before, after) {
  const beforeComparable = comparableMixedLayout(before);
  const afterComparable = comparableMixedLayout(after);
  const beforeRects = beforeComparable.rects;
  const afterRects = afterComparable.rects;
  delete beforeComparable.rects;
  delete afterComparable.rects;
  delete beforeComparable.usedLength;
  delete afterComparable.usedLength;
  delete beforeComparable.usedWidth;
  delete afterComparable.usedWidth;
  return (
    JSON.stringify(beforeComparable) === JSON.stringify(afterComparable) &&
    frontOnlyRectChange(beforeRects, afterRects) &&
    after.usedLength <= before.usedLength + EPSILON &&
    Math.abs(after.usedWidth - before.usedWidth) <= EPSILON
  );
}

function classifyChange(before, after, afterChecks, isExpectedFrontCompaction) {
  if (!allChecksPass(afterChecks) || after.count < before.count) {
    return "UNEXPECTED REGRESSION";
  }
  if (after.count > before.count) {
    return REQUIRE_COUNT_IDENTITY
      ? "UNEXPECTED REGRESSION"
      : "EXPECTED GEOMETRY/CAPACITY IMPROVEMENT";
  }
  return isExpectedFrontCompaction(before, after)
    ? "EXPECTED FRONT-COMPACTION"
    : "UNEXPECTED REGRESSION";
}

function pairSeparated(a, b, gap) {
  return (
    a.x + a.length + gap <= b.x + EPSILON ||
    b.x + b.length + gap <= a.x + EPSILON ||
    a.y + a.width + gap <= b.y + EPSILON ||
    b.y + b.width + gap <= a.y + EPSILON
  );
}

function layoutChecks(container, types, layout, gap) {
  const totalItems = types.reduce((sum, type) => sum + type.quantity, 0);
  const refs = [...layout.rects, ...layout.unplaced].map(item => item.id);
  const uniqueRefs = new Set(refs);
  const bounds = layout.rects.every(rect => (
    [rect.x, rect.y, rect.length, rect.width].every(Number.isFinite) &&
    rect.x >= -EPSILON &&
    rect.y >= -EPSILON &&
    rect.x + rect.length <= container.innerLength + EPSILON &&
    rect.y + rect.width <= container.innerWidth + EPSILON
  ));
  let gapOk = true;
  let overlapFree = true;

  for (let i = 0; i < layout.rects.length; i += 1) {
    for (let j = i + 1; j < layout.rects.length; j += 1) {
      const separatedAtZero = pairSeparated(layout.rects[i], layout.rects[j], 0);
      const separatedAtGap = pairSeparated(layout.rects[i], layout.rects[j], gap);
      if (!separatedAtZero) overlapFree = false;
      if (!separatedAtGap) gapOk = false;
    }
  }

  const expectedUsedLength = layout.rects.length
    ? Math.max(...layout.rects.map(rect => rect.x + rect.length))
    : 0;
  const expectedUsedWidth = layout.rects.length
    ? Math.max(...layout.rects.map(rect => rect.y + rect.width))
    : 0;
  const doorWidth = container.accessKnown === false
    ? container.innerWidth
    : container.doorWidth;
  const doorHeight = container.accessKnown === false
    ? container.innerHeight
    : container.doorHeight;
  const door = layout.rects.every(rect => rect.width <= doorWidth + EPSILON);
  const height = layout.rects.every(rect => (
    types[rect.typeIndex].height <= doorHeight + EPSILON &&
    types[rect.typeIndex].height <= container.innerHeight + EPSILON
  ));
  const counts = (
    Number.isSafeInteger(layout.count) &&
    layout.count === layout.rects.length &&
    layout.materializedCount === layout.rects.length &&
    layout.truncated === false &&
    layout.count + layout.unplaced.length === totalItems &&
    refs.length === totalItems &&
    uniqueRefs.size === totalItems
  );
  const usedSpansReal = (
    Math.abs(layout.usedLength - expectedUsedLength) <= EPSILON &&
    Math.abs(layout.usedWidth - expectedUsedWidth) <= EPSILON
  );

  return {
    bounds,
    gap: gapOk,
    overlap: overlapFree,
    door,
    height,
    counts,
    usedSpansReal
  };
}

function singleLayoutChecks(
  container,
  pallet,
  layout,
  gap,
  rotationMode,
  lockedOrientation
) {
  const bounds = layout.rects.every(rect => (
    [rect.x, rect.y, rect.length, rect.width].every(Number.isInteger) &&
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.x + rect.length <= container.innerLength &&
    rect.y + rect.width <= container.innerWidth
  ));
  let gapOk = true;
  let overlapFree = true;

  for (let i = 0; i < layout.rects.length; i += 1) {
    for (let j = i + 1; j < layout.rects.length; j += 1) {
      if (!pairSeparated(layout.rects[i], layout.rects[j], 0)) overlapFree = false;
      if (!pairSeparated(layout.rects[i], layout.rects[j], gap)) gapOk = false;
    }
  }

  const dimensions = layout.rects.every(rect => {
    const expectedLength = rect.rotated ? pallet.width : pallet.length;
    const expectedWidth = rect.rotated ? pallet.length : pallet.width;
    return rect.length === expectedLength && rect.width === expectedWidth;
  });
  const rotation = layout.rects.every(rect => {
    if (pallet.length === pallet.width) return true;
    if (rotationMode === "auto") return true;
    return rect.rotated === (lockedOrientation === "rotated");
  });
  const expectedCounts = layout.rects.reduce((counts, rect) => {
    counts[rect.rotated ? "rotated" : "normal"] += 1;
    return counts;
  }, { normal: 0, rotated: 0 });
  const counts = (
    Number.isSafeInteger(layout.count) &&
    layout.count === layout.rects.length &&
    layout.materializedCount === layout.rects.length &&
    layout.truncated === false &&
    layout.orientationCounts.normal === expectedCounts.normal &&
    layout.orientationCounts.rotated === expectedCounts.rotated
  );
  const expectedUsedLength = layout.rects.length
    ? Math.max(...layout.rects.map(rect => rect.x + rect.length))
    : 0;
  const expectedUsedWidth = layout.rects.length
    ? Math.max(...layout.rects.map(rect => rect.y + rect.width))
    : 0;
  const usedSpansReal = (
    layout.usedLength === expectedUsedLength &&
    layout.usedWidth === expectedUsedWidth
  );

  return {
    bounds,
    gap: gapOk,
    overlap: overlapFree,
    dimensions,
    rotation,
    counts,
    usedSpansReal
  };
}

function allChecksPass(checks) {
  return Object.values(checks).every(Boolean);
}

function assertChecks(checks, label) {
  for (const key of ["bounds", "gap", "overlap", "counts", "usedSpansReal"]) {
    assert(checks[key], `${label}: controllo ${key} fallito`);
  }
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

function heterogeneousFixtureTypes(container, gap, fixtureName) {
  if (fixtureName === "operational-10-plus-1") {
    return [
      {
        name: "Euro pallet",
        identifier: "EUR",
        length: 1200,
        width: 800,
        height: 1000,
        quantity: 10,
        rotationMode: "auto",
        lockedOrientation: "normal"
      },
      {
        name: "Pallet industriale",
        identifier: "IND",
        length: 1200,
        width: 1000,
        height: 1000,
        quantity: 1,
        rotationMode: "auto",
        lockedOrientation: "normal"
      }
    ];
  }

  if (fixtureName === "exact-length") {
    const firstLength = Math.min(3000, container.innerLength - gap - 2);
    return [
      {
        name: "Fronte",
        identifier: "F",
        length: firstLength,
        width: Math.min(1000, container.innerWidth),
        height: 1000,
        quantity: 1,
        rotationMode: "locked",
        lockedOrientation: "normal"
      },
      {
        name: "Porte",
        identifier: "P",
        length: container.innerLength - firstLength - gap,
        width: Math.min(1000, container.innerWidth),
        height: 1000,
        quantity: 1,
        rotationMode: "locked",
        lockedOrientation: "normal"
      }
    ];
  }

  if (fixtureName === "exact-width") {
    const firstWidth = Math.min(1200, container.innerWidth - gap - 2);
    return [
      {
        name: "Parete sinistra",
        identifier: "S",
        length: Math.min(1000, container.innerLength),
        width: firstWidth,
        height: 1000,
        quantity: 1,
        rotationMode: "locked",
        lockedOrientation: "normal"
      },
      {
        name: "Parete destra",
        identifier: "D",
        length: Math.min(1000, container.innerLength),
        width: container.innerWidth - firstWidth - gap,
        height: 1000,
        quantity: 1,
        rotationMode: "locked",
        lockedOrientation: "normal"
      }
    ];
  }

  return [
    {
      name: "Lungo",
      identifier: "L",
      length: 1400,
      width: 900,
      height: 1000,
      quantity: 3,
      rotationMode: "auto",
      lockedOrientation: "normal"
    },
    {
      name: "Compatto",
      identifier: "C",
      length: 1100,
      width: 700,
      height: 1000,
      quantity: 4,
      rotationMode: "auto",
      lockedOrientation: "normal"
    },
    {
      name: "Quadrato",
      identifier: "Q",
      length: 950,
      width: 950,
      height: 1000,
      quantity: 2,
      rotationMode: "locked",
      lockedOrientation: "normal"
    }
  ];
}

function currentResult(app, containerId) {
  return app.window.eval(
    `lastResults.find(result => result.container.id === ${JSON.stringify(containerId)})`
  );
}

function setSingleCustom(app, values) {
  const group = app.window.document.getElementById("singlePalletGroup");
  app.window.document.getElementById("loadMode").value = "single";
  app.window.document.getElementById("stackable").checked = false;
  app.window.selectPresetForGroup(group, "custom", false);
  Object.entries(values).forEach(([field, value]) => {
    const input = field === "gap"
      ? app.window.document.getElementById("gap")
      : group.querySelector(`[data-field="${field}"]`);
    input.value = String(value);
  });
  app.window.calculate();
}

function b10Signature(result) {
  return {
    container: result.container.id,
    capacity: comparableSingleLayout(result.capacityLayout),
    load: comparableSingleLayout(result.loadLayout),
    layers: result.layers,
    loadLayers: result.loadLayers,
    floorCapacity: result.floorCapacity,
    totalCapacity: result.totalCapacity,
    requestedFloorPositions: result.requestedFloorPositions,
    placedFloorPositions: result.placedFloorPositions,
    placedCount: result.placedCount,
    unplacedCount: result.unplacedCount,
    fitsQtyBySpace: result.fitsQtyBySpace,
    okDoor: result.okDoor,
    okHeight: result.okHeight,
    ok: result.ok
  };
}

const actualBaselineSha256 = sha256(BASELINE_PATH);
if (actualBaselineSha256 !== EXPECTED_BASELINE_SHA256) {
  throw new Error(
    `Baseline ${BASELINE_LABEL} inattesa: atteso ${EXPECTED_BASELINE_SHA256}, ottenuto ${actualBaselineSha256}`
  );
}

const baseline = await loadApp(BASELINE_PATH);
const current = await loadApp(CURRENT_PATH);

try {
  const containers = plain(baseline.window.eval("CONTAINERS"));
  const presets = plain(baseline.window.eval("PALLET_PRESETS"));
  const gaps = [0, 1, 10];
  const rotations = [
    ["auto", "normal"],
    ["locked", "normal"],
    ["locked", "rotated"]
  ];
  let singleCapacityCases = 0;
  let singleLoadCases = 0;
  const singleCapacityChanges = [];
  const singleLoadChanges = [];
  const singleRegressions = [];

  for (const container of containers) {
    for (const pallet of presets) {
      for (const gap of gaps) {
        for (const [rotationMode, lockedOrientation] of rotations) {
          const beforeCapacity = baseline.window.bestLayout(
            container,
            pallet,
            gap,
            rotationMode,
            lockedOrientation
          );
          const afterCapacity = current.window.bestLayout(
            container,
            pallet,
            gap,
            rotationMode,
            lockedOrientation
          );
          singleCapacityCases += 1;

          const beforeCapacityChecks = singleLayoutChecks(
            container,
            pallet,
            beforeCapacity,
            gap,
            rotationMode,
            lockedOrientation
          );
          const afterCapacityChecks = singleLayoutChecks(
            container,
            pallet,
            afterCapacity,
            gap,
            rotationMode,
            lockedOrientation
          );
          assert(allChecksPass(beforeCapacityChecks), `baseline capacity non valida ${container.id}/${pallet.id}`);
          const capacityChanged = (
            JSON.stringify(comparableSingleLayout(beforeCapacity)) !==
            JSON.stringify(comparableSingleLayout(afterCapacity))
          );

          if (capacityChanged) {
            const classification = classifyChange(
              beforeCapacity,
              afterCapacity,
              afterCapacityChecks,
              expectedSingleFrontCompaction
            );
            const change = {
              scope: "capacityLayout",
              container: container.id,
              pallet: pallet.id,
              gap,
              rotationMode,
              lockedOrientation,
              classification,
              oldCount: beforeCapacity.count,
              newCount: afterCapacity.count,
              oldUsedLength: beforeCapacity.usedLength,
              newUsedLength: afterCapacity.usedLength,
              oldUsedWidth: beforeCapacity.usedWidth,
              newUsedWidth: afterCapacity.usedWidth,
              oldCoordinates: rectCoordinates(beforeCapacity.rects),
              newCoordinates: rectCoordinates(afterCapacity.rects),
              confirmations: {
                old: beforeCapacityChecks,
                new: afterCapacityChecks
              }
            };
            singleCapacityChanges.push(change);
            if (classification === "UNEXPECTED REGRESSION") {
              singleRegressions.push(change);
            }
          }

          const targets = Array.from(new Set([
            1,
            Math.min(10, afterCapacity.count),
            afterCapacity.count,
            afterCapacity.count + 1
          ].filter(value => value >= 0)));

          for (const quantity of targets) {
            const beforeLoad = baseline.window.bestLoadLayout(
              container,
              pallet,
              gap,
              rotationMode,
              lockedOrientation,
              quantity
            );
            const afterLoad = current.window.bestLoadLayout(
              container,
              pallet,
              gap,
              rotationMode,
              lockedOrientation,
              quantity
            );
            singleLoadCases += 1;
            const beforeLoadChecks = singleLayoutChecks(
              container,
              pallet,
              beforeLoad,
              gap,
              rotationMode,
              lockedOrientation
            );
            const afterLoadChecks = singleLayoutChecks(
              container,
              pallet,
              afterLoad,
              gap,
              rotationMode,
              lockedOrientation
            );
            assert(allChecksPass(beforeLoadChecks), `baseline load non valido ${container.id}/${pallet.id}/q${quantity}`);
            const loadChanged = (
              JSON.stringify(comparableSingleLayout(beforeLoad)) !==
              JSON.stringify(comparableSingleLayout(afterLoad))
            );
            if (loadChanged) {
              const classification = classifyChange(
                beforeLoad,
                afterLoad,
                afterLoadChecks,
                expectedSingleFrontCompaction
              );
              const change = {
                scope: "loadLayout",
                container: container.id,
                pallet: pallet.id,
                gap,
                rotationMode,
                lockedOrientation,
                quantity,
                classification,
                oldCount: beforeLoad.count,
                newCount: afterLoad.count,
                oldUsedLength: beforeLoad.usedLength,
                newUsedLength: afterLoad.usedLength,
                oldUsedWidth: beforeLoad.usedWidth,
                newUsedWidth: afterLoad.usedWidth,
                oldCoordinates: rectCoordinates(beforeLoad.rects),
                newCoordinates: rectCoordinates(afterLoad.rects),
                confirmations: {
                  old: beforeLoadChecks,
                  new: afterLoadChecks
                }
              };
              singleLoadChanges.push(change);
              if (classification === "UNEXPECTED REGRESSION") {
                singleRegressions.push(change);
              }
            }
          }
        }
      }
    }
  }

  assertEqual(singleCapacityCases, 1080, "numero confronti capacityLayout");
  assertEqual(singleLoadCases, 4110, "numero confronti loadLayout");
  assertEqual(singleRegressions.length, 0, "regressioni single inattese");

  const b10Scenarios = [];
  for (const quantity of [1, 10, 11, 12]) {
    baseline.window.document.getElementById("quantity").value = String(quantity);
    current.window.document.getElementById("quantity").value = String(quantity);
    baseline.window.document.getElementById("stackable").checked = false;
    current.window.document.getElementById("stackable").checked = false;
    baseline.window.calculate();
    current.window.calculate();
    const before = b10Signature(currentResult(baseline, "20dc"));
    const after = b10Signature(currentResult(current, "20dc"));
    assertEqual(JSON.stringify(after), JSON.stringify(before), `regressione B-10 quantità ${quantity}`);
    b10Scenarios.push({ id: `20dc-eur-${quantity}`, status: "PASS" });
  }

  for (const app of [baseline, current]) {
    app.window.document.getElementById("quantity").value = "11";
    app.window.document.getElementById("palletHeight").value = "1000";
    app.window.document.getElementById("stackable").checked = true;
    app.window.document.getElementById("maxLayers").value = "2";
    if (app.window.document.getElementById("verticalGap")) app.window.document.getElementById("verticalGap").value = "0";
    app.window.calculate();
  }
  {
    const before = b10Signature(currentResult(baseline, "20dc"));
    const after = b10Signature(currentResult(current, "20dc"));
    assertEqual(JSON.stringify(after), JSON.stringify(before), "B-10 sovrapposizione: parità completa v1.4.0");
    assertEqual(JSON.stringify(after.capacity), JSON.stringify(before.capacity), "B-10 sovrapposizione: solver 2D");
    for (const key of ["floorCapacity", "totalCapacity", "placedCount", "unplacedCount", "fitsQtyBySpace", "okDoor", "okHeight", "ok"]) {
      assertEqual(after[key], before[key], `B-10 sovrapposizione: ${key}`);
    }
    assertEqual(after.requestedFloorPositions, 11, "B-10 sovrapposizione: posizioni floor-first richieste");
    assertEqual(after.placedFloorPositions, 11, "B-10 sovrapposizione: posizioni floor-first usate");
    assertEqual(after.loadLayers, 1, "B-10 sovrapposizione: strati effettivamente usati");
    assert(after.load.stackCounts.every(count => count === 1), "B-10 sovrapposizione: conteggi level-major");
  }
  b10Scenarios.push({ id: "20dc-eur-stacked-11", status: "PASS", classification: "PROTECTED SINGLE STACKING" });

  for (const quantity of [1, 11]) {
    setSingleCustom(baseline, {
      length: 2345,
      width: 800,
      height: 1000,
      quantity,
      gap: 0
    });
    setSingleCustom(current, {
      length: 2345,
      width: 800,
      height: 1000,
      quantity,
      gap: 0
    });
    assertEqual(
      JSON.stringify(b10Signature(currentResult(current, "40dc"))),
      JSON.stringify(b10Signature(currentResult(baseline, "40dc"))),
      `regressione B-10 porta quantità ${quantity}`
    );
    b10Scenarios.push({ id: `40dc-door-2345x800-${quantity}`, status: "PASS" });
  }
  assertEqual(b10Scenarios.length, 7, "numero scenari B-10");

  const mixedChanges = [];
  const mixedRegressions = [];
  let homogeneousMixedCases = 0;
  let heterogeneousMixedCases = 0;
  let unchangedMixedCases = 0;

  function compareMixedFixture(fixture) {
    const baselineItems = baseline.window.expandMixedItems(fixture.types);
    const currentItems = current.window.expandMixedItems(fixture.types);
    const before = plain(
      baseline.window.bestMixedLayout(fixture.container, baselineItems, fixture.gap)
    );
    const after = plain(
      current.window.bestMixedLayout(fixture.container, currentItems, fixture.gap)
    );
    const beforeComparable = comparableMixedLayout(before);
    const afterComparable = comparableMixedLayout(after);
    const beforeChecks = layoutChecks(
      fixture.container,
      fixture.types,
      before,
      fixture.gap
    );
    const afterChecks = layoutChecks(
      fixture.container,
      fixture.types,
      after,
      fixture.gap
    );
    assertChecks(beforeChecks, `${fixture.id} v1.3.1`);
    assertChecks(afterChecks, `${fixture.id} v1.5.0`);

    const changed = JSON.stringify(beforeComparable) !== JSON.stringify(afterComparable);
    if (!changed) {
      unchangedMixedCases += 1;
      return;
    }

    const classification = classifyChange(
      before,
      after,
      afterChecks,
      expectedMixedFrontCompaction
    );
    const change = {
      scope: "mixedLayout",
      fixture: fixture.id,
      container: fixture.container.id,
      pallet: fixture.palletId ?? null,
      groupMode: fixture.groupMode ?? "eterogeneo",
      gap: fixture.gap,
      rotationMode: fixture.rotationMode ?? null,
      lockedOrientation: fixture.lockedOrientation ?? null,
      quantity: fixture.quantity ?? fixture.types.reduce((sum, type) => sum + type.quantity, 0),
      classification,
      oldCount: before.count,
      newCount: after.count,
      oldCoordinates: rectCoordinates(before.rects),
      newCoordinates: rectCoordinates(after.rects),
      oldUnplaced: before.unplaced.map(item => item.id),
      newUnplaced: after.unplaced.map(item => item.id),
      oldUsedLength: before.usedLength,
      newUsedLength: after.usedLength,
      oldUsedWidth: before.usedWidth,
      newUsedWidth: after.usedWidth,
      confirmations: {
        old: beforeChecks,
        new: afterChecks
      }
    };
    mixedChanges.push(change);
    if (classification === "UNEXPECTED REGRESSION") mixedRegressions.push(change);
  }

  for (const container of containers) {
    for (const pallet of presets) {
      for (const gap of gaps) {
        for (const [rotationMode, lockedOrientation] of rotations) {
          const capacity = current.window.bestLayout(
            container,
            pallet,
            gap,
            rotationMode,
            lockedOrientation
          ).count;
          const quantity = Math.min(8, capacity);
          assert(quantity > 0, `fixture omogenea vuota ${container.id}/${pallet.id}`);

          for (const multipleGroups of [false, true]) {
            const types = homogeneousTypes(
              pallet,
              quantity,
              rotationMode,
              lockedOrientation,
              multipleGroups
            );
            const fixture = {
              id:
                `${container.id}|${pallet.id}|gap=${gap}|rotation=${rotationMode}|` +
                `locked=${lockedOrientation}|q=${quantity}|groups=${multipleGroups ? "multi" : "single"}`,
              container,
              types,
              gap,
              homogeneous: true,
              palletId: pallet.id,
              groupMode: multipleGroups ? "più gruppi omogenei" : "un gruppo omogeneo",
              rotationMode,
              lockedOrientation,
              quantity
            };
            compareMixedFixture(fixture);
            homogeneousMixedCases += 1;
          }
        }
      }
    }
  }
  assertEqual(homogeneousMixedCases, 2160, "numero fixture mixed omogenee");

  const heterogeneousNames = [
    "operational-10-plus-1",
    "exact-length",
    "exact-width",
    "varied-three-types"
  ];
  for (const container of containers) {
    for (const gap of [0, 1, 5, 10]) {
      for (const fixtureName of heterogeneousNames) {
        const types = heterogeneousFixtureTypes(container, gap, fixtureName);
        compareMixedFixture({
          id: `${container.id}|${fixtureName}|gap=${gap}`,
          container,
          types,
          gap,
          homogeneous: false,
          groupMode: "eterogeneo"
        });
        heterogeneousMixedCases += 1;
      }
    }
  }
  assertEqual(heterogeneousMixedCases, 192, "numero fixture mixed eterogenee");

  const mixedCases = homogeneousMixedCases + heterogeneousMixedCases;
  assertEqual(
    mixedChanges.length + unchangedMixedCases,
    mixedCases,
    "classificazione incompleta dei confronti mixed"
  );
  assertEqual(mixedRegressions.length, 0, "regressioni mixed inattese");

  const allChanges = [
    ...singleCapacityChanges,
    ...singleLoadChanges,
    ...mixedChanges
  ];
  const expectedImprovements = allChanges.filter(change => (
    change.classification === "EXPECTED GEOMETRY/CAPACITY IMPROVEMENT"
  ));
  const frontCompactedLayouts = allChanges.filter(change => (
    change.classification === "EXPECTED FRONT-COMPACTION"
  ));
  const unexpectedRegressions = allChanges.filter(change => (
    change.classification === "UNEXPECTED REGRESSION"
  ));
  const totalCases = singleCapacityCases + singleLoadCases + mixedCases;
  const unchangedCases = totalCases - allChanges.length;
  const maximumUsedLengthReduction = frontCompactedLayouts.reduce(
    (maximum, change) => Math.max(
      maximum,
      Math.max(0, change.oldUsedLength - change.newUsedLength)
    ),
    0
  );

  assertEqual(totalCases, 7542, "numero totale scenari delta");
  assertEqual(unexpectedRegressions.length, 0, "regressioni geometriche inattese");
  if (REQUIRE_COUNT_IDENTITY) {
    assertEqual(expectedImprovements.length, 0, "delta capacità/conteggio rispetto alla candidata ammessa");
  }

  const report = {
    version: "1.5.0",
    baseline: {
      label: BASELINE_LABEL,
      file: path.basename(BASELINE_PATH),
      sha256: actualBaselineSha256
    },
    current: {
      file: path.basename(CURRENT_PATH),
      sha256: sha256(CURRENT_PATH)
    },
    single: {
      capacityLayout: {
        cases: singleCapacityCases,
        changes: singleCapacityChanges.length,
        changeDetails: singleCapacityChanges,
        status: "PASS"
      },
      loadLayout: {
        cases: singleLoadCases,
        changes: singleLoadChanges.length,
        changeDetails: singleLoadChanges,
        status: "PASS"
      },
      b10Scenarios,
      b10Status: "PASS"
    },
    mixed: {
      cases: mixedCases,
      homogeneousCases: homogeneousMixedCases,
      heterogeneousCases: heterogeneousMixedCases,
      unchangedCases: unchangedMixedCases,
      changes: mixedChanges.length,
      rules: [
        "Il conteggio piazzato deve essere identico alla baseline v1.3.6.",
        "Bounds, gap, overlap, conteggi, identità, rotazioni e used spans reali devono essere confermati."
      ],
      changeDetails: mixedChanges,
      status: "PASS"
    },
    summary: {
      totalCases,
      unchangedCases,
      expectedImprovements: expectedImprovements.length,
      frontCompactedLayouts: frontCompactedLayouts.length,
      maximumUsedLengthReduction,
      unexpectedRegressions: unexpectedRegressions.length
    },
    changedCases: allChanges,
    status: "PASS"
  };

  console.log(
    `Confronto baseline/candidata: single capacity ${singleCapacityCases} casi, ` +
    `${singleCapacityChanges.length} modificati; single load ${singleLoadCases} casi, ` +
    `${singleLoadChanges.length} modificati; B-10 ${b10Scenarios.length}/7 PASS.`
  );
  console.log(
    `Mixed ${mixedCases} casi: ${mixedChanges.length} modificati, ` +
    `${unchangedMixedCases} invariati.`
  );
  console.log(
    `PASS: ${totalCases} casi, ${expectedImprovements.length} miglioramenti attesi, ` +
    `${frontCompactedLayouts.length} front-compaction attese, ` +
    `${unchangedCases} invariati, riduzione massima usedLength ${maximumUsedLengthReduction} mm, ` +
    `0 regressioni inattese.`
  );

  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
} finally {
  baseline.window.close();
  current.window.close();
}
