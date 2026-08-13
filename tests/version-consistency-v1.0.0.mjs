import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(TEST_DIR, "..");
const APP_PATH = path.resolve(
  PROJECT_DIR,
  process.env.LOADCOMPOSER_HTML || "site/index.html"
);
const PACKAGE_PATH = path.resolve(
  PROJECT_DIR,
  process.env.LOADCOMPOSER_PACKAGE || "package.json"
);
const EXPECTED_VERSION = "1.2.0";

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: atteso ${expected}, ottenuto ${actual}`);
  }
}

const html = fs.readFileSync(APP_PATH, "utf8");
const packageData = JSON.parse(fs.readFileSync(PACKAGE_PATH, "utf8"));
const dom = new JSDOM(html);

try {
  const title = dom.window.document.title.trim();
  const badge = dom.window.document.querySelector(".app-version")?.textContent.trim() || "";
  const packageVersion = String(packageData.version || "").trim();
  const titleVersion = title.replace(/^LoadComposer v/, "");
  const badgeVersion = badge.replace(/^v/, "");

  assertEqual(title, `LoadComposer v${EXPECTED_VERSION}`, "title");
  assertEqual(badge, `v${EXPECTED_VERSION}`, "badge visibile");
  assertEqual(packageVersion, EXPECTED_VERSION, "versione package");
  assertEqual(titleVersion, badgeVersion, "title e badge");
  assertEqual(badgeVersion, packageVersion, "badge e package");

  console.log(
    `PASS: title, badge e package coincidono su v${EXPECTED_VERSION}.`
  );
} finally {
  dom.window.close();
}
