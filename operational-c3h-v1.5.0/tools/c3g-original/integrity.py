import pathlib,zipfile,hashlib,json,difflib
r=pathlib.Path(__file__).resolve().parents[1]; o=r/'originals'; sha=lambda x:hashlib.sha256(x).hexdigest()
archives={k:zipfile.ZipFile(o/n) for k,n in [('C3f','loadcomposer-v1.5.0-delivery(8).zip'),('C3d','loadcomposer-v1.5.0-delivery(7).zip'),('QA','loadcomposer-v1.5.0-test-bundle(8).zip'),('standalone','loadcomposer-v1.5.0-standalone(8).zip')]}
data={k:{'/'.join(n.split('/')[1:]):z.read(n) for n in z.namelist() if not n.endswith('/')} for k,z in archives.items()};out={'manifests':{},'same':{},'changed':[]}
for k,files in data.items():
 for n in ['SHA256SUMS-v1.5.0.txt','SHA256SUMS.txt','DELIVERY_MANIFEST-v1.5.0.txt']:
  if n not in files:continue
  count=0
  for line in files[n].decode().splitlines():
   if not line or line.startswith('#'):continue
   h,rel=line.split(None,1)
   if len(h)!=64:continue
   if n.startswith('DELIVERY_MANIFEST'):size,rel=rel.split(None,1)
   rel=rel.lstrip('*');assert sha(files[rel])==h,(k,n,rel);count+=1
  out['manifests'][k+'/'+n]=count
for n,b in data['C3d'].items():
 if n not in data['C3f']:out.setdefault('missing',[]).append(n)
 elif b!=data['C3f'][n]:out['changed'].append(n)
old=data['C3d']['site/index.html'].decode();new=data['C3f']['site/index.html'].decode();out['functions']={}
for start,end in [('    function validateMixedReference(', '    // The theoretical capacity'),('    function validateResultGeometry(result) {','    function formatInt(value)'),('    function validateAdvancedOperationalResult(result) {','    function isOperationalPrintAvailable(result)')]:
 parts=[]
 for s in (old,new):x=s.index(start);y=s.index(end,x);parts.append(s[x:y])
 out['functions'][start.strip()]={'C3d':sha(parts[0].encode()),'C3f':sha(parts[1].encode())};old=old.replace(parts[0],'AUDITED_DELTA\n');new=new.replace(parts[1],'AUDITED_DELTA\n')
assert old==new;out['remainingHTMLByteIdentical']=True
for n,b in data['C3f'].items():
 if n.startswith(('site/','scripts/')) or n in ('package.json','package-lock.json'):
  assert data['QA'].get(n)==b,('qa mismatch',n)
out['qaDeliveryIdenticalSources']=sum(n.startswith(('site/','scripts/')) or n in ('package.json','package-lock.json') for n in data['C3f'])
for n in ['site/advanced-stacking-engine.js','site/advanced-stacking-validator.js','site/computation-core.js','site/computation-worker-source.js','site/computation-runtime.js','package-lock.json']:
 assert data['C3d'][n]==data['C3f'][n];out['same'][n]=sha(data['C3f'][n])
html=(o/'loadcomposer-v1.5.0-standalone(8).html').read_bytes();assert html==data['C3f']['site/downloads/loadcomposer-v1.5.0-standalone.html']==data['standalone']['loadcomposer-v1.5.0-standalone.html']
c3e=data['QA']['operational-c3f-v1.5.0/original-c3e/loadcomposer-v1.5.0-independent-capacity-verification-C3e.zip'];assert sha(c3e)=='21836dbb6aa1a3533bfe7deb9c0ee63e717088297d5fbca93dd4ec3914c8016e'
p=r/'audit.zip';p.write_bytes(c3e)
with zipfile.ZipFile(p) as z: assert z.testzip() is None;z.extractall(r/'audit')
(r/'results/scope.json').write_text(json.dumps(out,indent=2));(r/'results/production.diff').write_text(''.join(difflib.unified_diff(data['C3d']['site/index.html'].decode().splitlines(True),data['C3f']['site/index.html'].decode().splitlines(True),fromfile='C3d',tofile='C3f')));print(json.dumps(out,indent=2))
