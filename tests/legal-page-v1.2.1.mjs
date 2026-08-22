import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";
import { launchBrowser } from "./browser-runtime.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const PAGE = path.join(ROOT, "site", "legal", "index.html");
const CODES = ["it", "en", "de", "es", "fr", "pt", "nl"];
const THEMES = ["light", "dark", "auto"];
const VIEWPORTS = [
  [2560, 1440], [1920, 1080], [1600, 900], [1366, 768], [1280, 800],
  [1024, 768], [768, 1024], [390, 844], [375, 812], [320, 568]
];
const VISUAL_OUTPUT = process.env.LEGAL_VISUAL_OUTPUT ? path.resolve(process.env.LEGAL_VISUAL_OUTPUT) : null;
if (VISUAL_OUTPUT) fs.mkdirSync(VISUAL_OUTPUT, { recursive: true });
const LEGAL_HASHES = {
  LICENSE: "07c8360fa6840b24641b2e9443c82d8001ad8c4d32bc58f43fb04f64a1d080d0",
  "LICENSE.it.md": "8b47a93a962da349910972a6125ec7ce1997b07fb951e2c316b10c187c875266",
  NOTICE: "0b1322e4517d715f95e44d63d576b663b2b9c65e8e97caed2fc6e7cae86e266f",
  "TRADEMARKS.md": "5c69098cb03d6033200b42edb4eefb1b9a0a0542e91f05a57ec58c61f5337490",
  "COMMERCIAL-LICENSING.md": "59444c07f5f7286d1e032211b7e933aa9ab357e6d0a66e7c1022e673c3a6e3c4",
  "PRIVACY.md": "13ba9454ebab8c3bbaf195e978c3b2e7a4cf0f69bc0d732bd622e35d811f5e28",
  "SECURITY.md": "41f27656c06f55d1ad059f9ec7738bb2ee884270ccae86b0f4d6316a93efe076"
};
const sha256 = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const source = fs.readFileSync(PAGE, "utf8");

for (const [name, expected] of Object.entries(LEGAL_HASHES)) {
  const canonical = path.join(ROOT, name);
  const published = path.join(ROOT, "site", "legal", name);
  assert.equal(sha256(canonical), expected, `${name}: canonical hash.`);
  assert.equal(sha256(published), expected, `${name}: published hash.`);
  assert.ok(fs.readFileSync(canonical).equals(fs.readFileSync(published)), `${name}: byte identity.`);
}

const dom = new JSDOM(source);
try {
  const document = dom.window.document;
  const data = JSON.parse(document.getElementById("loadcomposer-legal-data").textContent);
  assert.equal(data.version, "1.3.0");
  assert.deepEqual(data.languages.map(language => language.code), CODES);
  assert.deepEqual(Object.keys(data.catalogs), CODES);
  assert.ok(document.querySelector("header .brand"), "Secondary-page brand missing.");
  assert.ok(document.querySelector("#languageSelect"), "Legal language selector missing.");
  assert.ok(document.querySelector("#themeSelect"), "Legal theme selector missing.");
  assert.equal(document.querySelectorAll("main img.logo").length, 0, "Legacy dominant centered logo remains.");
  for (const name of Object.keys(LEGAL_HASHES)) {
    const link = document.querySelector(`a[href="./${name}"]`);
    assert.ok(link, `${name}: document link missing.`);
    assert.equal(link.hasAttribute("download"), false, `${name}: must open inline.`);
  }
  assert.ok(source.includes('localStorage.getItem("loadcomposer.theme")'));
  assert.ok(source.includes('localStorage.setItem("loadcomposer.theme", preference)'));
  assert.ok(source.includes('localStorage.getItem("loadcomposer.language")'));
  assert.ok(source.includes('localStorage.setItem("loadcomposer.language", code)'));
} finally {
  dom.window.close();
}

