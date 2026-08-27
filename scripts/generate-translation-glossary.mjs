import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(SCRIPT_DIR, "..");
const LANG_DIR = path.join(PROJECT_DIR, "site", "lang");
const OUTPUT_DIR = path.join(PROJECT_DIR, "docs", "translations");
const IT_PATH = path.join(LANG_DIR, "it.json");
const TARGET_CODES = ["en", "de", "es", "fr", "pt", "nl"];
const VERSION = `v${fs.readFileSync(path.join(PROJECT_DIR, "VERSION"), "utf8").trim()}`;
const EXPECTED_COUNT = Object.keys(JSON.parse(fs.readFileSync(IT_PATH, "utf8")).translations).length;
const CHECK_ONLY = process.argv.includes("--check");

const CONTEXT_BY_PREFIX = {
  actions: "Comandi principali dell’applicazione",
  app: "Descrizione generale dell’applicazione",
  common: "Etichette e termini condivisi",
  footer: "Piè di pagina dell’applicazione",
  geometry: "Validazione geometrica e diagnostica dello schema",
  language: "Selettore e preferenze della lingua",
  legal: "Interfaccia della pagina Informazioni legali",
  layout: "Descrizione e calcolo della disposizione",
  load: "Sezione Dati carico",
  meta: "Metadati del documento",
  pallet: "Configurazione dei gruppi pallet",
  picker: "Menu di selezione del pallet",
  preset: "Nomi e descrizioni dei pallet predefiniti",
  preview: "Preview grafica, note operative e accessibilità",
  print: "Stampa operativa e modalità bianco e nero",
  results: "Metriche e intestazioni della sezione Risultato",
  rotation: "Orientamento e rotazione del pallet",
  space: "Valutazione degli spazi e avvertenze operative",
  status: "Stati sintetici di compatibilità",
  table: "Tabella comparativa dei mezzi",
  theme: "Selettore e preferenze del tema",
  validation: "Messaggi di validazione dei dati",
  vehicle: "Nomi e caratteristiche dei mezzi"
};

const NOTE_BY_PREFIX = {
  actions: "Verbo operativo; mantenere tono diretto e conciso.",
  app: "Testo descrittivo; privilegiare chiarezza operativa.",
  common: "Terminologia condivisa da mantenere coerente in tutta l’interfaccia.",
  footer: "Testo informativo non operativo.",
  geometry: "Terminologia tecnica di validazione; non semplificare il significato geometrico.",
  language: "Terminologia del selettore lingua e dei relativi stati.",
  legal: "Testo dell’interfaccia Legal; non modifica né traduce i documenti legali canonici.",
  layout: "Terminologia della disposizione e della capacità geometrica.",
  load: "Terminologia della configurazione del carico.",
  meta: "Nome prodotto e numero di versione invariati.",
  pallet: "Distinguere misura, tipo, gruppo, quantità e identità del pallet.",
  picker: "Terminologia del menu pallet e dello stato selezionato.",
  preset: "Denominazione del formato pallet; preservare misure e standard.",
  preview: "Testo mostrato nello schema o nelle note operative della preview.",
  print: "Testo destinato alla stampa; mantenere unità, concisione e leggibilità.",
  results: "Terminologia delle metriche e del riepilogo risultati.",
  rotation: "Distinguere orientamento, rotazione consentita e orientamento bloccato.",
  space: "Avvertenza operativa; preservare il livello di cautela del testo.",
  status: "Stato sintetico; mantenere maiuscole e brevità dove presenti.",
  table: "Etichetta o dettaglio della tabella comparativa.",
  theme: "Terminologia del selettore tema e dei relativi stati.",
  validation: "Messaggio di errore; preservare campo, limite e condizione.",
  vehicle: "Denominazione o specifica tecnica del mezzo."
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function placeholders(value) {
  return [...value.matchAll(/\{[A-Za-z0-9_.-]+\}/g)]
    .map(match => match[0])
    .sort();
}

function markdown(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, "<br>");
}

function contextFor(key) {
  return CONTEXT_BY_PREFIX[key.split(".")[0]] || "Interfaccia LoadComposer";
}

