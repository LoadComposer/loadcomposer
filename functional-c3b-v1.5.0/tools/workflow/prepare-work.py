from pathlib import Path
import shutil,json,hashlib
b=Path('c3b');w=b/'work';q=b/'qa-original/loadcomposer-v1.5.0-test-bundle';added=[]
for p in q.rglob('*'):
 if p.is_file() and 'node_modules' not in p.parts:
  d=w/p.relative_to(q)
  if not d.exists():d.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(p,d);added.append(str(p.relative_to(q)))
(b/'custody/qa-inputs-added.json').write_text(json.dumps(added,indent=2))
f=w/'functional-c3b-v1.5.0';f.mkdir(exist_ok=True)
for d in ['tools','results','logs','fixtures','custody','baseline','original-c3']:(f/d).mkdir(exist_ok=True)
for name in ['loadcomposer-v1.5.0-independent-review-C3.zip','INDEPENDENT_REVIEW-C3-v1.5.0.md','PACKAGE_VERIFICATION-C3-v1.5.0.json','SHA256SUMS-C3-v1.5.0.txt']:shutil.copyfile(Path('c3b-originals')/name,f/'original-c3'/name)
shutil.copyfile('c3b-originals/loadcomposer-v1.5.0-standalone (1)(1).html',f/'baseline/C2.html')
for name in ['worker-single-maxlayers.json','single-maxlayers-minimal.json','access-whole-job-failure.json']:shutil.copyfile(Path('c3/counterexamples')/name,f/'fixtures'/name)
for p in (b/'custody').glob('*'):shutil.copyfile(p,f/'custody'/p.name)
print('QA assembled deterministically from admitted C2 delivery+QA, missing files added:',len(added))
