import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchBrowser } from "./browser-runtime.mjs";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(TEST_DIR, "..");
const APP_PATH = path.resolve(
  PROJECT_DIR,
  process.env.LOADCOMPOSER_HTML || "site/index.html"
);
const APP_HTML = fs.readFileSync(APP_PATH, "utf8");
const OUTPUT_PATH = path.join(PROJECT_DIR, "responsive-results-v1.0.0.json");
const SCREENSHOT_DIR = path.join(PROJECT_DIR, "screenshots-responsive-v1.0.0");

const VIEWPORTS = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 412, height: 915 },
  { width: 768, height: 1024 },
  { width: 820, height: 1180 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 }
];

const SCREENSHOT_VIEWPORTS = new Map([
  ["768x1024", "screenshot-768x1024-tablet.png"],
  ["1024x768", "screenshot-1024x768-landscape.png"],
  ["1440x900", "screenshot-1440x900-desktop.png"]
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: atteso ${expected}, ottenuto ${actual}`);
  }
}

function viewportId(viewport) {
  return `${viewport.width}x${viewport.height}`;
}

function wireErrorCapture(page) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", error => pageErrors.push(error.message));
  return { consoleErrors, pageErrors };
}

async function createPage(browser, viewport) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    hasTouch: viewport.width <= 820
  });
  const page = await context.newPage();
  const errors = wireErrorCapture(page);
  await page.setContent(APP_HTML, { waitUntil: "load" });
  await page.waitForTimeout(40);
  return { context, page, errors };
}

async function horizontalLayout(page, label) {
  const measurement = await page.evaluate(() => {
    const isVisible = element => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const describe = element => {
      const rect = element.getBoundingClientRect();
      return {
        selector: element.id
          ? `#${element.id}`
          : `${element.tagName.toLowerCase()}.${Array.from(element.classList).join(".")}`,
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height
      };
    };
    const viewportWidth = document.documentElement.clientWidth;
    const interactive = Array.from(
      document.querySelectorAll('input:not([type="hidden"]), select, button')
    ).filter(isVisible).map(describe);
    const outside = interactive.filter(item => (
      item.left < -0.5 || item.right > viewportWidth + 0.5
    ));
    const forbiddenOverflow = Array.from(document.querySelectorAll(
      ".card, .form, .pallet-group, .results, .summary, .drawcard, .drawtop, .draw-actions"
    ))
      .filter(isVisible)
      .filter(element => !element.closest(".tablewrap"))
      .filter(element => element.scrollWidth > element.clientWidth + 1)
      .map(describe);
    const main = document.querySelector("main");
    const cards = Array.from(document.querySelectorAll(".card")).map(describe);
    const tablewrap = document.querySelector(".tablewrap");
    const tableRect = tablewrap.getBoundingClientRect();
    const canvas = document.getElementById("layoutCanvas");
    const canvasRect = canvas.getBoundingClientRect();
    const drawcardRect = document.querySelector(".drawcard").getBoundingClientRect();

    return {
      viewportWidth,
      documentClientWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyClientWidth: document.body.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      mainClientWidth: main.clientWidth,
      mainScrollWidth: main.scrollWidth,
      outside,
      forbiddenOverflow,
      cards,
      tablewrap: {
        left: tableRect.left,
        right: tableRect.right,
        clientWidth: tablewrap.clientWidth,
        scrollWidth: tablewrap.scrollWidth,
        overflowX: getComputedStyle(tablewrap).overflowX
      },
      canvas: {
        left: canvasRect.left,
        right: canvasRect.right,
        top: canvasRect.top,
        bottom: canvasRect.bottom,
        width: canvasRect.width,
        height: canvasRect.height,
        internalWidth: canvas.width,
        internalHeight: canvas.height
      },
      drawcard: {
        left: drawcardRect.left,
        right: drawcardRect.right,
        top: drawcardRect.top,
        bottom: drawcardRect.bottom
      }
    };
  });

  assert(
    measurement.documentScrollWidth <= measurement.documentClientWidth,
    `${label}: document overflow ${measurement.documentScrollWidth}/${measurement.documentClientWidth}`
  );
  assert(
    measurement.bodyScrollWidth <= measurement.bodyClientWidth,
    `${label}: body overflow ${measurement.bodyScrollWidth}/${measurement.bodyClientWidth}`
  );
  assert(
    measurement.mainScrollWidth <= measurement.mainClientWidth,
    `${label}: main overflow ${measurement.mainScrollWidth}/${measurement.mainClientWidth}`
  );
  assertEqual(
    measurement.outside.length,
    0,
    `${label}: controlli fuori viewport ${JSON.stringify(measurement.outside)}`
  );
  assertEqual(
    measurement.forbiddenOverflow.length,
    0,
    `${label}: overflow non autorizzati ${JSON.stringify(measurement.forbiddenOverflow)}`
  );
  measurement.cards.forEach((card, index) => {
    assert(
      card.left >= -0.5 && card.right <= measurement.viewportWidth + 0.5,
      `${label}: card ${index} fuori viewport`
    );
  });
  assert(
    measurement.tablewrap.left >= -0.5 &&
      measurement.tablewrap.right <= measurement.viewportWidth + 0.5,
    `${label}: tablewrap fuori viewport`
  );
  assert(
    ["auto", "scroll"].includes(measurement.tablewrap.overflowX),
    `${label}: tablewrap senza overflow-x autonomo`
  );
  assert(
    measurement.canvas.left >= measurement.drawcard.left - 0.5 &&
      measurement.canvas.right <= measurement.drawcard.right + 0.5,
    `${label}: canvas fuori dalla drawcard`
  );
  assert(
    measurement.canvas.top >= measurement.drawcard.top - 0.5 &&
      measurement.canvas.bottom <= measurement.drawcard.bottom + 0.5,
    `${label}: canvas verticalmente fuori dalla drawcard`
  );
  const renderedRatio = measurement.canvas.width / measurement.canvas.height;
  const internalRatio = measurement.canvas.internalWidth / measurement.canvas.internalHeight;
  assert(
    Math.abs(renderedRatio - internalRatio) <= 0.035,
    `${label}: canvas deformato ${renderedRatio}/${internalRatio}`
  );

  return measurement;
}

