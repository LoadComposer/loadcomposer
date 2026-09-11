import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const files = [
  path.join(ROOT, "site", "index.html"),
  path.join(ROOT, "site", "downloads", "loadcomposer-v1.4.0-standalone.html")
];
const addLabels = {
  it: "+ Aggiungi altro tipo di pallet",
  en: "+ Add another pallet type",
  de: "+ Weiteren Palettentyp hinzufügen",
  es: "+ Añadir otro tipo de palé",
  fr: "+ Ajouter un autre type de palette",
  pt: "+ Adicionar outro tipo de palete",
  nl: "+ Nog een pallettype toevoegen"
};

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} missing`);
  const brace = source.indexOf("{", start);
  let depth = 0;
  for (let index = brace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} is not balanced`);
}

const results = [];
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const label = path.relative(ROOT, file);

  assert.ok(source.includes("background: var(--lc-control-bg, var(--panel-2));"), `${label}: picker trigger is not tokenized`);
  assert.ok(source.includes("background: var(--lc-surface-main, var(--panel));"), `${label}: picker menu is not tokenized`);
  const pickerBlock = source.slice(source.indexOf(".picker-button {"), source.indexOf(".selected-pallet {"));
  assert.equal(pickerBlock.includes("#0b1220"), false, `${label}: legacy dark picker surface remains`);

  assert.ok(source.includes('#planner .stacking-toggle[aria-disabled="true"],'), `${label}: disabled stacking wrapper rule missing`);
  assert.ok(source.includes("background: transparent;\n      border: 0;\n      border-radius: 0;\n      box-shadow: none;"), `${label}: stacking wrapper is not visually transparent`);
  assert.ok(source.includes("#planner .rotation-box .square-note"), `${label}: square note spacing rule missing`);
  assert.ok(source.includes("padding-inline: 7px;\n      padding-block: 0;"), `${label}: square note must add horizontal spacing only`);

  assert.ok(source.includes('<colgroup><col><col><col><col><col></colgroup>'), `${label}: stable results colgroup missing`);
  assert.ok(source.includes("table-layout: fixed;"), `${label}: results table fixed layout missing`);
  for (let column = 1; column <= 5; column += 1) {
    assert.ok(source.includes(`#planner .results-table col:nth-child(${column})`), `${label}: column ${column} width missing`);
  }
  assert.ok(source.includes("#planner .results-table col:nth-child(1) { width: 21%; }"), `${label}: vehicle column was not reduced conservatively`);
  assert.ok(source.includes("#planner .results-table col:nth-child(3) { width: 25%; }"), `${label}: capacity column did not receive redistributed width`);
  assert.ok(source.includes("#planner .results-table col:nth-child(5) { width: 22%; }"), `${label}: residual-space column did not receive redistributed width`);
  assert.ok(source.includes('class="load-settings-band"'), `${label}: composed Load settings band missing`);
  assert.ok(source.includes('class="pallets-heading-copy"'), `${label}: composed Pallets header copy missing`);
  assert.ok(source.includes("width: 229px; flex: 0 0 229px;"), `${label}: stable unit selector width missing`);
  assert.ok(source.includes("#planner .filter-chip { min-height: 36px;"), `${label}: compact result-filter height missing`);
  assert.equal(source.includes("min-height: 3.45em"), false, `${label}: artificial metric height reservation remains`);

  const summary = extractFunction(source, "groupSummaryParts");
  const quantityPosition = summary.indexOf("quantityText");
  const dimensionsPosition = summary.indexOf("formatLengthValue(dims.length)");
  const namePosition = summary.indexOf("parts.push(name)");
  const rotationPosition = summary.indexOf('if (isSquare)');
  const identifierPosition = summary.indexOf('data-field="identifier"');
  assert.ok(quantityPosition < dimensionsPosition && dimensionsPosition < namePosition && namePosition < rotationPosition && rotationPosition < identifierPosition, `${label}: summary semantic order changed`);
  assert.ok(summary.includes('`${formatInt(quantity)} PLT`'), `${label}: compact PLT quantity missing`);
  assert.ok(summary.includes("if (identifier) parts.push(identifier);"), `${label}: identifier must not have an arbitrary length omission`);
  assert.equal(summary.includes("identifier.length <="), false, `${label}: old identifier omission remains`);

  const displayCodeSource = extractFunction(source, "groupDisplayCode");
  const groupDisplayCode = Function(`"use strict"; ${displayCodeSource}; return groupDisplayCode;`)();
  assert.deepEqual([0, 25, 26, 27, 51, 52].map(groupDisplayCode), ["A", "Z", "AA", "AB", "AZ", "BA"]);
  assert.ok(source.includes('id: `${typeIndex + 1}.${i}`'), `${label}: internal numeric rectangle identity changed`);
  assert.ok(source.includes('return `${groupDisplayCode(rect.typeIndex)}.${rect.unitNo}`;'), `${label}: operator pallet reference helper missing`);
  assert.ok(source.includes('if (result.mode === "mixed") return palletDisplayReference(rect);'), `${label}: canvas/print reference path is not centralized`);
  assert.ok(source.includes('document.createTextNode(`${groupDisplayCode(index)}: `)'), `${label}: preview legend group letter missing`);
  assert.ok(source.includes('${groupDisplayCode(index)}</td>'), `${label}: print legend group letter missing`);

  results.push({ file: label, status: "PASS" });
}

for (const [language, expected] of Object.entries(addLabels)) {
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "site", "lang", `${language}.json`), "utf8"));
  assert.equal(catalog.translations["pallet.addGroup"], expected, `${language}: add-another-pallet-type label`);
}

fs.writeFileSync(
  path.join(ROOT, "presentation-polish-results-v1.4.0.json"),
  `${JSON.stringify({ version: "1.4.0", status: "PASS", files: results }, null, 2)}\n`
);
console.log("Presentation polish v1.4.0 PASS: tokenized picker, transparent stacking wrapper, operational summaries, A.1 operator references and stable result columns.");
