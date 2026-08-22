import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { launchBrowser } from "./browser-runtime.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const CURRENT_URL = pathToFileURL(
  path.join(ROOT, "site/downloads/loadcomposer-v1.3.0-standalone.html")
).href;
const BASELINE_URL = pathToFileURL(
  path.join(
    ROOT,
    "tests/fixtures/baseline-v1.0.0-rc.3",
    "loadcomposer-v1.0.0-rc.3-standalone.html"
  )
).href;
const EVIDENCE_DIR = path.join(ROOT, "visual-evidence-v1.3.0");
const RESULT_PATH = path.join(ROOT, "visual-refinements-results-v1.3.0.json");
const LANGUAGES = ["it", "en", "de", "es", "fr", "pt", "nl"];
const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1440, height: 900 }
];
const WIDTHS = VIEWPORTS.map(viewport => viewport.width);
const THEMES = ["light", "dark"];
const LOCALES = {
  it: "it-IT",
  en: "en-GB",
  de: "de-DE",
  es: "es-ES",
  fr: "fr-FR",
  pt: "pt-PT",
  nl: "nl-NL"
};
const BW_LABELS = {
  it: "Bianco e nero",
  en: "Black & white",
  de: "Schwarzweiß",
  es: "Blanco y negro",
  fr: "Noir et blanc",
  pt: "Preto e branco",
  nl: "Zwart-wit"
};
const ORIENTATION_CASES = [
  { id: "euro", length: 1200, width: 800, square: false },
  { id: "industrial", length: 1200, width: 1000, square: false },
  { id: "north-american", length: 1219, width: 1016, square: false },
  { id: "custom", length: 1400, width: 800, square: false },
  { id: "reversed-custom", length: 800, width: 1400, square: false },
  { id: "near-square", length: 1200, width: 1199, square: false },
  { id: "elongated", length: 2400, width: 400, square: false },
  { id: "square", length: 1100, width: 1100, square: true },
];
const OBSOLETE_ORIENTATION_KEYS = [
  "rotation.alongTitle",
  "rotation.acrossTitle",
  "rotation.footnote",
  "rotation.diagramAria",
  "rotation.locked"
];
const OBSOLETE_TEXT = Object.fromEntries(LANGUAGES.map(language => {
  const catalog = JSON.parse(fs.readFileSync(
    path.join(ROOT, "tests/fixtures/baseline-v1.0.0-rc.3", "lang", `${language}.json`),
    "utf8"
  ));
  return [
    language,
    OBSOLETE_ORIENTATION_KEYS
      .map(key => catalog.translations[key])
      .filter(Boolean)
  ];
}));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function viewportHeight(width) {
  return width <= 390 ? 900 : width === 768 ? 1100 : 1000;
}

