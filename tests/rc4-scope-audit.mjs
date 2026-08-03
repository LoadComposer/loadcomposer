import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASELINE = path.join(ROOT, "tests", "fixtures", "baseline-v1.0.0-rc.3");
const CURRENT_APP = path.join(ROOT, "site", "index.html");
const CURRENT_STANDALONE = path.join(
  ROOT,
  "site",
  "downloads",
  "loadcomposer-v1.0.0-rc.4-standalone.html"
);
const CODES = ["it", "en", "de", "es", "fr", "pt", "nl"];
const TRUCK_IDS = new Set([
  "truck-curtain-1360",
  "truck-mega-1360",
  "truck-reefer-1360"
]);
const NEW_KEYS = new Set([
  "space.issue.prudentialLength",
  "space.issue.prudentialWidth",
  "space.issue.prudentialHeight",
  "space.prudentialHtml",
  "space.prudentialPlain"
]);
const CHANGED_TRANSLATIONS = new Set([
  "meta.documentTitle",
  "vehicle.truck-curtain-1360.name",
  "vehicle.truck-curtain-1360.note",
  "vehicle.truck-mega-1360.name",
  "vehicle.truck-mega-1360.note",
  "vehicle.truck-reefer-1360.name",
  "vehicle.truck-reefer-1360.note"
]);

const read = file => fs.readFileSync(file, "utf8");
const json = file => JSON.parse(read(file));

function section(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing section start: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `Missing section end after: ${startMarker}`);
  return source.slice(start, end);
}

function replaceSection(source, startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing replacement start: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.notEqual(end, -1, `Missing replacement end after: ${startMarker}`);
  return source.slice(0, start) + replacement + source.slice(end);
}

function functionBlock(source, name) {
  return section(source, `    function ${name}(`, "\n    function ");
}

function containerBlock(source) {
  return section(source, "    const CONTAINERS = [", "\n\n    const TYPE_COLORS");
}

function containers(source) {
  const block = containerBlock(source);
  const expression = block.slice(block.indexOf("[")).replace(/;\s*$/, "");
  return JSON.parse(JSON.stringify(vm.runInNewContext(expression, Object.create(null))));
}

const baselineModular = read(path.join(BASELINE, "loadcomposer-v1.0.0-rc.3.html"));
const currentModular = read(CURRENT_APP);
const currentStandalone = read(CURRENT_STANDALONE);

assert.deepEqual(
  json(path.join(ROOT, "site", "lang", "index.json")),
  json(path.join(BASELINE, "lang", "index.json")),
  "Enabled-language index changed from canonical RC.3."
);

for (const code of CODES) {
  const oldCatalog = json(path.join(BASELINE, "lang", `${code}.json`));
  const catalog = json(path.join(ROOT, "site", "lang", `${code}.json`));
  assert.equal(catalog.meta.version, "1.0.0-rc.4", `${code}: wrong version.`);
  assert.equal(Object.keys(oldCatalog.translations).length, 451, `${code}: RC.3 fixture key count.`);
  assert.equal(Object.keys(catalog.translations).length, 456, `${code}: RC.4 key count.`);
  for (const key of NEW_KEYS) {
    assert.equal(typeof catalog.translations[key], "string", `${code}: missing ${key}.`);
    assert(catalog.translations[key].length > 0, `${code}: empty ${key}.`);
  }
  for (const [key, oldValue] of Object.entries(oldCatalog.translations)) {
    if (CHANGED_TRANSLATIONS.has(key)) continue;
    assert.equal(catalog.translations[key], oldValue, `${code}: unexpected change at ${key}.`);
  }
  const removed = Object.keys(oldCatalog.translations)
    .filter(key => !(key in catalog.translations));
  assert.deepEqual(removed, [], `${code}: RC.3 translations were removed.`);
  const added = Object.keys(catalog.translations)
    .filter(key => !(key in oldCatalog.translations));
  assert.deepEqual(new Set(added), NEW_KEYS, `${code}: unexpected added translations.`);
}

const baselineProfiles = containers(baselineModular);
const currentProfiles = containers(currentModular);
assert.equal(currentProfiles.length, baselineProfiles.length, "Vehicle count changed.");
assert.deepEqual(
  currentProfiles.map(profile => profile.id),
  baselineProfiles.map(profile => profile.id),
  "Vehicle inventory or order changed."
);
for (const profile of currentProfiles) {
  if (TRUCK_IDS.has(profile.id)) continue;
  const baseline = baselineProfiles.find(item => item.id === profile.id);
  assert.deepEqual(profile, baseline, `${profile.id}: container profile changed.`);
}

const expectedTrucks = {
  "truck-curtain-1360": [13620, 2480, 2650, 13600, 2450, 2600],
  "truck-mega-1360": [13620, 2480, 3000, 13600, 2450, 2900],
  "truck-reefer-1360": [13310, 2460, 2650, 13300, 2460, 2600]
};
for (const [id, expected] of Object.entries(expectedTrucks)) {
  const profile = currentProfiles.find(item => item.id === id);
  assert.deepEqual(
    [
      profile.innerLength,
      profile.innerWidth,
      profile.innerHeight,
      profile.prudentialLength,
      profile.prudentialWidth,
      profile.prudentialHeight
    ],
    expected,
    `${id}: nominal/prudential dimensions.`
  );
  for (const legacy of ["minLength", "minWidth", "minHeight", "maxHeight"]) {
    assert.equal(legacy in profile, false, `${id}: legacy operational field ${legacy}.`);
  }
}
const mega = currentProfiles.find(item => item.id === "truck-mega-1360");
assert(!Object.values(mega).includes(2845), "Mega still has operational 2845.");
assert(!Object.values(mega).includes(3200), "Mega still has operational 3200.");

let normalized = currentModular.replaceAll("1.0.0-rc.4", "1.0.0-rc.3");
normalized = replaceSection(
  normalized,
  "    const CONTAINERS = [",
  "\n\n    const TYPE_COLORS",
  containerBlock(baselineModular)
);
for (const name of [
  "evaluateSpaceAlert",
  "spaceAlertDetails",
  "spaceAlertPlainText",
  "appendSpaceAlertDetails",
  "appendMarginCell"
]) {
  normalized = replaceSection(
    normalized,
    `    function ${name}(`,
    "\n    function ",
    functionBlock(baselineModular, name)
  );
}
assert.equal(
  normalized,
  baselineModular,
  "Modular application changed outside version, three truck profiles and alert rendering."
);

for (const marker of [
  '"version":"1.0.0-rc.4"',
  "prudentialLength: 13600",
  "prudentialHeight: 2900",
  "function evaluateSpaceAlert(result)",
  "function appendSpaceAlertDetails(parent, result)"
]) {
  assert(currentStandalone.includes(marker), `Standalone missing RC.4 marker: ${marker}`);
}

console.log(
  "RC.4 scope audit PASS: canonical RC.3 direct fixture, 12 unchanged vehicle IDs, " +
  "nine unchanged container profiles, three exact truck profiles, 7 × 456 catalogs, " +
  "and no modular-app changes outside the authorized version/profile/alert sections."
);
