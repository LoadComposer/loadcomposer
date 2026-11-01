export const clone=x=>structuredClone(x);
export const base={mode:'single',pallet:{length:1000,width:1000,height:500,rotationMode:'auto',lockedOrientation:'normal'},quantity:2,gap:0,verticalGap:0,stackable:true,maxLayers:1};
export const box={id:'G01',innerLength:2000,innerWidth:1000,innerHeight:2400,doorWidth:1000,doorHeight:2400,accessKnown:true};
export const mixed=(quantity=2,advanced=false)=>({mode:'mixed',quantity,types:[0,1].map(k=>({name:'G'+k,quantity:Math.floor(quantity/2)+(k<quantity%2?1:0),length:1000,width:1000,height:500,rotationMode:'auto',lockedOrientation:'normal',stackingEnabled:advanced,stackRole:'any',maxLayers:3,allowedAbove:[0,1]})),gap:0,verticalGap:0,advancedStacking:advanced});
export function envelope(p){p.usedLength=Math.max(0,...p.rects.map(r=>r.x+r.length));p.usedWidth=Math.max(0,...p.rects.map(r=>r.y+r.width));}
// Coherent partial transformations; do not overwrite the previous operational flags.
export function reduce(r,n=1){
 const p=r.layout;
 if(r.mode==='single'){
  p.rects.splice(Math.max(0,p.rects.length-n));p.count=p.materializedCount=p.rects.length;p.truncated=false;
  p.stackCounts=p.rects.map(x=>x.stackCount);p.loadedPalletCount=p.stackCounts.reduce((a,b)=>a+b,0);
  p.orientationCounts={normal:p.rects.filter(x=>!x.rotated).length,rotated:p.rects.filter(x=>x.rotated).length};envelope(p);
  r.placedCount=p.loadedPalletCount;r.placedFloorPositions=p.count;r.unplacedCount=r.input.quantity-r.placedCount;r.loadLayers=Math.max(0,...p.stackCounts);
  const c=r.capacityLayout;c.rects=clone(p.rects).map(({stackCount,...x})=>x);c.count=c.materializedCount=c.rects.length;c.truncated=false;c.orientationCounts={...p.orientationCounts};envelope(c);
  p.sourceCapacityCount=c.count;r.floorCapacity=c.count;r.totalCapacity=c.count*r.availableLayers;
  r.requestedFloorPositions=r.availableLayers>0?(r.input.stackable?Math.min(r.input.quantity,r.totalCapacity,c.count):r.input.quantity):0;
  r.requiredLayers=c.count?Math.ceil(r.input.quantity/c.count):0;r.requiredStackHeight=r.requiredLayers?r.requiredLayers*r.input.pallet.height+(r.requiredLayers-1)*r.input.verticalGap:0;
  r.stackingLimitReason=r.input.stackable&&r.requiredLayers>r.availableLayers?(r.physicalLayers<r.input.maxLayers?'height':r.input.maxLayers<r.physicalLayers?'max-layers':'height-and-max-layers'):null;
 }else if(r.stacks){
  for(let k=0;k<n;k++){const s=r.stacks.at(-1),d=s.layers.pop();p.unplaced.push(d);if(!s.layers.length){r.stacks.pop();p.rects.pop();}else{s.height=s.layers.reduce((a,l,j)=>a+r.input.types[l.typeIndex].height+(j?r.input.verticalGap:0),0);}}
  p.count=p.materializedCount=p.rects.length;p.truncated=false;envelope(p);r.floorCapacity=p.count;r.floorPlacedCount=r.stacks.length;
  r.placedCount=r.stacks.reduce((a,s)=>a+s.layers.length,0);r.totalCapacity=r.placedCount;r.stackedCount=r.placedCount-r.stacks.length;
  r.maxLayersUsed=Math.max(0,...r.stacks.map(s=>s.layers.length));r.mixedGroupStacks=r.stacks.filter(s=>new Set(s.layers.map(l=>l.typeIndex)).size>1).length;
 }else{p.unplaced.push(...p.rects.splice(Math.max(0,p.rects.length-n)));p.count=p.materializedCount=p.rects.length;p.truncated=false;envelope(p);r.placedCount=r.floorCapacity=r.totalCapacity=p.count;}
 return r;
}
export function dimensions(w,r){return {geometryValid:r.validation.internalError===false,validationValid:r.validation.valid,loadComplete:r.placedCount===(r.mode==='single'?r.input.quantity:r.input.types.reduce((a,t)=>a+t.quantity,0)),operationallyEligible:r.ok,printAllowed:w.isOperationalPrintAvailable(r)};}
