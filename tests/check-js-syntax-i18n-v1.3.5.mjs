import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = path.resolve(import.meta.dirname, "..");
const files = [
  "site/index.html",
  "site/downloads/loadcomposer-v1.3.5-standalone.html",
  "site/downloads/index.html",
  "site/legal/index.html",
  "site/legal/license/index.html",
  "site/legal/notices/index.html",
  "site/legal/trademarks/index.html",
  "site/legal/commercial/index.html",
  "site/legal/privacy/index.html",
  "site/legal/security/index.html",
  "site/404.html"
];

for (const relative of files) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  const scripts = [...source.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(match => !/\btype\s*=\s*["']application\/json["']/i.test(match[1]))
    .map(match => match[2]);
  const minimum = relative === "site/index.html" || relative.includes("standalone") ? 4 : 2;
  if (scripts.length < minimum) {
    throw new Error(`${relative}: expected at least ${minimum} executable scripts, found ${scripts.length}`);
  }
  scripts.forEach((script, index) => {
    new vm.Script(script, { filename: `${relative}:script-${index + 1}` });
  });
  console.log(`PASS ${relative}: ${scripts.length} valid scripts`);
}
