import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchBrowser } from "../tests/browser-runtime.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const APP_PATH = path.join(ROOT, "site", "index.html");
const ASSET_DIR = path.join(ROOT, "site", "assets");
const OG_PATH = path.join(ASSET_DIR, "loadcomposer-og-v1.2.1.png");
const EXPECTED_LOGOS = [
  "loadcomposer-desktop-day.svg",
  "loadcomposer-desktop-night.svg",
  "loadcomposer-mobile-day.svg",
  "loadcomposer-mobile-night.svg"
];

function decodeSvg(data) {
  return Buffer.from(data, "base64").toString("utf8");
}

function writeExact(filePath, content) {
  if (fs.existsSync(filePath) && fs.readFileSync(filePath, "utf8") === content) {
    return;
  }
  fs.writeFileSync(filePath, content, "utf8");
}

const html = fs.readFileSync(APP_PATH, "utf8");
fs.mkdirSync(ASSET_DIR, { recursive: true });

const logoPattern =
  /data-logo-asset="([^"]+)"[\s\S]*?\bsrc="data:image\/svg\+xml;base64,([^"]+)"/g;
const found = new Map();
for (const match of html.matchAll(logoPattern)) {
  if (EXPECTED_LOGOS.includes(match[1]) && !found.has(match[1])) {
    found.set(match[1], decodeSvg(match[2]));
  }
}

for (const filename of EXPECTED_LOGOS) {
  const source = found.get(filename);
  if (!source || !source.startsWith("<svg")) {
    throw new Error(`Approved embedded logo not found: ${filename}`);
  }
  writeExact(path.join(ASSET_DIR, filename), source);
}

const favicon = html.match(
  /rel="icon"[\s\S]*?href="data:image\/svg\+xml;base64,([^"]+)"/
);
if (!favicon) throw new Error("Approved embedded favicon not found.");
writeExact(path.join(ASSET_DIR, "loadcomposer-favicon.svg"), decodeSvg(favicon[1]));

if (!fs.existsSync(OG_PATH)) {
  const browser = await launchBrowser(ROOT);
  try {
    const page = await browser.newPage({
      viewport: { width: 1200, height: 630 },
      deviceScaleFactor: 1
    });
    const nightLogo = found.get("loadcomposer-desktop-night.svg");
    const encoded = Buffer.from(nightLogo, "utf8").toString("base64");
    await page.setContent(
      `<!doctype html><html><head><style>` +
      `html,body{margin:0;width:1200px;height:630px;background:#050D16}` +
      `body{display:grid;place-items:center}` +
      `img{display:block;width:940px;height:auto}` +
      `</style></head><body>` +
      `<img alt="" src="data:image/svg+xml;base64,${encoded}">` +
      `</body></html>`,
      { waitUntil: "load" }
    );
    await page.screenshot({ path: OG_PATH, type: "png" });
  } finally {
    await browser.close();
  }
}

const png = fs.readFileSync(OG_PATH);
if (
  png.length < 1000 ||
  png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
) {
  throw new Error("Open Graph asset is not a valid non-empty PNG.");
}

console.log(
  `Release assets PASS: ${EXPECTED_LOGOS.length} exact logos, favicon, and local 1200 × 630 social image.`
);
