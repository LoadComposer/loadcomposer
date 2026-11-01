from pathlib import Path
import json,hashlib
b=Path('c3b');old=b/'baseline/delivery-v1.5.0';new=b/'work';h=lambda x:hashlib.sha256(x).hexdigest();a=(old/'site/index.html').read_text();z=(new/'site/index.html').read_text();checks={}
for file in ['site/advanced-stacking-engine.js','site/advanced-stacking-validator.js','site/computation-core.js','package-lock.json','site/_headers']:
 x=(old/file).read_bytes();y=(new/file).read_bytes();checks[file]={'sha256':h(y),'unchanged':x==y};assert x==y,file
for start,end in [('fitCount','geometryIssue'),('approximatelyEqual','validateMixedReference'),('expandMixedItems','showValidationMessage'),('calculateSingle','resultMatchesActiveFilter')]:
 def part(s):
  i=s.index('    function '+start+'(');return s[i:s.index('    function '+end+'(',i)]
 x,y=part(a),part(z);checks[start+'..'+end]={'unchanged':x==y,'sha256':h(y.encode())};assert x==y,start
for key,start,end in [('CSS','<style>','</style>'),('container-data','    const CONTAINERS =','    let lastResults =')]:
 x=a[a.index(start):a.index(end,a.index(start))];y=z[z.index(start):z.index(end,z.index(start))];checks[key]={'unchanged':x==y,'sha256':h(y.encode())};assert x==y,key
for code in ['it','en','de','fr','es','pt','nl']:
 x=json.loads((old/f'site/lang/{code}.json').read_text());y=json.loads((new/f'site/lang/{code}.json').read_text());t=y['translations'].pop('compute.timeout');assert x==y,code;checks[code]={'onlyNewKey':'compute.timeout','newValue':t}
changes=[]
for p in old.rglob('*'):
 if p.is_file():
  rel=p.relative_to(old);q=new/rel
  if not q.exists() or p.read_bytes()!=q.read_bytes():changes.append(str(rel))
result={'checks':checks,'changedOriginalDeliveryFiles':sorted(changes),'allFrozenPartsUnchanged':True};(b/'results/scope.json').write_text(json.dumps(result,indent=2,ensure_ascii=False));print('Scope PASS',len(changes),'generated/source files differ')
