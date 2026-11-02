import {tooltipDelta} from './tooltip-scope-helper-v1.5.1.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {gapDelta,restoreV150} from './pallet-gap-scope-helper-v1.5.1.mjs';
import {CURRENT_VERSION} from './current-release.mjs';
const ROOT=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p));
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
assert.equal(CURRENT_VERSION,'1.5.1');
const restored=restoreV150('site/index.html',read('site/index.html').toString());
assert.equal(hash(restored),gapDelta.sourceSha256);
const scripts=s=>[...s.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
const currentSource=read('site/index.html').toString();
assert.equal(currentSource.split(tooltipDelta.uiOnlyJavascriptLine).length,2);
assert.deepEqual(scripts(currentSource.replace(tooltipDelta.uiOnlyJavascriptLine,'')),scripts(restored),'only the admitted native-popover close instruction may differ in JavaScript');
const frozen=[];
for(const [file,expected] of Object.entries(gapDelta.baselineHashes)) {
  if(file.endsWith('.js')||file.startsWith('site/downloads/loadcomposer-')||file.startsWith('docs/translations/')) {
    assert.equal(hash(read(file)),expected,file+' historical/computation bytes changed');frozen.push(file);
  }
}
for(const code of ['it','en','de','es','fr','pt','nl']) restoreV150(`site/lang/${code}.json`,read(`site/lang/${code}.json`).toString());
restoreV150('package-lock.json',read('package-lock.json').toString());
const standalone=read(`site/downloads/loadcomposer-v${CURRENT_VERSION}-standalone.html`);
assert.equal(read(`site/downloads/loadcomposer-v${CURRENT_VERSION}-standalone.html.sha256`).toString().split(/\s+/)[0],hash(standalone));
const zip=read(`site/downloads/loadcomposer-v${CURRENT_VERSION}-standalone.zip`);
assert.equal(read(`site/downloads/loadcomposer-v${CURRENT_VERSION}-standalone.zip.sha256`).toString().split(/\s+/)[0],hash(zip));
assert.ok(standalone.includes(Buffer.from('id="gapHelp" popover="auto"')));
fs.writeFileSync(path.join(ROOT,'pallet-gap-scope-results-v1.5.1.json'),JSON.stringify({pass:true,baseline:gapDelta.baseline,version:CURRENT_VERSION,uiHunks:gapDelta.hunks.length,applicationJsIdenticalExceptPopoverClose:true,uiOnlyJavascriptLine:tooltipDelta.uiOnlyJavascriptLine.trim(),dependencyGraphIdentical:true,frozen,standaloneSha256:hash(standalone),zipSha256:hash(zip)},null,2)+'\n');
console.log('Pallet gap scope PASS: only admitted CSS/markup/version/catalog delta; one UI-only popover close instruction admitted; computational assets, dependencies and historical downloads frozen');
