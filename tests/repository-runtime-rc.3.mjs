import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launchBrowser } from "./browser-runtime.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SITE = path.join(ROOT, "site");
const STANDALONE = path.join(
  SITE,
  "downloads",
  "loadcomposer-v1.0.0-rc.3-standalone.html"
);
const CODES = ["it", "en", "de", "es", "fr", "pt", "nl"];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function mime(file) {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".json")) return "application/json; charset=utf-8";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".xml")) return "application/xml; charset=utf-8";
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

async function inspect(browser, url, code) {
  const context = await browser.newContext({
    locale: code === "it" ? "it-IT" : `${code}-${code.toUpperCase()}`,
    viewport: { width: 1024, height: 768 },
    colorScheme: "light"
  });
  const page = await context.newPage();
  const errors = [];
  const remote = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("request", request => {
    const requested = request.url();
    if (/^https?:/i.test(requested) && !/^http:\/\/127\.0\.0\.1:/i.test(requested)) {
      remote.push(requested);
    }
  });
  await page.addInitScript(language => {
    localStorage.setItem("loadcomposer.language", language);
    localStorage.setItem("loadcomposer.theme", "light");
  }, code);
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => (
    document.documentElement.dataset.i18nReady === "true" &&
    document.querySelectorAll("#resultsBody tr").length > 0
  ));
  const state = await page.evaluate(() => ({
    title: document.title,
    badge: document.querySelector(".app-version")?.textContent.trim(),
    language: document.documentElement.lang,
    rows: document.querySelectorAll("#resultsBody tr").length
  }));
  await context.close();
  assert(errors.length === 0, `${url}/${code}: ${errors.join(" | ")}`);
  assert(remote.length === 0, `${url}/${code}: remote requests ${remote.join(", ")}`);
  assert(state.title === "LoadComposer v1.0.0-rc.3", `${url}/${code}: title`);
  assert(state.badge === "v1.0.0-rc.3", `${url}/${code}: badge`);
  assert(state.language === code, `${url}/${code}: active language ${state.language}`);
  assert(state.rows > 0, `${url}/${code}: result table`);
}

const siteServer = await serve(SITE);
const repoServer = await serve(ROOT);
const browser = await launchBrowser(ROOT);
let scenarios = 0;
try {
  const sitePort = siteServer.address().port;
  const repoPort = repoServer.address().port;
  for (const code of CODES) {
    await inspect(browser, `http://127.0.0.1:${sitePort}/`, code);
    scenarios += 1;
  }
  for (const code of ["it", "en"]) {
    await inspect(browser, `http://127.0.0.1:${repoPort}/site/`, code);
    scenarios += 1;
  }
  for (const code of CODES) {
    await inspect(browser, pathToFileURL(STANDALONE).href, code);
    scenarios += 1;
  }
} finally {
  await browser.close();
  await Promise.all([
    new Promise(resolve => siteServer.close(resolve)),
    new Promise(resolve => repoServer.close(resolve))
  ]);
}

console.log(
  `Repository runtime PASS: ${scenarios}/${scenarios} root HTTP, repository-subfolder HTTP, ` +
  "and standalone file:// scenarios; seven languages; zero remote requests."
);
