import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASELINE = path.join(ROOT, "tests", "fixtures", "baseline-v1.1.0");
const CODES = ["it", "en", "de", "es", "fr", "pt", "nl"];
const EXPECTED_BASELINE_HASHES = {
  "loadcomposer-v1.1.0.html": "d45ce95bf8dae458be80131c728477744fe076f784e995704e2a9d7b97334604",
  "loadcomposer-v1.1.0-standalone.html": "7dd5847ea1ce06170808c3a39cd365e48af424fbb5b30d090036fc2d896440bf",
  "lang/index.json": "bbb457595ba12d38cb7853a3f5b67fff679a79655b3959cb24ee9443ce76198f",
  "lang/it.json": "cb8e6f0ca4f4acac2f05362060ffd792f991bf603414c3dc1970d5c74e761526",
  "lang/en.json": "13163139f16bb6899df3f609c692b9e505417a205278094b8dd24351cae6f912",
  "lang/de.json": "fbc78b89a71ba23ec19cbc13dfef475cb85084fe68998f0f6a2ed81985fc3cc6",
  "lang/es.json": "825145857a92dd988b26e3cbbe90adc24943bc9ca506e4a5814d3525452f1f26",
  "lang/fr.json": "8c182cf077149c315a8d9554bff4d3ec24ee09b5cbd4676b0b4b4ad72fc583b8",
  "lang/pt.json": "0b49785503f36ada52c6107aabe8ccfa0e2b5cba5caa327d409d991b68746ee2",
  "lang/nl.json": "6f4212f5da247b36f7e7fe43c99f5c6234640e62a3238bab3be97b856d342dac"
};
const ADDED_KEYS = [
  "footer.download",
  "downloads.meta.title",
  "downloads.meta.description",
  "downloads.brandHomeAria",
  "downloads.title",
  "downloads.recommendation",
  "downloads.online.title",
  "downloads.online.badge",
  "downloads.online.body",
  "downloads.online.noDownload",
  "downloads.online.noManualUpdates",
  "downloads.online.currentVersion",
  "downloads.online.button",
  "downloads.offline.title",
  "downloads.offline.badge",
  "downloads.offline.body",
  "downloads.offline.internetNote",
  "downloads.currentVersion",
  "downloads.offline.htmlButton",
  "downloads.offline.htmlHelp",
  "downloads.offline.zipButton",
  "downloads.offline.zipHelp",
  "downloads.integrity.title",
  "downloads.integrity.body",
  "downloads.integrity.htmlLabel",
  "downloads.integrity.zipLabel",
  "downloads.releases",
  "downloads.footer.home",
  "downloads.theme.label",
  "downloads.theme.auto",
  "downloads.theme.light",
  "downloads.theme.dark",
  "downloads.language.label"
];
const CHANGED_KEYS = [
  "meta.documentTitle",
  "results.table.margin",
  "table.lengthMargin",
  "table.widthMargin",
  "table.heightMargin",
  "table.heightIndividual",
  "space.issue.longitudinal",
  "space.compactHtml",
  "space.compactPlain",
  "print.margins"
];

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

