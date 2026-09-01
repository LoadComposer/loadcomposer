import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const SITE = path.join(ROOT, "site");
const TEMPLATE = fs.readFileSync(path.join(SCRIPT_DIR, "templates", "guide-page.html"), "utf8");
const BRAND_DAY = fs.readFileSync(path.join(SITE, "assets", "loadcomposer-mobile-day.svg"), "utf8");
const BRAND_NIGHT = fs.readFileSync(path.join(SITE, "assets", "loadcomposer-mobile-night.svg"), "utf8");
const ORIGIN = "https://loadcomposer.com";
const ROUTE = "/about/";
const TITLE = "About LoadComposer | Built from Real Logistics Work";
const DESCRIPTION = "The practical logistics experience behind LoadComposer, a browser-based pallet loading calculator created by Marco Pernigotti.";

function namespaceSvgIds(svg, namespace) {
  const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  let output = svg;
  for (const id of ids) {
    const next = `${namespace}-${id}`;
    output = output
      .replaceAll(`id="${id}"`, `id="${next}"`)
      .replaceAll(`url(#${id})`, `url(#${next})`)
      .replaceAll(`href="#${id}"`, `href="#${next}` + `"`)
      .replaceAll(`xlink:href="#${id}"`, `xlink:href="#${next}` + `"`);
  }
  return output;
}

function fillTemplate(replacements) {
  let output = TEMPLATE;
  for (const [key, value] of Object.entries(replacements)) {
    const marker = `__${key}__`;
    if (!output.includes(marker)) throw new Error(`About template marker missing: ${marker}`);
    output = output.replaceAll(marker, value);
  }
  const unresolved = output.match(/__[A-Z0-9_]+__/g);
  if (unresolved) throw new Error(`Unresolved About template markers: ${[...new Set(unresolved)].join(", ")}`);
  return output;
}

const schema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About LoadComposer",
  description: DESCRIPTION,
  url: `${ORIGIN}${ROUTE}`,
  mainEntity: {
    "@type": "SoftwareApplication",
    name: "LoadComposer",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web browser"
  }
};

const body = `
  <h1>About LoadComposer</h1>
  <p class="lede">Built from real logistics work.</p>
  <h2>Why it exists</h2>
  <p>LoadComposer began with a recurring practical question: <em>will this load fit?</em> It was created to make the first geometric check faster, clearer, and easier to repeat before a shipment moves into detailed operational planning.</p>
  <h2>Practical experience behind the project</h2>
  <p>LoadComposer is created by Marco Pernigotti. Its approach reflects seven years working directly with export groupage operations, followed by more than 15 years leading logistics for a major Italian wine exporter.</p>
  <p>The project turns patterns from that work into a focused browser tool. It does not use private shipment, customer, employer, or carrier data, and it does not imply endorsement by any current or former employer.</p>
  <h2>What LoadComposer does</h2>
  <p>It calculates indicative pallet floor layouts for the supported container and trailer references, common or custom pallet footprints, rotation, clearances, and supported stacking settings. The aim is to expose the dimensions and assumptions behind each result rather than hide them behind a single capacity number.</p>
  <h2>What it does not replace</h2>
  <p>LoadComposer is a planning aid, not a loading instruction. Actual equipment dimensions, pallet overhang or bulging, access, airflow, securing, weight, load balance, axle loads, floor limits, safety, and legal or carrier requirements still need separate verification.</p>
  <div class="actions" aria-label="LoadComposer actions">
    <a class="button" href="/">Use LoadComposer for free</a>
    <a class="button secondary" href="/guides/">Explore the pallet capacity guides</a>
  </div>
`;

const output = fillTemplate({
  PAGE_TITLE: TITLE,
  PAGE_DESCRIPTION: DESCRIPTION,
  CANONICAL_URL: `${ORIGIN}${ROUTE}`,
  OG_TYPE: "website",
  OG_IMAGE: `${ORIGIN}/assets/loadcomposer-og-v1.3.6.png`,
  OG_IMAGE_WIDTH: "1200",
  OG_IMAGE_HEIGHT: "630",
  BREADCRUMB_JSON: JSON.stringify(schema).replaceAll("<", "\\u003c"),
  BREADCRUMB_HTML: '<a href="/">LoadComposer</a>\n<span aria-hidden="true">›</span>\n<span aria-current="page">About</span>',
  MAIN_CONTENT: body.trim(),
  COMPACT_BRAND_DAY: namespaceSvgIds(BRAND_DAY, "about-day"),
  COMPACT_BRAND_NIGHT: namespaceSvgIds(BRAND_NIGHT, "about-night")
});

const directory = path.join(SITE, "about");
fs.mkdirSync(directory, { recursive: true });
fs.writeFileSync(path.join(directory, "index.html"), output, "utf8");
console.log("About generation PASS: /about/.");
