import fs from 'node:fs';import assert from 'node:assert/strict';
import path from 'node:path';import {harness,root} from '../../tests/hotfix-v01-harness-v1.5.0.mjs';
const adapter=async()=>{const a=await harness();return {...a,validate:r=>{const general=a.w.validateResultGeometry(r),advanced=a.w.loadComposerAdvancedStackingValidator.validate(r);return {general,advanced,valid:general.valid&&advanced.valid};}};};import {exact,witness} from '../vendor/oracle.mjs';import {verify} from '../vendor/checker.mjs';
const clone=structuredClone;const ad=await adapter(),test={id:'validator-seed',container:{id:'mut-box',innerLength:200,innerWidth:100,innerHeight:300,doorWidth:100,doorHeight:300,accessKnown:true},input:{mode:'mixed',advancedStacking:true,quantity:4,gap:0,verticalGap:0,types:[0,1].map(i=>({typeIndex:i,name:`V${i}`,quantity:2,length:100,width:100,height:100,rotationMode:'locked',lockedOrientation:'normal',stackingEnabled:true,stackRole:i?'top':'base',maxLayers:i?1:2,allowedAbove:i?[]:[1]}))}};
const base=witness(test,exact(test));assert.equal(ad.validate(base).valid,true);assert.equal(verify(test,base).valid,true);
const operations=[
 ['floor-outside',r=>r.layout.rects[0].x=500],
 ['all-copies-outside',r=>{r.layout.rects[0].x=500;r.stacks[0].rect.x=500;r.stacks[0].layers.forEach(x=>x.x=500);}],
 ['stack-copy-outside',r=>{r.stacks[0].rect.x=500;r.stacks[0].layers.forEach(x=>x.x=500);}],
 ['stack-copy-negative',r=>{r.stacks[0].rect.x=-100;r.stacks[0].layers.forEach(x=>x.x=-100);}],
 ['stack-copy-overlap',r=>{r.stacks[1].rect.x=r.stacks[0].rect.x;r.stacks[1].layers.forEach(x=>x.x=r.stacks[0].rect.x);}],
 ['upper-coordinate',r=>r.stacks[0].layers[1].x+=1],
 ['upper-footprint',r=>r.stacks[0].layers[1].width+=1],
 ['stack-footprint',r=>{r.stacks[0].rect.width+=1;r.stacks[0].layers.forEach(x=>x.width+=1);}],
 ['duplicate-pallet',r=>r.stacks[1].layers[1]={...r.stacks[0].layers[1]}],
 ['unknown-group',r=>r.stacks[0].layers[1].typeIndex=999],
 ['compatibility-inverted',r=>{r.input.types[0].allowedAbove=[];r.input.types[1].allowedAbove=[0];}],
 ['top-as-base',r=>r.input.types[0].stackRole='top'],
 ['base-as-upper',r=>r.input.types[1].stackRole='base'],
 ['stock-exceeded',r=>r.input.types[1].quantity=1],
 ['floor-twice',r=>r.stacks[1]=clone(r.stacks[0])],
 ['layer-skipped',r=>r.stacks[0].layers[1].layer=3],
 ['max-layers',r=>r.input.types[0].maxLayers=1],
 ['off-base',r=>r.input.types[0].stackingEnabled=false],
 ['off-upper',r=>r.input.types[1].stackingEnabled=false],
 ['height-exceeded',r=>{r.input.types[1].height=250;r.stacks.forEach(x=>x.height=350);}],
 ['door-height',r=>{r.input.types[1].height=301;r.stacks.forEach(x=>x.height=401);r.container.innerHeight=1000;}],
 ['wrong-height-summary',r=>r.stacks[0].height+=1],
 ['wrong-total',r=>r.placedCount++],
 ['wrong-floor-count',r=>r.floorPlacedCount++],
 ['wrong-stacked-count',r=>r.stackedCount++],
 ['wrong-max-used',r=>r.maxLayersUsed++],
 ['wrong-mixed-count',r=>r.mixedGroupStacks++],
 ['unknown-position',r=>r.stacks[0].layers[1].positionId='P99'],
 ['duplicate-position',r=>r.stacks[1].positionId=r.stacks[0].positionId],
 ['missing-upper',r=>r.stacks[0].layers.pop()],
 ['extra-unplaced',r=>r.layout.unplaced.push(clone(r.stacks[0].layers[1]))],
 ['wrong-unit-id',r=>r.stacks[0].layers[1].id='2.999'],
 ['fractional-unit-id',r=>r.stacks[0].layers[1].unitNo=1.5],
 ['nan-stack-height',r=>r.stacks[0].height=NaN],
 ['infinite-stack-coordinate',r=>{r.stacks[0].rect.x=Infinity;r.stacks[0].layers.forEach(x=>x.x=Infinity);}],
 ['nan-upper-coordinate',r=>r.stacks[0].layers[1].x=NaN],
 ['nan-type-height',r=>r.input.types[1].height=NaN],
 ['infinite-type-height',r=>r.input.types[1].height=Infinity],
 ['false-rotated-type',r=>r.stacks[0].layers[1].rotated='false'],
 ['missing-stacks',r=>r.stacks=[]]
];
const rows=[];for(const [id,mutate] of operations){const r=clone(base);mutate(r);const context={input:r.input,container:r.container};const own=verify(context,r),prod=ad.validate(r);
 const row={id,independentValid:own.valid,generalValid:prod.general.valid,advancedValid:prod.advanced.valid,combinedValid:prod.valid,independentErrors:own.errors,production:prod};rows.push(row);
 if(!own.valid&&prod.valid)fs.writeFileSync(`functional-c3b-v1.5.0/results/validator-${id}.json`,JSON.stringify({originalTest:test,mutation:id,result:r,own,production:prod},(_,v)=>typeof v==='number'&&!Number.isFinite(v)?String(v):v,2)+'\n');
}
// Bounds near the documented general geometry epsilon. These are direct API
// probes; normalized UI dimensions are integer millimetres.
for(const delta of [-.001,-.0001,-.00001,0,.00001,.0001,.001]){const r=clone(base);r.container.innerLength=200-delta;const p=ad.validate(r);rows.push({id:`boundary-${delta}`,delta,combinedValid:p.valid,independentValid:verify({input:r.input,container:r.container},r).valid,category:'tolerance probe'});}
fs.writeFileSync('functional-c3b-v1.5.0/results/validator-mutations.json',JSON.stringify({completed:rows.length,invalidAccepted:rows.filter(x=>x.category!=='tolerance probe'&&!x.independentValid&&x.combinedValid).map(x=>x.id),rows},null,2));
console.log('MUTATIONS',rows.length,'invalid accepted',rows.filter(x=>x.category!=='tolerance probe'&&!x.independentValid&&x.combinedValid).map(x=>x.id));ad.close();
