import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {launchBrowser} from '../scripts/browser-runtime.mjs';
import {serverFor} from './computation-harness-v1.5.0.mjs';
import {ROOT,OUT,languages,save,ready} from './c4a-helpers-v1.5.0.mjs';
const b=await launchBrowser(ROOT),server=await serverFor(ROOT+'/site'),rows=[],keyboard=[];
const route=process.env.C4A_UI_ROUTE||'http',tmp=fs.mkdtempSync(path.join(os.tmpdir(),'c4a-ui-'));
assert.ok(['http','file','zip'].includes(route));
if(route==='zip')execFileSync('unzip',['-qq',ROOT+'/site/downloads/loadcomposer-v1.5.0-standalone.zip','-d',tmp]);
const widths=process.env.C4A_UI_WIDTHS?process.env.C4A_UI_WIDTHS.split(',').map(Number):[320,375,390,430,600,768,844,1024,1280,1440];
try {
 const p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[],remote=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>{if(/^https?:/.test(r.request().url())&&!r.request().url().startsWith(server.url)){remote.push(r.request().url());return r.abort();}return r.continue();});
 if(route!=='http')await p.context().setOffline(true);
 await p.goto(route==='http'?server.url:'file://'+(route==='file'?ROOT+'/site/downloads/loadcomposer-v1.5.0-standalone.html':tmp+'/loadcomposer-v1.5.0-standalone/loadcomposer-v1.5.0-standalone.html'));await ready(p);
 for(const width of widths){await p.setViewportSize({width,height:1000});
 for(const lang of languages){await p.evaluate(l=>loadComposerI18n.setLanguage(l),lang);
 for(const theme of ['light','dark']){
 await p.locator('#themeToggle').click();await p.locator(`[data-theme-value="${theme}"]`).click();
 const caption=await p.locator('#drawSelectLabel').innerText();assert.equal(await p.getByRole('combobox',{name:caption,exact:true}).count(),1);
 const data=await p.evaluate(()=>{
  const legend=document.querySelector('.unit-preference legend'),segments=document.querySelector('.unit-segments'),range=document.createRange();range.selectNodeContents(legend);const a=range.getBoundingClientRect(),c=segments.getBoundingClientRect(),fieldset=legend.parentElement.getBoundingClientRect(),gap=document.getElementById('gap').closest('label').getBoundingClientRect();
  const intersect=(x,y)=>x.bottom>y.top+.5&&x.top<y.bottom-.5&&x.right>y.left+.5&&x.left<y.right-.5;
  return {language:document.documentElement.lang,theme:document.documentElement.dataset.theme,pageOverflow:document.documentElement.scrollWidth>innerWidth+1,labelOverlap:intersect(a,c),neighborOverlap:intersect(fieldset,gap),labelClipped:a.left<fieldset.left-1||a.right>fieldset.right+1,segmentsOverflow:segments.scrollWidth>segments.clientWidth+1,legend:legend.textContent,drawLabel:document.getElementById('drawSelectLabel').textContent,association:document.getElementById('drawSelect').getAttribute('aria-labelledby'),options:[...document.querySelectorAll('.unit-option')].map(e=>{const r=e.getBoundingClientRect(),s=e.querySelector('span');return {width:r.width,height:r.height,clipped:s.scrollWidth>s.clientWidth+1};})};
 });
 assert.equal(data.language,lang);assert.equal(data.theme,theme);assert.equal(data.pageOverflow,false,JSON.stringify({width,lang,theme,data}));assert.equal(data.labelOverlap,false);assert.equal(data.neighborOverlap,false);assert.equal(data.labelClipped,false);assert.equal(data.segmentsOverflow,false);assert.ok(data.options.every(o=>o.width>30&&o.height>=32&&!o.clipped));assert.equal(data.association,'drawSelectLabel');
 for(const unit of ['cm','in','mm']){await p.locator(`.unit-option:has(input[value="${unit}"])`).click();assert.equal(await p.evaluate(()=>loadComposerUnits.unit),unit);}await p.evaluate(()=>loadComposerComputation.whenIdle());
 rows.push({width,lang,theme,...data});save(route==='http'?'ui':'ui-'+route,{browser:b.version(),route,rows,keyboard,errors,remote});
 if([768,844].includes(width)&&['en','de'].includes(lang))await p.locator('#loadSettingsSection').screenshot({path:path.join(OUT,`after-${width}-${lang}-${theme}.png`)});
 if([320,1440].includes(width)){
  const s=p.locator('#drawSelect');await s.focus();await p.keyboard.press('Tab');await p.keyboard.press('Shift+Tab');
  const focus=await s.evaluate(e=>({active:document.activeElement===e,visible:e.matches(':focus-visible'),outline:getComputedStyle(e).outlineStyle,outlineWidth:getComputedStyle(e).outlineWidth,shadow:getComputedStyle(e).boxShadow}));assert.ok(focus.active&&focus.visible&&(focus.outline!=='none'&&parseFloat(focus.outlineWidth)>0||focus.shadow!=='none'));
  const before=await s.inputValue();await p.keyboard.press('ArrowDown');await p.keyboard.press('Enter');const after=await s.inputValue();assert.notEqual(before,after);const eventState=await p.evaluate(()=>({selected:els.drawSelect.value,printDisabled:els.printLayoutBtn.disabled,ok:lastResults[+els.drawSelect.value].ok}));assert.equal(eventState.printDisabled,!eventState.ok);
  keyboard.push({width,lang,theme,focus,before,after,accessibleSnapshot:await s.ariaSnapshot(),eventState});await s.selectOption(before);
 }
 }}}
 assert.equal(errors.length,0);assert.equal(remote.length,0);save(route==='http'?'ui':'ui-'+route,{browser:b.version(),route,rows,keyboard,errors,remote});console.log('C4a U01/A01 PASS',rows.length,'responsive combinations,',keyboard.length,'keyboard/name checks');
}finally{await b.close();await server.close();fs.rmSync(tmp,{recursive:true,force:true});}
