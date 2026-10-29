import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {harness,root} from './hotfix-v01-harness-v1.5.0.mjs';
import {verify} from './fixtures/astra-v01/tools/checker.mjs';
const ad=await harness(),rows=[];
try {
 for(const [name,target] of [['original',[10,7]],['reduced',[7,7]],['cost',[7,7]]]) {
  const test=JSON.parse(fs.readFileSync(path.join(root,`tests/fixtures/c1b/${name}.json`)));
  for(const transpose of [false,true]) {
  const subject=structuredClone(test);
  if(transpose){[subject.container.innerLength,subject.container.innerWidth]=[subject.container.innerWidth,subject.container.innerLength];subject.container.doorWidth=subject.container.innerWidth;subject.input.types.forEach(t=>{[t.length,t.width]=[t.width,t.length];});}
  let signature;
  for(let repeat=0;repeat<3;repeat++) {
   const out=ad.solve(subject),r=out.result,s=out.raw.diagnostics.qualitySearch;
   assert.equal(r.validation.valid,true,name);assert.equal(verify(subject,r).valid,true,name);
   assert.deepEqual([r.placedCount,r.layout.count],target,name);
   const next=JSON.stringify({rects:r.layout.rects,stacks:r.stacks,unplaced:r.layout.unplaced});
   if(signature)assert.equal(next,signature,name);signature=next;
   assert.ok(s.chainVisits<=6000);assert.ok(s.placementVisits<=120000);assert.ok(s.systematicVisits<=60000);
   if(name==='cost'){assert.equal(s.reason,'proved-uniform-singletons');assert.equal(s.uniformCapacity,7);assert.equal(s.placementVisits,0);assert.equal(s.systematicVisits,0);}
   if(!repeat)rows.push({name,transpose,target,valid:true,search:s});
  }
  }
 }
 fs.writeFileSync(path.join(root,'c1b-quality-results-v1.5.0.json'),JSON.stringify({status:'PASS',deterministicRepeats:3,structuralPerformanceGate:true,rows},null,2)+'\n');
 console.log('PASS C1b H-03 original 10/7, reduced 7/7, uniform structural performance gate, validity and determinism');
}finally{ad.close();}
