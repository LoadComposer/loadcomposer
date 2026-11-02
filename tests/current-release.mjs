import fs from 'node:fs';
export const CURRENT_VERSION = fs.readFileSync(new URL('../VERSION', import.meta.url), 'utf8').trim();
export function currentReleasePath(template) {
  return template.replaceAll('loadcomposer-v1.5.0-standalone', `loadcomposer-v${CURRENT_VERSION}-standalone`);
}
