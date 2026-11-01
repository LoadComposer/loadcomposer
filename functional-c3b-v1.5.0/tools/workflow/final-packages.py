from pathlib import Path,PurePosixPath
import json,hashlib,subprocess,time,shutil,zipfile,os
b=Path('c3b');w=b/'work';f=w/'functional-c3b-v1.5.0';out=b/'output';stage=b/'package-stage';stage.mkdir(exist_ok=True);qa_target=(stage/'loadcomposer-v1.5.0-test-bundle.zip').resolve();environment={**os.environ,'LOADCOMPOSER_TEST_BUNDLE_ZIP':str(qa_target)}
def h(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def run(name,args):
 at=time.time();r=subprocess.run(args,cwd=w,env=environment,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True);(b/'logs'/f'{name}.log').write_text(r.stdout);s={'exit':r.returncode,'seconds':time.time()-at,'command':args,'logBytes':len(r.stdout)};(b/'results'/f'{name}-execution.json').write_text(json.dumps(s,indent=2));assert r.returncode==0,r.stdout[-3000:];print(name,s,flush=True)
def inventory():return {str(p.relative_to(w/'site')):h(p) for p in (w/'site').rglob('*') if p.is_file()}
run('final-build-1',['npm','run','build']);one=inventory();run('final-build-2',['npm','run','build']);two=inventory();assert one==two
build={'identical':True,'files':len(one),'siteSHA256':one};(b/'results/two-builds.json').write_text(json.dumps(build,indent=2))
# Preserve workflow code and completed attempts, including failures, as QA evidence.
for src,dest in [(b/'tools',f/'tools/workflow'),(b/'logs',f/'logs'),(b/'results',f/'results/executions'),(b/'custody',f/'custody')]:
 dest.mkdir(parents=True,exist_ok=True)
 for p in src.rglob('*'):
  if p.is_file():d=dest/p.relative_to(src);d.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,d)
shutil.copyfile(b/'results/scope.json',f/'custody/scope.json')
run('qa-package-1',['npm','run','package:test-bundle']);qa=qa_target;qa1=h(qa)
run('qa-package-2',['npm','run','package:test-bundle']);qa2=h(qa);assert qa1==qa2
run('delivery-package-1',['npm','run','package:delivery']);delivery=b/'loadcomposer-v1.5.0-delivery.zip';d1=h(delivery)
run('delivery-package-2',['npm','run','package:delivery']);d2=h(delivery);assert d1==d2
for p in [qa,delivery,w/'site/downloads/loadcomposer-v1.5.0-standalone.zip']:
 with zipfile.ZipFile(p) as z:
  assert z.testzip() is None;names=z.namelist();assert len(names)==len(set(n.casefold() for n in names));assert all(not PurePosixPath(n).is_absolute() and '..' not in PurePosixPath(n).parts for n in names)
  if p==qa:
   prefix='loadcomposer-v1.5.0-test-bundle/';manifest=z.read(prefix+'SHA256SUMS-v1.5.0.txt').decode()
  elif p==delivery:
   prefix='delivery-v1.5.0/';manifest=z.read(prefix+'SHA256SUMS-v1.5.0.txt').decode()
  else:continue
  for line in manifest.splitlines():
   sha,name=line.split('  ',1);assert hashlib.sha256(z.read(prefix+name)).hexdigest()==sha,name
for p in [delivery,qa,w/'site/downloads/loadcomposer-v1.5.0-standalone.html',w/'site/downloads/loadcomposer-v1.5.0-standalone.zip']:shutil.copyfile(p,out/p.name)
proof={'twoBuildsIdentical':True,'twoQAPackagesIdentical':qa1==qa2,'twoDeliveryPackagesIdentical':d1==d2,'zipCRC':'PASS','manifests':'PASS','safeAndUniquePaths':'PASS','qaSHA256':qa2,'deliverySHA256':d2,'subjectSHA256':h(w/'site/downloads/loadcomposer-v1.5.0-standalone.html'),'files':[{'filename':p.name,'bytes':p.stat().st_size,'sha256':h(p)} for p in out.glob('loadcomposer-v1.5.0-*') if p.is_file() and p.suffix in ['.zip','.html']]};(b/'results/package-proof.json').write_text(json.dumps(proof,indent=2));print(proof,flush=True)
