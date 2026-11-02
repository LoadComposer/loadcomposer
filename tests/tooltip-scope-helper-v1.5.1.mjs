import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const raw = fs.readFileSync(new URL('./fixtures/tooltip-refinement-v1.5.1-delta.json', import.meta.url));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
assert.equal(hash(raw), '563db26e339aa00a73fa3726efdf92c246c8769b1de44160d793df7173c85510');
export const tooltipDelta = JSON.parse(raw);
export function restoreInitialV151(file, text) {
  if (file === 'site/index.html') {
    for (const h of [...tooltipDelta.hunks].reverse()) {
      assert.equal(text.split(h.after).length, 2, 'approved tooltip UI hunk must occur once');
      text = text.replace(h.after, h.before);
    }
    assert.equal(hash(text), tooltipDelta.initialHtmlSha256, 'source outside final tooltip refinement changed');
  } else if (/^site\/lang\/[a-z]{2}\.json$/.test(file)) {
    const c = tooltipDelta.catalogs[file.split('/').at(-1).slice(0, -5)];
    if (!c) return text;
    const d = JSON.parse(text);
    for (const [key,value] of Object.entries(c.after)) assert.equal(d.translations[key], value);
    Object.assign(d.translations,c.before);
    text = JSON.stringify(d,null,2)+'\n';
    assert.equal(hash(text),c.initialSha256,'unrelated catalog content changed');
  }
  return text;
}
