import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";
import { launchBrowser } from "./browser-runtime.mjs";
import {
  FLOOR_CAPACITIES,
  GUIDE_ROUTES,
  PALLETS,
  PUBLIC_EXAMPLES,
  VEHICLES
} from "../scripts/guide-scenarios-v1.3.6.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SITE = path.join(ROOT, "site");
const VERSION = fs.readFileSync(path.join(ROOT, "VERSION"), "utf8").trim();
const STANDALONE = path.join(SITE, "downloads", `loadcomposer-v${VERSION}-standalone.html`);
const ABOUT = path.join(SITE, "about", "index.html");
const RESULT = path.join(ROOT, `seo-discovery-results-v${VERSION}.json`);
const ORIGIN = "https://loadcomposer.com";
const HOME_TITLE = "Pallet Loading Calculator for Containers & Trailers | LoadComposer";
const STANDALONE_TITLE = `LoadComposer v${VERSION} — Pallet Loading Calculator`;
const LEAF_ROUTES = GUIDE_ROUTES.slice(1);
const ROUTE_FILES = Object.fromEntries(GUIDE_ROUTES.map(route => [
  route,
  path.join(SITE, route.slice(1), "index.html")
]));
const VEHICLE_GUIDES = Object.freeze({
  "/guides/pallets-in-20ft-container/": "20dc",
  "/guides/pallets-in-20ft-reefer/": "20rf",
  "/guides/pallets-in-40ft-container/": "40dc",
  "/guides/pallets-in-40ft-high-cube/": "40hc",
  "/guides/pallets-in-40ft-reefer/": "40rh",
  "/guides/pallets-in-40ft-pallet-wide-container/": "40hwpw"
});

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function pngDimensions(file) {
  const data = fs.readFileSync(file);
  assert.equal(data.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${path.basename(file)}: PNG signature`);
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20), sha256: sha256(data) };
}

function routeTarget(href) {
  const clean = href.split(/[?#]/)[0];
  if (!clean || clean === "/") return path.join(SITE, "index.html");
  const target = path.join(SITE, clean.replace(/^\//, ""));
  return clean.endsWith("/") ? path.join(target, "index.html") : target;
}

function words(text) {
  return new Set(String(text).toLowerCase().match(/[a-z0-9]+/g) || []);
}

function jaccard(a, b) {
  const first = words(a);
  const second = words(b);
  const intersection = [...first].filter(word => second.has(word)).length;
  const union = new Set([...first, ...second]).size;
  return union ? intersection / union : 0;
}

function canvasContextStub() {
  const methods = {
    arc() {}, beginPath() {}, clearRect() {}, clip() {}, createPattern() { return "#pattern"; },
    drawImage() {}, fill() {}, fillRect() {}, fillText() {}, lineTo() {},
    measureText(text) { return { width: String(text).length * 7 }; },
    moveTo() {}, rect() {}, restore() {}, rotate() {}, save() {}, stroke() {}, strokeRect() {}, translate() {}
  };
  return new Proxy(methods, {
    get(target, property) { return property in target ? target[property] : () => {}; },
    set(target, property, value) { target[property] = value; return true; }
  });
}

async function loadStandalone(url) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", error => errors.push(error));
  const dom = new JSDOM(read(STANDALONE), {
    runScripts: "dangerously",
    url,
    virtualConsole,
    beforeParse(window) {
      window.__calculateButtonClickEvents = 0;
      window.document.addEventListener("click", event => {
        if (event.target && event.target.id === "calculateBtn") {
          window.__calculateButtonClickEvents += 1;
        }
      }, true);
      window.localStorage.setItem("loadcomposer.language", "en");
      window.localStorage.setItem("loadcomposer.theme", "light");
      window.localStorage.setItem("loadcomposer.unit", "mm");
      window.alert = () => {};
      window.open = () => null;
      window.HTMLCanvasElement.prototype.getContext = () => canvasContextStub();
      window.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,";
    }
  });
  await dom.window.loadComposerI18n.ready;
  await new Promise(resolve => dom.window.setTimeout(resolve, 0));
  if (errors.length) throw errors[0];
  return dom;
}

function resultFor(window, vehicleId) {
  return window.eval(`lastResults.find(result => result.container.id === ${JSON.stringify(vehicleId)})`);
}

function setScenario(window, palletId, quantity = 500) {
  const document = window.document;
  const group = document.getElementById("singlePalletGroup");
  window.selectPresetForGroup(group, palletId, false);
  group.querySelector('[data-field="height"]').value = "1500";
  group.querySelector('[data-field="quantity"]').value = String(quantity);
  group.querySelector('[data-field="allowRotate"]').checked = true;
  document.getElementById("gap").value = "0";
  document.getElementById("stackable").checked = false;
  window.updateGroupVisuals(group);
  assert.equal(window.calculate(), true, `${palletId}: calculation refused`);
}

function serve(root) {
  const types = new Map([
    [".html", "text/html; charset=utf-8"], [".json", "application/json; charset=utf-8"],
    [".png", "image/png"], [".svg", "image/svg+xml"], [".xml", "application/xml; charset=utf-8"],
    [".txt", "text/plain; charset=utf-8"], [".zip", "application/zip"]
  ]);
  return new Promise(resolve => {
    const server = http.createServer((request, response) => {
      const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
      let target = path.join(root, pathname.replace(/^\//, ""));
      if (pathname === "/") target = path.join(root, "index.html");
      else if (pathname.endsWith("/")) target = path.join(target, "index.html");
      if (!target.startsWith(`${root}${path.sep}`) && target !== path.join(root, "index.html")) {
        response.writeHead(400).end("Bad request");
        return;
      }
      if (!fs.existsSync(target) || !fs.statSync(target).isFile()) {
        target = path.join(root, "404.html");
        response.statusCode = 404;
      }
      response.setHeader("content-type", types.get(path.extname(target)) || "application/octet-stream");
      response.end(fs.readFileSync(target));
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

assert.equal(VERSION, "1.3.6", "SEO test must be current v1.3.6 coverage");
assert.equal(GUIDE_ROUTES.length, 7, "expected one guide hub and six container leaf guides");
assert.equal(LEAF_ROUTES.length, 6);

const titles = new Set();
const descriptions = new Set();
const pageFacts = [];
for (const route of GUIDE_ROUTES) {
  const file = ROUTE_FILES[route];
  assert.ok(fs.existsSync(file), `${route}: static route missing`);
  const html = read(file);
  const dom = new JSDOM(html);
  try {
    const document = dom.window.document;
    assert.equal(document.documentElement.lang, "en", `${route}: language must be English`);
    assert.equal(document.querySelectorAll('head meta[name="darkreader-lock"]').length, 1, `${route}: Dark Reader lock`);
    assert.equal(document.querySelectorAll('link[rel="canonical"]').length, 1, `${route}: one canonical`);
    assert.equal(document.querySelector('link[rel="canonical"]').href, `${ORIGIN}${route}`, `${route}: canonical URL`);
    const title = document.title.trim();
    const description = document.querySelector('meta[name="description"]')?.content.trim();
    assert.ok(title, `${route}: title empty`);
    assert.ok(description, `${route}: description empty`);
    assert.equal(titles.has(title), false, `${route}: duplicate title`);
    assert.equal(descriptions.has(description), false, `${route}: duplicate description`);
    titles.add(title);
    descriptions.add(description);
    assert.equal(document.querySelectorAll("h1").length, 1, `${route}: exactly one H1`);
    assert.ok(document.querySelector("article .prose")?.textContent.trim().length > 250, `${route}: substantive static body missing`);
    assert.equal(document.querySelectorAll('meta[name^="twitter:"]').length, 0, `${route}: Twitter metadata present`);
    for (const property of ["og:type", "og:site_name", "og:title", "og:description", "og:url", "og:image"]) {
      const value = document.querySelector(`meta[property="${property}"]`)?.content;
      assert.ok(value, `${route}: ${property} missing`);
      if (property === "og:url" || property === "og:image") assert.match(value, /^https:\/\/loadcomposer\.com\//, `${route}: ${property} not canonical HTTPS`);
    }
    assert.equal(document.querySelector('meta[property="og:url"]').content, `${ORIGIN}${route}`, `${route}: OG URL`);
    const schema = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
    assert.equal(schema["@type"], "BreadcrumbList", `${route}: BreadcrumbList type`);
    assert.equal(schema.itemListElement.at(-1).item, `${ORIGIN}${route}`, `${route}: breadcrumb target`);
    assert.equal(JSON.stringify(schema).includes("aggregateRating"), false, `${route}: fake rating schema`);
    assert.equal(JSON.stringify(schema).includes("offers"), false, `${route}: fake offers schema`);

    for (const anchor of document.querySelectorAll("a[href]")) {
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || /^(?:https?:|mailto:)/i.test(href)) continue;
      assert.ok(fs.existsSync(routeTarget(href)), `${route}: broken internal link ${href}`);
    }
    for (const image of document.querySelectorAll("img[src]")) {
      const src = image.getAttribute("src");
      if (src.startsWith("data:")) continue;
      assert.ok(src.startsWith("/"), `${route}: guide image must be first-party`);
      assert.ok(fs.existsSync(routeTarget(src)), `${route}: image missing ${src}`);
      assert.ok(image.alt.trim().length >= 20, `${route}: image alt is not meaningful`);
      assert.ok(Number(image.getAttribute("width")) > 0 && Number(image.getAttribute("height")) > 0, `${route}: image dimensions missing`);
    }
    if (route !== "/guides/") {
      assert.ok(document.querySelector("table"), `${route}: data table missing`);
      assert.ok(document.querySelector('a[href^="/?example="]'), `${route}: example CTA missing`);
      assert.ok(document.querySelector('a[href="/"]'), `${route}: normal planner CTA missing`);
      assert.ok(document.querySelector('a[href="/guides/"]'), `${route}: Guides link missing`);
      assert.equal(document.querySelector('a[href^="/?example="]')?.textContent.trim(), "Try this example", `${route}: example CTA text`);
      assert.equal(document.querySelector('a.button.secondary[href="/"]')?.textContent.trim(), "Use LoadComposer for free", `${route}: planner CTA text`);
    }
    pageFacts.push({ route, title, description, h1: document.querySelector("h1").textContent.trim() });
  } finally {
    dom.window.close();
  }
}

const dryText = new JSDOM(read(ROUTE_FILES["/guides/pallets-in-40ft-container/"])).window.document.querySelector("article").textContent;
const highCubeDom = new JSDOM(read(ROUTE_FILES["/guides/pallets-in-40ft-high-cube/"]));
const highCubeText = highCubeDom.window.document.querySelector("article").textContent;
assert.ok(jaccard(dryText, highCubeText) < 0.68, "High Cube guide is too similar to 40' Dry");
assert.match(highCubeText, /does not automatically add floor positions/i);
assert.match(highCubeText, /additional 304 mm of nominal internal height/i);
highCubeDom.window.close();

const reeferText = new JSDOM(read(ROUTE_FILES["/guides/pallets-in-40ft-reefer/"])).window.document.querySelector("article").textContent;
assert.match(reeferText, /40' HC Reefer/);
assert.match(reeferText, /not a claim that every generic 40-foot reefer has one universal internal size/i);

const reefer20Text = new JSDOM(read(ROUTE_FILES["/guides/pallets-in-20ft-reefer/"])).window.document.querySelector("article").textContent;
assert.match(reefer20Text, /20' Reefer/);
assert.match(reefer20Text, /airflow/i);
const palletWideText = new JSDOM(read(ROUTE_FILES["/guides/pallets-in-40ft-pallet-wide-container/"])).window.document.querySelector("article").textContent;
assert.match(palletWideText, /30 Euro pallet floor positions/i);
assert.match(palletWideText, /not every container sold under a Pallet Wide label/i);
assert.equal(GUIDE_ROUTES.some(route => route.includes("13-6m-trailer")), false, "trailer Guide route remains");
assert.equal(Object.hasOwn(PUBLIC_EXAMPLES, "trailer-euro"), false, "trailer example remains public");

const home = read(path.join(SITE, "index.html"));
const homeDom = new JSDOM(home);
try {
  const document = homeDom.window.document;
  assert.equal(document.title, HOME_TITLE);
  assert.equal(document.querySelector('meta[property="og:title"]')?.content, HOME_TITLE);
  assert.equal(document.querySelectorAll('link[rel="canonical"]').length, 1);
  assert.equal(document.querySelector('link[rel="canonical"]').href, `${ORIGIN}/`);
  assert.equal(document.querySelectorAll('meta[name^="twitter:"]').length, 0);
  const appSchema = JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent);
  assert.equal(appSchema["@type"], "WebApplication");
  assert.equal(JSON.stringify(appSchema).includes("aggregateRating"), false);
  assert.equal(JSON.stringify(appSchema).includes("offers"), false);
  const guideLinks = [...document.querySelectorAll('a[href="./guides/"]')];
  assert.equal(guideLinks.length, 1, "Home must contain one Guides destination");
  const aboutLinks = [...document.querySelectorAll('a[href="./about/"]')];
  assert.equal(aboutLinks.length, 1, "Home must contain one About destination");
  assert.equal(document.querySelectorAll('a[href*="pallets-in-"]').length, 0, "Home must not list leaf guides");
  assert.ok(document.querySelector("#planner #singleModeForm"), "Home planner must remain primary content");
  assert.equal(document.querySelector("#planner article"), null, "Home must not contain guide article content");
} finally {
  homeDom.window.close();
}
assert.ok(home.includes("const PUBLIC_EXAMPLES = Object.freeze"), "closed public example allowlist missing");
assert.equal(home.includes("JSON.parse(parameters.get"), false, "example URL must not deserialize JSON state");

const aboutDom = new JSDOM(read(ABOUT));
try {
  const document = aboutDom.window.document;
  assert.equal(document.title, "About LoadComposer | Built from Real Logistics Work");
  assert.equal(document.querySelector("h1")?.textContent.trim(), "About LoadComposer");
  assert.equal(document.querySelector(".lede")?.textContent.trim(), "Built from real logistics work.");
  assert.match(document.querySelector("article")?.textContent || "", /Marco Pernigotti/);
  assert.match(document.querySelector("article")?.textContent || "", /seven years working directly with export groupage operations/i);
  assert.match(document.querySelector("article")?.textContent || "", /more than 15 years leading logistics/i);
  assert.match(document.querySelector("article")?.textContent || "", /will this load fit/i);
  assert.match(document.querySelector("article")?.textContent || "", /does not use private shipment, customer, employer, or carrier data/i);
  assert.equal(document.querySelector('a.button[href="/"]')?.textContent.trim(), "Use LoadComposer for free");
  assert.equal(document.querySelector('a.button[href="/guides/"]')?.textContent.trim(), "Explore the pallet capacity guides");
  assert.equal(document.querySelectorAll('meta[name^="twitter:"]').length, 0);
  assert.equal(document.querySelectorAll('link[hreflang]').length, 0);
  assert.equal(document.querySelectorAll('meta[name="darkreader-lock"]').length, 1);
  const schema = JSON.parse(document.querySelector('script[type="application/ld+json"]')?.textContent || "{}");
  assert.equal(schema["@type"], "AboutPage");
} finally {
  aboutDom.window.close();
}

const currentHtml = [
  path.join(SITE, "index.html"), path.join(SITE, "downloads", "index.html"), path.join(SITE, "404.html"),
  ABOUT,
  ...GUIDE_ROUTES.map(route => ROUTE_FILES[route]),
  path.join(SITE, "legal", "index.html"),
  ...["license", "notices", "trademarks", "commercial", "privacy", "security"].map(route => path.join(SITE, "legal", route, "index.html")),
  STANDALONE
];
for (const file of currentHtml) {
  assert.equal(/<meta\s+name=["']twitter:/i.test(read(file)), false, `${path.relative(ROOT, file)}: Twitter/X metadata remains`);
}

const sitemap = read(path.join(SITE, "sitemap.xml"));
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
const expectedSitemapRoutes = [
  "/", "/downloads/", "/about/", ...GUIDE_ROUTES, "/legal/", "/legal/license/", "/legal/notices/",
  "/legal/trademarks/", "/legal/commercial/", "/legal/privacy/", "/legal/security/"
];
assert.deepEqual(sitemapUrls, expectedSitemapRoutes.map(route => `${ORIGIN}${route}`), "sitemap route policy");
assert.equal(sitemap.includes("?example="), false);
assert.equal(sitemap.includes("404"), false);
assert.equal(sitemap.includes("standalone"), false);
assert.equal(sitemap.includes("/legal/raw/"), false);
const robots = read(path.join(SITE, "robots.txt"));
assert.match(robots, /User-agent:\s*\*/);
assert.match(robots, /Allow:\s*\//);
assert.match(robots, /Sitemap:\s*https:\/\/loadcomposer\.com\/sitemap\.xml/);

const standalone = read(STANDALONE);
const standaloneDom = new JSDOM(standalone);
try {
  const document = standaloneDom.window.document;
  assert.equal(document.title, STANDALONE_TITLE);
  assert.equal(document.querySelectorAll('head meta[name="darkreader-lock"]').length, 1);
  const favicon = document.querySelector('link[rel="icon"]');
  assert.ok(favicon);
  assert.match(favicon.getAttribute("href"), /^data:image\/svg\+xml;base64,/);
  const svg = Buffer.from(favicon.getAttribute("href").split(",")[1], "base64").toString("utf8");
  assert.match(svg, /^<svg[\s>]/);
  const footerNote = document.querySelector('[data-i18n="footer.note"]');
  assert.ok(footerNote.textContent.trim().startsWith("Note: this tool performs an indicative geometry check"));
  assert.notEqual(footerNote.textContent.trim(), "footer.note");
  assert.equal(document.querySelectorAll('meta[name^="twitter:"]').length, 0);
  assert.equal(standalone.includes("LoadComposer pallet capacity guides"), false, "guide content embedded in standalone");
  for (const resource of document.querySelectorAll("script[src], link[rel='stylesheet'][href], link[rel='icon'][href], img[src], source[src], iframe[src]")) {
    const value = resource.getAttribute("src") || resource.getAttribute("href") || "";
    assert.equal(/^(?:https?:)?\/\//i.test(value), false, `standalone remote resource: ${value}`);
  }
} finally {
  standaloneDom.window.close();
}

const engineDom = await loadStandalone("https://loadcomposer.test/");
const engineResults = [];
try {
  for (const pallet of Object.values(PALLETS)) {
    setScenario(engineDom.window, pallet.id);
    for (const [vehicleId, expected] of Object.entries(FLOOR_CAPACITIES)) {
      const result = resultFor(engineDom.window, vehicleId);
      assert.equal(result.floorCapacity, expected[pallet.id], `${vehicleId}/${pallet.id}: published capacity mismatch`);
      engineResults.push({
        vehicleId,
        palletId: pallet.id,
        palletDimensions: [pallet.length, pallet.width],
        vehicleDimensions: [result.container.innerLength, result.container.innerWidth, result.container.innerHeight],
        loadedHeight: 1500,
        gap: 0,
        rotation: "allowed",
        stacking: false,
        floorCapacity: result.floorCapacity,
        orientationCounts: { ...result.capacityLayout.orientationCounts },
        usedLength: result.capacityLayout.usedLength,
        usedWidth: result.capacityLayout.usedWidth
      });
    }
  }
} finally {
  engineDom.window.close();
}

const exampleResults = [];
for (const example of Object.values(PUBLIC_EXAMPLES)) {
  const dom = await loadStandalone(`https://loadcomposer.test/?example=${encodeURIComponent(example.id)}`);
  try {
    const { window } = dom;
    const document = window.document;
    const group = document.getElementById("singlePalletGroup");
    assert.equal(document.documentElement.dataset.example, example.id);
    assert.equal(group.querySelector('[data-field="presetId"]').value, example.palletId);
    assert.equal(Number(group.querySelector('[data-field="quantity"]').value), example.quantity);
    assert.equal(Number(group.querySelector('[data-field="height"]').value), example.loadedHeight);
    assert.equal(group.querySelector('[data-field="allowRotate"]').checked, true);
    assert.equal(document.getElementById("stackable").checked, false);
    assert.equal(window.eval("selectedContainerId"), example.vehicleId);
    assert.equal(window.__calculateButtonClickEvents, 1, `${example.id}: normal Calculate path must run exactly once automatically`);
    assert.ok(window.eval("lastResults.length") > 0, `${example.id}: normal results must be populated automatically`);
    assert.ok(document.querySelectorAll("#resultsBody tr").length > 0, `${example.id}: result table remains empty`);
    assert.ok(document.querySelectorAll("#drawSelect option").length > 0, `${example.id}: layout selector remains empty`);
    const result = resultFor(window, example.vehicleId);
    assert.equal(result.floorCapacity, FLOOR_CAPACITIES[example.vehicleId][example.palletId]);
    assert.equal(result.placedCount, example.quantity);
    assert.equal(result.unplacedCount, 0);
    assert.equal(result.ok, true);
    const editedQuantity = Math.max(1, example.quantity - 1);
    group.querySelector('[data-field="quantity"]').value = String(editedQuantity);
    document.getElementById("calculateBtn").dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    assert.equal(window.__calculateButtonClickEvents, 2, `${example.id}: user Calculate path unavailable`);
    const editedResult = resultFor(window, example.vehicleId);
    assert.equal(editedResult.placedCount, editedQuantity, `${example.id}: edited quantity did not recalculate normally`);
    assert.equal(editedResult.ok, true, `${example.id}: edited result invalid`);
    document.getElementById("resetBtn").click();
    assert.equal(document.documentElement.hasAttribute("data-example"), false);
    assert.equal(group.querySelector('[data-field="presetId"]').value, "eur");
    assert.equal(Number(group.querySelector('[data-field="quantity"]').value), 10);
    assert.equal(window.eval("selectedContainerId"), "20dc");
    assert.ok(window.eval("lastResults.length") > 0, `${example.id}: reset must restore normal calculated state`);
    assert.equal(window.__calculateButtonClickEvents, 2, `${example.id}: Reset reapplied query-string example`);
    exampleResults.push({
      id: example.id,
      vehicleId: example.vehicleId,
      palletId: example.palletId,
      quantity: example.quantity,
      loadedHeight: example.loadedHeight,
      gap: example.gap,
      rotation: example.rotation,
      stacking: example.stacking,
      capacity: result.floorCapacity,
      placed: result.placedCount,
      unplaced: result.unplacedCount,
      automaticCalculation: true,
      automaticCalculatePathInvocations: 1,
      editableRecalculation: "PASS",
      reset: "PASS"
    });
  } finally {
    dom.window.close();
  }
}

const rejectedExampleUrls = [
  ["unknown", "https://loadcomposer.test/?example=unknown"],
  ["malformed", `https://loadcomposer.test/?example=${encodeURIComponent("<script>alert(1)</script>")}`],
  ["blank", "https://loadcomposer.test/?example="],
  ["duplicate/conflicting", "https://loadcomposer.test/?example=20ft-euro&example=40ft-euro"]
];
for (const [label, url] of rejectedExampleUrls) {
  const dom = await loadStandalone(url);
  try {
    assert.equal(dom.window.document.documentElement.hasAttribute("data-example"), false, `${label}: rejected example accepted`);
    assert.equal(dom.window.__calculateButtonClickEvents, 0, `${label}: rejected example triggered automatic Calculate path`);
    assert.ok(dom.window.eval("lastResults.length") > 0, `${label}: normal Home fallback changed`);
    assert.equal(dom.window.document.querySelector('[data-field="presetId"]').value, "eur");
  } finally {
    dom.window.close();
  }
}

const directHomeDom = await loadStandalone("https://loadcomposer.test/");
try {
  assert.equal(directHomeDom.window.document.documentElement.hasAttribute("data-example"), false);
  assert.equal(directHomeDom.window.__calculateButtonClickEvents, 0, "normal Home triggered the example Calculate path");
  assert.ok(directHomeDom.window.eval("lastResults.length") > 0, "normal Home initialization changed");
} finally {
  directHomeDom.window.close();
}

const publicAssets = [];
for (const example of Object.values(PUBLIC_EXAMPLES)) {
  const file = path.join(SITE, "assets", "guides", example.image);
  assert.ok(fs.existsSync(file), `${example.image}: public guide asset missing`);
  const dimensions = pngDimensions(file);
  assert.equal(dimensions.width, example.imageWidth);
  assert.equal(dimensions.height, example.imageHeight);
  publicAssets.push({
    file: `site/assets/guides/${example.image}`,
    scenario: example.id,
    vehicleId: example.vehicleId,
    palletId: example.palletId,
    quantity: example.quantity,
    width: dimensions.width,
    height: dimensions.height,
    alt: example.alt,
    sha256: dimensions.sha256
  });
}

const server = await serve(SITE);
const localOrigin = `http://127.0.0.1:${server.address().port}`;
const browser = await launchBrowser(ROOT);
const browserScenarios = [];
const browserExampleResults = [];
try {
  const pages = [
    "/", "/about/", "/guides/", ...LEAF_ROUTES, "/downloads/", "/legal/license/", "/missing-page/"
  ];
  const viewports = [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 }
  ];
  for (const viewport of viewports) {
    for (const preference of ["light", "dark", "auto"]) {
      const expectedTheme = preference === "auto" ? "dark" : preference;
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        locale: "en-US",
        colorScheme: preference === "auto" ? "dark" : preference
      });
      await context.addInitScript(value => {
        localStorage.setItem("loadcomposer.theme", value);
        localStorage.setItem("loadcomposer.language", "en");
        localStorage.setItem("loadcomposer.unit", "mm");
      }, preference);
      for (const route of pages) {
        const page = await context.newPage();
        const errors = [];
        const external = [];
        page.on("pageerror", error => errors.push(error.message));
        page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
        page.on("request", request => {
          if (/^https?:/i.test(request.url()) && !request.url().startsWith(localOrigin)) external.push(request.url());
        });
        const response = await page.goto(`${localOrigin}${route}`, { waitUntil: "load" });
        assert.ok(response, `${route}: no response`);
        if (route === "/missing-page/") assert.equal(response.status(), 404, "custom 404 status");
        await page.waitForFunction(() => document.body && getComputedStyle(document.body).visibility !== "hidden");
        const check = await page.evaluate(() => {
          const guide = location.pathname.startsWith("/guides/");
          const image = guide ? document.querySelector("figure img") : null;
          return {
            overflow: document.documentElement.scrollWidth - window.innerWidth,
            darkReaderLocks: document.querySelectorAll('head meta[name="darkreader-lock"]').length,
            theme: document.documentElement.dataset.theme,
            h1Visible: guide ? Boolean(document.querySelector("h1")?.getBoundingClientRect().height) : true,
            imageFits: image ? image.getBoundingClientRect().right <= window.innerWidth + 1 && image.naturalWidth > 0 : true,
            guideCta: guide && location.pathname !== "/guides/" ? Boolean(document.querySelector('a[href^="/?example="]')) : true,
            legalFooterHasGuides: location.pathname.startsWith("/legal/") ? /\bGuides\b/.test(document.querySelector("footer")?.textContent || "") : false,
            plannerPresent: location.pathname === "/" ? Boolean(document.querySelector("#planner #calculateBtn")) : true
          };
        });
        assert.ok(check.overflow <= 1, `${route}/${viewport.name}/${preference}: horizontal overflow ${check.overflow}`);
        assert.equal(check.darkReaderLocks, 1, `${route}: Dark Reader lock`);
        assert.equal(check.theme, expectedTheme, `${route}: theme resolution`);
        assert.equal(check.h1Visible, true, `${route}: guide H1 invisible`);
        assert.equal(check.imageFits, true, `${route}: guide image clipped`);
        assert.equal(check.guideCta, true, `${route}: guide CTA missing`);
        assert.equal(check.legalFooterHasGuides, false, `${route}: compact Legal footer changed`);
        assert.equal(check.plannerPresent, true, "Home planner missing");
        const relevantErrors = route === "/missing-page/"
          ? errors.filter(message => !/Failed to load resource: the server responded with a status of 404 \(Not Found\)/.test(message))
          : errors;
        assert.deepEqual(relevantErrors, [], `${route}: browser errors`);
        assert.deepEqual(external, [], `${route}: external runtime requests`);
        browserScenarios.push({ route, viewport: viewport.name, themePreference: preference, resolvedTheme: check.theme, status: "PASS" });
        await page.close();
      }
      await context.close();
    }
  }

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "en-US", colorScheme: "light" });
  await context.addInitScript(() => {
    window.__calculateButtonClickEvents = 0;
    document.addEventListener("click", event => {
      if (event.target && event.target.id === "calculateBtn") window.__calculateButtonClickEvents += 1;
    }, true);
    localStorage.setItem("loadcomposer.theme", "light");
    localStorage.setItem("loadcomposer.language", "en");
    localStorage.setItem("loadcomposer.unit", "mm");
  });
  for (const [index, route] of LEAF_ROUTES.entries()) {
    const example = Object.values(PUBLIC_EXAMPLES)[index];
    const page = await context.newPage();
    await page.goto(`${localOrigin}${route}`, { waitUntil: "load" });
    const href = await page.locator('a[href^="/?example="]').getAttribute("href");
    assert.equal(href, `/?example=${example.id}`, `${route}: CTA example mismatch`);
    await page.goto(`${localOrigin}${href}`, { waitUntil: "load" });
    await page.waitForFunction(() => document.documentElement.dataset.i18nReady === "true");
    await page.waitForFunction(() => window.eval("applicationInitialized") === true);
    assert.equal(await page.evaluate(() => window.__calculateButtonClickEvents), 1, `${example.id}: browser automatic Calculate count`);
    assert.ok(await page.evaluate(() => window.eval("lastResults.length")) > 0, `${example.id}: browser results empty`);
    assert.ok(await page.locator("#resultsBody tr").count() > 0, `${example.id}: browser result table empty`);
    assert.equal(await page.evaluate(() => window.scrollY), 0, `${example.id}: automatic calculation forced scroll`);
    const result = await page.evaluate(vehicleId => {
      const item = window.eval("lastResults").find(result => result.container.id === vehicleId);
      return {
        capacity: item.floorCapacity,
        placed: item.placedCount,
        unplaced: item.unplacedCount,
        ok: item.ok,
        png: document.getElementById("layoutCanvas").toDataURL("image/png")
      };
    }, example.vehicleId);
    assert.equal(result.capacity, FLOOR_CAPACITIES[example.vehicleId][example.palletId]);
    assert.equal(result.placed, example.quantity);
    assert.equal(result.unplaced, 0);
    assert.equal(result.ok, true);
    const renderedPng = Buffer.from(result.png.replace(/^data:image\/png;base64,/, ""), "base64");
    const publicPng = fs.readFileSync(path.join(SITE, "assets", "guides", example.image));
    assert.equal(sha256(renderedPng), sha256(publicPng), `${example.id}: public image differs from current canvas output`);
    await page.locator('#singlePalletGroup [data-field="quantity"]').fill(String(Math.max(1, example.quantity - 1)));
    await page.click("#calculateBtn");
    const edited = await page.evaluate(vehicleId => {
      const item = window.eval("lastResults").find(result => result.container.id === vehicleId);
      return { placed: item.placedCount, ok: item.ok, clickEvents: window.__calculateButtonClickEvents };
    }, example.vehicleId);
    assert.deepEqual(edited, { placed: Math.max(1, example.quantity - 1), ok: true, clickEvents: 2 }, `${example.id}: normal edit/recalculate path`);
    await page.click("#resetBtn");
    const reset = await page.evaluate(() => ({
      example: document.documentElement.dataset.example || null,
      preset: document.querySelector('[data-field="presetId"]').value,
      quantity: Number(document.querySelector('[data-field="quantity"]').value),
      selectedContainerId: window.eval("selectedContainerId"),
      clickEvents: window.__calculateButtonClickEvents
    }));
    assert.deepEqual(reset, { example: null, preset: "eur", quantity: 10, selectedContainerId: "20dc", clickEvents: 2 });
    browserExampleResults.push({ id: example.id, route, destination: href, automaticCalculatePathInvocations: 1, currentCanvasHash: sha256(renderedPng), editableRecalculation: "PASS", reset: "PASS", status: "PASS" });
    await page.close();
  }
  await context.close();

  const offlineContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "en-US", colorScheme: "dark" });
  await offlineContext.addInitScript(() => {
    localStorage.setItem("loadcomposer.theme", "dark");
    localStorage.setItem("loadcomposer.language", "en");
  });
  await offlineContext.setOffline(true);
  const offlinePage = await offlineContext.newPage();
  await offlinePage.goto(new URL(`file://${STANDALONE}`).href, { waitUntil: "load" });
  await offlinePage.waitForFunction(() => document.documentElement.dataset.i18nReady === "true");
  assert.equal(await offlinePage.title(), STANDALONE_TITLE);
  assert.equal(await offlinePage.locator('link[rel="icon"]').getAttribute("href").then(value => value.startsWith("data:image/svg+xml;base64,")), true);
  assert.equal(await offlinePage.evaluate(() => Boolean(document.querySelector("#calculateBtn"))), true);
  assert.equal(await offlinePage.evaluate(() => document.documentElement.dataset.theme), "dark");
  await offlineContext.close();
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

