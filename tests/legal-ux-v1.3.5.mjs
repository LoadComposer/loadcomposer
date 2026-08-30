import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { JSDOM } from "jsdom";
import { launchBrowser } from "./browser-runtime.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SITE = path.join(ROOT, "site");
const EVIDENCE = path.join(ROOT, "legal-visual-evidence-v1.3.5");
const OUTPUT = path.join(ROOT, "legal-ux-results-v1.3.5.json");
const CODES = ["it", "en", "de", "es", "fr", "pt", "nl"];
const LEGAL_HASHES = {
  LICENSE: "07c8360fa6840b24641b2e9443c82d8001ad8c4d32bc58f43fb04f64a1d080d0",
  "LICENSE.it.md": "8b47a93a962da349910972a6125ec7ce1997b07fb951e2c316b10c187c875266",
  NOTICE: "0b1322e4517d715f95e44d63d576b663b2b9c65e8e97caed2fc6e7cae86e266f",
  "TRADEMARKS.md": "5c69098cb03d6033200b42edb4eefb1b9a0a0542e91f05a57ec58c61f5337490",
  "COMMERCIAL-LICENSING.md": "59444c07f5f7286d1e032211b7e933aa9ab357e6d0a66e7c1022e673c3a6e3c4",
  "PRIVACY.md": "13ba9454ebab8c3bbaf195e978c3b2e7a4cf0f69bc0d732bd622e35d811f5e28",
  "SECURITY.md": "41f27656c06f55d1ad059f9ec7738bb2ee884270ccae86b0f4d6316a93efe076"
};
const PAGES = [
  { route: "license", files: ["LICENSE", "LICENSE.it.md"] },
  { route: "notices", files: ["NOTICE"] },
  { route: "trademarks", files: ["TRADEMARKS.md"] },
  { route: "commercial", files: ["COMMERCIAL-LICENSING.md"] },
  { route: "privacy", files: ["PRIVACY.md"] },
  { route: "security", files: ["SECURITY.md"] }
];
const THEMES = [
  { preference: "light", colorScheme: "light", resolved: "light" },
  { preference: "dark", colorScheme: "dark", resolved: "dark" },
  { preference: "auto", colorScheme: "light", resolved: "light" },
  { preference: "auto", colorScheme: "dark", resolved: "dark" }
];
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 320, height: 720 }
];

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function mime(file) {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".json")) return "application/json; charset=utf-8";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".png")) return "image/png";
  return "text/plain; charset=utf-8";
}

async function serve(root) {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    let target = path.join(root, pathname);
    if (pathname.endsWith("/")) target = path.join(target, "index.html");
    if (!target.startsWith(root) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
      response.writeHead(404).end("Not found");
      return;
    }
    response.setHeader("content-type", mime(target));
    response.end(fs.readFileSync(target));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return server;
}

function markdownHeadings(file) {
  return fs.readFileSync(file, "utf8").split(/\r?\n/)
    .map(line => {
      const match = line.match(/^(#{1,6})\s+(.+?)\s*$/);
      return match ? { level: match[1].length, text: match[2] } : null;
    })
    .filter(Boolean);
}

function plainInlineMarkdown(value) {
  return String(value)
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/\[([^\]\n]+)\]\([^\s)]+\)/g, "$1")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1");
}

function hardBreakExpectation(file) {
  const lines = fs.readFileSync(file, "utf8").replace(/\r\n?/g, "\n").split("\n");
  const lineIndex = lines.findIndex((line, index) => / {2,}$/.test(line) && index + 1 < lines.length && lines[index + 1].trim());
  assert.notEqual(lineIndex, -1, `${path.basename(file)}: canonical Markdown hard break missing`);
  return {
    before: plainInlineMarkdown(lines[lineIndex].replace(/ {2,}$/, "").trim()),
    after: plainInlineMarkdown(lines[lineIndex + 1].trim())
  };
}

function textAroundBreak(element) {
  const hardBreak = element.querySelector("br");
  assert.ok(hardBreak, "generated hard break missing");
  const nodes = [...element.childNodes];
  const breakIndex = nodes.indexOf(hardBreak);
  return {
    hardBreakCount: element.querySelectorAll("br").length,
    before: nodes.slice(0, breakIndex).map(node => node.textContent).join("").trim(),
    after: nodes.slice(breakIndex + 1).map(node => node.textContent).join("").trim()
  };
}

