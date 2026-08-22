import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { launchBrowser } from "./browser-runtime.mjs";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(TEST_DIR, "..");
const APP_NAME = "site/index.html";
const STANDALONE_NAME = "site/downloads/loadcomposer-v1.3.0-standalone.html";
const RESULT_PATH = path.join(PROJECT_DIR, "i18n-results-v1.3.0.json");
const APP_HTML = fs.readFileSync(path.join(PROJECT_DIR, APP_NAME), "utf8");
const INDEX = JSON.parse(
  fs.readFileSync(path.join(PROJECT_DIR, "site/lang/index.json"), "utf8")
);
const ENABLED_CODES = ["it", "en", "de", "es", "fr", "pt", "nl"];
const CATALOGS = Object.fromEntries(ENABLED_CODES.map(code => [
  code,
  JSON.parse(fs.readFileSync(path.join(PROJECT_DIR, `site/lang/${code}.json`), "utf8"))
]));
const IT = CATALOGS.it;
const EN = CATALOGS.en;
const results = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function equal(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function renderCatalogMessage(code, key, variables = {}) {
  return CATALOGS[code].translations[key].replace(
    /\{([A-Za-z][A-Za-z0-9_]*)\}/g,
    (match, name) => Object.hasOwn(variables, name) ? String(variables[name]) : match
  );
}

async function test(name, callback) {
  const started = Date.now();
  try {
    const details = await callback();
    results.push({ name, status: "PASS", durationMs: Date.now() - started, details });
  } catch (error) {
    results.push({
      name,
      status: "FAIL",
      durationMs: Date.now() - started,
      error: error.stack || error.message
    });
    throw error;
  }
}

function scenarioFile(scenario, relativePath) {
  if (relativePath === APP_NAME) {
    return { status: 200, type: "text/html; charset=utf-8", body: APP_HTML };
  }
  relativePath = relativePath.replace(/^site\/(?=lang\/)/, "");
  if (relativePath === "lang/index.json") {
    return {
      status: 200,
      type: "application/json; charset=utf-8",
      body: JSON.stringify(INDEX)
    };
  }
  if (relativePath === "lang/it.json") {
    if (scenario === "it404") return { status: 404, type: "text/plain", body: "not found" };
    return {
      status: 200,
      type: "application/json; charset=utf-8",
      body: JSON.stringify(IT)
    };
  }
  if (relativePath === "lang/en.json") {
    if (scenario === "en404") return { status: 404, type: "text/plain", body: "not found" };
    if (scenario === "malformed") {
      return { status: 200, type: "application/json; charset=utf-8", body: "{\"meta\":" };
    }

    const catalog = structuredClone(EN);
    if (scenario === "missingkey") {
      delete catalog.translations["load.title"];
    }
    if (scenario === "malicious") {
      catalog.translations["load.title"] =
        '<img src=x onerror="window.__catalogXss=1">Catalog title';
      catalog.translations["vehicle.20dc.name"] =
        '</td></tr><script>window.__catalogXss=2</script>';
    }
    return {
      status: 200,
      type: "application/json; charset=utf-8",
      body: JSON.stringify(catalog)
    };
  }
  const catalogMatch = relativePath.match(/^lang\/([a-z]{2})\.json$/);
  if (catalogMatch && CATALOGS[catalogMatch[1]]) {
    if (scenario === `${catalogMatch[1]}404`) {
      return { status: 404, type: "text/plain", body: "not found" };
    }
    return {
      status: 200,
      type: "application/json; charset=utf-8",
      body: JSON.stringify(CATALOGS[catalogMatch[1]])
    };
  }
  return { status: 404, type: "text/plain", body: "not found" };
}

function normalFile(relativePath) {
  const safe = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  const absolute = path.resolve(PROJECT_DIR, safe);
  if (!absolute.startsWith(`${PROJECT_DIR}${path.sep}`) || !fs.existsSync(absolute)) {
    return { status: 404, type: "text/plain", body: "not found" };
  }
  const extension = path.extname(absolute);
  const type = extension === ".html"
    ? "text/html; charset=utf-8"
    : extension === ".json"
      ? "application/json; charset=utf-8"
      : "application/octet-stream";
  return { status: 200, type, body: fs.readFileSync(absolute) };
}

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
  let payload;
  const scenarioMatch = pathname.match(/^\/scenario\/([^/]+)\/(.+)$/);

  if (scenarioMatch) {
    payload = scenarioFile(scenarioMatch[1], scenarioMatch[2]);
  } else if (pathname.startsWith("/nested/app/")) {
    payload = normalFile(pathname.slice("/nested/app/".length));
  } else {
    payload = normalFile(pathname.replace(/^\/+/, ""));
  }

  response.writeHead(payload.status, {
    "Content-Type": payload.type,
    "Cache-Control": "no-store"
  });
  response.end(payload.body);
});

