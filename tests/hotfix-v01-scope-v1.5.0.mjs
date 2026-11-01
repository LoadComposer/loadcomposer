import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {harness,root} from './hotfix-v01-harness-v1.5.0.mjs';
const original=process.env.LC_HOTFIX_BASELINE;
if(!original)throw Error('LC_HOTFIX_BASELINE is required');
const originalBytes=fs.readFileSync(original);
assert.equal(crypto.createHash('sha256').update(originalBytes).digest('hex'),'5dd50700e14857201f2f0e1a55489b263669392d388925152242dc506f87841f');
const current=fs.readFileSync(path.join(root,'site/downloads/loadcomposer-v1.5.0-standalone.html'),'utf8');
const styles=s=>[...s.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]);
assert.deepEqual(styles(current),styles(originalBytes.toString('utf8')));
const a=await harness(original),b=await harness();
const functions=['bestMixedLayout','packItems','frontCompactSelectedLayout','seededShuffle','validateResultGeometry',
  'orientationAllowed','expectedRectDimensions','expandMixedItems','normalizeLengthToMm','validateAndReadInput',
  'calculateSingle','stackViewResult','drawSidePreview','drawRampPreview','getPrintSchemaDataUrl'];
try{
  for(const name of functions)assert.equal(b.w[name].toString(),a.w[name].toString(),name);
  for(const name of ['CONTAINERS','PALLET_PRESETS','MAX_TOTAL_PALLETS']){
    assert.equal(JSON.stringify(b.w.eval(name)),JSON.stringify(a.w.eval(name)),name);
  }
  const validator=fs.readFileSync(path.join(root,'site/advanced-stacking-validator.js'));
  assert.equal(crypto.createHash('sha256').update(validator).digest('hex'),'2f0e1733b0f1dd4ed57eed3fecf219cba68916daa5b698bb8906dae48e65ac4a');
  fs.writeFileSync(path.join(root,'hotfix-v01-v1.5.0/scope-freeze-results.json'),JSON.stringify({status:'PASS',unchangedFunctions:functions,
    unchangedData:['CONTAINERS','PALLET_PRESETS','MAX_TOTAL_PALLETS'],cssIdentical:true,validationGateOnlyChanges:['calculateMixed','renderTable','renderDrawOptions','renderStackViewOptions','isOperationalPrintAvailable','drawSelected','printCurrentLayout'],validatorSha256:'2f0e1733b0f1dd4ed57eed3fecf219cba68916daa5b698bb8906dae48e65ac4a',intentionalC1SolverChange:true},null,2)+'\n');
  console.log(`PASS scope freeze: ${functions.length} unchanged functions, vehicle/pallet data, CSS and V-01 validator hash`);
}finally{a.close();b.close();}
