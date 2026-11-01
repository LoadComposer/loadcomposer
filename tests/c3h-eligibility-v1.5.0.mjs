import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {harness,root} from './hotfix-v01-harness-v1.5.0.mjs';
import {base,box,mixed,clone,reduce,dimensions} from '../operational-c3h-v1.5.0/tools/cases.mjs';
const qa=path.join(root,'operational-c3h-v1.5.0'),h=await harness(),old=await harness(path.join(qa,'fixtures/C3f.html')),rows=[];
const semantic=x=>JSON.parse(JSON.stringify(x,(k,v)=>/Ms$/.test(k)?undefined:v));
function check(id,r,complete,eligible,internal=false){h.w.validateAdvancedOperationalResult(r);const actual=dimensions(h.w,r);assert.equal(actual.geometryValid,!internal,id+' geometry');assert.equal(actual.loadComplete,complete,id+' complete');assert.equal(actual.operationallyEligible,eligible,id+' eligible');assert.equal(actual.printAllowed,eligible,id+' print');assert.equal(r.validation.internalError,internal,id+' internal');rows.push({id,...actual,placed:r.placedCount,requested:h.w.requestedPalletCount(r),stacks:r.stacks?.map(s=>s.layers.length)});return actual;}
try{
 for(const family of ['single','mixed-floor']){const f=JSON.parse(fs.readFileSync(path.join(qa,'fixtures/G01-'+family+'.json')));const r=clone(f);if(r.mode==='single')r.loadLayout=r.layout;const v=h.w.validateResultGeometry(r);assert.equal(v.valid,true);check('C3g-exact-'+family,r,false,false);}
 for(const quantity of [1,2,13,500])for(const stale of ['success','negative','contradictory']){
  const i={...clone(base),quantity},b={...box,innerLength:quantity*1000};let r=h.w.loadComposerComputationCore.one(i,b);check('single-complete-'+quantity,r,true,true);
  r.ok=false;r.validation={valid:false,internalError:true};r.validationError=true;r.fitsQtyBySpace=false;check('single-negative-flags-'+quantity,r,true,true);
  reduce(r);if(stale==='negative')r.ok=false;if(stale==='contradictory'){r.fitsQtyBySpace=true;r.validation={valid:false,internalError:true};}
  check('single-reduce-'+quantity+'-'+stale,r,false,false,quantity===1);if(quantity>1)assert.equal(r.fitsQtyBySpace,false);
 }
 for(const q of [1,2,13,99,500])for(const homogeneous of [true,false]){
  const i=mixed(q);if(!homogeneous)i.types[1].length=900;let r=h.w.loadComposerComputationCore.one(i,{...box,innerLength:q*1000});
  check('mixed-complete-'+q+'-'+homogeneous,r,true,true);reduce(r);r.allPlaced=true;r.fitsQtyBySpace=true;check('mixed-reduce-'+q+'-'+homogeneous,r,false,false);assert.equal(r.allPlaced,false);assert.equal(r.fitsQtyBySpace,false);
 }
 // Healthy cross-version comparison includes operational outcome and all metadata except timings.
 for(const stackable of [false,true])for(const maxLayers of [1,2,3])for(const quantity of [1,2,13,99,120,500])for(const span of [1000,3000,500000]){
  const i={...clone(base),quantity,stackable,maxLayers},b={...box,innerLength:span};const r=h.w.loadComposerComputationCore.one(clone(i),clone(b)),o=old.w.loadComposerComputationCore.one(clone(i),clone(b));
  assert.deepEqual(semantic(r),semantic(o),'single producer unchanged');r.ok=o.ok=r.placedCount===quantity;h.w.validateAdvancedOperationalResult(r);old.w.validateAdvancedOperationalResult(o);assert.deepEqual(semantic(r),semantic(o),'single healthy contract');
  check('healthy-single-'+[stackable,maxLayers,quantity,span].join('-'),r,r.placedCount===quantity,r.placedCount===quantity);
 }
 for(const advanced of [false,true])for(const quantity of [2,4,6,13,99,120,500])for(const length of [1000,2000,500000]){
  const i=mixed(quantity,advanced),b={...box,innerLength:length};const r=h.w.loadComposerComputationCore.one(clone(i),clone(b)),o=old.w.loadComposerComputationCore.one(clone(i),clone(b));
  assert.deepEqual(semantic(r),semantic(o),'mixed producer unchanged');r.ok=o.ok=r.placedCount===quantity;h.w.validateAdvancedOperationalResult(r);old.w.validateAdvancedOperationalResult(o);assert.deepEqual(semantic(r),semantic(o),'mixed healthy contract');
  check('healthy-mixed-'+[advanced,quantity,length].join('-'),r,r.placedCount===quantity,r.placedCount===quantity);
  if(r.placedCount===quantity){const stacks=!!r.stacks;reduce(r);r.allPlaced=true;r.fitsQtyBySpace=true;check('mixed-partial-'+[advanced,stacks,quantity,length].join('-'),r,false,false);}
 }
 for(const family of ['single','mixed']){
  let r=h.w.loadComposerComputationCore.one(family==='single'?clone(base):mixed(),{...box,doorWidth:900});r.ok=true;check('complete-access-failure-'+family,r,true,false);
  r=h.w.loadComposerComputationCore.one(family==='single'?clone(base):mixed(),clone(box));r.ok=true;r.layout.rects[1].x=0;check('corrupt-positive-'+family,r,true,false,true);
 }
 {const r=h.w.loadComposerComputationCore.one({...clone(base),pallet:{...base.pallet,length:50000}},box);check('healthy-empty',r,false,false);}
 for(const field of ['input','container','layout']){const r=h.w.loadComposerComputationCore.one(clone(base),clone(box));delete r[field];assert.doesNotThrow(()=>h.w.isOperationalPrintAvailable(r));assert.equal(r.ok,false);assert.equal(r.validation.internalError,true);rows.push({id:'missing-'+field,geometryValid:false,loadComplete:null,operationallyEligible:false,printAllowed:false});}
 // No geometry duplication: the operational predicate only consumes fresh validation.
 const source=fs.readFileSync(path.join(root,'site/index.html'),'utf8');assert.ok(!source.includes('result.ok = result.ok === true && result.validation.valid'));
 fs.writeFileSync(path.join(qa,'results/contracts.json'),JSON.stringify({status:'PASS',rows},null,2));console.log('C3h contracts PASS',rows.length);
}finally{h.close();old.close();}
