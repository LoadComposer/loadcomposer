import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {launchBrowser} from './browser-runtime.mjs';
import {root,fixture,clone} from './hotfix-v01-harness-v1.5.0.mjs';
const browser=await launchBrowser(root),rows=[],errors=[],remote=[];
try {
  const page=await browser.newPage({viewport:{width:1280,height:940}});
  page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(/^https?:/.test(r.url()))remote.push(r.url());});
  await page.goto(pathToFileURL(path.join(root,'site/downloads/loadcomposer-v1.5.0-standalone.html')).href);
  await page.waitForFunction(()=>document.documentElement.dataset.i18nReady==='true'&&window.eval('applicationInitialized'));
  const fixtures=[['minimal-validator-copy',fixture('minimal-validator-copy.json').bad],
    ...['stack-copy-outside','stack-copy-negative','stack-copy-overlap','infinite-stack-coordinate'].map(name=>[name,fixture(`validator-${name}.json`).result]),
    ['maxLayers-via-stack-copy-type',fixture('probe-maxLayers-via-stack-copy-type.json').result]];
  for(const lang of ['it','en','de','es','fr','pt','nl']) {
    await page.evaluate(async lang=>{await loadComposerI18n.setLanguage(lang);},lang);
    for(const [id,payload] of fixtures){
      const report=await page.evaluate(({id,payload})=>{
        const r=structuredClone(payload);
        if(id==='infinite-stack-coordinate'){r.stacks[0].rect.x=Infinity;r.stacks[0].layers.forEach(l=>l.x=Infinity);}
        // Simulate corruption after a successful calculation with stale flags.
        r.validation={valid:true,internalError:false,errors:[],okDoor:true,okHeight:true};r.validationError=false;r.ok=true;r.spaceAlert=evaluateSpaceAlert(r);
        window.__candidate=r;window.eval('lastResults = [window.__candidate]; resultFilterPrimary = "all"; resultFilterSecondary = "all";');
        let printed=0,schemas=0;
        window.eval('printDocumentInFrame = () => { window.__printCount++; };');window.__printCount=0;
        const originalSchema=getPrintSchemaDataUrl;
        window.getPrintSchemaDataUrl=(...args)=>{schemas++;return originalSchema(...args);};
        renderTable();renderDrawOptions();drawSelected();
        const localized=t('status.validationError'),fallback=t('preview.validationFallback');
        const table=document.getElementById('resultsBody').textContent;
        const checks=[];
        const errorPng=document.getElementById('layoutCanvas').toDataURL();
        for(const view of ['side','ramp'])for(const bw of [false,true])for(const layer of ['complete','1','2'])for(const detail of ['standard','layers','complete']){
          document.getElementById('printView').value=view;document.getElementById('printBw').checked=bw;
          document.getElementById('stackView').value=layer;document.getElementById('printDetail').value=detail;
          drawSelected();printCurrentLayout();
          checks.push(document.getElementById('printLayoutBtn').disabled&&r.validationError&&!r.ok&&
            document.getElementById('layoutNotes').textContent.includes(fallback)&&document.getElementById('layoutCanvas').toDataURL()===errorPng);
        }
        window.getPrintSchemaDataUrl=originalSchema;
        // Revalidation on unit presentation refresh must retain the failure.
        refreshUnitPresentation();drawSelected();
        return {id,language:loadComposerI18n.language,checks:checks.length,allBlocked:checks.every(Boolean),
          printed:window.__printCount,schemas,localizedTable:table.includes(localized),notes:document.getElementById('layoutNotes').textContent,
          stillBlocked:document.getElementById('printLayoutBtn').disabled&&!r.ok&&r.validationError,
          layersHidden:document.getElementById('stackViewControl').classList.contains('hidden'),
          advancedValid:r.advancedValidation.valid};
      },{id,payload});
      assert.equal(report.allBlocked,true,`${lang}/${id}`);assert.equal(report.printed,0);assert.equal(report.schemas,0);
      assert.equal(report.localizedTable,true);assert.equal(report.stillBlocked,true);assert.equal(report.layersHidden,true);
      assert.equal(report.advancedValid,false);rows.push(report);
    }
  }
  // Render a successful result first, then corrupt it in place. Exercise
  // preview-only and print-only entry paths without pre-refreshing the table.
  async function operationalControl() {
    await page.evaluate(async()=>{
      loadComposerComputation.cancel();
      els.mixedRows.innerHTML=mixedGroupHtml({presetId:'custom',customName:'Upper',quantity:15,length:900,width:600,height:600});
      for(const [k,g] of allGroupElements().entries()){
        g.querySelector('[data-field="presetId"]').value='custom';g.querySelector('[data-field="customName"]').value='V01 '+k;
        g.querySelector('[data-field="quantity"]').value=k?15:16;
        for(const [n,v] of Object.entries({length:900,width:600,height:600}))setLengthInputMm(g.querySelector(`[data-field="${n}"]`),v);
        g.querySelector('[data-field="stackingEnabled"]').checked=true;g.querySelector('[data-field="stackMaxLayers"]').value=3;
        g.dataset.stackRole='any';g.dataset.allowedAbove=JSON.stringify(allGroupElements().map(x=>x.dataset.rowId));
      }
      setLengthInputMm(els.gap,0);setLengthInputMm(els.verticalGap,0);syncUnifiedMode({calculate:false});
      calculate();await loadComposerComputation.whenIdle();
      const index=lastResults.findIndex(r=>r.ok&&r.stacks?.some(s=>s.layers.length>1));if(index<0)throw Error('missing registered V01 control');
      els.drawSelect.value=String(index);drawSelected();
    });
  }
  const staleRows=[];
  for(const entry of ['preview-only','print-only']) {
    await operationalControl();
    const state=await page.evaluate(({entry})=>{
      const r=lastResults[Number(els.drawSelect.value)];
      renderTable();renderDrawOptions();drawSelected();
      const initiallyAvailable=!document.getElementById('printLayoutBtn').disabled;
      window.__printCount=0;window.eval('printDocumentInFrame = () => { window.__printCount++; };');
      r.stacks[0].rect.x=1;r.stacks[0].layers.forEach(l=>l.x=1);
      if(entry==='preview-only')drawSelected();else printCurrentLayout();
      return {entry,initiallyAvailable,blocked:document.getElementById('printLayoutBtn').disabled,
        tableError:document.getElementById('resultsBody').textContent.includes(t('status.validationError')),
        previewError:document.getElementById('layoutNotes').textContent.includes(t('preview.validationFallback')),
        printed:window.__printCount,ok:r.ok};
    },{valid:fixture('minimal-validator-copy.json').valid,entry});
    assert.equal(state.initiallyAvailable,true);assert.equal(state.blocked,true);assert.equal(state.tableError,true);
    assert.equal(state.previewError,true);assert.equal(state.printed,0);assert.equal(state.ok,false);staleRows.push(state);
  }
  // A valid case must still print all three detail modes in both views/colours.
  const valid=clone(fixture('minimal-validator-copy.json').valid);
  await operationalControl();
  const validReport=await page.evaluate(()=>{
    const r=lastResults[Number(els.drawSelect.value)];
    renderTable();renderDrawOptions();drawSelected();
    window.eval('printDocumentInFrame = html => { window.__lastPrint = html; };');
    const checks=[];
    for(const view of ['side','ramp'])for(const bw of [false,true])for(const detail of ['standard','layers','complete']){
      document.getElementById('printView').value=view;document.getElementById('printBw').checked=bw;document.getElementById('printDetail').value=detail;
      window.__lastPrint='';printCurrentLayout();const content=window.__lastPrint;
      checks.push(content.includes('<!DOCTYPE html>')&&content.includes('class="advanced-manifest"')===(detail==='complete')&&
        content.includes('class="advanced-layer"')===(detail!=='standard'));
    }
    return {prints:checks.length,valid:checks.every(Boolean),available:isOperationalPrintAvailable(r)};
  },valid);
  assert.equal(validReport.valid,true);assert.equal(validReport.available,true);
  assert.deepEqual(errors,[]);assert.deepEqual(remote,[]);
  await page.close();
  fs.writeFileSync(path.join(root,'hotfix-v01-v1.5.0/browser-results.json'),JSON.stringify({status:'PASS',browser:browser.version(),
    offline:'file://',remoteRequests:remote,pageErrors:errors,corruptCases:rows.length,blockedCombinations:rows.reduce((n,r)=>n+r.checks,0),rows,staleRows,validReport},null,2)+'\n');
  console.log(`PASS Chromium V-01 gate: ${rows.length} localized cases, ${rows.reduce((n,r)=>n+r.checks,0)} blocked combinations, ${validReport.prints} valid prints, file:// offline`);
}finally{await browser.close();}
