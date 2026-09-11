import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";
import { launchBrowser } from "./browser-runtime.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const VERSION = fs.readFileSync(path.join(ROOT, "VERSION"), "utf8").trim();
const AUTHORED = path.join(ROOT, "site", "index.html");
const STANDALONE = path.join(
  ROOT,
  "site",
  "downloads",
  `loadcomposer-v${VERSION}-standalone.html`
);
const OUTPUT = path.join(ROOT, `transverse-centering-results-v${VERSION}.json`);
const EVIDENCE = path.join(ROOT, `transverse-centering-visual-evidence-v${VERSION}`);
const EPSILON = 0.000001;

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function almostEqual(actual, expected, label) {
  assert.ok(
    Math.abs(actual - expected) <= EPSILON,
    `${label}: expected ${expected}, received ${actual}`
  );
}

function instrumentedContext(canvas) {
  const calls = {
    fillRect: [],
    strokeRect: [],
    drawImage: []
  };
  const methods = {
    canvas,
    calls,
    arc() {},
    beginPath() {},
    clearRect() {},
    clip() {},
    createPattern() { return "#pattern"; },
    drawImage(...args) { calls.drawImage.push(args); },
    fill() {},
    fillRect(...args) { calls.fillRect.push(args); },
    fillText() {},
    lineTo() {},
    measureText(text) { return { width: String(text).length * 7 }; },
    moveTo() {},
    rect() {},
    restore() {},
    rotate() {},
    save() {},
    stroke() {},
    strokeRect(...args) { calls.strokeRect.push(args); },
    translate() {}
  };
  return new Proxy(methods, {
    get(target, property) {
      if (!(property in target)) target[property] = () => {};
      return target[property];
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    }
  });
}

async function loadStandalone() {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", error => errors.push(error));
  const dom = new JSDOM(fs.readFileSync(STANDALONE, "utf8"), {
    runScripts: "dangerously",
    url: "https://loadcomposer.test/",
    virtualConsole,
    beforeParse(window) {
      window.localStorage.setItem("loadcomposer.language", "en");
      window.localStorage.setItem("loadcomposer.unit", "mm");
      window.alert = () => {};
      window.open = () => null;
      window.HTMLCanvasElement.prototype.getContext = function getContext() {
        if (!this.__loadComposerTestContext) {
          this.__loadComposerTestContext = instrumentedContext(this);
        }
        return this.__loadComposerTestContext;
      };
      window.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,";
    }
  });
  await dom.window.loadComposerI18n.ready;
  await new Promise(resolve => dom.window.setTimeout(resolve, 0));
  if (errors.length) throw errors[0];
  return dom;
}

function singleFixture(id, innerWidth, usedWidth, rects) {
  return {
    id,
    mode: "single",
    container: {
      id: "20dc",
      vehicleType: "container",
      innerLength: 4000,
      innerWidth
    },
    layout: {
      type: "synthetic",
      count: rects.length,
      usedLength: Math.max(...rects.map(rect => rect.x + rect.length)),
      usedWidth,
      rects
    },
    input: {
      pallet: { identifier: "", length: 1200, width: 1000 }
    }
  };
}

const fixtures = [
  singleFixture("strongly-under-filled", 2400, 1000, [
    { x: 0, y: 0, length: 1200, width: 1000, rotated: false, stackCount: 1 }
  ]),
  singleFixture("near-full-width", 2350, 2300, [
    { x: 0, y: 0, length: 1200, width: 1100, rotated: false, stackCount: 1 },
    { x: 1200, y: 1200, length: 1000, width: 1100, rotated: true, stackCount: 1 }
  ]),
  {
    id: "mixed-rigid-envelope",
    mode: "mixed",
    container: {
      id: "20dc",
      vehicleType: "container",
      innerLength: 4000,
      innerWidth: 2400
    },
    layout: {
      type: "synthetic mixed",
      count: 3,
      usedLength: 2400,
      usedWidth: 1800,
      rects: [
        { id: "A", x: 0, y: 0, length: 1200, width: 800, rotated: false, typeIndex: 0, unitNo: 1, originalLength: 1200, originalWidth: 800 },
        { id: "B", x: 1200, y: 0, length: 900, width: 800, rotated: true, typeIndex: 1, unitNo: 1, originalLength: 800, originalWidth: 900 },
        { id: "C", x: 300, y: 900, length: 1100, width: 900, rotated: false, typeIndex: 2, unitNo: 1, originalLength: 1100, originalWidth: 900 }
      ]
    },
    input: { types: [] }
  },
  singleFixture("full-width", 2400, 2400, [
    { x: 0, y: 0, length: 1200, width: 1200, rotated: false, stackCount: 1 },
    { x: 1200, y: 1200, length: 1200, width: 1200, rotated: true, stackCount: 1 }
  ])
];

