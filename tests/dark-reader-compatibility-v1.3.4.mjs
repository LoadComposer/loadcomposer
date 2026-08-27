import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";
import { launchBrowser } from "./browser-runtime.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SITE = path.join(ROOT, "site");
const VERSION = fs.readFileSync(path.join(ROOT, "VERSION"), "utf8").trim();
const RESULT = path.join(ROOT, `dark-reader-compatibility-results-v${VERSION}.json`);
const LOCK_SELECTOR = 'meta[name="darkreader-lock"]';
const LEGAL_FILES = [
  "LICENSE",
  "LICENSE.it.md",
  "NOTICE",
  "TRADEMARKS.md",
  "COMMERCIAL-LICENSING.md",
  "PRIVACY.md",
  "SECURITY.md"
];
const REQUIRED_CURRENT = [
  "site/index.html",
  "site/downloads/index.html",
  "site/404.html",
  "site/legal/index.html",
  "site/legal/license/index.html",
  "site/legal/notices/index.html",
  "site/legal/trademarks/index.html",
  "site/legal/commercial/index.html",
  "site/legal/privacy/index.html",
  "site/legal/security/index.html",
  `site/downloads/loadcomposer-v${VERSION}-standalone.html`
].sort();
const HISTORICAL_STANDALONE_SHA256 = {
  "loadcomposer-v1.0.0-standalone.html": "5221cd2629b63c3a1f6f5037165189a0d080d30bd9e72b5084f7525cb0d2e15a",
  "loadcomposer-v1.0.0-standalone.html.sha256": "a61aa3adb5a44be44540a1cb338e28a44726e1d7042804aba654238e0141d9c8",
  "loadcomposer-v1.0.0-standalone.zip": "7cc159250dcdd3edcf5d07746443ca450e21842ae4b6a228609d715b6373ce24",
  "loadcomposer-v1.0.0-standalone.zip.sha256": "a6a74f417ec7d0a3a79ec8df43a1d6715f229750cc7ac60cdac64d237606f926",
  "loadcomposer-v1.1.0-standalone.html": "7dd5847ea1ce06170808c3a39cd365e48af424fbb5b30d090036fc2d896440bf",
  "loadcomposer-v1.1.0-standalone.html.sha256": "46fb593e7259f876f31c3cd0825a19cae9759ed5597bad47805309057a3485f6",
  "loadcomposer-v1.1.0-standalone.zip": "66a178b0060b587dac61ff7a993987ab2061e9b9d5d8759e482c4b59518184e0",
  "loadcomposer-v1.1.0-standalone.zip.sha256": "b766b938bdfb3f7e9c8a5e1e4ee1e5bd09b8bb096143008d50aa8a8f2204a259",
  "loadcomposer-v1.2.0-standalone.html": "b6cb5321e003b58fa4429081b35c2fcdffa849a2e2b089f8781235692988523d",
  "loadcomposer-v1.2.0-standalone.html.sha256": "80e5086b93ff20f9a20c7d42258baf19ea6c2dad2a233930e7802bb2d93b25fe",
  "loadcomposer-v1.2.0-standalone.zip": "df8199becf2190428334add7924ecc05ad24ac2a81c3e7fd7a90c7eac5ee699d",
  "loadcomposer-v1.2.0-standalone.zip.sha256": "985d3f6c1451057313d91e4b405b3a85b26afaecf45fe1f14cae19ece0e9c677",
  "loadcomposer-v1.2.1-standalone.html": "ef89ada8d55a6273c5ae363216a959f7d4f4a369ef2fef8d0a3a9196a5396fb0",
  "loadcomposer-v1.2.1-standalone.html.sha256": "e3a6744ec8c662f4d7855772e7f97800730c56e2560c2b1bf1aee5dc0e6545ad",
  "loadcomposer-v1.2.1-standalone.zip": "04c8e665de693f31726342bca0b7fea84585bff3a51baf45688e4431b35f150c",
  "loadcomposer-v1.2.1-standalone.zip.sha256": "14cd82f131e2445f8ab0500c2aa18ada2329b55bd682030c1b09db5061c5a911",
  "loadcomposer-v1.3.0-standalone.html": "5333c014c43a3caf0afd6cc78aea127d424c42d9be6c832078612b30e0bf96de",
  "loadcomposer-v1.3.0-standalone.html.sha256": "12aeda56ce8af2519b2880e8b22bb32f52e331099bb2170e8ce6fb522fabbd47",
  "loadcomposer-v1.3.0-standalone.zip": "7b308cd35b0a43c0940f7083581abf3badc211fe4eab64383f026d1a45469561",
  "loadcomposer-v1.3.0-standalone.zip.sha256": "2bd29a9791fca5505b7514c5f6d839ba3980035fd4b925ee5afab771303587f6",
  "loadcomposer-v1.3.1-standalone.html": "1bc68958842532a2017547cd9362d5f9aa96c62f7b7eadb3ced1adaf27ad23b5",
  "loadcomposer-v1.3.1-standalone.html.sha256": "de450c9408173ed57e10aafb98f2276f9a71dd300ad98d3f229951e7e7860c16",
  "loadcomposer-v1.3.1-standalone.zip": "365e8e861f0faf984c1aaec7c11fb23df88f58812ee2df67391d89a725238884",
  "loadcomposer-v1.3.1-standalone.zip.sha256": "44ff1c50f3bb521d404009a4870918b817fb981fd0f0323be64bf192c70fbc64",
  "loadcomposer-v1.3.2-standalone.html": "8acaf11503acc5cba79d9e3117f6ee70531a2e1680777184608f36c9e2e2b539",
  "loadcomposer-v1.3.2-standalone.html.sha256": "7cde3fad21518da5d6c834df3c8400992e49d70a91fe76d1ca6503762c0a72db",
  "loadcomposer-v1.3.2-standalone.zip": "669cdff9be80e3b8e93b0cfd8d9b31625102cf47d84898b628220970c864478b",
  "loadcomposer-v1.3.2-standalone.zip.sha256": "470f11708e52ee812fef557bfdfcc752817406d38a2077dfa1b9b65c3fdf4b82",
  "loadcomposer-v1.3.3-standalone.html": "f9bdc7d837d8c7a38c401784bf608dd28869dc10cbae3d81c9b4d55fe951f12b",
  "loadcomposer-v1.3.3-standalone.html.sha256": "7c1de4495891dab823d74204030af41fca7dae27be508a3990bcf1d5c652ec94",
  "loadcomposer-v1.3.3-standalone.zip": "9fc33e9f22736ab8ea0c5b2331189d2ec7f6c9d3b9cb1b1b26fdcd476df69ebb",
  "loadcomposer-v1.3.3-standalone.zip.sha256": "5352be097dfbd8b15cf3fddceb927e3575f6cd3cf647df67f8a3311047398cef"
};

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function walkHtml(directory, relative = "site") {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    const child = `${relative}/${entry.name}`;
    if (entry.isDirectory()) return walkHtml(absolute, child);
    return entry.isFile() && entry.name.endsWith(".html") ? [child] : [];
  });
}

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), "utf8");
}

