import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {harness,root,fixture} from './hotfix-v01-harness-v1.5.0.mjs';
import {verify} from './fixtures/astra-v01/tools/checker.mjs';
import {performanceCases} from './fixtures/astra-v01/tools/performance-cases.mjs';
const original=process.env.LC_HOTFIX_BASELINE;
if(!original)throw Error('Set LC_HOTFIX_BASELINE to the admitted original standalone HTML');
assert.equal(crypto.createHash('sha256').update(fs.readFileSync(original)).digest('hex'),'5dd50700e14857201f2f0e1a55489b263669392d388925152242dc506f87841f');
const baseline=await harness(original),current=await harness();
const signature=result=>JSON.stringify({layout:result.layout,stacks:result.stacks,placedCount:result.placedCount,
  floorPlacedCount:result.floorPlacedCount,stackedCount:result.stackedCount,maxLayersUsed:result.maxLayersUsed,mixedGroupStacks:result.mixedGroupStacks});
const quality=[],performanceRows=[];
try {
  const names=fs.readdirSync(path.join(root,'tests/fixtures/astra-v01/counterexamples')).filter(n=>/^(?:quality-|targeted-)/.test(n));
  assert.equal(names.length,17);
  for(const name of names){
    const c=fixture(name),a=baseline.solve(c.test),b=current.solve(c.test);
    const rank=r=>[r.placedCount,r.layout.count,-(r.maxLayersUsed||1),-(r.mixedGroupStacks||0)];
    const left=rank(b.result),right=rank(a.result);let comparison=0;
    for(let k=0;k<left.length&&!comparison;k++)comparison=Math.sign(left[k]-right[k]);
    assert.ok(comparison>=0,`${name}: C1 quality regression`);
    assert.equal(verify(c.test,b.result).valid,true);assert.equal(verify(c.test,c.witness).valid,true);
    assert.equal(b.result.placedCount,c.oracle.placed);assert.equal(b.result.layout.count,c.oracle.floor);
    if(b.result.stacks)assert.equal(current.w.loadComposerAdvancedStackingValidator.validate(b.result).valid,true);
    quality.push({id:c.test.id,file:name,placed:b.result.placedCount,floor:b.result.layout.count,
      referencePlaced:c.oracle.placed,referenceFloor:c.oracle.floor,qualityNotWorse:true,valid:true,blocking:false});
  }
  for(const test of performanceCases()){
    const samples={baseline:[],hotfix:[]},solvers={baseline:[],hotfix:[]},validators={baseline:[],hotfix:[]};const expected={};
    for(let run=0;run<3;run++)for(const [name,ad] of (run%2?[['hotfix',current],['baseline',baseline]]:[['baseline',baseline],['hotfix',current]])){
      const start=performance.now(),out=ad.solve(test),total=performance.now()-start;
      if(out.result.stacks)assert.equal(ad.w.loadComposerAdvancedStackingValidator.validate(out.result).valid,true,`${name}/${test.id}`);
      assert.equal(verify(test,out.result).valid,true,`${name}/${test.id}: independent`);
      const sig=signature(out.result);if(expected[name])assert.equal(sig,expected[name],`${name}/${test.id}/run${run}`);else expected[name]=sig;
      const vstart=performance.now();if(out.result.stacks)ad.w.loadComposerAdvancedStackingValidator.validate(out.result);const validation=performance.now()-vstart;
      samples[name].push(total);solvers[name].push(out.raw.diagnostics.solverMs);validators[name].push(validation);
    }
    const median=a=>a.toSorted((a,b)=>a-b)[1];
    const row={id:test.id,pallets:500,runsPerVersion:3,totalMs:samples,solverMs:solvers,validatorMs:validators,
      medianTotal:{baseline:median(samples.baseline),hotfix:median(samples.hotfix)},deterministicPerVersion:true};
    // Runtime is shared: flag the practical material regression gate, retain all samples.
    row.performanceGate=median(samples.hotfix)<=median(samples.baseline)*1.5+20?'PASS':'FAIL';
    assert.equal(row.performanceGate,'PASS',`${test.id}: material runtime regression`);performanceRows.push(row);
  }
  fs.writeFileSync(path.join(root,'hotfix-v01-v1.5.0/nonregression-results.json'),JSON.stringify({status:'PASS',quality,
    performance:performanceRows,notes:'C1: 17 original quality counterexamples recovered; baseline is the admitted V-01 hotfix. Original witness retained; expanded C1 campaigns are separate. 12 audit profiles x 3 runs x 2 versions = 72 measurements. Shared host, not a new 30-run P95 campaign.'},null,2)+'\n');
  console.log('PASS nonregression: 17 recovered heuristic counterexamples; 12 x 500-pallet profiles, 72 paired measurements, deterministic geometry, independent checker');
}finally{baseline.close();current.close();}
