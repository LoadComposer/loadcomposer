import chromiumBinary from "@sparticuz/chromium";
import { chromium } from "playwright-core";
import {
  chmodSync,
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  statSync
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createBrotliDecompress } from "node:zlib";
import tarFs from "tar-fs";

const BROWSER_VERSION = "149";
const executablePath = path.join(tmpdir(), `loadcomposer-chromium-${BROWSER_VERSION}`);
const browserSupportDir = path.join(
  tmpdir(),
  `loadcomposer-browser-support-${BROWSER_VERSION}`
);
const fontConfigDir = path.join(tmpdir(), "fonts");
const browserHome = path.join(browserSupportDir, "home");

async function extractTarBrotli(source, destination) {
  await pipeline(
    createReadStream(source),
    createBrotliDecompress(),
    tarFs.extract(destination, { chown: false })
  );
}

async function ensureBrowserFiles(projectDir) {
  const chromiumBinDir = path.resolve(
    projectDir,
    "node_modules/@sparticuz/chromium/bin"
  );
  mkdirSync(fontConfigDir, { recursive: true });
  mkdirSync(browserHome, { recursive: true });
  mkdirSync(path.join(browserHome, ".cache"), { recursive: true });

  if (!existsSync(executablePath) || statSync(executablePath).size === 0) {
    await pipeline(
      createReadStream(path.join(chromiumBinDir, "chromium.br")),
      createBrotliDecompress(),
      createWriteStream(executablePath, { mode: 0o700 })
    );
    chmodSync(executablePath, 0o700);
  }

  if (!existsSync(path.join(fontConfigDir, "fonts.conf"))) {
    await extractTarBrotli(
      path.join(chromiumBinDir, "fonts.tar.br"),
      fontConfigDir
    );
  }

  if (!existsSync(path.join(tmpdir(), "libGLESv2.so"))) {
    await extractTarBrotli(
      path.join(chromiumBinDir, "swiftshader.tar.br"),
      tmpdir()
    );
  }
}

export async function launchBrowser(projectDir) {
  await ensureBrowserFiles(projectDir);
  return chromium.launch({
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu"
    ],
    env: {
      ...process.env,
      FONTCONFIG_PATH: fontConfigDir,
      HOME: browserHome,
      XDG_CACHE_HOME: path.join(browserHome, ".cache")
    },
    headless: true
  });
}
