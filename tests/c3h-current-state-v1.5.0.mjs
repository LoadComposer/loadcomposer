import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {launchBrowser} from '../scripts/browser-runtime.mjs';import {serverFor,ready} from './computation-harness-v1.5.0.mjs';import {input} from '../functional-c3b-v1.5.0/tools/browser-lib.mjs';
const root=path.resolve(import.meta.dirname,'..'),b=await launchBrowser(root),server=await serverFor(path.join(root,'site')),rows=[];
try{for(const mode of ['worker','fallback','inline'])for(const family of ['single','mixed']){const cx=await b.newContext();if(mode==='fallback')await cx.addInitScript(()=>Worker=undefined);const p=await cx.newPage();await p.goto(server.url);await ready(p);await input(p,{quantity:mode==='inline'?2:13,groups:family==='single'?1:2,stack:false});
const result=await p.evaluate(async()=>{window.__docs=[];window.__schemas=0;window.alert=()=>{};printDocumentInFrame=(...args)=>__docs.push(args);const schema=getPrintSchemaDataUrl;getPrintSchemaDataUrl=(...args)=>{__schemas++;return schema(...args);};for(const g of allGroupElements())g.querySelector('[data-field="customName"]').value='Stable';calculate();await loadComposerComputation.whenIdle();const index=lastResults.findIndex(r=>r.ok),original=structuredClone(lastResults[index]),installed=lastResults[index];els.drawSelect.value=String(index);drawSelected();const observations=[];
for(const kind of ['previous-negative','wrong-job','wrong-canonical-input','wrong-vehicle','corrupt','silent-ui-input']){let r=kind==='previous-negative'?installed:structuredClone(original);lastResults[index]=r;els.drawSelect.value=String(index);if(kind==='previous-negative'){r.ok=false;r.fitsQtyBySpace=false;r.allPlaced=false;r.validationError=true;r.validation={valid:false,internalError:true};}
if(kind==='wrong-job')r.computationVersion--;
if(kind==='wrong-canonical-input')r.input={...r.input,identityTamper:true};
if(kind==='wrong-vehicle')r.container={...r.container,innerLength:r.container.innerLength+1};
if(kind==='corrupt')r.layout.rects[0].x=-10;
if(kind==='silent-ui-input'){const q=allGroupElements()[0].querySelector('[data-field="quantity"]');q.value=Number(q.value)+1;}
const n=__docs.length,s=__schemas;updateOperationalPrintState(r);printCurrentLayout();printCurrentLayout();observations.push({kind,docs:__docs.length-n,schemas:__schemas-s,disabled:els.printLayoutBtn.disabled,ok:r.ok,internal:r.validation?.internalError,geometryValid:r.validation?.internalError===false,loadComplete:r.placedCount===(r.mode==='single'?r.input.quantity:r.input.types.reduce((a,t)=>a+t.quantity,0)),operationallyEligible:r.ok,printAllowed:!els.printLayoutBtn.disabled});}
return observations;});
for(const r of result){assert.equal(r.docs,r.kind==='previous-negative'?2:0,mode+'/'+family+'/'+r.kind);assert.equal(r.schemas,r.kind==='previous-negative'?2:0);assert.equal(r.disabled,r.kind!=='previous-negative');}rows.push({mode,family,result});await cx.close();}
fs.writeFileSync(path.join(root,'operational-c3h-v1.5.0/results/current-state.json'),JSON.stringify({status:'PASS',browser:b.version(),rows},null,2));console.log('C3h current state PASS',rows.length*6);
}finally{await b.close();await server.close();}