async function assertTableScroll(page, label) {
  const result = await page.evaluate(() => {
    const wrap = document.querySelector(".tablewrap");
    const beforeDocument = document.documentElement.scrollLeft;
    const beforeBody = document.body.scrollLeft;
    wrap.scrollLeft = wrap.scrollWidth;
    const moved = wrap.scrollLeft;
    const afterDocument = document.documentElement.scrollLeft;
    const afterBody = document.body.scrollLeft;
    wrap.scrollLeft = 0;
    return {
      clientWidth: wrap.clientWidth,
      scrollWidth: wrap.scrollWidth,
      moved,
      beforeDocument,
      beforeBody,
      afterDocument,
      afterBody
    };
  });
  assert(
    result.scrollWidth > result.clientWidth,
    `${label}: tabella non eccede il contenitore nella fixture`
  );
  assert(result.moved > 0, `${label}: tablewrap non scorre autonomamente`);
  assertEqual(
    result.afterDocument,
    result.beforeDocument,
    `${label}: scroll tabella ha mosso document`
  );
  assertEqual(result.afterBody, result.beforeBody, `${label}: scroll tabella ha mosso body`);
  return result;
}

async function assertPicker(page, label, fullKeyboardCheck = true) {
  const toggle = page.locator(
    '#singlePalletGroup [data-action="togglePicker"]'
  );
  await toggle.evaluate(element => {
    const targetTop = element.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo(0, Math.max(0, targetTop));
  });
  await toggle.focus();
  await page.keyboard.press("Enter");

  const menu = page.locator('#singlePalletGroup [data-role="pickerMenu"]');
  const bounds = await menu.boundingBox();
  const viewport = page.viewportSize();
  assert(bounds, `${label}: picker non aperto`);
  assert(
    bounds.x >= -0.5 &&
      bounds.x + bounds.width <= viewport.width + 0.5 &&
      bounds.y >= -0.5 &&
      bounds.y + bounds.height <= viewport.height + 0.5,
    `${label}: picker fuori viewport ${JSON.stringify(bounds)}`
  );
  const scroll = await menu.evaluate(element => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    overflowY: getComputedStyle(element).overflowY
  }));
  assert(
    ["auto", "scroll"].includes(scroll.overflowY),
    `${label}: picker senza scorrimento interno`
  );
  assert(
    scroll.scrollHeight > scroll.clientHeight,
    `${label}: fixture picker non esercita lo scroll interno`
  );

  if (!fullKeyboardCheck) {
    await page.keyboard.press("Escape");
    assert(await menu.isHidden(), `${label}: Escape non chiude il picker`);
    return { bounds, scroll };
  }

  await page.keyboard.press("Tab");
  const firstFocused = await page.evaluate(
    () => document.activeElement.classList.contains("picker-option")
  );
  assert(firstFocused, `${label}: Tab non raggiunge le opzioni del picker`);
  await page.keyboard.press("Escape");
  assert(await menu.isHidden(), `${label}: Escape non chiude il picker`);
  assert(
    await toggle.evaluate(element => document.activeElement === element),
    `${label}: Escape non restituisce il focus al pulsante`
  );

  await toggle.click();
  await page.mouse.click(2, page.viewportSize().height - 2);
  assert(await menu.isHidden(), `${label}: click esterno non chiude il picker`);

  await toggle.click();
  await menu.locator('[data-preset-id="industrial"]').click();
  assert(await menu.isHidden(), `${label}: selezione non chiude il picker`);
  assert(
    await toggle.evaluate(element => document.activeElement === element),
    `${label}: selezione non restituisce il focus al pulsante`
  );

  return { bounds, scroll };
}