function normalizeCurrentHtml(source) {
  return stripEmbeddedCatalogs(source)
    .replaceAll("1.2.0", "1.1.0")
    .replace(
      /\s*<a\s+class="footer-link"\s+href="(?:\.\/downloads\/|https:\/\/loadcomposer\.com\/downloads\/)"(?:\s+data-standalone-href="https:\/\/loadcomposer\.com\/downloads\/")?\s+data-i18n="footer\.download"\s*>footer\.download<\/a>/,
      ""
    )
    .replace(
      'margin: formatInt(note.spareLength)\n          }))}</span>`',
      'margin: formatInt(note.spareLength),\n            perRow: format1(note.allowancePerRow)\n          }))}</span>`'
    )
    .replace(
      'margin: formatInt(note.spareLength)\n        }));',
      'margin: formatInt(note.spareLength),\n          perRow: format1(note.allowancePerRow)\n        }));'
    )
    .replace(
      'margin: formatInt(alert.operationalNote.spareLength)\n        }), { tag: "span", className: "space-alert-text" });',
      'margin: formatInt(alert.operationalNote.spareLength),\n          perRow: format1(alert.operationalNote.allowancePerRow)\n        }), { tag: "span", className: "space-alert-text" });'
    )
    .replace(
      `\n      const spareLength = Math.max(0, c.innerLength - result.layout.usedLength);
      const spareWidth = Math.max(0, c.innerWidth - result.layout.usedWidth);
      const remainingSpace = [
        t("table.lengthMargin", { value: formatInt(spareLength) }),
        t("table.widthMargin", { value: formatInt(spareWidth) }),
        result.mode === "mixed"
          ? t("table.heightIndividual")
          : t("table.heightMargin", {
            value: formatInt(Math.max(0, c.innerHeight - usedLoadHeight(result)))
          })
      ].join(" · ");
      const operationalSpaceNote = spaceAlertPlainText(result);
`,
      "\n"
    )
    .replace(
      '${operationalSpaceNote ? `<tr><th>${escapeHtml(t("print.margins"))}</th><td>${escapeHtml(remainingSpace)}<br><strong>${escapeHtml(operationalSpaceNote)}</strong></td></tr>` : ""}',
      '${spaceAlertPlainText(result) ? `<tr><th>${escapeHtml(t("print.margins"))}</th><td><strong>${escapeHtml(spaceAlertPlainText(result))}</strong></td></tr>` : ""}'
    );
}

for (const [relative, expected] of Object.entries(EXPECTED_BASELINE_HASHES)) {
  assert.equal(sha256(path.join(BASELINE, relative)), expected, `Baseline fixture changed: ${relative}`);
}

assert.equal(
  read(path.join(ROOT, "site", "lang", "index.json")),
  read(path.join(BASELINE, "lang", "index.json")),
  "Language inventory changed from v1.1.0."
);

for (const code of CODES) {
  const baseline = JSON.parse(read(path.join(BASELINE, "lang", `${code}.json`)));
  const current = JSON.parse(read(path.join(ROOT, "site", "lang", `${code}.json`)));
  assert.equal(current.meta.version, "1.2.0", `${code}: current metadata version.`);
  current.meta.version = baseline.meta.version;
  for (const key of ADDED_KEYS) {
    assert.equal(typeof current.translations[key], "string", `${code}:${key} missing.`);
    assert.ok(current.translations[key].trim(), `${code}:${key} empty.`);
    delete current.translations[key];
  }
  for (const key of CHANGED_KEYS) {
    assert.notEqual(current.translations[key], baseline.translations[key], `${code}:${key} was not updated.`);
    current.translations[key] = baseline.translations[key];
  }
  assert.deepEqual(current, baseline, `${code}: catalog change outside v1.2.0 allowlist.`);
}

for (const [baselineName, currentName] of [
  ["loadcomposer-v1.1.0.html", "site/index.html"],
  ["loadcomposer-v1.1.0-standalone.html", "site/downloads/loadcomposer-v1.2.0-standalone.html"]
]) {
  const baseline = stripEmbeddedCatalogs(read(path.join(BASELINE, baselineName)));
  const current = normalizeCurrentHtml(read(path.join(ROOT, currentName)));
  if (current !== baseline) {
    const diagnostic = path.join("/tmp", `loadcomposer-${path.basename(currentName)}-normalized.html`);
    fs.writeFileSync(diagnostic, current);
    throw new Error(
      `${currentName}: source change outside the exact v1.2.0 allowlist; ` +
      `normalized diagnostic written to ${diagnostic}.`
    );
  }
}

console.log(
  "v1.2.0 scope audit PASS: canonical v1.1.0 fixture 10/10 hashes; " +
  "33 added localization keys, 10 changed labels/messages, one Download footer link, " +
  "and only the authorized compact/print presentation code differ; algorithms are byte-equivalent."
);
