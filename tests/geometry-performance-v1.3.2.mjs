import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = path.resolve(import.meta.dirname, "..");
const SOURCES = {
  baseline: path.resolve(
    ROOT,
    process.env.LOADCOMPOSER_PERF_BASELINE ||
      "site/downloads/loadcomposer-v1.3.1-standalone.html"
  ),
  current: path.resolve(
    ROOT,
    process.env.LOADCOMPOSER_PERF_CURRENT ||
      "site/downloads/loadcomposer-v1.3.2-standalone.html"
  )
};
const OUTPUT = path.resolve(
  ROOT,
  process.env.LOADCOMPOSER_PERF_RESULT ||
    "geometry-performance-results-v1.3.2.json"
);
const BASELINE_LABEL = process.env.LOADCOMPOSER_PERF_BASELINE_LABEL || "published v1.3.1 standalone";
const CURRENT_LABEL = process.env.LOADCOMPOSER_PERF_CURRENT_LABEL || "generated v1.3.2 standalone";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

async function loadApp(file) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", error => errors.push(error));
  const dom = new JSDOM(fs.readFileSync(file, "utf8"), {
    runScripts: "dangerously",
    url: "https://loadcomposer.performance.test/",
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

function clearSearchCache(window) {
  try {
    window.eval("mixedOrientationSearchCache.clear()");
  } catch {
    // v1.3.1 has no mixed-orientation search cache.
  }
}

function benchmark(window, run, { samples = 11, cold = false } = {}) {
  const values = [];
  run();
  for (let index = 0; index < samples; index += 1) {
    if (cold) clearSearchCache(window);
    const started = performance.now();
    const result = run();
    values.push(performance.now() - started);
    assert(result && Number.isFinite(result.count), "risultato benchmark non valido");
  }
  return {
    samples,
    medianMs: median(values),
    minMs: Math.min(...values),
    maxMs: Math.max(...values),
    resultCount: run().count
  };
}

function casesFor(window) {
  const container = id => window.eval(
    `CONTAINERS.find(container => container.id === ${JSON.stringify(id)})`
  );
  const pallet = (length, width, rotationMode = "auto") => ({
    length, width, height: 1500, rotationMode, lockedOrientation: "normal"
  });
  return [
    {
      id: "canonical-20dc-industrial",
      run: () => window.bestLoadLayout(
        container("20dc"), pallet(1200, 1000), 0, "auto", "normal", 10
      )
    },
    {
      id: "common-20dc-euro",
      run: () => window.bestLoadLayout(
        container("20dc"), pallet(1200, 800), 0, "auto", "normal", 11
      )
    },
    {
      id: "larger-45hc-euro",
      run: () => window.bestLoadLayout(
        container("45hc"), pallet(1200, 800), 0, "auto", "normal", 33
      )
    },
    {
      id: "high-quantity-500",
      run: () => window.bestLoadLayout(
        container("truck-curtain-1360"), pallet(100, 80), 0, "auto", "normal", 500
      )
    },
    {
      id: "mixed-groups-realistic",
      run: () => {
        const types = [
          { name: "EUR", identifier: "E", length: 1200, width: 800, height: 1400,
            quantity: 12, rotationMode: "auto", lockedOrientation: "normal" },
          { name: "IND", identifier: "I", length: 1200, width: 1000, height: 1400,
            quantity: 8, rotationMode: "auto", lockedOrientation: "normal" },
          { name: "HALF", identifier: "H", length: 800, width: 600, height: 1200,
            quantity: 6, rotationMode: "locked", lockedOrientation: "normal" }
        ];
        return window.bestMixedLayout(container("truck-curtain-1360"), window.expandMixedItems(types), 0);
      }
    }
  ];
}

const apps = {};
try {
  for (const [name, source] of Object.entries(SOURCES)) {
    apps[name] = await loadApp(source);
  }

  const results = [];
  for (const id of casesFor(apps.baseline.window).map(item => item.id)) {
    const baselineCase = casesFor(apps.baseline.window).find(item => item.id === id);
    const currentCase = casesFor(apps.current.window).find(item => item.id === id);
    const baseline = benchmark(apps.baseline.window, baselineCase.run);
    const currentWarm = benchmark(apps.current.window, currentCase.run);
    const currentCold = benchmark(apps.current.window, currentCase.run, { cold: true });
    assert(currentCold.maxMs < 1000, `${id}: percorso freddo oltre 1 s`);
    assert(currentWarm.maxMs < 500, `${id}: percorso caldo oltre 500 ms`);
    assert(currentWarm.resultCount >= baseline.resultCount, `${id}: conteggio diminuito`);
    results.push({
      id,
      baseline,
      currentWarm,
      currentCold,
      warmMedianRatio: baseline.medianMs > 0 ? currentWarm.medianMs / baseline.medianMs : null,
      coldMedianRatio: baseline.medianMs > 0 ? currentCold.medianMs / baseline.medianMs : null
    });
  }

  const worstAbsolute = results.reduce((worst, item) => (
    item.currentCold.maxMs > worst.currentCold.maxMs ? item : worst
  ));
  const report = {
    version: "1.3.2",
    status: "PASS",
    methodology: {
      runtime: process.version,
      environment: "JSDOM, monotonic performance.now(), 1 warm-up plus 11 measured samples",
      baseline: BASELINE_LABEL,
      current: CURRENT_LABEL,
      coldCurrent: "v1.3.2 search cache cleared before each measured sample",
      thresholdsMs: { coldMaximum: 1000, warmMaximum: 500 }
    },
    searchLimits: {
      maximumItems: 36,
      maximumGeneratedStates: 24000,
      beamWidth: "64 through 16 target items; 32 otherwise",
      cacheEntries: 96,
      bypass: "square pallets, prohibited rotation, area bound <= established result, or area bound > 36"
    },
    cases: results,
    worstAbsoluteCase: {
      id: worstAbsolute.id,
      currentColdMaxMs: worstAbsolute.currentCold.maxMs
    }
  };
  fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Geometry performance PASS: ${results.length} workloads; worst cold ${worstAbsolute.id} ${worstAbsolute.currentCold.maxMs.toFixed(3)} ms.`);
} finally {
  Object.values(apps).forEach(dom => dom.window.close());
}