function isHistoricalStandalone(relative) {
  const match = relative.match(/^site\/downloads\/loadcomposer-v(.+)-standalone\.html$/);
  return Boolean(match && match[1] !== VERSION);
}

function themedCurrentHtml() {
  return walkHtml(SITE)
    .filter(relative => !isHistoricalStandalone(relative))
    .filter(relative => {
      const html = read(relative);
      return html.includes("loadcomposer.theme") && html.includes("prefers-color-scheme");
    })
    .sort();
}

function themeControlValues(document) {
  const menuValues = [...document.querySelectorAll("[data-theme-value]")]
    .map(element => element.getAttribute("data-theme-value"));
  if (menuValues.length) return menuValues.sort();
  return [...document.querySelectorAll("#themeSelect option")]
    .map(option => option.value)
    .sort();
}

function assertNoRemoteRuntimeResources(document, label) {
  for (const element of document.querySelectorAll(
    "script[src], link[rel='stylesheet'][href], link[rel='icon'][href], img[src], source[src], source[srcset], iframe[src]"
  )) {
    const value = element.getAttribute("src") || element.getAttribute("srcset") || element.getAttribute("href") || "";
    assert.equal(/^(?:https?:)?\/\//i.test(value), false, `${label}: remote runtime resource ${value}`);
  }
}

function bootstrapFor(document, label) {
  const scripts = [...document.scripts].filter(script =>
    script.textContent.includes("loadcomposer.theme") &&
    script.textContent.includes("prefers-color-scheme") &&
    script.textContent.includes("colorScheme")
  );
  assert.ok(scripts.length >= 1, `${label}: native theme bootstrap missing`);
  return scripts[0].textContent;
}

function executeBootstrap(source, preference, systemDark) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", error => errors.push(error));
  const dom = new JSDOM(`<!doctype html><html><head><meta name="theme-color"><script>${source}<\/script></head><body></body></html>`, {
    runScripts: "dangerously",
    url: "https://loadcomposer.theme.test/",
    virtualConsole,
    beforeParse(window) {
      window.localStorage.setItem("loadcomposer.theme", preference);
      window.matchMedia = () => ({
        matches: systemDark,
        media: "(prefers-color-scheme: dark)",
        addEventListener() {},
        removeEventListener() {}
      });
    }
  });
  try {
    assert.deepEqual(errors, [], "native theme bootstrap raised an error");
    return {
      preference: dom.window.document.documentElement.dataset.themePreference,
      resolved: dom.window.document.documentElement.dataset.theme,
      colorScheme: dom.window.document.documentElement.style.colorScheme
    };
  } finally {
    dom.window.close();
  }
}