function sourceBlock(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start);
  assert.ok(start >= 0 && end > start, `source block missing: ${startNeedle}`);
  return source.slice(start, end);
}

function palletBoxes(canvas, expectedCount) {
  const boxes = canvas.__loadComposerTestContext.calls.strokeRect.slice(1);
  assert.equal(boxes.length, expectedCount, "unexpected rendered pallet count");
  return boxes;
}

function renderBoxes(window, result, view, bwMode, forPrint) {
  if (view === "side") {
    const canvas = window.document.getElementById("layoutCanvas");
    canvas.__loadComposerTestContext = instrumentedContext(canvas);
    window.drawSidePreview(result, bwMode, { forPrint });
    return palletBoxes(canvas, result.layout.rects.length);
  }
  const canvas = window.createRampPrintCanvas(result, bwMode, {
    preview: !forPrint
  });
  return palletBoxes(canvas, result.layout.rects.length);
}

function verifyPixelMapping(result, presentation, boxes, view) {
  const c = result.container;
  const side = view === "side";
  const scale = side
    ? Math.min((1100 - 76 * 2) / c.innerLength, (470 - 70 - 48) / c.innerWidth)
    : Math.min((720 - 78 * 2) / c.innerWidth, (1200 - 108 - 105) / c.innerLength);
  const originX = side
    ? (1100 - c.innerLength * scale) / 2
    : (720 - c.innerWidth * scale) / 2;
  const originY = side
    ? 70 + ((470 - 70 - 48) - c.innerWidth * scale) / 2
    : 108;

  boxes.forEach((box, index) => {
    const rect = presentation.rects[index];
    const expected = side
      ? [
        originX + rect.displayX * scale,
        originY + rect.displayY * scale,
        rect.length * scale,
        rect.width * scale
      ]
      : [
        originX + rect.displayY * scale,
        originY + rect.displayX * scale,
        rect.width * scale,
        rect.length * scale
      ];
    box.forEach((value, component) => {
      almostEqual(value, expected[component], `${result.id}/${view}/${index}/${component}`);
    });
  });
}

function setCanonical(window) {
  const document = window.document;
  const group = document.getElementById("singlePalletGroup");
  document.getElementById("loadMode").value = "single";
  window.selectPresetForGroup(group, "custom", false);
  group.querySelector('[data-field="length"]').value = "1200";
  group.querySelector('[data-field="width"]').value = "1000";
  group.querySelector('[data-field="height"]').value = "1500";
  group.querySelector('[data-field="quantity"]').value = "10";
  group.querySelector('[data-field="allowRotate"]').checked = true;
  document.getElementById("gap").value = "0";
  document.getElementById("stackable").checked = false;
  window.updateGroupVisuals(group);
  assert.equal(window.calculate(), true, "canonical calculation refused");
  return window.eval('lastResults.find(result => result.container.id === "20dc")');
}

async function createVisualEvidence() {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  const browser = await launchBrowser(ROOT);
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
    colorScheme: "light"
  });
  await context.addInitScript(() => {
    localStorage.setItem("loadcomposer.language", "en");
    localStorage.setItem("loadcomposer.theme", "light");
    localStorage.setItem("loadcomposer.unit", "mm");
  });
  const page = await context.newPage();
  const errors = [];
  const remote = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("request", request => {
    if (/^https?:/i.test(request.url())) remote.push(request.url());
  });
  const captures = [];
  try {
    await page.goto(pathToFileURL(STANDALONE).href, { waitUntil: "load" });
    await page.waitForFunction(() => document.documentElement.dataset.i18nReady === "true");
    const plans = [
      [fixtures[0], "side", false, false],
      [fixtures[0], "ramp", false, false],
      [fixtures[0], "side", true, true],
      [fixtures[0], "ramp", true, true],
      [fixtures[1], "side", false, false],
      [fixtures[1], "ramp", false, false],
      [fixtures[2], "side", false, false],
      [fixtures[2], "ramp", false, false],
      [fixtures[2], "side", true, true],
      [fixtures[2], "ramp", true, true],
      [fixtures[3], "side", false, false],
      [fixtures[3], "ramp", false, false]
    ];

    for (const [fixture, view, bwMode, forPrint] of plans) {
      const selector = await page.evaluate(({ result, viewName, blackWhite, printMode }) => {
        document.getElementById("lcEvidenceCanvas")?.remove();
        if (viewName === "side") {
          drawSidePreview(result, blackWhite, { forPrint: printMode });
          return "#layoutCanvas";
        }
        const canvas = createRampPrintCanvas(result, blackWhite, {
          preview: !printMode
        });
        canvas.id = "lcEvidenceCanvas";
        canvas.style.display = "block";
        canvas.style.maxWidth = "720px";
        document.body.append(canvas);
        return "#lcEvidenceCanvas";
      }, {
        result: fixture,
        viewName: view,
        blackWhite: bwMode,
        printMode: forPrint
      });
      const filename = [
        fixture.id,
        view,
        forPrint ? "print" : "preview",
        bwMode ? "bw" : "colour"
      ].join("-") + ".png";
      const destination = path.join(EVIDENCE, filename);
      await page.locator(selector).screenshot({ path: destination });
      captures.push({
        file: path.relative(ROOT, destination).split(path.sep).join("/"),
        sha256: sha256(destination)
      });
    }
    assert.deepEqual(errors, [], "browser errors during centering visual QA");
    assert.deepEqual(remote, [], "standalone made remote requests during centering visual QA");
  } finally {
    await context.close();
    await browser.close();
  }
  return captures;
}