async function assertTouchTargets(page, label) {
  const failures = await page.evaluate(() => {
    const selectors = [
      "input:not([type=checkbox]):not([type=radio]):not([type=hidden])",
      "select",
      "button",
      ".checkline",
      ".print-toggle",
      ".switch-control",
      ".orientation-card"
    ];
    const visible = element => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    return Array.from(document.querySelectorAll(selectors.join(",")))
      .filter(visible)
      .map(element => {
        const rect = element.getBoundingClientRect();
        return {
          selector: element.id
            ? `#${element.id}`
            : `${element.tagName.toLowerCase()}.${Array.from(element.classList).join(".")}`,
          width: rect.width,
          height: rect.height
        };
      })
      .filter(item => item.width < 43.5 || item.height < 43.5);
  });
  assertEqual(
    failures.length,
    0,
    `${label}: target touch sotto 44 px ${JSON.stringify(failures)}`
  );
}

async function assertPrincipalControlsUncovered(page, label) {
  const selectors = [
    "#loadMode",
    '#singlePalletGroup [data-action="togglePicker"]',
    "#quantity",
    "#palletHeight",
    "#gap",
    "#stackable",
    "#calculateBtn",
    "#resetBtn",
    "#drawSelect",
    "#printView",
    "#printBw",
    "#printLayoutBtn"
  ];

  for (const selector of selectors) {
    const locator = page.locator(selector);
    if (!(await locator.isVisible())) continue;
    await locator.scrollIntoViewIfNeeded();
    const uncovered = await locator.evaluate(element => {
      const rect = element.getBoundingClientRect();
      const x = Math.min(innerWidth - 1, Math.max(0, rect.left + rect.width / 2));
      const y = Math.min(innerHeight - 1, Math.max(0, rect.top + rect.height / 2));
      const hit = document.elementFromPoint(x, y);
      const labelElement = element.closest("label");
      return Boolean(
        hit &&
        (
          hit === element ||
          element.contains(hit) ||
          hit.contains(element) ||
          (labelElement && labelElement.contains(hit))
        )
      );
    });
    assert(uncovered, `${label}: controllo coperto ${selector}`);
  }
}

