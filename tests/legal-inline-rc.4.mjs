import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const EXPECTED = {
  "LICENSE": "07c8360fa6840b24641b2e9443c82d8001ad8c4d32bc58f43fb04f64a1d080d0",
  "LICENSE.it.md": "8b47a93a962da349910972a6125ec7ce1997b07fb951e2c316b10c187c875266",
  "NOTICE": "0b1322e4517d715f95e44d63d576b663b2b9c65e8e97caed2fc6e7cae86e266f"
};

const sha256 = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
for (const [name, expected] of Object.entries(EXPECTED)) {
  const rootFile = path.join(ROOT, name);
  const publicFile = path.join(ROOT, "site", "legal", name);
  assert.equal(sha256(rootFile), expected, `${name}: root copy differs from canonical RC.3.`);
  assert.equal(sha256(publicFile), expected, `${name}: public copy differs from canonical RC.3.`);
  assert(fs.readFileSync(rootFile).equals(fs.readFileSync(publicFile)), `${name}: copies differ.`);
}

const legal = fs.readFileSync(path.join(ROOT, "site", "legal", "index.html"), "utf8");
for (const href of ["./LICENSE", "./NOTICE"]) {
  const matches = [...legal.matchAll(new RegExp(`<a\\s+([^>]*?)href=["']${href.replace(".", "\\.")}["']([^>]*)>`, "g"))];
  assert.equal(matches.length, 1, `${href}: expected one legal link.`);
  assert(!/\bdownload(?:\s|=|>)/i.test(`${matches[0][1]} ${matches[0][2]}`), `${href}: download attribute forbidden.`);
}
for (const forbidden of ["site/legal/LICENSE.txt", "site/legal/NOTICE.txt"]) {
  assert(!fs.existsSync(path.join(ROOT, forbidden)), `${forbidden} must not exist.`);
}

const headers = fs.readFileSync(path.join(ROOT, "site", "_headers"), "utf8");
for (const route of ["/legal/LICENSE", "/legal/NOTICE"]) {
  const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const block = headers.match(new RegExp(`(?:^|\\n)${escaped}\\n((?:[ \\t]+[^\\n]+\\n?)+)`));
  assert(block, `${route}: exact header rule missing.`);
  assert.match(block[1], /^\s+Content-Type: text\/plain; charset=utf-8\s*$/m, `${route}: Content-Type.`);
  assert.match(block[1], /^\s+Content-Disposition: inline\s*$/m, `${route}: Content-Disposition.`);
  assert(!/^\s+Cache-Control:/mi.test(block[1]), `${route}: exact rule must not duplicate Cache-Control.`);
}

console.log("LICENSE/NOTICE inline PASS: 6/6 canonical byte identities, exact links without download, and two exact inline header rules.");
