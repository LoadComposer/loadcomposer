import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {launchBrowser} from '../scripts/browser-runtime.mjs';
import {serverFor} from './computation-harness-v1.5.0.mjs';
import {CURRENT_VERSION} from './current-release.mjs';
import {tooltipDelta} from './tooltip-scope-helper-v1.5.1.mjs';

const ROOT=path.resolve(import.meta.dirname,'..');
const OUT=path.resolve(process.env.PALLET_GAP_OUTPUT||path.join(ROOT,'pallet-gap-evidence-v1.5.1'));
const labels={it:'Gioco tra pallet',en:'Pallet gap',de:'Palettenabstand',es:'Espacio entre palés',fr:'Jeu entre palettes',pt:'Espaço entre paletes',nl:'Palletafstand'};
const widths=[320,375,430,600,768,844,1024,1280];
const fields=['gap','verticalGap'];
const labelId=id=>id==='gap'?'gapLabel':'verticalGapLabel';
fs.mkdirSync(OUT,{recursive:true});
const browser=await launchBrowser(ROOT),server=await serverFor(path.join(ROOT,'site'));
const rows=[],actions=[],errors=[];
async function ready(p){await p.waitForFunction(()=>document.documentElement.dataset.i18nReady==='true');await p.evaluate(()=>loadComposerComputation.whenIdle());}
async function measure(p){return p.locator('#loadSettingsSection').evaluate(section=>{
  const box=e=>{const r=e.getBoundingClientRect?e.getBoundingClientRect():e;return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
  const fields=['gap','verticalGap'].map(id=>{
    const input=section.querySelector('#'+id),caption=section.querySelector(id==='gap'?'#gapLabel':'#verticalGapLabel'),button=section.querySelector(`[popovertarget="${id}Help"]`),range=document.createRange();range.selectNodeContents(caption);
    const style=getComputedStyle(button);
    return {id,visible:!!input.getBoundingClientRect().height,input:box(input),caption:box(caption),text:[...range.getClientRects()].filter(r=>r.width&&r.height).map(box),button:box(button),labels:input.labels.length,description:input.getAttribute('aria-describedby'),icon:button.querySelector('span').outerHTML,style:{color:style.color,background:style.backgroundColor,width:style.width,height:style.height,borderRadius:style.borderRadius},anchor:style.anchorName};
  });
  return {height:section.getBoundingClientRect().height,width:innerWidth,scroll:document.documentElement.scrollWidth,sectionOverflow:section.scrollHeight>section.clientHeight+1,controls:[...section.querySelectorAll('.unit-segments,#gap,#verticalGap')].filter(e=>e.getBoundingClientRect().height).map(box),fields};
});}
async function state(p){return p.evaluate(()=>({job:loadComposerComputation.state,results:lastResults.length,selected:els.drawSelect.value,printDisabled:els.printLayoutBtn.disabled}));}
async function checkPopover(p,method,id,capture){
  const before=await measure(p),prior=await state(p),button=p.locator(`[popovertarget="${id}Help"]`),help=p.locator('#'+id+'Help');
  if(method==='keyboard'){
    await p.locator('#'+id).focus();await p.keyboard.press('Tab');
    assert.ok(await button.evaluate(e=>e===document.activeElement&&e.matches(':focus-visible')));
    assert.ok(await button.evaluate(e=>getComputedStyle(e).outlineStyle!=='none'&&parseFloat(getComputedStyle(e).outlineWidth)>=2));
    await p.keyboard.press('Enter');
  }else if(method==='touch')await button.tap();else await button.click();
  assert.ok(await help.evaluate(e=>e.matches(':popover-open')));
  for(const other of fields.filter(x=>x!==id))assert.ok(await p.locator('#'+other+'Help').evaluate(e=>!e.matches(':popover-open')),'native auto popovers must be exclusive');
  const popup=await help.evaluate(e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,viewportWidth:innerWidth,viewportHeight:innerHeight,overflow:e.scrollWidth>e.clientWidth+1,anchor:getComputedStyle(e).positionAnchor};});
  assert.ok(popup.left>=-1&&popup.top>=-1&&popup.right<=popup.viewportWidth+1&&popup.bottom<=popup.viewportHeight+1&&!popup.overflow,JSON.stringify({id,method,popup}));
  assert.equal((await measure(p)).height,before.height,'tooltip changes settings height');
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),before.scroll);
  assert.deepEqual(await state(p),prior,'tooltip changes calculation, selection or print gate');
  if(capture)await p.screenshot({path:path.join(OUT,capture)});
  if(method==='keyboard'){
    await p.keyboard.press('Escape');assert.ok(await button.evaluate(e=>document.activeElement===e));
    await p.keyboard.press('Space');assert.ok(await help.evaluate(e=>e.matches(':popover-open')));await p.keyboard.press('Escape');
  }else if(method==='touch'){
    await button.tap();assert.ok(await help.evaluate(e=>!e.matches(':popover-open')));await button.tap();await p.touchscreen.tap(2,2);
  }else await p.mouse.click(2,2);
  assert.ok(await help.evaluate(e=>!e.matches(':popover-open')));
  return popup;
}
try{
  const it=tooltipDelta.catalogs.it.after;
  assert.equal(it['pallet.gapHelp'],"Spazio da lasciare tra un pallet e l'altro sul pavimento del mezzo. Lascia 0 se non serve.");
  assert.equal(it['pallet.verticalGapHelp'],'Spazio per eventuali interfalde o separatori tra i pallet sovrapposti. Lascia 0 se non serve.');
  for(const [lang,label] of Object.entries(labels))for(const theme of ['light','dark']){
    const c=await browser.newContext(),p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(server.url);await ready(p);await p.evaluate(l=>loadComposerI18n.setLanguage(l),lang);await p.locator('#themeToggle').click();await p.locator(`[data-theme-value="${theme}"]`).click();
    const catalog=JSON.parse(fs.readFileSync(path.join(ROOT,`site/lang/${lang}.json`),'utf8')).translations;
    for(const width of widths){await p.setViewportSize({width,height:width===844?390:1000});for(const stack of [false,true]){
      await p.locator('#stackable').setChecked(stack);await ready(p);
      assert.equal(await p.locator('#gapLabel').textContent(),label);
      assert.equal(await p.locator('#verticalGapLabel').textContent(),catalog['pallet.verticalGap']);
      assert.equal(await p.locator('#verticalGapSetting').isVisible(),stack);
      assert.equal(await p.locator('[popovertarget="verticalGapHelp"]').isVisible(),stack);
      if(!stack)assert.equal(await p.locator('#verticalGapHelp').isVisible(),false);
      const geometry=await measure(p);assert.ok(geometry.scroll<=width+1&&!geometry.sectionOverflow,JSON.stringify({lang,theme,width,stack,geometry}));
      assert.ok(geometry.controls.every(r=>r.height>=40&&r.left>=0&&r.right<=width+1));
      if(width>=600)assert.ok(Math.max(...geometry.controls.map(x=>x.top))-Math.min(...geometry.controls.map(x=>x.top))<=1,'control alignment');
      if(stack){assert.equal(geometry.fields[0].icon,geometry.fields[1].icon);assert.deepEqual(geometry.fields[0].style,geometry.fields[1].style,'info button style differs');assert.notEqual(geometry.fields[0].anchor,geometry.fields[1].anchor);}
      const popups=[];
      for(const f of geometry.fields.filter(x=>x.visible)){
        assert.equal(f.labels,1);assert.equal(f.description,f.id+'Help');assert.ok(f.button.width>=24&&f.button.height>=24);assert.ok(f.text.every(r=>r.left>=f.caption.left-1&&r.right<=f.button.left+1),'caption/button overlap');
        assert.equal(await p.locator('#'+f.id+'Help').textContent(),tooltipDelta.catalogs[lang].after['pallet.'+f.id+'Help']);assert.equal(await p.locator('#'+f.id+'Help').getAttribute('popover'),'auto');
        await p.locator('#'+labelId(f.id)).click();assert.ok(await p.locator('#'+f.id).evaluate(e=>document.activeElement===e));
        const capture=stack&&[375,768,1280].includes(width)&&lang==='it'?`tooltip-${f.id}-${width}-${lang}-${theme}.png`:null;
        popups.push({field:f.id,mouse:await checkPopover(p,'mouse',f.id,capture),keyboard:await checkPopover(p,'keyboard',f.id)});
      }
      rows.push({lang,theme,width,stack,geometry,popups});
      if(width===768&&stack&&theme==='light'){
        const cdp=await c.newCDPSession(p),root=(await cdp.send('DOM.getDocument')).root;
        for(const id of fields)for(const selector of ['#'+id,`[popovertarget="${id}Help"]`]){
          const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector});const node=(await cdp.send('Accessibility.getPartialAXTree',{nodeId,fetchRelatives:false})).nodes[0];assert.equal(node.name.value,catalog['pallet.'+id]);assert.equal(node.description.value,tooltipDelta.catalogs[lang].after['pallet.'+id+'Help']);actions.push({lang,selector,ax:node});
        }await cdp.detach();
        for(const unit of ['mm','cm','in']){
          await p.locator(`.unit-option:has(input[value="${unit}"])`).click();
          for(const id of fields){await p.locator('#'+id).fill('1');await p.keyboard.press('Tab');await ready(p);const result=await p.evaluate(id=>({unit:loadComposerUnits.unit,mm:+els[id].dataset.mm,valid:validateAndReadInput().valid,results:lastResults.length,phase:loadComposerComputation.state.phase,values:lastResults.map(r=>r.input[id])}),id);assert.equal(result.unit,unit);assert.equal(result.mm,{mm:1,cm:10,in:25}[unit]);assert.ok(result.valid);assert.equal(result.results,12);assert.equal(result.phase,'complete');assert.ok(result.values.every(x=>x===result.mm));actions.push({lang,unit,field:id,result});}
        }
        await p.locator('.unit-option:has(input[value="mm"])').click();
        for(const id of fields){await p.locator('#'+id).fill('-');assert.ok(await p.locator('#printLayoutBtn').isDisabled());assert.equal(await p.evaluate(()=>lastResults.length),0);await p.locator('#'+id).fill('0');await p.keyboard.press('Tab');await ready(p);assert.equal(await p.evaluate(()=>lastResults.length),12);}
        // Keyboard OFF while vertical help is open must close its native state, not just hide its box.
        await p.locator('[popovertarget="verticalGapHelp"]').click();await p.locator('#stackable').focus();await p.keyboard.press('Space');await ready(p);assert.equal(await p.locator('#verticalGapSetting').isVisible(),false);assert.ok(await p.locator('#verticalGapHelp').evaluate(e=>!e.matches(':popover-open')));await p.keyboard.press('Space');await ready(p);assert.ok(await p.locator('#verticalGapHelp').evaluate(e=>!e.matches(':popover-open')));actions.push({lang,keyboardOffClosesHelp:true});
      }
    }}await c.close();console.log('Two spacing tooltips',lang,theme,'PASS');
  }
  for(const lang of Object.keys(labels)){
    const c=await browser.newContext({viewport:{width:375,height:812},hasTouch:true,isMobile:true});await c.setOffline(true);const p=await c.newPage();await p.goto('file://'+path.join(ROOT,`site/downloads/loadcomposer-v${CURRENT_VERSION}-standalone.html`));await ready(p);await p.evaluate(l=>loadComposerI18n.setLanguage(l),lang);await p.locator('#stackable').check();await ready(p);
    for(const id of fields)actions.push({lang,field:id,touch:await checkPopover(p,'touch',id,lang==='it'||lang==='de'?`touch-${id}-${lang}.png`:null)});await c.close();
  }
  for(const lang of ['de','pt','nl']){
    const c=await browser.newContext({viewport:{width:640,height:500},deviceScaleFactor:2}),p=await c.newPage();await p.goto(server.url);await ready(p);await p.evaluate(l=>loadComposerI18n.setLanguage(l),lang);await p.locator('#stackable').check();await ready(p);
    for(const id of fields){await p.evaluate(id=>scrollTo(0,document.getElementById(id).getBoundingClientRect().top+scrollY-innerHeight+80),id);actions.push({lang,field:id,zoom:'200% layout/raster equivalent; toolbar not automated',margin:await checkPopover(p,'keyboard',id,`margin-zoom-${id}-${lang}.png`)});}await c.close();
  }
  for(const row of rows) if(row.width>=768) assert.ok(row.geometry.fields.filter(x=>x.visible).every(f=>f.text.length===1),'desktop/tablet spacing captions must remain on one line');
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({pass:true,version:CURRENT_VERSION,browser:browser.version(),rows,actions,errors},null,2));console.log('Two spacing tooltip UI PASS',rows.length,'responsive states;',actions.length,'AX/unit/touch/visibility/zoom checks');
}finally{await browser.close();await server.close();}
