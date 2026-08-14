import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const CODES = ["it", "en", "de", "es", "fr", "pt", "nl"];
const NEW_KEYS = [
  "404.meta.title",
  "404.meta.description",
  "404.title",
  "404.description",
  "404.navigationAria"
];
const EXPECTED_FINAL_HASHES = {
  "site/index.html": "7d802b95af70433b75a4267538c40fcb03705d54689e7b67fb75ce98fef0cdac",
  "site/downloads/index.html": "1b8479f05ab01e22c8382c4a5be4bd361b295ff95088b5f07c9b303797c07f29",
  "site/legal/index.html": "c12b66426e9a8bb4c74fe837e5bf98b822d6c84ca803e0fc8841dbc946298c0e",
  "site/404.html": "3d98f5057bafb86d2a85f13e7f81abd05130b7af999255e3905a28592558eead",
  "scripts/templates/downloads-index.html": "79b878fe85fbb38c4bfc45c16db3eb27659b398950a14449eb329eca799c5c28",
  "scripts/templates/legal-index.html": "a07c07d6d25f439a918e8745449ae8367907acb3b3400a20c8e733de7caa5133",
  "scripts/templates/404.html": "bd3e05b02a1a4796f1faa5a814626fdd9a7e4aece042a487679b770538ab7aab",
  "scripts/build-downloads-page.mjs": "ab726edf51179e5131a31070f0858dfd975b123c7176bcfd73a1848f3764f6e4",
  "scripts/prepare-site-legal.mjs": "b8bed88331cc153e1a46c0c6671ee5b8b86bb4fd9f855883000ed331fc399e62",
  "scripts/build-404-page.mjs": "d729f48786c454c8dd5c53d3e7b7acd422609ca3bffd10d96bc5cb72abb00632",
  "site/assets/loadcomposer-mobile-day.svg": "c5cec1be899a039c1ad90b7cef686d742b0cbb4fb4c318e918d3e3311a549c5e",
  "site/assets/loadcomposer-mobile-night.svg": "c8634694ffe7ad13a1fcbd48be1a55aa822e4b9032a675d7adf7aafa139750ff",
  "site/_headers": "ee94a81c2039376cefa2ed78d7b868b49cf07e918529dabc130f3ea33647bfd2",
  "site/sitemap.xml": "7325e644c643536684d1cf200d8f5a27984188b8eb7b234936a178cd97a74d08",
  "ROADMAP.md": "69f1030123277b666b0baa1e77a4d18d3e30ae8deab41247987ed26603c2121b",
  "LICENSE": "07c8360fa6840b24641b2e9443c82d8001ad8c4d32bc58f43fb04f64a1d080d0",
  "LICENSE.it.md": "8b47a93a962da349910972a6125ec7ce1997b07fb951e2c316b10c187c875266",
  "NOTICE": "0b1322e4517d715f95e44d63d576b663b2b9c65e8e97caed2fc6e7cae86e266f",
  "PRIVACY.md": "13ba9454ebab8c3bbaf195e978c3b2e7a4cf0f69bc0d732bd622e35d811f5e28",
  "SECURITY.md": "41f27656c06f55d1ad059f9ec7738bb2ee884270ccae86b0f4d6316a93efe076",
  "TRADEMARKS.md": "5c69098cb03d6033200b42edb4eefb1b9a0a0542e91f05a57ec58c61f5337490",
  "COMMERCIAL-LICENSING.md": "59444c07f5f7286d1e032211b7e933aa9ab357e6d0a66e7c1022e673c3a6e3c4"
};
const BASELINE_STANDALONE = path.join(
  ROOT,
  "tests",
  "fixtures",
  "baseline-v1.2.1-pre-404",
  "loadcomposer-v1.2.1-standalone.html"
);
const CURRENT_STANDALONE = path.join(ROOT, "site", "downloads", "loadcomposer-v1.2.1-standalone.html");
const PRE_404_HTML_HASH = "7d390eb1c3d27307d702bc76b9201678d93228f23507d5c0240faaf798845b74";
const PRE_404_ZIP_HASH = "14daa946a725a615d8ba6861919ec576dc1769bf90ef4d4478b6577f3fc0c05f";

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function embedded(source) {
  const match = source.match(/(<script id="loadcomposer-embedded-i18n" type="application\/json">)([\s\S]*?)(<\/script>)/);
  assert.ok(match, "Embedded standalone i18n payload missing.");
  return { full: match[0], prefix: match[1], json: match[2], suffix: match[3], parsed: JSON.parse(match[2]) };
}

