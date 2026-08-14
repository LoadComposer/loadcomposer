import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { JSDOM } from "jsdom";
import { launchBrowser } from "./browser-runtime.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SITE = path.join(ROOT, "site");
const DAY_ASSET = path.join(SITE, "assets", "loadcomposer-mobile-day.svg");
const NIGHT_ASSET = path.join(SITE, "assets", "loadcomposer-mobile-night.svg");
const SECONDARY = [
  { name: "downloads", route: "/downloads/", file: path.join(SITE, "downloads", "index.html") },
  { name: "legal", route: "/legal/", file: path.join(SITE, "legal", "index.html") },
  { name: "404", route: "/does-not-exist", file: path.join(SITE, "404.html") }
];
const VIEWPORTS = [
  { width: 2560, height: 1440 },
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 320, height: 568 }
];
const VISUAL_OUTPUT = process.env.FINAL_POLISH_VISUAL_OUTPUT
  ? path.resolve(process.env.FINAL_POLISH_VISUAL_OUTPUT)
  : null;
if (VISUAL_OUTPUT) fs.mkdirSync(VISUAL_OUTPUT, { recursive: true });

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function occurrences(source, needle) {
  return source.split(needle).length - 1;
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
    if (target.startsWith(SITE) && fs.existsSync(target) && fs.statSync(target).isFile()) {
      response.writeHead(200, { "content-type": mime(target) });
      response.end(fs.readFileSync(target));
      return;
    }
    response.writeHead(404, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store"
    });
    response.end(fs.readFileSync(path.join(SITE, "404.html")));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return server;
}

