from pathlib import Path
import hashlib,json,difflib
root=Path(__file__).resolve().parents[2];base=root.parent/'baseline/loadcomposer-v1.5.0-test-bundle';out=root/'operational-c3h-v1.5.0/results';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
rows=[];unchanged=[]
for directory in ['site','scripts','tests']:
 for p in sorted((base/directory).rglob('*')):
  if not p.is_file():continue
  r=p.relative_to(base);q=root/r
  if q.exists() and p.read_bytes()==q.read_bytes():unchanged.append(r.as_posix())
  else:rows.append(dict(path=r.as_posix(),before=sha(p),after=sha(q) if q.exists() else None))
for rel in ['site/computation-core.js','site/computation-worker-source.js','site/advanced-stacking-engine.js','site/advanced-stacking-validator.js','package-lock.json']:
 assert (root/rel).read_bytes()==(base/rel).read_bytes(),rel
patch=''
for rel in ['site/index.html','site/computation-runtime.js','scripts/create-delivery-v1.5.0.py','package.json']:
 patch+=''.join(difflib.unified_diff((base/rel).read_text().splitlines(True),(root/rel).read_text().splitlines(True),fromfile='C3f/'+rel,tofile='C3h/'+rel))
(root/'operational-c3h-v1.5.0/source-delta.patch').write_text(patch)
newFiles=[p.relative_to(root).as_posix() for p in (root/'tests').rglob('*') if p.is_file() and not (base/p.relative_to(root)).exists()]
(out/'scope.json').write_text(json.dumps(dict(status='PASS',newTestFiles=sorted(newFiles),modified=rows,unchanged=unchanged,frozen=['solver/producers','Worker program/protocol','Advanced engine','V-01 validator','ranking/geometry search','package-lock']),indent=2));print('Scope PASS',len(rows),'changed files;',len(unchanged),'byte-identical')
