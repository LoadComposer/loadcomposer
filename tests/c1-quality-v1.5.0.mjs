// Regression contract for the C1 joint search; Astra remains an external oracle.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {harness,root,fixture} from './hotfix-v01-harness-v1.5.0.mjs';
import {verify} from './fixtures/astra-v01/tools/checker.mjs';
const ad=await harness(),rows=[];
const signature=r=>JSON.stringify({floor:r.layout.rects.map(x=>[x.id,x.x,x.y,x.length,x.width,x.rotated]),stacks:r.stacks?.map(s=>s.layers.map(x=>[x.id,x.rotated])),unplaced:r.layout.unplaced.map(x=>x.id)});
try{
 const names=fs.readdirSync(path.join(root,'tests/fixtures/astra-v01/counterexamples')).filter(name=>/^(minimal-)?(quality-|targeted-)/.test(name));
 assert.equal(names.length,22);
 for(const name of names){
  const d=fixture(name),out=ad.solve(d.test),r=out.result;
  assert.equal(r.validation.valid,true,name);assert.equal(verify(d.test,r).valid,true,name);
  assert.deepEqual([r.placedCount,r.layout.count],[d.oracle.placed,d.oracle.floor],name);
  for(let repeat=0;repeat<2;repeat++)assert.equal(signature(ad.solve(d.test).result),signature(r),name);
  rows.push({file:name,placed:r.placedCount,floor:r.layout.count,valid:true});
 }
 // Full-floor remains an immediate, unstacked fast path.
 const allFloor=fixture('minimal-targeted-placed-T0344.json').test;
 allFloor.container.innerLength=10;allFloor.container.innerWidth=10;allFloor.container.doorWidth=10;
 const fast=ad.solve(allFloor);assert.equal(fast.raw.diagnostics.strategies,0);assert.equal(fast.raw.used,false);assert.equal(fast.result.layout.count,4);
 // Explicit work budgets are deterministic, including budget exhaustion.
 const stress=fixture('quality-floor-O0155.json').test;
 stress.container.innerLength=800;stress.container.innerWidth=800;stress.container.doorWidth=800;
 stress.input.types.forEach(t=>{t.quantity=4;});stress.input.quantity=12;
 const a=ad.solve(stress),b=ad.solve(stress);assert.equal(signature(a.result),signature(b.result));
 if(a.raw.diagnostics.qualitySearch){assert.ok(a.raw.diagnostics.qualitySearch.chainVisits<=6000);assert.ok(a.raw.diagnostics.qualitySearch.placementVisits<=120000);}
 assert.equal(verify(stress,a.result).valid,true);
 fs.writeFileSync(path.join(root,'c1-quality-results-v1.5.0.json'),JSON.stringify({status:'PASS',original:17,reduced:5,determinismRepeats:2,fastPath:true,deterministicBudgets:true,rows},null,2)+'\n');
 console.log('PASS C1 quality: 17 original + 5 reduced oracle targets, independent validity, repeat determinism, full-floor fast path, bounded work');
}finally{ad.close();}