async function openPage(browser, base, route, { width, height, theme = "dark" }) {
  const context = await browser.newContext({
    viewport: { width, height },
    locale: "it-IT",
    colorScheme: theme
  });
  await context.addInitScript(preference => {
    localStorage.setItem("loadcomposer.language", "it");
    localStorage.setItem("loadcomposer.theme", preference);
  }, theme);
  const page = await context.newPage();
  const errors = [];
  const remote = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("request", request => {
    const requested = request.url();
    if (/^https?:/i.test(requested) && !requested.startsWith(base)) remote.push(requested);
  });
  const response = await page.goto(`${base}${route}`, { waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.dataset.i18nReady === "true");
  const significantErrors = errors.filter(message => (
    !/Failed to load resource: the server responded with a status of 404 \(Not Found\)/.test(message)
  ));
  assert.deepEqual(significantErrors, [], `${route}/${width}/${theme}: browser errors.`);
  assert.deepEqual(remote, [], `${route}/${width}/${theme}: remote requests.`);
  return { context, page, response };
}

async function inspectBrand(page) {
  return page.evaluate(() => {
    const rect = element => {
      const box = element.getBoundingClientRect();
      return {
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        left: box.left,
        width: box.width,
        height: box.height
      };
    };
    const brand = document.querySelector(".brand");
    const controls = document.querySelector(".controls");
    const logos = [...document.querySelectorAll(".brand-logo")];
    const visible = logos.filter(element => getComputedStyle(element).display !== "none");
    return {
      theme: document.documentElement.dataset.theme,
      href: brand.getAttribute("href"),
      brand: rect(brand),
      controls: rect(controls),
      visibleCount: visible.length,
      visibleVariant: visible[0]?.classList.contains("day") ? "day" : "night",
      visibleLogo: visible[0] ? rect(visible[0]) : null,
      symbolCount: visible[0]?.querySelectorAll("#lc-symbol").length || 0,
      wordmarkCount: visible[0]?.querySelectorAll("#lc-wordmark").length || 0,
      payoffCount: brand.querySelectorAll("#lc-payoff").length,
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    };
  });
}

assert.equal(sha256(DAY_ASSET), "c5cec1be899a039c1ad90b7cef686d742b0cbb4fb4c318e918d3e3311a549c5e");
assert.equal(sha256(NIGHT_ASSET), "c8634694ffe7ad13a1fcbd48be1a55aa822e4b9032a675d7adf7aafa139750ff");
const dayAsset = fs.readFileSync(DAY_ASSET, "utf8").trim();
const nightAsset = fs.readFileSync(NIGHT_ASSET, "utf8").trim();
for (const secondary of SECONDARY) {
  const source = fs.readFileSync(secondary.file, "utf8");
  assert.equal(occurrences(source, dayAsset), 1, `${secondary.name}: canonical day lockup not injected exactly once.`);
  assert.equal(occurrences(source, nightAsset), 1, `${secondary.name}: canonical night lockup not injected exactly once.`);
  assert.doesNotMatch(source, /class="brand-mark"/, `${secondary.name}: generic brand mark remains.`);
  assert.doesNotMatch(source, /COMPOSE THE PERFECT LOAD\./, `${secondary.name}: payoff entered compact header.`);
  const dom = new JSDOM(source);
  try {
    const document = dom.window.document;
    assert.equal(document.querySelector(".brand")?.getAttribute("href"), "/", `${secondary.name}: brand link is not root-safe.`);
    assert.equal(document.querySelectorAll(".brand-logo.day #lc-symbol").length, 1, `${secondary.name}: day LC symbol.`);
    assert.equal(document.querySelectorAll(".brand-logo.day #lc-wordmark").length, 1, `${secondary.name}: day wordmark.`);
    assert.equal(document.querySelectorAll(".brand-logo.night #lc-symbol").length, 1, `${secondary.name}: night LC symbol.`);
    assert.equal(document.querySelectorAll(".brand-logo.night #lc-wordmark").length, 1, `${secondary.name}: night wordmark.`);
  } finally {
    dom.window.close();
  }
}

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await launchBrowser(ROOT);
let responsiveScenarios = 0;
let lightScenarios = 0;
let screenshots = 0;
try {
  for (const viewport of VIEWPORTS) {
    const measurements = [];
    for (const secondary of SECONDARY) {
      const app = await openPage(browser, base, secondary.route, { ...viewport, theme: "dark" });
      if (secondary.name === "404") assert.equal(app.response.status(), 404, "404 response status.");
      else assert.equal(app.response.status(), 200, `${secondary.name}: response status.`);
      const state = await inspectBrand(app.page);
      const expectedWidth = viewport.width <= 350 ? 150 : 170;
      const expectedHeight = expectedWidth * 175.996 / 746.224;
      assert.equal(state.theme, "dark", `${secondary.name}/${viewport.width}: resolved theme.`);
      assert.equal(state.href, "/", `${secondary.name}/${viewport.width}: root-safe link.`);
      assert.equal(state.visibleCount, 1, `${secondary.name}/${viewport.width}: visible lockup count.`);
      assert.equal(state.visibleVariant, "night", `${secondary.name}/${viewport.width}: visible lockup variant.`);
      assert.ok(Math.abs(state.visibleLogo.width - expectedWidth) <= 0.6, `${secondary.name}/${viewport.width}: compact width.`);
      assert.ok(Math.abs(state.visibleLogo.height - expectedHeight) <= 0.7, `${secondary.name}/${viewport.width}: compact height.`);
      assert.equal(state.symbolCount, 1, `${secondary.name}/${viewport.width}: LC symbol.`);
      assert.equal(state.wordmarkCount, 1, `${secondary.name}/${viewport.width}: wordmark.`);
      assert.equal(state.payoffCount, 0, `${secondary.name}/${viewport.width}: compact payoff.`);
      assert.equal(state.pageOverflow, false, `${secondary.name}/${viewport.width}: page overflow.`);
      if (viewport.width <= 760) {
        assert.ok(state.controls.top >= state.brand.bottom - 1, `${secondary.name}/${viewport.width}: stacked header overlap.`);
      } else {
        assert.ok(state.controls.left >= state.brand.right - 1, `${secondary.name}/${viewport.width}: desktop header overlap.`);
      }
      measurements.push(state.visibleLogo);

      if (secondary.name === "404") {
        const hierarchy = await app.page.evaluate(() => {
          const rect = element => {
            const box = element.getBoundingClientRect();
            return { top: box.top, right: box.right, bottom: box.bottom, left: box.left, width: box.width, height: box.height };
          };
          const buttons = [...document.querySelectorAll(".actions .button")];
          const statusStyle = getComputedStyle(document.querySelector(".status"));
          const primaryStyle = getComputedStyle(buttons[0]);
          const secondaryStyle = getComputedStyle(buttons[1]);
          return {
            h1Count: document.querySelectorAll("h1").length,
            statusHidden: document.querySelector(".status").getAttribute("aria-hidden"),
            statusSize: parseFloat(statusStyle.fontSize),
            statusColor: statusStyle.color,
            buttons: buttons.map(rect),
            primaryBackground: primaryStyle.backgroundColor,
            secondaryBackground: secondaryStyle.backgroundColor
          };
        });
        const [primary, download, legal] = hierarchy.buttons;
        assert.equal(hierarchy.h1Count, 1, `${viewport.width}: one semantic H1.`);
        assert.equal(hierarchy.statusHidden, "true", `${viewport.width}: decorative 404 accessibility.`);
        assert.ok(hierarchy.statusSize >= 48 && hierarchy.statusSize <= 64, `${viewport.width}: 404 prominence.`);
        assert.notEqual(hierarchy.primaryBackground, hierarchy.secondaryBackground, `${viewport.width}: primary hierarchy.`);
        assert.ok(primary.top < download.top && primary.top < legal.top, `${viewport.width}: primary action is not first.`);
        if (viewport.width <= 420) {
          assert.ok(download.top > primary.bottom && legal.top > download.bottom, `${viewport.width}: mobile action stack.`);
          assert.ok(Math.abs(primary.width - download.width) <= 1 && Math.abs(download.width - legal.width) <= 1, `${viewport.width}: mobile action widths.`);
        } else {
          assert.ok(Math.abs(download.top - legal.top) <= 1, `${viewport.width}: secondary row alignment.`);
          assert.ok(Math.abs(download.width - legal.width) <= 1, `${viewport.width}: equal secondary widths.`);
          assert.ok(Math.abs(primary.left - download.left) <= 1 && Math.abs(primary.right - legal.right) <= 1, `${viewport.width}: primary span.`);
        }
      }

      await app.context.close();
      responsiveScenarios += 1;
    }
    for (let index = 1; index < measurements.length; index += 1) {
      assert.ok(Math.abs(measurements[index].width - measurements[0].width) <= 0.5, `${viewport.width}: secondary brand widths differ.`);
      assert.ok(Math.abs(measurements[index].height - measurements[0].height) <= 0.5, `${viewport.width}: secondary brand heights differ.`);
    }
  }

  for (const secondary of SECONDARY) {
    const app = await openPage(browser, base, secondary.route, { width: 1366, height: 768, theme: "light" });
    const state = await inspectBrand(app.page);
    assert.equal(state.visibleVariant, "day", `${secondary.name}: light lockup variant.`);
    assert.ok(Math.abs(state.visibleLogo.width - 170) <= 0.6, `${secondary.name}: light compact width.`);
    if (VISUAL_OUTPUT) {
      await app.page.evaluate(() => window.scrollTo(0, 0));
      await app.page.screenshot({
        path: path.join(VISUAL_OUTPUT, `${secondary.name}-light-1366x768.png`),
        fullPage: false
      });
      screenshots += 1;
    }
    await app.context.close();
    lightScenarios += 1;
  }

  if (VISUAL_OUTPUT) {
    for (const item of [
      { name: "main", route: "/" },
      { name: "downloads", route: "/downloads/" },
      { name: "legal", route: "/legal/" },
      { name: "404", route: "/does-not-exist" }
    ]) {
      const app = await openPage(browser, base, item.route, { width: 1366, height: 768, theme: "dark" });
      await app.page.evaluate(() => window.scrollTo(0, 0));
      await app.page.screenshot({
        path: path.join(VISUAL_OUTPUT, `${item.name}-dark-1366x768.png`),
        fullPage: false
      });
      await app.context.close();
      screenshots += 1;
    }
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

console.log(
  `Final polish branding PASS: canonical Main mobile day/night SVG lockup injected exactly on three secondary pages; ` +
  `${responsiveScenarios}/${responsiveScenarios} dark responsive brand/action scenarios, ` +
  `${lightScenarios}/${lightScenarios} light scenarios, ${screenshots} screenshots, zero overlap/overflow/remote requests.`
);