function serve(root) {
  return new Promise(resolve => {
    const server = http.createServer((request, response) => {
      const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
      let relative = pathname.replace(/^\/+/, "");
      if (!relative || relative.endsWith("/")) relative += "index.html";
      const target = path.resolve(root, relative);
      if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
        response.writeHead(400).end("Bad request");
        return;
      }
      if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
        response.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
        return;
      }
      const types = { ".html": "text/html; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
      response.writeHead(200, { "Content-Type": types[path.extname(target)] || "application/octet-stream" });
      fs.createReadStream(target).pipe(response);
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

assert.equal(VERSION, "1.3.4", "Dark Reader test must be the current v1.3.4 regression");
const currentHtml = themedCurrentHtml();
assert.deepEqual(currentHtml, REQUIRED_CURRENT, "current native-theme entry-point discovery changed");

const staticChecks = [];
for (const relative of currentHtml) {
  const dom = new JSDOM(read(relative));
  try {
    const { document } = dom.window;
    const locks = document.querySelectorAll(LOCK_SELECTOR);
    assert.equal(locks.length, 1, `${relative}: expected exactly one Dark Reader lock`);
    assert.ok(document.head.contains(locks[0]), `${relative}: Dark Reader lock is outside head`);
    assert.equal(locks[0].hasAttribute("content"), false, `${relative}: unexpected content attribute`);
    assert.deepEqual(themeControlValues(document), ["auto", "dark", "light"], `${relative}: native theme controls`);
    assertNoRemoteRuntimeResources(document, relative);
    const bootstrap = bootstrapFor(document, relative);
    for (const scenario of [
      { preference: "light", systemDark: true, resolved: "light" },
      { preference: "dark", systemDark: false, resolved: "dark" },
      { preference: "auto", systemDark: false, resolved: "light" },
      { preference: "auto", systemDark: true, resolved: "dark" }
    ]) {
      assert.deepEqual(
        executeBootstrap(bootstrap, scenario.preference, scenario.systemDark),
        { preference: scenario.preference, resolved: scenario.resolved, colorScheme: scenario.resolved },
        `${relative}: ${scenario.preference}/${scenario.systemDark ? "dark" : "light"}`
      );
    }
    staticChecks.push({ path: relative, lockTags: locks.length, themeControls: "PASS", bootstrap: "PASS" });
  } finally {
    dom.window.close();
  }
}

for (const filename of LEGAL_FILES) {
  const canonical = fs.readFileSync(path.join(ROOT, filename));
  const raw = fs.readFileSync(path.join(SITE, "legal", "raw", filename));
  assert.ok(canonical.equals(raw), `site/legal/raw/${filename}: canonical bytes changed`);
  assert.equal(raw.includes(Buffer.from("darkreader-lock")), false, `site/legal/raw/${filename}: HTML tag injected`);
}

for (const [filename, expected] of Object.entries(HISTORICAL_STANDALONE_SHA256)) {
  assert.equal(sha256(path.join(SITE, "downloads", filename)), expected, `${filename}: historical artifact changed`);
}

const server = await serve(SITE);
const address = server.address();
const origin = `http://127.0.0.1:${address.port}`;
const browser = await launchBrowser(ROOT);
const browserScenarios = [];
const routes = ["/", "/downloads/", "/legal/", "/legal/license/?lang=en", "/404.html"];
const modes = [
  { preference: "light", colorScheme: "dark", resolved: "light" },
  { preference: "dark", colorScheme: "light", resolved: "dark" },
  { preference: "auto", colorScheme: "light", resolved: "light" },
  { preference: "auto", colorScheme: "dark", resolved: "dark" }
];

try {
  for (const route of routes) {
    for (const mode of modes) {
      const context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        locale: "en-GB",
        colorScheme: mode.colorScheme
      });
      await context.addInitScript(({ preference }) => {
        localStorage.setItem("loadcomposer.language", "en");
        localStorage.setItem("loadcomposer.theme", preference);
      }, { preference: mode.preference });
      const page = await context.newPage();
      const errors = [];
      const remoteRequests = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
      page.on("request", request => {
        const requested = new URL(request.url());
        if (requested.hostname !== "127.0.0.1") remoteRequests.push(request.url());
      });
      const response = await page.goto(`${origin}${route}`, { waitUntil: "load" });
      assert.ok(response && response.status() < 400, `${route}: direct load`);
      await page.waitForFunction(() => document.documentElement.dataset.i18nReady === "true");
      if (new URL(`${origin}${route}`).pathname === "/") {
        assert.equal(await page.evaluate(() => window.calculate()), true, `${route}: default calculation`);
      }
      const state = await page.evaluate(() => {
        const visible = element => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
        };
        return {
          lockTags: document.querySelectorAll('meta[name="darkreader-lock"]').length,
          preference: document.documentElement.dataset.themePreference,
          resolved: document.documentElement.dataset.theme,
          colorScheme: getComputedStyle(document.documentElement).colorScheme,
          dayLogos: [...document.querySelectorAll(".brand-logo.day")].filter(visible).length,
          nightLogos: [...document.querySelectorAll(".brand-logo.night")].filter(visible).length,
          bodyColor: getComputedStyle(document.body).color,
          bodyBackground: getComputedStyle(document.body).backgroundColor,
          controls: document.querySelectorAll("[data-theme-value], #themeSelect option").length,
          homeStructures: location.pathname === "/" ? {
            resultsTable: Boolean(document.querySelector(".results-table")),
            statusBadges: Boolean(document.querySelector(".status-badge, .badge")),
            diagrams: Boolean(document.querySelector(".orientation-diagram"))
          } : null
        };
      });
      assert.deepEqual(errors, [], `${route}/${mode.preference}/${mode.colorScheme}: browser errors`);
      assert.deepEqual(remoteRequests, [], `${route}/${mode.preference}/${mode.colorScheme}: remote requests`);
      assert.equal(state.lockTags, 1);
      assert.equal(state.preference, mode.preference);
      assert.equal(state.resolved, mode.resolved);
      assert.ok(state.colorScheme.includes(mode.resolved));
      assert.ok(state.controls >= 3);
      assert.ok(state.bodyColor && state.bodyBackground);
      assert.ok(mode.resolved === "dark" ? state.nightLogos >= 1 : state.dayLogos >= 1, `${route}: resolved logo`);
      if (state.homeStructures) assert.deepEqual(state.homeStructures, { resultsTable: true, statusBadges: true, diagrams: true });
      browserScenarios.push({ route, ...mode, status: "PASS" });
      await context.close();
    }
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: "light" });
  await context.addInitScript(() => {
    localStorage.setItem("loadcomposer.language", "en");
    localStorage.setItem("loadcomposer.theme", "auto");
  });
  const page = await context.newPage();
  await page.goto(origin, { waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.dataset.i18nReady === "true");
  const transitions = [];
  for (const [preference, resolved] of [["dark", "dark"], ["light", "light"], ["auto", "light"]]) {
    await page.click("#themeToggle");
    await page.click(`[data-theme-value="${preference}"]`);
    await page.waitForFunction(expected => document.documentElement.dataset.themePreference === expected, preference);
    const state = await page.evaluate(() => ({
      preference: document.documentElement.dataset.themePreference,
      resolved: document.documentElement.dataset.theme,
      stored: localStorage.getItem("loadcomposer.theme")
    }));
    assert.deepEqual(state, { preference, resolved, stored: preference });
    transitions.push(state);
  }
  await context.close();

  fs.writeFileSync(RESULT, `${JSON.stringify({
    version: VERSION,
    status: "PASS",
    mechanism: '<meta name="darkreader-lock">',
    currentThemedEntryPoints: currentHtml,
    currentThemedEntryPointCount: currentHtml.length,
    exactlyOnePerEntryPoint: true,
    rawLegalDocuments: `${LEGAL_FILES.length}/${LEGAL_FILES.length} byte-identical and unmodified`,
    historicalStandaloneArtifacts: `${Object.keys(HISTORICAL_STANDALONE_SHA256).length}/${Object.keys(HISTORICAL_STANDALONE_SHA256).length} byte-identical`,
    staticChecks,
    browserQa: {
      scenarios: browserScenarios,
      scenarioCount: browserScenarios.length,
      routes,
      modes: ["Light", "Dark", "Auto resolving Light", "Auto resolving Dark"],
      liveHomeTransition: transitions
    },
    otherExtensionWorkarounds: 0,
    remoteRuntimeDependenciesAdded: 0
  }, null, 2)}\n`, "utf8");

  console.log(
    `Dark Reader compatibility v${VERSION} PASS: ${currentHtml.length} current themed HTML entry points, ` +
    `exactly one lock each, ${browserScenarios.length}/${browserScenarios.length} browser scenarios, ` +
    `${Object.keys(HISTORICAL_STANDALONE_SHA256).length} historical artifacts unchanged.`
  );
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
