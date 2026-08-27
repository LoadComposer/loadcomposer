import fs from "node:fs";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = path.resolve(import.meta.dirname, "..");
const VERSION = fs.readFileSync(path.join(ROOT, "VERSION"), "utf8").trim();
const EXPECTED_CODES = ["it", "en", "de", "es", "fr", "pt", "nl"];
const RESULT_PATH = path.resolve(
  ROOT,
  process.env.LOADCOMPOSER_VERSION_RESULT ||
    "version-consistency-results-v1.3.3.json"
);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function equal(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: atteso ${expected}, ottenuto ${actual}`);
  }
}

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

function readJson(relative) {
  return JSON.parse(read(relative));
}

function verifyDocumentMarkers(html, label) {
  const dom = new JSDOM(html);
  try {
    equal(dom.window.document.title.trim(), `LoadComposer v${VERSION}`, `${label}: title`);
    equal(
      dom.window.document.querySelector('meta[property="og:title"]')?.getAttribute("content"),
      `LoadComposer v${VERSION}`,
      `${label}: OpenGraph title`
    );
    equal(
      dom.window.document.querySelector(".app-version")?.textContent.trim(),
      `v${VERSION}`,
      `${label}: badge`
    );
  } finally {
    dom.window.close();
  }
}

function canvasContextStub() {
  const methods = {
    arc() {}, beginPath() {}, clearRect() {}, createPattern() { return "#pattern"; },
    drawImage() {}, fill() {}, fillRect() {}, fillText() {}, lineTo() {},
    measureText(text) { return { width: String(text).length * 7 }; },
    moveTo() {}, restore() {}, rotate() {}, save() {}, stroke() {}, strokeRect() {},
    translate() {}
  };
  return new Proxy(methods, {
    get(target, property) { return target[property]; },
    set(target, property, value) { target[property] = value; return true; }
  });
}

async function localizedRuntimeTitle(html, code) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", error => errors.push(error));
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    url: "https://loadcomposer.test/",
    virtualConsole,
    beforeParse(window) {
      window.localStorage.setItem("loadcomposer.language", code);
      window.alert = () => {};
      window.open = () => null;
      window.HTMLCanvasElement.prototype.getContext = () => canvasContextStub();
      window.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,";
    }
  });
  try {
    await dom.window.loadComposerI18n.ready;
    await new Promise(resolve => dom.window.setTimeout(resolve, 0));
    if (errors.length) throw errors[0];
    return dom.window.document.title.trim();
  } finally {
    dom.window.close();
  }
}

assert(/^\d+\.\d+\.\d+$/.test(VERSION), `VERSION non semantica: ${VERSION}`);
const packageData = readJson("package.json");
const packageLock = readJson("package-lock.json");
equal(packageData.version, VERSION, "package.json version");
equal(packageLock.version, VERSION, "package-lock.json version");
equal(packageLock.packages?.[""]?.version, VERSION, "package-lock root version");

const languageIndex = readJson("site/lang/index.json");
const enabledCodes = languageIndex.languages
  .filter(language => language.enabled === true)
  .map(language => language.code);
equal(JSON.stringify(enabledCodes), JSON.stringify(EXPECTED_CODES), "lingue abilitate");

for (const code of enabledCodes) {
  const catalog = readJson(`site/lang/${code}.json`);
  equal(catalog.meta?.version, VERSION, `${code}: catalog version`);
  equal(
    catalog.translations?.["meta.documentTitle"],
    `LoadComposer v${VERSION}`,
    `${code}: localized document title`
  );
  equal(
    catalog.translations?.["downloads.currentVersion"],
    `LoadComposer v${VERSION}`,
    `${code}: downloads current version`
  );
}

const modularHtml = read("site/index.html");
const standaloneHtml = read(`site/downloads/loadcomposer-v${VERSION}-standalone.html`);
verifyDocumentMarkers(modularHtml, "modular");
verifyDocumentMarkers(standaloneHtml, "standalone");
assert(
  modularHtml.includes('document.title = translate("meta.documentTitle")'),
  "applicazione del titolo localizzato assente"
);

const standaloneDom = new JSDOM(standaloneHtml);
try {
  const embedded = JSON.parse(
    standaloneDom.window.document.getElementById("loadcomposer-embedded-i18n")?.textContent || "{}"
  );
  for (const code of enabledCodes) {
    equal(embedded.catalogs?.[code]?.meta?.version, VERSION, `${code}: standalone catalog version`);
    equal(
      embedded.catalogs?.[code]?.translations?.["meta.documentTitle"],
      `LoadComposer v${VERSION}`,
      `${code}: standalone document title`
    );
  }
} finally {
  standaloneDom.window.close();
}

for (const code of enabledCodes) {
  equal(
    await localizedRuntimeTitle(standaloneHtml, code),
    `LoadComposer v${VERSION}`,
    `${code}: runtime localized title`
  );
}

const downloads = read("site/downloads/index.html");
assert(downloads.includes(`LoadComposer v${VERSION}`), "downloads current version assente");
assert(
  downloads.includes(`loadcomposer-v${VERSION}-standalone.html`) &&
  downloads.includes(`loadcomposer-v${VERSION}-standalone.zip`),
  "downloads punta ad artefatti di versione diversa"
);
assert(read("site/404.html").includes(`LoadComposer v${VERSION}`), "404 footer version");

fs.writeFileSync(RESULT_PATH, `${JSON.stringify({
  version: VERSION,
  status: "PASS",
  authoritativeSource: "VERSION",
  enabledLanguages: enabledCodes,
  checks: {
    packageMetadata: "PASS",
    modularTitleOpenGraphAndBadge: "PASS",
    standaloneTitleOpenGraphAndBadge: "PASS",
    localizedCatalogVersions: `${enabledCodes.length}/${enabledCodes.length} PASS`,
    localizedDocumentTitles: `${enabledCodes.length}/${enabledCodes.length} PASS`,
    localizedRuntimeTitles: `${enabledCodes.length}/${enabledCodes.length} PASS`,
    downloadsCurrentVersionAndArtifacts: "PASS",
    page404Version: "PASS"
  },
  activeNpmScript: "test:version"
}, null, 2)}\n`, "utf8");

console.log(
  `Version consistency v${VERSION} PASS: VERSION, package, HTML/OG/badge, ` +
  `downloads, standalone and ${enabledCodes.length} localized runtime titles agree.`
);
