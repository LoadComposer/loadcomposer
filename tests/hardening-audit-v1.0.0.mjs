import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { JSDOM } from "jsdom";

const ROOT = path.resolve(import.meta.dirname, "..");
const SITE = path.join(ROOT, "site");
const DOWNLOADS = path.join(SITE, "downloads");
const VERSION = "1.0.0";
const PACKAGE_NAME = `loadcomposer-v${VERSION}-standalone`;
const HTML_NAME = `${PACKAGE_NAME}.html`;
const ZIP_NAME = `${PACKAGE_NAME}.zip`;
const HTML_PATH = path.join(DOWNLOADS, HTML_NAME);
const ZIP_PATH = path.join(DOWNLOADS, ZIP_NAME);
const CODES = ["it", "en", "de", "es", "fr", "pt", "nl"];
const LEGAL_FILES = [
  "LICENSE",
  "LICENSE.it.md",
  "NOTICE",
  "TRADEMARKS.md",
  "COMMERCIAL-LICENSING.md",
  "PRIVACY.md",
  "SECURITY.md"
];
const NOTICE_LINES = [
  "LoadComposer",
  "Copyright © 2026 Marco Pernigotti.",
  "Licensed under the LoadComposer Community License 1.0.",
  "SPDX-License-Identifier: LicenseRef-LoadComposer-Community-1.0",
  "Official repository: https://github.com/LoadComposer/loadcomposer",
  'Provided "AS IS", without warranty.'
];

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    ...options
  });
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(" ")} failed:\n${result.stderr || result.stdout}`
  );
  return result.stdout;
}

function assertNoRemoteResources(html, label) {
  const dom = new JSDOM(html);
  try {
    const resourceSelectors = [
      "script[src]",
      "link[rel='stylesheet'][href]",
      "link[rel='icon'][href]",
      "img[src]",
      "source[src]",
      "source[srcset]",
      "iframe[src]"
    ];
    for (const element of dom.window.document.querySelectorAll(resourceSelectors.join(","))) {
      const value =
        element.getAttribute("src") ||
        element.getAttribute("srcset") ||
        element.getAttribute("href") ||
        "";
      assert.equal(
        /^(?:https?:)?\/\//i.test(value),
        false,
        `${label} contains a remote runtime resource: ${value}`
      );
    }
  } finally {
    dom.window.close();
  }
}

function assertInternalLinks(sourcePath) {
  const dom = new JSDOM(read(sourcePath));
  try {
    for (const anchor of dom.window.document.querySelectorAll("a[href]")) {
      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        /^(?:https?:)?\/\//i.test(href)
      ) {
        continue;
      }
      const clean = href.split(/[?#]/)[0];
      let target = clean.startsWith("/")
        ? path.join(SITE, clean.slice(1))
        : path.resolve(path.dirname(sourcePath), clean);
      if (clean.endsWith("/") || (fs.existsSync(target) && fs.statSync(target).isDirectory())) {
        target = path.join(target, "index.html");
      }
      assert.ok(
        fs.existsSync(target),
        `${path.relative(ROOT, sourcePath)} has a broken link: ${href}`
      );
    }
  } finally {
    dom.window.close();
  }
}

const packageJson = JSON.parse(read(path.join(ROOT, "package.json")));
assert.equal(packageJson.version, VERSION);
assert.equal(packageJson.engines.node, "^22.17.0 || >=24.0.0");
assert.equal(packageJson.packageManager, "npm@11.9.0");
assert.equal(read(path.join(ROOT, ".nvmrc")).trim(), "22.17.0");
assert.equal(read(path.join(ROOT, ".node-version")).trim(), "22.17.0");
assert.equal(read(path.join(ROOT, "VERSION")).trim(), VERSION);

const web = read(path.join(SITE, "index.html"));
const standalone = read(HTML_PATH);
for (const line of NOTICE_LINES) {
  assert.ok(web.includes(line), `Web HTML license notice is missing: ${line}`);
  assert.ok(standalone.includes(line), `Standalone license notice is missing: ${line}`);
}
assert.ok(web.indexOf("Licensed under") < web.indexOf("<html"), "Web notice is not at source start.");
assert.ok(
  standalone.indexOf("Licensed under") < standalone.indexOf("<html"),
  "Standalone notice is not at source start."
);
assertNoRemoteResources(web, "site/index.html");
assertNoRemoteResources(standalone, HTML_NAME);

const standaloneDom = new JSDOM(standalone);
try {
  const embedded = JSON.parse(
    standaloneDom.window.document.getElementById("loadcomposer-embedded-i18n").textContent
  );
  assert.equal(embedded.standalone, true);
  assert.deepEqual(Object.keys(embedded.catalogs), CODES);
  assert.ok(standaloneDom.window.document.querySelector("#loadMode"));
  assert.ok(standaloneDom.window.document.querySelector("#printLayoutBtn"));
} finally {
  standaloneDom.window.close();
}

for (const filename of LEGAL_FILES) {
  const canonical = fs.readFileSync(path.join(ROOT, filename));
  const publicCopy = fs.readFileSync(path.join(SITE, "legal", filename));
  assert.ok(canonical.equals(publicCopy), `site/legal/${filename} is not byte-identical.`);
}

const legalIndexPath = path.join(SITE, "legal", "index.html");
const legalIndex = read(legalIndexPath);
assert.ok(legalIndex.includes("LICENSE is the controlling English legal text"));
assert.ok(legalIndex.includes("informational Italian translation"));
assert.ok(legalIndex.includes("source-available"));
assert.ok(legalIndex.includes("licensing@loadcomposer.com"));
assert.ok(legalIndex.includes("https://github.com/LoadComposer/loadcomposer"));
assertNoRemoteResources(legalIndex, "site/legal/index.html");

const webDom = new JSDOM(web);
try {
  const links = [...webDom.window.document.querySelectorAll(".footer-links a")];
  assert.equal(links.length, 3);
  assert.deepEqual(
    links.map(link => link.getAttribute("href")),
    ["./legal/LICENSE", "./legal/PRIVACY.md", "./legal/"]
  );
  assert.ok(links.every(link => !link.hasAttribute("target")));
  assert.ok(webDom.window.document.querySelector(".github-row > .github-link"));
} finally {
  webDom.window.close();
}
assert.match(
  web,
  /@media print[\s\S]*?\.github-link,\s*\.footer-links\s*\{\s*display:\s*none !important;/
);

for (const code of CODES) {
  const catalog = JSON.parse(read(path.join(SITE, "lang", `${code}.json`)));
  assert.equal(catalog.meta.version, VERSION);
  for (const key of ["footer.license", "footer.privacy", "footer.legalInformation"]) {
    assert.equal(typeof catalog.translations[key], "string", `${code}:${key} missing.`);
    assert.ok(catalog.translations[key].trim(), `${code}:${key} empty.`);
  }
}

for (const [filename, email] of [
  ["COMMERCIAL-LICENSING.md", "licensing@loadcomposer.com"],
  ["SECURITY.md", "security@loadcomposer.com"],
  ["PRIVACY.md", "privacy@loadcomposer.com"]
]) {
  assert.ok(read(path.join(ROOT, filename)).includes(email), `${filename}: confirmed email missing.`);
}

const allowedEmails = new Set([
  "licensing@loadcomposer.com",
  "security@loadcomposer.com",
  "privacy@loadcomposer.com",
  "conduct@loadcomposer.com"
]);
for (const filename of [
  "LICENSE",
  "LICENSE.it.md",
  "NOTICE",
  "TRADEMARKS.md",
  "COMMERCIAL-LICENSING.md",
  "CLA.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "PRIVACY.md",
  "CODE_OF_CONDUCT.md",
  "README.md",
  "README.it.md",
  "site/legal/index.html"
]) {
  for (const match of read(path.join(ROOT, filename)).matchAll(/[A-Z0-9._%+-]+@loadcomposer\.com/gi)) {
    assert.ok(allowedEmails.has(match[0].toLowerCase()), `${filename}: unexpected project email.`);
  }
}

for (const filePath of [
  HTML_PATH,
  ZIP_PATH,
  `${HTML_PATH}.sha256`,
  `${ZIP_PATH}.sha256`
]) {
  assert.ok(fs.existsSync(filePath), `Missing download: ${path.relative(ROOT, filePath)}`);
}
for (const [filePath, sidecar] of [
  [HTML_PATH, `${HTML_PATH}.sha256`],
  [ZIP_PATH, `${ZIP_PATH}.sha256`]
]) {
  const [expected, filename] = read(sidecar).trim().split(/\s{2}/);
  assert.equal(expected, sha256(fs.readFileSync(filePath)));
  assert.equal(filename, path.basename(filePath));
}

const zipEntries = run("unzip", ["-Z1", ZIP_PATH]).trim().split(/\r?\n/);
const expectedEntries = [
  `${PACKAGE_NAME}/`,
  `${PACKAGE_NAME}/${HTML_NAME}`,
  `${PACKAGE_NAME}/LICENSE`,
  `${PACKAGE_NAME}/LICENSE.it.md`,
  `${PACKAGE_NAME}/NOTICE`,
  `${PACKAGE_NAME}/README.txt`,
  `${PACKAGE_NAME}/SHA256SUMS.txt`
];
assert.deepEqual(zipEntries, expectedEntries);
assert.equal(zipEntries.some(entry => entry.includes("/lang/")), false);

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "loadcomposer-rc4-standalone-"));
try {
  run("unzip", ["-q", ZIP_PATH, "-d", temporary]);
  const extracted = path.join(temporary, PACKAGE_NAME);
  const sumsPath = path.join(extracted, "SHA256SUMS.txt");
  const sumLines = read(sumsPath).trim().split(/\r?\n/);
  assert.equal(sumLines.length, 5);
  for (const line of sumLines) {
    const [expected, filename] = line.split(/\s{2}/);
    assert.equal(expected, sha256(fs.readFileSync(path.join(extracted, filename))));
  }
  assert.ok(
    fs.readFileSync(path.join(extracted, HTML_NAME)).equals(fs.readFileSync(HTML_PATH)),
    "Packaged standalone HTML differs from the published HTML."
  );
  for (const filename of ["LICENSE", "LICENSE.it.md", "NOTICE"]) {
    assert.ok(
      fs.readFileSync(path.join(extracted, filename)).equals(fs.readFileSync(path.join(ROOT, filename))),
      `Packaged ${filename} differs from the canonical root file.`
    );
  }
  const packageReadme = read(path.join(extracted, "README.txt"));
  for (const required of [
    "file://",
    "requires no installation",
    "processes entered data locally",
    "LoadComposer Community License 1.0",
    "internal business use is permitted",
    "Monetization",
    "SaaS",
    "monetized hosting",
    "white-label",
    "https://github.com/LoadComposer/loadcomposer",
    "https://loadcomposer.com/",
    "licensing@loadcomposer.com",
    '"AS IS"',
    "Version 1.0"
  ]) {
    assert.ok(packageReadme.includes(required), `Standalone README is missing: ${required}`);
  }
} finally {
  fs.rmSync(temporary, { recursive: true, force: true });
}

assertInternalLinks(path.join(SITE, "index.html"));
assertInternalLinks(legalIndexPath);

const readme = read(path.join(ROOT, "README.md"));
const zipPosition = readme.indexOf(ZIP_NAME);
const htmlPosition = readme.indexOf(HTML_NAME);
assert.ok(zipPosition >= 0, "README does not name the primary standalone ZIP.");
assert.ok(htmlPosition < 0 || zipPosition < htmlPosition, "README does not list ZIP before HTML.");
assert.ok(readme.includes("Standalone HTML only"));
assert.ok(readme.includes("source-available"));

console.log(
  "v1.0.0 hardening audit PASS: Node/npm metadata, HTML notices, 7 public legal copies, " +
  "3 localized footer links, standalone ZIP/5 hashes, downloads, internal links and no remote resources."
);
