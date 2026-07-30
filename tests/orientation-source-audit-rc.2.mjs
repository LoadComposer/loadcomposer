import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const ROOT = path.resolve(import.meta.dirname, "..");
const APP_PATH = path.join(ROOT, "site/index.html");
const STANDALONE_PATH = path.join(ROOT, "site/downloads/loadcomposer-v1.0.0-rc.2-standalone.html");
const CODES = ["it", "en", "de", "es", "fr", "pt", "nl"];
const OBSOLETE_KEYS = [
  "rotation.alongTitle",
  "rotation.acrossTitle",
  "rotation.footnote",
  "rotation.diagramAria",
  "rotation.locked"
];
const REQUIRED_KEYS = [
  "rotation.forkShort",
  "rotation.forkLong",
  "rotation.entryMeasure",
  "rotation.diagramTitle",
  "rotation.diagramDescriptionShort",
  "rotation.diagramDescriptionLong",
  "rotation.lockedShort",
  "rotation.lockedLong"
];

function readCatalog(root, code) {
  return JSON.parse(fs.readFileSync(path.join(root, `${code}.json`), "utf8"));
}

const app = fs.readFileSync(APP_PATH, "utf8");
const standalone = fs.readFileSync(STANDALONE_PATH, "utf8");
for (const key of OBSOLETE_KEYS) {
  assert.equal(app.includes(`"${key}"`), false, `Modular source references ${key}.`);
  assert.equal(standalone.includes(`"${key}"`), false, `Standalone references ${key}.`);
}
assert.equal(
  app.includes('data-i18n="rotation.requiredHelp"'),
  false,
  "A help sentence is still rendered below the orientation diagrams."
);

const diagramSource = app.match(
  /function orientationDiagramSvg\([\s\S]+?\n    function groupDimensions\(/
)?.[0] || "";
assert.ok(diagramSource, "orientationDiagramSvg source not found.");
assert.equal((diagramSource.match(/<marker\b/g) || []).length, 0, "SVG marker still present.");
assert.equal(
  diagramSource.includes("orientation-entry-arrow") ||
    diagramSource.includes("orientation-entry-arrowhead"),
  false,
  "The previous shaft-and-arrowhead indicator still exists."
);
assert.equal(
  (diagramSource.match(/class="orientation-entry-chevron"/g) || []).length,
  2,
  "The direction indicator must contain exactly two chevrons."
);
assert.ok(
  diagramSource.includes(
    '<g class="orientation-entry-indicator" aria-hidden="true">'
  ),
  "The decorative double-chevron group is not hidden from assistive technology."
);
assert.ok(
  diagramSource.includes("chevronHalfWidth = 17.5") &&
    diagramSource.includes("chevronHeight = 14") &&
    diagramSource.includes("chevronStepY = 16.5"),
  "The approved double-chevron geometry is incomplete."
);
assert.ok(
  /\.orientation-entry-chevron\s*\{[\s\S]*?stroke:\s*var\(--lc-accent\);[\s\S]*?stroke-width:\s*5\.25;[\s\S]*?stroke-linecap:\s*round;[\s\S]*?stroke-linejoin:\s*round;[\s\S]*?\}/.test(app),
  "The double-chevron teal styling is incomplete."
);
assert.equal(
  /marker-(?:start|end)="url\(#\$\{dimension/i.test(diagramSource),
  false,
  "Dimension lines still use arrow markers."
);
for (const forbidden of ["<image", "<filter", "<linearGradient", "<radialGradient"]) {
  assert.equal(
    diagramSource.includes(forbidden),
    false,
    `Forbidden SVG feature found: ${forbidden}.`
  );
}
assert.ok(
  diagramSource.includes("orientation-pallet-board") &&
  diagramSource.includes("orientation-pallet-runner") &&
  diagramSource.includes("orientation-pallet-grain"),
  "The vector pallet structure is incomplete."
);
assert.ok(
  app.includes("function orientationPresentation(") &&
  app.includes('entryKind = entry === shortSide ? "short" : "long"'),
  "Short-side/long-side mapping is not centralized."
);

const baselineRoot = path.join(ROOT, "tests/fixtures/baseline-v1.0.0-rc.1", "lang");
for (const code of CODES) {
  const current = readCatalog(path.join(ROOT, "site", "lang"), code).translations;
  const baseline = readCatalog(baselineRoot, code).translations;
  for (const key of OBSOLETE_KEYS) {
    assert.equal(Object.hasOwn(current, key), false, `${code}:${key} still exists.`);
  }
  for (const key of REQUIRED_KEYS) {
    assert.equal(typeof current[key], "string", `${code}:${key} is missing.`);
    assert.ok(current[key].trim(), `${code}:${key} is empty.`);
  }
  const obsoleteValues = OBSOLETE_KEYS.map(key => baseline[key]).filter(Boolean);
  const currentOrientationValues = Object.entries(current)
    .filter(([key]) => key.startsWith("rotation."))
    .map(([, value]) => value);
  for (const oldValue of obsoleteValues) {
    assert.equal(
      currentOrientationValues.includes(oldValue),
      false,
      `${code}: obsolete orientation text remains in the catalog.`
    );
  }
}

const embeddedDom = new JSDOM(standalone);
try {
  const embedded = JSON.parse(
    embeddedDom.window.document.getElementById("loadcomposer-embedded-i18n").textContent
  );
  assert.equal(embedded.standalone, true);
  assert.deepEqual(Object.keys(embedded.catalogs), CODES);
  for (const code of CODES) {
    const translations = embedded.catalogs[code].translations;
    for (const key of OBSOLETE_KEYS) {
      assert.equal(Object.hasOwn(translations, key), false, `${code}:${key} embedded.`);
    }
    for (const key of REQUIRED_KEYS) {
      assert.equal(typeof translations[key], "string", `${code}:${key} missing in standalone.`);
    }
  }

  const footer = embeddedDom.window.document.querySelector(".footer");
  const note = footer?.querySelector(":scope > .footer-note");
  const row = footer?.querySelector(":scope > .github-row");
  const link = row?.querySelector(":scope > .github-link");
  assert.ok(note && row && link, "Footer note/GitHub row structure is incomplete.");
  assert.equal(link.href, "https://github.com/LoadComposer/loadcomposer");
  assert.equal(link.target, "_blank");
  assert.ok(link.rel.split(/\s+/).includes("noopener"));
  assert.ok(link.rel.split(/\s+/).includes("noreferrer"));
} finally {
  embeddedDom.window.close();
}

console.log(
  "Orientation source audit PASS: 7 modular/embedded catalogs, obsolete wording, " +
  "SVG contract and centred GitHub footer structure verified."
);