function parseRgb(value) {
  const match = String(value).match(/rgba?\(([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (!match) throw new Error(`Unsupported colour: ${value}`);
  return match.slice(1, 4).map(Number);
}

function luminance(rgb) {
  const channels = rgb.map(value => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground, background) {
  const a = luminance(parseRgb(foreground));
  const b = luminance(parseRgb(background));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

async function openPage(browser, {
  url = CURRENT_URL,
  language = "it",
  theme = "light",
  width = 1440,
  hasTouch = false
} = {}) {
  const context = await browser.newContext({
    viewport: { width, height: viewportHeight(width) },
    locale: LOCALES[language],
    colorScheme: theme,
    hasTouch
  });
  await context.addInitScript(({ selectedLanguage, selectedTheme }) => {
    localStorage.setItem("loadcomposer.language", selectedLanguage);
    localStorage.setItem("loadcomposer.theme", selectedTheme);
  }, { selectedLanguage: language, selectedTheme: theme });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(expectedLanguage => (
    document.documentElement.dataset.i18nReady === "true" &&
    document.documentElement.lang === expectedLanguage &&
    document.querySelectorAll("#resultsBody tr").length > 0
  ), language);
  return { context, page, errors };
}

async function optionStyle(page, selector) {
  return page.$eval(selector, option => {
    const primary = option.querySelector("strong");
    const secondary = option.querySelector("small");
    const style = getComputedStyle(option);
    return {
      background: style.backgroundColor,
      border: style.borderColor,
      color: style.color,
      outlineWidth: style.outlineWidth,
      primary: getComputedStyle(primary).color,
      secondary: getComputedStyle(secondary).color
    };
  });
}

function assertReadable(style, label) {
  assert(
    contrast(style.primary, style.background) >= 4.5,
    `${label}: primary text contrast below 4.5:1`
  );
  assert(
    contrast(style.secondary, style.background) >= 4.5,
    `${label}: secondary text contrast below 4.5:1`
  );
  assert(
    contrast(style.border, style.background) >= 3,
    `${label}: interactive border contrast below 3:1`
  );
}

async function verifyPicker(browser, records) {
  for (const language of LANGUAGES) {
    for (const width of WIDTHS) {
      const { context, page, errors } = await openPage(browser, {
        language,
        theme: "light",
        width
      });
      try {
        await page.click("#singlePalletGroup [data-action='togglePicker']");
        const selected = "#singlePalletGroup .picker-option.selected";
        const normal =
          "#singlePalletGroup .picker-option[data-preset-id='industrial']";
        const normalState = await optionStyle(page, normal);

        await page.hover(normal);
        await page.waitForTimeout(180);
        const hoverState = await optionStyle(page, normal);
        assertReadable(hoverState, `${language}/${width}/hover`);

        await page.mouse.move(0, 0);
        await page.focus(selected);
        await page.keyboard.press("Tab");
        await page.waitForTimeout(180);
        const focusState = await optionStyle(page, normal);
        assertReadable(focusState, `${language}/${width}/focus`);
        assert(
          Number.parseFloat(focusState.outlineWidth) >= 3,
          `${language}/${width}: keyboard focus is not clearly visible`
        );

        const selectedState = await optionStyle(page, selected);
        assertReadable(selectedState, `${language}/${width}/selected`);
        await page.hover(selected);
        await page.waitForTimeout(180);
        const selectedHoverState = await optionStyle(page, selected);
        assertReadable(selectedHoverState, `${language}/${width}/selected-hover`);

        assert(
          normalState.background !== hoverState.background,
          `${language}/${width}: normal and hover states are not distinct`
        );
        assert(
          hoverState.background !== focusState.background ||
            hoverState.border !== focusState.border,
          `${language}/${width}: hover and keyboard focus are not distinct`
        );
        assert(
          selectedState.background !== selectedHoverState.background ||
            selectedState.border !== selectedHoverState.border,
          `${language}/${width}: selected and selected-hover are not distinct`
        );

        const layout = await page.$eval(
          "#singlePalletGroup [data-role='pickerMenu']",
          menu => ({
            scrollWidth: menu.scrollWidth,
            clientWidth: menu.clientWidth,
            options: [...menu.querySelectorAll(".picker-option")].map(option => ({
              scrollWidth: option.scrollWidth,
              clientWidth: option.clientWidth,
              lines: Math.round(
                option.querySelector("small").getBoundingClientRect().height /
                Number.parseFloat(getComputedStyle(option.querySelector("small")).lineHeight)
              )
            }))
          })
        );
        assert(
          layout.scrollWidth <= layout.clientWidth + 1,
          `${language}/${width}: picker menu overflows horizontally`
        );
        assert(
          layout.options.every(option => option.scrollWidth <= option.clientWidth + 1),
          `${language}/${width}: long picker text overflows`
        );
        assert(
          layout.options.some(option => option.lines >= 1),
          `${language}/${width}: picker descriptions were not rendered`
        );
        assert(errors.length === 0, `${language}/${width}: ${errors.join(" | ")}`);
        records.push({ type: "picker", language, width, status: "PASS" });
      } finally {
        await context.close();
      }
    }
  }

  for (const language of LANGUAGES) {
    const { context, page, errors } = await openPage(browser, {
      language,
      theme: "light",
      width: 390,
      hasTouch: true
    });
    try {
      await page.tap("#singlePalletGroup [data-action='togglePicker']");
      await page.tap("#singlePalletGroup .picker-option[data-preset-id='industrial']");
      const selectedId = await page.$eval(
        "#singlePalletGroup [data-field='presetId']",
        input => input.value
      );
      assert(selectedId === "industrial", `${language}: touch selection failed`);
      assert(errors.length === 0, `${language}/touch: ${errors.join(" | ")}`);
      records.push({ type: "picker-touch", language, width: 390, status: "PASS" });
    } finally {
      await context.close();
    }
  }
}

async function verifyBlackAndWhite(browser, records) {
  for (const language of LANGUAGES) {
    const { context, page, errors } = await openPage(browser, {
      language,
      theme: "light",
      width: 390,
      hasTouch: true
    });
    try {
      const initial = await page.evaluate(() => ({
        checked: document.getElementById("printBw").checked,
        label: document.querySelector(".print-toggle span").textContent.trim(),
        title: document.querySelector(".print-toggle").title,
        canvas: document.getElementById("layoutCanvas").toDataURL()
      }));
      assert(initial.checked, `${language}: black-and-white mode is not enabled by default`);
      assert(initial.label === BW_LABELS[language], `${language}: unexpected B/W label`);
      assert(
        initial.title === windowString(await page.evaluate(() => i18n.t("preview.bwTitle"))),
        `${language}: localized B/W help title mismatch`
      );

      await page.tap(".print-toggle");
      await page.waitForTimeout(30);
      const colorCanvas = await page.$eval("#layoutCanvas", canvas => canvas.toDataURL());
      assert(
        colorCanvas !== initial.canvas,
        `${language}: preview does not change between black-and-white and colour`
      );

      await page.focus("#printBw");
      await page.keyboard.press("Space");
      assert(
        await page.isChecked("#printBw"),
        `${language}: keyboard did not reactivate black-and-white mode`
      );
      assert(errors.length === 0, `${language}/bw: ${errors.join(" | ")}`);
      records.push({ type: "black-and-white", language, width: 390, status: "PASS" });
    } finally {
      await context.close();
    }
  }
}

function windowString(value) {
  return String(value);
}

function compactDigits(value) {
  return String(value).replace(/\D/g, "");
}

async function configureOrientation(page, dimensions) {
  await page.evaluate(({ length, width }) => {
    const group = document.getElementById("singlePalletGroup");
    const preset = group.querySelector("[data-field='presetId']");
    const lengthInput = group.querySelector("[data-field='length']");
    const widthInput = group.querySelector("[data-field='width']");
    const rotate = group.querySelector("[data-field='allowRotate']");
    preset.value = "custom";
    lengthInput.value = String(length);
    widthInput.value = String(width);
    rotate.checked = false;
    updateGroupVisuals(group);
  }, dimensions);
}

async function verifyOrientationAndFooter(browser, records) {
  for (const language of LANGUAGES) {
    for (const theme of THEMES) {
      for (const width of WIDTHS) {
        const viewport = VIEWPORTS.find(item => item.width === width);
        const { context, page, errors } = await openPage(browser, {
          language,
          theme,
          width
        });
        try {
          await page.setViewportSize(viewport);
          const footer = await page.evaluate(() => {
            const link = document.querySelector(".github-link");
            const note = document.querySelector(".footer-note");
            const footerNode = document.querySelector(".footer");
            const row = document.querySelector(".github-row");
            const linkRect = link.getBoundingClientRect();
            const footerRect = footerNode.getBoundingClientRect();
            return {
              note: note.textContent.trim(),
              expectedNote: i18n.t("footer.note"),
              href: link.href,
              target: link.target,
              rel: link.rel,
              title: link.title,
              expectedTitle: i18n.t("footer.githubTitle"),
              aria: link.getAttribute("aria-label"),
              expectedAria: i18n.t("footer.githubAria"),
              svgCount: link.querySelectorAll("svg").length,
              iconText: link.innerText.trim(),
              rowDisplay: getComputedStyle(row).display,
              rowJustify: getComputedStyle(row).justifyContent,
              centerDelta: Math.abs(
                (linkRect.left + linkRect.width / 2) -
                (footerRect.left + footerRect.width / 2)
              ),
              noteAlign: getComputedStyle(note).textAlign
            };
          });
          assert(footer.note === footer.expectedNote, `${language}/${theme}/${width}: footer text`);
          assert(
            footer.href === "https://github.com/LoadComposer/loadcomposer",
            `${language}/${theme}/${width}: GitHub URL`
          );
          assert(footer.target === "_blank", `${language}/${theme}/${width}: GitHub target`);
          assert(
            footer.rel.split(/\s+/).includes("noopener") &&
              footer.rel.split(/\s+/).includes("noreferrer"),
            `${language}/${theme}/${width}: GitHub rel`
          );
          assert(footer.title === footer.expectedTitle, `${language}/${theme}/${width}: GitHub title`);
          assert(footer.aria === footer.expectedAria, `${language}/${theme}/${width}: GitHub aria`);
          assert(footer.svgCount === 1 && footer.iconText === "", `${language}: icon-only GitHub link`);
          assert(
            footer.rowDisplay === "flex" && footer.rowJustify === "center",
            `${language}/${theme}/${width}: GitHub row is not centred`
          );
          assert(
            footer.centerDelta <= 1,
            `${language}/${theme}/${width}: GitHub icon is ${footer.centerDelta}px off-centre`
          );
          assert(
            footer.noteAlign === "start" || footer.noteAlign === "left",
            `${language}/${theme}/${width}: footer note was centred`
          );

          await page.focus(".github-link");
          const focus = await page.$eval(".github-link", link => {
            const style = getComputedStyle(link);
            return {
              outlineWidth: Number.parseFloat(style.outlineWidth),
              width: link.getBoundingClientRect().width,
              height: link.getBoundingClientRect().height
            };
          });
          assert(focus.outlineWidth >= 3, `${language}/${theme}/${width}: GitHub focus`);
          assert(focus.width >= 44 && focus.height >= 44, `${language}/${theme}/${width}: GitHub hit area`);

          for (const dimensions of ORIENTATION_CASES) {
            await configureOrientation(page, dimensions);
            const state = await page.evaluate(() => {
              const panel = document.querySelector("#singlePalletGroup [data-role='orientationPanel']");
              const square = document.querySelector("#singlePalletGroup [data-role='squareNote']");
              const cards = [...panel.querySelectorAll(".orientation-card")];
              return {
                panelHidden: panel.classList.contains("hidden"),
                squareHidden: square.classList.contains("hidden"),
                helpBlocks: panel.querySelectorAll(".rotation-help").length,
                panelText: panel.textContent.trim(),
                panelHeight: panel.getBoundingClientRect().height,
                cardHeights: cards.map(card => card.getBoundingClientRect().height),
                expected: {
                  forkShort: i18n.t("rotation.forkShort"),
                  forkLong: i18n.t("rotation.forkLong")
                },
                titles: [...panel.querySelectorAll(".orientation-title")].map(node => ({
                  strong: node.querySelector("strong")?.textContent.trim() || "",
                  small: node.querySelector("small")?.textContent.trim() || ""
                })),
                diagrams: [...panel.querySelectorAll(".orientation-diagram svg")].map(svg => {
                  const rect = svg.querySelector(".orientation-pallet-base");
                  const indicator = svg.querySelector(".orientation-entry-indicator");
                  const chevrons = [...svg.querySelectorAll(".orientation-entry-chevron")];
                  const boardNodes = [...svg.querySelectorAll(".orientation-pallet-board")];
                  const firstBoard = boardNodes[0];
                  const secondBoard = boardNodes[1];
                  const box = svg.getBoundingClientRect();
                  const host = svg.parentElement.getBoundingClientRect();
                  const viewBox = svg.viewBox.baseVal;
                  const svgScale = Math.min(
                    box.width / viewBox.width,
                    box.height / viewBox.height
                  );
                  const palletGroup = svg.querySelector(".orientation-pallet");
                  const palletBox = rect.getBoundingClientRect();
                  const hostStyle = getComputedStyle(svg.parentElement);
                  const card = svg.closest(".orientation-card");
                  const cardStyle = getComputedStyle(card);
                  const indicatorBox = indicator?.getBBox();
                  const indicatorClient = indicator?.getBoundingClientRect();
                  const chevronStyle = chevrons[0]
                    ? getComputedStyle(chevrons[0])
                    : null;
                  const chevronStrokeWidth = Number.parseFloat(
                    chevronStyle?.strokeWidth || "0"
                  );
                  const chevronBoxes = chevrons.map(chevron => chevron.getBBox());
                  const dimensionLabels = [...svg.querySelectorAll(
                    ".orientation-dimension-label"
                  )].map(label => {
                    const labelBox = label.getBoundingClientRect();
                    return {
                      text: label.textContent.trim(),
                      width: labelBox.width,
                      height: labelBox.height,
                      fontWeight: getComputedStyle(label).fontWeight
                    };
                  });
                  return {
                    role: svg.getAttribute("role"),
                    labelledBy: svg.getAttribute("aria-labelledby"),
                    title: svg.querySelector("title")?.textContent.trim() || "",
                    description: svg.querySelector("desc")?.textContent.trim() || "",
                    orientation: svg.dataset.orientation,
                    entrySide: svg.dataset.entrySide,
                    linkedInput: svg.closest("label")?.querySelector(
                      "[data-field='lockedOrientation']"
                    )?.value || "",
                    visibleText: [...svg.querySelectorAll("text")].map(node => node.textContent.trim()),
                    rasterImages: svg.querySelectorAll("image").length,
                    filters: svg.querySelectorAll("filter").length,
                    gradients: svg.querySelectorAll("linearGradient, radialGradient").length,
                    pallet: {
                      width: Number(svg.dataset.palletWidth),
                      height: Number(svg.dataset.palletHeight),
                      screenWidth: palletBox.width,
                      screenHeight: palletBox.height,
                      hostWidth: host.width,
                      hostHeight: host.height,
                      transform: palletGroup?.getAttribute("transform") || ""
                    },
                    boards: svg.querySelectorAll(".orientation-pallet-board").length,
                    runners: svg.querySelectorAll(".orientation-pallet-runner").length,
                    grain: svg.querySelectorAll(".orientation-pallet-grain").length,
                    firstBoard: {
                      x: Number(firstBoard?.getAttribute("x")),
                      y: Number(firstBoard?.getAttribute("y")),
                      width: Number(firstBoard?.getAttribute("width")),
                      height: Number(firstBoard?.getAttribute("height"))
                    },
                    secondBoard: {
                      x: Number(secondBoard?.getAttribute("x")),
                      y: Number(secondBoard?.getAttribute("y"))
                    },
                    boardSignature: boardNodes.map(board => [
                      board.getAttribute("x"),
                      board.getAttribute("y"),
                      board.getAttribute("width"),
                      board.getAttribute("height")
                    ]),
                    dimensionCaps: svg.querySelectorAll(".orientation-dimension-cap").length,
                    dimensionMarkers: svg.querySelectorAll(
                      ".orientation-dimension[marker-start], .orientation-dimension[marker-end]"
                    ).length,
                    dimensionLabels,
                    hostStyle: {
                      background: hostStyle.backgroundColor,
                      borderTopWidth: Number.parseFloat(hostStyle.borderTopWidth),
                      borderRadius: Number.parseFloat(hostStyle.borderRadius)
                    },
                    card: {
                      selected: Boolean(card.querySelector(
                        "[data-field='lockedOrientation']"
                      )?.checked),
                      background: cardStyle.backgroundColor
                    },
                    indicator: {
                      ariaHidden: indicator?.getAttribute("aria-hidden") || "",
                      chevronCount: chevrons.length,
                      oldArrowCount: svg.querySelectorAll(
                        ".orientation-entry-arrow, .orientation-entry-arrowhead"
                      ).length,
                      markerCount: svg.querySelectorAll("marker").length,
                      paths: chevrons.map(chevron => chevron.getAttribute("d") || ""),
                      stroke: chevronStyle?.stroke || "",
                      strokeWidth: chevronStrokeWidth * svgScale,
                      linecap: chevronStyle?.strokeLinecap || "",
                      linejoin: chevronStyle?.strokeLinejoin || "",
                      fill: chevronStyle?.fill || "",
                      screenWidth: indicatorBox
                        ? (indicatorBox.width + chevronStrokeWidth) * svgScale
                        : 0,
                      screenHeight: indicatorBox
                        ? (indicatorBox.height + chevronStrokeWidth) * svgScale
                        : 0,
                      screenGap: chevronBoxes.length === 2
                        ? (
                          Math.abs(chevronBoxes[1].y - chevronBoxes[0].y) /
                            Math.sqrt(2) -
                          chevronStrokeWidth
                        ) * svgScale
                        : 0,
                      centerOffset: indicatorBox
                        ? Math.abs(
                          indicatorBox.x + indicatorBox.width / 2 - 121
                        ) * svgScale
                        : Number.POSITIVE_INFINITY,
                      palletGap: indicatorClient
                        ? indicatorClient.top - palletBox.bottom
                        : -1,
                      bottomClearance: indicatorClient
                        ? box.bottom - indicatorClient.bottom
                        : -1
                    },
                    contained:
                      box.left >= host.left - 1 &&
                      box.right <= host.right + 1 &&
                      box.top >= host.top - 1 &&
                      box.bottom <= host.bottom + 1
                  };
                })
              };
            });

            if (dimensions.square) {
              assert(state.panelHidden, `${language}/${theme}/${width}/square: panel should be hidden`);
              assert(!state.squareHidden, `${language}/${theme}/${width}/square: square note missing`);
              continue;
            }

            assert(!state.panelHidden, `${language}/${theme}/${width}/${dimensions.id}: panel hidden`);
            assert(state.diagrams.length === 2, `${language}/${theme}/${width}/${dimensions.id}: diagrams`);
            assert(state.helpBlocks === 0, `${language}/${dimensions.id}: obsolete help below cards`);
            assert(
              OBSOLETE_TEXT[language].every(text => !state.panelText.includes(text)),
              `${language}/${dimensions.id}: obsolete orientation wording is still visible`
            );
            state.diagrams.forEach((diagram, index) => {
              const along = index === 0 ? dimensions.length : dimensions.width;
              const entry = index === 0 ? dimensions.width : dimensions.length;
              const entrySide = entry === Math.min(dimensions.length, dimensions.width)
                ? "short"
                : "long";
              const expectedOrientation = index === 0 ? "normal" : "rotated";
              const expectedTitle = entrySide === "short"
                ? "rotation.forkShort"
                : "rotation.forkLong";
              const labels = state.titles[index];
              assert(diagram.role === "img", `${dimensions.id}/${index}: role`);
              assert(
                diagram.labelledBy?.split(/\s+/).length === 2 &&
                  diagram.title &&
                  diagram.description,
                `${dimensions.id}/${index}: accessible title and description`
              );
              assert(
                diagram.orientation === expectedOrientation &&
                  diagram.linkedInput === expectedOrientation,
                `${dimensions.id}/${index}: SVG is not associated with its radio option`
              );
              assert(diagram.entrySide === entrySide, `${dimensions.id}/${index}: entry side`);
              assert(
                labels.strong === (
                  expectedTitle === "rotation.forkShort"
                    ? state.expected.forkShort
                    : state.expected.forkLong
                ),
                `${language}/${dimensions.id}/${index}: operational title`
              );
              assert(
                compactDigits(labels.small) === String(entry),
                `${language}/${dimensions.id}/${index}: entry measurement`
              );
              assert(
                compactDigits(diagram.description) ===
                  `${dimensions.length}${dimensions.width}${entry}`,
                `${language}/${dimensions.id}/${index}: localized accessible description`
              );
              assert(diagram.rasterImages === 0, `${dimensions.id}/${index}: raster image found`);
              assert(
                diagram.filters === 0 && diagram.gradients === 0,
                `${dimensions.id}/${index}: forbidden SVG effect`
              );
              assert(
                diagram.boards === 6 && diagram.runners === 3,
                `${dimensions.id}/${index}: pallet structure`
              );
              assert(diagram.grain <= 3, `${dimensions.id}/${index}: excessive wood detail`);
              assert(diagram.dimensionCaps === 4, `${dimensions.id}/${index}: dimension terminals`);
              assert(
                diagram.dimensionMarkers === 0,
                `${dimensions.id}/${index}: dimensions use large arrow markers`
              );
              assert(
                diagram.visibleText.length === 2 &&
                  diagram.visibleText.every(text => /^\d[\d.,\s]* mm$/.test(text)),
                `${language}/${dimensions.id}/${index}: forbidden visible diagram label`
              );
              assert(
                diagram.indicator.ariaHidden === "true" &&
                  diagram.indicator.chevronCount === 2 &&
                  diagram.indicator.oldArrowCount === 0 &&
                  diagram.indicator.markerCount === 0,
                `${dimensions.id}/${index}: double-chevron structure`
              );
              assert(
                diagram.indicator.paths.length === 2 &&
                  diagram.indicator.paths.every(path => /^M .+ L .+ L .+$/.test(path)) &&
                  diagram.indicator.paths[0] !== diagram.indicator.paths[1],
                `${dimensions.id}/${index}: two distinct simple chevron paths`
              );
              assert(
                diagram.indicator.screenWidth >= 30 &&
                  diagram.indicator.screenWidth <= 36 &&
                  diagram.indicator.screenHeight >= 26 &&
                  diagram.indicator.screenHeight <= 32 &&
                  diagram.indicator.strokeWidth >= 4 &&
                  diagram.indicator.strokeWidth <= 5 &&
                  diagram.indicator.screenGap >= 4.8 &&
                  diagram.indicator.screenGap <= 7,
                `${dimensions.id}/${index}: double-chevron desktop/mobile proportions ` +
                  JSON.stringify(diagram.indicator)
              );
              assert(
                diagram.indicator.linecap === "round" &&
                  diagram.indicator.linejoin === "round" &&
                  diagram.indicator.fill === "none" &&
                  diagram.indicator.centerOffset <= 1 &&
                  diagram.indicator.palletGap >= 3 &&
                  diagram.indicator.bottomClearance >= 3 &&
                  contrast(
                    diagram.indicator.stroke,
                    diagram.card.background
                  ) >= 3,
                `${dimensions.id}/${index}: centred and separated double chevron`
              );
              const representedRatio = diagram.pallet.width / diagram.pallet.height;
              const expectedRatio = entry / along;
              assert(
                Math.abs(representedRatio - expectedRatio) < 0.02,
                `${dimensions.id}/${index}: pallet proportions`
              );
              assert(
                index === 0
                  ? !diagram.pallet.transform.includes("rotate(90)")
                  : diagram.pallet.transform.includes("rotate(90)"),
                `${dimensions.id}/${index}: pallet group did not rotate by 90 degrees`
              );
              assert(
                diagram.dimensionLabels.length === 2 &&
                  diagram.dimensionLabels.every(label => (
                    label.height >= 11.5 &&
                    Number.parseInt(label.fontWeight, 10) >= 700
                  )),
                `${language}/${theme}/${width}/${dimensions.id}/${index}: dimension labels`
              );
              assert(
                diagram.hostStyle.background === "rgba(0, 0, 0, 0)" &&
                  diagram.hostStyle.borderTopWidth === 0 &&
                  diagram.hostStyle.borderRadius === 0,
                `${language}/${theme}/${width}/${dimensions.id}/${index}: inner frame remains`
              );
              assert(diagram.contained, `${language}/${theme}/${width}/${dimensions.id}: overflow`);
            });
            assert(
              JSON.stringify(state.diagrams[0].boardSignature) ===
                JSON.stringify(state.diagrams[1].boardSignature),
              `${language}/${theme}/${width}/${dimensions.id}: the two cards use different pallet drawings`
            );
            assert(
              state.diagrams.filter(diagram => diagram.card.selected).length === 1,
              `${language}/${theme}/${width}/${dimensions.id}: selected/unselected card state`
            );
            assert(
              Math.abs(
                state.diagrams[0].indicator.screenWidth -
                state.diagrams[1].indicator.screenWidth
              ) <= 0.5 &&
                Math.abs(
                  state.diagrams[0].indicator.screenHeight -
                  state.diagrams[1].indicator.screenHeight
                ) <= 0.5 &&
                Math.abs(
                  state.diagrams[0].indicator.screenGap -
                  state.diagrams[1].indicator.screenGap
                ) <= 0.5,
              `${language}/${theme}/${width}/${dimensions.id}: chevron proportions differ`
            );
          }

          assert(errors.length === 0, `${language}/${theme}/${width}: ${errors.join(" | ")}`);
          records.push({
            type: "orientation-footer",
            language,
            theme,
            width,
            cases: ORIENTATION_CASES.length,
            status: "PASS"
          });
        } finally {
          await context.close();
        }
      }
    }
  }
}

async function verifyPrintExclusion(browser, records) {
  for (const language of LANGUAGES) {
    const { context, page, errors } = await openPage(browser, {
      language,
      theme: "light",
      width: 1440
    });
    try {
      const labels = await page.evaluate(() => {
        const short = {
          presetId: "eur",
          identifier: "",
          length: 1200,
          width: 800,
          height: 1000,
          quantity: 1,
          rotationMode: "locked",
          lockedOrientation: "normal"
        };
        const long = { ...short, lockedOrientation: "rotated" };
        const auto = { ...short, rotationMode: "auto" };
        const reversedShort = {
          presetId: "custom",
          customName: "Custom",
          identifier: "",
          length: 800,
          width: 1400,
          height: 1000,
          quantity: 1,
          rotationMode: "locked",
          lockedOrientation: "rotated"
        };
        const legend = buildPrintLegend({
          mode: "mixed",
          input: { types: [short, long, auto, reversedShort] }
        }, false);
        return {
          short: rotationLabel(short),
          long: rotationLabel(long),
          auto: rotationLabel(auto),
          reversedShort: rotationLabel(reversedShort),
          expectedShort: i18n.t("rotation.lockedShort", { entry: formatLength(800) }),
          expectedLong: i18n.t("rotation.lockedLong", { entry: formatLength(1200) }),
          expectedAuto: i18n.t("rotation.allowed"),
          legend
        };
      });
      assert(labels.short === labels.expectedShort, `${language}: short-side print label`);
      assert(labels.long === labels.expectedLong, `${language}: long-side print label`);
      assert(labels.reversedShort === labels.expectedShort, `${language}: reversed dimensions`);
      assert(labels.auto === labels.expectedAuto, `${language}: rotation-allowed label`);
      assert(labels.legend.includes(labels.expectedShort), `${language}: mixed legend short side`);
      assert(labels.legend.includes(labels.expectedLong), `${language}: mixed legend long side`);
      assert(labels.legend.includes(labels.expectedAuto), `${language}: mixed legend rotation allowed`);
      assert(
        OBSOLETE_TEXT[language].every(text => !labels.legend.includes(text)),
        `${language}: obsolete wording in print legend`
      );

      const printed = await page.evaluate(() => {
        let html = "";
        const fakeWindow = {
          document: {
            open() {},
            write(value) {
              html += value;
            },
            close() {}
          },
          focus() {},
          print() {}
        };
        const nativeOpen = window.open;
        window.open = () => fakeWindow;
        try {
          printCurrentLayout();
          return html;
        } finally {
          window.open = nativeOpen;
        }
      });
      assert(printed.includes("<!DOCTYPE html>"), `${language}: print HTML not generated`);
      assert(!/github/i.test(printed), `${language}: GitHub appears in operational print`);
      assert(!printed.includes("github-link"), `${language}: GitHub class appears in print`);
      assert(!printed.includes("footer-links"), `${language}: legal footer links appear in print`);
      assert(
        OBSOLETE_TEXT[language].every(text => !printed.includes(text)),
        `${language}: obsolete orientation wording in print HTML`
      );
      assert(errors.length === 0, `${language}/print: ${errors.join(" | ")}`);
      records.push({ type: "print-github-exclusion", language, status: "PASS" });
    } finally {
      await context.close();
    }
  }
}

async function measureOrientation(browser, {
  url,
  width,
  height,
  theme,
  dimensions
}) {
  const { context, page, errors } = await openPage(browser, {
    url,
    language: "it",
    theme,
    width
  });
  try {
    await page.setViewportSize({ width, height });
    await configureOrientation(page, dimensions);
    const metrics = await page.evaluate(() => {
      const panel = document.querySelector(
        "#singlePalletGroup [data-role='orientationPanel']"
      );
      const cards = [...panel.querySelectorAll(".orientation-card")];
      const diagrams = [...panel.querySelectorAll(".orientation-diagram")];
      return {
        panelHeight: panel.getBoundingClientRect().height,
        cardHeights: cards.map(card => card.getBoundingClientRect().height),
        diagrams: diagrams.map(host => {
          const svg = host.querySelector("svg");
          const pallet = svg.querySelector(".orientation-pallet-base");
          const indicator = svg.querySelector(".orientation-entry-indicator");
          const chevrons = [...svg.querySelectorAll(".orientation-entry-chevron")];
          const oldArrow = svg.querySelector(".orientation-entry-arrow");
          const svgBox = svg.getBoundingClientRect();
          const hostBox = host.getBoundingClientRect();
          const palletBox = pallet.getBoundingClientRect();
          const viewBox = svg.viewBox.baseVal;
          const scale = Math.min(
            svgBox.width / viewBox.width,
            svgBox.height / viewBox.height
          );
          return {
            hostWidth: hostBox.width,
            hostHeight: hostBox.height,
            hostArea: hostBox.width * hostBox.height,
            palletWidth: palletBox.width,
            palletHeight: palletBox.height,
            palletArea: palletBox.width * palletBox.height,
            dominantPalletSpan: Math.max(palletBox.width, palletBox.height),
            dimensionTextHeight: Math.min(
              ...[...svg.querySelectorAll(".orientation-dimension-label")]
                .map(label => label.getBoundingClientRect().height)
            ),
            dimensionSignature: [...svg.querySelectorAll(
              ".orientation-dimension, .orientation-dimension-cap, " +
              ".orientation-dimension-extension, .orientation-dimension-label"
            )].map(node => [
              node.tagName,
              ...[...node.attributes]
                .filter(attribute => attribute.name !== "class")
                .map(attribute => `${attribute.name}=${attribute.value}`)
                .sort(),
              node.textContent.trim()
            ]),
            palletSignature: [...svg.querySelectorAll(
              ".orientation-pallet-base, .orientation-pallet-runner, " +
              ".orientation-pallet-board, .orientation-pallet-grain"
            )].map(node => [
              node.tagName,
              ...[...node.attributes]
                .filter(attribute => attribute.name !== "class")
                .map(attribute => `${attribute.name}=${attribute.value}`)
                .sort()
            ]),
            indicator: {
              chevrons: chevrons.length,
              oldArrow: oldArrow ? 1 : 0,
              ariaHidden: indicator?.getAttribute("aria-hidden") || "",
              paths: chevrons.map(chevron => chevron.getAttribute("d") || "")
            },
            background: getComputedStyle(host).backgroundColor,
            borderWidth: Number.parseFloat(getComputedStyle(host).borderTopWidth)
          };
        })
      };
    });
    assert(errors.length === 0, `${url}/${width}/${theme}: ${errors.join(" | ")}`);
    return metrics;
  } finally {
    await context.close();
  }
}

async function verifyVisualDelta(browser, records) {
  const dimensionsToMeasure = ORIENTATION_CASES.filter(item => !item.square);
  for (const width of [320, 390, 1440]) {
    const height = width === 320 ? 568 : width === 390 ? 844 : 900;
    for (const theme of THEMES) {
      for (const dimensions of dimensionsToMeasure) {
        const before = await measureOrientation(browser, {
          url: BASELINE_URL,
          width,
          height,
          theme,
          dimensions
        });
        const after = await measureOrientation(browser, {
          url: CURRENT_URL,
          width,
          height,
          theme,
          dimensions
        });
        assert(
          Math.abs(before.panelHeight - after.panelHeight) <= 1 &&
            before.cardHeights.every((value, index) => (
              Math.abs(value - after.cardHeights[index]) <= 1
            )),
          `${width}/${theme}/${dimensions.id}: card or panel geometry changed`
        );
        after.diagrams.forEach((diagram, index) => {
          const baseline = before.diagrams[index];
          assert(
            Math.abs(diagram.hostWidth - baseline.hostWidth) <= 0.5 &&
              Math.abs(diagram.hostHeight - baseline.hostHeight) <= 0.5 &&
              Math.abs(diagram.palletWidth - baseline.palletWidth) <= 0.5 &&
              Math.abs(diagram.palletHeight - baseline.palletHeight) <= 0.5 &&
              Math.abs(
                diagram.dimensionTextHeight - baseline.dimensionTextHeight
              ) <= 0.5,
            `${width}/${theme}/${dimensions.id}/${index}: approved layout geometry changed`
          );
          assert(
            JSON.stringify(diagram.dimensionSignature.map(item => item.slice(0, -1))) ===
              JSON.stringify(baseline.dimensionSignature.map(item => item.slice(0, -1))) &&
              JSON.stringify(diagram.palletSignature) ===
                JSON.stringify(baseline.palletSignature),
            `${width}/${theme}/${dimensions.id}/${index}: pallet or dimension geometry changed`
          );
          assert(
            diagram.dimensionSignature
              .filter(item => item[0].toLowerCase() === "text")
              .every(item => / mm$/.test(item.at(-1))),
            `${width}/${theme}/${dimensions.id}/${index}: selected-unit dimension label missing`
          );
          assert(
            diagram.background === "rgba(0, 0, 0, 0)" &&
              diagram.borderWidth === 0 &&
              baseline.indicator.oldArrow === 0 &&
              baseline.indicator.chevrons === 2 &&
              diagram.indicator.oldArrow === 0 &&
              diagram.indicator.chevrons === 2 &&
              baseline.indicator.ariaHidden === "true" &&
              diagram.indicator.ariaHidden === "true" &&
              JSON.stringify(diagram.indicator.paths) ===
                JSON.stringify(baseline.indicator.paths),
            `${width}/${theme}/${dimensions.id}/${index}: direction indicator changed`
          );
        });
        records.push({
          type: "orientation-visual-delta",
          width,
          theme,
          dimensions: dimensions.id,
          before,
          after,
          layoutDeltaPixels: Number(
            Math.abs(before.panelHeight - after.panelHeight).toFixed(2)
          ),
          status: "PASS"
        });
      }
    }
  }
}

async function captureEvidence(browser, url, prefix) {
  const { context, page } = await openPage(browser, {
    url,
    language: "it",
    theme: "light",
    width: 390
  });
  try {
    await page.click("#singlePalletGroup [data-action='togglePicker']");
    const normal =
      "#singlePalletGroup .picker-option[data-preset-id='industrial']";
    await page.hover(normal);
    await page.locator("#singlePalletGroup [data-role='pickerMenu']").screenshot({
      path: path.join(EVIDENCE_DIR, `${prefix}-picker-day-hover.png`)
    });
    await page.keyboard.press("Escape");

    await page.locator(".print-toggle").screenshot({
      path: path.join(EVIDENCE_DIR, `${prefix}-black-and-white-label.png`)
    });

    await configureOrientation(page, { length: 1200, width: 1000 });
    await page.locator("#singlePalletGroup [data-role='orientationPanel']").screenshot({
      path: path.join(EVIDENCE_DIR, `${prefix}-locked-orientation.png`)
    });

    await page.locator(".footer").scrollIntoViewIfNeeded();
    await page.locator(".footer").screenshot({
      path: path.join(EVIDENCE_DIR, `${prefix}-footer-github.png`)
    });
  } finally {
    await context.close();
  }
}

async function captureRequiredComparisons(browser) {
  const versions = [
    { url: BASELINE_URL, id: "rc.3" },
    { url: CURRENT_URL, id: "v1.3.0" }
  ];
  const comparisonCases = ORIENTATION_CASES.filter(item => (
    ["euro", "industrial", "north-american", "custom", "elongated"].includes(item.id)
  ));

  for (const version of versions) {
    for (const theme of THEMES) {
      for (const viewport of [
        { width: 1440, height: 900 },
        { width: 390, height: 844 },
        { width: 320, height: 568 }
      ]) {
        const { context, page } = await openPage(browser, {
          url: version.url,
          language: "it",
          theme,
          width: viewport.width
        });
        try {
          await page.setViewportSize(viewport);
          await configureOrientation(page, { length: 1200, width: 800 });
          await page.locator(
            "#singlePalletGroup [data-role='orientationPanel']"
          ).screenshot({
            path: path.join(
              EVIDENCE_DIR,
              `${version.id}-detail-${viewport.width}-${theme}-1200x800.png`
            )
          });
          if (viewport.width === 1440 || viewport.width === 390) {
            await page.screenshot({
              path: path.join(
                EVIDENCE_DIR,
                `${version.id}-full-page-${viewport.width}x${viewport.height}-${theme}.png`
              ),
              fullPage: true
            });
          }
        } finally {
          await context.close();
        }
      }
    }

    for (const dimensions of comparisonCases) {
      const { context, page } = await openPage(browser, {
        url: version.url,
        language: "it",
        theme: "light",
        width: 1440
      });
      try {
        await page.setViewportSize({ width: 1440, height: 900 });
        await configureOrientation(page, dimensions);
        await page.locator(
          "#singlePalletGroup [data-role='orientationPanel']"
        ).screenshot({
          path: path.join(
            EVIDENCE_DIR,
            `${version.id}-format-${dimensions.id}-${dimensions.length}x${dimensions.width}.png`
          )
        });
      } finally {
        await context.close();
      }
    }

    for (const selected of ["normal", "rotated"]) {
      const { context, page } = await openPage(browser, {
        url: version.url,
        language: "it",
        theme: "light",
        width: 1440
      });
      try {
        await page.setViewportSize({ width: 1440, height: 900 });
        await configureOrientation(page, { length: 1200, width: 800 });
        await page.evaluate(value => {
          const group = document.getElementById("singlePalletGroup");
          group.querySelector(
            `[data-field='lockedOrientation'][value='${value}']`
          ).checked = true;
        }, selected);
        await page.locator(
          "#singlePalletGroup [data-role='orientationPanel']"
        ).screenshot({
          path: path.join(
            EVIDENCE_DIR,
            `${version.id}-selected-${selected}.png`
          )
        });
      } finally {
        await context.close();
      }
    }
  }
}

async function generatePrintHtml(page) {
  return page.evaluate(() => {
    let html = "";
    const fakeWindow = {
      document: {
        open() {},
        write(value) {
          html += value;
        },
        close() {}
      },
      focus() {},
      print() {}
    };
    const nativeOpen = window.open;
    window.open = () => fakeWindow;
    try {
      printCurrentLayout();
      return html;
    } finally {
      window.open = nativeOpen;
    }
  });
}

async function setPrintOrientation(page, orientationMode) {
  await configureOrientation(page, { length: 1200, width: 800 });
  await page.evaluate(mode => {
    const group = document.getElementById("singlePalletGroup");
    const rotate = group.querySelector("[data-field='allowRotate']");
    if (mode === "auto") {
      rotate.checked = true;
    } else {
      rotate.checked = false;
      group.querySelector(
        `[data-field='lockedOrientation'][value='${mode}']`
      ).checked = true;
    }
    updateGroupVisuals(group);
    calculate();
  }, orientationMode);
  await page.waitForFunction(() => document.querySelectorAll("#resultsBody tr").length > 0);
}

async function capturePrintLegend(browser, url, prefix, orientationMode) {
  const { context, page } = await openPage(browser, {
    url,
    language: "it",
    theme: "light",
    width: 1440
  });
  try {
    await setPrintOrientation(page, orientationMode);
    const legend = await page.evaluate(() => {
      const index = Number(document.getElementById("drawSelect").value || 0);
      return buildPrintLegend(lastResults[index], true);
    });
    assert(legend.includes('class="legend"'), `${prefix}/${orientationMode}: legend HTML`);
    const html = `
      <!DOCTYPE html>
      <html lang="it">
      <head>
        <meta charset="UTF-8">
        <style>
          * { box-sizing: border-box; }
          body {
            width: 1080px;
            margin: 0;
            padding: 24px;
            color: #000;
            background: #fff;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 9pt;
            line-height: 1.3;
          }
          h2 { margin: 0 0 6px; font-size: 11pt; }
          table { width: 100%; border-collapse: collapse; table-layout: auto; }
          th, td {
            border: 1px solid #000;
            padding: 4px 6px;
            text-align: left;
            vertical-align: top;
            overflow-wrap: anywhere;
          }
          th { background: #eee; font-weight: bold; }
          .legend th, .legend td { font-size: 9pt; line-height: 1.25; }
          .marker {
            display: inline-block;
            width: 19px;
            height: 13px;
            border: 1px solid #000;
            vertical-align: -3px;
            margin-right: 4px;
          }
        </style>
      </head>
      <body>${legend}</body>
      </html>
    `;
    const printPage = await context.newPage();
    await printPage.setContent(html, { waitUntil: "load" });
    await printPage.locator(".legend").first().screenshot({
      path: path.join(EVIDENCE_DIR, `${prefix}-print-legend-${orientationMode}.png`)
    });
    await printPage.close();
  } finally {
    await context.close();
  }
}

async function captureOrientationMatrix(browser) {
  for (const language of LANGUAGES) {
    for (const theme of THEMES) {
      const { context, page } = await openPage(browser, {
        language,
        theme,
        width: 390
      });
      try {
        await configureOrientation(page, { length: 1200, width: 800 });
        await page.locator("#singlePalletGroup [data-role='orientationPanel']").screenshot({
          path: path.join(
            EVIDENCE_DIR,
            `v1.3.0-orientation-${language}-${theme}-1200x800-390.png`
          )
        });
      } finally {
        await context.close();
      }
    }
  }

  for (const width of WIDTHS) {
    const viewport = VIEWPORTS.find(item => item.width === width);
    const { context, page } = await openPage(browser, {
      language: "it",
      theme: "light",
      width
    });
    try {
      await page.setViewportSize(viewport);
      await configureOrientation(page, { length: 1200, width: 800 });
      await page.locator("#singlePalletGroup [data-role='orientationPanel']").screenshot({
        path: path.join(EVIDENCE_DIR, `v1.3.0-orientation-viewport-${width}.png`)
      });
    } finally {
      await context.close();
    }
  }

  for (const dimensions of ORIENTATION_CASES.filter(item => !item.square)) {
    const { context, page } = await openPage(browser, {
      language: "it",
      theme: "light",
      width: 768
    });
    try {
      await configureOrientation(page, dimensions);
      await page.locator("#singlePalletGroup [data-role='orientationPanel']").screenshot({
        path: path.join(EVIDENCE_DIR, `v1.3.0-orientation-case-${dimensions.id}.png`)
      });
    } finally {
      await context.close();
    }
  }
}

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
const records = [];
const browser = await launchBrowser(ROOT);
try {
  await verifyPicker(browser, records);
  await verifyBlackAndWhite(browser, records);
  await verifyOrientationAndFooter(browser, records);
  await verifyPrintExclusion(browser, records);
  await verifyVisualDelta(browser, records);
  await captureEvidence(browser, BASELINE_URL, "before-rc.3");
  await captureEvidence(browser, CURRENT_URL, "v1.3.0");
  await captureRequiredComparisons(browser);
  await captureOrientationMatrix(browser);
  await capturePrintLegend(browser, BASELINE_URL, "before-rc.3", "normal");
  await capturePrintLegend(browser, CURRENT_URL, "v1.3.0", "normal");
  await capturePrintLegend(browser, CURRENT_URL, "v1.3.0", "rotated");
  await capturePrintLegend(browser, CURRENT_URL, "v1.3.0", "auto");
} finally {
  await browser.close();
}

const payload = {
  version: "1.3.0",
  generatedAt: new Date().toISOString(),
  pickerScenarios: records.filter(record => record.type === "picker").length,
  pickerTouchScenarios: records.filter(record => record.type === "picker-touch").length,
  blackAndWhiteScenarios: records.filter(record => record.type === "black-and-white").length,
  orientationFooterScenarios: records.filter(record => record.type === "orientation-footer").length,
  visualDeltaScenarios: records.filter(record => record.type === "orientation-visual-delta").length,
  printExclusionScenarios: records.filter(record => record.type === "print-github-exclusion").length,
  orientationCasesPerScenario: ORIENTATION_CASES.length,
  evidenceFiles: fs.readdirSync(EVIDENCE_DIR).sort(),
  status: "PASS",
  records
};
fs.writeFileSync(RESULT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
console.log(
  `Visual refinements PASS: ${payload.pickerScenarios} picker, ` +
  `${payload.pickerTouchScenarios} touch, ${payload.blackAndWhiteScenarios} B/W, ` +
  `${payload.orientationFooterScenarios} orientation/footer and ` +
  `${payload.printExclusionScenarios} print-exclusion scenarios.`
);