for (const [relative, expected] of Object.entries(EXPECTED_FINAL_HASHES)) {
  assert.equal(sha256(path.join(ROOT, relative)), expected, `Final-polish scope file changed unexpectedly: ${relative}`);
}
for (const legal of ["LICENSE", "LICENSE.it.md", "NOTICE", "PRIVACY.md", "SECURITY.md", "TRADEMARKS.md", "COMMERCIAL-LICENSING.md"]) {
  assert.ok(
    fs.readFileSync(path.join(ROOT, legal)).equals(fs.readFileSync(path.join(ROOT, "site", "legal", legal))),
    `${legal}: public copy differs from canonical source.`
  );
}

assert.equal(
  sha256(BASELINE_STANDALONE),
  "7d390eb1c3d27307d702bc76b9201678d93228f23507d5c0240faaf798845b74",
  "Frozen pre-404 v1.2.1 standalone fixture changed."
);
const baselineSource = fs.readFileSync(BASELINE_STANDALONE, "utf8");
const currentSource = fs.readFileSync(CURRENT_STANDALONE, "utf8");
const baselinePayload = embedded(baselineSource);
const currentPayload = embedded(currentSource);
assert.deepEqual(Object.keys(currentPayload.parsed.catalogs), CODES, "Standalone language inventory changed.");

for (const code of CODES) {
  const before = baselinePayload.parsed.catalogs[code];
  const after = currentPayload.parsed.catalogs[code];
  const siteCatalog = JSON.parse(fs.readFileSync(path.join(ROOT, "site", "lang", `${code}.json`), "utf8"));
  const added = Object.keys(after.translations).filter(key => !(key in before.translations)).sort();
  const removed = Object.keys(before.translations).filter(key => !(key in after.translations)).sort();
  const changed = Object.keys(before.translations)
    .filter(key => after.translations[key] !== before.translations[key])
    .sort();
  assert.deepEqual(added, [...NEW_KEYS].sort(), `${code}: standalone additions exceed 404 keys.`);
  assert.deepEqual(removed, [], `${code}: standalone translation removed.`);
  assert.deepEqual(changed, [], `${code}: pre-existing standalone translation changed.`);
  assert.deepEqual(after, siteCatalog, `${code}: standalone no longer embeds the exact canonical catalog.`);
}

const normalizedCurrent = currentSource.replace(
  currentPayload.full,
  `${currentPayload.prefix}${baselinePayload.json}${currentPayload.suffix}`
);
assert.equal(
  normalizedCurrent,
  baselineSource,
  "Standalone changed outside the five unused 404 catalog keys."
);

const currentHtmlHash = fs.readFileSync(`${CURRENT_STANDALONE}.sha256`, "utf8").trim().split(/\s+/)[0];
const currentZipHash = fs.readFileSync(
  path.join(ROOT, "site", "downloads", "loadcomposer-v1.2.1-standalone.zip.sha256"),
  "utf8"
).trim().split(/\s+/)[0];
const normalizedDownload = fs.readFileSync(path.join(ROOT, "site", "downloads", "index.html"), "utf8")
  .replaceAll(currentHtmlHash, PRE_404_HTML_HASH)
  .replaceAll(currentZipHash, PRE_404_ZIP_HASH);
assert.equal(
  crypto.createHash("sha256").update(normalizedDownload).digest("hex"),
  "2cb5f06b6a7ec32cc882d026f31ca016aee684b1445ca82ae3a0034ae9e22471",
  "Download changed outside the approved compact branding and deterministic standalone checksums."
);

console.log(
  "v1.2.1 final-polish scope PASS: Main, routing, sitemap, roadmap, canonical logo assets and 7 legal documents exact; " +
  "Download/Legal/404 use the approved compact lockup, standalone remains limited to five unused 404 catalog keys, " +
  "and algorithms, geometry, print and planner markup remain unchanged."
);