fs.mkdirSync(EVIDENCE, { recursive: true });

const sourceInventory = [];
for (const [filename, expected] of Object.entries(LEGAL_HASHES)) {
  const canonical = path.join(ROOT, filename);
  const publicCopy = path.join(SITE, "legal", "raw", filename);
  const legacyCopy = path.join(SITE, "legal", filename);
  assert.equal(sha256(canonical), expected, `${filename}: canonical hash`);
  assert.equal(sha256(publicCopy), expected, `${filename}: public hash`);
  assert.ok(fs.readFileSync(canonical).equals(fs.readFileSync(publicCopy)), `${filename}: byte identity`);
  assert.equal(fs.existsSync(legacyCopy), false, `${filename}: legacy physical raw path must be absent`);
  sourceInventory.push({ path: filename, publicPath: `site/legal/raw/${filename}`, sha256: expected, identical: true });
}

const redirects = fs.readFileSync(path.join(SITE, "_redirects"), "utf8").split(/\r?\n/);
for (const filename of Object.keys(LEGAL_HASHES)) {
  assert.ok(
    redirects.includes(`/legal/${filename} /legal/raw/${filename} 301`),
    `${filename}: collision-free legacy raw redirect missing`
  );
}

const staticTitles = new Set();
for (const pageInfo of PAGES) {
  const pagePath = path.join(SITE, "legal", pageInfo.route, "index.html");
  const html = fs.readFileSync(pagePath, "utf8");
  assert.equal(/\bfetch\s*\(/.test(html), false, `${pageInfo.route}: runtime fetch`);
  assert.equal(/XMLHttpRequest/.test(html), false, `${pageInfo.route}: runtime XHR`);
  const dom = new JSDOM(html);
  try {
    const document = dom.window.document;
    const title = document.title.trim();
    assert.ok(title && !staticTitles.has(title), `${pageInfo.route}: unique title`);
    staticTitles.add(title);
    assert.ok(document.querySelector('meta[name="description"]')?.content.trim(), `${pageInfo.route}: description`);
    assert.equal(document.querySelector('meta[name="viewport"]')?.content, "width=device-width, initial-scale=1.0");
    assert.equal(document.querySelector('meta[name="robots"]')?.content.includes("noindex"), false);
    assert.equal(document.querySelector('link[rel="canonical"]')?.href, `https://loadcomposer.com/legal/${pageInfo.route}/`);
    assert.ok(document.querySelector("header .brand[href='/']"), `${pageInfo.route}: home logo`);
    assert.ok(document.querySelector(".breadcrumb"), `${pageInfo.route}: breadcrumb`);
    assert.ok(document.querySelector("#languageSelect"), `${pageInfo.route}: language selector`);
    assert.ok(document.querySelector("#themeSelect"), `${pageInfo.route}: theme selector`);
    assert.ok(html.includes("width: min(1100px, 100%)"), `${pageInfo.route}: outer long-form width`);
    assert.ok(html.includes("width: min(88ch, 100%)"), `${pageInfo.route}: prose measure`);
    const sourceLinks = [...document.querySelectorAll(".source-links a")];
    assert.equal(sourceLinks.length, pageInfo.files.length, `${pageInfo.route}: source links`);
    for (const [index, link] of sourceLinks.entries()) {
      assert.equal(link.getAttribute("href"), `/legal/raw/${pageInfo.files[index]}`, `${pageInfo.route}: raw source URL`);
      assert.equal(link.target, "_blank");
      assert.equal(link.rel, "noopener noreferrer");
    }
    const resources = [...document.querySelectorAll("script[src],link[rel='stylesheet'][href],img[src],iframe[src]")];
    assert.ok(resources.every(element => !/^(?:https?:)?\/\//i.test(element.getAttribute("src") || element.getAttribute("href") || "")), `${pageInfo.route}: remote runtime resource`);
  } finally {
    dom.window.close();
  }
}

const licenseDom = new JSDOM(fs.readFileSync(path.join(SITE, "legal", "license", "index.html"), "utf8"));
try {
  const document = licenseDom.window.document;
  assert.ok(document.querySelector("#licenseTextSelect"), "license selector missing");
  assert.equal(document.querySelectorAll("[data-license-panel]").length, 2);
  for (const [code, filename] of [["en", "LICENSE"], ["it", "LICENSE.it.md"]]) {
    const panel = document.querySelector(`[data-license-panel="${code}"]`);
    const [documentTitle, ...sectionHeadings] = markdownHeadings(path.join(ROOT, filename));
    assert.equal(documentTitle.level, 1, `${filename}: canonical document title level`);
    assert.ok(sectionHeadings.every(heading => heading.level > documentTitle.level), `${filename}: canonical section levels`);
    const tocList = panel.querySelector(".toc > .toc-list");
    assert.equal(tocList?.tagName, "UL", `${filename}: TOC must not add ordered-list numbering`);
    const tocLinks = [...tocList.querySelectorAll("a")];
    const toc = tocLinks.map(link => link.textContent.trim());
    assert.deepEqual(toc, sectionHeadings.map(heading => heading.text), `${filename}: TOC from canonical section headings`);
    assert.equal(toc.includes(documentTitle.text), false, `${filename}: document title must be absent from TOC`);
    assert.equal(toc.length, 18, `${filename}: numbered section count`);
    assert.equal(toc.some(text => /^0\.\s/.test(text)), false, `${filename}: artificial zero entry`);
    for (const [index, link] of tocLinks.entries()) {
      const expected = sectionHeadings[index].text;
      const sectionNumber = expected.match(/^(\d+)\.\s/);
      assert.ok(sectionNumber, `${filename}: canonical numbered heading expected: ${expected}`);
      assert.equal(Number(sectionNumber[1]), index + 1, `${filename}: canonical section order`);
      assert.equal((link.textContent.match(/\b\d+\.\s/g) || []).length, 1, `${filename}: section number must appear exactly once`);
      assert.equal(/^\d+\.\s+\d+\.\s/.test(link.textContent.trim()), false, `${filename}: duplicated TOC numbering`);
      const href = link.getAttribute("href");
      assert.ok(href.startsWith(`#${code}-`), `${filename}: stable anchor prefix`);
      const target = document.getElementById(href.slice(1));
      assert.ok(target, `${filename}: TOC target missing: ${href}`);
      assert.equal(target.textContent.trim(), expected, `${filename}: canonical heading text rewritten`);
    }
    const prose = panel.querySelector(".prose");
    assert.equal(prose.lang, code);
    assert.equal(prose.dataset.sourceFile, filename);
    assert.equal(prose.dataset.sourceSha256, LEGAL_HASHES[filename]);
    const bodyTitle = [...prose.querySelectorAll("h2, h3, h4, h5, h6")]
      .find(heading => heading.textContent.trim() === documentTitle.text);
    assert.ok(bodyTitle, `${filename}: document title missing from body`);
    assert.equal(bodyTitle.tagName, "H2", `${filename}: document title hierarchy changed`);
    assert.ok(tocLinks.every(link => document.getElementById(link.getAttribute("href").slice(1))?.tagName === "H3"), `${filename}: section heading hierarchy changed`);
    const expectedBreak = hardBreakExpectation(path.join(ROOT, filename));
    const metadataParagraph = [...prose.querySelectorAll("p")].find(paragraph =>
      paragraph.textContent.includes(expectedBreak.before) && paragraph.textContent.includes(expectedBreak.after)
    );
    assert.ok(metadataParagraph, `${filename}: faithful metadata paragraph missing`);
    assert.deepEqual(textAroundBreak(metadataParagraph), {
      hardBreakCount: 1,
      before: expectedBreak.before,
      after: expectedBreak.after
    }, `${filename}: canonical hard break rendering`);
    assert.equal(prose.textContent.split(expectedBreak.before).length - 1, 1, `${filename}: text before break duplicated or lost`);
    assert.equal(prose.textContent.split(expectedBreak.after).length - 1, 1, `${filename}: text after break duplicated or lost`);
  }
  const rendererSource = fs.readFileSync(path.join(ROOT, "scripts", "prepare-site-legal.mjs"), "utf8");
  assert.equal(rendererSource.includes("Identifier:"), false, "renderer must not hardcode License text");
  assert.equal(rendererSource.includes("SPDX expression for package metadata:"), false, "renderer must not hardcode License text");
} finally {
  licenseDom.window.close();
}

const hubDom = new JSDOM(fs.readFileSync(path.join(SITE, "legal", "index.html"), "utf8"));
try {
  const normalLinks = [...hubDom.window.document.querySelectorAll("main li a")].map(link => link.getAttribute("href"));
  assert.deepEqual(normalLinks, [
    "./license/?lang=en", "./license/?lang=it", "./notices/", "./trademarks/",
    "./commercial/", "./privacy/", "./security/"
  ]);
  assert.ok(normalLinks.every(link => !/(?:\.md|\/LICENSE|\/NOTICE)$/i.test(link)));
} finally {
  hubDom.window.close();
}

for (const [relative, standalone] of [
  ["site/index.html", false],
  ["site/downloads/loadcomposer-v1.3.5-standalone.html", true]
]) {
  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, relative), "utf8"));
  try {
    const links = [...dom.window.document.querySelectorAll(".footer-links a")];
    const expected = standalone
      ? [
          "https://loadcomposer.com/legal/license/",
          "https://loadcomposer.com/legal/privacy/",
          "https://loadcomposer.com/legal/",
          "https://loadcomposer.com/downloads/"
        ]
      : ["./legal/license/", "./legal/privacy/", "./legal/", "./downloads/"];
    assert.deepEqual(links.slice(0, 4).map(link => link.getAttribute("href")), expected, `${relative}: internal footer routes`);
    assert.ok(links.slice(0, 4).every(link => !link.hasAttribute("target")), `${relative}: internal same-tab links`);
    assert.ok(links.slice(4).every(link => link.target === "_blank" && link.rel === "noopener noreferrer"), `${relative}: external links`);
  } finally {
    dom.window.close();
  }
}

