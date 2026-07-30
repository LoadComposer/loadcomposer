import { spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launchBrowser } from "./browser-runtime.mjs";

const PROJECT = path.resolve(import.meta.dirname, "..");
const ZIP = path.resolve(
  process.argv[2] ||
    process.env.LOADCOMPOSER_DELIVERY_ZIP ||
    path.join(PROJECT, "..", "loadcomposer-v1.0.0-rc.2-delivery.zip")
);
const ROOT_NAME = "delivery-v1.0.0-rc.2";
const CODES = ["it", "en", "de", "es", "fr", "pt", "nl"];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed (${result.status})\n` +
      `${result.stdout || ""}${result.stderr || ""}`
    );
  }
  return result.stdout;
}

function walk(directory, root = directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full, root);
    return [path.relative(root, full).split(path.sep).join("/")];
  }).sort();
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

async function inspect(browser, url, code) {
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
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
  }, code);
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => (
    document.documentElement.dataset.i18nReady === "true" &&
    document.querySelectorAll("#resultsBody tr").length > 0
  ));
  const state = await page.evaluate(() => ({
    title: document.title,
    badge: document.querySelector(".app-version")?.textContent.trim(),
    language: document.documentElement.lang
  }));
  await context.close();
  assert(errors.length === 0, `${url}/${code}: ${errors.join(" | ")}`);
  assert(remote.length === 0, `${url}/${code}: remote requests ${remote.join(", ")}`);
  assert(state.title === "LoadComposer v1.0.0-rc.2", `${url}/${code}: title`);
  assert(state.badge === "v1.0.0-rc.2", `${url}/${code}: badge`);
  assert(state.language === code, `${url}/${code}: language`);
}

assert(fs.existsSync(ZIP), `Delivery ZIP missing: ${ZIP}`);
run("unzip", ["-t", ZIP]);
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "loadcomposer-rc2-delivery-"));
run("unzip", ["-q", ZIP, "-d", temporary]);
const root = path.join(temporary, ROOT_NAME);
assert(fs.statSync(root).isDirectory(), `Archive root is not ${ROOT_NAME}.`);

const required = [
  "LICENSE",
  "LICENSE.it.md",
  "NOTICE",
  "README.md",
  "README.it.md",
  "LEGAL_AUDIT-v1.0.0-rc.2.md",
  "TEST_REPORT-v1.0.0-rc.2.md",
  "RELEASE_CHECKLIST-v1.0.0-rc.2.md",
  "SHA256SUMS-v1.0.0-rc.2.txt",
  "DELIVERY_MANIFEST-v1.0.0-rc.2.txt",
  "loadcomposer-v1.0.0-rc.2-test-bundle.zip",
  "site/index.html",
  "site/downloads/loadcomposer-v1.0.0-rc.2-standalone.html",
  "site/_headers",
  "site/_redirects",
  "site/robots.txt",
  "site/sitemap.xml"
];
for (const relative of required) {
  assert(fs.existsSync(path.join(root, relative)), `Required delivery file missing: ${relative}`);
}
for (const code of CODES) {
  assert(fs.existsSync(path.join(root, "site", "lang", `${code}.json`)), `${code} missing.`);
}

const files = walk(root);
assert(files.every(file => !file.includes("node_modules/")), "node_modules entered delivery.");
assert(files.every(file => !/v0\.9\.0-alpha\./i.test(file)), "Pre-RC.1 application path entered delivery.");
assert(files.every(file => !/(?:^|\/)\.(?:env|npmrc)(?:$|\.)/.test(file)), "Secret/config file entered delivery.");

const checksumOutput = run(
  "sha256sum",
  ["-c", "SHA256SUMS-v1.0.0-rc.2.txt"],
  { cwd: root }
);
const verified = checksumOutput.trim().split("\n").filter(Boolean);
assert(verified.length === files.length - 1, "Checksum coverage does not cover every file except the checksum list.");
assert(verified.every(line => line.endsWith(": OK")), "Internal checksum failure.");

const bundle = path.join(root, "loadcomposer-v1.0.0-rc.2-test-bundle.zip");
run("unzip", ["-t", bundle]);
const bundleList = run("unzip", ["-Z1", bundle]).split("\n").filter(Boolean);
assert(
  bundleList.every(file => file.startsWith("loadcomposer-v1.0.0-rc.2-test-bundle/")),
  "Test bundle root is inconsistent."
);
assert(bundleList.some(file => file.endsWith("/package-lock.json")), "Test bundle lockfile missing.");
assert(bundleList.some(file => file.includes("/tests/fixtures/baseline-v1.0.0-rc.1/")), "RC.1 fixture missing.");
assert(bundleList.every(file => !/v0\.9\.0-alpha\./i.test(file)), "Pre-RC.1 application fixture entered test bundle.");

const server = await serve(path.join(root, "site"));
const browser = await launchBrowser(PROJECT);
let scenarios = 0;
try {
  const port = server.address().port;
  for (const code of CODES) {
    await inspect(browser, `http://127.0.0.1:${port}/`, code);
    scenarios += 1;
  }
  const standalone = pathToFileURL(
    path.join(root, "site", "downloads", "loadcomposer-v1.0.0-rc.2-standalone.html")
  ).href;
  for (const code of CODES) {
    await inspect(browser, standalone, code);
    scenarios += 1;
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

console.log(
  `Final delivery PASS: ${files.length} files, ${verified.length}/${verified.length} checksums, ` +
  `${scenarios}/${scenarios} HTTP/file scenarios, seven languages, zero remote requests, test bundle intact.`
);
