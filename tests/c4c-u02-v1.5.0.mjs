import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {restoreC4c} from './c4e-scope-helper.mjs';
import {launchBrowser} from '../scripts/browser-runtime.mjs';import {ROOT,ready,mount,pallet as g} from './c4a-helpers-v1.5.0.mjs';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex'),css=fs.readFileSync(ROOT+'/tests/fixtures/c4c-u02.css','utf8'),html=restoreC4c('site/index.html',fs.readFileSync(ROOT+'/site/index.html','utf8'));
assert.equal(hash(css),'97b188ed55d502627cd733ad65b8d3e831017605265038947f301279d42bfc51');
assert.equal(hash(html.replace(css,'')),'7b4bc92a1e7c8f0d5465ad2dc22368752b19554fb73f260d0e7dfd0946740ca3');
const b=await launchBrowser(ROOT),rows=[],actions=[];
try{const p=await b.newPage();await p.context().setOffline(true);await p.goto('file://'+ROOT+'/site/downloads/loadcomposer-v1.5.0-standalone.html');await ready(p);
for(const count of [1,2,3,5])for(const custom of [false,true]){
 await mount(p,Array.from({length:count},()=>g(2)));await p.evaluate(({custom})=>{for(const row of allGroupElements()){selectPresetForGroup(row,custom?'custom':'eur',false);row.querySelector('[data-field="customName"]').value='Very long pallet name ABCDEFGHIJKLMN';updateGroupVisuals(row);}syncUnifiedMode({calculate:false});calculate();},{custom});await p.evaluate(()=>loadComposerComputation.whenIdle());
 for(const width of [320,375,390,430,600,768,844,1024,1280]){await p.setViewportSize({width,height:width===844?390:1024});for(const lang of ['en','it','de','es','fr','pt','nl']){await p.evaluate(l=>loadComposerI18n.setLanguage(l),lang);for(const theme of ['light','dark']){
 await p.locator('#themeToggle').click();await p.locator(`[data-theme-value="${theme}"]`).click();const unit=['mm','cm','in'][(width+count)%3];await p.locator(`.unit-option:has(input[value="${unit}"])`).click();await p.evaluate(()=>loadComposerComputation.whenIdle());
 for(const open of [false,true]){const t=p.locator('[data-action="toggleGroup"]').last();if((await t.getAttribute('aria-expanded')==='true')!==open)await t.click();
 const d=await p.evaluate(()=>{const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left+scrollX,right:r.right+scrollX,width:r.width,height:r.height};};return {width:innerWidth,scroll:document.documentElement.scrollWidth,groups:allGroupElements().map(e=>({rect:rect(e),remove:(()=>{const x=e.querySelector('[data-action="removeGroup"]');return x&&!x.classList.contains('hidden')?rect(x):null;})(),summary:(()=>{const x=e.querySelector('.group-summary');return {whiteSpace:getComputedStyle(x).whiteSpace,clipped:x.scrollWidth>x.clientWidth+1};})()}))};});
 assert.ok(d.scroll<=width+1,JSON.stringify({count,custom,width,lang,theme,open,d}));for(const r of d.groups){assert.ok(r.rect.right<=width+1);assert.equal(r.summary.clipped,false);if(r.remove)assert.ok(r.remove.left>=0&&r.remove.right<=width+1&&r.remove.width>=44&&r.remove.height>=32);}
 rows.push({count,custom,width,lang,theme,open,unit,...d});
 }
 }}}
 // Real focus/keyboard, Remove, Add and Reset: all locales at a narrow viewport.
 await p.setViewportSize({width:320,height:900});for(const lang of ['en','it','de','es','fr','pt','nl']){await p.evaluate(l=>loadComposerI18n.setLanguage(l),lang);const before=await p.locator('.pallet-group').count();await p.locator('#addMixedRowBtn').click();assert.equal(await p.locator('.pallet-group').count(),before+1);const remove=p.locator('[data-action="removeGroup"]').last();await remove.focus();await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');assert.ok(await remove.evaluate(e=>e===document.activeElement&&e.matches(':focus-visible')));await p.keyboard.press('Enter');assert.equal(await p.locator('.pallet-group').count(),before);actions.push({count,custom,lang,addRemoveKeyboard:true});}
 console.log('U02 fixture completed',count,custom,rows.length);await p.locator('#resetBtn').click();await p.evaluate(()=>loadComposerComputation.whenIdle());assert.equal(await p.locator('.pallet-group').count(),1);
}
fs.writeFileSync(ROOT+'/c4c-u02-results-v1.5.0.json',JSON.stringify({pass:true,browser:b.version(),rows,actions},null,2));console.log('C4c U02 PASS',rows.length,'geometry cases;',actions.length,'keyboard Add/Remove cases; 8 Reset cases');
}finally{await b.close();}
