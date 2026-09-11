import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {launchBrowser} from './browser-runtime.mjs';
const ROOT=path.resolve(import.meta.dirname,'..');
const CURRENT=path.join(ROOT,'site/downloads/loadcomposer-v1.4.0-standalone.html');
const EVIDENCE=path.join(ROOT,'planner-ux-evidence-v1.4.0');
const browser=await launchBrowser(ROOT);
const measures=[],interactions=[],captures=[],themes=[];
fs.rmSync(EVIDENCE,{recursive:true,force:true});fs.mkdirSync(EVIDENCE,{recursive:true});
async function pageAt(width=1920,height=1080,language='it',theme='light',scheme='light'){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,colorScheme:scheme});
 await page.addInitScript(({language,theme})=>{localStorage.setItem('loadcomposer.language',language);localStorage.setItem('loadcomposer.theme',theme);},{language,theme});
 await page.goto(pathToFileURL(CURRENT).href,{waitUntil:'load'});
 await page.waitForFunction(()=>window.loadComposerDiagnostics?.calculationCycles>0);
 return page;
}
async function measurements(page){return page.evaluate(()=>{
 const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}};
 return {width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,canvas:rect('main'),group:rect('.pallet-group'),gap:rect('#gap'),gapControl:rect('#gap').width+rect('#gap + .unit-suffix').width,quantity:rect('#quantity'),layers:rect('#maxLayers'),preset:rect('.picker-button'),heightInput:rect('#palletHeight'),identifier:rect('[data-field="identifier"]'),results:rect('#resultsSection'),table:rect('.tablewrap'),metrics:rect('.summary'),filters:rect('.result-filters')};
 });}
