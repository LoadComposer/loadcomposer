import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';
import {harness,root,fixture,clone} from './hotfix-v01-harness-v1.5.0.mjs';
import {verify} from './fixtures/astra-v01/tools/checker.mjs';
import {exact,witness} from './fixtures/astra-v01/tools/oracle.mjs';
const ad=await harness(),w=ad.w,rows=[];
const prod=w.loadComposerAdvancedStackingValidator;
let calls=0,last;
w.loadComposerAdvancedStackingValidator={validate(result){calls++;last=result;return prod.validate(result);}};
function flags(r){
  const general=w.validateResultGeometry(r);
  r.validation=general;r.validationError=general.internalError;r.okDoor=general.okDoor;r.okHeight=general.okHeight;
  r.ok=r.placedCount===r.input.types.reduce((a,t)=>a+t.quantity,0)&&general.valid;
  return r;
}
function check(id,result,{independent=true}={}){
  const r=clone(result),before=clone(r),start=calls;
  const advanced=w.loadComposerAdvancedStackingValidator.validate(r);
  assert.equal(last,r,`${id}: mutation failed to reach validator`);
  assert.equal(calls,start+1);assert.equal(advanced.valid,false,id);
  assert.ok(advanced.errors.length);assert.deepEqual(r,before,`${id}: validator mutated its argument`);
  const own=verify({input:r.input,container:r.container},r);
  if(independent)assert.equal(own.valid,false,`${id}: independent checker did not reject`);
  const general=w.validateResultGeometry(r);
  // Deliberately stale successful operational flags must not bypass validation.
  r.validation={...general,valid:true,internalError:false};r.validationError=false;r.ok=true;
  assert.equal(w.isOperationalPrintAvailable(r),false,`${id}: stale print gate`);
  assert.equal(r.ok,false);assert.equal(r.validationError,true);assert.equal(r.advancedValidation.valid,false);
  rows.push({id,validatorReached:true,independentValid:own.valid,generalValid:general.valid,
    advancedValid:advanced.valid,printAvailable:false,errors:advanced.errors.map(e=>e.code)});
}
try {
  const minimal=fixture('minimal-validator-copy.json');
  assert.equal(w.loadComposerAdvancedStackingValidator.validate(minimal.valid).valid,true);
  assert.equal(verify(minimal.test,minimal.valid).valid,true);
  check('minimal-validator-copy',minimal.bad);
  for(const name of ['stack-copy-outside','stack-copy-negative','stack-copy-overlap','infinite-stack-coordinate']){
    const c=fixture(`validator-${name}.json`),valid=witness(c.originalTest,exact(c.originalTest));
    assert.equal(w.loadComposerAdvancedStackingValidator.validate(valid).valid,true,`${name}: initial case`);
    assert.equal(verify(c.originalTest,valid).valid,true);
    const bad=clone(c.result);
    if(name==='infinite-stack-coordinate'){
      bad.stacks[0].rect.x=Infinity;bad.stacks[0].layers.forEach(layer=>layer.x=Infinity);
    }
    check(`validator-${name}`,bad);
  }
  const c=fixture('probe-maxLayers-via-stack-copy-type.json'),t=clone(c.test);
  t.input.types[0].maxLayers=2;
  const valid=witness(t,exact(t));
  assert.equal(prod.validate(valid).valid,true);assert.equal(verify(t,valid).valid,true);
  const max=clone(valid);max.input.types[0].maxLayers=1;max.stacks[0].rect.typeIndex=1;
  assert.deepEqual(max,c.result,'must recreate the original Astra maxLayers probe');
  check('maxLayers-via-stack-copy-type',max);
  assert.ok(prod.validate(max).errors.some(e=>e.code==='MAX_LAYERS_EXCEEDED'));
  const base=clone(minimal.valid);
  const operations=[
    ['copy-type',r=>r.stacks[0].rect.typeIndex=1],
    ['copy-unit',r=>r.stacks[0].rect.unitNo=2],
    ['copy-id',r=>r.stacks[0].rect.id='1.2'],
    ['copy-position',r=>r.stacks[0].rect.positionId='P02'],
    ['floor-first-unit',r=>r.stacks[0].layers[0].unitNo=2],
    ['copy-x-string',r=>r.stacks[0].rect.x='0'],
    ['copy-x-null',r=>r.stacks[0].rect.x=null],
    ['copy-y-negative',r=>{r.stacks[0].rect.y=-1;r.stacks[0].layers.forEach(l=>l.y=-1);}],
    ['copy-length',r=>r.stacks[0].rect.length=2],
    ['copy-width',r=>r.stacks[0].rect.width=2],
    ['copy-rotation-square',r=>r.stacks[0].rect.rotated=true],
    ['upper-rotation-string-false',r=>r.stacks[0].layers[1].rotated='false'],
    ['upper-nan',r=>r.stacks[0].layers[1].x=NaN],
    ['copy-infinite-y',r=>r.stacks[0].rect.y=Infinity],
    ['canonical-nan',r=>r.layout.rects[0].x=NaN],
    ['canonical-infinity',r=>r.layout.rects[0].y=Infinity],
    ['coherent-outside',r=>{r.layout.rects[0].x=2;r.stacks[0].rect.x=2;r.stacks[0].layers.forEach(l=>l.x=2);}],
    ['coherent-negative',r=>{r.layout.rects[0].x=-1;r.stacks[0].rect.x=-1;r.stacks[0].layers.forEach(l=>l.x=-1);}],
    ['duplicate-floor',r=>r.layout.rects.push(clone(r.layout.rects[0]))],
    ['duplicate-stack',r=>r.stacks.push(clone(r.stacks[0]))],
    ['duplicate-layer',r=>r.stacks[0].layers[1]=clone(r.stacks[0].layers[0])],
    ['missing-stack',r=>r.stacks=[]],
    ['missing-layer',r=>r.stacks[0].layers.pop()],
    ['wrong-layer-number',r=>r.stacks[0].layers[1].layer=3],
    ['wrong-position-ref',r=>r.stacks[0].layers[1].positionId='P02'],
    ['wrong-floor-count',r=>r.floorPlacedCount++],
    ['wrong-total-count',r=>r.placedCount++],
    ['wrong-stacked-count',r=>r.stackedCount++],
    ['wrong-max-used',r=>r.maxLayersUsed++],
    ['wrong-mixed-count',r=>r.mixedGroupStacks++],
    ['wrong-layout-count',r=>r.layout.count++],
    ['wrong-id',r=>r.stacks[0].layers[1].id='1.999'],
    ['fractional-unit',r=>r.stacks[0].layers[1].unitNo=1.5],
    ['fractional-type',r=>r.stacks[0].layers[1].typeIndex=.5],
    ['string-type',r=>r.stacks[0].layers[1].typeIndex='0'],
    ['quantity-short',r=>r.input.types[0].quantity=1],
    ['negative-gap',r=>r.input.gap=-1],
    ['negative-vertical-gap',r=>{r.input.verticalGap=-1;r.stacks[0].height=1;}],
    ['nan-height',r=>r.stacks[0].height=NaN],
    ['infinite-type-height',r=>r.input.types[0].height=Infinity],
    ['inventory-duplicate',r=>r.layout.unplaced.push(clone(r.stacks[0].layers[1]))],
  ];
  for(const [id,mutate] of operations){const r=clone(base);mutate(r);check(id,r);}
  // Metadata checks are stricter than the original independent checker's schema.
  for(const [id,mutate] of [
    ['nominal-length-copy',r=>r.stacks[0].rect.originalLength=2],
    ['nominal-width-copy',r=>r.stacks[0].rect.originalWidth=2],
    ['height-copy',r=>r.stacks[0].rect.height=2],
    ['footprint-metadata-copy',r=>r.stacks[0].rect.footprintWidth=2],
    ['layout-index-copy',r=>r.stacks[0].rect.layoutIndex=99],
    ['missing-nominal-length',r=>delete r.stacks[0].layers[1].originalLength],
    ['null-floor',r=>r.layout.rects[0]=null],
    ['null-layer',r=>r.stacks[0].layers[0]=null],
    ['null-stack',r=>r.stacks[0]=null],
  ]){const r=clone(base);mutate(r);
    if(id.startsWith('null-')){const v=prod.validate(r);assert.equal(v.valid,false);rows.push({id,advancedValid:false,structural:true});}
    else check(id,r,{independent:false});
  }
  const decimals=fixture('probe-decimal-height-roundoff.json').result;
  const decimalCheck=prod.validate(decimals);assert.equal(decimalCheck.valid,false);
  assert.ok(decimalCheck.errors.some(e=>e.code==='INVALID_STACK_INPUT_TYPE'));
  rows.push({id:'decimal-height-roundoff',advancedValid:false,reason:'outside normalized integer-mm contract'});
  // Non-geometric presentation metadata and floor-vs-layer fields are allowed.
  const presentation=clone(base);presentation.stacks[0].rect.name='presentation';
  presentation.stacks[0].layers[0].layer=1;
  assert.equal(prod.validate(presentation).valid,true,'do not compare arbitrary complete objects');
  // The application must reject a corrupt engine return during calculateMixed.
  const engine=w.loadComposerAdvancedStacking;
  w.loadComposerAdvancedStacking={...engine,solve(){return {used:true,layout:clone(base.layout),stacks:clone(minimal.bad.stacks),
    placedCount:base.placedCount,floorPlacedCount:base.floorPlacedCount,stackedCount:base.stackedCount,
    maxLayersUsed:base.maxLayersUsed,mixedGroupStacks:base.mixedGroupStacks};}};
  w.calculateMixed(clone(base.input));
  const results=w.eval('lastResults');assert.ok(results.length>0);
  assert.ok(results.every(r=>r.validationError&&r.ok===false&&r.advancedValidation.valid===false));
  assert.equal(w.document.getElementById('printLayoutBtn').disabled,true);
  w.loadComposerAdvancedStacking=engine;
  assert.equal(ad.errors.length,0);
  fs.writeFileSync(path.join(root,'hotfix-v01-v1.5.0/targeted-results.json'),JSON.stringify({status:'PASS',count:rows.length,rows,
    initialValidCases:6,calculateMixedCorruptReturn:'rejected',presentationMetadata:'accepted'},null,2)+'\n');
  console.log(`PASS V-01/V-02: ${rows.length} cases, six Astra replays, real validator calls, stale print flags and calculateMixed gate`);
}finally{ad.close();}
