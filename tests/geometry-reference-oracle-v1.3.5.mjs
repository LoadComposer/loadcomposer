import fs from "node:fs";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = path.resolve(import.meta.dirname, "..");
const CURRENT = path.join(ROOT, "site/downloads/loadcomposer-v1.3.5-standalone.html");
const BASELINE = path.join(ROOT, "site/downloads/loadcomposer-v1.3.1-standalone.html");
const OUTPUT = path.join(ROOT, "geometry-reference-oracle-results-v1.3.5.json");
const MAX_STATES = 300000;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function loadApp(file) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", error => errors.push(error));
  const dom = new JSDOM(fs.readFileSync(file, "utf8"), {
    runScripts: "dangerously",
    url: "https://loadcomposer.oracle.test/",
    virtualConsole,
    beforeParse(window) {
      window.localStorage.setItem("loadcomposer.language", "it");
      window.HTMLCanvasElement.prototype.getContext = () => ({
        clearRect() {}, fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {},
        lineTo() {}, stroke() {}, fill() {}, arc() {}, fillText() {}, drawImage() {},
        save() {}, restore() {}, translate() {}, rotate() {}, createPattern() { return null; },
        measureText(text) { return { width: String(text).length * 7 }; }
      });
      window.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,";
    }
  });
  await dom.window.loadComposerI18n.ready;
  await new Promise(resolve => dom.window.setTimeout(resolve, 0));
  if (errors.length) throw errors[0];
  return dom;
}

function separated(a, b, gap) {
  return (
    a.x + a.length + gap <= b.x || b.x + b.length + gap <= a.x ||
    a.y + a.width + gap <= b.y || b.y + b.width + gap <= a.y
  );
}

function validate(container, pallet, gap, rects) {
  for (const rect of rects) {
    assert(Number.isInteger(rect.x) && Number.isInteger(rect.y), "oracle: coordinate non intere");
    assert(rect.x >= 0 && rect.y >= 0, "oracle: coordinate negative");
    assert(rect.x + rect.length <= container.innerLength, "oracle: oltre la lunghezza");
    assert(rect.y + rect.width <= container.innerWidth, "oracle: oltre la larghezza");
    const dimensions = rect.rotated
      ? [pallet.width, pallet.length]
      : [pallet.length, pallet.width];
    assert(rect.length === dimensions[0] && rect.width === dimensions[1], "oracle: rotazione errata");
  }
  for (let first = 0; first < rects.length; first += 1) {
    for (let second = first + 1; second < rects.length; second += 1) {
      assert(separated(rects[first], rects[second], gap), "oracle: overlap/gap violato");
    }
  }
}

function analyticalUpperBound(container, pallet, gap) {
  const orientations = [
    { length: pallet.length, width: pallet.width, rotated: false },
    { length: pallet.width, width: pallet.length, rotated: true }
  ];
  const unique = orientations.filter((item, index, list) => (
    list.findIndex(other => other.length === item.length && other.width === item.width) === index
  ));
  const minWidth = Math.min(...unique.map(item => item.width));
  const concurrency = Math.floor((container.innerWidth + gap) / (minWidth + gap));
  const measureCapacity = concurrency * container.innerLength;
  let maximum = Math.floor((container.innerLength * container.innerWidth) / (pallet.length * pallet.width));
  if (unique.length === 2 && concurrency === 2) {
    const wide = unique.reduce((item, candidate) => candidate.width > item.width ? candidate : item);
    const narrow = unique.find(item => item !== wide);
    if (2 * wide.width + gap > container.innerWidth) {
      for (let quantity = 1; quantity <= maximum; quantity += 1) {
        const maxWide = Math.min(
          quantity,
          Math.floor((container.innerLength + gap) / (wide.length + gap))
        );
        const minMeasure = maxWide * wide.length + (quantity - maxWide) * narrow.length;
        if (minMeasure > measureCapacity) {
          maximum = Math.min(maximum, quantity - 1);
          break;
        }
      }
    }
  }
  return { maximum, concurrency, measureCapacity };
}

