import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, "..");
const LEGAL_DIR = path.join(ROOT, "site", "legal");
const RAW_LEGAL_DIR = path.join(LEGAL_DIR, "raw");
const VERSION = fs.readFileSync(path.join(ROOT, "VERSION"), "utf8").trim();
const HUB_TEMPLATE = path.join(ROOT, "scripts", "templates", "legal-index.html");
const DOCUMENT_TEMPLATE = path.join(ROOT, "scripts", "templates", "legal-document.html");
const HUB_OUTPUT = path.join(LEGAL_DIR, "index.html");
const COMPACT_BRAND_DAY = path.join(ROOT, "site", "assets", "loadcomposer-mobile-day.svg");
const COMPACT_BRAND_NIGHT = path.join(ROOT, "site", "assets", "loadcomposer-mobile-night.svg");
const INDEX_PATH = path.join(ROOT, "site", "lang", "index.json");

const LEGAL_HASHES = Object.freeze({
  LICENSE: "07c8360fa6840b24641b2e9443c82d8001ad8c4d32bc58f43fb04f64a1d080d0",
  "LICENSE.it.md": "8b47a93a962da349910972a6125ec7ce1997b07fb951e2c316b10c187c875266",
  NOTICE: "0b1322e4517d715f95e44d63d576b663b2b9c65e8e97caed2fc6e7cae86e266f",
  "TRADEMARKS.md": "5c69098cb03d6033200b42edb4eefb1b9a0a0542e91f05a57ec58c61f5337490",
  "COMMERCIAL-LICENSING.md": "59444c07f5f7286d1e032211b7e933aa9ab357e6d0a66e7c1022e673c3a6e3c4",
  "PRIVACY.md": "13ba9454ebab8c3bbaf195e978c3b2e7a4cf0f69bc0d732bd622e35d811f5e28",
  "SECURITY.md": "41f27656c06f55d1ad059f9ec7738bb2ee884270ccae86b0f4d6316a93efe076"
});

const DOCUMENTS = Object.freeze([
  {
    route: "license",
    titleKey: "footer.license",
    fallbackTitle: "License",
    fallbackDescription: "LoadComposer Community License 1.0 in its governing English text and existing informational Italian translation.",
    sources: ["LICENSE", "LICENSE.it.md"],
    licenseSelector: true
  },
  {
    route: "notices",
    titleKey: "legal.documents.notice",
    fallbackTitle: "Notice and attribution",
    fallbackDescription: "LoadComposer copyright, attribution, source, licensing, operational and trademark notices.",
    sources: ["NOTICE"],
    bodyLanguage: "en"
  },
  {
    route: "trademarks",
    titleKey: "legal.documents.trademarks",
    fallbackTitle: "Trademark policy",
    fallbackDescription: "LoadComposer trademark, name, logo, branding and attribution policy.",
    sources: ["TRADEMARKS.md"],
    bodyLanguage: "en"
  },
  {
    route: "commercial",
    titleKey: "legal.documents.commercial",
    fallbackTitle: "Commercial licensing",
    fallbackDescription: "LoadComposer commercial-licensing information and contact details.",
    sources: ["COMMERCIAL-LICENSING.md"],
    bodyLanguage: "en"
  },
  {
    route: "privacy",
    titleKey: "legal.documents.privacy",
    fallbackTitle: "Privacy information",
    fallbackDescription: "LoadComposer application privacy information, local processing, preferences, hosting logs and external links.",
    sources: ["PRIVACY.md"],
    bodyLanguage: "en"
  },
  {
    route: "security",
    titleKey: "legal.documents.security",
    fallbackTitle: "Security policy",
    fallbackDescription: "LoadComposer supported-version and responsible vulnerability-reporting information.",
    sources: ["SECURITY.md"],
    bodyLanguage: "en"
  }
]);

