import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = path.resolve(TEST_DIR, "..");
const appPath = path.resolve(
  PROJECT_DIR,
  process.env.LOADCOMPOSER_HTML || "site/index.html"
);
const html = fs.readFileSync(appPath, "utf8");
const match = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/i);

if (!match) {
  throw new Error(`Script applicativo non trovato in ${appPath}`);
}

const temporaryPath = path.join(
  os.tmpdir(),
  `loadcomposer-${process.pid}-${Date.now()}.js`
);

try {
  fs.writeFileSync(temporaryPath, match[1], "utf8");
  const result = spawnSync(process.execPath, ["--check", temporaryPath], {
    encoding: "utf8"
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) process.exit(result.status ?? 1);

  console.log(`Sintassi JavaScript valida: ${path.basename(appPath)}`);
} finally {
  fs.rmSync(temporaryPath, { force: true });
}