assert.equal(VERSION, "1.4.0", "transverse centering must test the current release");
assert.ok(fs.existsSync(STANDALONE), "current standalone missing; run npm run build first");

const authoredSource = fs.readFileSync(AUTHORED, "utf8");
const standaloneSource = fs.readFileSync(STANDALONE, "utf8");
const presentationNeedle = "    function transversePresentationOffset(container, layout) {";
const presentationEnd = "\n    function drawStackedWord(";
assert.equal(
  sourceBlock(authoredSource, presentationNeedle, presentationEnd),
  sourceBlock(standaloneSource, presentationNeedle, presentationEnd),
  "online and standalone presentation helpers differ"
);
assert.match(
  sourceBlock(authoredSource, presentationNeedle, presentationEnd),
  /Math\.floor\([\s\S]*Math\.max\(0, container\.innerWidth - layout\.usedWidth\) \/ 2/
);

const app = await loadStandalone();
let canonicalSummary;
try {
  const { window } = app;
  const fixtureResults = [];
  for (const fixture of fixtures) {
    const before = plain(fixture);
    const presentation = plain(window.prepareLayoutForPresentation(fixture));
    const expectedOffset = Math.floor(
      Math.max(0, fixture.container.innerWidth - fixture.layout.usedWidth) / 2
    );
    assert.equal(presentation.transverseOffset, expectedOffset, `${fixture.id}: offset formula`);
    assert.equal(
      expectedOffset > 0,
      fixture.id !== "full-width",
      `${fixture.id}: offset zero/positive classification`
    );
    assert.deepEqual(plain(fixture), before, `${fixture.id}: preparation mutated source`);
    assert.equal(presentation.rects.length, fixture.layout.rects.length);

    const left = Math.min(...presentation.rects.map(rect => rect.displayY));
    const right = fixture.container.innerWidth - Math.max(
      ...presentation.rects.map(rect => rect.displayY + rect.width)
    );
    assert.ok(Math.abs(left - right) <= 1, `${fixture.id}: transverse clearances are not centred`);

    presentation.rects.forEach((rect, index) => {
      const canonical = fixture.layout.rects[index];
      assert.equal(rect.displayX, canonical.x, `${fixture.id}/${index}: display x changed`);
      assert.equal(rect.displayY, canonical.y + expectedOffset, `${fixture.id}/${index}: display y`);
      assert.equal(rect.y, canonical.y, `${fixture.id}/${index}: canonical y copy changed`);
    });
    for (let first = 0; first < presentation.rects.length; first += 1) {
      for (let second = first + 1; second < presentation.rects.length; second += 1) {
        const beforeA = fixture.layout.rects[first];
        const beforeB = fixture.layout.rects[second];
        const afterA = presentation.rects[first];
        const afterB = presentation.rects[second];
        assert.equal(afterA.displayX - afterB.displayX, beforeA.x - beforeB.x);
        assert.equal(afterA.displayY - afterB.displayY, beforeA.y - beforeB.y);
      }
    }

    const renders = {};
    for (const view of ["side", "ramp"]) {
      renders[`${view}PreviewColour`] = renderBoxes(window, fixture, view, false, false);
      renders[`${view}PreviewBw`] = renderBoxes(window, fixture, view, true, false);
      renders[`${view}PrintColour`] = renderBoxes(window, fixture, view, false, true);
      renders[`${view}PrintBw`] = renderBoxes(window, fixture, view, true, true);
      verifyPixelMapping(fixture, presentation, renders[`${view}PreviewColour`], view);
      assert.deepEqual(renders[`${view}PreviewBw`], renders[`${view}PreviewColour`]);
      assert.deepEqual(renders[`${view}PrintColour`], renders[`${view}PreviewColour`]);
      assert.deepEqual(renders[`${view}PrintBw`], renders[`${view}PreviewColour`]);
    }
    assert.deepEqual(plain(fixture), before, `${fixture.id}: rendering mutated source`);
    fixtureResults.push({
      id: fixture.id,
      mode: fixture.mode,
      offset: expectedOffset,
      leftClearance: left,
      rightClearance: right,
      rectangles: fixture.layout.rects.length,
      sourceImmutable: true,
      sidePreviewPrintAndBw: "PASS",
      rampPreviewPrintAndBw: "PASS"
    });
  }

  const canonical = setCanonical(window);
  const capacityBefore = plain(canonical.capacityLayout);
  const loadBefore = plain(canonical.loadLayout);
  window.prepareLayoutForPresentation({
    ...canonical,
    layout: canonical.capacityLayout
  });
  window.prepareLayoutForPresentation({
    ...canonical,
    layout: canonical.loadLayout
  });
  renderBoxes(window, canonical, "side", false, false);
  renderBoxes(window, canonical, "ramp", true, true);
  assert.deepEqual(plain(canonical.capacityLayout), capacityBefore, "capacityLayout mutated");
  assert.deepEqual(plain(canonical.loadLayout), loadBefore, "loadLayout mutated");

  const orientations = canonical.loadLayout.rects.reduce((counts, rect) => {
    counts[rect.rotated ? "rotated" : "normal"] += 1;
    return counts;
  }, { normal: 0, rotated: 0 });
  assert.equal(canonical.floorCapacity, 10);
  assert.equal(canonical.placedCount, 10);
  assert.equal(canonical.unplacedCount, 0);
  assert.equal(canonical.ok, true);
  assert.deepEqual(orientations, { normal: 5, rotated: 5 });
  assert.equal(canonical.loadLayout.usedLength, 5600);
  assert.equal(canonical.loadLayout.usedWidth, 2200);
  const canonicalRemainingWidth = canonical.container.innerWidth - canonical.loadLayout.usedWidth;
  assert.equal(canonicalRemainingWidth, 150, "canonical remaining width changed");
  assert.equal(
    window.transversePresentationOffset(canonical.container, canonical.loadLayout),
    75
  );
  canonicalSummary = {
    container: canonical.container.id,
    capacity: canonical.floorCapacity,
    placed: canonical.placedCount,
    unplaced: canonical.unplacedCount,
    orientations,
    usedLength: canonical.loadLayout.usedLength,
    usedWidth: canonical.loadLayout.usedWidth,
    remainingWidth: canonicalRemainingWidth,
    presentationOffset: 75,
    capacityLayoutImmutable: true,
    loadLayoutImmutable: true,
    canonicalCoordinates: canonical.loadLayout.rects.map(rect => ({
      x: rect.x,
      y: rect.y,
      length: rect.length,
      width: rect.width,
      rotated: rect.rotated
    }))
  };

  const visualEvidence = await createVisualEvidence();
  const result = {
    version: VERSION,
    status: "PASS",
    scope: "presentation-only transverse whole-envelope translation",
    formula: "Math.floor(Math.max(0, container.innerWidth - layout.usedWidth) / 2)",
    longitudinalCoordinatesChanged: 0,
    canonicalTransverseCoordinatesChanged: 0,
    canonicalUsedLengthChanged: 0,
    canonicalUsedWidthChanged: 0,
    claimsWeightBalance: false,
    fixtures: fixtureResults,
    canonical: canonicalSummary,
    coverage: {
      sidePreview: "PASS",
      rampPreview: "PASS",
      sidePrint: "PASS",
      rampPrint: "PASS",
      colourBlackWhiteGeometryParity: "PASS",
      mixedWholeEnvelope: "PASS",
      sourceImmutability: "PASS",
      onlineStandaloneHelperParity: "PASS"
    },
    visualEvidence
  };
  fs.writeFileSync(OUTPUT, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(
    `Transverse centering v${VERSION} PASS: 4 representative layouts, Side/Ramp, ` +
    `preview/print, colour/BW, immutable canonical geometry; ${visualEvidence.length} visual captures.`
  );
} finally {
  app.window.close();
}
