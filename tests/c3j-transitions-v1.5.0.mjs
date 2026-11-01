import os from 'node:os';import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {setup} from '../provenance-c3j-v1.5.0/tools/setup.mjs';
const root=path.resolve(import.meta.dirname,'..'),q=root;const {launchBrowser}=await import(q+'/scripts/browser-runtime.mjs');const b=await launchBrowser(q),rows=[];
const {serverFor}=await import(q+'/tests/computation-harness-v1.5.0.mjs');const server=await serverFor(q+'/site');const zipRoot=fs.mkdtempSync(path.join(os.tmpdir(),'c3j-state-'));execFileSync('unzip',['-q',q+'/site/downloads/loadcomposer-v1.5.0-standalone.zip','-d',zipRoot]);
try{for(const route of ['http','file','zip'])for(const family of ['floor','advanced'])for(const mode of ['worker','fallback','inline']){
 const cx=await b.newContext();if(route!=='http')await cx.setOffline(true);if(mode==='fallback')await cx.addInitScript(()=>Worker=undefined);const p=await cx.newPage();await p.goto(route==='http'?server.url:route==='file'?'file://'+root+'/site/downloads/loadcomposer-v1.5.0-standalone.html':'file://'+zipRoot+'/loadcomposer-v1.5.0-standalone/loadcomposer-v1.5.0-standalone.html');await p.waitForFunction(()=>document.documentElement.dataset.i18nReady==='true');
 await setup(p,{quantity:mode==='inline'?4:31,groups:2,stack:family==='advanced',maxLayers:3,length:900,width:600,height:600});
 const data=await p.evaluate(async({family})=>{
  window.alert=()=>{};const docs=[];printDocumentInFrame=(...a)=>docs.push(a.filter(x=>typeof x==='string').join('\n'));
  calculate();await loadComposerComputation.whenIdle();let index=lastResults.findIndex(r=>r.ok&&(family!=='advanced'||r.stacks?.some(s=>s.layers.length>1)));
  // Inline Advanced can be floor-first without actual stacks; its separate contract is recorded.
  if(index<0)index=lastResults.findIndex(r=>r.ok);let r=lastResults[index],original=structuredClone(r);els.drawSelect.value=String(index);drawSelected();
  const snapshot=()=>({ok:r.ok,geometryValid:r.validation.internalError===false,valid:r.validation.valid,placed:r.placedCount,requested:r.input.quantity,complete:r.placedCount===r.input.quantity,disabled:els.printLayoutBtn.disabled,table:els.resultsBody.textContent,selector:els.drawSelect.selectedOptions[0]?.textContent,notes:els.layoutNotes.textContent,documents:docs.length});
  printCurrentLayout();const healthy=snapshot();
  if(r.stacks){const s=r.stacks.find(s=>s.layers.length>1)||r.stacks.at(-1),d=s.layers.pop();r.layout.unplaced.push(d);if(!s.layers.length){r.stacks.splice(r.stacks.indexOf(s),1);r.layout.rects=r.layout.rects.filter(x=>x.id!==d.id);}else s.height=s.layers.reduce((sum,x,k)=>sum+r.input.types[x.typeIndex].height+(k?r.input.verticalGap:0),0);
   r.floorPlacedCount=r.stacks.length;r.stackedCount=r.stacks.reduce((s,x)=>s+x.layers.length,0)-r.stacks.length;r.maxLayersUsed=Math.max(...r.stacks.map(s=>s.layers.length));r.mixedGroupStacks=r.stacks.filter(s=>new Set(s.layers.map(x=>x.typeIndex)).size>1).length;
  }else r.layout.unplaced.push(r.layout.rects.pop());
  r.placedCount--;r.totalCapacity--;r.floorCapacity=r.layout.count=r.layout.materializedCount=r.layout.rects.length;r.layout.usedLength=Math.max(0,...r.layout.rects.map(x=>x.x+x.length));r.layout.usedWidth=Math.max(0,...r.layout.rects.map(x=>x.y+x.width));
  // Keep the old positive flags; direct print must synchronize the table itself.
  printCurrentLayout();const partial=snapshot(),roundtrips=[];
  for(const [n,lang] of ['en','it','de','fr','es','pt','nl'].entries()){
   await loadComposerI18n.setLanguage(lang);document.getElementById('themeToggle').click();setPrimaryFilter('containers');setPrimaryFilter('all');els.drawSelect.value=String(index);els.printView.value=n%2?'side':'ramp';els.printBw.checked=!!(n%2);drawSelected();const before=docs.length;printCurrentLayout();roundtrips.push({lang,view:els.printView.value,bw:els.printBw.checked,...snapshot(),newDocuments:docs.length-before});
  }
  // Restore the complete geometry but preserve negative derived flags from the partial.
  Object.assign(r,structuredClone(original),{input:r.input,container:r.container});r.ok=r.allPlaced=r.fitsQtyBySpace=true;lastResults[index]=r;els.drawSelect.value=String(index);printCurrentLayout();const restored=snapshot();
  r.layout.rects[0].x=-1;printCurrentLayout();const invalid=snapshot();
  document.getElementById('resetBtn').click();calculate();await loadComposerComputation.whenIdle();const recovery={rows:lastResults.length,healthy:lastResults.filter(x=>x.ok).length,pending:loadComposerComputation.pending()};
  return {stackSizes:original.stacks?.map(s=>s.layers.length),healthy,partial,roundtrips,restored,invalid,recovery,documents:docs};
 },{family});
 for(let k=0;k<data.documents.length;k++)fs.writeFileSync(root+`/provenance-c3j-v1.5.0/results/transition-${route}-${family}-${mode}-${k}.html`,data.documents[k]);assert.equal(data.partial.documents,data.healthy.documents);assert.equal(data.partial.geometryValid,true);assert.equal(data.partial.ok,false);
 assert.equal(data.restored.documents,2);assert.equal(data.restored.ok,true);assert.equal(data.invalid.documents,2);
 assert.ok(data.roundtrips.every(r=>r.newDocuments===0&&r.disabled));
 const stalePair=data.restored.placed===31?'30 van 31':'3 van 4';assert.ok(!data.restored.selector.includes(stalePair),data.restored.selector);
 delete data.documents;
 rows.push({route,family,mode,data});fs.writeFileSync(root+'/provenance-c3j-v1.5.0/results/transitions.json',JSON.stringify({browser:b.version(),rows},null,2));console.log(family,mode,data.healthy.documents,data.partial.documents,data.restored.documents,data.invalid.documents);await cx.close();
}fs.writeFileSync(root+'/provenance-c3j-v1.5.0/results/transitions-final.json',JSON.stringify({browser:b.version(),rows},null,2));}finally{await b.close();await server.close();fs.rmSync(zipRoot,{recursive:true,force:true});}
