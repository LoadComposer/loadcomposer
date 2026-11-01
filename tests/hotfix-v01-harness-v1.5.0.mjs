import fs from 'node:fs';
import path from 'node:path';
import {JSDOM,VirtualConsole} from 'jsdom';
export const root=path.resolve(import.meta.dirname,'..');
export const clone=x=>structuredClone(x);
export const fixture=name=>JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/astra-v01/counterexamples',name)));
export async function harness(source=path.join(root,'site/downloads/loadcomposer-v1.5.0-standalone.html')) {
  const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(String(e)));
  const dom=new JSDOM(fs.readFileSync(source,'utf8'),{runScripts:'dangerously',url:'https://hotfix.invalid/',virtualConsole:vc,
    beforeParse(w){w.localStorage.setItem('loadcomposer.language','en');w.alert=()=>{};
      w.HTMLCanvasElement.prototype.getContext=()=>new Proxy({measureText:s=>({width:String(s).length*7})},{get:(o,k)=>o[k]??(()=>{})});
      w.HTMLCanvasElement.prototype.toDataURL=()=> 'data:image/png;base64,';}});
  await dom.window.loadComposerI18n.ready;await new Promise(r=>dom.window.setTimeout(r,0));
  if(errors.length)throw Error(errors.join('\n'));
  const w=dom.window;
  function solve(test){
    const {input,container}=clone(test),items=w.expandMixedItems(input.types);
    const a=w.loadComposerAdvancedStacking.solve(container,items,input,{bestMixedLayout:w.bestMixedLayout,packItems:w.packItems,
      frontCompactSelectedLayout:w.frontCompactSelectedLayout,seededShuffle:w.seededShuffle});
    const placed=a.used?a.placedCount:a.layout.count,total=items.length;
    const r={mode:'mixed',input,container,layout:clone(a.layout),layers:1,floorCapacity:a.layout.count,totalCapacity:placed,
      totalItems:total,placedCount:placed,allPlaced:placed===total,fitsQtyBySpace:placed===total,advancedStacking:true};
    if(a.used)Object.assign(r,{stacks:clone(a.stacks),floorPlacedCount:a.floorPlacedCount,stackedCount:a.stackedCount,maxLayersUsed:a.maxLayersUsed,mixedGroupStacks:a.mixedGroupStacks});
    r.validation=w.validateResultGeometry(r);
    r.validationError=r.validation.internalError;r.okDoor=r.validation.okDoor;r.okHeight=r.validation.okHeight;
    r.ok=r.allPlaced&&total>0&&r.validation.valid;
    if(r.stacks) {
      if(w.validateAdvancedOperationalResult)w.validateAdvancedOperationalResult(r);
      else {
        const check=w.loadComposerAdvancedStackingValidator.validate(r);r.advancedValidation=check;
        if(!check.valid){r.validation.errors.push(...check.errors);r.validation.valid=false;r.validation.internalError=true;}
        r.validationError=r.validation.internalError;r.ok=r.allPlaced&&total>0&&r.validation.valid;
      }
    }
    return {result:r,raw:clone(a)};
  }
  return {w,solve,errors,close:()=>dom.window.close()};
}