const REQUIRED_KEYS = [
  "footer.download", "footer.license", "footer.privacy", "footer.legalInformation",
  "footer.linksAria", "downloads.brandHomeAria", "downloads.footer.home",
  "downloads.theme.label", "downloads.theme.auto", "downloads.theme.light",
  "downloads.theme.dark", "downloads.language.label", "legal.meta.title",
  "legal.meta.description", "legal.title", "legal.notice.controlling",
  "legal.notice.translation", "legal.notice.sourceAvailable", "legal.documents.title",
  "legal.documents.licenseEnglish", "legal.documents.licenseItalian",
  "legal.documents.notice", "legal.documents.trademarks", "legal.documents.commercial",
  "legal.documents.privacy", "legal.documents.security", "legal.contact.title",
  "legal.contact.prefix", "legal.footer.repository", "legal.page.breadcrumbAria",
  "legal.page.licenseText", "legal.page.tableOfContents", "legal.page.viewSource"
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha256(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function namespaceSvgIds(svg, namespace) {
  const ids = [...svg.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  let output = svg;
  for (const id of ids) {
    const namespaced = `${namespace}-${id}`;
    output = output
      .replaceAll(`id="${id}"`, `id="${namespaced}"`)
      .replaceAll(`url(#${id})`, `url(#${namespaced})`)
      .replaceAll(`href="#${id}"`, `href="#${namespaced}"`)
      .replaceAll(`xlink:href="#${id}"`, `xlink:href="#${namespaced}"`);
  }
  return output;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeHref(href) {
  const legalRoutes = {
    LICENSE: "/legal/license/?lang=en",
    "LICENSE.it.md": "/legal/license/?lang=it",
    NOTICE: "/legal/notices/",
    "TRADEMARKS.md": "/legal/trademarks/",
    "COMMERCIAL-LICENSING.md": "/legal/commercial/",
    "PRIVACY.md": "/legal/privacy/",
    "SECURITY.md": "/legal/security/"
  };
  if (legalRoutes[href]) return legalRoutes[href];
  if (/^(?:https?:|mailto:|#|\/)/i.test(href)) return href;
  return href.replaceAll("..", "");
}

function renderInline(value) {
  const source = String(value);
  const token = /(`[^`\n]+`|\[[^\]\n]+\]\([^\s)]+\)|\*\*[^*\n]+\*\*)/g;
  let cursor = 0;
  let output = "";
  for (const match of source.matchAll(token)) {
    output += escapeHtml(source.slice(cursor, match.index));
    const raw = match[0];
    if (raw.startsWith("`")) {
      output += `<code>${escapeHtml(raw.slice(1, -1))}</code>`;
    } else if (raw.startsWith("[")) {
      const parsed = raw.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      output += `<a href="${escapeHtml(safeHref(parsed[2]))}">${escapeHtml(parsed[1])}</a>`;
    } else {
      output += `<strong>${escapeHtml(raw.slice(2, -2))}</strong>`;
    }
    cursor = match.index + raw.length;
  }
  output += escapeHtml(source.slice(cursor));
  return output;
}

function renderParagraph(lines) {
  return lines.map((line, index) => {
    const trailingSpaces = line.match(/ {2,}$/);
    const trailingBackslashes = line.match(/\\+$/);
    const backslashBreak = !trailingSpaces && trailingBackslashes && trailingBackslashes[0].length % 2 === 1;
    const hardBreak = Boolean(trailingSpaces || backslashBreak);
    const content = trailingSpaces
      ? line.slice(0, -trailingSpaces[0].length)
      : backslashBreak
        ? line.slice(0, -1)
        : line;
    const separator = index === lines.length - 1 ? "" : hardBreak ? "<br>\n" : " ";
    return `${renderInline(content.trim())}${separator}`;
  }).join("");
}

function slugify(value, used) {
  const base = String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";
  const count = used.get(base) || 0;
  used.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

function listMatch(line) {
  const match = line.match(/^(\s*)([-+*]|\d+[.)])\s+(.+)$/);
  if (!match) return null;
  return {
    indent: match[1].replaceAll("\t", "    ").length,
    ordered: /^\d/.test(match[2]),
    text: match[3]
  };
}

function renderList(lines, startIndex, baseIndent) {
  const first = listMatch(lines[startIndex]);
  const ordered = first.ordered;
  const tag = ordered ? "ol" : "ul";
  let index = startIndex;
  let output = `<${tag}>`;
  while (index < lines.length) {
    const item = listMatch(lines[index]);
    if (!item || item.indent < baseIndent || item.ordered !== ordered) break;
    if (item.indent > baseIndent) break;
    let content = renderInline(item.text);
    index += 1;
    while (index < lines.length) {
      const nested = listMatch(lines[index]);
      if (!nested || nested.indent <= baseIndent) break;
      const rendered = renderList(lines, index, nested.indent);
      content += rendered.html;
      index = rendered.nextIndex;
    }
    output += `<li>${content}</li>`;
  }
  output += `</${tag}>`;
  return { html: output, nextIndex: index };
}

function renderDocument(source, anchorPrefix) {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const usedSlugs = new Map();
  const headings = [];
  const blocks = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+?)\s*$/);
    if (heading) {
      const level = Math.min(6, heading[1].length + 1);
      const text = heading[2];
      const id = `${anchorPrefix}-${slugify(text, usedSlugs)}`;
      headings.push({ level, text, id });
      blocks.push(`<h${level} id="${escapeHtml(id)}">${renderInline(text)}</h${level}>`);
      index += 1;
      continue;
    }
    if (/^```/.test(line)) {
      const code = [];
      index += 1;
      while (index < lines.length && !/^```/.test(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }
    const list = listMatch(line);
    if (list) {
      const rendered = renderList(lines, index, list.indent);
      blocks.push(rendered.html);
      index = rendered.nextIndex;
      continue;
    }
    const paragraph = [line];
    index += 1;
    while (
      index < lines.length && lines[index].trim() &&
      !/^(#{1,6})\s+/.test(lines[index]) && !/^```/.test(lines[index]) &&
      !listMatch(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push(`<p>${renderParagraph(paragraph)}</p>`);
  }
  return { html: blocks.join("\n"), headings };
}

function renderToc(headings, labelId) {
  if (!headings.length) return "";
  return [
    `<nav class="toc" aria-labelledby="${escapeHtml(labelId)}">`,
    `<h2 id="${escapeHtml(labelId)}" data-i18n="legal.page.tableOfContents">Table of contents</h2>`,
    "<ol>",
    ...headings.map(heading => `<li><a href="#${escapeHtml(heading.id)}">${escapeHtml(heading.text)}</a></li>`),
    "</ol>",
    "</nav>"
  ].join("\n");
}

function sourceLink(filename) {
  return [
    `<a href="/legal/raw/${escapeHtml(filename)}" target="_blank" rel="noopener noreferrer">`,
    '<span data-i18n="legal.page.viewSource">View source document</span>',
    `<span aria-hidden="true">&nbsp;—&nbsp;</span><span>${escapeHtml(filename)}</span>`,
    "</a>"
  ].join("");
}

function fillTemplate(template, replacements, label) {
  let output = template;
  for (const [marker, value] of Object.entries(replacements)) {
    const token = `__${marker}__`;
    if (!output.includes(token)) throw new Error(`${label} template marker missing: ${token}`);
    output = output.replaceAll(token, value);
  }
  if (/__[A-Z0-9_]+__/.test(output)) throw new Error(`${label} template has unresolved markers.`);
  return output;
}

fs.mkdirSync(RAW_LEGAL_DIR, { recursive: true });
for (const [filename, expectedHash] of Object.entries(LEGAL_HASHES)) {
  const source = path.join(ROOT, filename);
  const legacyDestination = path.join(LEGAL_DIR, filename);
  const destination = path.join(RAW_LEGAL_DIR, filename);
  if (!fs.existsSync(source)) throw new Error(`Canonical legal document is missing: ${filename}`);
  const canonical = fs.readFileSync(source);
  if (sha256(canonical) !== expectedHash) throw new Error(`Canonical legal document hash changed: ${filename}`);
  if (fs.existsSync(legacyDestination)) {
    if (!fs.statSync(legacyDestination).isFile()) {
      throw new Error(`Legacy public legal path is not a file: ${filename}`);
    }
    fs.rmSync(legacyDestination);
  }
  fs.copyFileSync(source, destination);
  if (!canonical.equals(fs.readFileSync(destination))) {
    throw new Error(`Public legal copy differs from canonical ${filename}.`);
  }
}

for (const filePath of [HUB_TEMPLATE, DOCUMENT_TEMPLATE, INDEX_PATH, COMPACT_BRAND_DAY, COMPACT_BRAND_NIGHT]) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required Legal page input is missing: ${path.relative(ROOT, filePath)}`);
  }
}

const languageIndex = readJson(INDEX_PATH);
const languages = languageIndex.languages.filter(language => language.enabled === true);
const catalogs = Object.fromEntries(languages.map(language => {
  const source = readJson(path.join(ROOT, "site", "lang", `${language.code}.json`));
  if (source.meta?.version !== VERSION) throw new Error(`${language.code}: catalog version is not ${VERSION}.`);
  const subset = Object.fromEntries(REQUIRED_KEYS.map(key => {
    const value = source.translations?.[key];
    if (typeof value !== "string" || !value.trim()) throw new Error(`${language.code}:${key} missing.`);
    return [key, value];
  }));
  return [language.code, subset];
}));

const sharedData = {
  schemaVersion: 1,
  version: VERSION,
  defaultLanguage: languageIndex.defaultLanguage,
  languages: languages.map(({ code, nativeName, locale }) => ({ code, nativeName, locale })),
  catalogs
};
const encodeData = data => JSON.stringify(data).replace(/</g, "\\u003c");
const dayLogo = namespaceSvgIds(fs.readFileSync(COMPACT_BRAND_DAY, "utf8").trim(), "legal-day");
const nightLogo = namespaceSvgIds(fs.readFileSync(COMPACT_BRAND_NIGHT, "utf8").trim(), "legal-night");

const hub = fillTemplate(fs.readFileSync(HUB_TEMPLATE, "utf8"), {
  LEGAL_DATA: encodeData(sharedData),
  COMPACT_BRAND_DAY: dayLogo,
  COMPACT_BRAND_NIGHT: nightLogo,
  VERSION
}, "Legal hub");
fs.writeFileSync(HUB_OUTPUT, hub, "utf8");

const documentTemplate = fs.readFileSync(DOCUMENT_TEMPLATE, "utf8");
for (const document of DOCUMENTS) {
  let articleContent;
  if (document.licenseSelector) {
    const english = renderDocument(fs.readFileSync(path.join(ROOT, "LICENSE"), "utf8"), "en");
    const italian = renderDocument(fs.readFileSync(path.join(ROOT, "LICENSE.it.md"), "utf8"), "it");
    articleContent = [
      '<div class="license-control">',
      '<label for="licenseTextSelect" data-i18n="legal.page.licenseText">License text</label>',
      '<select id="licenseTextSelect">',
      '<option value="en" data-i18n="legal.documents.licenseEnglish">LoadComposer Community License 1.0 — controlling English text</option>',
      '<option value="it" data-i18n="legal.documents.licenseItalian">LoadComposer Community License 1.0 — informational Italian translation</option>',
      "</select>",
      "</div>",
      '<p class="legal-note" data-license-note="en" data-i18n="legal.notice.controlling">LICENSE is the controlling English legal text.</p>',
      '<p class="legal-note" data-license-note="it" data-i18n="legal.notice.translation" hidden>LICENSE.it.md is provided only as an informational Italian translation.</p>',
      `<section class="document-panel" data-license-panel="en">${renderToc(english.headings, "tocTitleEn")}<div class="prose" lang="en" data-source-file="LICENSE" data-source-sha256="${LEGAL_HASHES.LICENSE}">${english.html}</div></section>`,
      `<section class="document-panel" data-license-panel="it" hidden>${renderToc(italian.headings, "tocTitleIt")}<div class="prose" lang="it" data-source-file="LICENSE.it.md" data-source-sha256="${LEGAL_HASHES["LICENSE.it.md"]}">${italian.html}</div></section>`
    ].join("\n");
  } else {
    const filename = document.sources[0];
    const rendered = renderDocument(fs.readFileSync(path.join(ROOT, filename), "utf8"), document.route);
    articleContent = `<section class="document-panel"><div class="prose" lang="${document.bodyLanguage}" data-source-file="${escapeHtml(filename)}" data-source-sha256="${LEGAL_HASHES[filename]}">${rendered.html}</div></section>`;
  }

  const pageData = encodeData({
    ...sharedData,
    page: {
      route: document.route,
      titleKey: document.titleKey,
      fallbackTitle: document.fallbackTitle,
      sources: document.sources,
      licenseSelector: Boolean(document.licenseSelector)
    }
  });
  const page = fillTemplate(documentTemplate, {
    PAGE_TITLE: escapeHtml(`${document.fallbackTitle} — LoadComposer`),
    PAGE_HEADING: escapeHtml(document.fallbackTitle),
    PAGE_DESCRIPTION: escapeHtml(document.fallbackDescription),
    CANONICAL_URL: `https://loadcomposer.com/legal/${document.route}/`,
    VERSION,
    PAGE_DATA: pageData,
    TITLE_KEY: document.titleKey,
    ARTICLE_CONTENT: articleContent,
    SOURCE_LINKS: document.sources.map(sourceLink).join("\n"),
    COMPACT_BRAND_DAY: dayLogo,
    COMPACT_BRAND_NIGHT: nightLogo
  }, `Legal ${document.route}`);
  const outputDirectory = path.join(LEGAL_DIR, document.route);
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(path.join(outputDirectory, "index.html"), page, "utf8");
}

console.log(
  `Legal UX PASS: ${languages.length} shell languages, ${DOCUMENTS.length} static document routes, ` +
  `${Object.keys(LEGAL_HASHES).length}/${Object.keys(LEGAL_HASHES).length} byte-identical canonical sources.`
);
