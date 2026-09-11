import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launchBrowser } from "../tests/browser-runtime.mjs";
import { FLOOR_CAPACITIES, PUBLIC_EXAMPLES } from "./guide-scenarios-v1.4.0.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const VERSION = fs.readFileSync(path.join(ROOT, "VERSION"), "utf8").trim();
const STANDALONE = path.join(ROOT, "site", "downloads", `loadcomposer-v${VERSION}-standalone.html`);
const OUTPUT = path.join(ROOT, "site", "assets", "guides");

function pngDimensions(buffer) {
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error("Generated guide asset is not a PNG.");
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

if (!fs.existsSync(STANDALONE)) throw new Error(`Standalone input missing: ${path.basename(STANDALONE)}`);
fs.mkdirSync(OUTPUT, { recursive: true });

const expectedNames = new Set(Object.values(PUBLIC_EXAMPLES).map(example => example.image));
for (const name of fs.readdirSync(OUTPUT)) {
  if (name.endsWith(".png") && !expectedNames.has(name)) fs.rmSync(path.join(OUTPUT, name));
}

const browser = await launchBrowser(ROOT);
const generated = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: "en-US",
    colorScheme: "light"
  });
  await context.addInitScript(() => {
    localStorage.setItem("loadcomposer.language", "en");
    localStorage.setItem("loadcomposer.theme", "light");
    localStorage.setItem("loadcomposer.unit", "mm");
  });

  for (const example of Object.values(PUBLIC_EXAMPLES)) {
    const page = await context.newPage();
    const errors = [];
    const remoteRequests = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("request", request => {
      if (/^https?:/i.test(request.url())) remoteRequests.push(request.url());
    });

    const url = new URL(pathToFileURL(STANDALONE).href);
    url.searchParams.set("example", example.id);
    await page.goto(url.href, { waitUntil: "load" });
    await page.waitForFunction(() => document.documentElement.dataset.i18nReady === "true");
    await page.waitForFunction(() => window.eval("applicationInitialized") === true);

    const prefill = await page.evaluate(() => {
      const group = document.getElementById("singlePalletGroup");
      return {
        exampleId: document.documentElement.dataset.example || null,
        presetId: group.querySelector('[data-field="presetId"]').value,
        quantity: Number(group.querySelector('[data-field="quantity"]').value),
        height: Number(group.querySelector('[data-field="height"]').value),
        rotation: group.querySelector('[data-field="allowRotate"]').checked,
        stackable: document.getElementById("stackable").checked,
        gap: Number(document.getElementById("gap").value),
        selectedContainerId: window.eval("selectedContainerId"),
        resultCount: window.eval("lastResults.length"),
        automaticCalculatePathInvocations: window.loadComposerDiagnostics.calculationCycles
      };
    });
    if (
      prefill.exampleId !== example.id ||
      prefill.presetId !== example.palletId ||
      prefill.quantity !== example.quantity ||
      prefill.height !== example.loadedHeight ||
      prefill.rotation !== true ||
      prefill.stackable !== false ||
      prefill.gap !== example.gap ||
      prefill.selectedContainerId !== example.vehicleId ||
      prefill.resultCount === 0 ||
      prefill.automaticCalculatePathInvocations !== 1
    ) {
      throw new Error(`${example.id}: planner prefill differs from the public example contract.`);
    }

    const rendered = await page.evaluate(vehicleId => {
      const result = window.eval("lastResults").find(item => item.container.id === vehicleId);
      if (!result) return null;
      return {
        capacity: result.floorCapacity,
        placed: result.placedCount,
        unplaced: result.unplacedCount,
        ok: result.ok,
        selectedContainerId: window.eval("selectedContainerId"),
        png: document.getElementById("layoutCanvas").toDataURL("image/png")
      };
    }, example.vehicleId);
    const expectedCapacity = FLOOR_CAPACITIES[example.vehicleId][example.palletId];
    if (
      !rendered ||
      rendered.capacity !== expectedCapacity ||
      rendered.placed !== example.quantity ||
      rendered.unplaced !== 0 ||
      rendered.ok !== true ||
      rendered.selectedContainerId !== example.vehicleId
    ) {
      throw new Error(`${example.id}: rendered planner result differs from the recorded scenario.`);
    }

    const png = Buffer.from(rendered.png.replace(/^data:image\/png;base64,/, ""), "base64");
    const size = pngDimensions(png);
    if (size.width !== example.imageWidth || size.height !== example.imageHeight) {
      throw new Error(`${example.id}: unexpected canvas dimensions ${size.width} × ${size.height}.`);
    }
    fs.writeFileSync(path.join(OUTPUT, example.image), png);
    if (errors.length) throw new Error(`${example.id}: browser errors: ${errors.join(" | ")}`);
    if (remoteRequests.length) throw new Error(`${example.id}: unexpected network requests: ${remoteRequests.join(", ")}`);
    generated.push({ id: example.id, file: example.image, width: size.width, height: size.height });
    await page.close();
  }
  await context.close();
} finally {
  await browser.close();
}

console.log(`Guide assets PASS: ${generated.length} current-engine canvas PNGs, zero remote requests.`);
