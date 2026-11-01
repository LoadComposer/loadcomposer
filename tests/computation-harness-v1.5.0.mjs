import fs from 'node:fs';import http from 'node:http';import path from 'node:path';
export async function serverFor(root,{denyWorker=false}={}){
 const csp=fs.readFileSync(path.join(root,'_headers'),'utf8').match(/Content-Security-Policy: ([^\n]+)/)[1];
 const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Security-Policy',denyWorker?csp.replace('worker-src blob:',"worker-src 'none'"):csp);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.png')?'image/png':'text/html');res.end(fs.readFileSync(file));}catch(_){res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));return {url:`http://127.0.0.1:${server.address().port}/`,close:async()=>{server.closeAllConnections();await new Promise(r=>server.close(r));}};
}
export async function mount(page,test,{renderSettings=true}={}){
 return page.evaluate(({input,renderSettings})=>{
  window.loadComposerComputation?.cancel();
  const started=performance.now();
  const types=input.types;
  els.mixedRows.innerHTML=types.slice(1).map(type=>mixedGroupHtml({...type,presetId:'custom',customName:type.name,allowRotate:type.rotationMode==='auto'})).join('');
  const groups=allGroupElements();
  groups.forEach((group,g)=>{
   const type=types[g];group.dataset.expanded=g?'false':'true';group.querySelector('[data-role="groupBody"]').hidden=Boolean(g);group.querySelector('[data-action="toggleGroup"]').setAttribute('aria-expanded',String(!g));
   group.querySelector('[data-field="presetId"]').value='custom';group.querySelector('[data-field="quantity"]').value=type.quantity;
   for(const field of ['length','width','height'])setLengthInputMm(group.querySelector(`[data-field="${field}"]`),type[field]);
   group.querySelector('[data-field="customName"]').value=type.name||'Performance';group.querySelector('[data-field="identifier"]').value=type.identifier||'';
   group.querySelector('[data-field="allowRotate"]').checked=type.rotationMode==='auto';group.querySelectorAll('[data-field="lockedOrientation"]').forEach(r=>r.checked=r.value===type.lockedOrientation);
   group.querySelector('[data-field="stackingEnabled"]').checked=type.stackingEnabled;group.querySelector('[data-field="stackMaxLayers"]').value=type.maxLayers;
   group.dataset.stackRole=type.stackRole;group.dataset.allowedAbove=JSON.stringify(type.allowedAbove.map(k=>groups[k].dataset.rowId));
  });
  setLengthInputMm(els.gap,input.gap);setLengthInputMm(els.verticalGap,input.verticalGap);els.loadMode.value='mixed';
  if(renderSettings){i18n.apply(els.mixedRows);syncUnifiedMode({calculate:false});}
  const setupMs=performance.now()-started,validationStarted=performance.now(),validation=validateAndReadInput();
  return {setupMs,normalizationMs:performance.now()-validationStarted,valid:validation.valid,errors:validation.errors,groups:groups.length,compatibilityControls:document.querySelectorAll('[data-field="allowAbove"]').length,input:validation.input};
 },{input:test.input,renderSettings});
}
export async function ready(page){await page.waitForFunction(()=>document.documentElement.dataset.i18nReady==='true');await page.waitForFunction(()=>!window.loadComposerComputation?.pending());}
