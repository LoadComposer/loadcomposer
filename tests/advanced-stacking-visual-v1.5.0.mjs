import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launchBrowser } from "./browser-runtime.mjs";

const root = path.resolve(import.meta.dirname, "..");
const current = pathToFileURL(path.join(root, "site/downloads/loadcomposer-v1.5.0-standalone.html")).href;
const baseline = pathToFileURL(path.join(root, "site/downloads/loadcomposer-v1.4.0-standalone.html")).href;
const evidence = path.join(root, "advanced-stacking-visual-evidence-v1.5.0");
fs.mkdirSync(evidence, { recursive: true });
const browser = await launchBrowser(root);
const checks = [];
try {
  for (const width of [2560, 1536, 1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 940 }, colorScheme: "light" });
    await page.goto(current);
    await page.waitForSelector('.group-top-grid');
    const normal = await page.locator('.pallet-group').first().evaluate(node => node.getBoundingClientRect().height);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}: overflow`);
    await page.locator('#palletsSection').screenshot({ path: path.join(evidence, `closed-${width}.png`) });
    await page.locator('#stackable').check();
    assert.equal(await page.locator('[data-role="stackPanel"]').first().isVisible(), true);
    await page.locator('#palletsSection').screenshot({ path: path.join(evidence, `configure-${width}.png`) });
    const switches = await page.locator('.pallet-group').first().evaluate(group =>
      [...group.querySelectorAll('.group-options .switch-track')].map(el => {
        const r = el.getBoundingClientRect();
        return { width: r.width, height: r.height, x: r.x };
      }));
    assert.equal(switches.length, 2);
    assert.deepEqual(switches[0], switches[1], `${width}: switches must share size and alignment`);
    assert.equal(await page.locator('[data-action="editStack"]').count(), 0);
    await page.locator('#stackable').uncheck();
    assert.equal(await page.locator('[data-role="stackPanel"]').first().isVisible(), false);
    const closed = await page.locator('.pallet-group').first().evaluate(node => node.getBoundingClientRect().height);
    assert.ok(closed <= normal + 2, `${width}: OFF changes normal group height (${normal} -> ${closed})`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}: closed overflow`);
    await page.locator('.pallet-group').first().locator('[data-field="identifier"]')
      .fill('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
    await page.locator('#addMixedRowBtn').click();
    await page.locator('#addMixedRowBtn').click();
    assert.equal(await page.locator('.pallet-group').count(), 3);
    await page.locator('#palletsSection').screenshot({ path: path.join(evidence, `three-groups-off-${width}.png`) });
    for (const group of await page.locator('.pallet-group').all()) {
      if (await group.locator('[data-role="groupBody"]').evaluate(node => node.hidden)) {
        await group.locator('[data-action="toggleGroup"]').click();
      }
      await group.locator('[data-field="identifier"]').fill('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
      if (!(await group.locator('[data-field="stackingEnabled"]').isChecked())) {
        await group.locator('[data-field="stackingEnabled"]').check();
        assert.equal(await group.locator('[data-role="stackPanel"]').isVisible(), true);
      }
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}: three-group overflow`);
    await page.locator('#palletsSection').screenshot({ path: path.join(evidence, `three-groups-on-${width}.png`) });
    if (width === 1536) {
      const group = page.locator('.pallet-group').last();
      for (const role of ['any', 'base', 'top']) {
        await group.locator('[data-field="stackRole"]').selectOption(role);
        assert.equal(await group.locator('.layers-setting').isVisible(), role !== 'top');
        await page.locator('#palletsSection').screenshot({ path: path.join(evidence, `role-${role}-1536.png`) });
      }
    }
    checks.push({ width, normalHeight: normal, collapsedHeight: closed, noOverflow: true });
    await page.close();
  }
  const prior = await browser.newPage({ viewport: { width: 1536, height: 940 } });
  await prior.goto(baseline);
  const baselineHeight = await prior.locator('.pallet-group').first().evaluate(node => node.getBoundingClientRect().height);
  const fullHd = checks.find(check => check.width === 1536);
  assert.ok(fullHd.normalHeight <= baselineHeight + 10,
    `1536: base group grew from ${baselineHeight} to ${fullHd.normalHeight}`);
  await prior.close();

  const german = await browser.newPage({ viewport: { width: 1536, height: 940 }, colorScheme: "dark" });
  await german.addInitScript(() => localStorage.setItem("loadcomposer.language", "de"));
  await german.goto(current);
  await german.waitForSelector('.group-top-grid');
  assert.equal(await german.locator('html').getAttribute('lang'), 'de');
  await german.locator('#stackable').check();
  await german.locator('#palletsSection').screenshot({ path: path.join(evidence, 'german-dark-configure.png') });
  assert.equal(await german.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await german.close();

  const layers = await browser.newPage({ viewport: { width: 1536, height: 940 }, colorScheme: "light" });
  await layers.goto(current);
  await layers.waitForSelector('.group-top-grid');
  const layerScenario = await layers.evaluate(async () => {
    const first = document.getElementById('singlePalletGroup');
    const second = addMixedRow({ presetId: 'eur', quantity: 16, height: 700 }, { calculate: false });
    first.querySelector('[data-field="quantity"]').value = '16';
    setLengthInputMm(first.querySelector('[data-field="height"]'), 700);
    first.querySelector('[data-field="stackingEnabled"]').checked = true;
    first.dataset.stackRole = 'base';
    first.dataset.allowedAbove = JSON.stringify([second.dataset.rowId]);
    second.querySelector('[data-field="stackingEnabled"]').checked = true;
    second.dataset.stackRole = 'top';
    syncUnifiedMode({ calculate: false });
    calculate();
    await loadComposerComputation.whenIdle();
    const index = lastResults.findIndex(result => result.container.id === '20dc');
    document.getElementById('drawSelect').value = String(index);
    drawSelected();
    return { stacked: lastResults[index].stackedCount,
      valid: lastResults[index].advancedValidation.valid,
      before: loadComposerDiagnostics.calculationCycles };
  });
  assert.ok(layerScenario.stacked > 0 && layerScenario.valid);
  await layers.locator('#layoutSection').screenshot({ path: path.join(evidence, 'complete-side-light.png') });
  await layers.locator('#stackView').selectOption('2');
  await layers.locator('#layoutSection').screenshot({ path: path.join(evidence, 'layer-2-side-light.png') });
  await layers.locator('#printView').selectOption('ramp');
  await layers.locator('#printBw').check();
  await layers.locator('#layoutSection').screenshot({ path: path.join(evidence, 'layer-2-ramp-bw.png') });
  await layers.evaluate(() => { document.documentElement.dataset.theme = 'dark'; drawSelected(); });
  await layers.locator('#layoutSection').screenshot({ path: path.join(evidence, 'layer-2-ramp-dark-bw.png') });
  assert.equal(await layers.evaluate(() => loadComposerDiagnostics.calculationCycles), layerScenario.before,
    'switching layers and views must never recalculate geometry');
  await layers.close();

  fs.writeFileSync(path.join(root, 'advanced-stacking-visual-results-v1.5.0.json'),
    JSON.stringify({ version: '1.5.0', baselineHeight, checks, germanDark: 'PASS',
      stackedPreview: layerScenario.stacked, layerSwitchRecalculations: 0 }, null, 2) + '\n');
  console.log(`PASS advanced stacking visual: ${checks.length} widths, 3-group reflow, German Dark, four advanced previews, baseline group ${baselineHeight.toFixed(1)}px`);
} finally { await browser.close(); }
