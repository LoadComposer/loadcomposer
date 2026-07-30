import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const read = relative => fs.readFileSync(path.join(ROOT, relative), "utf8");
const exists = relative => fs.existsSync(path.join(ROOT, relative));
const VERSION = "1.0.0-rc.2";
const CODES = ["it", "en", "de", "es", "fr", "pt", "nl"];

const required = [
  "LICENSE",
  "LICENSE.it.md",
  "NOTICE",
  "TRADEMARKS.md",
  "COMMERCIAL-LICENSING.md",
  "CONTRIBUTING.md",
  "CLA.md",
  "SECURITY.md",
  "PRIVACY.md",
  "README.md",
  "README.it.md",
  "CHANGELOG.md",
  "ROADMAP.md",
  "VERSION",
  "package.json",
  "package-lock.json",
  "site/index.html",
  "site/_headers",
  "site/_redirects",
  "site/robots.txt",
  "site/sitemap.xml",
  "site/downloads/loadcomposer-v1.0.0-rc.2-standalone.html",
  "docs/QUICK-START.md",
  "docs/LIMITATIONS.md",
  "docs/ARCHITECTURE.md",
  "docs/DEPLOYMENT.md",
  "docs/RELEASE-PROCESS.md",
  ".github/ISSUE_TEMPLATE/bug.yml",
  ".github/ISSUE_TEMPLATE/feature.yml",
  ".github/pull_request_template.md",
  ".github/workflows/ci.yml",
  ".github/workflows/package-integrity.yml"
];
for (const file of required) assert(exists(file), `Required repository file missing: ${file}`);
for (const code of CODES) assert(exists(`site/lang/${code}.json`), `${code} catalog missing.`);

const license = read("LICENSE");
const italian = read("LICENSE.it.md");
const englishSections = [...license.matchAll(/^## (\d+)\. /gm)].map(match => match[1]);
const italianSections = [...italian.matchAll(/^## (\d+)\. /gm)].map(match => match[1]);
assert.deepEqual(englishSections, Array.from({ length: 18 }, (_, index) => String(index + 1)));
assert.deepEqual(italianSections, englishSections, "Italian courtesy translation sections differ.");

for (const phrase of [
  "LoadComposer Community License 1.0",
  "LCCL-1.0",
  "LicenseRef-LoadComposer-Community-1.0",
  "Marco Pernigotti",
  "licensing@loadcomposer.com",
  "Internal Use",
  "Commercial License",
  "Non-Monetized",
  "AS IS",
  "NON OK",
  "gross negligence",
  "courts of Verona"
]) {
  assert(license.includes(phrase), `LICENSE requirement missing: ${phrase}`);
}

const packageData = JSON.parse(read("package.json"));
assert.equal(packageData.name, "loadcomposer");
assert.equal(packageData.version, VERSION);
assert.equal(packageData.private, true);
assert.equal(packageData.license, "LicenseRef-LoadComposer-Community-1.0");
assert.equal(packageData.author, "Marco Pernigotti");
assert.equal(packageData.homepage, "https://loadcomposer.com/");
assert.equal(packageData.repository.url, "git+https://github.com/LoadComposer/loadcomposer.git");
assert.equal(read("VERSION").trim(), VERSION);

const app = read("site/index.html");
for (const metadata of [
  "<title>LoadComposer v1.0.0-rc.2</title>",
  'rel="canonical" href="https://loadcomposer.com/"',
  'property="og:url" content="https://loadcomposer.com/"',
  'property="og:image" content="https://loadcomposer.com/assets/loadcomposer-og-v1.0.0-rc.2.png"',
  'name="robots"',
  'name="description"',
  'name="theme-color"'
]) {
  assert(app.includes(metadata), `Document metadata missing: ${metadata}`);
}
assert(!/\b(?:google-analytics|googletagmanager|gtag\(|plausible|matomo|segment\.com|hotjar|facebook\.net)\b/i.test(app), "Tracker or analytics marker found.");

for (const match of app.matchAll(/<(?:script|img|link)\b[^>]*\b(?:src|href)="([^"]+)"/gi)) {
  const resource = match[1];
  assert(
    !/^https?:\/\//i.test(resource) || resource === "https://loadcomposer.com/",
    `Remote runtime resource found: ${resource}`
  );
}

const headers = read("site/_headers");
for (const directive of [
  "Content-Security-Policy:",
  "default-src 'self'",
  "connect-src 'self'",
  "font-src 'none'",
  "frame-ancestors 'none'",
  "X-Content-Type-Options: nosniff",
  "Referrer-Policy:",
  "Permissions-Policy:",
  "X-Robots-Tag: noindex"
]) {
  assert(headers.includes(directive), `Cloudflare header missing: ${directive}`);
}
assert.equal(read("site/_redirects").trim(), "/index.html / 301");
assert(read("site/robots.txt").includes("https://loadcomposer.com/sitemap.xml"));
assert(read("site/sitemap.xml").includes("<loc>https://loadcomposer.com/</loc>"));

for (const workflow of [read(".github/workflows/ci.yml"), read(".github/workflows/package-integrity.yml")]) {
  assert(workflow.includes("actions/checkout@v6"), "Workflow checkout action is not pinned.");
  assert(workflow.includes("actions/setup-node@v7"), "Workflow setup-node action is not pinned.");
  assert(workflow.includes("npm ci"), "Workflow omits npm ci.");
}

const repositoryPaths = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules") continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else repositoryPaths.push(path.relative(ROOT, full).split(path.sep).join("/"));
  }
}
walk(ROOT);
assert(
  repositoryPaths.every(file => !/alpha\.[0-6]/i.test(file)),
  "A pre-alpha.7 application path entered the repository."
);

console.log(
  `Repository release audit PASS: ${required.length} required files, 18/18 bilingual license sections, ` +
  `${CODES.length} catalogs, metadata, privacy, workflows, Cloudflare policy, and no remote runtime resources.`
);