await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const base = `http://127.0.0.1:${address.port}`;
const browser = await launchBrowser(PROJECT_DIR);

async function openPage(url, options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport || { width: 1440, height: 900 },
    locale: options.locale || "en-GB",
    colorScheme: options.colorScheme || "light"
  });
  if (options.blockStorage) {
    await context.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        get() {
          throw new DOMException("blocked", "SecurityError");
        }
      });
    });
  }
  const page = await context.newPage();
  const errors = [];
  const requests = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("request", request => requests.push(request.url()));
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => (
    document.documentElement.dataset.i18nReady &&
    document.querySelectorAll("#resultsBody tr").length > 0
  ));
  return { context, page, errors, requests };
}

try {
  await test("Catalog JSON, parity, metadata, and future-language registry", async () => {
    const itKeys = Object.keys(IT.translations).sort();
    const enKeys = Object.keys(EN.translations).sort();
    equal(JSON.stringify(itKeys), JSON.stringify(enKeys), "it/en key parity");
    equal(itKeys.length, 530, "catalog key count");
    ENABLED_CODES.forEach(code => {
      equal(
        JSON.stringify(Object.keys(CATALOGS[code].translations).sort()),
        JSON.stringify(enKeys),
        `${code}/en key parity`
      );
    });
    const codes = INDEX.languages.map(language => language.code);
    equal(
      JSON.stringify(codes),
      JSON.stringify(["it", "en", "de", "es", "fr", "pt", "pl", "nl", "tr", "zh-Hans", "ar"]),
      "registered language codes"
    );
    equal(
      JSON.stringify(INDEX.languages.filter(language => language.enabled).map(language => language.code)),
      JSON.stringify(ENABLED_CODES),
      "enabled language codes"
    );
    assert(INDEX.languages.find(language => language.code === "ar").dir === "rtl", "Arabic must be RTL");
    assert(
      JSON.stringify(fs.readdirSync(path.join(PROJECT_DIR, "site", "lang")).sort()) ===
        JSON.stringify(["de.json", "en.json", "es.json", "fr.json", "index.json", "it.json", "nl.json", "pt.json"]),
      "only enabled catalog files may exist"
    );
    return { keys: itKeys.length, codes };
  });

  await test("HTTP root publication", async () => {
    const app = await openPage(`${base}/${APP_NAME}`, { locale: "en-GB" });
    const state = await app.page.evaluate(() => ({
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      heading: document.querySelector("main h2").textContent,
      visible: getComputedStyle(document.body).visibility,
      catalogRequests: window.loadComposerI18n.diagnostics.requests
    }));
    equal(state.lang, "en", "root effective language");
    equal(state.dir, "ltr", "root direction");
    equal(state.heading, "Load data", "root English catalog");
    equal(state.visible, "visible", "root body visibility");
    equal(app.errors.length, 0, "root runtime errors");
    await app.context.close();
    return state;
  });

  await test("HTTP subfolder publication with relative paths", async () => {
    const app = await openPage(`${base}/nested/app/${APP_NAME}`, { locale: "it-IT" });
    const state = await app.page.evaluate(() => ({
      lang: document.documentElement.lang,
      heading: document.querySelector("main h2").textContent,
      requests: window.loadComposerI18n.diagnostics.requests
    }));
    equal(state.lang, "it", "subfolder effective language");
    equal(state.heading, "Dati carico", "subfolder Italian catalog");
    assert(
      state.requests.every(url => url.startsWith("./lang/")),
      "catalog URLs must remain relative"
    );
    equal(app.errors.length, 0, "subfolder runtime errors");
    await app.context.close();
    return state;
  });

  await test("Automatic regional-language resolution", async () => {
    const cases = [
      ["de-DE", "de"],
      ["es-ES", "es"],
      ["es-MX", "es"],
      ["fr-FR", "fr"],
      ["fr-CA", "fr"],
      ["pt-PT", "pt"],
      ["pt-BR", "pt"],
      ["nl-NL", "nl"],
      ["ja-JP", "en"]
    ];
    const records = [];
    for (const [browserLocale, expected] of cases) {
      const app = await openPage(`${base}/${APP_NAME}`, { locale: browserLocale });
      const state = await app.page.evaluate(() => ({
        lang: document.documentElement.lang,
        preference: window.loadComposerI18n.preference,
        heading: document.querySelector("main h2").textContent
      }));
      equal(state.lang, expected, `${browserLocale} resolved language`);
      equal(state.preference, "auto", `${browserLocale} automatic preference`);
      equal(
        state.heading,
        CATALOGS[expected].translations["load.title"],
        `${browserLocale} translated heading`
      );
      equal(app.errors.length, 0, `${browserLocale} runtime errors`);
      records.push({ browserLocale, expected, heading: state.heading });
      await app.context.close();
    }
    return records;
  });

  await test("New-language manual workflow, persistence, UI states, and fallback", async () => {
    const records = [];
    for (const code of ["de", "es", "fr", "pt", "nl"]) {
      const app = await openPage(`${base}/${APP_NAME}`, {
        locale: "en-GB",
        viewport: { width: 390, height: 844 }
      });
      await app.page.evaluate(language => window.loadComposerI18n.setLanguage(language), code);
      await app.page.waitForFunction(language => document.documentElement.lang === language, code);

      await app.page.click("#languageToggle");
      const languageMenu = await app.page.evaluate(() => ({
        open: document.getElementById("languageToggle").getAttribute("aria-expanded"),
        visible: Array.from(document.querySelectorAll("[data-language-value]"))
          .filter(option => !option.hidden)
          .map(option => option.dataset.languageValue),
        labels: Array.from(document.querySelectorAll("[data-language-value]"))
          .filter(option => !option.hidden)
          .map(option => option.textContent.trim())
      }));
      equal(languageMenu.open, "true", `${code} language menu open`);
      equal(
        JSON.stringify(languageMenu.visible),
        JSON.stringify(["auto", ...ENABLED_CODES]),
        `${code} enabled language options`
      );
      await app.page.keyboard.press("Escape");

      await app.page.selectOption("#loadMode", "mixed");
      await app.page.waitForFunction(() => (
        document.querySelectorAll("#mixedRows .mixed-row").length >= 2
      ));
      await app.page.selectOption("#loadMode", "single");
      await app.page.click("#singlePalletGroup [data-action='togglePicker']");
      equal(
        await app.page.getAttribute("#singlePalletGroup [data-action='togglePicker']", "aria-expanded"),
        "true",
        `${code} pallet picker open`
      );
      await app.page.keyboard.press("Escape");

      await app.page.fill("#quantity", "0");
      await app.page.waitForFunction(() => document.getElementById("formValidationMessage").textContent.length > 0);
      const invalidText = await app.page.textContent("#formValidationMessage");
      const quantityLabel = renderCatalogMessage(code, "validation.field.quantity", {
        prefix: CATALOGS[code].translations["validation.palletPrefix"]
      });
      assert(
        invalidText.includes(renderCatalogMessage(code, "validation.positiveInteger", {
          label: quantityLabel
        })),
        `${code} invalid-input message`
      );
      await app.page.fill("#quantity", "501");
      await app.page.waitForTimeout(20);
      const maximumText = await app.page.textContent("#formValidationMessage");
      assert(
        maximumText.includes(renderCatalogMessage(code, "validation.maximum", {
          label: quantityLabel,
          maximum: "500"
        })),
        `${code} 500-pallet limit`
      );

      await app.page.fill("#quantity", "10");
      await app.page.evaluate(language => {
        const group = document.getElementById("singlePalletGroup");
        selectPresetForGroup(group, "custom", false);
        group.querySelector("[data-field='length']").value = "1050";
        group.querySelector("[data-field='width']").value = "760";
        group.querySelector("[data-field='customName']").value = `CUSTOM-${language}`;
        updateGroupVisuals(group);
        calculate();
      }, code);
      assert(
        (await app.page.textContent("#singlePalletGroup [data-role='selectedSummary']"))
          .includes("CUSTOM-"),
        `${code} custom pallet name`
      );
      const fitsVisible = await app.page.evaluate(() => (
        document.body.innerText.includes(window.loadComposerI18n.t("status.fits"))
      ));
      await app.page.fill("#palletHeight", "5000");
      await app.page.waitForTimeout(20);
      const noLayoutVisible = await app.page.evaluate(() => (
        document.body.innerText.includes(window.loadComposerI18n.t("status.doesNotFit"))
      ));

      await app.page.click("#themeToggle");
      await app.page.click("[data-theme-value='dark']");
      equal(
        await app.page.getAttribute("html", "data-theme"),
        "dark",
        `${code} theme switch`
      );
      await app.page.click("#resetBtn");
      await app.page.waitForTimeout(20);
      const state = await app.page.evaluate(() => ({
        lang: document.documentElement.lang,
        title: document.title,
        technical: document.body.innerText.includes("⟦"),
        undefinedVisible: /\bundefined\b/.test(document.body.innerText),
        canvas: {
          width: document.getElementById("layoutCanvas").width,
          height: document.getElementById("layoutCanvas").height
        },
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
      }));
      equal(state.lang, code, `${code} manual language`);
      equal(state.title, "LoadComposer v1.3.0", `${code} document title`);
      assert(fitsVisible, `${code} FITS-equivalent result`);
      assert(noLayoutVisible, `${code} no-layout result`);
      equal(state.technical, false, `${code} technical keys`);
      equal(state.undefinedVisible, false, `${code} undefined text`);
      assert(state.canvas.width > 0 && state.canvas.height > 0, `${code} canvas`);
      equal(state.overflow, false, `${code} mobile overflow`);

      await app.page.reload({ waitUntil: "load" });
      await app.page.waitForFunction(language => (
        document.documentElement.dataset.i18nReady === "true" &&
        document.documentElement.lang === language &&
        document.querySelectorAll("#resultsBody tr").length > 0
      ), code);
      equal(
        await app.page.evaluate(() => window.loadComposerI18n.preference),
        code,
        `${code} persisted preference`
      );
      equal(app.errors.length, 0, `${code} workflow runtime errors`);
      await app.context.close();

      const fallback = await openPage(`${base}/scenario/${code}404/${APP_NAME}`, {
        locale: `${code}-${code.toUpperCase()}`
      });
      const fallbackState = await fallback.page.evaluate(() => ({
        lang: document.documentElement.lang,
        heading: document.querySelector("main h2").textContent
      }));
      equal(fallbackState.lang, "en", `${code} unavailable-catalog fallback language`);
      equal(fallbackState.heading, "Load data", `${code} unavailable-catalog fallback text`);
      await fallback.context.close();

      records.push({ code, ...state, fallback: fallbackState.lang });
    }
    return records;
  });

  await test("404 catalog uses Italian fallback", async () => {
    const app = await openPage(`${base}/scenario/en404/${APP_NAME}`, { locale: "en-GB" });
    const state = await app.page.evaluate(() => ({
      lang: document.documentElement.lang,
      heading: document.querySelector("main h2").textContent,
      errors: window.loadComposerI18n.diagnostics.errors
    }));
    equal(state.lang, "it", "404 fallback effective language");
    equal(state.heading, "Dati carico", "404 fallback text");
    assert(state.errors.some(error => error.code === "en"), "English HTTP error must be recorded");
    await app.context.close();
    return state;
  });

  await test("Malformed JSON uses Italian fallback", async () => {
    const app = await openPage(`${base}/scenario/malformed/${APP_NAME}`, { locale: "en-GB" });
    const state = await app.page.evaluate(() => ({
      lang: document.documentElement.lang,
      heading: document.querySelector("main h2").textContent,
      errors: window.loadComposerI18n.diagnostics.errors
    }));
    equal(state.lang, "it", "malformed fallback effective language");
    equal(state.heading, "Dati carico", "malformed fallback text");
    assert(
      state.errors.some(error => error.message.includes("invalid JSON")),
      "invalid JSON must be recorded"
    );
    await app.context.close();
    return state;
  });

  await test("Missing English key falls back to Italian, never undefined", async () => {
    const app = await openPage(`${base}/scenario/missingkey/${APP_NAME}`, { locale: "en-GB" });
    const state = await app.page.evaluate(() => ({
      lang: document.documentElement.lang,
      heading: document.querySelector("main h2").textContent,
      body: document.body.innerText,
      technical: window.loadComposerI18n.t("test.missing.technical.key")
    }));
    equal(state.lang, "en", "missing-key active language");
    equal(state.heading, "Dati carico", "missing-key Italian fallback");
    assert(!/\bundefined\b/.test(state.body), "visible text must not contain undefined");
    equal(state.technical, "⟦test.missing.technical.key⟧", "technical-key fallback");
    await app.context.close();
    return state;
  });

  await test("Missing Italian catalog falls back to English", async () => {
    const app = await openPage(`${base}/scenario/it404/${APP_NAME}`, { locale: "it-IT" });
    const state = await app.page.evaluate(() => ({
      lang: document.documentElement.lang,
      heading: document.querySelector("main h2").textContent
    }));
    equal(state.lang, "en", "English fallback effective language");
    equal(state.heading, "Load data", "English fallback text");
    await app.context.close();
    return state;
  });

  await test("Catalog cache avoids repeat requests", async () => {
    const app = await openPage(`${base}/${APP_NAME}`, { locale: "en-GB" });
    const state = await app.page.evaluate(async () => {
      const before = window.loadComposerI18n.diagnostics.requests.slice();
      await window.loadComposerI18n.setLanguage("en", { persist: false });
      await window.loadComposerI18n.setLanguage("it", { persist: false });
      await window.loadComposerI18n.setLanguage("en", { persist: false });
      return {
        before,
        after: window.loadComposerI18n.diagnostics.requests.slice()
      };
    });
    equal(state.after.length, state.before.length, "cached request count");
    await app.context.close();
    return state;
  });

  await test("Unregistered language and path traversal are rejected before URL construction", async () => {
    const app = await openPage(`${base}/${APP_NAME}`, { locale: "en-GB" });
    const state = await app.page.evaluate(async () => {
      const api = window.loadComposerI18n;
      const before = api.diagnostics.requests.slice();
      const failures = [];
      for (const code of ["../en", "en/../../it", "xx", "zh-Hans.json"]) {
        try {
          await api.loadCatalog(code);
        } catch (error) {
          failures.push(code);
        }
      }
      await api.setLanguage("../en", { persist: false });
      return {
        before,
        after: api.diagnostics.requests.slice(),
        failures,
        preference: api.preference
      };
    });
    equal(state.failures.length, 4, "rejected language count");
    equal(state.after.length, state.before.length, "path traversal request count");
    equal(state.preference, "auto", "invalid preference fallback");
    assert(!state.after.some(url => url.includes("..")), "requests must not contain traversal");
    await app.context.close();
    return state;
  });

  await test("Catalog strings are inert text, not executable HTML", async () => {
    const app = await openPage(`${base}/scenario/malicious/${APP_NAME}`, { locale: "en-GB" });
    const state = await app.page.evaluate(() => ({
      heading: document.querySelector("main h2").textContent,
      xss: window.__catalogXss || 0,
      injectedImages: document.querySelectorAll('main h2 img').length,
      injectedScripts: document.querySelectorAll('#resultsBody script').length,
      firstVehicle: document.querySelector("#resultsBody tr:not(.vehicle-group-row) td")?.textContent
    }));
    assert(state.heading.includes("<img"), "malicious heading must be shown as literal text");
    equal(state.xss, 0, "catalog XSS execution");
    equal(state.injectedImages, 0, "catalog image injection");
    equal(state.injectedScripts, 0, "catalog script injection");
    assert(state.firstVehicle.includes("<script>"), "malicious vehicle must remain literal text");
    await app.context.close();
    return state;
  });

  await test("Language selector accessibility and persistence", async () => {
    const app = await openPage(`${base}/${APP_NAME}`, {
      locale: "en-GB",
      viewport: { width: 390, height: 844 }
    });
    await app.page.focus("#languageToggle");
    await app.page.keyboard.press("ArrowDown");
    equal(await app.page.getAttribute("#languageToggle", "aria-expanded"), "true", "menu open state");
    await app.page.keyboard.press("End");
    await app.page.keyboard.press("Enter");
    await app.page.waitForFunction(() => document.documentElement.lang === "nl");
    await app.page.evaluate(() => window.loadComposerI18n.setLanguage("it"));
    await app.page.waitForFunction(() => document.documentElement.lang === "it");
    await app.page.reload({ waitUntil: "load" });
    await app.page.waitForFunction(() => (
      document.documentElement.dataset.i18nReady === "true" &&
      document.querySelectorAll("#resultsBody tr").length > 0
    ));
    const state = await app.page.evaluate(() => ({
      lang: document.documentElement.lang,
      preference: window.loadComposerI18n.preference,
      label: document.getElementById("languageCurrentLabel").textContent,
      targetHeight: document.getElementById("languageToggle").getBoundingClientRect().height,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      visibleOptions: Array.from(document.querySelectorAll("[data-language-value]"))
        .filter(option => !option.hidden)
        .map(option => option.dataset.languageValue)
    }));
    equal(state.lang, "it", "persisted language");
    equal(state.preference, "it", "persisted preference");
    assert(state.targetHeight >= 44, "language control touch target");
    equal(state.overflow, false, "mobile global overflow");
    equal(
      JSON.stringify(state.visibleOptions),
      JSON.stringify(["auto", ...ENABLED_CODES]),
      "selectable languages"
    );
    await app.context.close();
    return state;
  });

  await test("Blocked localStorage does not block the app", async () => {
    const app = await openPage(`${base}/${APP_NAME}`, {
      locale: "en-GB",
      blockStorage: true
    });
    const state = await app.page.evaluate(async languages => {
      const resolved = [];
      for (const language of languages) {
        await window.loadComposerI18n.setLanguage(language);
        resolved.push(document.documentElement.lang);
      }
      return {
        lang: document.documentElement.lang,
        resolved,
        rows: document.querySelectorAll("#resultsBody tr").length,
        ready: document.documentElement.dataset.i18nReady
      };
    }, ["de", "es", "fr", "pt", "nl"]);
    equal(state.lang, "nl", "blocked-storage final language switch");
    equal(
      JSON.stringify(state.resolved),
      JSON.stringify(["de", "es", "fr", "pt", "nl"]),
      "blocked-storage language sequence"
    );
    assert(state.rows > 0, "blocked-storage results");
    equal(state.ready, "true", "blocked-storage readiness");
    await app.context.close();
    return state;
  });

  await test("Standalone works through file:// without lang requests", async () => {
    const isolatedDir = fs.mkdtempSync(path.join(os.tmpdir(), "loadcomposer-standalone-"));
    const isolatedPath = path.join(isolatedDir, STANDALONE_NAME);
    fs.mkdirSync(path.dirname(isolatedPath), { recursive: true });
    fs.copyFileSync(path.join(PROJECT_DIR, STANDALONE_NAME), isolatedPath);
    try {
      const app = await openPage(pathToFileURL(isolatedPath).href, { locale: "en-GB" });
      const state = await app.page.evaluate(async languages => {
        const headings = {};
        for (const language of languages) {
          await window.loadComposerI18n.setLanguage(language, { persist: false });
          headings[language] = document.querySelector("main h2").textContent;
        }
        return {
          lang: document.documentElement.lang,
          headings,
          embedded: window.loadComposerI18n.diagnostics.embedded,
          requests: window.loadComposerI18n.diagnostics.requests,
          rows: document.querySelectorAll("#resultsBody tr").length
        };
      }, ENABLED_CODES);
      equal(state.lang, "nl", "standalone final language");
      ENABLED_CODES.forEach(code => {
        equal(
          state.headings[code],
          CATALOGS[code].translations["load.title"],
          `standalone ${code} translation`
        );
      });
      equal(state.embedded, true, "standalone embedded mode");
      equal(state.requests.length, 0, "standalone catalog requests");
      assert(state.rows > 0, "standalone results");
      equal(app.errors.length, 0, "standalone runtime errors");
      await app.context.close();
      return state;
    } finally {
      fs.rmSync(isolatedDir, { recursive: true, force: true });
    }
  });

  await test("Standalone embeds the exact canonical JSON catalogs", async () => {
    const standalone = fs.readFileSync(path.join(PROJECT_DIR, STANDALONE_NAME), "utf8");
    const match = standalone.match(
      /<script id="loadcomposer-embedded-i18n" type="application\/json">([\s\S]*?)<\/script>/
    );
    assert(match, "embedded catalog payload must exist");
    const payload = JSON.parse(match[1]);
    equal(payload.standalone, true, "standalone marker");
    equal(JSON.stringify(payload.index), JSON.stringify(INDEX), "embedded index source");
    ENABLED_CODES.forEach(code => {
      equal(
        JSON.stringify(payload.catalogs[code]),
        JSON.stringify(CATALOGS[code]),
        `embedded ${code} source`
      );
    });
    assert(
      APP_HTML.includes(
        '<script id="loadcomposer-embedded-i18n" type="application/json">{"standalone":false}</script>'
      ),
      "modular source must not embed catalogs"
    );
    return { keys: Object.keys(payload.catalogs.it.translations).length };
  });

  await test("Translation DOM writes avoid innerHTML", async () => {
    const assignments = [...APP_HTML.matchAll(/\.innerHTML\s*=\s*([^;]+);/g)]
      .map(match => match[1].trim());
    assert(
      assignments.every(value => (
        value.startsWith("orientationDiagramSvg(") ||
        value.startsWith("mixedGroupHtml(")
      )),
      `unexpected innerHTML assignment: ${assignments.join(" | ")}`
    );
    assert(
      !APP_HTML.includes('"/lang/') &&
      !APP_HTML.includes("'/lang/") &&
      !APP_HTML.includes("../lang/"),
      "language paths must remain relative and traversal-free"
    );
    return { staticMarkupAssignments: assignments.length };
  });

  await test("No remote dependencies in modular or standalone output", async () => {
    const standalone = fs.readFileSync(path.join(PROJECT_DIR, STANDALONE_NAME), "utf8");
    const externalDependencies = [];
    const authorizedLinks = [];
    for (const [name, html] of [[APP_NAME, APP_HTML], [STANDALONE_NAME, standalone]]) {
      for (const match of html.matchAll(/(?:^|\s)(src|href)\s*=\s*["']([^"']+)["']/gi)) {
        const attribute = match[1].toLowerCase();
        const value = match[2];
        if (!/^(?:https?:)?\/\//i.test(value)) continue;
        if (
          attribute === "href" &&
          (
            value === "https://github.com/LoadComposer/loadcomposer" ||
            value === "https://github.com/LoadComposer/loadcomposer/discussions" ||
            value === "https://github.com/LoadComposer/loadcomposer/issues/new?template=bug.yml" ||
            value === "https://loadcomposer.com/" ||
            value === "https://loadcomposer.com/legal/" ||
            value === "https://loadcomposer.com/legal/LICENSE" ||
            value === "https://loadcomposer.com/legal/PRIVACY.md" ||
            value === "https://loadcomposer.com/downloads/"
          )
        ) {
          authorizedLinks.push({ name, value });
        } else {
          externalDependencies.push({ name, attribute, value });
        }
      }
    }
    equal(externalDependencies.length, 0, "external dependency count");
    equal(authorizedLinks.length, 12, "authorized navigation/canonical link count");
    return { externalDependencies, authorizedLinks };
  });
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  fs.writeFileSync(RESULT_PATH, `${JSON.stringify({
    version: "1.3.0",
    generatedAt: new Date().toISOString(),
    passed: results.filter(result => result.status === "PASS").length,
    failed: results.filter(result => result.status === "FAIL").length,
    results
  }, null, 2)}\n`);
}

console.log(`i18n modular suite: ${results.length}/${results.length} PASS`);
