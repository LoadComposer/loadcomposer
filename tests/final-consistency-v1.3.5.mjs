import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";

const ROOT = path.resolve(import.meta.dirname, "..");
const APP = path.join(ROOT, "site", "downloads", "loadcomposer-v1.3.5-standalone.html");
const OUTPUT = path.join(ROOT, "final-consistency-results-v1.3.5.json");

function canvasContextStub() {
  return new Proxy({}, {
    get(target, property) {
      if (!(property in target)) {
        target[property] = property === "measureText"
          ? text => ({ width: String(text).length * 7 })
          : () => {};
      }
      return target[property];
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    }
  });
}

async function loadApp() {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", error => errors.push(error));
  const dom = new JSDOM(fs.readFileSync(APP, "utf8"), {
    runScripts: "dangerously",
    url: "https://loadcomposer.test/",
    virtualConsole,
    beforeParse(window) {
      window.localStorage.setItem("loadcomposer.language", "it");
      window.localStorage.setItem("loadcomposer.unit", "mm");
      window.alert = () => {};
      window.open = () => null;
      window.HTMLCanvasElement.prototype.getContext = () => canvasContextStub();
      window.HTMLCanvasElement.prototype.toDataURL = () => "data:image/png;base64,";
    }
  });
  await dom.window.loadComposerI18n.ready;
  await new Promise(resolve => dom.window.setTimeout(resolve, 0));
  if (errors.length) throw errors[0];
  return dom;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function resultFor(window, vehicleId) {
  return window.eval(`lastResults.find(result => result.container.id === ${JSON.stringify(vehicleId)})`);
}

function presentationFor(window, group, presetId) {
  window.selectPresetForGroup(group, presetId, false);
  const option = group.querySelector(`[data-action="selectPreset"][data-preset-id="${presetId}"]`);
  const summary = group.querySelector('[data-role="selectedSummary"]');
  return {
    menu: {
      primary: option.querySelector("strong").textContent.trim(),
      secondary: option.querySelector("small").textContent.trim()
    },
    summary: {
      primary: summary.querySelector("strong").textContent.trim(),
      secondary: summary.querySelector("small").textContent.trim()
    }
  };
}

const MICROFIX_PRESETS = {
  "42x42": {
    primary: "42 × 42 in",
    mm: "1067 × 1067 mm",
    cmComma: "106,7 × 106,7 cm",
    cmPoint: "106.7 × 106.7 cm"
  },
  "48x45": {
    primary: "48 × 45 in",
    mm: "1219 × 1143 mm",
    cmComma: "121,9 × 114,3 cm",
    cmPoint: "121.9 × 114.3 cm"
  },
  "48x48": {
    primary: "48 × 48 in",
    mm: "1219 × 1219 mm",
    cmComma: "121,9 × 121,9 cm",
    cmPoint: "121.9 × 121.9 cm"
  }
};

const MICROFIX_DESCRIPTIONS = {
  it: {
    "42x42": "Pallet telecom / vernici",
    "48x45": "Pallet automotive",
    "48x48": "Pallet per fusti"
  },
  en: {
    "42x42": "Telecom / paint pallet",
    "48x45": "Automotive pallet",
    "48x48": "Drum pallet"
  },
  de: {
    "42x42": "Palette für Telekommunikation / Lacke",
    "48x45": "Automobilpalette",
    "48x48": "Fasspalette"
  },
  es: {
    "42x42": "Palé para telecomunicaciones / pinturas",
    "48x45": "Palé para automoción",
    "48x48": "Palé para bidones"
  },
  fr: {
    "42x42": "Palette télécom / peinture",
    "48x45": "Palette automobile",
    "48x48": "Palette pour fûts"
  },
  pt: {
    "42x42": "Palete para telecomunicações / tintas",
    "48x45": "Palete para o setor automóvel",
    "48x48": "Palete para bidões"
  },
  nl: {
    "42x42": "Pallet voor telecom / verf",
    "48x45": "Automotivepallet",
    "48x48": "Vatenpallet"
  }
};

function setSingleCustom(window, { length = 1000, width = 1000, height, quantity = 1 }) {
  const document = window.document;
  const group = document.getElementById("singlePalletGroup");
  document.getElementById("loadMode").value = "single";
  document.getElementById("stackable").checked = false;
  window.selectPresetForGroup(group, "custom", false);
  group.querySelector('[data-field="length"]').value = String(length);
  group.querySelector('[data-field="width"]').value = String(width);
  group.querySelector('[data-field="height"]').value = String(height);
  group.querySelector('[data-field="quantity"]').value = String(quantity);
  group.querySelector('[data-field="allowRotate"]').checked = false;
  group.querySelector('[data-field="lockedOrientation"][value="normal"]').checked = true;
  document.getElementById("gap").value = "0";
  window.calculate();
}

const dom = await loadApp();
const { window } = dom;
const checks = [];

try {
  const presets = plain(window.eval("PALLET_PRESETS"));
  const metricNative = presets.filter(item => item.nativeUnit === "mm").map(item => item.id);
  const imperialNative = presets.filter(item => item.nativeUnit === "in").map(item => item.id);
  assert.deepEqual(metricNative, ["eur", "industrial", "asian", "australian", "half-euro"]);
  assert.deepEqual(imperialNative, ["north-american", "42x42", "48x45", "48x48"]);
  assert.equal(presets.find(item => item.id === "custom").nativeUnit, undefined);
  checks.push({ id: "preset-census", metricNative, imperialNative, status: "PASS" });

  const single = window.document.getElementById("singlePalletGroup");
  const mixed = window.document.querySelector("#mixedRows .mixed-row");
  const presentationCases = [
    { unit: "mm", preset: "eur", primary: "1200 × 800 mm", secondaryIncludes: "Euro pallet" },
    { unit: "cm", preset: "eur", primary: "120 × 80 cm", secondaryIncludes: "Euro pallet" },
    { unit: "cm", preset: "industrial", primary: "120 × 100 cm", secondaryIncludes: "Pallet industriale" },
    { unit: "cm", preset: "asian", primary: "110 × 110 cm", secondaryIncludes: "Pallet standard asiatico" },
    { unit: "in", preset: "eur", primary: "1200 × 800 mm", secondaryIncludes: "47,24 × 31,5 in" },
    { unit: "mm", preset: "north-american", primary: "48 × 40 in", secondaryIncludes: "1219 × 1016 mm" },
    { unit: "cm", preset: "north-american", primary: "48 × 40 in", secondaryIncludes: "121,9 × 101,6 cm" },
    { unit: "in", preset: "north-american", primary: "48 × 40 in", secondaryIncludes: "Pallet nordamericano" }
  ];

  for (const spec of presentationCases) {
    assert.equal(window.loadComposerUnits.setUnit(spec.unit), true, `${spec.preset}/${spec.unit}: unit switch.`);
    const singleDisplay = presentationFor(window, single, spec.preset);
    const mixedDisplay = presentationFor(window, mixed, spec.preset);
    assert.deepEqual(singleDisplay.menu, singleDisplay.summary, `${spec.preset}/${spec.unit}: single menu/summary.`);
    assert.deepEqual(mixedDisplay.menu, mixedDisplay.summary, `${spec.preset}/${spec.unit}: mixed menu/summary.`);
    assert.deepEqual(singleDisplay, mixedDisplay, `${spec.preset}/${spec.unit}: single/mixed presentation.`);
    assert.equal(singleDisplay.menu.primary, spec.primary, `${spec.preset}/${spec.unit}: primary.`);
    assert.ok(singleDisplay.menu.secondary.includes(spec.secondaryIncludes), `${spec.preset}/${spec.unit}: secondary.`);
    assert.equal(
      `${singleDisplay.menu.primary} ${singleDisplay.menu.secondary}`.includes("47,99 × 40 in"),
      false,
      `${spec.preset}/${spec.unit}: native imperial identity round-tripped through canonical mm.`
    );
    checks.push({ id: `preset-${spec.preset}-${spec.unit}`, ...singleDisplay.menu, status: "PASS" });
  }

  for (const [language, descriptions] of Object.entries(MICROFIX_DESCRIPTIONS)) {
    await window.loadComposerI18n.setLanguage(language);
    for (const unit of ["mm", "cm", "in"]) {
      assert.equal(window.loadComposerUnits.setUnit(unit), true, `${language}/${unit}: unit switch.`);
      for (const [presetId, expected] of Object.entries(MICROFIX_PRESETS)) {
        const singleDisplay = presentationFor(window, single, presetId);
        const mixedDisplay = presentationFor(window, mixed, presetId);
        const description = descriptions[presetId];
        const conversion = unit === "mm"
          ? expected.mm
          : language === "en"
            ? expected.cmPoint
            : expected.cmComma;
        const expectedSecondary = unit === "in"
          ? description
          : `${conversion} · ${description}`;

        assert.deepEqual(singleDisplay.menu, singleDisplay.summary, `${language}/${unit}/${presetId}: Single menu/summary.`);
        assert.deepEqual(mixedDisplay.menu, mixedDisplay.summary, `${language}/${unit}/${presetId}: Mixed menu/summary.`);
        assert.deepEqual(singleDisplay, mixedDisplay, `${language}/${unit}/${presetId}: Single/Mixed presentation.`);
        assert.equal(singleDisplay.menu.primary, expected.primary, `${language}/${unit}/${presetId}: native identity.`);
        assert.equal(singleDisplay.menu.secondary, expectedSecondary, `${language}/${unit}/${presetId}: localized description.`);
        assert.equal(singleDisplay.menu.secondary.includes(expected.primary), false, `${language}/${unit}/${presetId}: duplicated native dimension.`);
        checks.push({
          id: `microfix-${language}-${unit}-${presetId}`,
          ...singleDisplay.menu,
          status: "PASS"
        });
      }
    }

    for (const preset of presets.filter(item => item.id !== "custom")) {
      assert.equal(window.loadComposerUnits.setUnit(preset.nativeUnit), true);
      const display = presentationFor(window, single, preset.id);
      assert.equal(
        display.menu.secondary.includes(display.menu.primary),
        false,
        `${language}/${preset.id}: redundant Pallet + same dimension fallback.`
      );
    }
  }
  checks.push({
    id: "all-current-presets-redundant-fallback-audit",
    languages: Object.keys(MICROFIX_DESCRIPTIONS).length,
    presets: presets.filter(item => item.id !== "custom").length,
    redundantFallbacks: 0,
    status: "PASS"
  });

  await window.loadComposerI18n.setLanguage("en");
  assert.equal(window.loadComposerUnits.setUnit("in"), true);
  const englishEuro = presentationFor(window, single, "eur");
  assert.ok(englishEuro.menu.secondary.includes("47.24 × 31.5 in"), "English decimal separator.");
  await window.loadComposerI18n.setLanguage("it");

  assert.equal(window.loadComposerUnits.setUnit("cm"), true);
  const custom = presentationFor(window, single, "custom");
  assert.equal(custom.summary.primary, "120 × 80 cm", "Custom must use only the global unit.");
  assert.equal(/\b(?:mm|in)\b/.test(custom.summary.primary), false, "Custom leaked a second measurement system.");
  checks.push({ id: "preset-custom-global-unit-only", ...custom.summary, status: "PASS" });

  assert.equal(window.loadComposerUnits.setUnit("mm"), true);
  const thresholdCases = [
    ["truck-curtain-1360", 2499, "ok"],
    ["truck-curtain-1360", 2500, "ok"],
    ["truck-curtain-1360", 2501, "verify"],
    ["truck-curtain-1360", 2651, "not-ok"],
    ["truck-mega-1360", 2549, "ok"],
    ["truck-mega-1360", 2550, "ok"],
    ["truck-mega-1360", 2551, "verify"],
    ["truck-mega-1360", 2800, "verify"],
    ["truck-mega-1360", 3001, "not-ok"],
    ["truck-reefer-1360", 2499, "ok"],
    ["truck-reefer-1360", 2500, "ok"],
    ["truck-reefer-1360", 2501, "verify"],
    ["truck-reefer-1360", 2651, "not-ok"]
  ];
  for (const [vehicle, height, expected] of thresholdCases) {
    setSingleCustom(window, { height });
    const result = resultFor(window, vehicle);
    const control = window.accessControlState(result);
    assert.equal(control.state, expected, `${vehicle}/${height}: access boundary.`);
    checks.push({ id: `${vehicle}-${height}`, access: control.state, geometryOk: result.ok, status: "PASS" });
  }

  setSingleCustom(window, { width: 2450, height: 1000 });
  assert.equal(window.accessControlState(resultFor(window, "truck-curtain-1360")).state, "ok");
  setSingleCustom(window, { width: 2451, height: 1000 });
  assert.equal(window.accessControlState(resultFor(window, "truck-curtain-1360")).state, "verify");
  checks.push({ id: "curtain-width-prudential-boundary", at2450: "ok", at2451: "verify", status: "PASS" });

  setSingleCustom(window, { height: 2280 });
  assert.equal(window.accessControlState(resultFor(window, "20dc")).state, "ok");
  setSingleCustom(window, { height: 2281 });
  assert.equal(window.accessControlState(resultFor(window, "20dc")).state, "not-ok");
  checks.push({ id: "container-door-height-unchanged", at2280: "ok", at2281: "not-ok", status: "PASS" });

  const group = window.document.getElementById("singlePalletGroup");
  window.selectPresetForGroup(group, "eur", false);
  group.querySelector('[data-field="height"]').value = "1200";
  group.querySelector('[data-field="quantity"]').value = "2";
  window.document.getElementById("stackable").checked = true;
  window.document.getElementById("maxLayers").value = "2";
  window.document.getElementById("verticalGap").value = "0";
  window.calculate();
  for (const vehicle of ["truck-curtain-1360", "truck-mega-1360", "truck-reefer-1360"]) {
    const result = resultFor(window, vehicle);
    assert.equal(window.usedLoadHeight(result), 2400, `${vehicle}: stack final height.`);
    assert.equal(window.accessControlState(result).state, "ok", `${vehicle}: individual 1200 mm access.`);
  }
  checks.push({ id: "single-stacking-2x1200", stackHeight: 2400, access: "ok", geometry: "unchanged", status: "PASS" });

  setSingleCustom(window, { height: 2501, quantity: 1 });
  const capacityOkAccessVerify = resultFor(window, "truck-curtain-1360");
  assert.equal(window.loadCapacityControlState(capacityOkAccessVerify).state, "ok");
  assert.equal(window.accessControlState(capacityOkAccessVerify).state, "verify");

  setSingleCustom(window, { height: 900, quantity: 35 });
  const capacityPartialAccessOk = resultFor(window, "truck-curtain-1360");
  assert.equal(window.loadCapacityControlState(capacityPartialAccessOk).state, "partial");
  assert.equal(window.accessControlState(capacityPartialAccessOk).state, "ok");
  checks.push({
    id: "load-access-independence",
    cases: ["capacity-ok/access-verify", "capacity-partial/access-ok"],
    status: "PASS"
  });

  const profiles = plain(window.eval("CONTAINERS"));
  assert.deepEqual(
    Object.fromEntries(profiles
      .filter(profile => Number.isFinite(profile.accessAutoOkHeight))
      .map(profile => [profile.id, profile.accessAutoOkHeight])),
    {
      "truck-curtain-1360": 2500,
      "truck-mega-1360": 2550,
      "truck-reefer-1360": 2500
    }
  );
  assert.equal(profiles.some(profile => "accessAutoOkHeight" in profile && profile.vehicleType !== "truck"), false);
  assert.equal(profiles.some(profile => profile.doorHeight === 2500 || profile.doorHeight === 2550), false);
  checks.push({ id: "access-metadata-scope", profiles: 3, doorHeightUnchanged: true, status: "PASS" });

  fs.writeFileSync(OUTPUT, `${JSON.stringify({
    version: "1.3.5",
    source: path.relative(ROOT, APP),
    checks,
    summary: { passed: checks.length, total: checks.length },
    status: "PASS"
  }, null, 2)}\n`);
  console.log(`Final consistency v1.3.5 PASS: ${checks.length}/${checks.length} focused checks.`);
} finally {
  dom.window.close();
}
