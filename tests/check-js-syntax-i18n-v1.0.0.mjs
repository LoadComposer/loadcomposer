import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const files = [
  "site/index.html",
  "site/downloads/loadcomposer-v1.3.0-standalone.html",
  "site/downloads/index.html",
  "site/legal/index.html",
  "site/404.html",
];

for (const relative of files) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  const scripts = [...source.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter((match) => !/\btype\s*=\s*["']application\/json["']/i.test(match[1]))
    .map((match) => match[2]);

  const minimum = relative === "site/index.html" || relative.includes("standalone") ? 4 : 2;
  if (scripts.length < minimum) {
    throw new Error(`${relative}: attesi almeno ${minimum} script eseguibili, trovati ${scripts.length}`);
  }

  scripts.forEach((script, index) => {
    new vm.Script(script, { filename: `${relative}:script-${index + 1}` });
  });
  console.log(`PASS ${relative}: ${scripts.length} script validi`);
}
