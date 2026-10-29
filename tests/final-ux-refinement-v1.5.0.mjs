import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launchBrowser } from "./browser-runtime.mjs";

const root = path.resolve(import.meta.dirname, "..");
const html = pathToFileURL(path.join(root, "site/downloads/loadcomposer-v1.5.0-standalone.html")).href;
const evidence = path.join(root, "final-ux-visual-evidence-v1.5.0");
fs.mkdirSync(evidence, { recursive: true });
const checks = [];
const approvedItalianRoles = {
  any: "Può essere caricato sopra altri pallet e sostenerne altri.",
  base: "Può avere pallet sopra, ma deve sempre stare alla base della pila.",
  top: "Se sovrapposto, deve stare in cima alla pila. Non può avere pallet sopra."
};
const browser = await launchBrowser(root);
try {
  for (const language of ["it", "de"]) {
    const catalog = JSON.parse(fs.readFileSync(path.join(root, `site/lang/${language}.json`), "utf8")).translations;
    for (const theme of ["light", "dark"]) {
      for (const width of [2560, 1536, 1280, 390]) {
        const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: theme });
        await page.addInitScript(code => localStorage.setItem("loadcomposer.language", code), language);
        await page.goto(html);
        await page.waitForSelector("#loadSettingsSection");
        assert.equal(await page.locator("html").getAttribute("lang"), language);
        const settings = page.locator("#loadSettingsSection");
        assert.equal(await settings.locator("small.stack-help").count(), 0);
        assert.equal(await page.locator("#gap").inputValue(), "0");
        assert.equal(await page.locator("#verticalGap").inputValue(), "0");
        assert.equal(await page.locator("#verticalGapSetting").isVisible(), false);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        const offPositions = await settings.evaluate(section => {
          const unit = section.querySelector(".unit-preference").getBoundingClientRect();
          const gap = section.querySelector("#gap").closest("label").getBoundingClientRect();
          const unitLabel = section.querySelector(".unit-preference legend").getBoundingClientRect();
          const unitControl = section.querySelector(".unit-segments").getBoundingClientRect();
          return { unitLeft: unit.left, gapLeft: gap.left, gapRight: gap.right,
            unitLabelBottom: unitLabel.bottom, unitControlTop: unitControl.top };
        });
        assert.ok(offPositions.unitLabelBottom + 3 < offPositions.unitControlTop,
          `${language} ${theme} ${width}: unit label overlaps the selector`);
        if (width >= 1280) assert.ok(offPositions.gapLeft - offPositions.unitLeft < 260,
          `${language} ${theme} ${width}: gap field is not next to the unit selector when stacking is OFF`);
        await settings.screenshot({ path: path.join(evidence, `${language}-${theme}-${width}-off.png`) });

        await page.locator("#stackable").check();
        assert.equal(await page.locator("#verticalGapSetting").isVisible(), true);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        const measurements = await settings.evaluate(section => {
          const visible = [...section.querySelectorAll(".general-settings-grid > *")]
            .filter(element => getComputedStyle(element).display !== "none")
            .map(element => {
              const bounds = element.getBoundingClientRect();
              const control = element.querySelector(".measurement-input");
              const field = control?.getBoundingClientRect();
              return { top: bounds.top, bottom: bounds.bottom, left: bounds.left, right: bounds.right,
                controlWidth: field?.width, controlHeight: field?.height };
            });
          return { height: section.getBoundingClientRect().height, visible };
        });
        const [unit, horizontal, vertical] = measurements.visible;
        assert.equal(measurements.visible.length, 3);
        if (width >= 1280) assert.ok(Math.abs(horizontal.left - offPositions.gapLeft) < 1,
          `${language} ${theme} ${width}: toggling stacking shifted the gap field`);
        assert.ok(Math.abs(horizontal.controlWidth - vertical.controlWidth) < 1,
          `${language} ${theme} ${width}: numeric field widths differ`);
        assert.ok(Math.abs(horizontal.controlHeight - vertical.controlHeight) < 1,
          `${language} ${theme} ${width}: numeric field heights differ`);
        if (width >= 1280) {
          assert.ok(Math.abs(horizontal.left - unit.right - 22) < 1 &&
            Math.abs(vertical.left - horizontal.right - 22) < 1,
          `${language} ${theme} ${width}: column distances are not uniform`);
          assert.ok(horizontal.controlWidth >= 160 && horizontal.controlWidth <= 180,
            `${language} ${theme} ${width}: numeric fields are excessively wide`);
        } else if (width >= 600) {
          assert.ok(horizontal.left > unit.left && Math.abs(horizontal.left - vertical.left) < 1,
            `${language} ${theme} ${width}: two-column reflow is incoherent`);
        }
        if (width >= 1280) {
          assert.ok(measurements.visible.every(rect => Math.abs(rect.top - measurements.visible[0].top) < 1),
            `${language} ${theme} ${width}: load controls not aligned`);
        }
        // Compact 180px fields wrap the approved full labels; allow only their natural line height.
        if (width === 1536) assert.ok(measurements.height <= 150,
          `${language} ${theme}: load settings grew to ${measurements.height}px`);
        await settings.screenshot({ path: path.join(evidence, `${language}-${theme}-${width}-on.png`) });
        checks.push({ language, theme, width, height: measurements.height, overflow: false });

        if (width === 1536 && language === "it" && theme === "light") {
          await page.locator("#gap").fill("12");
          await page.locator("#verticalGap").fill("7");
          assert.deepEqual(await page.evaluate(() => {
            const input = readInput();
            return { gap: input.gap, verticalGap: input.verticalGap };
          }), { gap: 12, verticalGap: 7 });
          await page.locator("#resetBtn").click();
          assert.equal(await page.locator("#gap").inputValue(), "0");
          assert.equal(await page.locator("#verticalGap").inputValue(), "0");
          assert.equal(await page.locator("#verticalGapSetting").isVisible(), false);
        }

        if ((width === 1536 && ((language === "it" && theme === "light") ||
          (language === "de" && theme === "dark"))) || (width === 390 && language === "it" && theme === "light")) {
          await page.locator("#addMixedRowBtn").click();
          await page.locator("#addMixedRowBtn").click();
          const group = page.locator(".pallet-group").last();
          await group.locator('[data-field="stackingEnabled"]').check();
          assert.equal(await page.locator('[data-action="editStack"]').count(), 0);
          for (const role of ["any", "base", "top"]) {
            await group.locator('[data-field="stackRole"]').selectOption(role);
            const select = group.locator('[data-field="stackRole"]');
            const descriptionId = await select.getAttribute("aria-describedby");
            assert.ok(descriptionId);
            assert.equal(await group.locator(`#${descriptionId}`).textContent(), catalog[`advanced.roleHelp.${role}`]);
            if (language === "it") assert.equal(catalog[`advanced.roleHelp.${role}`], approvedItalianRoles[role]);
            assert.equal(await group.locator(".layers-setting").isVisible(), role !== "top");
            assert.equal(await group.locator(".allowed-above-list").count(), role === "top" ? 0 : 1);
            if (role !== "top") {
              assert.equal(await group.locator('[data-field="allowAbove"]').count(), 3);
              const spacing = await group.evaluate(element => {
                const help = element.querySelector(".advanced-stack-detail .stack-help").getBoundingClientRect();
                const heading = element.querySelector(".allowed-above-heading").getBoundingClientRect();
                const list = element.querySelector(".allowed-above-list").getBoundingClientRect();
                return { toHeading: heading.top - help.bottom, toChips: list.top - heading.bottom };
              });
              assert.ok(spacing.toHeading > spacing.toChips && spacing.toChips > 0,
                `${language} ${theme} ${width}: compatibility heading needs a distinct but compact gap`);
            } else {
              assert.equal(await group.locator(".allowed-above-heading").count(), 0);
            }
            await page.locator("#palletsSection").screenshot({
              path: path.join(evidence, `${language}-${theme}-${width}-role-${role}.png`)
            });
          }
        }
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}
fs.writeFileSync(path.join(root, "final-ux-visual-results-v1.5.0.json"),
  JSON.stringify({ version: "1.5.0", checks }, null, 2) + "\n");
console.log("Final UX refinement PASS: 32 load-settings views, contextual roles, normalized inputs, Reset, mobile and German Dark.");
