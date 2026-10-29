from pathlib import Path
import subprocess,zipfile,json,time,os
root=Path(__file__).resolve().parents[2];target=root.parent/'C3h';archive=target/'loadcomposer-v1.5.0-test-bundle.zip';records=[]
for k in [1,2]:
 dest=root.parent/('clean-c3h-'+str(k));assert not dest.exists()
 with zipfile.ZipFile(archive) as z:z.extractall(dest)
 q=dest/'loadcomposer-v1.5.0-test-bundle'
 for name,args in [('npm-ci',['npm','ci','--offline']),('npm-test',['npm','test'])]:
  start=time.monotonic()
  with (target/('clean-'+str(k)+'-'+name+'.log')).open('w') as f:p=subprocess.run(args,cwd=q,stdout=f,stderr=subprocess.STDOUT)
  record=dict(extraction=k,command=' '.join(args),exit=p.returncode,seconds=time.monotonic()-start);records.append(record);(target/'clean-qa.json').write_text(json.dumps(records,indent=2));print(record,flush=True)
  assert p.returncode==0,record
print('Two clean extractions npm ci/npm test PASS',flush=True)
