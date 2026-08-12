import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASELINE = path.join(ROOT, "tests", "fixtures", "baseline-v1.0.0");
const CODES = ["it", "en", "de", "es", "fr", "pt", "nl"];
const COMMUNITY_KEYS = [
  "footer.linksAria",
  "footer.suggestions",
  "footer.reportIssue"
];
const EXPECTED_BASELINE_HASHES = {
  "loadcomposer-v1.0.0.html": "2aef39efe8da721871a4373642c9d25cddfaffe18938770b9065689dc7a85e3b",
  "loadcomposer-v1.0.0-standalone.html": "5221cd2629b63c3a1f6f5037165189a0d080d30bd9e72b5084f7525cb0d2e15a",
  "lang/index.json": "bbb457595ba12d38cb7853a3f5b67fff679a79655b3959cb24ee9443ce76198f",
  "lang/it.json": "52ea17c8bb4f42a6cd98426fd9306301e488f442e0362308d4125b99d9402821",
  "lang/en.json": "396a42a2020ca3cb1df8e538f97230865b50487407b138df4c76d5adf5f0f825",
  "lang/de.json": "eaa3a455f096bf992d79319357467139ff15f52c88e418ce821849d1723c5fcc",
  "lang/es.json": "0d109a0f10efb1db5ab699beb0cd7d835a67e55d22477a42c1b4c7e152e79dbf",
  "lang/fr.json": "3359afa12a87535ac1238a3301e3eb0199aa8dd14f41e1d2df2816f22d35f29a",
  "lang/pt.json": "cc7756a9807fc0630244e0f24e45872d9d4067012ad57f9a1d457b24f7c295e5",
  "lang/nl.json": "6f40c18775c2521a4aa19a2bc0e27171704c4ccafb3d425c42ab7ed6d48de07e"
};

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function stripEmbeddedCatalogs(html) {
  return html.replace(
    /<script id="loadcomposer-embedded-i18n" type="application\/json">[\s\S]*?<\/script>/,
    '<script id="loadcomposer-embedded-i18n" type="application/json">CATALOGS</script>'
  );
}

function sections(html) {
  const footerStart = html.indexOf("  <footer class=\"footer\">");
  const footerEnd = html.indexOf("  </footer>", footerStart);
  assert.notEqual(footerStart, -1, "Footer start missing.");
  assert.notEqual(footerEnd, -1, "Footer end missing.");
  return {
    before: html.slice(0, footerStart),
    footer: html.slice(footerStart, footerEnd + "  </footer>".length),
    after: html.slice(footerEnd + "  </footer>".length)
  };
}

function normalizeVersion(value) {
  return value.replaceAll("1.1.0", "1.0.0");
}

function normalizeFooter(value) {
  return normalizeVersion(value)
    .replace(
      /<nav\s+class="footer-links"\s+aria-label="footer\.linksAria"\s+data-i18n-aria-label="footer\.linksAria"\s*>/,
      '<nav class="footer-links" aria-label="Legal">'
    )
    .replace(
      /\s*<a\s+class="footer-link"\s+href="https:\/\/github\.com\/LoadComposer\/loadcomposer\/discussions"[\s\S]*?data-i18n="footer\.suggestions"\s*>footer\.suggestions<\/a>/,
      ""
    )
    .replace(
      /\s*<a\s+class="footer-link"\s+href="https:\/\/github\.com\/LoadComposer\/loadcomposer\/issues\/new\?template=bug\.yml"[\s\S]*?data-i18n="footer\.reportIssue"\s*>footer\.reportIssue<\/a>/,
      ""
    );
}

for (const [relative, expected] of Object.entries(EXPECTED_BASELINE_HASHES)) {
  assert.equal(sha256(path.join(BASELINE, relative)), expected, `Baseline fixture changed: ${relative}`);
}

assert.equal(
  read(path.join(ROOT, "site", "lang", "index.json")),
  read(path.join(BASELINE, "lang", "index.json")),
  "Language inventory changed from v1.0.0."
);

for (const code of CODES) {
  const baseline = JSON.parse(read(path.join(BASELINE, "lang", `${code}.json`)));
  const current = JSON.parse(read(path.join(ROOT, "site", "lang", `${code}.json`)));
  assert.equal(current.meta.version, "1.1.0", `${code}: current metadata version.`);
  current.meta.version = baseline.meta.version;
  current.translations["meta.documentTitle"] = baseline.translations["meta.documentTitle"];
  for (const key of COMMUNITY_KEYS) {
    assert.equal(typeof current.translations[key], "string", `${code}:${key} missing.`);
    assert.ok(current.translations[key].trim(), `${code}:${key} empty.`);
    delete current.translations[key];
  }
  assert.deepEqual(current, baseline, `${code}: change outside version/community allowlist.`);
}

for (const [baselineName, currentName] of [
  ["loadcomposer-v1.0.0.html", "site/index.html"],
  ["loadcomposer-v1.0.0-standalone.html", "site/downloads/loadcomposer-v1.1.0-standalone.html"]
]) {
  const baseline = sections(stripEmbeddedCatalogs(read(path.join(BASELINE, baselineName))));
  const current = sections(stripEmbeddedCatalogs(read(path.join(ROOT, currentName))));
  assert.equal(
    normalizeVersion(current.before),
    baseline.before,
    `${currentName}: source changed before footer outside version metadata.`
  );
  assert.equal(
    normalizeFooter(current.footer),
    baseline.footer,
    `${currentName}: footer changed outside the community allowlist.`
  );
  assert.equal(
    normalizeVersion(current.after),
    baseline.after,
    `${currentName}: application code changed after footer.`
  );
}

console.log(
  "Community scope audit PASS: canonical v1.0.0 fixture 10/10 hashes; " +
  "version metadata plus exactly 3 localized footer keys and 2 community links allowed; " +
  "application code and language inventory otherwise byte-equivalent."
);
