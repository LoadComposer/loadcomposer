// Independent verifier: no production geometry/validator functions are imported.
export function verify(test,result,{tolerance=1e-8}={}){
  const {input,container:c}=test,ts=input.types,e=[];const issue=(code,detail)=>e.push({code,detail});
  if(!Number.isFinite(input.gap)||input.gap<0||!Number.isFinite(input.verticalGap)||input.verticalGap<0)issue('INVALID_INPUT_CLEARANCE');
  if(!['innerLength','innerWidth','innerHeight'].every(k=>Number.isFinite(c[k])&&c[k]>0))issue('INVALID_CONTAINER');
  for(const t of ts)if(!Number.isSafeInteger(t.quantity)||t.quantity<0||![t.length,t.width,t.height].every(x=>Number.isFinite(x)&&x>0))issue('INVALID_INPUT_TYPE',t.typeIndex);
  const eq=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tolerance;
  const units=new Map();ts.forEach((t,g)=>{for(let k=1;k<=t.quantity;k++)units.set(`${g+1}.${k}`,{g,k,t});});
  const used=new Set(),floors=result.layout?.rects||[],unplaced=result.layout?.unplaced||[];
  const stacks=result.stacks||floors.map(r=>({rect:r,layers:[{...r,layer:1}],height:ts[r.typeIndex]?.height}));
  const floorIds=new Set();
  for(const r of floors){
    if(floorIds.has(r.id))issue('DUPLICATE_FLOOR_ID',r.id);floorIds.add(r.id);
    if(![r.x,r.y,r.length,r.width].every(Number.isFinite))issue('NON_FINITE_FLOOR',r.id);
    if(r.x < -tolerance||r.y < -tolerance||r.x+r.length>c.innerLength+tolerance||r.y+r.width>c.innerWidth+tolerance)issue('BOUNDS',r.id);
  }
  for(let i=0;i<floors.length;i++)for(let j=0;j<i;j++){
    const a=floors[i],b=floors[j],g=input.gap;
    if(!(a.x+a.length+g<=b.x+tolerance||b.x+b.length+g<=a.x+tolerance||a.y+a.width+g<=b.y+tolerance||b.y+b.width+g<=a.y+tolerance))issue('FLOOR_OVERLAP_OR_GAP',[a.id,b.id]);
  }
  let count=0,mixed=0,maxLayers=0;const positions=new Set(),stackFloorIds=new Set();
  for(const s of stacks){
    const r=s.rect,ls=s.layers||[],floor=floors.find(x=>x.id===r?.id);
    if(!r||!floor||!ls.length){issue('STACK_STRUCTURE',r?.id);continue;}
    if(stackFloorIds.has(r.id))issue('DUPLICATE_STACK_FLOOR',r.id);stackFloorIds.add(r.id);
    for(const key of ['id','typeIndex','unitNo','rotated','x','y','length','width'])if(r[key]!==floor[key])issue('STACK_FLOOR_COPY_MISMATCH',key);
    if(result.stacks){if(!/^P\d{2,}$/.test(s.positionId)||positions.has(s.positionId))issue('POSITION_ID',s.positionId);positions.add(s.positionId);if(r.positionId!==s.positionId||floor.positionId!==s.positionId)issue('POSITION_LINK',s.positionId);}
    const base=ts[ls[0]?.typeIndex];if(!base){issue('UNKNOWN_BASE',r.id);continue;}
    if(ls[0].id!==r.id)issue('BASE_REFERENCE',r.id);
    if(ls.length>(base.stackingEnabled?base.maxLayers:1))issue('MAX_LAYERS',r.id);
    let height=0;
    for(let l=0;l<ls.length;l++){
      const x=ls[l],u=units.get(x.id),t=ts[x.typeIndex];
      if(!u||u.g!==x.typeIndex||u.k!==x.unitNo||used.has(x.id)){issue('PALLET_REFERENCE',x.id);continue;}used.add(x.id);count++;
      if(typeof x.rotated!=='boolean')issue('ROTATION_TYPE',x.id);
      const L=x.rotated?t.width:t.length,W=x.rotated?t.length:t.width;
      if(t.length!==t.width&&t.rotationMode!=='auto'&&Boolean(x.rotated)!==(t.lockedOrientation==='rotated'))issue('ROTATION_LOCK',x.id);
      if(!eq(x.length,L)||!eq(x.width,W)||!eq(x.x,r.x)||!eq(x.y,r.y)||!eq(x.length,r.length)||!eq(x.width,r.width))issue('LAYER_GEOMETRY',x.id);
      if(result.stacks&&(x.layer!==l+1||x.positionId!==s.positionId))issue('LAYER_INDEX_OR_POSITION',x.id);
      if(!Number.isFinite(t.height)||t.height<=0)issue('INVALID_HEIGHT',x.id);
      if(W>(c.accessKnown===false?c.innerWidth:c.doorWidth)+tolerance||t.height>(c.accessKnown===false?c.innerHeight:c.doorHeight)+tolerance)issue('ACCESS',x.id);
      if(l){const b=ts[ls[l-1].typeIndex];if(!t.stackingEnabled||!b.stackingEnabled||t.stackRole==='base'||b.stackRole==='top'||!b.allowedAbove.includes(x.typeIndex))issue('ADJACENCY_ROLE',x.id);}
      height+=t.height+(l?input.verticalGap:0);
    }
    if(!eq(s.height,height)||height>c.innerHeight+tolerance)issue('STACK_HEIGHT',r.id);
    maxLayers=Math.max(maxLayers,ls.length);mixed+=Number(new Set(ls.map(x=>x.typeIndex)).size>1);
  }
  for(const x of unplaced){const u=units.get(x.id);if(!u||u.g!==x.typeIndex||u.k!==x.unitNo||used.has(x.id))issue('UNPLACED_REFERENCE',x.id);used.add(x.id);}
  if(used.size!==units.size||count+unplaced.length!==units.size)issue('INVENTORY',`${count}+${unplaced.length}/${units.size}`);
  if(count!==result.placedCount||result.layout.count!==floors.length||stackFloorIds.size!==floors.length)issue('COUNTS',count);
  if(result.stacks&&(result.floorPlacedCount!==floors.length||result.stackedCount!==count-floors.length||result.maxLayersUsed!==maxLayers||result.mixedGroupStacks!==mixed))issue('STACK_COUNTS',count);
  return {valid:!e.length,errors:e,placed:count,floor:floors.length};
}
