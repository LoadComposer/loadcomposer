// DOM setup only; no product decision or test assertion reused from maintainer QA.
export async function setup(page,{quantity=17,groups=1,stack=false,maxLayers=3,length=800,width=600,height=500,dense=false}={}){
 return page.evaluate(o=>{
 loadComposerComputation.cancel();els.mixedRows.innerHTML=Array.from({length:o.groups-1},(_,k)=>mixedGroupHtml({presetId:'custom',customName:'Independent '+(k+1),quantity:1,length:800,width:600,height:500})).join('');
 const gs=allGroupElements(),truck=CONTAINERS.find(c=>c.id==='truck-curtain-1360');
 gs.forEach((g,k)=>{g.querySelector('[data-field="presetId"]').value='custom';g.querySelector('[data-field="customName"]').value='Independent '+k;g.querySelector('[data-field="quantity"]').value=Math.floor(o.quantity/o.groups)+(k<o.quantity%o.groups?1:0);
  for(const [n,v] of Object.entries({length:o.dense?truck.innerLength:o.length,width:o.dense?truck.innerWidth:o.width,height:o.dense?5:o.height}))setLengthInputMm(g.querySelector(`[data-field="${n}"]`),v);
  g.querySelector('[data-field="stackingEnabled"]').checked=o.stack;g.querySelector('[data-field="stackMaxLayers"]').value=o.maxLayers;g.querySelector('[data-field="allowRotate"]').checked=true;g.dataset.stackRole='any';g.dataset.allowedAbove=JSON.stringify(gs.map(e=>e.dataset.rowId));
 });setLengthInputMm(els.gap,0);setLengthInputMm(els.verticalGap,0);els.loadMode.value=o.groups>1?'mixed':'single';return validateAndReadInput();
 },{quantity,groups,stack,maxLayers,length,width,height,dense});
}
