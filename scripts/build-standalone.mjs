import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(SCRIPT_DIR, "..");
const SOURCE_NAME = "site/index.html";
const VERSION = fs.readFileSync(path.join(PROJECT_DIR, "VERSION"), "utf8").trim();
const OUTPUT_NAME = `site/downloads/loadcomposer-v${VERSION}-standalone.html`;
const sourcePath = path.join(PROJECT_DIR, SOURCE_NAME);
const outputPath = path.join(PROJECT_DIR, OUTPUT_NAME);
const LANG_DIR = path.join(PROJECT_DIR, "site", "lang");
const indexPath = path.join(LANG_DIR, "index.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sortedKeys(catalog) {
  return Object.keys(catalog.translations || {}).sort();
}

const html = fs.readFileSync(sourcePath, "utf8");
const index = readJson(indexPath);
const enabledLanguages = index.languages.filter(language => language.enabled === true);
const enabledCodes = enabledLanguages.map(language => language.code);

if (!enabledCodes.includes("it") || !enabledCodes.includes("en")) {
  throw new Error("Italian and English must be enabled in lang/index.json.");
}

const catalogs = Object.fromEntries(enabledCodes.map(code => {
  const catalog = readJson(path.join(LANG_DIR, `${code}.json`));
  if (catalog.meta?.code !== code) {
    throw new Error(`Catalog metadata does not match ${code}.`);
  }
  return [code, catalog];
}));
const referenceKeys = sortedKeys(catalogs.en);

enabledCodes.forEach(code => {
  const keys = sortedKeys(catalogs[code]);
  if (JSON.stringify(keys) !== JSON.stringify(referenceKeys)) {
    throw new Error(`${code} catalog keys do not match the English catalog.`);
  }
});

const embedded = JSON.stringify({
  standalone: true,
  standaloneTitle: `LoadComposer v${VERSION} — Pallet Loading Calculator`,
  index,
  catalogs
})
  .replace(/</g, "\\u003c")
  .replace(/\u2028/g, "\\u2028")
  .replace(/\u2029/g, "\\u2029");

const marker =
  '<script id="loadcomposer-embedded-i18n" type="application/json">{"standalone":false}</script>';

if (!html.includes(marker)) {
  throw new Error("Standalone injection marker not found in modular HTML.");
}

const standalone = html.replace(
  marker,
  `<script id="loadcomposer-embedded-i18n" type="application/json">${embedded}</script>`
).replace(
  /href="[^"]+"\s+data-standalone-href="([^"]+)"/g,
  'href="$1"'
).replace(
  /<title>[^<]*<\/title>/,
  `<title>LoadComposer v${VERSION} — Pallet Loading Calculator</title>`
);

fs.writeFileSync(outputPath, standalone, "utf8");
console.log(
  `${OUTPUT_NAME} generated from lang/index.json and ${enabledCodes.length} enabled catalogs: ${enabledCodes.join(", ")}.`
);
