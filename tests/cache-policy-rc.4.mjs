import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SITE = path.join(ROOT, "site");
const MUTABLE = "public, max-age=0, must-revalidate";
const IMMUTABLE = "public, max-age=31536000, immutable";
const HOSTS = [
  "https://loadcomposer.com",
  "https://loadcomposer.pages.dev",
  "https://private-check.loadcomposer.pages.dev"
];

function walk(directory, root = directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full, root);
    return [path.relative(root, full).split(path.sep).join("/")];
  }).sort();
}

function parseHeaders(source) {
  const rules = [];
  let current = null;
  for (const raw of source.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    if (!/^\s/.test(raw)) {
      current = { pattern: raw.trim(), headers: [] };
      rules.push(current);
      continue;
    }
    assert(current, `Header without rule: ${raw}`);
    const match = raw.trim().match(/^([^:]+):\s*(.*)$/);
    assert(match, `Malformed header: ${raw}`);
    current.headers.push({ name: match[1].toLowerCase(), value: match[2] });
  }
  return rules;
}

function regexFor(pattern) {
  let escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  escaped = escaped.replaceAll("*", ".*");
  escaped = escaped.replace(/:[a-z][a-z0-9_-]*/gi, "[^./]+");
  return new RegExp(`^${escaped}$`);
}

function applies(pattern, url) {
  const parsed = new URL(url);
  const subject = /^https?:\/\//i.test(pattern) ? url : parsed.pathname;
  return regexFor(pattern).test(subject);
}

const rules = parseHeaders(fs.readFileSync(path.join(SITE, "_headers"), "utf8"));
const inventory = walk(SITE)
  .filter(file => !["_headers", "_redirects"].includes(file))
  .map(file => `/${file}`);
const paths = [...new Set([
  "/",
  "/legal/",
  ...inventory,
  "/downloads/",
  "/percorso-inesistente-test/"
])].sort();
assert.equal(paths.length, 35, `Expected 35 policy paths, got ${paths.length}.`);

let assertions = 0;
for (const host of HOSTS) {
  for (const pathname of paths) {
    const url = `${host}${pathname}`;
    const matching = rules.filter(rule => applies(rule.pattern, url));
    const cache = matching.flatMap(rule => rule.headers)
      .filter(header => header.name === "cache-control")
      .map(header => header.value);
    let expected;
    if (pathname === "/404.html") expected = ["no-store"];
    else if (/^\/downloads\/loadcomposer-v1\.0\.0-rc\.4-standalone\.(?:html|zip)(?:\.sha256)?$/.test(pathname)) {
      expected = [IMMUTABLE];
    } else if (pathname === "/downloads/" || pathname === "/percorso-inesistente-test/") {
      expected = [];
    } else {
      expected = [MUTABLE];
    }
    assert.deepEqual(cache, expected, `${url}: Cache-Control mismatch.`);
    assert(!cache.some(value => value.includes("immutable") && value.includes("must-revalidate")), `${url}: mixed cache directives.`);
    assertions += 1;
  }
}

assert(!rules.some(rule => rule.pattern === "/downloads/*"), "A broad /downloads/* cache rule is forbidden.");
assert(!fs.existsSync(path.join(SITE, "downloads", "index.html")), "downloads/index.html must not exist.");
console.log(`Cache policy PASS: ${HOSTS.length} hosts × ${paths.length} paths = ${assertions} exact evaluations; no overlapping Cache-Control.`);
