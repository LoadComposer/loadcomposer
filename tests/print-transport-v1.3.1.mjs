import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launchBrowser } from "./browser-runtime.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const SITE = path.join(ROOT, "site");
const CURRENT = path.join(SITE, "downloads", "loadcomposer-v1.3.1-standalone.html");
const BASELINE = path.join(SITE, "downloads", "loadcomposer-v1.3.0-standalone.html");
const OUTPUT = path.join(ROOT, "print-transport-results-v1.3.1.json");
const FRAME_SELECTOR = "iframe[data-loadcomposer-print-frame='true']";

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

async function installHarness(page) {
  await page.addInitScript(() => {
    const NativeDate = Date;
    const fixedTime = new NativeDate("2026-08-22T12:34:56Z").valueOf();
    window.Date = class FixedDate extends NativeDate {
      constructor(...args) {
        super(...(args.length ? args : [fixedTime]));
      }
      static now() {
        return fixedTime;
      }
    };

    window.__printHarness = {
      behavior: "hold",
      frameAppends: 0,
      printCalls: 0,
      windowOpenCalls: 0,
      alerts: []
    };
    window.alert = message => window.__printHarness.alerts.push(String(message));
    window.open = () => {
      window.__printHarness.windowOpenCalls += 1;
      return null;
    };

    const appendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function appendWithPrintHarness(child) {
      const appended = appendChild.call(this, child);
      if (child instanceof HTMLIFrameElement && child.dataset.loadcomposerPrintFrame === "true") {
        window.__printHarness.frameAppends += 1;
        const frameWindow = child.contentWindow;
        frameWindow.print = () => {
          window.__printHarness.printCalls += 1;
          const behavior = window.__printHarness.behavior;
          if (behavior === "throw") throw new Error("simulated print failure");
          if (behavior === "afterprint") {
            setTimeout(() => frameWindow.dispatchEvent(new frameWindow.Event("afterprint")), 0);
          }
        };
      }
      return appended;
    };
  });
}

async function openCurrent(browser, url) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    timezoneId: "Europe/Rome"
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
    if (
      /^https?:/i.test(requested) &&
      !/^http:\/\/127\.0\.0\.1:/i.test(requested)
    ) {
      remote.push(requested);
    }
  });
  await installHarness(page);
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => (
    document.documentElement.dataset.i18nReady === "true" &&
    document.querySelectorAll("#resultsBody tr").length > 0
  ));
  return { context, page, errors, remote };
}

async function clickAndWait(page, expectedCalls) {
  await page.click("#printLayoutBtn");
  await page.waitForFunction(
    calls => window.__printHarness.printCalls === calls,
    expectedCalls
  );
}

async function captureBaselinePrint(browser) {
  const context = await browser.newContext({ timezoneId: "Europe/Rome" });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const NativeDate = Date;
    const fixedTime = new NativeDate("2026-08-22T12:34:56Z").valueOf();
    window.Date = class FixedDate extends NativeDate {
      constructor(...args) {
        super(...(args.length ? args : [fixedTime]));
      }
      static now() {
        return fixedTime;
      }
    };
  });
  await page.goto(pathToFileURL(BASELINE).href, { waitUntil: "load" });
  await page.waitForFunction(() => document.documentElement.dataset.i18nReady === "true");
  const captured = await page.evaluate(() => {
    let html = "";
    window.open = () => ({
      document: {
        open() {},
        write(value) { html += String(value); },
        close() {}
      }
    });
    printCurrentLayout();
    const parsed = new DOMParser().parseFromString(html, "text/html");
    parsed.querySelectorAll("script").forEach(script => script.remove());
    parsed.body.removeAttribute("data-print-ready");
    parsed.querySelector(".schema img")?.setAttribute("src", "data:image/png;base64,PRINT_SCHEMA");
    while (parsed.body.lastChild && parsed.body.lastChild !== parsed.body.lastElementChild) {
      parsed.body.lastChild.remove();
    }
    return parsed.documentElement.outerHTML;
  });
  await context.close();
  return captured;
}

function sourcePrintTransport(source) {
  const start = source.indexOf("    let currentPrintFrame = null;");
  const end = source.indexOf("\n    function printCurrentLayout()", start);
  assert.ok(start >= 0 && end > start, "Print transport source block missing.");
  return source.slice(start, end);
}

assert.ok(fs.existsSync(CURRENT), "v1.3.1 standalone missing; run the build first.");
assert.ok(fs.existsSync(BASELINE), "Canonical v1.3.0 standalone missing.");

