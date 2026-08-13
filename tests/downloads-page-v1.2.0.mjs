import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";
import { launchBrowser } from "./browser-runtime.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SITE = path.join(ROOT, "site");
const PAGE = path.join(SITE, "downloads", "index.html");
const HTML_NAME = "loadcomposer-v1.2.0-standalone.html";
const ZIP_NAME = "loadcomposer-v1.2.0-standalone.zip";
const HTML_PATH = path.join(SITE, "downloads", HTML_NAME);
const ZIP_PATH = path.join(SITE, "downloads", ZIP_NAME);
const CODES = ["it", "en", "de", "es", "fr", "pt", "nl"];
const THEMES = ["light", "dark", "auto"];
const VISUAL_CODES = ["it", "en"];
const VISUAL_THEMES = ["light", "dark"];
const VISUAL_VIEWPORTS = [
  { name: "desktop-1920", width: 1920, height: 1080, sideBySide: true },
  { name: "laptop-1366", width: 1366, height: 768, sideBySide: true },
  { name: "tablet-900", width: 900, height: 900, sideBySide: true },
  { name: "mobile-390", width: 390, height: 844, sideBySide: false },
  { name: "mobile-375", width: 375, height: 812, sideBySide: false },
  { name: "mobile-320", width: 320, height: 780, sideBySide: false }
];
const VISUAL_OUTPUT = process.env.DOWNLOADS_VISUAL_OUTPUT
  ? path.resolve(process.env.DOWNLOADS_VISUAL_OUTPUT)
  : null;

if (VISUAL_OUTPUT) fs.mkdirSync(VISUAL_OUTPUT, { recursive: true });

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function parseCssColor(value) {
  const match = String(value).match(
    /^rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/i
  );
  assert.ok(match, `Unsupported computed color: ${value}`);
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] === undefined ? 1 : Number(match[4])
  };
}

