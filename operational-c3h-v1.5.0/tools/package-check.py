from pathlib import Path
import subprocess,os,json,hashlib,zipfile,shutil,time,difflib
root=Path(__file__).resolve().parents[2]; target=root.parent/'C3h';target.mkdir(exist_ok=True)
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def run(name,args,env=None):
 start=time.monotonic()
 with (target/(name+'.log')).open('w') as f:p=subprocess.run(args,cwd=root,env={**os.environ,**(env or {})},stdout=f,stderr=subprocess.STDOUT)
 assert p.returncode==0,(name,p.returncode);return dict(name=name,exit=0,seconds=time.monotonic()-start)
def sitehash():return {p.relative_to(root/'site').as_posix():sha(p) for p in (root/'site').rglob('*') if p.is_file()}
records=[];builds=[]
for k in [1,2]:records.append(run('deterministic-build-'+str(k),['npm','run','build']));builds.append(sitehash())
assert builds[0]==builds[1],'build not deterministic'
(root/'operational-c3h-v1.5.0/results/build-determinism.json').write_text(json.dumps(dict(status='PASS',files=len(builds[0]),hashes=builds[0]),indent=2))
# Snapshot audit evidence before packaging; packaging logs live outside the frozen input tree.
env={'LOADCOMPOSER_TEST_BUNDLE_ZIP':str(target/'loadcomposer-v1.5.0-test-bundle.zip'),'LOADCOMPOSER_DELIVERY_ZIP':str(target/'loadcomposer-v1.5.0-delivery.zip')}
rounds=[]
for k in [1,2]:
 records.append(run('package-qa-'+str(k),['npm','run','package:test-bundle'],env));records.append(run('package-delivery-'+str(k),['npm','run','package:delivery'],env))
 rounds.append({n:sha(target/n) for n in ['loadcomposer-v1.5.0-test-bundle.zip','loadcomposer-v1.5.0-delivery.zip']})
assert rounds[0]==rounds[1],'packages not deterministic'
for ext in ['html','zip']:shutil.copy2(root/f'site/downloads/loadcomposer-v1.5.0-standalone.{ext}',target/f'loadcomposer-v1.5.0-standalone.{ext}')
def verify(archive):
 with zipfile.ZipFile(archive) as z:
  assert z.testzip() is None;names=z.namelist();assert len(names)==len(set(names));assert all('..' not in Path(n).parts and not n.startswith('/') for n in names)
  archiveRoot=names[0].split('/',1)[0]+'/'
  hashes=archiveRoot+'SHA256SUMS-v1.5.0.txt' if archiveRoot+'SHA256SUMS-v1.5.0.txt' in names else None;count=0
  if hashes:
   prefix=hashes.rsplit('/',1)[0]+'/'
   for line in z.read(hashes).decode().splitlines():
    expected,rel=line.split('  ',1);assert hashlib.sha256(z.read(prefix+rel)).hexdigest()==expected,rel;count+=1
  manifest=archiveRoot+'DELIVERY_MANIFEST-v1.5.0.txt' if archiveRoot+'DELIVERY_MANIFEST-v1.5.0.txt' in names else None
  if manifest:
   for line in z.read(manifest).decode().splitlines():
    expected,size,rel=line.split('  ',2);data=z.read(prefix+rel);assert len(data)==int(size) and hashlib.sha256(data).hexdigest()==expected
  return dict(file=archive.name,sha256=sha(archive),bytes=archive.stat().st_size,crc='PASS',entries=len(names),checksumsVerified=count)
archives=[verify(target/n) for n in ['loadcomposer-v1.5.0-delivery.zip','loadcomposer-v1.5.0-test-bundle.zip','loadcomposer-v1.5.0-standalone.zip']]
with zipfile.ZipFile(target/'loadcomposer-v1.5.0-test-bundle.zip') as q,zipfile.ZipFile(target/'loadcomposer-v1.5.0-delivery.zip') as d,zipfile.ZipFile(target/'loadcomposer-v1.5.0-standalone.zip') as s:
 for n in d.namelist():
  rel=n.split('/',1)[1];qn='loadcomposer-v1.5.0-test-bundle/'+rel
  if rel.startswith(('site/','scripts/')) or rel in ['package.json','package-lock.json']:assert d.read(n)==q.read(qn),rel
 data=(target/'loadcomposer-v1.5.0-standalone.html').read_bytes()
 assert data==s.read('loadcomposer-v1.5.0-standalone/loadcomposer-v1.5.0-standalone.html')==q.read('loadcomposer-v1.5.0-test-bundle/site/downloads/loadcomposer-v1.5.0-standalone.html')==d.read('delivery-v1.5.0/site/downloads/loadcomposer-v1.5.0-standalone.html')
result=dict(status='PASS',buildDeterministic=True,packagesDeterministic=True,rounds=rounds,archives=archives,records=records,equivalence='PASS')
(target/'package-check.json').write_text(json.dumps(result,indent=2));print(json.dumps({k:v for k,v in result.items() if k not in ['rounds','records']},indent=2))
