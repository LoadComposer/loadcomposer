import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export const ROOT=path.resolve(import.meta.dirname,'..');
export const OUT=path.resolve(process.env.C4A_OUTPUT || ROOT+'/polish-c4a-v1.5.0/results');
fs.mkdirSync(OUT,{recursive:true});
export const languages=['en','it','de','es','fr','pt','nl'];
export const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
export const save=(name,value)=>fs.writeFileSync(OUT+'/'+name+'.json',JSON.stringify(value,null,2)+'\n');
export async function ready(p){await p.waitForFunction(()=>document.documentElement.dataset.i18nReady==='true');await p.evaluate(()=>loadComposerComputation.whenIdle());}
export async function mount(p,groups){return p.evaluate(async groups=>{
 loadComposerComputation.cancel();
 els.mixedRows.innerHTML=groups.slice(1).map((s,i)=>mixedGroupHtml({presetId:'custom',quantity:s.q,customName:'C4a '+(i+2),length:s.l,width:s.w,height:s.h})).join('');
 const gs=allGroupElements();gs.forEach((g,i)=>{const s=groups[i];selectPresetForGroup(g,'custom',false);g.querySelector('[data-field="quantity"]').value=s.q;g.querySelector('[data-field="customName"]').value='C4a '+(i+1);g.querySelector('[data-field="identifier"]').value='LOT-'+(i+1);for(const [k,v] of Object.entries({length:s.l,width:s.w,height:s.h}))setLengthInputMm(g.querySelector(`[data-field="${k}"]`),v);g.querySelector('[data-field="allowRotate"]').checked=true;g.querySelector('[data-field="stackingEnabled"]').checked=!!s.stack;g.querySelector('[data-field="stackMaxLayers"]').value=s.layers||3;g.dataset.stackRole='any';g.dataset.allowedAbove=JSON.stringify(gs.map(x=>x.dataset.rowId));updateGroupVisuals(g);});
 setLengthInputMm(els.gap,0);setLengthInputMm(els.verticalGap,0);syncUnifiedMode({calculate:false});const v=validateAndReadInput();if(!v.valid)throw Error(v.errors.join(';'));calculate();await loadComposerComputation.whenIdle();return loadComposerComputation.state;
},groups);}
export const pallet=(q,l=1200,w=800,h=1500,extra={})=>({q,l,w,h,...extra});