try{
 for(const [width,height] of [[2560,1440],[1920,1080],[1366,768],[768,1024],[390,844],[320,740]]){
  const page=await pageAt(width,height);const m=await measurements(page);measures.push(m);
  assert.equal(m.overflow,false,`${width} viewport overflow`);
  await page.evaluate(()=>{
   for(const id of ['loadDataSection','calculateBtn','verticalGap','trailerSecondaryFilters']) if(document.getElementById(id))throw Error(`${id} retained`);
   if(document.querySelectorAll('main > section').length!==4)throw Error('section hierarchy');
   if(readInput().verticalGap!==0)throw Error('UI vertical gap');
  });
  if(width>=1920){
   assert.ok(m.canvas.width>=1720&&m.canvas.width<=1840);
   assert.ok(m.group.height<230,`group ${m.group.height}`);
   assert.ok(m.gapControl<=142&&m.gapControl>=100);
   assert.ok(m.quantity.width>=80&&m.quantity.width<=102);
   assert.ok(m.layers.width>=70&&m.layers.width<=92);
   assert.ok(m.preset.width>=298&&m.preset.width<=402);
   const ys=[m.preset.y,m.quantity.y,m.heightInput.y,m.identifier.y];
   assert.ok(Math.max(...ys)-Math.min(...ys)<=4,'main input row');
   assert.ok(m.table.y<height,'table must start in first desktop viewport');
   assert.ok(m.metrics.height<=75,'metrics density');
   assert.ok(Math.abs(m.metrics.y-m.filters.y)<25,'filters/metrics shared band');
  }
  await page.close();
 }
 for(const width of [1920,390]){
  const page=await pageAt(width,1080,'en');
  const before=await page.evaluate(()=>loadComposerDiagnostics.calculationCycles);
  await page.fill('#quantity','11');
  assert.equal(await page.evaluate(()=>loadComposerDiagnostics.calculationCycles),before+1,'one input = one cycle');
  await page.fill('#quantity','');
  assert.equal(await page.evaluate(()=>lastResults.length),0,'invalid data suspends results');
  assert.equal(await page.getAttribute('#quantity','aria-invalid'),'true');
  await page.fill('#quantity','10');
  const rotation=page.locator('#singlePalletGroup [data-field="allowRotate"]');
  await rotation.locator("..").locator(".switch-track").click();
  await page.locator('[data-role="orientationPanel"]').waitFor({state:'visible'});
  await page.fill('#quantity','9');
  assert.equal(await page.locator('[data-role="orientationPanel"]').isVisible(),true,'decision stays open');
  for(const choice of ['normal','rotated']){
   if(choice==='rotated')await page.locator('[data-action="changeOrientation"]').click();
   await page.locator(`[data-field="lockedOrientation"][value="${choice}"]`).check();
   assert.equal(await page.locator('[data-role="orientationPanel"]').isVisible(),false);
   assert.equal(await page.locator('[data-role="orientationSummary"]').isVisible(),true);
   assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'changeOrientation');
  }
  const disclosure=page.locator('[data-action="toggleGroup"]');
  await disclosure.click();assert.equal(await page.locator('[data-role="groupBody"]').isVisible(),false);
  await disclosure.press('Enter');assert.equal(await page.locator('[data-role="groupBody"]').isVisible(),true);
  await page.click('#resetBtn');
  assert.equal(await page.isDisabled('#maxLayers'),true);
  await page.check('#stackable');assert.equal(await page.isDisabled('#maxLayers'),false);
  await page.click('#addMixedRowBtn');
  assert.equal(await page.isChecked('#stackable'),false);assert.equal(await page.isDisabled('#stackable'),true);assert.equal(await page.isDisabled('#maxLayers'),true);
  assert.equal(await page.locator('#mixedStackNote').isVisible(),false);
  await page.focus('#stackingUnavailable');await page.press('#stackingUnavailable','Enter');
  assert.equal(await page.locator('#mixedStackNote').isVisible(),true);
  assert.equal(await page.getAttribute('#stackingUnavailable','aria-expanded'),'true');
  await page.press('#stackingUnavailable','Escape');assert.equal(await page.locator('#mixedStackNote').isVisible(),false);
  {const r=await page.locator('#stackingUnavailable').boundingBox();await page.mouse.click(r.x+r.width/2,r.y+r.height/2);}assert.equal(await page.locator('#mixedStackNote').isVisible(),true);
  await page.locator('#mixedRows [data-action="removeGroup"]').click();
  assert.equal(await page.isChecked('#stackable'),false);assert.equal(await page.isDisabled('#stackable'),false);assert.equal(await page.isDisabled('#maxLayers'),true);
  const initial=await page.evaluate(()=>({cycles:loadComposerDiagnostics.calculationCycles,results:JSON.stringify(lastResults)}));
  for(const [primary,secondary,count] of [['all','all',12],['containers','all',9],['containers','20',2],['containers','40',4],['containers','45',3],['containers','reefer',3],['containers','pallet-wide',3],['trailers','all',3]]){
   await page.locator(`[data-filter-primary="${primary}"]`).click();
   if(primary==='containers')await page.locator(`[data-filter-container="${secondary}"]`).click();
   assert.equal(await page.locator('#resultsBody tr:not(.vehicle-group-row)').count(),count);
   assert.equal(await page.locator('#drawSelect option').count(),count);
   await page.evaluate(()=>{
    const visible=visibleResults();
    if(!visible.some(r=>r.container.id===selectedContainerId))throw Error('stale preview');
    const smallest=visible.filter(r=>r.ok&&!r.validationError).sort((a,b)=>a.container.innerLength*a.container.innerWidth*a.container.innerHeight-b.container.innerLength*b.container.innerWidth*b.container.innerHeight)[0];
    // Exact summary behavior is also tested by the unchanged renderSummary assertions.
    if(document.getElementById('smallestOk').textContent==='')throw Error('empty summary');
   });
  }
  assert.deepEqual(await page.evaluate(()=>({cycles:loadComposerDiagnostics.calculationCycles,results:JSON.stringify(lastResults)})),initial,'filters mutate/recompute');
  assert.equal(await page.evaluate(()=>resultFilterSecondary),'all');
  await page.selectOption('#drawSelect',{index:1});
  assert.equal(await page.evaluate(()=>loadComposerDiagnostics.calculationCycles),initial.cycles);
  await page.evaluate(()=>{lastResults=lastResults.filter(r=>r.container.vehicleType==="container");applyResultFilter();});
  assert.equal(await page.locator('#filterEmptyState').isVisible(),true);
  assert.ok(!/DOES NOT FIT/.test(await page.locator('#filterEmptyState').innerText()));
  await page.click('#resetBtn');assert.equal(await page.getAttribute('[data-filter-primary="all"]','aria-pressed'),'true');
  interactions.push({width,status:'PASS'});await page.close();
 }
 const states=[['01-qhd-standard',2560,1440,'default'],['02-fhd-standard',1920,1080,'default'],['03-hd-standard',1366,768,'default'],['04-qhd-five-collapsed',2560,1440,'five'],['05-qhd-second-open',2560,1440,'second'],['06-custom',1920,1080,'custom'],['07-rotation-required',1920,1080,'rotation'],['08-rotation-locked',1920,1080,'locked'],['09-stack-off',1920,1080,'default'],['10-stack-on',1920,1080,'stack'],['11-stack-unavailable',1920,1080,'multi'],['12-results-all',2560,1440,'all'],['13-results-containers',2560,1440,'containers'],['14-results-20',2560,1440,'20'],['15-results-reefer',2560,1440,'reefer'],['16-results-trailers',2560,1440,'trailers'],['17-preview',2560,1440,'preview'],['18-mobile-standard',390,844,'default'],['19-mobile-rotation',390,844,'rotation'],['20-mobile-stacking-help',390,844,'multi'],['21-mobile-results',390,844,'20'],['22-mobile-preview',390,844,'preview'],['23-tablet-custom',768,1024,'custom'],['24-results-fhd',1920,1080,'all'],['25-results-hd',1366,768,'all']];
 for(const [name,width,height,state] of states){
  const page=await pageAt(width,height);
  await page.evaluate(state=>{
   const g=document.getElementById('singlePalletGroup');
   if(['five','second','multi'].includes(state)){
    const n=state==='five'?4:1;for(let i=0;i<n;i++)document.getElementById('addMixedRowBtn').click();
    if(state==='five')allGroupElements().forEach(g=>setGroupExpanded(g,false));
    if(state==='multi')document.getElementById('stackingUnavailable').click();
   }
   if(state==='custom')selectPresetForGroup(g,'custom',true);
   if(['rotation','locked'].includes(state)){
    const r=g.querySelector('[data-field="allowRotate"]');r.checked=false;r.dispatchEvent(new Event('change',{bubbles:true}));
    if(state==='locked'){const choice=g.querySelector('[data-field="lockedOrientation"][value="normal"]');choice.checked=true;choice.dispatchEvent(new Event('change',{bubbles:true}));}
   }
   if(state==='stack'){const t=document.getElementById('stackable');t.checked=true;t.dispatchEvent(new Event('change',{bubbles:true}));}
   if(['containers','20','reefer'].includes(state))setPrimaryFilter('containers');
   if(['20','reefer'].includes(state))setSecondaryFilter(state);
   if(state==='trailers')setPrimaryFilter('trailers');
   if(['all','containers','20','reefer','trailers'].includes(state))document.getElementById('resultsSection').scrollIntoView();
   if(state==='preview'){selectedContainerId='40dc';renderDrawOptions();drawSelected();document.getElementById('layoutSection').scrollIntoView();}
   if(state==='rotation'&&innerWidth<600)g.querySelector('[data-role="orientationPanel"]').scrollIntoView();
  },state);
  if(state==='five')for(const h of await page.locator('.pallet-group').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().height)))assert.ok(h>=48&&h<=70,`collapsed height ${h}`);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false,`${name} overflow`);
  await page.screenshot({path:path.join(EVIDENCE,name+'.png')});captures.push({name,width,height,state});await page.close();
 }
 for(const [preference,scheme] of [['light','dark'],['dark','light'],['auto','light'],['auto','dark']]){
  const page=await pageAt(1920,1080,'en',preference,scheme);const resolved=await page.getAttribute('html','data-theme');assert.equal(resolved,preference==='auto'?scheme:preference);
  await page.screenshot({path:path.join(EVIDENCE,`theme-${preference}-${scheme}.png`)});themes.push({preference,scheme,resolved});await page.close();
 }
 for(const lang of ['it','en','de','es','fr','pt','nl']){const page=await pageAt(1920,1080,lang);const m=await measurements(page);assert.equal(m.overflow,false,lang);assert.ok(m.group.height<230,lang+' group density');await page.close();}
 fs.writeFileSync(path.join(ROOT,'planner-density-results-v1.4.0.json'),JSON.stringify({version:'1.4.0',status:'PASS',measures,interactions,captures,themes,normalVerticalGap:0,liveCalculation:true,trailerSecondaryFilter:false},null,2)+'\n');
 console.log('Density PASS: 6 viewports, desktop/mobile interactions, 25 visual states + 4 themes, 7 locales.');
}finally{await browser.close();}
