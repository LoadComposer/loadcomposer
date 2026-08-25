import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const LEGAL_DIR = path.join(ROOT, "site", "legal");
const VERSION = "1.3.2";
const TEMPLATE = path.join(ROOT, "scripts", "templates", "legal-index.html");
const OUTPUT = path.join(LEGAL_DIR, "index.html");
const COMPACT_BRAND_DAY = path.join(ROOT, "site", "assets", "loadcomposer-mobile-day.svg");
const COMPACT_BRAND_NIGHT = path.join(ROOT, "site", "assets", "loadcomposer-mobile-night.svg");
const INDEX_PATH = path.join(ROOT, "site", "lang", "index.json");
const LEGAL_FILES = [
  "LICENSE",
  "LICENSE.it.md",
  "NOTICE",
  "TRADEMARKS.md",
  "COMMERCIAL-LICENSING.md",
  "PRIVACY.md",
  "SECURITY.md"
];
const REQUIRED_KEYS = [
  "footer.download",
  "footer.privacy",
  "footer.linksAria",
  "downloads.brandHomeAria",
  "downloads.footer.home",
  "downloads.theme.label",
  "downloads.theme.auto",
  "downloads.theme.light",
  "downloads.theme.dark",
  "downloads.language.label",
  "legal.meta.title",
  "legal.meta.description",
  "legal.title",
  "legal.notice.controlling",
  "legal.notice.translation",
  "legal.notice.sourceAvailable",
  "legal.documents.title",
  "legal.documents.licenseEnglish",
  "legal.documents.licenseItalian",
  "legal.documents.notice",
  "legal.documents.trademarks",
  "legal.documents.commercial",
  "legal.documents.privacy",
  "legal.documents.security",
  "legal.contact.title",
  "legal.contact.prefix",
  "legal.footer.repository"
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

fs.mkdirSync(LEGAL_DIR, { recursive: true });

for (const filename of LEGAL_FILES) {
  const source = path.join(ROOT, filename);
  const destination = path.join(LEGAL_DIR, filename);
  if (!fs.existsSync(source)) {
    throw new Error(`Canonical legal document is missing: ${filename}`);
  }
  fs.copyFileSync(source, destination);
  if (!fs.readFileSync(source).equals(fs.readFileSync(destination))) {
    throw new Error(`Public legal copy differs from canonical ${filename}.`);
  }
}

for (const filePath of [TEMPLATE, INDEX_PATH, COMPACT_BRAND_DAY, COMPACT_BRAND_NIGHT]) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required Legal page input is missing: ${path.relative(ROOT, filePath)}`);
  }
}

const languageIndex = readJson(INDEX_PATH);
const languages = languageIndex.languages.filter(language => language.enabled === true);
const catalogs = Object.fromEntries(languages.map(language => {
  const source = readJson(path.join(ROOT, "site", "lang", `${language.code}.json`));
  if (source.meta?.version !== VERSION) {
    throw new Error(`${language.code}: catalog version is not ${VERSION}.`);
  }
  const subset = Object.fromEntries(REQUIRED_KEYS.map(key => {
    const value = source.translations?.[key];
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`${language.code}:${key} missing.`);
    }
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
for (const [marker, value] of [
  ["__LEGAL_DATA__", pageData],
  ["__COMPACT_BRAND_DAY__", fs.readFileSync(COMPACT_BRAND_DAY, "utf8").trim()],
  ["__COMPACT_BRAND_NIGHT__", fs.readFileSync(COMPACT_BRAND_NIGHT, "utf8").trim()]
]) {
  if (!output.includes(marker)) throw new Error(`Legal template marker missing: ${marker}`);
  output = output.replace(marker, value);
}
if (/__[A-Z0-9_]+__/.test(output)) throw new Error("Unresolved Legal page marker.");
fs.writeFileSync(OUTPUT, output, "utf8");

console.log(
  `Legal page PASS: ${languages.length} languages and ${LEGAL_FILES.length}/${LEGAL_FILES.length} byte-identical documents.`
);
