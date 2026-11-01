import assert from 'node:assert/strict';
import fs from 'node:fs';import {restoreC4c} from './c4e-scope-helper.mjs';
import {ROOT,sha,save} from './c4a-helpers-v1.5.0.mjs';
const read=p=>restoreC4c(p,fs.readFileSync(ROOT+'/'+p,'utf8')),reference=JSON.parse(read('polish-c4a-v1.5.0/fixtures/scope.json'));
// The C4a document-scope regression must follow the published C4e status.
// Preserve all historical and application-source hash checks below.
const releaseUrl='https://github.com/LoadComposer/loadcomposer/releases/tag/v1.5.0';
const currentDocs=['README.md','README.it.md','docs/DEPLOYMENT.md','CHANGELOG.md'];
for(const file of currentDocs){
 const current=read(file).split('## [1.3.5]')[0];
 assert.ok(current.includes('1.5.0'),file+' missing version');
 assert.ok(current.includes('C4e'),file+' missing final C4e status');
 assert.ok(/2026-11-01|1 novembre 2026/i.test(current),file+' missing publication date');
 assert.ok(current.includes(releaseUrl),file+' missing official release link');
 assert.ok(/published|pubblicat[ao]|deployed/i.test(current),file+' missing published state');
 assert.ok(!/not yet published|not yet recorded|has not yet occurred|deployment pending|no production deployment|non ancora pubblicata|non è ancora stato eseguito/i.test(current),file+' has obsolete pre-publication status');
 assert.ok(!/loadcomposer-v1\.[0-4]\.\d+-standalone/.test(current),file+' current references stale');
}
for(const ext of ['html','zip'])assert.ok(fs.existsSync(ROOT+'/site/downloads/loadcomposer-v1.5.0-standalone.'+ext));
assert.equal(sha(Buffer.from(read('CHANGELOG.md').split('## [1.3.5]')[1])),reference.historyHash,'historical changelog modified');
for(const [file,hash] of Object.entries(reference.frozen))assert.equal(sha(fs.readFileSync(ROOT+'/'+file)),hash,file+' changed');
let source=read('site/index.html');const c4cCss=read('tests/fixtures/c4c-u02.css');assert.equal(source.split(c4cCss).length,2);source=source.replace(c4cCss,'');for(const patch of reference.patches){assert.equal(source.split(patch.after).length,2,'approved source hunk must occur once');source=source.replace(patch.after,patch.before);}assert.equal(sha(source),reference.source,'source outside C4a scope changed');
for(const [file,expected] of Object.entries(reference.catalogs)){
 const d=JSON.parse(read('site/lang/'+file));assert.deepEqual(d.meta??null,expected.meta);const unchanged=Object.fromEntries(Object.entries(d.translations||{}).filter(([k])=>!reference.allowedKeys.includes(k)));assert.equal(sha(JSON.stringify(unchanged)),expected.hash,file+' unrelated translation changed');
}
save('docs-scope',{pass:true,frozen:Object.keys(reference.frozen),sourceHunks:reference.patches.length,catalogKeysAllowed:reference.allowedKeys,historyPreserved:true});
console.log('C4a D01/scope PASS: published C4e docs, previous changelog, frozen JS/lock and unrelated translations');