async function exercisePreviewControls(page, label) {
  const beforeContainer = await page.locator("#drawSelect").inputValue();
  const options = await page.locator("#drawSelect option").count();
  assert(options > 1, `${label}: mezzi preview assenti`);
  await page.selectOption("#drawSelect", { index: 1 });
  const afterContainer = await page.locator("#drawSelect").inputValue();
  assert(afterContainer !== beforeContainer, `${label}: cambio mezzo non applicato`);

  await page.selectOption("#printView", "ramp");
  await page.uncheck("#printBw");
  let measurement = await horizontalLayout(page, `${label} rampa colore`);
  assertEqual(measurement.canvas.internalWidth, 720, `${label}: larghezza interna rampa`);
  assertEqual(measurement.canvas.internalHeight, 1200, `${label}: altezza interna rampa`);

  await page.selectOption("#printView", "side");
  await page.check("#printBw");
  measurement = await horizontalLayout(page, `${label} laterale B/N`);
  assertEqual(measurement.canvas.internalWidth, 1100, `${label}: larghezza interna laterale`);
  assertEqual(measurement.canvas.internalHeight, 470, `${label}: altezza interna laterale`);

  return { beforeContainer, afterContainer };
}

async function runViewport(browser, viewport) {
  const id = viewportId(viewport);
  const { context, page, errors } = await createPage(browser, viewport);
  try {
    const initial = await horizontalLayout(page, `${id} single`);
    const table = await assertTableScroll(page, id);
    const picker = await assertPicker(page, id, false);
    await assertTouchTargets(page, id);
    const preview = {
      selectedContainer: await page.locator("#drawSelect").inputValue(),
      view: await page.locator("#printView").inputValue(),
      blackAndWhite: await page.locator("#printBw").isChecked()
    };

    if (id === "390x844" || id === "768x1024") {
      const originalMode = await page.locator("#loadMode").inputValue();
      const originalContainer = await page.locator("#drawSelect").inputValue();
      const rotated = { width: viewport.height, height: viewport.width };
      await page.setViewportSize(rotated);
      await page.waitForTimeout(30);
      await horizontalLayout(page, `${id} ruotato ${viewportId(rotated)}`);
      assertEqual(
        await page.locator("#loadMode").inputValue(),
        originalMode,
        `${id}: modalità persa dopo rotazione`
      );
      assertEqual(
        await page.locator("#drawSelect").inputValue(),
        originalContainer,
        `${id}: mezzo perso dopo rotazione`
      );
      await page.setViewportSize(viewport);
      await page.waitForTimeout(30);
      await horizontalLayout(page, `${id} ritorno portrait`);
    }

    const screenshotName = SCREENSHOT_VIEWPORTS.get(id);
    if (screenshotName) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, screenshotName) });
    }

    assertEqual(errors.consoleErrors.length, 0, `${id}: errori console`);
    assertEqual(errors.pageErrors.length, 0, `${id}: errori pagina`);
    console.log(`Viewport ${id}: PASS`);

    return {
      viewport: id,
      initial,
      table,
      picker,
      preview,
      consoleErrors: errors.consoleErrors,
      pageErrors: errors.pageErrors
    };
  } finally {
    await context.close();
  }
}

