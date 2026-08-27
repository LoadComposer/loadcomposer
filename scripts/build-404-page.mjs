import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERSION = fs.readFileSync(path.join(ROOT, "VERSION"), "utf8").trim();
const TEMPLATE = path.join(ROOT, "scripts", "templates", "404.html");
const OUTPUT = path.join(ROOT, "site", "404.html");
const COMPACT_BRAND_DAY = path.join(ROOT, "site", "assets", "loadcomposer-mobile-day.svg");
const COMPACT_BRAND_NIGHT = path.join(ROOT, "site", "assets", "loadcomposer-mobile-night.svg");
const INDEX_PATH = path.join(ROOT, "site", "lang", "index.json");
const REQUIRED_KEYS = [
  "footer.download",
  "footer.legalInformation",
  "downloads.brandHomeAria",
  "downloads.footer.home",
  "downloads.theme.label",
  "downloads.theme.auto",
  "downloads.theme.light",
  "downloads.theme.dark",
  "downloads.language.label",
  "404.meta.title",
  "404.meta.description",
  "404.title",
  "404.description",
  "404.navigationAria"
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

for (const filePath of [TEMPLATE, INDEX_PATH, COMPACT_BRAND_DAY, COMPACT_BRAND_NIGHT]) {
  if (!fs.existsSync(filePath)) throw new Error(`Required 404 input missing: ${path.relative(ROOT, filePath)}`);
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
const languageOptions = languages
  .map(language => `<option value="${escapeHtml(language.code)}">${escapeHtml(language.nativeName)}</option>`)
  .join("");

let output = fs.readFileSync(TEMPLATE, "utf8");
for (const [marker, value] of [
  ["__404_DATA__", pageData],
  ["__LANGUAGE_OPTIONS__", languageOptions],
  ["__COMPACT_BRAND_DAY__", fs.readFileSync(COMPACT_BRAND_DAY, "utf8").trim()],
  ["__COMPACT_BRAND_NIGHT__", fs.readFileSync(COMPACT_BRAND_NIGHT, "utf8").trim()],
  ["__VERSION__", VERSION]
]) {
  if (!output.includes(marker)) throw new Error(`404 template marker missing: ${marker}`);
  output = output.replaceAll(marker, value);
}
if (/__[A-Z0-9_]+__/.test(output)) throw new Error("Unresolved 404 page marker.");
fs.writeFileSync(OUTPUT, output, "utf8");

console.log(`404 page PASS: ${languages.length} languages, self-contained i18n/theme data and root-relative navigation.`);
