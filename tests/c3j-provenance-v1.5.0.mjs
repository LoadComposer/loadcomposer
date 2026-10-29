import assert from 'node:assert/strict';import os from 'node:os';import {execFileSync} from 'node:child_process';
// Independent C3i fault injection. Production files and decision functions are not patched.
import fs from 'node:fs';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),qa=root;
const {launchBrowser}=await import(qa+'/scripts/browser-runtime.mjs');
const {serverFor}=await import(qa+'/tests/computation-harness-v1.5.0.mjs');
const browser=await launchBrowser(qa),server=await serverFor(path.join(root,'site'));
const zipRoot=fs.mkdtempSync(path.join(os.tmpdir(),'c3j-zip-'));execFileSync('unzip',['-q',path.join(root,'site/downloads/loadcomposer-v1.5.0-standalone.zip'),'-d',zipRoot]);
const rows=[],out=path.join(root,'provenance-c3j-v1.5.0/results');
const faults=['healthy','negative-flags','remove-version','wrong-version','old-version','input-substitution','vehicle-altered','catalog-vehicle','other-row','silent-input','remove-version-silent-input','old-after-new','old-unversioned-after-new','before-reset','unversioned-before-reset','after-positive-corrupt','silent-length','silent-height','silent-gap','silent-rotation','silent-stacking','same-object-other-row','same-capacity-vehicle'];
try{for(const route of ['http','file','zip'])for(const execution of ['worker','fallback','inline'])for(const family of ['single','mixed']){
 if(process.env.C3I_CASE && process.env.C3I_CASE!==[route,execution,family].join('-'))continue;
 const cx=await browser.newContext();if(execution==='fallback')await cx.addInitScript(()=>window.Worker=undefined);if(route!=='http')await cx.setOffline(true);
 const page=await cx.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 const url=route==='http'?server.url:'file://'+(route==='file'?path.join(root,'site/downloads/loadcomposer-v1.5.0-standalone.html'):path.join(zipRoot,'loadcomposer-v1.5.0-standalone/loadcomposer-v1.5.0-standalone.html'));
 await page.goto(url);await page.waitForFunction(()=>document.documentElement.dataset.i18nReady==='true'&&!loadComposerComputation.pending());
 for(const fault of faults){
 const observation=await page.evaluate(async({fault,execution,family})=>{
  document.getElementById('resetBtn').click();window.alert=()=>{};window.__documents=[];
  // Capture only the final transport. The gate, schema generation and HTML composition run unchanged.
  printDocumentInFrame=(...args)=>__documents.push(args.filter(a=>typeof a==='string').join('\n'));
  els.mixedRows.innerHTML=family==='mixed'?mixedGroupHtml({presetId:'custom',customName:'Audit B',quantity:1,length:750,width:550,height:450}):'';
  const qty=execution==='inline'?4:17;
  allGroupElements().forEach((g,k)=>{
   g.querySelector('[data-field="presetId"]').value='custom';g.querySelector('[data-field="customName"]').value='Audit '+k;
   g.querySelector('[data-field="quantity"]').value=family==='single'?qty:(k?Math.floor(qty/2):Math.ceil(qty/2));
   for(const [n,v] of Object.entries({length:k?750:800,width:k?550:600,height:450}))setLengthInputMm(g.querySelector(`[data-field="${n}"]`),v);
   g.querySelector('[data-field="stackingEnabled"]').checked=false;g.querySelector('[data-field="allowRotate"]').checked=true;
  });setLengthInputMm(els.gap,0);setLengthInputMm(els.verticalGap,0);syncUnifiedMode({calculate:false});
  calculate();await loadComposerComputation.whenIdle();const idx=lastResults.findIndex(r=>r.ok),saved=structuredClone(lastResults[idx]);if(idx<0)throw Error('no control');
  els.drawSelect.value=String(idx);drawSelected();const expected={input:structuredClone(saved.input),container:structuredClone(saved.container),version:saved.computationVersion};
  let r=lastResults[idx],other=lastResults.find((x,j)=>j!==idx&&x.ok);const originalVersion=r.computationVersion;
  const q=allGroupElements()[0].querySelector('[data-field="quantity"]');
  if(fault==='negative-flags'){r.ok=false;r.fitsQtyBySpace=false;r.allPlaced=false;r.validation={valid:false,internalError:true};r.validationError=true;}
  if(fault==='remove-version'||fault==='remove-version-silent-input')delete r.computationVersion;
  if(fault==='wrong-version')r.computationVersion+=987;
  if(fault==='old-version')r.computationVersion--;
  if(fault==='input-substitution')r.input={...r.input,provenance:'different request'};
  if(fault==='vehicle-altered')r.container={...r.container,id:'foreign-vehicle'};
  if(fault==='catalog-vehicle')r.container=other.container;
  if(fault==='same-capacity-vehicle')r.container=(lastResults.find((x,j)=>j!==idx&&x.floorCapacity===r.floorCapacity)||other).container;
  if(fault==='other-row'){r=structuredClone(other);lastResults[idx]=r;}
  if(fault==='silent-input'||fault==='remove-version-silent-input')q.value=Number(q.value)+1;
  if(fault==='old-after-new'||fault==='old-unversioned-after-new'){
   q.value=Number(q.value)+1;q.dispatchEvent(new Event('input',{bubbles:true}));calculate();await loadComposerComputation.whenIdle();
   r=saved;if(fault==='old-unversioned-after-new')delete r.computationVersion;lastResults[idx]=r;els.drawSelect.value=String(idx);
  }
  if(fault==='before-reset'||fault==='unversioned-before-reset'){
   document.getElementById('resetBtn').click();r=saved;if(fault.startsWith('unversioned'))delete r.computationVersion;
   lastResults=[r];renderTable();renderDrawOptions();els.drawSelect.value='0';
  }
  if(fault==='after-positive-corrupt'){isOperationalPrintAvailable(r);r.layout.rects[0].x=-1;}
  if(fault==='silent-length')setLengthInputMm(allGroupElements()[0].querySelector('[data-field="length"]'),801);
  if(fault==='silent-height')setLengthInputMm(allGroupElements()[0].querySelector('[data-field="height"]'),451);
  if(fault==='silent-gap')setLengthInputMm(els.gap,1);
  if(fault==='silent-rotation')allGroupElements()[0].querySelector('[data-field="allowRotate"]').checked=false;
  if(fault==='silent-stacking')allGroupElements()[0].querySelector('[data-field="stackingEnabled"]').checked=true;
  if(fault==='same-object-other-row'){r=other;lastResults[idx]=r;}
  const currentInput=validateAndReadInput(),stateBefore=loadComposerComputation.state,selectedLabel=els.drawSelect.selectedOptions[0]?.textContent;
  const embeddedCount=r.mode==='single'?r.input.quantity:r.input.types.reduce((s,t)=>s+t.quantity,0);
  const actualPlaced=r.mode==='single'?r.layout.stackCounts.reduce((s,n)=>s+n,0):r.stacks?r.stacks.reduce((s,x)=>s+x.layers.length,0):r.layout.rects.length;
  const independent={requested:currentInput.valid?currentInput.input.quantity:null,represented:actualPlaced,embeddedCount,
   completeForCurrent:currentInput.valid&&actualPlaced===currentInput.input.quantity,
   inputMatches:currentInput.valid&&JSON.stringify(currentInput.input)===JSON.stringify(r.input),
   jobMatches:Number.isSafeInteger(r.computationVersion)&&r.computationVersion===stateBefore.version&&stateBefore.phase==='complete',
   intendedVehicleMatches:JSON.stringify(r.container)===JSON.stringify(expected.container)};
  const before=structuredClone(r);printCurrentLayout();printCurrentLayout();
  const after={ok:r.ok,validation:r.validation,disabled:els.printLayoutBtn.disabled,documents:__documents.length,notes:els.layoutNotes.textContent,
   selectedLabelAfter:els.drawSelect.selectedOptions[0]?.textContent,table:els.resultsBody.textContent};
  return {expected,originalVersion,independent,stateBefore,selectedLabel,before,after,documents:__documents};
 },{fault,execution,family});
 const name=[route,execution,family,fault].join('-');
 if(observation.documents.length&&fault!=='healthy'&&fault!=='negative-flags')fs.writeFileSync(path.join(out,'I01-'+name+'.html'),observation.documents[0]);
 assert.equal(observation.after.documents,['healthy','negative-flags'].includes(fault)?2:0,[route,execution,family,fault].join('/'));
 if(['healthy','negative-flags'].includes(fault))assert.equal(observation.after.ok,true);
 assert.deepEqual(errors,[]);
 delete observation.documents;
 rows.push({route,execution,family,fault,errors:[...errors],...observation});
 }
 console.log(route,execution,family,rows.slice(-faults.length).map(r=>`${r.fault}:${r.after.documents}`).join(' '));await cx.close();
}fs.writeFileSync(path.join(out,'provenance-final.json'),JSON.stringify({browser:browser.version(),rows},null,2));console.log('FINAL',rows.length);
}finally{await browser.close();await server.close();fs.rmSync(zipRoot,{recursive:true,force:true});}
