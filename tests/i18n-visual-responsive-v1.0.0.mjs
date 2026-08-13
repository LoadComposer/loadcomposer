import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launchBrowser } from "./browser-runtime.mjs";

const projectDir = path.resolve(import.meta.dirname, "..");
const outputDir = path.join(projectDir, "screenshots-i18n-v1.2.0");
const resultPath = path.join(projectDir, "visual-responsive-results-v1.2.0.json");
const standaloneUrl = pathToFileURL(
  path.join(projectDir, "site/downloads/loadcomposer-v1.2.0-standalone.html")
).href;
const widths = [320, 390, 768, 1440];
const themes = ["light", "dark"];
const languages = ["it", "en", "de", "es", "fr", "pt", "nl"];
const modes = ["single", "mixed"];
const localeByLanguage = {
  it: "it-IT",
  en: "en-GB",
  de: "de-DE",
  es: "es-ES",
  fr: "fr-FR",
  pt: "pt-PT",
  nl: "nl-NL"
};
const results = [];

fs.mkdirSync(outputDir, { recursive: true });
const browser = await launchBrowser(projectDir);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function overlap(a, b) {
  return !(
    a.right <= b.left ||
    b.right <= a.left ||
    a.bottom <= b.top ||
    b.bottom <= a.top
  );
}