const authored = fs.readFileSync(path.join(SITE, "index.html"), "utf8");
const standalone = fs.readFileSync(CURRENT, "utf8");
assert.doesNotMatch(
  sourcePrintTransport(authored) + authored.slice(
    authored.indexOf("    function printCurrentLayout()"),
    authored.indexOf("\n    function syncModeUI", authored.indexOf("    function printCurrentLayout()"))
  ),
  /window\.open\s*\(\s*["']{2}\s*,\s*["']_blank["']/,
  "Active print path still contains a top-level window.open call."
);
assert.equal(
  sourcePrintTransport(authored),
  sourcePrintTransport(standalone),
  "Online shell and standalone print transports differ."
);
assert.doesNotMatch(authored, /print\.popupBlocked/, "Obsolete popup error key remains active.");
assert.match(authored, /print\.dialogUnavailable/, "Generic print error key missing.");

const server = await serve(SITE);
const browser = await launchBrowser(ROOT);
const results = {
  version: "1.3.1",
  browser: "Chromium 149",
  transport: "isolated in-page iframe",
  onlineShell: null,
  standaloneFile: null,
  parity: null
};

try {
  const online = await openCurrent(browser, `http://127.0.0.1:${server.address().port}/`);
  const { page } = online;
  await page.evaluate(() => {
    const stackable = document.getElementById("stackable");
    const maxLayers = document.getElementById("maxLayers");
    const verticalGap = document.getElementById("verticalGap");
    stackable.checked = true;
    maxLayers.value = "3";
    verticalGap.value = "20";
    verticalGap.dataset.mm = "20";
    stackable.dispatchEvent(new Event("change", { bubbles: true }));
    calculate();
  });
  const initialState = await page.evaluate(() => ({
    loadMode: document.getElementById("loadMode").value,
    quantity: document.getElementById("quantity").value,
    height: document.getElementById("palletHeight").value,
    gap: document.getElementById("gap").value,
    identifier: document.querySelector("#singlePalletGroup [data-field='identifier']").value,
    rotation: document.querySelector("#singlePalletGroup [data-field='allowRotate']").checked,
    stackable: document.getElementById("stackable").checked,
    maxLayers: document.getElementById("maxLayers").value,
    verticalGap: document.getElementById("verticalGap").value,
    unit: document.querySelector("input[name='linearUnit']:checked").value,
    draw: document.getElementById("drawSelect").value,
    view: document.getElementById("printView").value,
    bw: document.getElementById("printBw").checked
  }));

  await clickAndWait(page, 1);
  const first = await page.evaluate(selector => {
    const frame = document.querySelector(selector);
    return {
      count: document.querySelectorAll(selector).length,
      id: frame?.id,
      ariaHidden: frame?.getAttribute("aria-hidden"),
      tabIndex: frame?.getAttribute("tabindex"),
      position: frame?.style.position,
      left: frame?.style.left,
      width: frame?.style.width,
      height: frame?.style.height,
      pointerEvents: frame?.style.pointerEvents,
      ready: frame?.contentDocument?.body?.dataset.printReady,
      hasDocument: Boolean(frame?.contentDocument?.querySelector(".schema img")),
      hasLegend: Boolean(frame?.contentDocument?.querySelector(".legend-section")),
      hasDetails: Boolean(frame?.contentDocument?.querySelector(".details-section")),
      html: frame?.contentDocument?.documentElement?.outerHTML || "",
      harness: { ...window.__printHarness }
    };
  }, FRAME_SELECTOR);
  assert.equal(first.count, 1);
  assert.equal(first.id, "loadcomposer-print-frame");
  assert.equal(first.ariaHidden, "true");
  assert.equal(first.tabIndex, "-1");
  assert.equal(first.position, "fixed");
  assert.equal(first.left, "-10000px");
  assert.equal(first.width, "1px");
  assert.equal(first.height, "1px");
  assert.equal(first.pointerEvents, "none");
  assert.equal(first.ready, "true");
  assert.ok(first.hasDocument && first.hasLegend && first.hasDetails);
  assert.equal(first.harness.windowOpenCalls, 0);
  assert.equal(first.harness.printCalls, 1);

  const focus = await page.evaluate(() => {
    const selectors = [
      "#loadMode",
      "#singlePalletGroup [data-action='togglePicker']",
      "#palletHeight",
      "#quantity",
      "#gap",
      "#singlePalletGroup [data-field='identifier']",
      "#stackable",
      "#maxLayers",
      "#verticalGap",
      "#drawSelect",
      "#printView",
      "input[name='linearUnit'][value='mm']",
      "#singlePalletGroup [data-field='allowRotate']",
      "#themeToggle",
      "#languageToggle"
    ];
    let inputEvents = 0;
    let changeEvents = 0;
    const quantity = document.getElementById("quantity");
    quantity.addEventListener("input", () => { inputEvents += 1; }, { once: true });
    const loadMode = document.getElementById("loadMode");
    loadMode.addEventListener("change", () => { changeEvents += 1; }, { once: true });
    quantity.dispatchEvent(new Event("input", { bubbles: true }));
    loadMode.dispatchEvent(new Event("change", { bubbles: true }));
    const failures = [];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      element.focus();
      if (document.activeElement !== element) failures.push(selector);
    }
    return { failures, inputEvents, changeEvents };
  });
  assert.deepEqual(focus.failures, []);
  assert.equal(focus.inputEvents, 1);
  assert.equal(focus.changeEvents, 1);

  await clickAndWait(page, 2);
  assert.equal(await page.locator(FRAME_SELECTOR).count(), 1, "Stale frame accumulated.");
  await page.evaluate(selector => {
    const frame = document.querySelector(selector);
    frame.contentWindow.dispatchEvent(new frame.contentWindow.Event("afterprint"));
  }, FRAME_SELECTOR);
  await page.waitForFunction(selector => document.querySelectorAll(selector).length === 0, FRAME_SELECTOR);

  await page.evaluate(() => { window.__printHarness.behavior = "afterprint"; });
  for (const expected of [3, 4, 5]) {
    await clickAndWait(page, expected);
    await page.waitForFunction(selector => document.querySelectorAll(selector).length === 0, FRAME_SELECTOR);
  }

  await page.evaluate(() => { window.__printHarness.behavior = "throw"; });
  await clickAndWait(page, 6);
  await page.waitForFunction(() => window.__printHarness.alerts.length > 0);
  assert.equal(await page.locator(FRAME_SELECTOR).count(), 0, "Error path left a print frame.");
  const errorMessage = await page.evaluate(() => window.__printHarness.alerts.at(-1));
  assert.doesNotMatch(errorMessage, /popup/i);

  const finalState = await page.evaluate(() => ({
    loadMode: document.getElementById("loadMode").value,
    quantity: document.getElementById("quantity").value,
    height: document.getElementById("palletHeight").value,
    gap: document.getElementById("gap").value,
    identifier: document.querySelector("#singlePalletGroup [data-field='identifier']").value,
    rotation: document.querySelector("#singlePalletGroup [data-field='allowRotate']").checked,
    stackable: document.getElementById("stackable").checked,
    maxLayers: document.getElementById("maxLayers").value,
    verticalGap: document.getElementById("verticalGap").value,
    unit: document.querySelector("input[name='linearUnit']:checked").value,
    draw: document.getElementById("drawSelect").value,
    view: document.getElementById("printView").value,
    bw: document.getElementById("printBw").checked
  }));
  assert.deepEqual(finalState, initialState, "Printing changed the form state.");
  assert.deepEqual(online.errors, [], `Online shell errors: ${online.errors.join(" | ")}`);
  assert.deepEqual(online.remote, [], `Online shell remote requests: ${online.remote.join(", ")}`);

  const baselinePrint = await captureBaselinePrint(browser);
  const normalizedCurrent = await page.evaluate(selector => {
    window.__printHarness.behavior = "hold";
    resetDefaults();
    calculate();
    printCurrentLayout();
    const frame = document.querySelector(selector);
    const clone = new DOMParser().parseFromString(
      frame.contentDocument.documentElement.outerHTML,
      "text/html"
    );
    clone.querySelectorAll("script").forEach(script => script.remove());
    clone.body.removeAttribute("data-print-ready");
    clone.querySelector(".schema img")?.setAttribute("src", "data:image/png;base64,PRINT_SCHEMA");
    while (clone.body.lastChild && clone.body.lastChild !== clone.body.lastElementChild) {
      clone.body.lastChild.remove();
    }
    frame.remove();
    return clone.documentElement.outerHTML;
  }, FRAME_SELECTOR);
  assert.equal(normalizedCurrent, baselinePrint, "v1.3.0/v1.3.1 print document parity failed.");

  results.onlineShell = {
    status: "PASS",
    printCalls: 6,
    topLevelWindowOpenCalls: 0,
    repeatedCycles: 5,
    focusControls: 15,
    formStateInvariant: true,
    errorCleanup: true
  };
  results.parity = { status: "PASS", normalizedDocumentIdentical: true };
  await online.context.close();

  const fileApp = await openCurrent(browser, pathToFileURL(CURRENT).href);
  await fileApp.page.evaluate(() => { window.__printHarness.behavior = "afterprint"; });
  await clickAndWait(fileApp.page, 1);
  await fileApp.page.waitForFunction(selector => document.querySelectorAll(selector).length === 0, FRAME_SELECTOR);
  const fileMetrics = await fileApp.page.evaluate(() => ({ ...window.__printHarness }));
  assert.equal(fileMetrics.windowOpenCalls, 0);
  assert.equal(fileMetrics.printCalls, 1);
  assert.deepEqual(fileApp.errors, [], `Standalone errors: ${fileApp.errors.join(" | ")}`);
  assert.deepEqual(fileApp.remote, [], `Standalone remote requests: ${fileApp.remote.join(", ")}`);
  results.standaloneFile = {
    status: "PASS",
    printCalls: 1,
    topLevelWindowOpenCalls: 0,
    remoteRequests: 0
  };
  await fileApp.context.close();
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

fs.writeFileSync(OUTPUT, `${JSON.stringify(results, null, 2)}\n`, "utf8");
console.log(
  "Print transport v1.3.1 PASS: Chromium online/file, zero top-level tabs, " +
  "iframe readiness/afterprint/stale/error cleanup, repeated printing, focus/input/select, " +
  "state invariance and normalized v1.3.0 print-document parity."
);