function noteFor(key, italian, translated) {
  const prefix = key.split(".")[0];
  const notes = [
    NOTE_BY_PREFIX[prefix] || "Mantenere coerenza con il contesto applicativo."
  ];
  const tokens = placeholders(italian);

  if (tokens.length > 0) {
    notes.push(`Segnaposto invariati: ${tokens.map(token => `\`${token}\``).join(", ")}.`);
  }
  if (italian === translated) {
    notes.push("Valore intenzionalmente identico all’italiano; verificato nell’allowlist.");
  }
  if (/\b(?:mm|m³|kg|CBM|13[,.]60|20['’]|40['’]|45['’])\b/i.test(`${italian} ${translated}`)) {
    notes.push("Preservare unità, sigle e valori tecnici.");
  }

  return notes.join(" ");
}

function generateGlossary(italianCatalog, targetCatalog, code) {
  const italian = italianCatalog.translations || {};
  const translated = targetCatalog.translations || {};
  const italianKeys = Object.keys(italian);
  const targetKeys = Object.keys(translated);

  if (italianKeys.length !== EXPECTED_COUNT || targetKeys.length !== EXPECTED_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_COUNT} translations per catalog, found it=${italianKeys.length}, ${code}=${targetKeys.length}.`
    );
  }
  if (
    new Set(italianKeys).size !== italianKeys.length ||
    new Set(targetKeys).size !== targetKeys.length
  ) {
    throw new Error(`Duplicate translation keys detected for ${code}.`);
  }
  if (
    italianKeys.some(key => !Object.hasOwn(translated, key)) ||
    targetKeys.some(key => !Object.hasOwn(italian, key))
  ) {
    throw new Error(`Italian and ${code} catalog keys do not match.`);
  }

  const rows = italianKeys.map(key => {
    const italianValue = italian[key];
    const translatedValue = translated[key];
    if (typeof italianValue !== "string" || typeof translatedValue !== "string") {
      throw new Error(`Non-string translation value for ${key} in ${code}.`);
    }
    if (
      JSON.stringify(placeholders(italianValue)) !==
      JSON.stringify(placeholders(translatedValue))
    ) {
      throw new Error(`Placeholder mismatch for ${key} in ${code}.`);
    }
    return [
      key,
      italianValue,
      translatedValue,
      contextFor(key),
      noteFor(key, italianValue, translatedValue)
    ];
  });

  const targetName = targetCatalog.meta?.name || code;
  const targetPath = path.join(LANG_DIR, `${code}.json`);
  const outputPath = path.join(
    OUTPUT_DIR,
    `TRANSLATION_GLOSSARY-it-${code}-${VERSION}.md`
  );
  const output = [
    `# LoadComposer — Glossario italiano/${targetName} ${VERSION}`,
    "",
    `Generato automaticamente dai cataloghi canonici \`lang/it.json\` e \`lang/${code}.json\`.`,
    "",
    `- Chiavi di traduzione: **${rows.length}**`,
    `- SHA-256 \`lang/it.json\`: \`${sha256(IT_PATH)}\``,
    `- SHA-256 \`lang/${code}.json\`: \`${sha256(targetPath)}\``,
    "- Ordine delle righe: ordine canonico di `lang/it.json`.",
    "- I segnaposto sono verificati automaticamente e coincidono nei due cataloghi.",
    "",
    `| Chiave | Italiano | ${targetName} | Contesto | Nota terminologica |`,
    "|---|---|---|---|---|",
    ...rows.map(columns => `| ${columns.map(markdown).join(" | ")} |`),
    ""
  ].join("\n");

  if (CHECK_ONLY) {
    if (!fs.existsSync(outputPath)) {
      throw new Error(`Generated glossary is missing for ${code}.`);
    }
    if (fs.readFileSync(outputPath, "utf8") !== output) {
      throw new Error(`Generated glossary does not match canonical ${code} JSON.`);
    }
  } else {
    fs.writeFileSync(outputPath, output, "utf8");
  }

  return rows.length;
}

const italianCatalog = readJson(IT_PATH);
for (const code of TARGET_CODES) {
  const targetCatalog = readJson(path.join(LANG_DIR, `${code}.json`));
  const count = generateGlossary(italianCatalog, targetCatalog, code);
  console.log(
    CHECK_ONLY
      ? `${code} glossary check: ${count}/${count} rows OK.`
      : `${code} glossary generated: ${count} translation rows.`
  );
}