const server = await serve(SITE);
const address = server.address();
const origin = `http://127.0.0.1:${address.port}`;
const browser = await launchBrowser(ROOT);
const scenarios = [];
const screenshots = [];
try {
  let scenarioIndex = 0;
  for (const pageInfo of PAGES) {
    for (const theme of THEMES) {
      for (const viewport of VIEWPORTS) {
        const code = CODES[scenarioIndex % CODES.length];
        const context = await browser.newContext({
          viewport: { width: viewport.width, height: viewport.height },
          locale: code === "en" ? "en-GB" : `${code}-${code.toUpperCase()}`,
          colorScheme: theme.colorScheme
        });
        await context.addInitScript(({ language, preference }) => {
          localStorage.setItem("loadcomposer.language", language);
          localStorage.setItem("loadcomposer.theme", preference);
        }, { language: code, preference: theme.preference });
        const browserErrors = [];
        const remoteRequests = [];
        const page = await context.newPage();
        page.on("pageerror", error => browserErrors.push(error.message));
        page.on("console", message => { if (message.type() === "error") browserErrors.push(message.text()); });
        page.on("request", request => {
          const requested = new URL(request.url());
          if (requested.hostname !== "127.0.0.1") remoteRequests.push(request.url());
        });
        const query = pageInfo.route === "license" ? "?lang=en" : "";
        const response = await page.goto(`${origin}/legal/${pageInfo.route}/${query}`, { waitUntil: "load" });
        assert.equal(response.status(), 200, `${pageInfo.route}: direct route status`);
        await page.waitForFunction(() => document.documentElement.dataset.i18nReady === "true");
        const state = await page.evaluate(() => {
          const shell = document.querySelector(".shell").getBoundingClientRect();
          const article = document.querySelector(".article-shell").getBoundingClientRect();
          const prose = document.querySelector(".prose:not([hidden])") || document.querySelector(".prose");
          const proseRect = prose.getBoundingClientRect();
          return {
            language: document.documentElement.lang,
            preference: document.documentElement.dataset.themePreference,
            theme: document.documentElement.dataset.theme,
            title: document.title,
            h1: document.querySelector("h1").textContent.trim(),
            overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
            shellWidth: shell.width,
            articleWidth: article.width,
            proseWidth: proseRect.width,
            duplicateIds: [...document.querySelectorAll("[id]")].length - new Set([...document.querySelectorAll("[id]")].map(element => element.id)).size,
            tocListStyle: document.querySelector(".toc-list") ? getComputedStyle(document.querySelector(".toc-list")).listStyleType : null,
            documentTitleSize: prose.querySelector("h2") ? parseFloat(getComputedStyle(prose.querySelector("h2")).fontSize) : null,
            sectionHeadingSize: prose.querySelector("h3") ? parseFloat(getComputedStyle(prose.querySelector("h3")).fontSize) : null
          };
        });
        assert.deepEqual(browserErrors, [], `${pageInfo.route}/${theme.preference}/${viewport.name}: browser errors`);
        assert.deepEqual(remoteRequests, [], `${pageInfo.route}/${theme.preference}/${viewport.name}: remote requests`);
        assert.equal(state.language, code);
        assert.equal(state.preference, theme.preference);
        assert.equal(state.theme, theme.resolved);
        assert.ok(state.title.includes("LoadComposer"));
        assert.ok(state.h1);
        assert.equal(state.overflow, false);
        assert.ok(state.shellWidth <= 1100.5);
        assert.ok(state.articleWidth <= 1100.5);
        assert.ok(state.proseWidth <= 900);
        assert.equal(state.duplicateIds, 0);
        if (pageInfo.route === "license") {
          assert.equal(state.tocListStyle, "none", `${pageInfo.route}/${theme.preference}/${viewport.name}: automatic TOC marker`);
          assert.ok(state.documentTitleSize > state.sectionHeadingSize, `${pageInfo.route}/${theme.preference}/${viewport.name}: document-title hierarchy`);
        }

        const shouldCapture =
          (theme.preference === "light" && viewport.name === "desktop") ||
          (theme.preference === "dark" && viewport.name === "mobile") ||
          (pageInfo.route === "license" && theme.preference === "auto" && viewport.name === "tablet");
        if (shouldCapture) {
          const filename = `${pageInfo.route}-${theme.preference}-${theme.colorScheme}-${viewport.name}.png`;
          const destination = path.join(EVIDENCE, filename);
          await page.screenshot({ path: destination, fullPage: true });
          screenshots.push({ file: `legal-visual-evidence-v1.3.5/${filename}`, sha256: sha256(destination) });
        }

        if (pageInfo.route === "license" && theme.preference === "light" && viewport.name === "desktop") {
          await page.selectOption("#licenseTextSelect", "it");
          assert.match(page.url(), /[?&]lang=it(?:&|$)/);
          assert.equal(await page.locator('[data-license-panel="it"]').isVisible(), true);
          assert.equal(await page.locator('[data-license-panel="en"]').isVisible(), false);
          await page.goBack();
          assert.equal(await page.locator('[data-license-panel="en"]').isVisible(), true);
        }

        scenarios.push({
          route: `/legal/${pageInfo.route}/`, shellLanguage: code,
          themePreference: theme.preference, resolvedTheme: theme.resolved,
          viewport: viewport.name, status: "PASS"
        });
        scenarioIndex += 1;
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

const report = {
  version: "1.3.5",
  status: "PASS",
  sourceInventory,
  routes: PAGES.map(page => `/legal/${page.route}/`),
  rendering: {
    static: true,
    runtimeMarkdownFetches: 0,
    legalBodyLanguages: ["en", "it"],
    newLegalTranslations: 0,
    shellLanguages: CODES,
    outerMaxWidthPx: 1100,
    proseMaxMeasureCh: 88
  },
  visualQa: {
    scenarios: scenarios.length,
    expectedScenarios: PAGES.length * THEMES.length * VIEWPORTS.length,
    themes: ["Light", "Dark", "Auto light", "Auto dark"],
    viewports: VIEWPORTS.map(viewport => viewport.name),
    screenshots
  },
  license: {
    selector: "PASS",
    states: ["en governing", "it informational"],
    historyNavigation: "PASS",
    tocFromCanonicalHeadings: "PASS"
  },
  navigation: {
    hubStyledRoutes: "PASS",
    internalSameTab: "PASS",
    externalNewTabNoopener: "PASS",
    directHttpRoutes: "PASS"
  }
};
assert.equal(scenarios.length, 72);
fs.writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(
  `Legal UX v1.3.5 PASS: 6 static routes, 7/7 canonical sources byte-identical, ` +
  `${scenarios.length}/72 visual scenarios, ${screenshots.length} screenshots, zero overflow or remote runtime requests.`
);
