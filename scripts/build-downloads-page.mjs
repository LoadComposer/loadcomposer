import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERSION = "1.2.1";
const DOWNLOADS = path.join(ROOT, "site", "downloads");
const TEMPLATE = path.join(ROOT, "scripts", "templates", "downloads-index.html");
const OUTPUT = path.join(DOWNLOADS, "index.html");
const HTML_NAME = `loadcomposer-v${VERSION}-standalone.html`;
const ZIP_NAME = `loadcomposer-v${VERSION}-standalone.zip`;
const HTML_PATH = path.join(DOWNLOADS, HTML_NAME);
const ZIP_PATH = path.join(DOWNLOADS, ZIP_NAME);
const INDEX_PATH = path.join(ROOT, "site", "lang", "index.json");
const REQUIRED_KEYS = [
  "footer.license",
  "footer.privacy",
  "footer.legalInformation",
  "footer.linksAria",
  "downloads.meta.title",
  "downloads.meta.description",
  "downloads.brandHomeAria",
  "downloads.title",
  "downloads.recommendation",
  "downloads.online.title",
  "downloads.online.badge",
  "downloads.online.body",
  "downloads.online.noDownload",
  "downloads.online.noManualUpdates",
  "downloads.online.currentVersion",
  "downloads.online.button",
  "downloads.offline.title",
  "downloads.offline.badge",
  "downloads.offline.body",
  "downloads.offline.internetNote",
  "downloads.currentVersion",
  "downloads.offline.htmlButton",
  "downloads.offline.htmlHelp",
  "downloads.offline.zipButton",
  "downloads.offline.zipHelp",
  "downloads.integrity.title",
  "downloads.integrity.body",
  "downloads.integrity.htmlLabel",
  "downloads.integrity.zipLabel",
  "downloads.releases",
  "downloads.footer.home",
  "downloads.theme.label",
  "downloads.theme.auto",
  "downloads.theme.light",
  "downloads.theme.dark",
  "downloads.language.label"
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

for (const filePath of [TEMPLATE, HTML_PATH, ZIP_PATH, INDEX_PATH]) {
  if (!fs.existsSync(filePath)) throw new Error(`Required input missing: ${path.relative(ROOT, filePath)}`);
}

const languageIndex = readJson(INDEX_PATH);
const languages = languageIndex.languages.filter(language => language.enabled === true);
const catalogs = Object.fromEntries(languages.map(language => {
  const source = readJson(path.join(ROOT, "site", "lang", `${language.code}.json`));
  if (source.meta?.version !== VERSION) throw new Error(`${language.code}: catalog version is not ${VERSION}.`);
  const subset = Object.fromEntries(REQUIRED_KEYS.map(key => {
    const value = source.translations?.[key];
    if (typeof value !== "string" || !value.trim()) throw new Error(`${language.code}:${key} missing.`);
    return [key, value];
  }));
  return [language.code, subset];
}));

const pageData = JSON.stringify({
  schemaVersion: 1,
  version: VERSION,
  defaultLanguage: languageIndex.defaultLanguage,
  languages: languages.map(({ code, nativeName, locale }) => ({ code, nativeName, locale })),
  catalogs
}).replace(/</g, "\\u003c");

let output = fs.readFileSync(TEMPLATE, "utf8");
const replacements = new Map([
  ["__DOWNLOADS_DATA__", pageData],
  ["__HTML_SHA256__", sha256(HTML_PATH)],
  ["__ZIP_SHA256__", sha256(ZIP_PATH)]
]);
for (const [marker, value] of replacements) {
  if (!output.includes(marker)) throw new Error(`Template marker missing: ${marker}`);
  output = output.replace(marker, value);
}
if (/__[A-Z0-9_]+__/.test(output)) throw new Error("Unresolved download page marker.");

fs.writeFileSync(OUTPUT, output, "utf8");
console.log(
  `Download page PASS: ${languages.length} languages, current v${VERSION} HTML/ZIP, ` +
  `verified SHA-256 ${sha256(HTML_PATH).slice(0, 12)}…/${sha256(ZIP_PATH).slice(0, 12)}….`
);
