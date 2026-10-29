import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {launchBrowser} from '../scripts/browser-runtime.mjs';import {mount,ready,serverFor} from './computation-harness-v1.5.0.mjs';
const root=path.resolve(import.meta.dirname,'..'),server=await serverFor(path.join(root,'site')),deniedServer=await serverFor(path.join(root,'site'),{denyWorker:true}),browser=await launchBrowser(root),rows=[];
const shape=await (async()=>{const p=await browser.newPage();await p.goto('file://'+path.join(root,'site/downloads/loadcomposer-v1.5.0-standalone.html'));await ready(p);const c=await p.evaluate(()=>CONTAINERS.find(x=>x.id==='truck-curtain-1360'));await p.close();return c;})();
function test(n=500,{floor=false}={}) {const types=Array.from({length:n},(_,g)=>({typeIndex:g,name:'Compute '+g,identifier:'C'+g,presetId:'custom',quantity:1,length:floor?100:shape.innerLength,width:floor?100:shape.innerWidth,height:5,rotationMode:'auto',lockedOrientation:'normal',stackingEnabled:true,stackRole:'any',maxLayers:500,allowedAbove:Array.from({length:n},(_,j)=>j)}));return{id:'application-dense-'+n,container:shape,input:{mode:'mixed',advancedStacking:true,quantity:n,types,gap:0,verticalGap:0}};}
async function open({http=false,noWorker=false,throwWorker=false,corruption=null,mobile=false,crashWorker=false,denyWorker=false,holdCompute=false}={}) {
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
 if(noWorker)await context.addInitScript(()=>{window.Worker=undefined;});
 if(throwWorker)await context.addInitScript(()=>{window.Worker=class{constructor(){throw new Error('injected startup failure');}};});
 if(crashWorker)await context.addInitScript(()=>{const Native=Worker;Worker=class extends Native{constructor(){const url=URL.createObjectURL(new Blob(["throw new Error('injected worker crash')"],{type:'text/javascript'}));super(url);URL.revokeObjectURL(url);}};});
 if(corruption)await context.addInitScript(op=>{const Native=Worker;window.Worker=class extends Native{constructor(...args){super(...args);this.addEventListener('message',event=>{const m=event.data;if(m.kind!=='result')return;const r=m.result;
  if(op==='incomplete'){event.stopImmediatePropagation();return;}
  if(op==='missing')delete r.layout;
  if(op==='mode')r.mode='single';
  if(op==='input')r.input={quantity:0};
  if(op==='summary')r.placedCount++;
  if(op==='duplicate'&&m.index===1)m.index=0;
  if(op==='version')m.version--;
  if(op==='outside'&&r.layout.rects.length)r.layout.rects[0].x=Infinity;
  if(op==='copy'&&r.stacks?.length){r.stacks[0].rect.x+=1;r.stacks[0].layers.forEach(l=>l.x+=1);}
 });}};},corruption);
 if(holdCompute)await context.addInitScript(()=>{
  const Native=Worker;window.__holdCompute=true;window.__heldComputes=[];
  window.Worker=class extends Native{postMessage(message,...args){
   if(window.__holdCompute&&message.kind==='compute'){window.__heldComputes.push({worker:this,message,args});return;}
   return super.postMessage(message,...args);
  }};
  window.__releaseHeldComputes=()=>{window.__holdCompute=false;
   for(const entry of window.__heldComputes)if(entry.message.version===loadComposerComputation.state.version)
    Native.prototype.postMessage.call(entry.worker,entry.message,...entry.args);
   window.__heldComputes=[];
  };
 });
 const page=await context.newPage(),errors=[],remote=[];page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(server.url)&&!r.url().startsWith(deniedServer.url))remote.push(r.url());});
 await page.goto(http?(denyWorker?deniedServer.url:server.url):'file://'+path.join(root,'site/downloads/loadcomposer-v1.5.0-standalone.html'));await ready(page);if(!http)await context.setOffline(true);
 return{context,page,errors,remote};
}
async function run(page,t){const setup=await mount(page,t);assert.equal(setup.valid,true,JSON.stringify(setup.errors));return page.evaluate(async()=>{calculate();const during={pending:loadComposerComputation.pending(),print:els.printLayoutBtn.disabled,count:lastResults.length,status:document.getElementById('calculationStatus').textContent};const success=await loadComposerComputation.whenIdle();return{success,during,state:loadComposerComputation.state,results:lastResults.map(r=>({id:r.container.id,placed:r.placedCount,floor:r.layout.count,valid:r.validation.valid,version:r.computationVersion}))};});}
try {
 for(const config of [{http:true},{},{noWorker:true},{throwWorker:true},{crashWorker:true},{http:true,denyWorker:true},{mobile:true}]){
  const x=await open(config);const result=await run(x.page,test());assert.equal(result.success,true,JSON.stringify(config));assert.equal(result.during.pending,true);assert.equal(result.during.print,true);assert.equal(result.during.count,0);assert.equal(result.results.length,12);assert.ok(result.results.every(r=>r.valid));assert.equal(result.state.activeWorkers,0);assert.equal(result.state.urls,0);assert.equal(result.state.listenerInstalls,1);assert.ok(result.results.some(r=>r.placed===500&&r.floor===1));
  assert.equal(result.state.mode,config.noWorker||config.throwWorker||config.crashWorker||config.denyWorker?'fallback':'worker');assert.deepEqual(x.errors,[]);assert.deepEqual(x.remote,[]);rows.push({case:'application',config,result});await x.context.close();
 }
 // Real Worker route for the operational 99/120 families, not only synthetic solver calls.
 for(const quantity of [99,120]){
  const x=await open();const t=test(3);t.input.quantity=quantity;t.input.types.forEach((type,g)=>Object.assign(type,{quantity:quantity/3,length:quantity===120?800:1200,width:800,height:500+g*100,stackRole:g===0?'base':g===2?'top':'any',maxLayers:3,allowedAbove:g<2?[g+1]:[]}));
  const result=await run(x.page,t);assert.ok(result.success);assert.equal(result.state.mode,'worker');assert.ok(result.results.every(r=>r.valid));assert.ok(result.results.some(r=>r.placed===quantity));rows.push({case:'operational-worker',quantity,result});await x.context.close();
 }
 // Replies remain untrusted, including duplicated stack representations (V-01).
 for(const corruption of ['missing','mode','input','summary','duplicate','version','outside','copy','incomplete']){
  const x=await open({corruption});const result=await run(x.page,test(30));assert.equal(result.success,false,corruption);assert.equal(result.state.phase,'failed');assert.equal(result.state.activeWorkers,0);assert.equal(result.state.urls,0);assert.equal(result.results.length,0);assert.equal(await x.page.locator('#printLayoutBtn').isDisabled(),true);assert.deepEqual(x.errors,[]);rows.push({case:'corrupt-reply',corruption,result});await x.context.close();
 }
 const x=await open({holdCompute:true});const setup=await mount(x.page,test());assert.equal(setup.valid,true);assert.equal(setup.compatibilityControls,500,'Only expanded group compatibility controls are materialized');
 await x.page.evaluate(()=>calculate());await x.page.waitForFunction(()=>loadComposerComputation.state.activeWorkers===1&&loadComposerComputation.pending());
 const oldVersion=await x.page.evaluate(()=>loadComposerComputation.state.version);
 await x.page.evaluate(async()=>{await loadComposerI18n.setLanguage('de');document.documentElement.dataset.theme='dark';setPrimaryFilter('trailers');drawSelected();});
 assert.equal(await x.page.evaluate(()=>loadComposerComputation.pending()),true,'held native Worker proves this is genuinely pending');
 assert.equal(await x.page.locator('#printLayoutBtn').isDisabled(),true);
 await x.page.locator('#singlePalletGroup [data-field="identifier"]').fill('LATEST');
 await x.page.waitForFunction(()=>window.__heldComputes.some(entry=>entry.message.version===loadComposerComputation.state.version)&&loadComposerComputation.pending());
 assert.equal(await x.page.locator('#printLayoutBtn').isDisabled(),true);
 await x.page.evaluate(()=>window.__releaseHeldComputes());
 await x.page.waitForFunction(()=>loadComposerComputation.state.phase==='complete');
 const rapid=await x.page.evaluate(()=>({state:loadComposerComputation.state,identifier:lastCalculationInput.types[0].identifier,versions:lastResults.map(r=>r.computationVersion)}));assert.equal(rapid.identifier,'LATEST');assert.ok(rapid.state.version>oldVersion);assert.ok(rapid.versions.every(v=>v===rapid.state.version));assert.ok(rapid.state.cancelled>=1);rows.push({case:'rapid-input-cancellation',rapid});
 // Current result only, filters and selections remain coherent, printing is guarded.
 const printing=await x.page.evaluate(()=>{setPrimaryFilter('trailers');els.drawSelect.value=String(lastResults.findIndex(r=>r.container.id==='truck-curtain-1360'));drawSelected();let count=0;printDocumentInFrame=()=>{count++;};printCurrentLayout();const valid=count;els.singlePalletGroup.querySelector('[data-field="identifier"]').value='STALE WITHOUT EVENT';printCurrentLayout();return{valid,afterStale:count,pending:loadComposerComputation.pending(),printDisabled:els.printLayoutBtn.disabled};});assert.equal(printing.valid,1);assert.equal(printing.afterStale,1);assert.equal(printing.printDisabled,true);rows.push({case:'validated-and-stale-print',printing});
 await x.page.evaluate(()=>{calculate();});await x.page.waitForFunction(()=>loadComposerComputation.state.activeWorkers===1);
 await x.page.locator('#resetBtn').click();await ready(x.page);
 const reset=await x.page.evaluate(()=>({state:loadComposerComputation.state,count:lastResults.length,quantity:lastCalculationInput.quantity,groups:allGroupElements().length}));assert.equal(reset.quantity,10);assert.equal(reset.groups,1);assert.equal(reset.count,12);assert.equal(reset.state.activeWorkers,0);assert.equal(reset.state.urls,0);rows.push({case:'reset-in-flight',reset});
 // Locale/theme changes and views do not duplicate listeners or affect geometry.
 for(const lang of ['it','en','de','es','fr','pt','nl'])await x.page.evaluate(async lang=>{await loadComposerI18n.setLanguage(lang);await loadComposerComputation.whenIdle();},lang);
 const localized=await x.page.evaluate(()=>({state:loadComposerComputation.state,lang:loadComposerI18n.language,count:lastResults.length}));assert.equal(localized.lang,'nl');assert.equal(localized.count,12);assert.equal(localized.state.listenerInstalls,1);assert.deepEqual(x.errors,[]);rows.push({case:'seven-locales',localized});await x.context.close();
 const single=await open();
 const singleResult=await single.page.evaluate(async()=>{els.quantity.value=500;setLengthInputMm(els.singlePalletGroup.querySelector('[data-field="length"]'),100);setLengthInputMm(els.singlePalletGroup.querySelector('[data-field="width"]'),100);els.singlePalletGroup.querySelector('[data-field="presetId"]').value='custom';setLengthInputMm(els.palletHeight,100);calculate();const success=await loadComposerComputation.whenIdle();return{success,state:loadComposerComputation.state,rows:lastResults.map(r=>({mode:r.mode,placed:r.placedCount,valid:r.validation.valid}))};});
 assert.equal(singleResult.success,true);assert.equal(singleResult.state.mode,'worker');assert.ok(singleResult.rows.every(r=>r.mode==='single'&&r.placed===500&&r.valid));rows.push({case:'single-500',singleResult});
 const admission=await single.page.evaluate(()=>{els.quantity.value=501;els.quantity.dispatchEvent(new Event('input',{bubbles:true}));return{count:lastResults.length,print:els.printLayoutBtn.disabled,status:document.getElementById('calculationStatus').textContent,valid:validateAndReadInput().valid};});assert.equal(admission.valid,false);assert.equal(admission.count,0);assert.equal(admission.print,true);assert.equal(admission.status,'');rows.push({case:'501-rejected',admission});await single.context.close();
 fs.writeFileSync(path.join(root,'computation-results-v1.5.0.json'),JSON.stringify({status:'PASS',browser:browser.version(),rows},null,2)+'\n');console.log('PASS C2 computation: HTTP/file offline, mobile viewport, Worker/fallback/failure, corrupt replies, real cancellation, stale print, reset and locales');
}finally{await browser.close();await server.close();await deniedServer.close();}