async function exerciseSingle(browser) {
  const viewport = { width: 320, height: 568 };
  const { context, page, errors } = await createPage(browser, viewport);
  try {
    console.log("Scenario single 320: picker tastiera");
    const group = page.locator("#singlePalletGroup");
    await assertPicker(page, "320 single tastiera", true);
    console.log("Scenario single 320: custom e orientamenti");
    const toggle = group.locator('[data-action="togglePicker"]');
    await toggle.click();
    await group.locator('[data-preset-id="custom"]').click();
    const longName = "Pallet custom lungo & leggibile 1234567890 ABCD";
    const longIdentifier = "IDENTIFICATIVO-LUNGO-1234567890-AB";
    await group.locator('[data-field="length"]').fill("1200");
    await group.locator('[data-field="width"]').fill("800");
    await group.locator('[data-field="customName"]').fill(longName);
    await group.locator('[data-field="identifier"]').fill(longIdentifier);
    await horizontalLayout(page, "320 single custom lungo");

    const rotate = group.locator('[data-field="allowRotate"]');
    await group.locator(".switch-control").click();
    assert(!(await rotate.isChecked()), "320 single: rotazione non disattivata");
    assert(
      await group.locator('[data-role="orientationPanel"]').isVisible(),
      "320 single: orientamenti bloccati non visibili"
    );
    await group.locator('[data-field="lockedOrientation"][value="rotated"]').check();
    await horizontalLayout(page, "320 single orientamento bloccato");

    await group.locator('[data-field="width"]').fill("1200");
    assert(await rotate.isDisabled(), "320 single: pallet quadrato non blocca rotazione");
    assert(
      await group.locator('[data-role="squareNote"]').isVisible(),
      "320 single: nota pallet quadrato assente"
    );
    await group.locator('[data-field="width"]').fill("800");
    await group.locator(".switch-control").click();
    assert(await rotate.isChecked(), "320 single: rotazione automatica non riattivata");

    await page.check("#stackable");
    assert(await page.locator("#stackOptions").isVisible(), "320 single: opzioni stack assenti");
    await page.locator("#maxLayers").fill("3");
    await page.locator("#verticalGap").fill("5");

    await page.locator("#quantity").fill("");
    console.log("Scenario single 320: invalido/valido");
    assert(
      await page.locator("#formValidationMessage").isVisible(),
      "320 single: errore input invalido non visibile"
    );
    assertEqual(
      await page.locator("#resultsBody tr").count(),
      0,
      "320 single: risultato precedente rimasto dopo input invalido"
    );
    await page.locator("#quantity").fill("10");
    assert(
      await page.locator("#resultsBody tr").count() > 0,
      "320 single: risultato non ricreato dopo input valido"
    );

    await page.locator("#calculateBtn").focus();
    await page.keyboard.press("Enter");
    assert(
      await page.locator("#resultsBody tr").count() > 0,
      "320 single: Calcola da tastiera non funziona"
    );

    await page.selectOption("#drawSelect", { index: 2 });
    await page.selectOption("#printView", "ramp");
    await page.uncheck("#printBw");
    await page.locator("#resetBtn").click();
    console.log("Scenario single 320: reset e screenshot");
    assertEqual(await page.locator("#loadMode").inputValue(), "single", "Reset modalità");
    assertEqual(await page.locator("#printView").inputValue(), "side", "Reset vista");
    assert(
      (await page.locator("#drawSelect option:checked").textContent()).includes("20' Dry"),
      "Reset mezzo non torna a 20' Dry"
    );
    assertEqual(
      await page.locator("#mixedRows .mixed-row").count(),
      2,
      "Reset gruppi mixed"
    );
    assertEqual(
      await page.locator('[data-role="pickerMenu"]:not(.hidden)').count(),
      0,
      "Reset lascia un picker aperto"
    );

    await horizontalLayout(page, "320 single finale");
    await assertTouchTargets(page, "320 single finale");
    await assertPrincipalControlsUncovered(page, "320 single finale");
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "screenshot-320x568-single.png")
    });

    assertEqual(errors.consoleErrors.length, 0, "320 single: errori console");
    assertEqual(errors.pageErrors.length, 0, "320 single: errori pagina");
    return {
      viewport: "320x568",
      customNameLength: longName.length,
      identifierLength: longIdentifier.length,
      reset: "PASS",
      invalidThenValid: "PASS",
      keyboardCalculate: "PASS"
    };
  } finally {
    await context.close();
  }
}

