import pathlib,hashlib,json,zipfile,shutil,re
r=pathlib.Path(__file__).resolve().parents[1];prior=r.parent/'c3e';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
expected={'loadcomposer-v1.5.0-delivery.zip':'0c418f38644563dba52e806583479f474f2867397066d0435a3fc2eaf26e7345','loadcomposer-v1.5.0-test-bundle.zip':'91ef2224b26e184e538c7dde0b3c88e78a08b81c0df3f368b8f4ebd3431168a4','loadcomposer-v1.5.0-standalone.html':'6ccc76f4869d47e4fdd460530c9ee6aeb5cba6e5c7d883145d3cd365023df64c','loadcomposer-v1.5.0-standalone.zip':'8b714ca026d45a494d50aa1a3f3c2830f5d7329d1830463141e67532a799ad96','loadcomposer-v1.5.0-independent-capacity-verification-C3e.zip':'21836dbb6aa1a3533bfe7deb9c0ee63e717088297d5fbca93dd4ec3914c8016e'}
source={n:prior/'originals'/n.replace('.zip','(7).zip').replace('.html','(7).html') for n in list(expected)[:4]};source.update({p.name:p for p in (prior/'output').iterdir() if p.is_file()})
for n in ['CAPACITY_VALIDATION_HOTFIX-C3d-v1.5.0.md','PACKAGE_VERIFICATION-C3d-v1.5.0.json','SHA256SUMS-C3d-v1.5.0.txt']:source[n]=prior/'originals'/n
source['FINAL_REPORT-v1.5.0.md']=prior/'originals/FINAL_REPORT-v1.5.0(7).md';records=[]
for n,p in source.items():
 h=sha(p);assert n not in expected or h==expected[n],n;shutil.copy2(p,r/'originals'/n);record={'file':n,'sha256':h,'bytes':p.stat().st_size}
 if p.suffix=='.zip':
  with zipfile.ZipFile(p) as z:
   assert z.testzip() is None;assert len(z.namelist())==len(set(z.namelist()));assert all(not pathlib.PurePosixPath(v).is_absolute() and '..' not in pathlib.PurePosixPath(v).parts for v in z.namelist());record['crc']='PASS'
 records.append(record)
for mn in ['SHA256SUMS-C3d-v1.5.0.txt','SHA256SUMS-C3e-v1.5.0.txt']:
 for l in (r/'originals'/mn).read_text().splitlines():
  h,n=l.split('  ',1);assert sha(r/'originals'/n)==h,(mn,n)
with zipfile.ZipFile(r/'originals/loadcomposer-v1.5.0-test-bundle.zip') as z:z.extractall(r/'qa-source')
shutil.move(r/'qa-source/loadcomposer-v1.5.0-test-bundle',r/'work')
with zipfile.ZipFile(r/'originals/loadcomposer-v1.5.0-delivery.zip') as z:z.extractall(r/'baseline')
with zipfile.ZipFile(r/'originals/loadcomposer-v1.5.0-independent-capacity-verification-C3e.zip') as z:z.extractall(r/'audit')
q=r/'work';count=0
for l in (q/'SHA256SUMS-v1.5.0.txt').read_text().splitlines():
 h,n=l.split('  ',1);assert sha(q/n)==h;count+=1
missing=[]
for p in (r/'baseline/delivery-v1.5.0').rglob('*'):
 if p.is_file():
  dest=q/p.relative_to(r/'baseline/delivery-v1.5.0')
  if not dest.exists():dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest);missing.append(str(dest.relative_to(q)))
(r/'results/admission.json').write_text(json.dumps({'originals':records,'qaManifestVerified':count,'missingDeliveryFilesRestored':missing},indent=2));print('ADMITTED',len(records),'QA manifest',count,'missing root files',len(missing))
