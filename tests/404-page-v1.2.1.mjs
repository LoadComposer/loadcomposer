import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { launchBrowser } from "./browser-runtime.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SITE = path.join(ROOT, "site");
const PAGE = path.join(SITE, "404.html");
const CODES = ["it", "en", "de", "es", "fr", "pt", "nl"];
const LOCALES = { it: "it-IT", en: "en-GB", de: "de-DE", es: "es-ES", fr: "fr-FR", pt: "pt-PT", nl: "nl-NL" };
const THEMES = ["light", "dark", "auto"];
const VIEWPORTS = [
  { width: 2560, height: 1440 },
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 375, height: 812 },
  { width: 320, height: 568 }
];
const NESTED_PATHS = [
  "/does-not-exist",
  "/foo/bar",
  "/downloads/does-not-exist",
  "/legal/does-not-exist"
];
const VISUAL_OUTPUT = process.env.LOADCOMPOSER_404_VISUAL_OUTPUT
  ? path.resolve(process.env.LOADCOMPOSER_404_VISUAL_OUTPUT)
  : null;
if (VISUAL_OUTPUT) fs.mkdirSync(VISUAL_OUTPUT, { recursive: true });

function catalog(code) {
  return JSON.parse(fs.readFileSync(path.join(SITE, "lang", `${code}.json`), "utf8")).translations;
}

function mime(file) {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".json")) return "application/json; charset=utf-8";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".png")) return "image/png";
  return "text/plain; charset=utf-8";
}

async function serve() {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    let target = path.join(SITE, pathname);
    if (pathname.endsWith("/")) target = path.join(target, "index.html");
    const safe = target.startsWith(SITE);
    if (safe && fs.existsSync(target) && fs.statSync(target).isFile()) {
      response.writeHead(200, { "content-type": mime(target) });
      response.end(fs.readFileSync(target));
      return;
    }
    response.writeHead(404, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    });
    response.end(fs.readFileSync(PAGE));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return server;
}

async function open404(browser, base, { code, preference, width, height, pathname = "/does-not-exist", systemDark = true }) {
  const context = await browser.newContext({
    viewport: { width, height },
    locale: LOCALES[code],
    colorScheme: systemDark ? "dark" : "light"
  });
  await context.addInitScript(({ language, theme }) => {
    localStorage.setItem("loadcomposer.language", language);
    localStorage.setItem("loadcomposer.theme", theme);
  }, { language: code, theme: preference });
  const page = await context.newPage();
  const errors = [];
  const remote = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", request => {
    const requested = request.url();
    if (/^https?:/i.test(requested) && !requested.startsWith(base)) remote.push(requested);
  });
  const response = await page.goto(`${base}${pathname}`, { waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.dataset.i18nReady === "true");
  assert.equal(response.status(), 404, `${pathname}: HTTP status.`);
  const significantErrors = errors.filter(message => (
    !/Failed to load resource: the server responded with a status of 404 \(Not Found\)/.test(message)
  ));
  assert.deepEqual(significantErrors, [], `${pathname}/${code}/${preference}: significant console errors.`);
  assert.deepEqual(remote, [], `${pathname}/${code}/${preference}: remote requests.`);
  return { context, page };
}