function relativeLuminance(value) {
  const { r, g, b } = parseCssColor(value);
  const linear = component => {
    const channel = component / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function contrastRatio(foreground, background) {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function effectiveBackground(background, fallback) {
  return parseCssColor(background).a === 0 ? fallback : background;
}

function assertContrast(foreground, background, minimum, label) {
  const ratio = contrastRatio(foreground, background);
  assert.ok(ratio >= minimum, `${label}: contrast ${ratio.toFixed(2)} is below ${minimum.toFixed(1)}.`);
  return ratio;
}

async function focusByKeyboard(page, selector) {
  await page.evaluate(() => document.activeElement?.blur());
  for (let index = 0; index < 20; index += 1) {
    await page.keyboard.press("Tab");
    if (await page.evaluate(target => document.activeElement?.matches(target), selector)) return;
  }
  assert.fail(`Keyboard focus did not reach ${selector}.`);
}

assert.ok(fs.existsSync(PAGE), "site/downloads/index.html missing.");
assert.ok(fs.existsSync(HTML_PATH), `${HTML_NAME} missing.`);
assert.ok(fs.existsSync(ZIP_PATH), `${ZIP_NAME} missing.`);
for (const version of ["1.0.0", "1.1.0"]) {
  for (const suffix of [".html", ".html.sha256", ".zip", ".zip.sha256"]) {
    assert.ok(
      fs.existsSync(path.join(SITE, "downloads", `loadcomposer-v${version}-standalone${suffix}`)),
      `Historical artifact removed: v${version}${suffix}`
    );
  }
}

const source = read(PAGE);
const dom = new JSDOM(source);
try {
  const document = dom.window.document;
  assert.equal(document.querySelector('link[rel="canonical"]')?.href, "https://loadcomposer.com/downloads/");
  assert.equal(document.querySelector('meta[name="robots"]')?.content, "index,follow,max-image-preview:large");
  assert.equal(document.querySelector('meta[property="og:url"]')?.content, "https://loadcomposer.com/downloads/");
  const data = JSON.parse(document.getElementById("loadcomposer-downloads-data").textContent);
  assert.equal(data.version, "1.2.0");
  assert.deepEqual(data.languages.map(language => language.code), CODES);
  assert.deepEqual(Object.keys(data.catalogs), CODES);
  const htmlLink = document.querySelector(`a[download="${HTML_NAME}"]`);
  const zipLink = document.querySelector(`a[download="${ZIP_NAME}"]`);
  assert.equal(htmlLink?.getAttribute("href"), `./${HTML_NAME}`);
  assert.equal(zipLink?.getAttribute("href"), `./${ZIP_NAME}`);
  const releases = document.querySelector('a[href="https://github.com/LoadComposer/loadcomposer/releases"]');
  assert.equal(releases?.target, "_blank");
  assert.deepEqual(releases?.rel.trim().split(/\s+/).sort(), ["noopener", "noreferrer"]);
  assert.equal(document.querySelector('[data-checksum="html"]')?.textContent.trim(), sha256(HTML_PATH));
  assert.equal(document.querySelector('[data-checksum="zip"]')?.textContent.trim(), sha256(ZIP_PATH));
  assert.ok(document.querySelector("details > summary"), "Accessible integrity details missing.");
  for (const selector of [
    "script[src]",
    "link[rel='stylesheet'][href]",
    "link[rel='icon'][href]",
    "img[src]",
    "source[src]",
    "iframe[src]"
  ]) {
    assert.equal(document.querySelectorAll(selector).length, 0, `Remote/runtime dependency selector found: ${selector}`);
  }
} finally {
  dom.window.close();
}

for (const token of ["google-analytics", "googletagmanager", "gtag(", "plausible", "matomo", "hotjar", "telemetry"]) {
  assert.equal(source.toLowerCase().includes(token), false, `Tracking marker found: ${token}`);
}

const headers = read(path.join(SITE, "_headers"));
assert.match(headers, /\/downloads\/\n\s+Cache-Control: public, max-age=0, must-revalidate/);
assert.match(headers, /\/downloads\/index\.html\n\s+Cache-Control: public, max-age=0, must-revalidate/);
for (const version of ["1.0.0", "1.1.0", "1.2.0"]) {
  for (const suffix of [".html", "", ".html.sha256", ".zip", ".zip.sha256"]) {
    const escaped = `/downloads/loadcomposer-v${version}-standalone${suffix}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(headers, new RegExp(`${escaped}\\n\\s+Cache-Control: public, max-age=31536000, immutable`));
  }
}
assert.equal(/^\/downloads\/\*$/m.test(headers), false, "Broad /downloads/* rule is forbidden.");
const sitemap = read(path.join(SITE, "sitemap.xml"));
assert.ok(sitemap.includes("<loc>https://loadcomposer.com/downloads/</loc>"));
assert.equal(sitemap.includes("loadcomposer-v1.2.0-standalone"), false, "Versioned artifacts entered sitemap.");

const browser = await launchBrowser(ROOT);
let scenarios = 0;
let visualScenarios = 0;
let screenshots = 0;
try {
  for (const code of CODES) {
    const catalog = JSON.parse(read(path.join(SITE, "lang", `${code}.json`))).translations;
    for (const theme of THEMES) {
      const context = await browser.newContext({
        viewport: { width: 320, height: 780 },
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
      page.on("console", message => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("request", request => {
        if (/^https?:/i.test(request.url())) remote.push(request.url());
      });
      await page.goto(pathToFileURL(PAGE).href, { waitUntil: "load" });
      await page.waitForFunction(() => document.documentElement.dataset.i18nReady === "true");
      const state = await page.evaluate(() => {
        const online = document.querySelector(".card.primary");
        const offline = document.querySelectorAll(".card")[1];
        const onlineStyle = getComputedStyle(online);
        const htmlLink = document.querySelector('a[download$="standalone.html"]');
        const zipLink = document.querySelector('a[download$="standalone.zip"]');
        return {
          language: document.documentElement.lang,
          theme: document.documentElement.dataset.theme,
          themePreference: document.documentElement.dataset.themePreference,
          title: document.querySelector("h1").textContent.trim(),
          recommendation: document.querySelector(".recommendation").textContent.trim(),
          onlineTitle: online.querySelector("h2").textContent.trim(),
          onlineBadge: online.querySelector(".badge").textContent.trim(),
          offlineTitle: offline.querySelector("h2").textContent.trim(),
          offlineBadge: offline.querySelector(".badge").textContent.trim(),
          offlineBody: offline.querySelector(".body").textContent.trim(),
          primaryBorder: parseFloat(onlineStyle.borderTopWidth),
          htmlName: htmlLink.getAttribute("download"),
          zipName: zipLink.getAttribute("download"),
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
          cardOverflow: [...document.querySelectorAll(".card")].some(card => card.scrollWidth > card.clientWidth + 1)
        };
      });
      assert.deepEqual(errors, [], `${code}/${theme}: browser errors.`);
      assert.deepEqual(remote, [], `${code}/${theme}: automatic remote requests.`);
      assert.equal(state.language, code);
      assert.equal(state.themePreference, theme);
      assert.equal(state.theme, theme === "auto" ? "dark" : theme);
      assert.equal(state.title, catalog["downloads.title"]);
      assert.equal(state.recommendation, catalog["downloads.recommendation"]);
      assert.equal(state.onlineTitle, catalog["downloads.online.title"]);
      assert.equal(state.onlineBadge, catalog["downloads.online.badge"]);
      assert.equal(state.offlineTitle, catalog["downloads.offline.title"]);
      assert.equal(state.offlineBadge, catalog["downloads.offline.badge"]);
      assert.equal(state.offlineBody, catalog["downloads.offline.body"]);
      assert.ok(state.primaryBorder >= 2, `${code}/${theme}: online card is not visually primary.`);
      assert.equal(state.htmlName, HTML_NAME);
      assert.equal(state.zipName, ZIP_NAME);
      assert.equal(state.overflow, false, `${code}/${theme}: document overflow at 320px.`);
      assert.equal(state.cardOverflow, false, `${code}/${theme}: card overflow at 320px.`);
      await context.close();
      scenarios += 1;
    }
  }

  for (const code of VISUAL_CODES) {
    for (const theme of VISUAL_THEMES) {
      for (const viewport of VISUAL_VIEWPORTS) {
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          locale: code === "en" ? "en-GB" : "it-IT",
          colorScheme: theme
        });
        await context.addInitScript(({ language, preference }) => {
          localStorage.setItem("loadcomposer.language", language);
          localStorage.setItem("loadcomposer.theme", preference);
        }, { language: code, preference: theme });
        const page = await context.newPage();
        const errors = [];
        const remote = [];
        page.on("pageerror", error => errors.push(error.message));
        page.on("console", message => {
          if (message.type() === "error") errors.push(message.text());
        });
        page.on("request", request => {
          if (/^https?:/i.test(request.url())) remote.push(request.url());
        });
        await page.goto(pathToFileURL(PAGE).href, { waitUntil: "load" });
        await page.waitForFunction(() => document.documentElement.dataset.i18nReady === "true");

        const initial = await page.evaluate(() => {
          const online = document.querySelector(".card.primary");
          const offline = document.querySelectorAll(".card")[1];
          const onlineBadge = online.querySelector(".badge");
          const offlineBadge = offline.querySelector(".badge");
          const htmlLink = document.querySelector('a[download$="standalone.html"]');
          const zipLink = document.querySelector('a[download$="standalone.zip"]');
          const styles = element => {
            const style = getComputedStyle(element);
            return {
              color: style.color,
              background: style.backgroundColor,
              borderColor: style.borderTopColor,
              borderWidth: parseFloat(style.borderTopWidth)
            };
          };
          const rect = element => {
            const box = element.getBoundingClientRect();
            return { top: box.top, right: box.right, bottom: box.bottom, left: box.left };
          };
          return {
            language: document.documentElement.lang,
            theme: document.documentElement.dataset.theme,
            online: rect(online),
            offline: rect(offline),
            onlineBackground: getComputedStyle(online).backgroundColor,
            offlineBackground: getComputedStyle(offline).backgroundColor,
            onlineBadge: styles(onlineBadge),
            offlineBadge: styles(offlineBadge),
            html: styles(htmlLink),
            zip: styles(zipLink),
            overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
            cardOverflow: [...document.querySelectorAll(".card")].some(card => card.scrollWidth > card.clientWidth + 1),
            integrityOpen: document.querySelector("details").open
          };
        });

        const label = `${code}/${theme}/${viewport.name}`;
        assert.deepEqual(errors, [], `${label}: browser errors.`);
        assert.deepEqual(remote, [], `${label}: automatic remote requests.`);
        assert.equal(initial.language, code, `${label}: wrong language.`);
        assert.equal(initial.theme, theme, `${label}: wrong theme.`);
        assert.equal(initial.overflow, false, `${label}: document overflow.`);
        assert.equal(initial.cardOverflow, false, `${label}: card overflow.`);
        assert.equal(initial.integrityOpen, false, `${label}: integrity details must be closed by default.`);

        if (viewport.sideBySide) {
          assert.ok(Math.abs(initial.online.top - initial.offline.top) <= 2, `${label}: desktop cards are not aligned.`);
          assert.ok(initial.offline.left > initial.online.right, `${label}: desktop cards are not side by side.`);
        } else {
          assert.ok(initial.offline.top > initial.online.bottom, `${label}: mobile cards are not stacked.`);
        }

        assert.equal(parseCssColor(initial.onlineBadge.background).a, 1, `${label}: Recommended badge is not filled.`);
        assert.equal(parseCssColor(initial.offlineBadge.background).a, 0, `${label}: Offline badge is not outline.`);
        assert.notEqual(initial.onlineBadge.background, initial.offlineBadge.background, `${label}: badge hierarchy missing.`);
        assertContrast(
          initial.onlineBadge.color,
          initial.onlineBadge.background,
          4.5,
          `${label}: Recommended badge text`
        );
        assertContrast(
          initial.offlineBadge.color,
          effectiveBackground(initial.offlineBadge.background, initial.offlineBackground),
          4.5,
          `${label}: Offline badge text`
        );
        assertContrast(
          initial.offlineBadge.borderColor,
          initial.offlineBackground,
          3,
          `${label}: Offline badge border`
        );
        assertContrast(
          initial.html.color,
          effectiveBackground(initial.html.background, initial.offlineBackground),
          4.5,
          `${label}: HTML button text`
        );
        assertContrast(
          initial.zip.color,
          effectiveBackground(initial.zip.background, initial.offlineBackground),
          4.5,
          `${label}: ZIP button text`
        );
        assert.notEqual(initial.html.background, initial.zip.background, `${label}: HTML and ZIP controls lack hierarchy.`);
        if (theme === "dark") {
          assertContrast(initial.zip.borderColor, initial.offlineBackground, 3, `${label}: ZIP border`);
        }

        if (VISUAL_OUTPUT && ["laptop-1366", "mobile-390"].includes(viewport.name)) {
          await page.screenshot({
            path: path.join(VISUAL_OUTPUT, `downloads-${code}-${theme}-${viewport.name}.png`),
            fullPage: true
          });
          screenshots += 1;
        }

        const zip = page.locator('a[download$="standalone.zip"]');
        const html = page.locator('a[download$="standalone.html"]');
        await zip.hover();
        const zipHover = await zip.evaluate(element => {
          const style = getComputedStyle(element);
          return { color: style.color, background: style.backgroundColor, borderColor: style.borderTopColor };
        });
        assertContrast(
          zipHover.color,
          effectiveBackground(zipHover.background, initial.offlineBackground),
          4.5,
          `${label}: ZIP hover text`
        );
        assertContrast(zipHover.borderColor, initial.offlineBackground, 3, `${label}: ZIP hover border`);

        await focusByKeyboard(page, 'a[download$="standalone.zip"]');
        const zipFocus = await zip.evaluate(element => {
          const style = getComputedStyle(element);
          return {
            focused: element === document.activeElement,
            focusVisible: element.matches(":focus-visible"),
            outlineStyle: style.outlineStyle,
            outlineWidth: parseFloat(style.outlineWidth)
          };
        });
        assert.equal(zipFocus.focused, true, `${label}: ZIP keyboard focus missing.`);
        assert.equal(zipFocus.focusVisible, true, `${label}: ZIP focus is not visibly keyboard-triggered.`);
        assert.notEqual(zipFocus.outlineStyle, "none", `${label}: ZIP focus outline missing.`);
        assert.ok(zipFocus.outlineWidth >= 3, `${label}: ZIP focus outline is too thin.`);

        await zip.hover();
        await page.mouse.down();
        const zipActive = await zip.evaluate(element => {
          const style = getComputedStyle(element);
          return { color: style.color, background: style.backgroundColor, borderColor: style.borderTopColor };
        });
        assertContrast(
          zipActive.color,
          effectiveBackground(zipActive.background, initial.offlineBackground),
          4.5,
          `${label}: ZIP active text`
        );
        assertContrast(zipActive.borderColor, initial.offlineBackground, 3, `${label}: ZIP active border`);
        await page.mouse.move(1, 1);
        await page.mouse.up();

        await html.hover();
        const htmlHover = await html.evaluate(element => {
          const style = getComputedStyle(element);
          return { color: style.color, background: style.backgroundColor };
        });
        assertContrast(
          htmlHover.color,
          effectiveBackground(htmlHover.background, initial.offlineBackground),
          4.5,
          `${label}: HTML hover text`
        );
        await focusByKeyboard(page, 'a[download$="standalone.html"]');
        const htmlFocus = await html.evaluate(element => {
          const style = getComputedStyle(element);
          return {
            focused: element === document.activeElement,
            focusVisible: element.matches(":focus-visible"),
            outlineStyle: style.outlineStyle,
            outlineWidth: parseFloat(style.outlineWidth)
          };
        });
        assert.equal(htmlFocus.focused, true, `${label}: HTML keyboard focus missing.`);
        assert.equal(htmlFocus.focusVisible, true, `${label}: HTML focus is not visibly keyboard-triggered.`);
        assert.notEqual(htmlFocus.outlineStyle, "none", `${label}: HTML focus outline missing.`);
        assert.ok(htmlFocus.outlineWidth >= 3, `${label}: HTML focus outline is too thin.`);

        await context.close();
        visualScenarios += 1;
      }
    }
  }
} finally {
  await browser.close();
}

console.log(
  `Download page PASS: ${scenarios}/${scenarios} file:// mobile locale/theme scenarios plus ` +
  `${visualScenarios}/${visualScenarios} focused visual/accessibility scenarios and ${screenshots} screenshots; ` +
  "Recommended filled, Offline outlined, ZIP active/readable in every state, responsive layout preserved, " +
  "exact HTML/ZIP/SHA-256, no overflow or remote request."
);
