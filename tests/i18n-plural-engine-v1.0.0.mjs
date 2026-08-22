import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launchBrowser } from "./browser-runtime.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const STANDALONE = path.join(ROOT, "site/downloads/loadcomposer-v1.3.0-standalone.html");
const TEMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), "loadcomposer-plurals-"));
const SYNTHETIC_HTML = path.join(TEMP_ROOT, "synthetic-plural-engine.html");
const EMBEDDED_PATTERN =
  /(<script id="loadcomposer-embedded-i18n" type="application\/json">)([\s\S]*?)(<\/script>)/;

const CASES = {
  pl: {
    locale: "pl-PL",
    values: [0, 1, 2, 5, 12, 22, 25, 101, 1.5],
    expected: ["many", "one", "few", "many", "many", "few", "many", "many", "other"]
  },
  ar: {
    locale: "ar",
    values: [0, 1, 2, 3, 7, 11, 99, 100, 102],
    expected: ["zero", "one", "two", "few", "few", "many", "many", "other", "other"]
  }
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function syntheticCatalog(code, base) {
  const translations = { ...base.translations };
  for (const category of ["zero", "one", "two", "few", "many", "other"]) {
    translations[`synthetic.form.${category}`] = `${category.toUpperCase()} {count}`;
  }
  translations["synthetic.fallback.one"] = "WRONG-ONE {count}";
  translations["synthetic.fallback.other"] = "FALLBACK-OTHER {count}";
  translations["synthetic.missing.one"] = "WRONG-ONE {count}";
  return {
    meta: {
      code,
      name: code === "pl" ? "Polski synthetic" : "العربية synthetic",
      dir: code === "ar" ? "rtl" : "ltr",
      version: "1.0.0-test"
    },
    translations
  };
}

const source = fs.readFileSync(STANDALONE, "utf8");
const match = source.match(EMBEDDED_PATTERN);
assert(match, "embedded i18n payload not found");
const embedded = JSON.parse(match[2]);

for (const [code, fixture] of Object.entries(CASES)) {
  const metadata = embedded.index.languages.find(language => language.code === code);
  assert(metadata, `${code} must remain registered in the application manifest`);
  metadata.enabled = true;
  metadata.locale = fixture.locale;
  embedded.catalogs[code] = syntheticCatalog(code, embedded.catalogs.en);
}

const payload = JSON.stringify(embedded)
  .replace(/</g, "\\u003c")
  .replace(/\u2028/g, "\\u2028")
  .replace(/\u2029/g, "\\u2029");
fs.writeFileSync(
  SYNTHETIC_HTML,
  source.replace(EMBEDDED_PATTERN, `$1${payload}$3`),
  "utf8"
);

const browser = await launchBrowser(ROOT);
try {
  for (const [code, fixture] of Object.entries(CASES)) {
    const context = await browser.newContext({ locale: fixture.locale });
    await context.addInitScript(language => {
      localStorage.setItem("loadcomposer.language", language);
      localStorage.setItem("loadcomposer.theme", "light");
    }, code);
    const page = await context.newPage();
    await page.goto(pathToFileURL(SYNTHETIC_HTML).href, { waitUntil: "load" });
    await page.waitForFunction(language => (
      document.documentElement.dataset.i18nReady === "true" &&
      document.documentElement.lang === language
    ), code);

    const actual = await page.evaluate(values => values.map(count => ({
      count,
      category: new Intl.PluralRules(window.loadComposerI18n.locale()).select(count),
      rendered: window.loadComposerI18n.plural(
        "synthetic.form",
        count,
        { count: String(count) }
      )
    })), fixture.values);

    actual.forEach((record, index) => {
      const expectedCategory = fixture.expected[index];
      assert(
        record.category === expectedCategory,
        `${code}/${record.count}: Intl category ${record.category}, expected ${expectedCategory}`
      );
      assert(
        record.rendered === `${expectedCategory.toUpperCase()} ${record.count}`,
        `${code}/${record.count}: engine rendered ${record.rendered}`
      );
    });

    const fallback = await page.evaluate(() => ({
      other: window.loadComposerI18n.plural(
        "synthetic.fallback",
        2,
        { count: "2" }
      ),
      missing: window.loadComposerI18n.plural(
        "synthetic.missing",
        2,
        { count: "2" }
      )
    }));
    assert(
      fallback.other === "FALLBACK-OTHER 2",
      `${code}: a missing category must fall back to other`
    );
    assert(
      fallback.missing.includes("synthetic.missing") &&
      fallback.missing.includes(".other") &&
      !fallback.missing.includes("WRONG-ONE"),
      `${code}: missing category+other must expose a technical marker, never use one`
    );

    const distinct = new Set(actual.map(record => record.rendered.split(" ")[0]));
    const expectedDistinct = new Set(fixture.expected);
    assert(
      distinct.size === expectedDistinct.size,
      `${code}: plural categories were collapsed`
    );
    await context.close();
    console.log(
      `PASS ${code}: ${fixture.values.length} values, ` +
      `${[...expectedDistinct].join(", ")}`
    );
  }
} finally {
  await browser.close();
  fs.rmSync(TEMP_ROOT, { recursive: true, force: true });
}

console.log("Synthetic Polish/Arabic plural engine suite PASS.");