async function exerciseMixed(browser) {
  const viewport = { width: 390, height: 844 };
  const { context, page, errors } = await createPage(browser, viewport);
  try {
    console.log("Scenario mixed 390: aggiunta gruppi");
    await page.selectOption("#loadMode", "mixed");
    assertEqual(
      await page.locator("#mixedRows .mixed-row").count(),
      2,
      "390 mixed: gruppi iniziali"
    );
    await page.locator("#mixedRows .mixed-row").nth(1).locator(
      '[data-action="removeMixedRow"]'
    ).click();
    assertEqual(
      await page.locator("#mixedRows .mixed-row").count(),
      1,
      "390 mixed: rimozione gruppo"
    );
    for (let index = 0; index < 5; index += 1) {
      await page.locator("#addMixedRowBtn").click();
    }
    assertEqual(
      await page.locator("#mixedRows .mixed-row").count(),
      6,
      "390 mixed: aggiunta fino a sei gruppi"
    );

    const rows = page.locator("#mixedRows .mixed-row");
    const first = rows.nth(0);
    await first.locator('[data-action="togglePicker"]').click();
    await first.locator('[data-preset-id="custom"]').click();
    await first.locator('[data-field="length"]').fill("1219");
    await first.locator('[data-field="width"]').fill("1016");
    await first.locator('[data-field="customName"]').fill(
      "Nome pallet misto personalizzato molto lungo 12345"
    );
    await first.locator('[data-field="identifier"]').fill(
      "ARTICOLO-MISTO-LUNGO-1234567890-XYZ"
    );
    console.log("Scenario mixed 390: orientamenti");

    const second = rows.nth(1);
    await second.locator(".switch-control").click();
    assert(
      !(await second.locator('[data-field="allowRotate"]').isChecked()),
      "390 mixed: rotazione non disattivata"
    );
    await second.locator(
      '[data-field="lockedOrientation"][value="rotated"]'
    ).check();

    const third = rows.nth(2);
    await third.locator('[data-action="togglePicker"]').click();
    await third.locator('[data-preset-id="custom"]').click();
    await third.locator('[data-field="length"]').fill("1100");
    await third.locator('[data-field="width"]').fill("1100");
    assert(
      await third.locator('[data-role="squareNote"]').isVisible(),
      "390 mixed: pallet quadrato non riconosciuto"
    );
    await page.locator("#mixedGap").fill("5");

    await horizontalLayout(page, "390 mixed sei gruppi");
    console.log("Scenario mixed 390: rimozione e mezzo");
    await assertTouchTargets(page, "390 mixed sei gruppi");
    assert(
      await rows.nth(5).locator('[data-action="removeMixedRow"]').isVisible(),
      "390 mixed: Rimuovi del sesto gruppo non raggiungibile"
    );
    await rows.nth(5).locator('[data-action="removeMixedRow"]').scrollIntoViewIfNeeded();
    await rows.nth(5).locator('[data-action="removeMixedRow"]').click();
    assertEqual(await rows.count(), 5, "390 mixed: rimozione sesto gruppo");
    await page.locator("#addMixedRowBtn").click();
    assertEqual(await rows.count(), 6, "390 mixed: riaggiunta gruppo");

    const selectedVehicle = await page.locator("#drawSelect").inputValue();
    await page.selectOption("#drawSelect", { index: 1 });
    const changedVehicle = await page.locator("#drawSelect").inputValue();
    assert(changedVehicle !== selectedVehicle, "390 mixed: cambio mezzo non applicato");
    await page.locator("#addMixedRowBtn").click();
    assertEqual(
      await page.locator("#drawSelect").inputValue(),
      changedVehicle,
      "390 mixed: mezzo perso aggiungendo gruppo"
    );
    await rows.last().locator('[data-action="removeMixedRow"]').click();
    assertEqual(
      await page.locator("#drawSelect").inputValue(),
      changedVehicle,
      "390 mixed: mezzo perso rimuovendo gruppo"
    );

    await page.selectOption("#printView", "ramp");
    console.log("Scenario mixed 390: preview e screenshot");
    await page.uncheck("#printBw");
    await horizontalLayout(page, "390 mixed rampa colore");
    await page.selectOption("#printView", "side");
    await page.check("#printBw");
    await horizontalLayout(page, "390 mixed laterale B/N");

    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "screenshot-390x844-mixed.png")
    });
    assertEqual(errors.consoleErrors.length, 0, "390 mixed: errori console");
    assertEqual(errors.pageErrors.length, 0, "390 mixed: errori pagina");
    return {
      viewport: "390x844",
      groups: 6,
      custom: "PASS",
      lockedOrientation: "PASS",
      square: "PASS",
      addRemove: "PASS",
      selectedVehiclePersistence: "PASS"
    };
  } finally {
    await context.close();
  }
}

