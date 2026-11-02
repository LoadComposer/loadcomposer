import {restoreInitialV151} from './tooltip-scope-helper-v1.5.1.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const raw = fs.readFileSync(new URL('./fixtures/pallet-gap-v1.5.1-delta.json', import.meta.url));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
assert.equal(hash(raw), '894b79d5a6a6fa74f631c2b6348b8de7e244a330d299edbe783240568e3acc7b');
export const gapDelta = JSON.parse(raw);
export function restoreV150(file, text) {
  text = restoreInitialV151(file,text);
  if (file === 'site/index.html') {
    for (const h of [...gapDelta.hunks].reverse()) {
      assert.equal(text.split(h.after).length - 1, h.count, 'v1.5.1 approved hunk occurrence');
      text = text.replaceAll(h.after, h.before);
    }
    assert.equal(hash(text), gapDelta.sourceSha256, 'source outside the gap/version delta changed');
  } else if (/^site\/lang\/[a-z]{2}\.json$/.test(file)) {
    const code = file.split('/').at(-1).slice(0, -5), c = gapDelta.catalogs[code];
    if (!c) return text;
    const d = JSON.parse(text);
    assert.equal(d.meta.version, '1.5.1');
    for (const [key,value] of Object.entries(c.after)) assert.equal(d.translations[key], value);
    d.meta = c.beforeMeta;
    Object.assign(d.translations, c.before);
    text = JSON.stringify(d, null, 2) + '\n';
    assert.equal(hash(text), gapDelta.baselineHashes[file], 'unrelated translation changed');
  } else if (file === 'package-lock.json') {
    const d = JSON.parse(text);
    assert.equal(d.version, '1.5.1'); assert.equal(d.packages[''].version, '1.5.1');
    d.version = d.packages[''].version = '1.5.0';
    text = JSON.stringify(d, null, 2) + '\n';
    assert.equal(hash(text), gapDelta.baselineHashes[file], 'dependency graph changed');
  }
  return text;
}
