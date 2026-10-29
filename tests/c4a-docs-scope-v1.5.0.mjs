import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ROOT,sha,save} from './c4a-helpers-v1.5.0.mjs';
const read=p=>fs.readFileSync(ROOT+'/'+p,'utf8'),reference=JSON.parse(read('polish-c4a-v1.5.0/fixtures/scope.json'));
for(const file of ['README.md','README.it.md','docs/DEPLOYMENT.md','CHANGELOG.md']){
 const d=read(file);assert.ok(d.includes('1.5.0'));assert.ok(/candidate|candidata/i.test(d));assert.ok(/approval|approvazione|approved|approvat[oa]/i.test(d),file+' missing approval state');assert.ok(/unpublished|not been published|non ancora pubblicata|unreleased|not yet published|not yet recorded|has not yet occurred|non è ancora stato eseguito/i.test(d),file+' missing pre-publication state');
 assert.ok(!/loadcomposer-v1\.[0-4]\.\d+-standalone/.test(d.split('## [1.3.5]')[0]),file+' current references stale');
}
for(const ext of ['html','zip'])assert.ok(fs.existsSync(ROOT+'/site/downloads/loadcomposer-v1.5.0-standalone.'+ext));
assert.equal(sha(Buffer.from(read('CHANGELOG.md').split('## [1.3.5]')[1])),reference.historyHash,'historical changelog modified');
for(const [file,hash] of Object.entries(reference.frozen))assert.equal(sha(fs.readFileSync(ROOT+'/'+file)),hash,file+' changed');
let source=read('site/index.html');const c4cCss=read('tests/fixtures/c4c-u02.css');assert.equal(source.split(c4cCss).length,2);source=source.replace(c4cCss,'');for(const patch of reference.patches){assert.equal(source.split(patch.after).length,2,'approved source hunk must occur once');source=source.replace(patch.after,patch.before);}assert.equal(sha(source),reference.source,'source outside C4a scope changed');
for(const [file,expected] of Object.entries(reference.catalogs)){
 const d=JSON.parse(read('site/lang/'+file));assert.deepEqual(d.meta??null,expected.meta);const unchanged=Object.fromEntries(Object.entries(d.translations||{}).filter(([k])=>!reference.allowedKeys.includes(k)));assert.equal(sha(JSON.stringify(unchanged)),expected.hash,file+' unrelated translation changed');
}
save('docs-scope',{pass:true,frozen:Object.keys(reference.frozen),sourceHunks:reference.patches.length,catalogKeysAllowed:reference.allowedKeys,historyPreserved:true});
console.log('C4a D01/scope PASS: current candidate docs, previous changelog, frozen JS/lock and unrelated translations');