try {
  for (const width of widths) {
    for (const theme of themes) {
      for (const language of languages) {
        for (const mode of modes) {
          const context = await browser.newContext({
            viewport: {
              width,
              height: width === 320 ? 568 : width === 390 ? 844 : width === 768 ? 1024 : 900
            },
            locale: localeByLanguage[language],
            colorScheme: theme
          });
          await context.addInitScript(({ language, theme }) => {
            localStorage.setItem("loadcomposer.language", language);
            localStorage.setItem("loadcomposer.theme", theme);
          }, { language, theme });
          const page = await context.newPage();
          const runtimeErrors = [];
          page.on("pageerror", error => runtimeErrors.push(error.message));
          await page.goto(standaloneUrl, { waitUntil: "load" });
          await page.waitForFunction(() => (
            document.documentElement.dataset.i18nReady &&
            document.querySelectorAll("#resultsBody tr").length > 0
          ));

          if (mode === "mixed") {
            await page.selectOption("#loadMode", "mixed");
            await page.waitForFunction(() => document.querySelectorAll("#mixedRows .mixed-row").length >= 2);
          }

          const state = await page.evaluate(() => {
            const rectNode = node => {
              if (!node) return null;
              const box = node.getBoundingClientRect();
              return {
                left: box.left,
                top: box.top,
                right: box.right,
                bottom: box.bottom,
                width: box.width,
                height: box.height
              };
            };
            const rect = selector => rectNode(document.querySelector(selector));
            const summary = [...document.querySelectorAll("[data-role='selectedSummary']")]
              .find(node => node.getClientRects().length > 0);
            const summaryStyle = getComputedStyle(summary);
            return {
              lang: document.documentElement.lang,
              dir: document.documentElement.dir,
              theme: document.documentElement.dataset.theme,
              bodyScrollWidth: document.body.scrollWidth,
              viewportWidth: document.documentElement.clientWidth,
              bodyText: document.body.innerText,
              logo: rect(".brand-cluster"),
              controls: rect(".header-controls"),
              summary: rectNode(summary),
              summaryGeometry: {
                display: summaryStyle.display,
                gridTemplateColumns: summaryStyle.gridTemplateColumns,
                padding: summaryStyle.padding,
                columnGap: summaryStyle.columnGap,
                minWidth: summaryStyle.minWidth
              },
              pickerMenuBadge: document.querySelector(".picker-option.selected")?.dataset.selectedLabel || "",
              rows: document.querySelectorAll("#resultsBody tr").length
            };
          });

          assert(state.lang === language, `${width}/${theme}/${language}/${mode}: html.lang`);
          assert(state.dir === "ltr", `${width}/${theme}/${language}/${mode}: html.dir`);
          assert(state.theme === theme, `${width}/${theme}/${language}/${mode}: theme`);
          assert(state.bodyScrollWidth <= state.viewportWidth, `${width}/${theme}/${language}/${mode}: horizontal overflow`);
          assert(!overlap(state.logo, state.controls), `${width}/${theme}/${language}/${mode}: header overlap`);
          assert(!state.bodyText.includes("undefined"), `${width}/${theme}/${language}/${mode}: undefined visible`);
          assert(!state.bodyText.includes("⟦"), `${width}/${theme}/${language}/${mode}: technical key visible`);
          assert(state.summary.width > 0 && state.summary.height > 0, `${width}/${theme}/${language}/${mode}: selected pallet summary`);
          assert(state.pickerMenuBadge.length > 0, `${width}/${theme}/${language}/${mode}: selected picker label`);
          assert(runtimeErrors.length === 0, `${width}/${theme}/${language}/${mode}: ${runtimeErrors.join("; ")}`);

          const record = { width, theme, language, mode, ...state.summaryGeometry };
          results.push(record);

          if (
            ["de", "es", "fr", "pt", "nl"].includes(language) &&
            (
              (width === 1440 && theme === "light" && mode === "mixed") ||
              (width === 1440 && theme === "dark" && mode === "single") ||
              (width === 320 && theme === "light" && mode === "single") ||
              (width === 320 && theme === "dark" && mode === "single")
            )
          ) {
            await page.screenshot({
              path: path.join(outputDir, `${width}-${theme}-${language}-${mode}.png`),
              fullPage: true
            });
          }
          await context.close();
        }
      }
    }
  }

  for (const language of ["de", "es", "fr", "pt", "nl"]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: localeByLanguage[language],
      colorScheme: "light"
    });
    await context.addInitScript(selectedLanguage => {
      localStorage.setItem("loadcomposer.language", selectedLanguage);
      localStorage.setItem("loadcomposer.theme", "light");
    }, language);
    const page = await context.newPage();
    await page.goto(standaloneUrl, { waitUntil: "load" });
    await page.waitForFunction(() => (
      document.documentElement.dataset.i18nReady === "true" &&
      document.querySelectorAll("#resultsBody tr").length > 0
    ));

    await page.click("#singlePalletGroup [data-action='togglePicker']");
    await page.locator("#singlePalletGroup .pallet-picker").screenshot({
      path: path.join(outputDir, `${language}-pallet-menu-open.png`)
    });
    await page.keyboard.press("Escape");

    await page.click("#languageToggle");
    await page.locator("#languageMenu").screenshot({
      path: path.join(outputDir, `${language}-language-menu-open.png`)
    });
    await page.keyboard.press("Escape");

    await page.locator("main > section.card").nth(1).screenshot({
      path: path.join(outputDir, `${language}-results-section.png`)
    });
    await page.selectOption("#printView", "side");
    await page.locator(".drawcard").screenshot({
      path: path.join(outputDir, `${language}-preview-side.png`)
    });
    await page.selectOption("#printView", "ramp");
    await page.locator(".drawcard").screenshot({
      path: path.join(outputDir, `${language}-preview-ramp.png`)
    });
    await page.fill("#quantity", "0");
    await page.waitForFunction(() => (
      !document.getElementById("formValidationMessage").classList.contains("hidden")
    ));
    await page.locator("main > section.card").first().screenshot({
      path: path.join(outputDir, `${language}-invalid-input.png`)
    });
    await context.close();

    const mobileContext = await browser.newContext({
      viewport: { width: 320, height: 568 },
      locale: localeByLanguage[language],
      colorScheme: "light"
    });
    await mobileContext.addInitScript(selectedLanguage => {
      localStorage.setItem("loadcomposer.language", selectedLanguage);
      localStorage.setItem("loadcomposer.theme", "light");
    }, language);
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(standaloneUrl, { waitUntil: "load" });
    await mobilePage.waitForFunction(() => (
      document.documentElement.dataset.i18nReady === "true" &&
      document.querySelectorAll("#resultsBody tr").length > 0
    ));
    await mobilePage.click("#languageToggle");
    const mobileMenu = await mobilePage.evaluate(() => {
      const box = document.getElementById("languageMenu").getBoundingClientRect();
      const options = Array.from(document.querySelectorAll("#languageMenu .language-option"));
      return {
        left: box.left,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
        options: options.length,
        minTarget: Math.min(...options.map(option => option.getBoundingClientRect().height))
      };
    });
    assert(mobileMenu.left >= 0, `${language}: mobile language menu left bound`);
    assert(mobileMenu.right <= mobileMenu.viewportWidth, `${language}: mobile language menu right bound`);
    assert(mobileMenu.top >= 0, `${language}: mobile language menu top bound`);
    assert(mobileMenu.bottom <= mobileMenu.viewportHeight, `${language}: mobile language menu bottom bound`);
    assert(mobileMenu.options === 8, `${language}: mobile language option count`);
    assert(mobileMenu.minTarget >= 44, `${language}: mobile language touch targets`);
    await mobileContext.close();
  }

  for (const width of widths) {
    for (const language of languages) {
      for (const mode of modes) {
        const light = results.find(item => (
          item.width === width &&
          item.theme === "light" &&
          item.language === language &&
          item.mode === mode
        ));
        const dark = results.find(item => (
          item.width === width &&
          item.theme === "dark" &&
          item.language === language &&
          item.mode === mode
        ));
        for (const key of ["display", "gridTemplateColumns", "padding", "columnGap", "minWidth"]) {
          assert(light[key] === dark[key], `${width}/${language}/${mode}: selected-pallet ${key} differs by theme`);
        }
      }
    }
  }

  const payload = {
    version: "1.2.0",
    generatedAt: new Date().toISOString(),
    scenarios: results.length,
    screenshots: fs.readdirSync(outputDir).sort(),
    status: "PASS",
    results
  };
  fs.writeFileSync(resultPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`visual/responsive suite: ${results.length}/${results.length} PASS`);
} finally {
  await browser.close();
}