const htmlFiles = [];
(function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".html")) htmlFiles.push(path.relative(SITE, full).split(path.sep).join("/"));
  }
})(SITE);
htmlFiles.sort();
assert.deepEqual(
  htmlFiles,
  [
    "404.html",
    "downloads/index.html",
    "downloads/loadcomposer-v1.0.0-standalone.html",
    "downloads/loadcomposer-v1.1.0-standalone.html",
    "downloads/loadcomposer-v1.2.0-standalone.html",
    "downloads/loadcomposer-v1.2.1-standalone.html",
    "index.html",
    "legal/index.html"
  ],
  "Unexpected public HTML file or hidden page shell."
);
const pageShells = ["index.html", "downloads/index.html", "legal/index.html", "404.html"];
assert.equal(pageShells.length, 4, "Public page-shell census changed.");
const sitemap = fs.readFileSync(path.join(SITE, "sitemap.xml"), "utf8");
assert.deepEqual(
  [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]),
  ["https://loadcomposer.com/", "https://loadcomposer.com/downloads/", "https://loadcomposer.com/legal/"],
  "Sitemap page-shell inventory changed."
);
assert.doesNotMatch(sitemap, /404\.html|\/404(?:<|\/)/, "404 entered sitemap.");
const headers = fs.readFileSync(path.join(SITE, "_headers"), "utf8");
assert.match(headers, /^\/404\.html\n\s+Cache-Control: no-store$/m, "404 no-store header missing.");
const source = fs.readFileSync(PAGE, "utf8");
assert.match(source, /<meta name="robots" content="noindex,follow"\s*\/>/, "404 noindex missing.");
assert.doesNotMatch(source, /(?:src|href)="https?:\/\//i, "404 contains a remote runtime resource.");
assert.ok(source.includes('href="/"') && source.includes('href="/downloads/"') && source.includes('href="/legal/"'), "Root-relative recovery links missing.");

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await launchBrowser(ROOT);
let languageThemeScenarios = 0;
let responsiveScenarios = 0;
let nestedScenarios = 0;
try {
  for (const code of CODES) {
    const translations = catalog(code);
    for (const preference of THEMES) {
      const systemDark = preference === "auto";
      const app = await open404(browser, base, {
        code,
        preference,
        width: 1366,
        height: 768,
        systemDark
      });
      const state = await app.page.evaluate(() => ({
        lang: document.documentElement.lang,
        preference: document.documentElement.dataset.themePreference,
        theme: document.documentElement.dataset.theme,
        title: document.title,
        description: document.querySelector('meta[name="description"]').content,
        themeColor: document.querySelector('meta[name="theme-color"]').content,
        heading: document.querySelector("h1").textContent.trim(),
        body: document.querySelector(".description").textContent.trim(),
        navigationAria: document.querySelector(".actions").getAttribute("aria-label"),
        brandAria: document.querySelector(".brand").getAttribute("aria-label"),
        languageLabel: document.querySelector('label:has(#languageSelect) span').textContent.trim(),
        themeLabel: document.querySelector('label:has(#themeSelect) span').textContent.trim(),
        themeOptions: [...document.querySelectorAll("#themeSelect option")].map(option => option.textContent.trim()),
        languageValues: [...document.querySelectorAll("#languageSelect option")].map(option => option.value),
        hrefs: [...document.querySelectorAll(".actions a")].map(anchor => anchor.getAttribute("href")),
        landmarks: ["header", "main", "footer"].map(selector => Boolean(document.querySelector(selector))),
        h1Count: document.querySelectorAll("h1").length,
        statusHidden: document.querySelector(".status").getAttribute("aria-hidden"),
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
      }));
      const expectedTheme = preference === "auto" ? "dark" : preference;
      assert.equal(state.lang, code, `${code}/${preference}: language.`);
      assert.equal(state.preference, preference, `${code}/${preference}: theme preference.`);
      assert.equal(state.theme, expectedTheme, `${code}/${preference}: resolved theme.`);
      assert.equal(state.themeColor, expectedTheme === "dark" ? "#050D16" : "#F4F5F2", `${code}/${preference}: theme-color.`);
      assert.equal(state.title, translations["404.meta.title"], `${code}/${preference}: title.`);
      assert.equal(state.description, translations["404.meta.description"], `${code}/${preference}: meta description.`);
      assert.equal(state.heading, translations["404.title"], `${code}/${preference}: heading.`);
      assert.equal(state.body, translations["404.description"], `${code}/${preference}: description.`);
      assert.equal(state.navigationAria, translations["404.navigationAria"], `${code}/${preference}: nav aria.`);
      assert.equal(state.brandAria, translations["downloads.brandHomeAria"], `${code}/${preference}: brand aria.`);
      assert.equal(state.languageLabel, translations["downloads.language.label"], `${code}/${preference}: language label.`);
      assert.equal(state.themeLabel, translations["downloads.theme.label"], `${code}/${preference}: theme label.`);
      assert.deepEqual(state.themeOptions, [
        translations["downloads.theme.auto"],
        translations["downloads.theme.light"],
        translations["downloads.theme.dark"]
      ], `${code}/${preference}: theme options.`);
      assert.deepEqual(state.languageValues, CODES, `${code}/${preference}: enabled languages.`);
      assert.deepEqual(state.hrefs, ["/", "/downloads/", "/legal/"], `${code}/${preference}: navigation.`);
      assert.deepEqual(state.landmarks, [true, true, true], `${code}/${preference}: landmarks.`);
      assert.equal(state.h1Count, 1, `${code}/${preference}: heading hierarchy.`);
      assert.equal(state.statusHidden, "true", `${code}/${preference}: visual status accessibility.`);
      assert.equal(state.pageOverflow, false, `${code}/${preference}: horizontal overflow.`);

      const visualKey = `${code}-${preference}`;
      if (VISUAL_OUTPUT && ["it-light", "it-dark", "it-auto", "en-light", "en-dark", "de-dark"].includes(visualKey)) {
        await app.page.screenshot({ path: path.join(VISUAL_OUTPUT, `404-${visualKey}-1366x768.png`), fullPage: true });
      }
      await app.context.close();
      languageThemeScenarios += 1;
    }
  }

  for (const viewport of VIEWPORTS) {
    const app = await open404(browser, base, {
      code: "de",
      preference: "dark",
      width: viewport.width,
      height: viewport.height
    });
    await app.page.focus(".button.primary");
    const state = await app.page.evaluate(() => {
      const inside = element => {
        const box = element.getBoundingClientRect();
        return box.left >= -1 && box.right <= innerWidth + 1;
      };
      const focus = getComputedStyle(document.activeElement);
      return {
        pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        topbarInside: inside(document.querySelector(".topbar")),
        controlsInside: inside(document.querySelector(".controls")),
        cardInside: inside(document.querySelector(".card")),
        footerInside: inside(document.querySelector("footer")),
        clippedText: [...document.querySelectorAll("h1, p, a, label, option")].some(element => (
          element.scrollWidth > element.clientWidth + 1 && getComputedStyle(element).whiteSpace === "nowrap"
        )),
        actionHeights: [...document.querySelectorAll(".actions a")].map(anchor => anchor.getBoundingClientRect().height),
        focusOutline: focus.outlineStyle !== "none" && parseFloat(focus.outlineWidth) >= 3
      };
    });
    assert.equal(state.pageOverflow, false, `${viewport.width}x${viewport.height}: page overflow.`);
    assert.equal(state.topbarInside, true, `${viewport.width}x${viewport.height}: header outside viewport.`);
    assert.equal(state.controlsInside, true, `${viewport.width}x${viewport.height}: selectors outside viewport.`);
    assert.equal(state.cardInside, true, `${viewport.width}x${viewport.height}: card outside viewport.`);
    assert.equal(state.footerInside, true, `${viewport.width}x${viewport.height}: footer outside viewport.`);
    assert.equal(state.clippedText, false, `${viewport.width}x${viewport.height}: clipped text.`);
    assert.ok(state.actionHeights.every(height => height >= 44), `${viewport.width}x${viewport.height}: short action target.`);
    assert.equal(state.focusOutline, true, `${viewport.width}x${viewport.height}: focus indicator.`);
    if (VISUAL_OUTPUT) {
      await app.page.screenshot({
        path: path.join(VISUAL_OUTPUT, `404-responsive-de-dark-${viewport.width}x${viewport.height}.png`),
        fullPage: true
      });
    }
    await app.context.close();
    responsiveScenarios += 1;
  }

  for (const pathname of NESTED_PATHS) {
    const app = await open404(browser, base, {
      code: "it",
      preference: "light",
      width: 1024,
      height: 768,
      pathname,
      systemDark: false
    });
    const links = await app.page.evaluate(() => ({
      home: document.querySelector('.actions a[href="/"]').href,
      downloads: document.querySelector('.actions a[href="/downloads/"]').href,
      legal: document.querySelector('.actions a[href="/legal/"]').href,
      favicon: document.querySelector('link[rel="icon"]').href
    }));
    assert.equal(links.home, `${base}/`, `${pathname}: home URL.`);
    assert.equal(links.downloads, `${base}/downloads/`, `${pathname}: Download URL.`);
    assert.equal(links.legal, `${base}/legal/`, `${pathname}: Legal URL.`);
    assert.equal(links.favicon, `${base}/assets/loadcomposer-favicon.svg`, `${pathname}: favicon URL.`);
    await app.context.close();
    nestedScenarios += 1;
  }

  const fallbackContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    javaScriptEnabled: false
  });
  const fallbackPage = await fallbackContext.newPage();
  const fallbackResponse = await fallbackPage.goto(`${base}/foo/bar`, { waitUntil: "load" });
  assert.equal(fallbackResponse.status(), 404, "No-script fallback status.");
  const fallback = await fallbackPage.evaluate(() => ({
    visible: getComputedStyle(document.body).visibility,
    heading: document.querySelector("h1").textContent.trim(),
    description: document.querySelector(".description").textContent.trim(),
    home: document.querySelector(".button.primary").textContent.trim(),
    href: document.querySelector(".button.primary").getAttribute("href"),
    languageOptions: document.querySelectorAll("#languageSelect option").length,
    pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
  }));
  assert.deepEqual(fallback, {
    visible: "visible",
    heading: "Page not found",
    description: "The requested address does not exist.",
    home: "Return to LoadComposer",
    href: "/",
    languageOptions: 7,
    pageOverflow: false
  }, "No-script English fallback.");
  await fallbackContext.close();

  const zoomApp = await open404(browser, base, {
    code: "en",
    preference: "light",
    width: 640,
    height: 900,
    systemDark: false
  });
  await zoomApp.page.evaluate(() => { document.documentElement.style.zoom = "2"; });
  const zoomOverflow = await zoomApp.page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  assert.equal(zoomOverflow, false, "200% zoom horizontal overflow.");
  await zoomApp.context.close();
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

console.log(
  `404 page v1.2.1 PASS: four exact public shells; ${languageThemeScenarios}/${languageThemeScenarios} language/theme, ` +
  `${responsiveScenarios}/${responsiveScenarios} responsive and ${nestedScenarios}/${nestedScenarios} nested-route scenarios; ` +
  "HTTP 404, root-relative links/assets, no-script fallback, noindex/no-store, focus, landmarks, zoom and zero remote requests."
);
