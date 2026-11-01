import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
export const qa=path.resolve(import.meta.dirname,'../..'),out=path.join(qa,'operational-c3h-v1.5.0/results');
export const {harness}=await import(pathToFileURL(path.join(qa,'tests/hotfix-v01-harness-v1.5.0.mjs')));
export const oldFile=path.join(qa,'operational-c3h-v1.5.0/fixtures/C3f.html');
export const copy=x=>structuredClone(x),save=(n,x)=>fs.writeFileSync(path.join(out,n+'.json'),JSON.stringify(x,null,2));