const report = {
  version: VERSION,
  status: "PASS",
  routes: GUIDE_ROUTES,
  guideCount: GUIDE_ROUTES.length,
  leafGuideCount: LEAF_ROUTES.length,
  sitemapUrls: sitemapUrls.length,
  metadata: {
    uniqueTitles: titles.size,
    uniqueDescriptions: descriptions.size,
    canonicalCoverage: `${GUIDE_ROUTES.length}/${GUIDE_ROUTES.length}`,
    openGraphCoverage: `${GUIDE_ROUTES.length}/${GUIDE_ROUTES.length}`,
    twitterMetadata: "absent from current generated HTML"
  },
  examples: exampleResults,
  engineResults,
  publicAssets,
  browserScenarios: { total: browserScenarios.length, passed: browserScenarios.length },
  browserExampleResults,
  standalone: {
    title: STANDALONE_TITLE,
    embeddedFavicon: true,
    faviconNetworkRequests: 0,
    fileProtocolOffline: "PASS",
    footerNoteFallback: "human-readable",
    explorerIconScope: "unchanged by design"
  },
  highCubeDryWordJaccard: Number(jaccard(dryText, highCubeText).toFixed(4)),
  pageFacts
};
fs.writeFileSync(RESULT, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(
  `SEO/discovery v${VERSION} PASS: ${GUIDE_ROUTES.length} static routes, ${sitemapUrls.length} sitemap URLs, ` +
  `${Object.keys(PUBLIC_EXAMPLES).length} allowlisted examples, ${browserScenarios.length} browser scenarios, ` +
  `${publicAssets.length} current-engine images, standalone favicon/offline PASS.`
);
