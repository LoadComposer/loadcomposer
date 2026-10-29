import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {launchBrowser} from '../scripts/browser-runtime.mjs';
import {serverFor} from './computation-harness-v1.5.0.mjs';
import {ROOT,OUT,languages,save,sha,ready,mount,pallet as g} from './c4a-helpers-v1.5.0.mjs';
const baseline=process.env.C4A_RECORD_BASELINE==='1',source=path.resolve(process.env.C4A_SOURCE||ROOT),fixturePath=ROOT+'/polish-c4a-v1.5.0/fixtures/c3j-print.json';
const cases=[
 {id:'single-floor',groups:[g(10)],layers:1,key:'print.warehouseNoteFloor'},
 {id:'single-two',groups:[g(20,1200,800,900,{stack:true,layers:2})],layers:2,key:'print.warehouseNoteLayers'},
 {id:'single-three',groups:[g(30,1200,800,650,{stack:true,layers:3})],layers:3,key:'print.warehouseNoteLayers'},
 {id:'mixed-floor',groups:[g(5),g(5,1000,800)],layers:1,key:'print.warehouseNoteMixed'},
 {id:'advanced-piles',groups:[g(10,1200,1000,700,{stack:true}),g(10,1000,800,500,{stack:true}),g(10,800,600,450,{stack:true})],layers:3,key:'advanced.warehouseNote'},
 {id:'advanced-floor',groups:[g(2,1200,800,1500,{stack:true}),g(2,1000,800,1500,{stack:true})],layers:1,key:'advanced.warehouseNoteFloor'}
];
const b=await launchBrowser(ROOT),server=await serverFor(source+'/site'),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'loadcomposer-c4a-')),rows=[],record={};
if(!baseline)execFileSync('unzip',['-qq',source+'/site/downloads/loadcomposer-v1.5.0-standalone.zip','-d',tmp]);
const expected=baseline?{}:JSON.parse(fs.readFileSync(fixturePath));
try{
 for(const route of baseline?['file']:['http','file','zip']){
 const cx=await b.newContext({viewport:{width:1440,height:1000},locale:'en-GB'}),p=await cx.newPage(),errors=[],remote=[];
 p.on('pageerror',e=>errors.push(e.message));await cx.route('**/*',r=>{if(/^https?:/.test(r.request().url())&&!r.request().url().startsWith(server.url)){remote.push(r.request().url());return r.abort();}return r.continue();});if(route!=='http')await cx.setOffline(true);
 const url=route==='http'?server.url:'file://'+(route==='file'?source+'/site/downloads/loadcomposer-v1.5.0-standalone.html':tmp+'/loadcomposer-v1.5.0-standalone/loadcomposer-v1.5.0-standalone.html');
 await p.goto(url);await ready(p);await p.evaluate(()=>{window.__docs=[];printDocumentInFrame=html=>__docs.push(html);window.alert=()=>{};});
 for(const f of cases){await mount(p,f.groups);await p.selectOption('#drawSelect',String(await p.evaluate(()=>lastResults.findIndex(r=>r.container.id==='20dc'))));
 const model=await p.evaluate(()=>lastResults.map(r=>({id:r.container.id,ok:r.ok,placed:r.placedCount,total:r.totalCapacity,layout:r.layout,stacks:r.stacks,maxLayersUsed:r.maxLayersUsed,loadLayers:r.loadLayers,access:r.accessOk,validation:r.validation})));
 const geometry=sha(JSON.stringify(model));if(baseline)record[f.id]={geometry,prints:{}};else assert.equal(geometry,expected[f.id].geometry,route+' '+f.id+' geometry');
 const facts=await p.evaluate(()=>{const r=lastResults[+els.drawSelect.value];return {ok:r.ok,placed:r.placedCount,layers:r.stacks?Math.max(...r.stacks.map(s=>s.layers.length)):Math.max(...r.layout.rects.map(x=>x.stackCount||1)),floor:r.stacks?.length??r.layout.rects.length,hasStackArray:!!r.stacks,advanced:!!r.advancedStacking};});assert.ok(facts.ok);assert.equal(facts.placed,f.groups.reduce((n,g)=>n+g.q,0));assert.equal(facts.layers,f.layers);console.log(route,f.id,JSON.stringify(facts));assert.equal(facts.advanced,f.id.startsWith('advanced'),f.id);assert.equal(facts.hasStackArray,f.id==='advanced-piles',f.id);
 for(const lang of languages){await p.evaluate(l=>loadComposerI18n.setLanguage(l),lang);const catalog=JSON.parse(fs.readFileSync(ROOT+'/site/lang/'+lang+'.json')).translations;
 for(const view of ['ramp','side'])for(const bw of [false,true]){await p.selectOption('#printView',view);await p.locator('#printBw').setChecked(bw);
 const d=await p.evaluate(()=>{__docs.length=0;const start=performance.now();drawSelected();const rendered=performance.now();printCurrentLayout();const ended=performance.now();if(__docs.length!==1)throw Error('print count '+__docs.length);const html=__docs[0],d=new DOMParser().parseFromString(html,'text/html');return {html,note:d.querySelector('.warehouse-note').textContent,images:[...d.images].map(x=>x.src),renderMs:rendered-start,printMs:ended-rendered,title:d.title};});assert.ok(d.images.length>0);const imageHashes=d.images.map(sha),key=[lang,view,bw?'bw':'colour'].join('-');
 if(baseline)record[f.id].prints[key]={imageHashes,note:d.note};else{assert.deepEqual(imageHashes,expected[f.id].prints[key].imageHashes,route+' '+f.id+' '+key+' image parity');assert.equal(d.note,catalog[f.key]+' '+catalog['print.warehouseNote']);assert.ok(!d.note.includes('Floor level and rear loading only'));}
 if(route==='file'&&((['single-three','mixed-floor'].includes(f.id)&&lang==='en')||(f.id==='single-three'&&view==='ramp'&&!bw))){fs.writeFileSync(OUT+'/'+f.id+'-'+key+'.html',d.html);}
 rows.push({route,fixture:f.id,lang,view,bw,geometry,facts,note:d.note,imageHashes,renderMs:d.renderMs,printMs:d.printMs,title:d.title});
 }}}
 assert.equal(errors.length,0);assert.equal(remote.length,0);save(baseline?'print-before':'print',{browser:b.version(),baseline,rows,errors,remote});await cx.close();
 }
 if(baseline)fs.writeFileSync(fixturePath,JSON.stringify(record,null,2)+'\n');
 console.log('C4a P01',baseline?'BASELINE':'PASS',rows.length,'actual print documents with image/geometry parity');
}finally{await b.close();await server.close();fs.rmSync(tmp,{recursive:true,force:true});}
