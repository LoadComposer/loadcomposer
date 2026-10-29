// Exhaustive orthogonal packing + independently enumerated stack chains.
// Integer grid is complete for integer dimensions/gaps: fix the separating
// axis/order for each rectangle pair in any feasible layout. Longest paths in
// the two difference-constraint DAGs give integer, no-larger coordinates.
// Divide all floor lengths/gaps by their gcd; every grid anchor is enumerated.
function gcd(a,b){while(b)[a,b]=[b,a%b];return a;}
export function orientations(t){if(t.length===t.width)return [{L:t.length,W:t.width,rotated:false}];const a=[];if(t.rotationMode==='auto'||t.lockedOrientation!=='rotated')a.push({L:t.length,W:t.width,rotated:false});if(t.rotationMode==='auto'||t.lockedOrientation==='rotated')a.push({L:t.width,W:t.length,rotated:true});return a;}
export function exact(test,{maxNodes=200000,maxMs=1200}={}){
 const start=performance.now(),{input:p,container:c}=test,items=[];p.types.forEach((t,g)=>{for(let k=1;k<=t.quantity;k++)items.push({g,k,t,id:`${g+1}.${k}`});});
 if(items.length>12)throw Error('oracle supports at most 12 atoms');
 const dims=[c.innerLength,c.innerWidth,p.gap,...p.types.flatMap(t=>[t.length,t.width])];
 if(!dims.every(Number.isSafeInteger))return {status:'UNKNOWN',reason:'non-integer floor dimensions',nodes:0};
 const scale=dims.reduce(gcd),W=(c.innerWidth+p.gap)/scale,L=(c.innerLength+p.gap)/scale;
 if(L*W>100)return {status:'UNKNOWN',reason:'grid exceeds 100 cells',nodes:0};
 const all=(1<<items.length)-1,config=new Map();let nodes=0,timeout=false;
 function budget(){if(++nodes>maxNodes||(nodes%256===0&&performance.now()-start>maxMs)){timeout=true;return false;}return true;}
 function chain(seq,mask,o,height,limit){
  if(!budget())return;
  const key=`${mask}:${o.L}:${o.W}`;if(!config.has(key))config.set(key,{mask,L:o.L,W:o.W,seq:seq.slice(),height,count:seq.length});
  if(seq.length>=limit)return;const below=items[seq.at(-1).i].t;if(!below.stackingEnabled||below.stackRole==='top')return;
  for(let i=0;i<items.length&&!timeout;i++){
   const {t,g}=items[i];if(mask&(1<<i)||!t.stackingEnabled||t.stackRole==='base'||!below.allowedAbove.includes(g))continue;
   const orient=orientations(t).find(q=>q.L===o.L&&q.W===o.W);if(!orient)continue;
   const h=height+p.verticalGap+t.height;if(h>c.innerHeight||t.height>(c.accessKnown===false?c.innerHeight:c.doorHeight)||o.W>(c.accessKnown===false?c.innerWidth:c.doorWidth))continue;
   chain([...seq,{i,rotated:orient.rotated}],mask|(1<<i),o,h,limit);
  }
 }
 for(let i=0;i<items.length&&!timeout;i++)for(const o of orientations(items[i].t)){
  const t=items[i].t;if(o.L>c.innerLength||o.W>c.innerWidth||t.height>c.innerHeight||o.W>(c.accessKnown===false?c.innerWidth:c.doorWidth)||t.height>(c.accessKnown===false?c.innerHeight:c.doorHeight))continue;
  chain([{i,rotated:o.rotated}],1<<i,o,t.height,t.stackingEnabled?t.maxLayers:1);
 }
 const configs=[...config.values()].sort((a,b)=>b.count-a.count||a.mask-b.mask),memo=new Map(),full=(1n<<BigInt(L*W))-1n;
 const cellPlacements=Array.from({length:L*W},()=>[]);
 for(let pos=0;pos<L*W;pos++){
  const x=Math.floor(pos/W),y=pos%W;
  for(const s of configs){const l=(s.L+p.gap)/scale,w=(s.W+p.gap)/scale;if(x+l>L||y+w>W)continue;let bits=0n;for(let a=0;a<l;a++)for(let b=0;b<w;b++)bits|=1n<<BigInt((x+a)*W+y+b);cellPlacements[pos].push({s,bits,x:x*scale,y:y*scale});}
 }
 const better=(a,b)=>a.placed>b.placed||(a.placed===b.placed&&a.floor>b.floor);
 const empty=()=>({placed:0,floor:0,stacks:[]});
 function dfs(occupied,used){
  if(occupied===full||used===all||timeout)return empty();if(!budget())return empty();
  const key=`${occupied.toString(36)}:${used}`;if(memo.has(key))return memo.get(key);
  let pos=0;while(occupied&(1n<<BigInt(pos)))pos++;
  let best=empty();
  for(const a of cellPlacements[pos]){
   if(a.s.mask&used||a.bits&occupied)continue;
   const next=dfs(occupied|a.bits,used|a.s.mask),proposal={placed:next.placed+a.s.count,floor:next.floor+1,stacks:[{...a.s,x:a.x,y:a.y},...next.stacks]};
   if(better(proposal,best))best=proposal;
   if(timeout)break;
  }
  if(!timeout){const skip=dfs(occupied|(1n<<BigInt(pos)),used);if(better(skip,best))best=skip;}
  memo.set(key,best);return best;
 }
 const solution=dfs(0n,0);return {status:timeout?'FEASIBLE LOWER BOUND':'EXACT OPTIMUM',timeout,nodes,ms:performance.now()-start,scale,grid:[L,W],configs:configs.length,...solution};
}
export function witness(test,solution){
 const {input:p,container:c}=structuredClone(test),items=[];p.types.forEach((t,g)=>{for(let k=1;k<=t.quantity;k++)items.push({g,k,t,id:`${g+1}.${k}`});});const used=new Set();
 const stacks=solution.stacks.map((s,i)=>{const positionId=`P${String(i+1).padStart(2,'0')}`,layers=s.seq.map((a,j)=>{const u=items[a.i];used.add(u.id);return {id:u.id,typeIndex:u.g,unitNo:u.k,length:s.L,width:s.W,originalLength:u.t.length,originalWidth:u.t.width,height:u.t.height,rotated:a.rotated,x:s.x,y:s.y,layer:j+1,positionId};});return {rect:{...layers[0]},layers,height:s.height,positionId};});
 const rects=stacks.map(s=>({...s.rect})),unplaced=items.filter(u=>!used.has(u.id)).map(u=>({id:u.id,typeIndex:u.g,unitNo:u.k})),placed=used.size;
 return {mode:'mixed',input:p,container:c,advancedStacking:true,layout:{mode:'mixed',count:rects.length,materializedCount:rects.length,truncated:false,rects,unplaced,usedLength:Math.max(0,...rects.map(r=>r.x+r.length)),usedWidth:Math.max(0,...rects.map(r=>r.y+r.width))},stacks,placedCount:placed,floorPlacedCount:stacks.length,stackedCount:placed-stacks.length,maxLayersUsed:Math.max(0,...stacks.map(s=>s.layers.length)),mixedGroupStacks:stacks.filter(s=>new Set(s.layers.map(l=>l.typeIndex)).size>1).length,totalItems:p.quantity,totalCapacity:placed,floorCapacity:stacks.length,allPlaced:placed===p.quantity};
}
