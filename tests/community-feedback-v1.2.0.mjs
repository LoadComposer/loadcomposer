import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";
import { launchBrowser } from "./browser-runtime.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const MODULAR_PATH = path.join(ROOT, "site", "index.html");
const STANDALONE_PATH = path.join(
  ROOT,
  "site",
  "downloads",
  "loadcomposer-v1.3.0-standalone.html"
);
const CODES = ["it", "en", "de", "es", "fr", "pt", "nl"];
const KEYS = ["footer.linksAria", "footer.download", "footer.suggestions", "footer.reportIssue"];
const EXPECTED_LINKS = {
  "footer.suggestions": "https://github.com/LoadComposer/loadcomposer/discussions",
  "footer.reportIssue": "https://github.com/LoadComposer/loadcomposer/issues/new?template=bug.yml"
};

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function auditMarkup(html, label) {
  const dom = new JSDOM(html);
  try {
    const document = dom.window.document;
    const nav = document.querySelector("footer .footer-links");
    assert.ok(nav, `${label}: footer links navigation missing.`);
    assert.equal(nav.getAttribute("data-i18n-aria-label"), "footer.linksAria");
    const download = nav.querySelector('a[data-i18n="footer.download"]');
    assert.ok(download, `${label}: Download link missing.`);
    assert.equal(
      download.getAttribute("href"),
      label === "standalone" ? "https://loadcomposer.com/downloads/" : "./downloads/",
      `${label}: Download URL.`
    );
    assert.equal(download.hasAttribute("target"), false, `${label}: Download must not open a new tab.`);
    for (const [key, url] of Object.entries(EXPECTED_LINKS)) {
      const link = nav.querySelector(`a[data-i18n="${key}"]`);
      assert.ok(link, `${label}: ${key} link missing.`);
      assert.equal(link.getAttribute("href"), url, `${label}: ${key} URL.`);
      assert.equal(link.getAttribute("target"), "_blank", `${label}: ${key} target.`);
      assert.deepEqual(
        link.getAttribute("rel").trim().split(/\s+/).sort(),
        ["noopener", "noreferrer"],
        `${label}: ${key} rel.`
      );
    }
    const github = document.querySelector(".github-row > .github-link");
    assert.ok(github, `${label}: GitHub icon missing.`);
    assert.equal(github.getAttribute("href"), "https://github.com/LoadComposer/loadcomposer");
  } finally {
    dom.window.close();
  }
}

const modular = read(MODULAR_PATH);
const standalone = read(STANDALONE_PATH);
auditMarkup(modular, "modular");
auditMarkup(standalone, "standalone");

for (const selector of ["script[src]", "link[rel='stylesheet'][href]", "img[src^='http']", "iframe[src]"]) {
  assert.equal(new JSDOM(modular).window.document.querySelectorAll(selector).length, 0, `Remote dependency: ${selector}`);
}

const keySets = [];
for (const code of CODES) {
  const catalog = JSON.parse(read(path.join(ROOT, "site", "lang", `${code}.json`)));
  assert.equal(catalog.meta.version, "1.3.0", `${code}: version.`);
  for (const key of KEYS) {
    assert.equal(typeof catalog.translations[key], "string", `${code}:${key} missing.`);
    assert.ok(catalog.translations[key].trim(), `${code}:${key} empty.`);
  }
  keySets.push(Object.keys(catalog.translations).sort());
}
for (const keys of keySets) assert.deepEqual(keys, keySets[0], "Catalog key parity.");
assert.equal(keySets[0].length, 530, "Catalog key count.");

const standaloneDom = new JSDOM(standalone);
try {
  const embedded = JSON.parse(
    standaloneDom.window.document.getElementById("loadcomposer-embedded-i18n").textContent
  );
  assert.equal(embedded.standalone, true);
  assert.deepEqual(Object.keys(embedded.catalogs), CODES);
  for (const code of CODES) {
    assert.deepEqual(
      embedded.catalogs[code],
      JSON.parse(read(path.join(ROOT, "site", "lang", `${code}.json`))),
      `${code}: embedded catalog differs.`
    );
  }
} finally {
  standaloneDom.window.close();
}

const browser = await launchBrowser(ROOT);
let scenarios = 0;
try {
  for (const code of CODES) {
    const context = await browser.newContext({
      viewport: { width: 320, height: 720 },
      locale: code === "en" ? "en-GB" : `${code}-${code.toUpperCase()}`,
      colorScheme: "light"
    });
    await context.addInitScript(language => {
      localStorage.setItem("loadcomposer.language", language);
      localStorage.setItem("loadcomposer.theme", "light");
    }, code);
    const page = await context.newPage();
    const remote = [];
    page.on("request", request => {
      if (/^https?:/i.test(request.url())) remote.push(request.url());
    });
    await page.goto(pathToFileURL(STANDALONE_PATH).href, { waitUntil: "load" });
    await page.waitForFunction(() => document.documentElement.dataset.i18nReady === "true");
    const state = await page.evaluate(expected => {
      const footer = document.querySelector("footer.footer");
      const nav = footer.querySelector(".footer-links");
      const links = [
        nav.querySelector('[data-i18n="footer.download"]'),
        ...Object.keys(expected).map(key => nav.querySelector(`[data-i18n="${key}"]`))
      ];
      const footerRect = footer.getBoundingClientRect();
      const githubRect = footer.querySelector(".github-link").getBoundingClientRect();
      const linkRects = links.map(link => link.getBoundingClientRect());
      const overlaps = linkRects.some(rect => !(
        rect.right <= githubRect.left ||
        rect.left >= githubRect.right ||
        rect.bottom <= githubRect.top ||
        rect.top >= githubRect.bottom
      ));
      return {
        documentOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        footerOverflow: footer.scrollWidth > footer.clientWidth + 1,
        linksInside: linkRects.every(rect => rect.left >= footerRect.left - 1 && rect.right <= footerRect.right + 1),
        overlaps,
        labels: links.map(link => link.textContent.trim())
      };
    }, EXPECTED_LINKS);
    assert.equal(remote.length, 0, `${code}: unexpected remote request.`);
    assert.equal(state.documentOverflow, false, `${code}: document overflow at 320px.`);
    assert.equal(state.footerOverflow, false, `${code}: footer overflow at 320px.`);
    assert.equal(state.linksInside, true, `${code}: community link outside footer.`);
    assert.equal(state.overlaps, false, `${code}: community link overlaps GitHub icon.`);
    const catalog = JSON.parse(read(path.join(ROOT, "site", "lang", `${code}.json`)));
    assert.deepEqual(
      state.labels,
      [catalog.translations["footer.download"], catalog.translations["footer.suggestions"], catalog.translations["footer.reportIssue"]],
      `${code}: rendered labels.`
    );
    await page.focus('[data-i18n="footer.suggestions"]');
    const focus = await page.$eval('[data-i18n="footer.suggestions"]', element => {
      const style = getComputedStyle(element);
      return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
    });
    assert.notEqual(focus.style, "none", `${code}: focus outline missing.`);
    assert.ok(focus.width >= 2, `${code}: focus outline too thin.`);
    await context.close();
    scenarios += 1;
  }
} finally {
  await browser.close();
}

console.log(
  `Community feedback PASS: Download plus 2 exact community links in modular/standalone; 7 × 530 catalog keys; ` +
  `${scenarios}/${scenarios} mobile file:// layouts without overflow, overlap or remote requests.`
);
