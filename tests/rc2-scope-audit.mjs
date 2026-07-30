import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASELINE = path.join(ROOT, "tests", "fixtures", "baseline-v1.0.0-rc.1");
const CURRENT_APP = path.join(ROOT, "site", "index.html");
const CURRENT_STANDALONE = path.join(
  ROOT,
  "site",
  "downloads",
  "loadcomposer-v1.0.0-rc.2-standalone.html"
);
const CODES = ["it", "en", "de", "es", "fr", "pt", "nl"];
const ALLOWED_NEW_KEYS = [
  "footer.license",
  "footer.privacy",
  "footer.legalInformation"
];

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function json(filePath) {
  return JSON.parse(read(filePath));
}

function body(source) {
  return source.match(/<body>[\s\S]*<\/body>/)?.[0] || "";
}

function styles(source) {
  return [...source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)]
    .map(match => match[1]);
}

function withoutAuthorizedFooterCss(source) {
  return source
    .replace(
      /\n    \.footer-links \{[\s\S]*?\n    \}\n\n    \.footer-link \{[\s\S]*?\n    \}\n\n    \.footer-link:hover \{[\s\S]*?\n    \}\n\n    \.footer-link:focus-visible \{[\s\S]*?\n    \}\n/g,
      ""
    )
    .replace(
      "      .github-link,\n      .footer-links {",
      "      .github-link {"
    );
}

function normalizedBody(source) {
  return body(source)
    .replace(/\n    <nav class="footer-links"[\s\S]*?<\/nav>/, "")
    .replaceAll("v1.0.0-rc.2", "v1.0.0-rc.1");
}

function scripts(source) {
  return [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)]
    .map(match => ({
      attributes: match[1].trim(),
      source: /id="loadcomposer-embedded-i18n"/.test(match[1])
        ? "EMBEDDED-I18N"
        : match[2]
    }));
}

const baselineModular = read(
  path.join(BASELINE, "loadcomposer-v1.0.0-rc.1.html")
);
const baselineStandalone = read(
  path.join(BASELINE, "loadcomposer-v1.0.0-rc.1-standalone.html")
);
const currentModular = read(CURRENT_APP);
const currentStandalone = read(CURRENT_STANDALONE);

assert.deepEqual(
  json(path.join(ROOT, "site", "lang", "index.json")),
  json(path.join(BASELINE, "lang", "index.json")),
  "Enabled-language index changed."
);

for (const code of CODES) {
  const oldCatalog = json(path.join(BASELINE, "lang", `${code}.json`));
  const catalog = json(path.join(ROOT, "site", "lang", `${code}.json`));
  assert.equal(catalog.meta.version, "1.0.0-rc.2", `${code}: wrong version.`);
  assert.equal(
    catalog.translations["meta.documentTitle"],
    "LoadComposer v1.0.0-rc.2",
    `${code}: wrong document title.`
  );
  assert.deepEqual(
    Object.keys(catalog.translations).filter(key => !ALLOWED_NEW_KEYS.includes(key)),
    Object.keys(oldCatalog.translations),
    `${code}: translation-key set changed outside the three legal-footer labels.`
  );
  for (const [key, value] of Object.entries(oldCatalog.translations)) {
    if (key === "meta.documentTitle") continue;
    assert.equal(catalog.translations[key], value, `${code}:${key} changed.`);
  }
  for (const key of ALLOWED_NEW_KEYS) {
    assert.equal(typeof catalog.translations[key], "string", `${code}:${key} missing.`);
    assert.ok(catalog.translations[key].trim(), `${code}:${key} empty.`);
  }
}

assert.deepEqual(
  styles(currentModular).map(withoutAuthorizedFooterCss),
  styles(baselineModular),
  "Application CSS changed outside the authorized legal-footer rules."
);
assert.deepEqual(scripts(currentModular), scripts(baselineModular), "Application JavaScript changed.");
assert.deepEqual(
  scripts(currentStandalone),
  scripts(baselineStandalone),
  "Standalone JavaScript changed."
);
assert.equal(
  normalizedBody(currentModular),
  body(baselineModular),
  "Application body changed outside version and authorized legal links."
);
assert.equal(
  normalizedBody(currentStandalone),
  body(baselineStandalone),
  "Standalone body changed outside version and authorized legal links."
);

for (const requiredMetadata of [
  'rel="canonical" href="https://loadcomposer.com/"',
  'property="og:url" content="https://loadcomposer.com/"',
  'name="description"',
  'name="robots"',
  'name="theme-color"'
]) {
  assert(currentModular.includes(requiredMetadata), `Missing metadata: ${requiredMetadata}`);
}

console.log(
  "RC.2 scope audit PASS: JavaScript, operational UI, geometry and print source are rc.1-identical; " +
  "differences are limited to version, legal source notice, legal-footer links and their translations."
);