async function capturePreviewScreenshots(browser) {
  const viewport = { width: 412, height: 915 };
  const { context, page, errors } = await createPage(browser, viewport);
  try {
    const drawcard = page.locator(".drawcard");
    await page.selectOption("#printView", "side");
    await page.check("#printBw");
    await drawcard.scrollIntoViewIfNeeded();
    await drawcard.screenshot({
      path: path.join(SCREENSHOT_DIR, "screenshot-preview-side-412x915.png")
    });
    await page.selectOption("#printView", "ramp");
    await page.uncheck("#printBw");
    await horizontalLayout(page, "412 preview rampa colore");
    await drawcard.scrollIntoViewIfNeeded();
    await drawcard.screenshot({
      path: path.join(SCREENSHOT_DIR, "screenshot-preview-ramp-412x915.png")
    });
    assertEqual(errors.consoleErrors.length, 0, "preview screenshot: errori console");
    assertEqual(errors.pageErrors.length, 0, "preview screenshot: errori pagina");
    return [
      "screenshots-responsive-v1.0.0/screenshot-preview-side-412x915.png",
      "screenshots-responsive-v1.0.0/screenshot-preview-ramp-412x915.png"
    ];
  } finally {
    await context.close();
  }
}

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const browser = await launchBrowser(PROJECT_DIR);
const browserVersion = browser.version();
const viewportResults = [];
let singleResult;
let mixedResult;
let previewScreenshots;

try {
  const allResults = await Promise.all([
    ...VIEWPORTS.map(viewport => runViewport(browser, viewport)),
    exerciseSingle(browser),
    exerciseMixed(browser),
    capturePreviewScreenshots(browser)
  ]);
  viewportResults.push(...allResults.slice(0, VIEWPORTS.length));
  [singleResult, mixedResult, previewScreenshots] = allResults.slice(VIEWPORTS.length);
} finally {
  await browser.close();
}

const screenshots = fs.readdirSync(SCREENSHOT_DIR)
  .filter(filename => filename.endsWith(".png"))
  .sort()
  .map(filename => `screenshots-responsive-v1.0.0/${filename}`);

const output = {
  status: "PASS",
  browser: `Chromium ${browserVersion} tramite Playwright`,
  viewports: viewportResults,
  scenarios: {
    single: singleResult,
    mixed: mixedResult,
    previewScreenshots
  },
  screenshots,
  assertions: {
    viewportCount: VIEWPORTS.length,
    documentOverflow: "PASS",
    bodyOverflow: "PASS",
    mainOverflow: "PASS",
    tablewrapAutonomousScroll: "PASS",
    interactiveBounds: "PASS",
    pickerBoundsAndKeyboard: "PASS",
    canvasContainmentAndRatio: "PASS",
    consoleErrors: 0,
    coveredPrincipalControls: 0,
    portraitLandscapeWithoutReload: "PASS",
    invalidThenValid: "PASS",
    reset: "PASS",
    mixedAddRemove: "PASS",
    touchTargets: "PASS"
  }
};

fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
console.log(
  `Responsive v1.0.0: ${VIEWPORTS.length}/${VIEWPORTS.length} viewport PASS, ` +
  `${screenshots.length} screenshot, 0 errori console.`
);
