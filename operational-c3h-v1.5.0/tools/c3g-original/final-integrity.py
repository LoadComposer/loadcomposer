import pathlib,hashlib,json,zipfile
r=pathlib.Path(__file__).resolve().parents[1];sha=lambda b:hashlib.sha256(b).hexdigest();rows=[]
for item in json.loads((r/'results/admission.json').read_text()):
 p=r/'originals'/item['name'];actual=sha(p.read_bytes());assert actual==item['sha256'];rows.append({'name':item['name'],'sha256':actual,'unchanged':True})
qa=r/'qa/loadcomposer-v1.5.0-test-bundle';checks=[]
with zipfile.ZipFile(r/'originals/loadcomposer-v1.5.0-test-bundle(8).zip') as z:
 for n in z.namelist():
  rel='/'.join(n.split('/')[1:])
  if rel.startswith(('site/','tests/','scripts/')) or rel in ('package.json','package-lock.json'):
   if n.endswith('/'):continue
   expected=z.read(n);actual=(qa/rel).read_bytes();assert actual==expected,rel;checks.append({'file':rel,'sha256':sha(actual)})
external_manifest=[]
for line in (r/'originals/SHA256SUMS-C3f-v1.5.0.txt').read_text().splitlines():
 h,n=line.split(None,1);n=n.lstrip('*'); candidates=[p for p in (r/'originals').iterdir() if p.name==n or p.name.replace('(8)','')==n];assert len(candidates)==1,n;assert sha(candidates[0].read_bytes())==h;external_manifest.append(n)
source_tests=[x for x in checks if x['file'].startswith('tests/')];astra=[x for x in source_tests if '/astra' in x['file']]
audit=r/'audit/loadcomposer-v1.5.0-independent-capacity-verification-C3e';audit_matches=[]
with zipfile.ZipFile(r/'audit.zip') as z:
 for n in z.namelist():
  rel='/'.join(n.split('/')[1:])
  if rel.startswith('tools/') and not n.endswith('/'):
   assert sha((audit/rel).read_bytes())==sha(z.read(n));audit_matches.append(rel)
result={'originals':rows,'externalManifestFiles':external_manifest,'sourceFiles':len(checks),'testFiles':len(source_tests),'astraFixtureFiles':len(astra),'allCheckedSourcesByteIdentical':True,'c3eToolsByteIdentical':audit_matches,'checks':checks}
(r/'results/final-integrity.json').write_text(json.dumps(result,indent=2));print(json.dumps({k:v for k,v in result.items() if k not in ['checks','originals','c3eToolsByteIdentical']}))