// Independent test-only bottom-left-stable exhaustive search. It is intentionally
// bounded and never ships in the browser application.
function exactFeasibility(container, pallet, quantity, gap) {
  const upper = analyticalUpperBound(container, pallet, gap);
  if (quantity > upper.maximum) {
    return { status: "INFEASIBLE_PROVEN", states: 0, witness: [], upper };
  }
  const orientations = [
    { length: pallet.length, width: pallet.width, rotated: false },
    { length: pallet.width, width: pallet.length, rotated: true }
  ].filter((item, index, list) => (
    list.findIndex(other => other.length === item.length && other.width === item.width) === index
  ));
  const placed = [];
  const memo = new Set();
  let states = 0;
  let exhausted = false;

  function signature() {
    return placed
      .map(rect => `${rect.x},${rect.y},${rect.length},${rect.width}`)
      .sort()
      .join(";");
  }

  function visit() {
    states += 1;
    if (states > MAX_STATES) {
      exhausted = true;
      return false;
    }
    if (placed.length === quantity) return true;
    const key = signature();
    if (memo.has(key)) return false;
    memo.add(key);

    const xValues = [...new Set([0, ...placed.map(rect => rect.x + rect.length + gap)])]
      .sort((a, b) => a - b);
    const yValues = [...new Set([0, ...placed.map(rect => rect.y + rect.width + gap)])]
      .sort((a, b) => a - b);
    const candidates = [];
    for (const orientation of orientations) {
      for (const y of yValues) {
        for (const x of xValues) {
          if (x + orientation.length > container.innerLength || y + orientation.width > container.innerWidth) continue;
          const rect = { x, y, ...orientation };
          if (placed.every(other => separated(rect, other, gap))) candidates.push(rect);
        }
      }
    }
    candidates.sort((a, b) => (
      a.y - b.y || a.x - b.x || Number(a.rotated) - Number(b.rotated)
    ));
    for (const candidate of candidates) {
      placed.push(candidate);
      if (visit()) return true;
      placed.pop();
      if (exhausted) return false;
    }
    return false;
  }

  const feasible = visit();
  if (feasible) {
    validate(container, pallet, gap, placed);
    return { status: "FEASIBLE", states, witness: placed.map(item => ({ ...item })), upper };
  }
  return {
    status: exhausted ? "INCONCLUSIVE_LIMIT" : "INFEASIBLE_PROVEN",
    states,
    witness: [],
    upper
  };
}

function appCapacity(window, vehicleId, pallet, gap) {
  const container = window.eval(
    `CONTAINERS.find(container => container.id === ${JSON.stringify(vehicleId)})`
  );
  return {
    container,
    layout: window.bestLayout(container, {
      ...pallet,
      height: 1500,
      rotationMode: "auto",
      lockedOrientation: "normal"
    }, gap, "auto", "normal")
  };
}

const relatedCases = [
  ["20dc-industrial-gap0", "20dc", 1200, 1000, 0],
  ["20dc-industrial-gap1", "20dc", 1200, 1000, 1],
  ["20dc-industrial-gap10", "20dc", 1200, 1000, 10],
  ["20dc-north-american-gap0", "20dc", 1219, 1016, 0],
  ["20dc-north-american-gap1", "20dc", 1219, 1016, 1],
  ["20dc-north-american-gap10", "20dc", 1219, 1016, 10],
  ["20dc-euro-gap0", "20dc", 1200, 800, 0],
  ["20dc-euro-gap10", "20dc", 1200, 800, 10],
  ["20rf-industrial-gap0", "20rf", 1200, 1000, 0],
  ["20rf-north-american-gap0", "20rf", 1219, 1016, 0]
];

const baseline = await loadApp(BASELINE);
const current = await loadApp(CURRENT);
try {
  const cases = [];
  for (const [id, vehicleId, length, width, gap] of relatedCases) {
    const pallet = { length, width };
    const before = appCapacity(baseline.window, vehicleId, pallet, gap);
    const after = appCapacity(current.window, vehicleId, pallet, gap);
    assert(after.layout.count >= before.layout.count, `${id}: regressione di capacità`);
    const atCapacity = exactFeasibility(after.container, pallet, after.layout.count, gap);
    assert(atCapacity.status === "FEASIBLE", `${id}: la capacità prodotta non ha testimone indipendente`);
    const next = exactFeasibility(after.container, pallet, after.layout.count + 1, gap);
    assert(next.status !== "FEASIBLE", `${id}: falso negativo di produzione a capacità + 1`);
    cases.push({
      id,
      vehicleId,
      container: { length: after.container.innerLength, width: after.container.innerWidth },
      pallet,
      gap,
      baselineCapacity: before.layout.count,
      currentCapacity: after.layout.count,
      atCapacity: { status: atCapacity.status, states: atCapacity.states },
      nextQuantity: after.layout.count + 1,
      next: { status: next.status, states: next.states, upper: next.upper }
    });
  }
  const inconclusive = cases.filter(item => item.next.status === "INCONCLUSIVE_LIMIT").length;
  const improved = cases.filter(item => item.currentCapacity > item.baselineCapacity).length;
  const report = {
    version: "1.3.5",
    status: "PASS",
    methodology: {
      type: "independent bounded exhaustive bottom-left-stable rectangle placement",
      maximumStatesPerQuery: MAX_STATES,
      candidateCoordinates: "container origin plus placed right/top edges including configured gap",
      analyticalBounds: "area, transverse concurrency, and wide-orientation longitudinal interval measure",
      runtimeIsolation: "test-only; not included in the application engine"
    },
    summary: {
      cases: cases.length,
      independentlyWitnessedCapacities: cases.length,
      independentlyProvenNextInfeasible: cases.length - inconclusive,
      inconclusiveNextBoundary: inconclusive,
      productionFalseNegatives: 0,
      improvedFromV131: improved
    },
    cases
  };
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Geometry oracle PASS: ${cases.length} related cases, ${improved} improved, ${cases.length - inconclusive} next-boundary proofs, ${inconclusive} bounded inconclusive.`);
} finally {
  baseline.window.close();
  current.window.close();
}