const browser = await launchBrowser(ROOT);
let localeThemeScenarios = 0;
let responsiveScenarios = 0;
try {
  for (const code of CODES) {
    const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "site", "lang", `${code}.json`), "utf8")).translations;
    for (const theme of THEMES) {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        locale: code === "en" ? "en-GB" : `${code}-${code.toUpperCase()}`,
        colorScheme: theme === "auto" ? "dark" : "light"
      });
      await context.addInitScript(({ language, preference }) => {
        localStorage.setItem("loadcomposer.language", language);
        localStorage.setItem("loadcomposer.theme", preference);
      }, { language: code, preference: theme });
      const page = await context.newPage();
      const errors = [];
      const remote = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
      page.on("request", request => { if (/^https?:/i.test(request.url())) remote.push(request.url()); });
      await page.goto(pathToFileURL(PAGE).href, { waitUntil: "load" });
      await page.waitForFunction(() => document.documentElement.dataset.i18nReady === "true");
      const state = await page.evaluate(() => ({
        language: document.documentElement.lang,
        theme: document.documentElement.dataset.theme,
        preference: document.documentElement.dataset.themePreference,
        title: document.querySelector("h1").textContent.trim(),
        documents: document.querySelector("h2").textContent.trim(),
        controlling: document.querySelector(".notice strong").textContent.trim(),
        languageLabel: document.querySelector('label[for="languageSelect"]')?.textContent || document.querySelector("#languageSelect").closest("label").querySelector("span").textContent.trim(),
        themeLabel: document.querySelector("#themeSelect").closest("label").querySelector("span").textContent.trim(),
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      }));
      assert.deepEqual(errors, [], `${code}/${theme}: browser errors.`);
      assert.deepEqual(remote, [], `${code}/${theme}: automatic remote requests.`);
      assert.equal(state.language, code);
      assert.equal(state.preference, theme);
      assert.equal(state.theme, theme === "auto" ? "dark" : theme);
      assert.equal(state.title, catalog["legal.title"]);
      assert.equal(state.documents, catalog["legal.documents.title"]);
      assert.equal(state.controlling, catalog["legal.notice.controlling"]);
      assert.equal(state.languageLabel, catalog["downloads.language.label"]);
      assert.equal(state.themeLabel, catalog["downloads.theme.label"]);
      assert.equal(state.pageOverflow, false, `${code}/${theme}: page overflow.`);
      await page.locator("#languageSelect").focus();
      assert.equal(await page.evaluate(() => document.activeElement?.id), "languageSelect");
      await context.close();
      localeThemeScenarios += 1;
    }
  }

  for (const [width, height] of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width, height }, colorScheme: "dark", locale: "de-DE" });
    await context.addInitScript(() => {
      localStorage.setItem("loadcomposer.language", "de");
      localStorage.setItem("loadcomposer.theme", "dark");
    });
    const page = await context.newPage();
    await page.goto(pathToFileURL(PAGE).href, { waitUntil: "load" });
    await page.waitForFunction(() => document.documentElement.dataset.i18nReady === "true");
    const state = await page.evaluate(() => {
      const shell = document.querySelector(".shell").getBoundingClientRect();
      const main = document.querySelector("main").getBoundingClientRect();
      return {
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        shellWidth: shell.width,
        mainWidth: main.width,
        centered: Math.abs(shell.left - (innerWidth - shell.right)) <= 2,
        controlsClipped: [...document.querySelectorAll("select")].some(element => element.scrollWidth > element.clientWidth + 1)
      };
    });
    assert.equal(state.pageOverflow, false, `${width}x${height}: Legal page overflow.`);
    assert.ok(state.shellWidth <= 1080.5, `${width}x${height}: shell too wide.`);
    assert.ok(state.mainWidth <= 860.5, `${width}x${height}: reading column too wide.`);
    assert.equal(state.centered, true, `${width}x${height}: shell not centered.`);
    assert.equal(state.controlsClipped, false, `${width}x${height}: selector clipped.`);
    await context.close();
    responsiveScenarios += 1;
  }

  if (VISUAL_OUTPUT) {
    for (const sample of [
      { code: "it", preference: "light", colorScheme: "light", width: 1920, height: 1080 },
      { code: "en", preference: "dark", colorScheme: "dark", width: 1920, height: 1080 },
      { code: "de", preference: "auto", colorScheme: "dark", width: 1366, height: 768 },
      { code: "de", preference: "dark", colorScheme: "dark", width: 390, height: 844 }
    ]) {
      const context = await browser.newContext({
        viewport: { width: sample.width, height: sample.height },
        locale: sample.code === "en" ? "en-GB" : `${sample.code}-${sample.code.toUpperCase()}`,
        colorScheme: sample.colorScheme
      });
      await context.addInitScript(({ language, preference }) => {
        localStorage.setItem("loadcomposer.language", language);
        localStorage.setItem("loadcomposer.theme", preference);
      }, { language: sample.code, preference: sample.preference });
      const page = await context.newPage();
      await page.goto(pathToFileURL(PAGE).href, { waitUntil: "load" });
      await page.waitForFunction(() => document.documentElement.dataset.i18nReady === "true");
      await page.screenshot({
        path: path.join(
          VISUAL_OUTPUT,
          `legal-${sample.code}-${sample.preference}-${sample.width}x${sample.height}.png`
        ),
        fullPage: true
      });
      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.log(
  `Legal v1.3.0 PASS: 7/7 byte-identical documents, ${localeThemeScenarios} language/theme scenarios, ` +
  `${responsiveScenarios}/${responsiveScenarios} responsive viewports, shared preferences and zero remote requests.`
);
