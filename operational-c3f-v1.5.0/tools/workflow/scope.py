import pathlib,hashlib,json,difflib,re
r=pathlib.Path(__file__).resolve().parents[1];a=r/'baseline/delivery-v1.5.0';b=r/'work';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();old=(a/'site/index.html').read_text();new=(b/'site/index.html').read_text()
def frozen_html(s):
 for start,end in [('    function validateMixedReference(', '    // The theoretical capacity'),('    function validateResultGeometry(result) {','    function formatInt(value)'),('    function validateAdvancedOperationalResult(result) {','    function isOperationalPrintAvailable(result)')]:
  x=s.index(start);y=s.index(end,x);s=s[:x]+'    // AUDITED FUNCTION DELTA\n'+s[y:]
 return s
assert frozen_html(old)==frozen_html(new),'unexpected production HTML delta'
frozen=['site/advanced-stacking-engine.js','site/advanced-stacking-validator.js','site/computation-core.js','site/computation-worker-source.js','site/computation-runtime.js','package-lock.json'];fs=[]
for p in frozen:assert sha(a/p)==sha(b/p),p;fs.append({'file':p,'sha256':sha(b/p)})
changes=[];missing=[]
for p in a.rglob('*'):
 if p.is_file():
  rel=p.relative_to(a);q=b/rel
  if not q.exists():missing.append(str(rel))
  elif sha(p)!=sha(q):changes.append(str(rel))
assert not missing
assert set(changes)<=set(['SHA256SUMS-v1.5.0.txt','TEST_BUNDLE_README-v1.5.0.md','package.json','scripts/create-delivery-v1.5.0.py','site/index.html','site/downloads/index.html','site/downloads/loadcomposer-v1.5.0-standalone.html','site/downloads/loadcomposer-v1.5.0-standalone.html.sha256','site/downloads/loadcomposer-v1.5.0-standalone.zip','site/downloads/loadcomposer-v1.5.0-standalone.zip.sha256'])
assert all(not p.endswith('.css') and not p.startswith('site/i18n/') for p in changes)
(r/'results/production-diff.patch').write_text(''.join(difflib.unified_diff(old.splitlines(True),new.splitlines(True),fromfile='C3d',tofile='C3f')))
result={'frozen':fs,'onlyThreeValidationFunctionsChanged':True,'allRemainingHTMLIdentical':True,'sweepCacheProducersRankingDataCSSCatalogsIdentical':True,'changedExistingDeliverySourceFiles':changes,'missing':missing}
(r/'results/scope.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
