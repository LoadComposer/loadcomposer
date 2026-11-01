"""Freeze QA twice, run two independent clean installs/full suites, verify builds."""
import pathlib,hashlib,subprocess,json,zipfile,time,os
r=pathlib.Path(__file__).resolve().parents[1];work=r/'work';out=r/'output';sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();proof={'packaging':[],'clean':[]}
def run(cmd,cwd,log,env=None):
 t=time.perf_counter()
 with (r/'results'/log).open('w') as f:p=subprocess.run(cmd,cwd=cwd,env={**os.environ,**(env or {})},stdout=f,stderr=subprocess.STDOUT)
 record={'command':cmd,'exit':p.returncode,'seconds':time.perf_counter()-t,'log':log}
 if p.returncode:raise RuntimeError(record)
 return record
qa=out/'loadcomposer-v1.5.0-test-bundle.zip';again=r/'qa-repeat.zip'
for target in [qa,again]:proof['packaging'].append(run(['node','scripts/create-test-bundle-v1.5.0.mjs'],work,'qa-'+('one' if target==qa else 'two')+'.log',{'LOADCOMPOSER_TEST_BUNDLE_ZIP':str(target)}))
assert sha(qa)==sha(again);proof['qaSHA256']=sha(qa);proof['qaBytes']=qa.stat().st_size;again.unlink();(r/'results/final-gates.json').write_text(json.dumps(proof,indent=2))
for n in [1,2]:
 dest=r/f'clean-{n}';assert not dest.exists()
 with zipfile.ZipFile(qa) as z:assert z.testzip() is None;z.extractall(dest)
 root=dest/'loadcomposer-v1.5.0-test-bundle';assert not (root/'node_modules').exists();count=0
 for line in (root/'SHA256SUMS-v1.5.0.txt').read_text().splitlines():
  h,name=line.split('  ',1);assert sha(root/name)==h,name;count+=1
 rec={'extraction':n,'manifestVerified':count,'install':run(['npm','ci','--offline','--no-audit','--no-fund'],root,f'clean-{n}-install.log')};(r/'results/final-gates.json').write_text(json.dumps({**proof,'inProgress':rec},indent=2))
 rec['test']=run(['npm','test'],root,f'clean-{n}-npm-test.log');proof['clean'].append(rec);(r/'results/final-gates.json').write_text(json.dumps(proof,indent=2));print('CLEAN PASS',n,round(rec['test']['seconds'],2),flush=True)
def site_files(base):return {str(p.relative_to(base)):sha(p) for p in base.rglob('*') if p.is_file()}
base=site_files(work/'site')
for n in [1,2]:assert site_files(r/f'clean-{n}/loadcomposer-v1.5.0-test-bundle/site')==base
proof['identicalBuilds']={'siteFiles':len(base),'twoCleanAndWork':True};proof['status']='PASS';(r/'results/final-gates.json').write_text(json.dumps(proof,indent=2));print('TWO CLEAN FULL SUITES AND BUILDS PASS',flush=True)
