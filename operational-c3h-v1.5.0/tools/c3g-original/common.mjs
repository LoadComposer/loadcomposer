import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
export const home=path.resolve(import.meta.dirname,'..'),qa=path.resolve(process.env.QA_ROOT||path.join(home,'qa/loadcomposer-v1.5.0-test-bundle')),out=path.resolve(process.env.C3G_OUT||path.join(home,'results'));fs.mkdirSync(out,{recursive:true});
export const {harness}=await import(pathToFileURL(path.join(qa,'tests/hotfix-v01-harness-v1.5.0.mjs')));
export const oldFile=path.join(qa,'operational-c3f-v1.5.0/fixtures/C3d.html');
export const save=(n,x)=>fs.writeFileSync(path.join(out,n+'.json'),JSON.stringify(x,(k,v)=>typeof v==='number'&&!Number.isFinite(v)?String(v):v,2));
export const base={mode:'single',pallet:{length:1000,width:1000,height:500,rotationMode:'auto',lockedOrientation:'normal'},quantity:2,gap:0,verticalGap:0,stackable:true,maxLayers:1};
export const box={id:'G01',innerLength:2000,innerWidth:1000,innerHeight:2400,doorWidth:1000,doorHeight:2400,accessKnown:true};
export const copy=x=>structuredClone(x);
export function measure(w,r){let validation;try{validation=copy(w.validateResultGeometry(r));}catch(e){validation={exception:String(e),valid:false,internalError:true};}r.ok=true;r.validationError=false;r.validation={valid:true,internalError:false};let gate;try{gate=w.isOperationalPrintAvailable(r);}catch(e){gate=String(e);}return {validation,gate,after:{ok:r.ok,validationError:r.validationError,validation:copy(r.validation)}};}
export function envelope(p){p.usedLength=Math.max(0,...p.rects.map(r=>r.x+r.length));p.usedWidth=Math.max(0,...p.rects.map(r=>r.y+r.width));}
export function trimSingle(r){let p=r.layout;p.rects.pop();p.count=p.materializedCount=p.rects.length;p.truncated=false;p.orientationCounts={normal:p.rects.filter(x=>!x.rotated).length,rotated:p.rects.filter(x=>x.rotated).length};p.stackCounts.pop();p.loadedPalletCount=p.stackCounts.reduce((a,b)=>a+b,0);r.placedCount=p.loadedPalletCount;r.placedFloorPositions=p.count;r.unplacedCount=r.input.quantity-r.placedCount;r.fitsQtyBySpace=r.unplacedCount===0;r.loadLayers=Math.max(0,...p.stackCounts);envelope(p);}
