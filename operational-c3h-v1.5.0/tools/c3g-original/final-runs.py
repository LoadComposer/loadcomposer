import pathlib,subprocess,time,json,tempfile
r=pathlib.Path(__file__).resolve().parents[1];qa=r/'qa/loadcomposer-v1.5.0-test-bundle';records=[]
commands=[('browser-benchmark-independent',['node',str(r/'tools/browser-benchmark.mjs')],r.parent),('G01-minimal',['node',str(r/'tools/counterexample.mjs')],r.parent),('npm-test-complete',['npm','test'],qa),('release-input-admission',['npm','run','test:release-input-admission'],qa),('release-historical',['npm','run','test:release-historical'],qa),('async-repeat-1',['node','tests/c3b-worker-v1.5.0.mjs'],qa),('async-repeat-2',['node','tests/c3b-worker-v1.5.0.mjs'],qa)]
for name,cmd,cwd in commands:
 start=time.time()
 with tempfile.TemporaryFile() as f:
  p=subprocess.run(cmd,cwd=cwd,stdout=f,stderr=subprocess.STDOUT);f.seek(0);content=f.read();(r/'results'/(name+'.log')).write_bytes(content)
 record=dict(name=name,command=cmd,cwd=str(cwd),exit=p.returncode,seconds=time.time()-start,logBytes=len(content));records.append(record);(r/'results/final-runs.json').write_text(json.dumps(records,indent=2));print(json.dumps(record),flush=True)
 if p.returncode:print(content[-4000:].decode(errors='replace'),flush=True)
